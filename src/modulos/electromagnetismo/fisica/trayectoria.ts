
import type {
  CargaElectrica,
  Particula,
  Vector3D,
} from "../tipos";

import {
  sumarVectores,
  multiplicarVector,
  magnitud,
  distancia,
} from "./vectores";

import {
  calcularCampoElectrico,
  validarCargas,
} from "./campoElectrico";
import { calcularPotencialElectrico, calcularPotencialCarga } from "./potencialElectrico";

/**
 * Configuración del simulador de trayectoria.
 *
 * Todas las magnitudes utilizan
 * unidades del Sistema Internacional.
 */
export interface ConfiguracionTrayectoria {
  pasoTiempo: number;       // Segundos
  tiempoMaximo: number;     // Segundos
  maximoPasos: number;
  limiteEspacio: number;    // Metros
  radioColision: number;    // Metros
  toleranciaRelativa?: number;
  toleranciaPosicion?: number; // Metros
  toleranciaVelocidad?: number; // m/s
}

/**
 * Configuración inicial.
 *
 * El paso temporal deberá ajustarse
 * según la masa, carga y aceleración.
 */
export const CONFIGURACION_TRAYECTORIA:
  ConfiguracionTrayectoria = {
    pasoTiempo: 0.001,
    tiempoMaximo: 10,
    maximoPasos: 10000,
    limiteEspacio: 15,
    radioColision: 0.05,
  };

// Control local por comparación RK4(dt) con dos RK4(dt/2), error / 15.
// No garantiza un error global universal: comprobar convergencia y energía.
export const TOLERANCIAS_TRAYECTORIA = {
  relativa: 1e-10,
  posicion: 1e-11,
  velocidad: 1e-11,
  evento: 1e-8, // m: resolución espacial de colisiones y del borde
} as const;

/**
 * Resultado de una simulación completa.
 */
export interface ResultadoTrayectoria {
  puntos: Vector3D[];
  velocidades: Vector3D[];
  tiempos: number[];
  energiaInicial?: number; // J
  errorRelativoEnergiaMaximo?: number;
  motivoFinalizacion:
    | "tiempo_maximo"
    | "limite_espacio"
    | "colision"
    | "maximo_pasos"
    | "error_numerico";
}

/**
 * Valida los parámetros de la partícula.
 */
export function validarParticula(
  particula: Particula
): void {
  if (
    !Number.isFinite(particula.carga) ||
    !Number.isFinite(particula.masa) ||
    particula.masa <= 0
  ) {
    throw new Error(
      "La partícula necesita una carga finita y una masa mayor que cero."
    );
  }

  const valores = [
    ...Object.values(particula.posicion),
    ...Object.values(particula.velocidad),
  ];

  if (valores.some((valor) => !Number.isFinite(valor))) {
    throw new Error(
      "La posición y velocidad deben ser finitas."
    );
  }
}

/**
 * Calcula la aceleración de una partícula.
 *
 * F = qE
 * F = ma
 *
 * Por tanto:
 *
 * a = qE / m
 *
 * Resultado: m/s²
 */
export function calcularAceleracion(
  posicion: Vector3D,
  particula: Particula,
  cargas: CargaElectrica[]
): Vector3D {
  // Una partícula neutra no necesita evaluar un campo singular para qE=0.
  if (particula.carga === 0) return { x: 0, y: 0, z: 0 };
  const campo = calcularCampoElectrico(
    posicion,
    cargas
  );

  const aceleracion = multiplicarVector(
    campo,
    particula.carga / particula.masa
  );
  if (!Object.values(aceleracion).every(Number.isFinite)) {
    throw new Error("La aceleración excede la precisión numérica disponible.");
  }
  return aceleracion;
}

export function calcularEnergiaMecanica(particula: Particula, cargas: CargaElectrica[]): number {
  const cinetica = 0.5 * particula.masa * magnitud(particula.velocidad) ** 2;
  const potencial = particula.carga === 0 ? 0 :
    particula.carga * calcularPotencialElectrico(particula.posicion, cargas);
  const energia = cinetica + potencial;
  if (!Number.isFinite(energia)) throw new Error("La energía no es finita.");
  return energia;
}

