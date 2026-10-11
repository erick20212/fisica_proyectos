
import type {
  CargaElectrica,
  ModoVisualizacion,
  Vector3D,
} from "../tipos";

import { CONSTANTE_COULOMB, direccionCampoElectrico, validarCargas } from "./campoElectrico";
import { calcularPotencialElectrico } from "./potencialElectrico";

export interface ConfiguracionLineas {
  modo: ModoVisualizacion;
  lineasPorCarga: number;
  paso: number;
  maximoPasos: number;
  radioInicio: number;
  radioDetencion: number;
  limiteEspacio: number;
}

export const CONFIGURACION_LINEAS: ConfiguracionLineas = {
  modo: "3D",
  lineasPorCarga: 32,
  paso: 0.035,
  maximoPasos: 700,
  radioInicio: 0.22,
  radioDetencion: 0.16,
  limiteEspacio: 6,
};

// =====================================
// OPERACIONES VECTORIALES
// =====================================

function sumar(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function restar(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function escalar(v: Vector3D, k: number): Vector3D {
  return {
    x: v.x * k,
    y: v.y * k,
    z: v.z * k,
  };
}

function longitud(v: Vector3D): number {
  return Math.hypot(v.x, v.y, v.z);
}

function normalizar(v: Vector3D): Vector3D {
  const n = longitud(v);

  if (n < 1e-12) {
    return { x: 0, y: 0, z: 0 };
  }

  return escalar(v, 1 / n);
}

function productoCruz(
  a: Vector3D,
  b: Vector3D
): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function distancia(a: Vector3D, b: Vector3D): number {
  return longitud(restar(a, b));
}

// =====================================
// DIRECCIÓN DEL CAMPO
// =====================================

function direccionCampo(
  posicion: Vector3D,
  cargas: CargaElectrica[],
  sentido: number
): Vector3D | null {
  const direccion = direccionCampoElectrico(posicion, cargas);
  return direccion ? escalar(direccion, sentido) : null;
}

function productoEscalar(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Radios disjuntos incluso si el usuario acerca mucho dos cargas.
function radioCarga(carga: CargaElectrica, cargas: CargaElectrica[], radio: number): number {
  const otras = cargas.filter((otra) => otra !== carga && otra.valor !== 0)
    .map((otra) => distancia(carga.posicion, otra.posicion))
    .filter((separacion) => separacion > 0);
  return Math.min(radio, ...otras.map((separacion) => separacion * 0.2));
}

// =====================================
// INTEGRACIÓN RK4
// =====================================

function integrarRK4(
  posicion: Vector3D,
  cargas: CargaElectrica[],
  sentido: number,
  paso: number
): Vector3D | null {
  const k1 = direccionCampo(
    posicion,
    cargas,
    sentido
  );

  if (!k1) return null;

  const k2 = direccionCampo(
    sumar(posicion, escalar(k1, paso / 2)),
    cargas,
    sentido
  );

  if (!k2) return null;

  const k3 = direccionCampo(
    sumar(posicion, escalar(k2, paso / 2)),
    cargas,
    sentido
  );

  if (!k3) return null;

  const k4 = direccionCampo(
    sumar(posicion, escalar(k3, paso)),
    cargas,
    sentido
  );

  if (!k4) return null;

  const desplazamiento = escalar(
    {
      x: k1.x + 2 * k2.x + 2 * k3.x + k4.x,
      y: k1.y + 2 * k2.y + 2 * k3.y + k4.y,
      z: k1.z + 2 * k2.z + 2 * k3.z + k4.z,
    },
    paso / 6
  );

  return sumar(posicion, desplazamiento);
}

// =====================================
// TRAZADO INDIVIDUAL
// =====================================

export function trazarLineaCampo(
  origen: Vector3D,
  cargas: CargaElectrica[],
  sentido: number,
  configuracion: ConfiguracionLineas =
    CONFIGURACION_LINEAS
): Vector3D[] {
  const puntos: Vector3D[] = [{ ...origen }];
  let actual = { ...origen };
  if (sentido !== 1 && sentido !== -1) throw new Error("El sentido debe ser +1 o -1.");
  validarCargas(cargas);
  if (Math.max(Math.abs(origen.x), Math.abs(origen.y), Math.abs(origen.z)) > configuracion.limiteEspacio) return [];

  const destinos = cargas.filter(
    (carga) => carga.valor * sentido < 0
  );
  const radios = destinos.map((carga) => radioCarga(carga, cargas, configuracion.radioDetencion));
  let potencial: number;
  try {
    potencial = calcularPotencialElectrico(actual, cargas);
  } catch {
    return [];
  }

  for (
    let i = 0;
    i < configuracion.maximoPasos;
    i++
  ) {
    if (destinos.some((carga, indice) => distancia(actual, carga.posicion) <= radios[indice])) break;
    // Reducimos el paso cerca de las cargas
    // para evitar saltar sobre singularidades.
    let paso = configuracion.paso;

    const distancias = cargas
      .filter((carga) => carga.valor !== 0)
      .map((carga) =>
        distancia(actual, carga.posicion)
      );

    if (distancias.length > 0) {
      const distanciaMinima = Math.min(...distancias);

      paso = Math.min(
        paso,
        distanciaMinima * 0.2
      );
    }

    // Cerca de separatrices y puntos nulos, un paso fijo puede atravesar
    // el equilibrio y crear zigzags. Reducimos el paso hasta resolver E.
    let siguiente: Vector3D | null = null;
    let siguientePotencial = potencial;
    const direccionInicial = direccionCampo(actual, cargas, sentido);
    if (!direccionInicial) break;
    for (let intento = 0; intento < 18 && paso > 1e-10; intento++, paso /= 2) {
      const candidato = integrarRK4(actual, cargas, sentido, paso);
      if (!candidato) continue;
      const tangente = normalizar(restar(candidato, actual));
      const direccionFinal = direccionCampo(candidato, cargas, sentido);
      const medio = escalar(sumar(actual, candidato), 0.5);
      const direccionMedia = direccionCampo(medio, cargas, sentido);
      if (!direccionFinal || !direccionMedia ||
          productoEscalar(tangente, direccionInicial) < 0.995 ||
          productoEscalar(tangente, direccionFinal) < 0.995 ||
          productoEscalar(tangente, direccionMedia) < 0.995) continue;
      try {
        siguientePotencial = calcularPotencialElectrico(candidato, cargas);
      } catch {
        continue;
      }
      // E = -grad V: el potencial desciende estrictamente siguiendo E.
      // Esto también impide aceptar bucles numéricos cerrados.
      if (!Number.isFinite(siguientePotencial) ||
          sentido * (potencial - siguientePotencial) <= 0) continue;
      siguiente = candidato;
      break;
    }

    if (!siguiente) break;

    if (
      !Number.isFinite(siguiente.x) ||
      !Number.isFinite(siguiente.y) ||
      !Number.isFinite(siguiente.z)
    ) {
      break;
    }

    // Detectar llegada a una carga destino.
    const destino = destinos.find(
      (carga, indice) =>
        distancia(siguiente, carga.posicion) <=
        radios[indice]
    );

    if (destino) {
      puntos.push(siguiente);
      break;
    }

    // Limitar el volumen de visualización.
    const fuera =
      Math.abs(siguiente.x) >
        configuracion.limiteEspacio ||
      Math.abs(siguiente.y) >
        configuracion.limiteEspacio ||
      Math.abs(siguiente.z) >
        configuracion.limiteEspacio;

    if (fuera) {
      const desplazamiento = restar(siguiente, actual);
      let factor = 1;
      for (const eje of ["x", "y", "z"] as const) {
        if (Math.abs(siguiente[eje]) > configuracion.limiteEspacio) {
          const borde = Math.sign(siguiente[eje]) * configuracion.limiteEspacio;
          factor = Math.min(factor, (borde - actual[eje]) / desplazamiento[eje]);
        }
      }
      puntos.push(sumar(actual, escalar(desplazamiento, factor)));
      break;
    }

    if (distancia(actual, siguiente) < 1e-10) {
      break;
    }

    puntos.push(siguiente);
    actual = siguiente;
    potencial = siguientePotencial;
  }

  return puntos;
}

// =====================================
// SEMILLAS PARA DIPOLO SIMÉTRICO
// =====================================

function generarDireccionesDipolo(
  positiva: CargaElectrica,
  negativa: CargaElectrica,
  cantidad: number,
  modo: ModoVisualizacion
): Vector3D[] {
  const eje = normalizar(
    restar(
      negativa.posicion,
      positiva.posicion
    )
  );

  if (longitud(eje) < 1e-12) {
    return [];
  }

  // Eje perpendicular para construir
  // un sistema de referencia local.
  const referencia: Vector3D =
    Math.abs(eje.z) < 0.9
      ? { x: 0, y: 0, z: 1 }
      : { x: 0, y: 1, z: 0 };

  const lateral1 = normalizar(
    productoCruz(eje, referencia)
  );

  const lateral2 = normalizar(
    productoCruz(eje, lateral1)
  );

  const direcciones: Vector3D[] = [];

  if (modo === "2D") {
    const ejePlano = normalizar({
      x: eje.x,
      y: eje.y,
      z: 0,
    });

    if (longitud(ejePlano) < 1e-12) {
      return [];
    }

    const perpendicular: Vector3D = {
      x: -ejePlano.y,
      y: ejePlano.x,
      z: 0,
    };

    // Ángulos simétricos respecto al eje
    // que conecta las dos cargas.
    for (let i = 0; i < cantidad; i++) {
      const angulo = 2 * Math.PI * i / cantidad;
      direcciones.push(sumar(
        escalar(ejePlano, Math.cos(angulo)),
        escalar(perpendicular, Math.sin(angulo))
      ));
    }

    return direcciones.slice(0, cantidad);
  }

  // En 3D construimos anillos de semillas
  // con simetría rotacional respecto al dipolo.
  const cantidadAnillos = 4;

  const azimutsPorAnillo = Math.max(
    1,
    Math.floor(
      (cantidad - 2) / cantidadAnillos
    )
  );

  // Línea central que une ambas cargas.
  direcciones.push(eje);
  direcciones.push(escalar(eje, -1));

  for (
    let anillo = 0;
    anillo < cantidadAnillos;
    anillo++
  ) {
    // Toda la esfera: también las líneas que salen por detrás del dipolo.
    const anguloPolar = Math.acos(1 - 2 * (anillo + 0.5) / cantidadAnillos);

    for (
      let j = 0;
      j < azimutsPorAnillo;
      j++
    ) {
      const anguloAzimutal =
        (2 * Math.PI * j) /
        azimutsPorAnillo;

      const lateral = sumar(
        escalar(
          lateral1,
          Math.cos(anguloAzimutal)
        ),
        escalar(
          lateral2,
          Math.sin(anguloAzimutal)
        )
      );

      direcciones.push(
        normalizar(
          sumar(
            escalar(
              eje,
              Math.cos(anguloPolar)
            ),
            escalar(
              lateral,
              Math.sin(anguloPolar)
            )
          )
        )
      );
    }
  }

  return direcciones.slice(0, cantidad);
}

// =====================================
// SEMILLAS PARA CARGAS GENERALES
// =====================================

function generarDireccionesGenerales(
  cantidad: number,
  modo: ModoVisualizacion
): Vector3D[] {
  const direcciones: Vector3D[] = [];

  const anguloDorado =
    Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < cantidad; i++) {
    if (modo === "2D") {
      const angulo =
        (2 * Math.PI * i) / cantidad;

      direcciones.push({
        x: Math.cos(angulo),
        y: Math.sin(angulo),
        z: 0,
      });
    } else {
      const y =
        1 - (2 * (i + 0.5)) / cantidad;

      const radio =
        Math.sqrt(Math.max(0, 1 - y * y));

      const angulo = i * anguloDorado;

      direcciones.push({
        x: radio * Math.cos(angulo),
        y,
        z: radio * Math.sin(angulo),
      });
    }
  }

  return direcciones;
}

// =====================================
// GENERACIÓN DE TODAS LAS LÍNEAS
// =====================================

export function generarLineasCampo(
  cargas: CargaElectrica[],
  configuracion: ConfiguracionLineas =
    CONFIGURACION_LINEAS
): Vector3D[][] {
  validarCargas(cargas);
  if (cargas.length === 0) return [];

  if (
    !Number.isFinite(configuracion.paso) ||
    configuracion.paso <= 0 ||
    !Number.isInteger(configuracion.maximoPasos) ||
    configuracion.maximoPasos < 1 ||
    !Number.isFinite(configuracion.radioInicio) ||
    configuracion.radioInicio <= 0 ||
    !Number.isFinite(configuracion.radioDetencion) ||
    configuracion.radioDetencion <= 0 ||
    !Number.isFinite(configuracion.limiteEspacio) ||
    configuracion.limiteEspacio <= 0 ||
    !Number.isFinite(configuracion.lineasPorCarga) ||
    configuracion.lineasPorCarga < 1
  ) {
    throw new Error(
      "Configuración de líneas de campo no válida."
    );
  }

  // Fuentes coincidentes equivalen a una carga con la suma algebraica.
  // No cambiamos el estado ni las esferas; solo evitamos sembrar líneas
  // ficticias alrededor de cargas que se cancelan en el mismo punto.
  const agrupadas: CargaElectrica[] = [];
  for (const carga of cargas) {
    const existente = agrupadas.find((otra) => distancia(otra.posicion, carga.posicion) === 0);
    if (existente) existente.valor += carga.valor;
    else agrupadas.push({ ...carga, posicion: { ...carga.posicion } });
  }
  cargas = agrupadas.filter((carga) => carga.valor !== 0);
  configuracion = {
    ...configuracion,
    limiteEspacio: Math.max(configuracion.limiteEspacio,
      ...cargas.map((carga) => Math.max(
        Math.abs(carga.posicion.x), Math.abs(carga.posicion.y), Math.abs(carga.posicion.z)
      ) + 1)),
  };
  const positivas = cargas.filter(
    (carga) => carga.valor > 0
  );

  const negativas = cargas.filter(
    (carga) => carga.valor < 0
  );

  // Sembramos también en negativas; en configuraciones mixtas conservamos
  // sus trazados inversos solo si proceden del borde, sin duplicar conexiones.
  const origenes = [...positivas, ...negativas];

  if (origenes.length === 0) return [];

  // Detectamos un dipolo simétrico:
  // dos cargas opuestas de magnitud equivalente.
  const esDipolo =
    cargas.length === 2 &&
    positivas.length === 1 &&
    negativas.length === 1 &&
    Math.abs(
      positivas[0].valor +
      negativas[0].valor
    ) <=
      1e-6 *
      Math.max(
        Math.abs(positivas[0].valor),
        Math.abs(negativas[0].valor)
      ) &&
    distancia(
      positivas[0].posicion,
      negativas[0].posicion
    ) > 1e-6;

  const cargaMayor = Math.max(
    ...origenes.map((carga) =>
      Math.abs(carga.valor)
    )
  );

  const lineas: Vector3D[][] = [];

  for (const carga of origenes) {
    const proporcion =
      Math.abs(carga.valor) / cargaMayor;

    const cantidad = Math.max(
      3,
      Math.min(
        48,
        Math.round(
          configuracion.lineasPorCarga *
          proporcion
        )
      )
    );

    const direcciones =
      esDipolo
        ? generarDireccionesDipolo(
            carga,
            carga.valor > 0 ? negativas[0] : positivas[0],
            cantidad,
            configuracion.modo
          )
        : generarDireccionesGenerales(
            cantidad,
            configuracion.modo
          );

    const sentido = carga.valor > 0 ? 1 : -1;
    let radioInicio = radioCarga(carga, cargas, configuracion.radioInicio);
    // La carga débil debe dominar E en sus propias semillas, aunque esté
    // cerca de otra de magnitud muy superior.
    const fondo = cargas.filter((otra) => otra !== carga).reduce((suma, otra) => {
      const r = distancia(carga.posicion, otra.posicion);
      return suma + CONSTANTE_COULOMB * Math.abs(otra.valor) / (r * r);
    }, 0);
    if (fondo > 0) radioInicio = Math.min(radioInicio,
      Math.sqrt(CONSTANTE_COULOMB * Math.abs(carga.valor) / (100 * fondo)));

    for (const direccion of direcciones) {
      const origen: Vector3D = {
        x:
          carga.posicion.x +
          direccion.x *
            radioInicio,
        y:
          carga.posicion.y +
          direccion.y *
            radioInicio,
        z:
          configuracion.modo === "2D"
            ? 0
            : carga.posicion.z +
              direccion.z *
                radioInicio,
      };

      const puntos = trazarLineaCampo(
        origen,
        cargas,
        sentido,
        configuracion
      );

      if (puntos.length < 3) continue;

      if (sentido < 0) {
        const ultimo = puntos[puntos.length - 1];
        const llegaAlBorde = Math.max(Math.abs(ultimo.x), Math.abs(ultimo.y), Math.abs(ultimo.z)) >=
          configuracion.limiteEspacio - 1e-8;
        if (positivas.length > 0 && !llegaAlBorde) continue;
        // Trazamos contra E para encontrar el origen, luego ordenamos con E.
        puntos.reverse();
      }

      lineas.push(puntos);
    }
  }

  return lineas;
}
