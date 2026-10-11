
import { useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";

import type {
  CargaElectrica,
  ModoVisualizacion,
} from "../tipos";

import {
  generarEquipotenciales2D,
  generarEquipotenciales3D,
  CONFIGURACION_EQUIPOTENCIALES,
} from "../fisica/equipotenciales";

// Propiedades del componente
interface Propiedades {
  cargas: CargaElectrica[];
  modo?: ModoVisualizacion;
  niveles?: number[];
  visible?: boolean;
  opacidad?: number;
}

// Colores de potencial
function obtenerColor(potencial: number): string {
  if (potencial > 0) return "#ff4e91";
  if (potencial < 0) return "#36dfff";
  return "#c084fc";
}

/**
 * Líneas equipotenciales en el plano XY.
 *
 * Cada segmento representa una porción
 * de una curva de potencial constante.
 */
function Equipotenciales2D({
  cargas,
  niveles,
}: {
  cargas: CargaElectrica[];
  niveles: number[];
}) {
  const segmentos = useMemo(() => {
    return generarEquipotenciales2D(
      cargas,
      niveles,
      CONFIGURACION_EQUIPOTENCIALES
    );
  }, [cargas, niveles]);

  return (
    <group>
      {segmentos.map((segmento, indice) => (
        <Line
          key={indice}
          points={[
            [
              segmento.inicio.x,
              segmento.inicio.y,
              0.015,
            ],
            [
              segmento.fin.x,
              segmento.fin.y,
              0.015,
            ],
          ]}
          color={obtenerColor(segmento.potencial)}
          lineWidth={1.8}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      ))}
    </group>
  );
}

/**
 * Superficies equipotenciales 3D.
 *
 * Se generan mallas triangulares
 * mediante el algoritmo físico.
 */
function Equipotenciales3D({
  cargas,
  niveles,
  opacidad,
}: {
  cargas: CargaElectrica[];
  niveles: number[];
  opacidad: number;
}) {
  const superficies = useMemo(() => {
    return generarEquipotenciales3D(
      cargas,
      niveles,
      CONFIGURACION_EQUIPOTENCIALES
    );
  }, [cargas, niveles]);

  const geometrias = useMemo(() => {
    return superficies.map((superficie) => {
      const geometria = new THREE.BufferGeometry();

      geometria.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          superficie.vertices,
          3
        )
      );

      geometria.computeVertexNormals();

      return {
        potencial: superficie.potencial,
        geometria,
      };
    });
  }, [superficies]);

  return (
    <group>
      {geometrias.map((superficie, indice) => (
        <mesh
          key={indice}
          geometry={superficie.geometria}
        >
          <meshPhongMaterial
            color={obtenerColor(superficie.potencial)}
            emissive={obtenerColor(superficie.potencial)}
            emissiveIntensity={0.35}
            transparent
            opacity={opacidad}
            side={THREE.DoubleSide}
            depthWrite={false}
            shininess={80}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Componente principal de equipotenciales.
 *
 * Selecciona automáticamente
 * la visualización 2D o 3D.
 */
export default function Equipotenciales({
  cargas,
  modo = "3D",
  niveles,
  visible = true,
  opacidad = 0.22,
}: Propiedades) {
  const nivelesCalculados = useMemo(
    () => niveles ?? [-100, -50, -20, 0, 20, 50, 100],
    [niveles]
  );

  if (!visible || cargas.length === 0) {
    return null;
  }

  if (modo === "2D") {
    return (
      <Equipotenciales2D
        cargas={cargas}
        niveles={nivelesCalculados}
      />
    );
  }

  return (
    <>
      <ambientLight intensity={0.5} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
      />

      <Equipotenciales3D
        cargas={cargas}
        niveles={nivelesCalculados}
        opacidad={opacidad}
      />
    </>
  );
}