/** Interpolación temporal de las muestras físicas, incluso con dt variable. */
export function interpolarPosicion(trayectoria: ResultadoTrayectoria, tiempo: number): Vector3D {
  const { puntos, tiempos } = trayectoria;
  if (puntos.length === 0) return { x: 0, y: 0, z: 0 };
  if (tiempo <= tiempos[0] || puntos.length === 1) return puntos[0];
  const ultimo = puntos.length - 1;
  if (tiempo >= tiempos[ultimo]) return puntos[ultimo];
  let izquierda = 0;
  let derecha = ultimo;
  while (derecha - izquierda > 1) {
    const medio = Math.floor((izquierda + derecha) / 2);
    if (tiempos[medio] <= tiempo) izquierda = medio;
    else derecha = medio;
  }
  const intervalo = tiempos[derecha] - tiempos[izquierda];
  const factor = intervalo > 0 ? (tiempo - tiempos[izquierda]) / intervalo : 0;
  const a = puntos[izquierda];
  const b = puntos[derecha];
  return {
    x: a.x + (b.x - a.x) * factor,
    y: a.y + (b.y - a.y) * factor,
    z: a.z + (b.z - a.z) * factor,
  };
}

/**
 * Representa la derivada del estado físico.
 *
 * dr/dt = v
 * dv/dt = a
 */
interface DerivadaEstado {
  posicion: Vector3D;
  velocidad: Vector3D;
}

function obtenerDerivada(
  posicion: Vector3D,
  velocidad: Vector3D,
  particula: Particula,
  cargas: CargaElectrica[]
): DerivadaEstado {
  return {
    posicion: velocidad,
    velocidad: calcularAceleracion(
      posicion,
      particula,
      cargas
    ),
  };
}

/**
 * Calcula el siguiente estado de la
 * partícula utilizando RK4.
 */
export function avanzarParticula(
  particula: Particula,
  cargas: CargaElectrica[],
  dt: number
): Particula {
  validarParticula(particula);
  validarCargas(cargas);

  if (!Number.isFinite(dt) || dt <= 0) {
    throw new Error(
      "El intervalo de tiempo debe ser positivo."
    );
  }

  const p = particula.posicion;
  const v = particula.velocidad;

  const k1 = obtenerDerivada(
    p, v, particula, cargas
  );

  const k2 = obtenerDerivada(
    sumarVectores(
      p,
      multiplicarVector(k1.posicion, dt / 2)
    ),
    sumarVectores(
      v,
      multiplicarVector(k1.velocidad, dt / 2)
    ),
    particula,
    cargas
  );

  const k3 = obtenerDerivada(
    sumarVectores(
      p,
      multiplicarVector(k2.posicion, dt / 2)
    ),
    sumarVectores(
      v,
      multiplicarVector(k2.velocidad, dt / 2)
    ),
    particula,
    cargas
  );

  const k4 = obtenerDerivada(
    sumarVectores(
      p,
      multiplicarVector(k3.posicion, dt)
    ),
    sumarVectores(
      v,
      multiplicarVector(k3.velocidad, dt)
    ),
    particula,
    cargas
  );

  function combinar(
    a: Vector3D,
    b: Vector3D,
    c: Vector3D,
    d: Vector3D
  ): Vector3D {
    return {
      x: (a.x + 2*b.x + 2*c.x + d.x) / 6,
      y: (a.y + 2*b.y + 2*c.y + d.y) / 6,
      z: (a.z + 2*b.z + 2*c.z + d.z) / 6,
    };
  }

  const nuevaPosicion = sumarVectores(
    p,
    multiplicarVector(
      combinar(
        k1.posicion,
        k2.posicion,
        k3.posicion,
        k4.posicion
      ),
      dt
    )
  );

  const nuevaVelocidad = sumarVectores(
    v,
    multiplicarVector(
      combinar(
        k1.velocidad,
        k2.velocidad,
        k3.velocidad,
        k4.velocidad
      ),
      dt
    )
  );

  const siguiente: Particula = {
    ...particula,
    posicion: nuevaPosicion,
    velocidad: nuevaVelocidad,
  };
  if (!estadoFinito(siguiente)) throw new Error("El paso RK4 produjo un estado no finito.");
  return siguiente;
}

