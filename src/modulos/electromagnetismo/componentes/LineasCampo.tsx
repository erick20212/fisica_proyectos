
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { direccionCampoElectrico } from "../fisica/campoElectrico";

import type {
  CargaElectrica,
  ModoVisualizacion,
  Vector3D,
} from "../tipos";

import {
  generarLineasCampo,
  CONFIGURACION_LINEAS,
} from "../fisica/lineasCampo";

interface Propiedades {
  cargas: CargaElectrica[];
  modo?: ModoVisualizacion;
  densidad?: number;
  mostrarParticulas?: boolean;
}

interface FlechaPreparada {
  posicion: THREE.Vector3;
  rotacion: THREE.Quaternion;
}

interface LineaPreparada {
  puntos: [number, number, number][];
  flechas: FlechaPreparada[];
}

const EJE_VERTICAL = new THREE.Vector3(0, 1, 0);

/**
 * Controla la cantidad de líneas por carga.
 */
function calcularDensidad(
  cantidadCargas: number,
  densidad: number
): number {
  const base = Math.max(
    3,
    Math.min(48, Math.round(densidad))
  );

  if (cantidadCargas <= 2) return base;

  if (cantidadCargas <= 4) {
    return Math.max(5, Math.round(base * 0.65));
  }

  if (cantidadCargas <= 6) {
    return Math.max(4, Math.round(base * 0.45));
  }

  return Math.max(3, Math.round(base * 0.3));
}

/**
 * Calcula las longitudes acumuladas
 * de una trayectoria.
 */
function calcularDistancias(
  puntos: Vector3D[]
): number[] {
  const distancias = [0];

  for (let i = 1; i < puntos.length; i++) {
    const anterior = puntos[i - 1];
    const actual = puntos[i];

    const distancia = Math.hypot(
      actual.x - anterior.x,
      actual.y - anterior.y,
      actual.z - anterior.z
    );

    distancias.push(
      distancias[i - 1] + distancia
    );
  }

  return distancias;
}

/**
 * Coloca una flecha en un porcentaje
 * de la longitud total de la curva.
 */
function crearFlecha(
  puntos: Vector3D[],
  distancias: number[],
  progreso: number,
  cargas: CargaElectrica[]
): FlechaPreparada | null {
  if (puntos.length < 2) return null;

  const total = distancias[distancias.length - 1];

  if (total < 1e-8) return null;

  const objetivo = total * progreso;

  let indice = 1;

  while (
    indice < distancias.length - 1 &&
    distancias[indice] < objetivo
  ) {
    indice++;
  }

  const anterior = puntos[indice - 1];
  const siguiente = puntos[indice];

  const tramo =
    distancias[indice] -
    distancias[indice - 1];

  if (tramo < 1e-10) return null;

  const factor = THREE.MathUtils.clamp(
    (objetivo - distancias[indice - 1]) /
      tramo,
    0,
    1
  );

  const posicion = new THREE.Vector3(
    THREE.MathUtils.lerp(
      anterior.x,
      siguiente.x,
      factor
    ),
    THREE.MathUtils.lerp(
      anterior.y,
      siguiente.y,
      factor
    ),
    THREE.MathUtils.lerp(
      anterior.z,
      siguiente.z,
      factor
    )
  );

  // Siempre E total en la posición de la flecha: nunca una carga destino.
  const campo = direccionCampoElectrico(posicion, cargas);
  if (!campo) return null;
  const direccion = new THREE.Vector3(campo.x, campo.y, campo.z);
  const tangente = new THREE.Vector3(
    siguiente.x - anterior.x,
    siguiente.y - anterior.y,
    siguiente.z - anterior.z
  ).normalize();
  // Un tramo que no representa bien E no debe recibir una flecha engañosa.
  if (tangente.dot(direccion) < 0.99) return null;

  const rotacion =
    new THREE.Quaternion().setFromUnitVectors(
      EJE_VERTICAL,
      direccion
    );

  return { posicion, rotacion };
}

/**
 * Flecha 3D sobre una línea de campo.
 */
function FlechaDireccion({
  posicion,
  rotacion,
  color,
}: FlechaPreparada & {
  color: string;
}) {
  return (
    <group
      position={posicion}
      quaternion={rotacion}
    >
      {/* Cuerpo */}
      <mesh position={[0, -0.055, 0]}>
        <cylinderGeometry
          args={[0.012, 0.012, 0.11, 8]}
        />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
        />
      </mesh>

      {/* Punta */}
      <mesh position={[0, 0.045, 0]}>
        <coneGeometry
          args={[0.044, 0.11, 10]}
        />
        <meshBasicMaterial
          color={color}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Visualización tridimensional de líneas
 * de campo eléctrico con flechas.
 */
export default function LineasCampo({
  cargas,
  modo = "3D",
  densidad = 32,
}: Propiedades) {
  const lineas = useMemo<LineaPreparada[]>(() => {
    if (cargas.length === 0) return [];

    const densidadFinal = calcularDensidad(
      cargas.length,
      densidad
    );

    const configuracion = {
      ...CONFIGURACION_LINEAS,
      modo,
      lineasPorCarga: densidadFinal,
    };

    const resultados = generarLineasCampo(
      cargas,
      configuracion
    );

    return resultados
      .filter((puntos) => puntos.length >= 3)
      .map((puntos) => {
        // Dibujamos directamente los puntos
        // calculados por el motor físico.
        const coordenadas: [
          number,
          number,
          number
        ][] = puntos.map((punto) => [
          punto.x,
          punto.y,
          punto.z,
        ]);

        const distancias =
          calcularDistancias(puntos);

        const longitud =
          distancias[distancias.length - 1];

        // Más flechas en trayectorias largas.
        const posiciones =
          longitud > 2.5
            ? [0.3, 0.65]
            : [0.5];

        const flechas = posiciones
          .map((progreso) =>
            crearFlecha(
              puntos,
              distancias,
              progreso,
              cargas
            )
          )
          .filter(
            (flecha): flecha is FlechaPreparada =>
              flecha !== null
          );

        return {
          puntos: coordenadas,
          flechas,
        };
      });
  }, [cargas, modo, densidad]);

  const opacidad =
    cargas.length <= 2
      ? 0.75
      : cargas.length <= 5
        ? 0.6
        : 0.45;

  const grosor =
    cargas.length <= 2 ? 1.5 : 1.1;

  return (
    <group>
      {lineas.map((linea, indice) => (
        <group key={indice}>
          {/* Trayectoria física */}
          <Line
            points={linea.puntos}
            color="#39dfff"
            lineWidth={grosor}
            transparent
            opacity={opacidad}
            depthWrite={false}
            toneMapped={false}
          />

          {/* Flechas de dirección */}
          {linea.flechas.map(
            (flecha, indiceFlecha) => (
              <FlechaDireccion
                key={indiceFlecha}
                posicion={flecha.posicion}
                rotacion={flecha.rotacion}
                color="#b9f7ff"
              />
            )
          )}
        </group>
      ))}
    </group>
  );
}
