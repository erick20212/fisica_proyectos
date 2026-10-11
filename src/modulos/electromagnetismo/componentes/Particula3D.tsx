
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

import type { Particula, Vector3D } from "../tipos";
import type { ResultadoTrayectoria } from "../fisica/trayectoria";

interface Propiedades {
  particula: Particula;
  trayectoria: ResultadoTrayectoria | null;
  reproduciendo: boolean;
  velocidadReproduccion?: number;
  reinicio?: number;
  mostrarTrayectoria?: boolean;
  alFinalizar?: () => void;
}

/**
 * Obtiene la posición interpolada de la partícula
 * para un tiempo determinado.
 *
 * Utiliza los tiempos calculados por el motor físico.
 */
function interpolarPosicion(
  trayectoria: ResultadoTrayectoria,
  tiempo: number
): Vector3D {
  const { puntos, tiempos } = trayectoria;

  if (puntos.length === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  if (tiempo <= 0 || puntos.length === 1) {
    return puntos[0];
  }

  const ultimo = tiempos.length - 1;

  if (tiempo >= tiempos[ultimo]) {
    return puntos[ultimo];
  }

  // Búsqueda binaria del intervalo temporal.
  let izquierda = 0;
  let derecha = ultimo;

  while (derecha - izquierda > 1) {
    const medio = Math.floor(
      (izquierda + derecha) / 2
    );

    if (tiempos[medio] <= tiempo) {
      izquierda = medio;
    } else {
      derecha = medio;
    }
  }

  const t0 = tiempos[izquierda];
  const t1 = tiempos[derecha];

  const factor = (tiempo - t0) / (t1 - t0);

  const a = puntos[izquierda];
  const b = puntos[derecha];

  return {
    x: a.x + (b.x - a.x) * factor,
    y: a.y + (b.y - a.y) * factor,
    z: a.z + (b.z - a.z) * factor,
  };
}

/**
 * Partícula animada con una trayectoria
 * calculada previamente.
 *
 * La posición visible se obtiene interpolando
 * los resultados del motor físico.
 */
export default function Particula3D({
  particula,
  trayectoria,
  reproduciendo,
  velocidadReproduccion = 1,
  reinicio = 0,
  mostrarTrayectoria = true,
  alFinalizar,
}: Propiedades) {
  const grupo = useRef<THREE.Group>(null);

  const tiempoActual = useRef(0);
  const ultimoReinicio = useRef(reinicio);
  const trayectoriaAnterior = useRef(trayectoria);
  const finalNotificado = useRef(false);

  const color =
    particula.carga > 0
      ? "#ff4d91"
      : particula.carga < 0
        ? "#42e8ff"
        : "#c084fc";

  const puntosLinea = useMemo(() => {
    if (!trayectoria) return [];

    return trayectoria.puntos.map(
      (punto): [number, number, number] => [
        punto.x,
        punto.y,
        punto.z,
      ]
    );
  }, [trayectoria]);

  useFrame((_, delta) => {
    if (!grupo.current) return;

    if (
      ultimoReinicio.current !== reinicio ||
      trayectoriaAnterior.current !== trayectoria
    ) {
      tiempoActual.current = 0;
      ultimoReinicio.current = reinicio;
      trayectoriaAnterior.current = trayectoria;
      finalNotificado.current = false;
    }

    if (!trayectoria || trayectoria.tiempos.length === 0) {
      grupo.current.position.set(
        particula.posicion.x,
        particula.posicion.y,
        particula.posicion.z
      );
      return;
    }

    const tiempoFinal =
      trayectoria.tiempos[trayectoria.tiempos.length - 1];

    if (reproduciendo && !finalNotificado.current) {
      tiempoActual.current = Math.min(
        tiempoFinal,
        tiempoActual.current +
          delta * Math.max(0, velocidadReproduccion)
      );
    }

    const posicion = interpolarPosicion(
      trayectoria,
      tiempoActual.current
    );

    grupo.current.position.set(
      posicion.x,
      posicion.y,
      posicion.z
    );

    if (
      reproduciendo &&
      tiempoActual.current >= tiempoFinal &&
      !finalNotificado.current
    ) {
      finalNotificado.current = true;
      alFinalizar?.();
    }
  });

  return (
    <group>
      {/* Trayectoria calculada */}
      {mostrarTrayectoria && puntosLinea.length >= 2 && (
        <Line
          points={puntosLinea}
          color={color}
          lineWidth={2}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      )}

      {/* Partícula animada */}
      <group
        ref={grupo}
        position={[
          particula.posicion.x,
          particula.posicion.y,
          particula.posicion.z,
        ]}
      >
        {/* Núcleo */}
        <mesh>
          <sphereGeometry args={[0.085, 24, 24]} />
          <meshBasicMaterial
            color={color}
            toneMapped={false}
          />
        </mesh>

        {/* Halo exterior */}
        <mesh>
          <sphereGeometry args={[0.16, 24, 24]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.16}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Anillo holográfico */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.19, 0.006, 8, 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.75}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
