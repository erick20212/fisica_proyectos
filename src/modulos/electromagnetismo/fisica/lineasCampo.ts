
import type {
  CargaElectrica,
  ModoVisualizacion,
  Vector3D,
} from "../tipos";

import { calcularCampoElectrico } from "./campoElectrico";

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
  try {
    const campo = calcularCampoElectrico(
      posicion,
      cargas
    );

    const modulo = longitud(campo);

    if (
      !Number.isFinite(modulo) ||
      modulo < 1e-12
    ) {
      return null;
    }

    return escalar(campo, sentido / modulo);
  } catch {
    return null;
  }
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

  const destinos = cargas.filter(
    (carga) => carga.valor * sentido < 0
  );

  for (
    let i = 0;
    i < configuracion.maximoPasos;
    i++
  ) {
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
        Math.max(
          configuracion.paso * 0.1,
          distanciaMinima * 0.2
        )
      );
    }

    const siguiente = integrarRK4(
      actual,
      cargas,
      sentido,
      paso
    );

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
      (carga) =>
        distancia(siguiente, carga.posicion) <=
        configuracion.radioDetencion
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

    if (fuera) break;

    if (distancia(actual, siguiente) < 1e-8) {
      break;
    }

    puntos.push(siguiente);
    actual = siguiente;
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
    const mitad = Math.floor(cantidad / 2);

    direcciones.push(ejePlano);

    for (let i = 1; i <= mitad; i++) {
      const angulo =
        0.12 + (i / mitad) * 1.25;

      for (const signo of [-1, 1]) {
        direcciones.push(
          normalizar(
            sumar(
              escalar(ejePlano, Math.cos(angulo)),
              escalar(
                perpendicular,
                signo * Math.sin(angulo)
              )
            )
          )
        );
      }
    }

    return direcciones.slice(0, cantidad);
  }

  // En 3D construimos anillos de semillas
  // con simetría rotacional respecto al dipolo.
  const cantidadAnillos = 4;

  const azimutsPorAnillo = Math.max(
    4,
    Math.ceil(
      (cantidad - 1) / cantidadAnillos
    )
  );

  // Línea central que une ambas cargas.
  direcciones.push(eje);

  for (
    let anillo = 0;
    anillo < cantidadAnillos;
    anillo++
  ) {
    const anguloPolar =
      0.28 + anillo * 0.28;

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

  const positivas = cargas.filter(
    (carga) => carga.valor > 0
  );

  const negativas = cargas.filter(
    (carga) => carga.valor < 0
  );

  const soloNegativas =
    positivas.length === 0;

  const origenes = soloNegativas
    ? negativas
    : positivas;

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
            positivas[0],
            negativas[0],
            cantidad,
            configuracion.modo
          )
        : generarDireccionesGenerales(
            cantidad,
            configuracion.modo
          );

    const sentido = soloNegativas ? -1 : 1;

    for (const direccion of direcciones) {
      const origen: Vector3D = {
        x:
          carga.posicion.x +
          direccion.x *
            configuracion.radioInicio,
        y:
          carga.posicion.y +
          direccion.y *
            configuracion.radioInicio,
        z:
          configuracion.modo === "2D"
            ? 0
            : carga.posicion.z +
              direccion.z *
                configuracion.radioInicio,
      };

      const puntos = trazarLineaCampo(
        origen,
        cargas,
        sentido,
        configuracion
      );

      if (puntos.length < 3) continue;

      // En el caso de cargas negativas aisladas,
      // invertimos la línea para que los puntos
      // estén ordenados en dirección de E.
      if (soloNegativas) {
        puntos.reverse();
      }

      lineas.push(puntos);
    }
  }

  return lineas;
}