/**
 * Comprueba si la partícula está
 * demasiado cerca de una carga fuente.
 */
function detectarColision(
  posicion: Vector3D,
  cargas: CargaElectrica[],
  radio: number
): boolean {
  return cargas.some(
    (carga) =>
      carga.valor !== 0 &&
      distancia(posicion, carga.posicion) <= radio
  );
}

interface EventoTrayectoria {
  factor: number;
  motivo: "colision" | "limite_espacio";
}

/** Primera intersección del segmento con una esfera: entrada o salida. */
function interseccionEsfera(a: Vector3D, b: Vector3D, centro: Vector3D,
  radio: number, salida = false): number | null {
  const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const r = { x: a.x - centro.x, y: a.y - centro.y, z: a.z - centro.z };
  const aa = d.x * d.x + d.y * d.y + d.z * d.z;
  if (aa === 0) return null;
  const bb = 2 * (r.x * d.x + r.y * d.y + r.z * d.z);
  const cc = r.x * r.x + r.y * r.y + r.z * r.z - radio * radio;
  const discriminante = bb * bb - 4 * aa * cc;
  if (discriminante < 0) return null;
  const raiz = Math.sqrt(discriminante);
  // Forma estable: evita restar dos números casi iguales.
  const q = -0.5 * (bb + (bb >= 0 ? raiz : -raiz));
  const raices = q === 0 ? [-bb / (2 * aa)] : [q / aa, cc / q];
  const factor = salida ? Math.max(...raices) : Math.min(...raices);
  return factor >= 0 && factor <= 1 ? factor : null;
}

function primerEvento(a: Vector3D, b: Vector3D, cargas: CargaElectrica[],
  configuracion: ConfiguracionTrayectoria): EventoTrayectoria | null {
  let evento: EventoTrayectoria | null = null;
  for (const carga of cargas) {
    if (carga.valor === 0) continue;
    const factor = interseccionEsfera(a, b, carga.posicion, configuracion.radioColision);
    if (factor !== null && (!evento || factor < evento.factor)) evento = { factor, motivo: "colision" };
  }
  const borde = interseccionEsfera(a, b, { x: 0, y: 0, z: 0 }, configuracion.limiteEspacio, true);
  if (borde !== null && (!evento || borde < evento.factor)) evento = { factor: borde, motivo: "limite_espacio" };
  return evento;
}

function estadoFinito(particula: Particula): boolean {
  return [...Object.values(particula.posicion), ...Object.values(particula.velocidad)]
    .every(Number.isFinite);
}

function errorRK4(completo: Particula, fino: Particula, inicial: Particula,
  relativa: number, absolutaPosicion: number, absolutaVelocidad: number): number {
  let error = 0;
  for (const campo of ["posicion", "velocidad"] as const) {
    const absoluta = campo === "posicion" ? absolutaPosicion : absolutaVelocidad;
    for (const eje of ["x", "y", "z"] as const) {
      const escala = absoluta + relativa * Math.max(Math.abs(inicial[campo][eje]), Math.abs(fino[campo][eje]));
      error = Math.max(error, Math.abs(fino[campo][eje] - completo[campo][eje]) / (15 * escala));
    }
  }
  return error;
}

/**
 * Genera una trayectoria completa.
 *
 * Devuelve posiciones, velocidades y tiempos
 * para construir las animaciones 3D.
 */
