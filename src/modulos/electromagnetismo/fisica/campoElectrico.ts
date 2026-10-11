
import type {
  CargaElectrica,
  Vector3D,
  ResultadoCampoElectrico,
} from "../tipos";

import {
  restarVectores,
  multiplicarVector,
  sumarVectores,
  magnitud,
} from "./vectores";

/**
 * Constante de Coulomb en el vacío.
 * Unidades: N·m²/C²
 */
export const CONSTANTE_COULOMB = 8.9875517923e9;

/**
 * Distancia mínima para detectar puntos
 * demasiado cercanos a una carga puntual.
 *
 * Unidades: metros.
 */
const DISTANCIA_MINIMA = 1e-9;

/**
 * Número máximo de cargas permitido
 * por los requisitos de la Unidad 1.
 */
export const MAXIMO_CARGAS = 10;

/**
 * Verifica que las coordenadas sean válidas.
 */
function validarVector(vector: Vector3D): void {
  if (
    !Number.isFinite(vector.x) ||
    !Number.isFinite(vector.y) ||
    !Number.isFinite(vector.z)
  ) {
    throw new Error(
      "Las coordenadas deben ser números finitos."
    );
  }
}

/**
 * Valida una distribución de cargas.
 */
export function validarCargas(
  cargas: CargaElectrica[]
): void {
  if (cargas.length > MAXIMO_CARGAS) {
    throw new Error(
      `Se permiten como máximo ${MAXIMO_CARGAS} cargas.`
    );
  }

  for (const carga of cargas) {
    if (!Number.isFinite(carga.valor)) {
      throw new Error(
        "El valor de cada carga debe ser finito."
      );
    }

    validarVector(carga.posicion);
  }
}

/**
 * Calcula el campo eléctrico producido
 * por una sola carga puntual.
 *
 * E = k · q · r_vector / |r_vector|³
 *
 * Retorna N/C.
 */
export function calcularCampoCarga(
  punto: Vector3D,
  carga: CargaElectrica
): Vector3D {
  validarVector(punto);
  validarVector(carga.posicion);

  if (!Number.isFinite(carga.valor)) {
    throw new Error("El valor de la carga no es válido.");
  }

  if (carga.valor === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const desplazamiento = restarVectores(
    punto,
    carga.posicion
  );

  const r = magnitud(desplazamiento);

  if (r < DISTANCIA_MINIMA) {
    throw new Error(
      "El campo eléctrico no está definido en la posición de una carga puntual."
    );
  }

  const factor =
    (CONSTANTE_COULOMB * carga.valor) /
    (r * r * r);

  return multiplicarVector(
    desplazamiento,
    factor
  );
}

/**
 * Calcula el campo eléctrico total generado
 * por una distribución de cargas puntuales.
 *
 * Aplica el principio de superposición:
 *
 * E_total = E1 + E2 + ... + En
 */
export function calcularCampoElectrico(
  punto: Vector3D,
  cargas: CargaElectrica[]
): Vector3D {
  validarVector(punto);
  validarCargas(cargas);

  let campoTotal: Vector3D = {
    x: 0,
    y: 0,
    z: 0,
  };

  for (const carga of cargas) {
    const campo = calcularCampoCarga(
      punto,
      carga
    );

    campoTotal = sumarVectores(
      campoTotal,
      campo
    );
  }

  return campoTotal;
}

/**
 * Retorna el campo eléctrico junto con
 * su intensidad y posición de consulta.
 */
export function obtenerResultadoCampo(
  punto: Vector3D,
  cargas: CargaElectrica[]
): ResultadoCampoElectrico {
  const campo = calcularCampoElectrico(
    punto,
    cargas
  );

  return {
    posicion: { ...punto },
    campo,
    magnitud: magnitud(campo),
  };
}

/**
 * Calcula la fuerza eléctrica que actúa
 * sobre una carga de prueba.
 *
 * F = q · E
 *
 * Retorna newtons (N).
 */
export function calcularFuerzaElectrica(
  cargaPrueba: number,
  campo: Vector3D
): Vector3D {
  if (!Number.isFinite(cargaPrueba)) {
    throw new Error(
      "La carga de prueba debe ser finita."
    );
  }

  validarVector(campo);

  return multiplicarVector(
    campo,
    cargaPrueba
  );
}
