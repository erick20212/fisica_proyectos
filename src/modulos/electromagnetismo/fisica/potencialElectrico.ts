
import type {
  CargaElectrica,
  Vector3D,
  ResultadoPotencial,
} from "../tipos";

import { distancia } from "./vectores";

import {
  CONSTANTE_COULOMB,
  validarCargas,
} from "./campoElectrico";

/**
 * Distancia mínima para detectar singularidades.
 * Unidades: metros.
 */
const DISTANCIA_MINIMA = 1e-9;

/**
 * Calcula el potencial eléctrico generado
 * por una carga puntual.
 *
 * V = k · q / r
 *
 * Resultado en voltios (V).
 */
export function calcularPotencialCarga(
  punto: Vector3D,
  carga: CargaElectrica
): number {
  if (
    !Number.isFinite(punto.x) ||
    !Number.isFinite(punto.y) ||
    !Number.isFinite(punto.z)
  ) {
    throw new Error(
      "Las coordenadas del punto deben ser válidas."
    );
  }

  if (!Number.isFinite(carga.valor)) {
    throw new Error(
      "El valor de la carga debe ser válido."
    );
  }

  if (carga.valor === 0) {
    return 0;
  }

  const r = distancia(punto, carga.posicion);

  if (!Number.isFinite(r)) {
    throw new Error(
      "La posición de la carga no es válida."
    );
  }

  if (r < DISTANCIA_MINIMA) {
    throw new Error(
      "El potencial no tiene un valor finito en la posición de una carga puntual."
    );
  }

  return (CONSTANTE_COULOMB * carga.valor) / r;
}

/**
 * Calcula el potencial eléctrico total.
 *
 * Aplica el principio de superposición:
 *
 * Vtotal = V1 + V2 + ... + Vn
 *
 * Resultado en voltios.
 */
export function calcularPotencialElectrico(
  punto: Vector3D,
  cargas: CargaElectrica[]
): number {
  validarCargas(cargas);

  let potencialTotal = 0;

  for (const carga of cargas) {
    potencialTotal += calcularPotencialCarga(
      punto,
      carga
    );
  }

  return potencialTotal;
}

/**
 * Devuelve la posición de consulta
 * y el potencial calculado.
 */
export function obtenerResultadoPotencial(
  punto: Vector3D,
  cargas: CargaElectrica[]
): ResultadoPotencial {
  const potencial = calcularPotencialElectrico(
    punto,
    cargas
  );

  return {
    posicion: { ...punto },
    potencial,
  };
}

/**
 * Calcula la energía potencial eléctrica
 * de una carga de prueba.
 *
 * U = q · V
 *
 * Resultado en joules (J).
 */
export function calcularEnergiaPotencial(
  cargaPrueba: number,
  potencial: number
): number {
  if (
    !Number.isFinite(cargaPrueba) ||
    !Number.isFinite(potencial)
  ) {
    throw new Error(
      "La carga y el potencial deben ser finitos."
    );
  }

  return cargaPrueba * potencial;
}