export function simularTrayectoria(
  particulaInicial: Particula,
  cargas: CargaElectrica[],
  configuracion: ConfiguracionTrayectoria =
    CONFIGURACION_TRAYECTORIA
): ResultadoTrayectoria {
  validarParticula(particulaInicial);
  validarCargas(cargas);

  const {
    pasoTiempo,
    tiempoMaximo,
    maximoPasos,
    limiteEspacio,
    radioColision,
  } = configuracion;

  if (
    !Number.isFinite(pasoTiempo) ||
    pasoTiempo <= 0 ||
    !Number.isFinite(tiempoMaximo) ||
    tiempoMaximo <= 0 ||
    !Number.isInteger(maximoPasos) ||
    maximoPasos <= 0 ||
    !Number.isFinite(limiteEspacio) ||
    limiteEspacio <= 0 ||
    !Number.isFinite(radioColision) ||
    radioColision <= 0
  ) {
    throw new Error(
      "La configuración de trayectoria no es válida."
    );
  }

  const relativa = configuracion.toleranciaRelativa ?? TOLERANCIAS_TRAYECTORIA.relativa;
  const absolutaPosicion = configuracion.toleranciaPosicion ?? TOLERANCIAS_TRAYECTORIA.posicion;
  const absolutaVelocidad = configuracion.toleranciaVelocidad ?? TOLERANCIAS_TRAYECTORIA.velocidad;
  if (![relativa, absolutaPosicion, absolutaVelocidad].every((v) => Number.isFinite(v) && v > 0)) {
    throw new Error("Las tolerancias deben ser finitas y positivas.");
  }
  let actual: Particula = {
    ...particulaInicial,
    posicion: { ...particulaInicial.posicion },
    velocidad: { ...particulaInicial.velocidad },
  };
  const resultado: ResultadoTrayectoria = {
    puntos: [{ ...actual.posicion }],
    velocidades: [{ ...actual.velocidad }],
    tiempos: [0],
    motivoFinalizacion: "maximo_pasos",
  };
  if (detectarColision(actual.posicion, cargas, radioColision)) {
    resultado.motivoFinalizacion = "colision";
    return resultado;
  }
  if (magnitud(actual.posicion) > limiteEspacio) {
    resultado.motivoFinalizacion = "limite_espacio";
    return resultado;
  }

  let escalaEnergia: number;
  try {
    resultado.energiaInicial = calcularEnergiaMecanica(actual, cargas);
    // Escala positiva incluso si K y U, o potenciales opuestos, se cancelan.
    escalaEnergia = 0.5 * actual.masa * magnitud(actual.velocidad) ** 2;
    if (actual.carga !== 0) for (const carga of cargas) {
      escalaEnergia += Math.abs(actual.carga * calcularPotencialCarga(actual.posicion, carga));
    }
    escalaEnergia = Math.max(escalaEnergia, Number.MIN_VALUE);
    if (!Number.isFinite(escalaEnergia)) throw new Error("Escala de energía no finita.");
    resultado.errorRelativoEnergiaMaximo = 0;
    // Equilibrio exacto de un sistema autónomo: no hay que fabricar movimiento.
    if (magnitud(actual.velocidad) === 0 && magnitud(calcularAceleracion(actual.posicion, actual, cargas)) === 0) {
      resultado.puntos.push({ ...actual.posicion });
      resultado.velocidades.push({ ...actual.velocidad });
      resultado.tiempos.push(tiempoMaximo);
      resultado.motivoFinalizacion = "tiempo_maximo";
      return resultado;
    }
  } catch {
    resultado.motivoFinalizacion = "error_numerico";
    return resultado;
  }

  function guardar(estado: Particula, t: number): boolean {
    if (t <= resultado.tiempos[resultado.tiempos.length - 1]) return false;
    const energia = calcularEnergiaMecanica(estado, cargas);
    const errorEnergia = Math.abs(energia - resultado.energiaInicial!) / escalaEnergia;
    if (!Number.isFinite(errorEnergia)) throw new Error("Error de energía no finito.");
    resultado.errorRelativoEnergiaMaximo = Math.max(resultado.errorRelativoEnergiaMaximo!, errorEnergia);
    resultado.puntos.push({ ...estado.posicion });
    resultado.velocidades.push({ ...estado.velocidad });
    resultado.tiempos.push(t);
    return true;
  }

  let tiempo = 0;
  let compensacionTiempo = 0;
  let proximoPaso = pasoTiempo;
  for (let i = 0; i < maximoPasos; i++) {
    const restante = tiempoMaximo - tiempo;
    const resolucionTiempo = 32 * Number.EPSILON * Math.max(tiempoMaximo, tiempo, Number.MIN_VALUE);
    if (restante <= resolucionTiempo) {
      resultado.tiempos[resultado.tiempos.length - 1] = tiempoMaximo;
      resultado.motivoFinalizacion = "tiempo_maximo";
      break;
    }
    let dt = Math.min(proximoPaso, restante);
    let medio: Particula | null = null;
    let siguiente: Particula | null = null;
    let error = Infinity;
    try {
      const aceleracion = magnitud(calcularAceleracion(actual.posicion, actual, cargas));
      const rapidez = magnitud(actual.velocidad);
      // Impide que las etapas RK4 salten sobre la singularidad de una fuente.
      for (const carga of cargas) {
        if (carga.valor === 0) continue;
        const r = distancia(actual.posicion, carga.posicion);
        const ritmo = rapidez + Math.sqrt(aceleracion * r);
        if (ritmo > 0) dt = Math.min(dt, 0.2 * r / ritmo);
        const alcance = rapidez * dt + 0.5 * aceleracion * dt * dt;
        if (r - radioColision <= 2 * alcance && aceleracion > 0) {
          // Cerca de una posible colisión limitamos también el error del
          // segmento usado para localizar el contacto (sin suavizar Coulomb).
          dt = Math.min(dt, Math.sqrt(TOLERANCIAS_TRAYECTORIA.evento / aceleracion));
        }
      }
      const alcanceBorde = rapidez * dt + 0.5 * aceleracion * dt * dt;
      if (limiteEspacio - magnitud(actual.posicion) <= 2 * alcanceBorde && aceleracion > 0) {
        dt = Math.min(dt, Math.sqrt(TOLERANCIAS_TRAYECTORIA.evento / aceleracion));
      }
      for (let intento = 0; intento < 32 && dt > resolucionTiempo; intento++) {
        try {
          const completo = avanzarParticula(actual, cargas, dt);
          const mitad = avanzarParticula(actual, cargas, dt / 2);
          const fino = avanzarParticula(mitad, cargas, dt / 2);
          error = estadoFinito(completo) && estadoFinito(mitad) && estadoFinito(fino)
            ? errorRK4(completo, fino, actual, relativa, absolutaPosicion, absolutaVelocidad) : Infinity;
          if (error <= 1) {
            medio = mitad;
            siguiente = fino;
            break;
          }
        } catch {
          error = Infinity;
        }
        dt *= Number.isFinite(error) ? Math.max(0.1, Math.min(0.5, 0.9 * error ** -0.2)) : 0.5;
      }
      if (!medio || !siguiente) throw new Error("No se pudo resolver el paso con la precisión solicitada.");

      // Revisamos ambos semipasos: una carga puede cruzarse aunque los
      // extremos del paso estén fuera del radio de colisión.
      let inicioTramo = actual;
      let tiempoTramo = tiempo;
      // Suma compensada: 10000 pasos de 0.001 s deben completar 10 s,
      // sin consumir un paso extra únicamente por error de acumulación.
      const incrementoTiempo = dt - compensacionTiempo;
      const tiempoSiguiente = tiempo + incrementoTiempo;
      compensacionTiempo = (tiempoSiguiente - tiempo) - incrementoTiempo;
      for (const finTramo of [medio, siguiente]) {
        const evento = primerEvento(inicioTramo.posicion, finTramo.posicion, cargas, configuracion);
        if (evento) {
          const dtEvento = dt / 2 * evento.factor;
          const contacto = dtEvento > 0 ? avanzarParticula(inicioTramo, cargas, dtEvento) : inicioTramo;
          if (!estadoFinito(contacto)) throw new Error("Contacto no finito.");
          guardar(contacto, tiempoTramo + dtEvento);
          resultado.motivoFinalizacion = evento.motivo;
          return resultado;
        }
        tiempoTramo = finTramo === medio ? tiempo + dt / 2 : tiempoSiguiente;
        guardar(finTramo, tiempoTramo);
        inicioTramo = finTramo;
      }
      actual = siguiente;
      tiempo = tiempoSiguiente;
      // Evita un falso maximo_pasos por redondeo al llegar al tiempo final.
      if (tiempoMaximo - tiempo <= resolucionTiempo) {
        resultado.tiempos[resultado.tiempos.length - 1] = tiempoMaximo;
        resultado.motivoFinalizacion = "tiempo_maximo";
        break;
      }
      proximoPaso = Math.min(pasoTiempo, dt * (error > 0 ? Math.min(2, Math.max(0.2, 0.9 * error ** -0.2)) : 2));
    } catch {
      resultado.motivoFinalizacion = "error_numerico";
      break;
    }
  }
  return resultado;
}
