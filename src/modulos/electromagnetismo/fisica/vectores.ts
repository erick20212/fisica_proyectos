
import type { Vector3D } from "../tipos";

/**
 * Suma dos vectores.
 */
export function sumarVectores(
  a: Vector3D,
  b: Vector3D
): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

/**
 * Resta dos vectores.
 */
export function restarVectores(
  a: Vector3D,
  b: Vector3D
): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

/**
 * Multiplica un vector por un escalar.
 */
export function multiplicarVector(
  vector: Vector3D,
  escalar: number
): Vector3D {
  return {
    x: vector.x * escalar,
    y: vector.y * escalar,
    z: vector.z * escalar,
  };
}

/**
 * Obtiene la magnitud de un vector.
 */
export function magnitud(
  vector: Vector3D
): number {
  return Math.hypot(
    vector.x,
    vector.y,
    vector.z
  );
}

/**
 * Normaliza un vector.
 *
 * Si la magnitud es cero, devuelve
 * un vector nulo.
 */
export function normalizar(
  vector: Vector3D
): Vector3D {
  const longitud = magnitud(vector);

  if (longitud === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  return multiplicarVector(
    vector,
    1 / longitud
  );
}

/**
 * Distancia euclidiana entre dos puntos.
 */
export function distancia(
  a: Vector3D,
  b: Vector3D
): number {
  return magnitud(restarVectores(a, b));
}

/**
 * Producto escalar de dos vectores.
 */
export function productoEscalar(
  a: Vector3D,
  b: Vector3D
): number {
  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}

/**
 * Producto vectorial de dos vectores.
 *
 * Se utilizará posteriormente
 * para la fuerza magnética.
 */
export function productoVectorial(
  a: Vector3D,
  b: Vector3D
): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
