
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

import type { Particula } from "../tipos";
import type { ResultadoTrayectoria } from "../fisica/trayectoria";
import { interpolarPosicion } from "../fisica/trayectoria";

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
  const reproduccionAnterior = useRef(false);
  const primerFotograma = useRef(true);

  const color =
    particula.carga > 0
      ? "#ff4d91"
      : particula.carga < 0
        ? "#42e8ff"
        : "#c084fc";

  const puntosLinea = useMemo(() => {
    if (!trayectoria) return [];

    return trayectoria.puntos.filter((punto, indice, puntos) => {
      const anterior = puntos[indice - 1];
      return !anterior || punto.x !== anterior.x || punto.y !== anterior.y || punto.z !== anterior.z;
    }).map(
      (punto): [number, number, number] => [
        punto.x,
        punto.y,
        punto.z,
      ]
    );
  }, [trayectoria]);

  useFrame((_, delta) => {
    if (!grupo.current) return;

    const reiniciada = primerFotograma.current || ultimoReinicio.current !== reinicio ||
      trayectoriaAnterior.current !== trayectoria;
    primerFotograma.current = false;
    const iniciaReproduccion = reproduciendo && !reproduccionAnterior.current;
    reproduccionAnterior.current = reproduciendo;

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

    const repetir = iniciaReproduccion && finalNotificado.current;
    if (repetir) {
      tiempoActual.current = 0;
      finalNotificado.current = false;
    }

    // El primer fotograma de un lanzamiento/reinicio muestra exactamente t=0.
    if (reproduciendo && !finalNotificado.current && !reiniciada && !repetir) {
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
