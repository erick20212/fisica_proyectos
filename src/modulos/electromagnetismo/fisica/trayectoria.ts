
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

/**
 * Resultado de una simulación completa.
 */
export interface ResultadoTrayectoria {
  puntos: Vector3D[];
  velocidades: Vector3D[];
  tiempos: number[];
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
  const campo = calcularCampoElectrico(
    posicion,
    cargas
  );

  return multiplicarVector(
    campo,
    particula.carga / particula.masa
  );
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

  return {
    ...particula,
    posicion: nuevaPosicion,
    velocidad: nuevaVelocidad,
  };
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

  let actual: Particula = {
    ...particulaInicial,
    posicion: { ...particulaInicial.posicion },
    velocidad: { ...particulaInicial.velocidad },
  };

  const puntos: Vector3D[] = [
    { ...actual.posicion },
  ];

  const velocidades: Vector3D[] = [
    { ...actual.velocidad },
  ];

  const tiempos: number[] = [0];

  let tiempo = 0;

  let motivoFinalizacion:
    ResultadoTrayectoria["motivoFinalizacion"] =
      "maximo_pasos";

  if (
    detectarColision(
      actual.posicion,
      cargas,
      radioColision
    )
  ) {
    return {
      puntos,
      velocidades,
      tiempos,
      motivoFinalizacion: "colision",
    };
  }

  for (let i = 0; i < maximoPasos; i++) {
    const dt = Math.min(
      pasoTiempo,
      tiempoMaximo - tiempo
    );

    if (dt <= 0) {
      motivoFinalizacion = "tiempo_maximo";
      break;
    }

    let siguiente: Particula;

    try {
      siguiente = avanzarParticula(
        actual,
        cargas,
        dt
      );
    } catch {
      motivoFinalizacion = "error_numerico";
      break;
    }

    const valores = [
      ...Object.values(siguiente.posicion),
      ...Object.values(siguiente.velocidad),
    ];

    if (valores.some((v) => !Number.isFinite(v))) {
      motivoFinalizacion = "error_numerico";
      break;
    }

    tiempo += dt;

    puntos.push({ ...siguiente.posicion });
    velocidades.push({ ...siguiente.velocidad });
    tiempos.push(tiempo);

    actual = siguiente;

    if (
      detectarColision(
        actual.posicion,
        cargas,
        radioColision
      )
    ) {
      motivoFinalizacion = "colision";
      break;
    }

    if (
      magnitud(actual.posicion) > limiteEspacio
    ) {
      motivoFinalizacion = "limite_espacio";
      break;
    }

    if (tiempo >= tiempoMaximo) {
      motivoFinalizacion = "tiempo_maximo";
      break;
    }
  }

  return {
    puntos,
    velocidades,
    tiempos,
    motivoFinalizacion,
  };
}
