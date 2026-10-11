
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Html,
  TransformControls,
} from "@react-three/drei";
import * as THREE from "three";

import type {
  CargaElectrica,
  ModoVisualizacion,
  Vector3D,
} from "../tipos";

interface Propiedades {
  cargas: CargaElectrica[];
  
  modo?: ModoVisualizacion;
  mostrarEtiquetas?: boolean;

  cargaSeleccionada?: string | null;
  seleccionarCarga?: (id: string | null) => void;

  moverCarga?: (
    id: string,
    posicion: Vector3D
  ) => void;
}

// Colores distintos dentro de cada polaridad.
const COLORES_POSITIVOS = [
  "#ff386b",
  "#ff7849",
  "#ffb347",
  "#ff4d9d",
  "#ff624f",
];

const COLORES_NEGATIVOS = [
  "#00ddff",
  "#4388ff",
  "#45f0c4",
  "#7c83ff",
  "#00b5f5",
];

function obtenerColor(
  valor: number,
  indice: number
): string {
  if (valor > 0) {
    return COLORES_POSITIVOS[
      indice % COLORES_POSITIVOS.length
    ];
  }

  if (valor < 0) {
    return COLORES_NEGATIVOS[
      indice % COLORES_NEGATIVOS.length
    ];
  }

  return "#94a3b8";
}

interface PropiedadesCarga {
  carga: CargaElectrica;
  color: string;
  modo: ModoVisualizacion;
  seleccionada: boolean;
  mostrarEtiqueta: boolean;
  seleccionar: () => void;
  mover: (posicion: Vector3D) => void;
}

/**
 * Modelo visual de una carga.
 * La animación no afecta su posición física.
 */
function ModeloCarga({
  carga,
  color,
  seleccionada,
  mostrarEtiqueta,
  seleccionar,
}: Pick<
  PropiedadesCarga,
  | "carga"
  | "color"
  | "seleccionada"
  | "mostrarEtiqueta"
  | "seleccionar"
>) {
  const visual = useRef<THREE.Group>(null);
  const anilloPrincipal = useRef<THREE.Mesh>(null);
  const anilloSecundario = useRef<THREE.Mesh>(null);

  useFrame((estado, delta) => {
    if (anilloPrincipal.current) {
      anilloPrincipal.current.rotation.z +=
        delta * 0.35;
    }

    if (anilloSecundario.current) {
      anilloSecundario.current.rotation.y +=
        delta * 0.25;
    }

    if (visual.current) {
      const escala =
        1 +
        Math.sin(
          estado.clock.elapsedTime * 2
        ) * 0.035;

      visual.current.scale.setScalar(escala);
    }
  });

  return (
    <group>
      <group ref={visual}>
        {/* Esfera seleccionable */}
        <mesh
          onClick={(evento) => {
            evento.stopPropagation();
            seleccionar();
          }}
        >
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshBasicMaterial
            color={color}
            toneMapped={false}
          />
        </mesh>

        {/* Halo */}
        <mesh
          onClick={(evento) => {
            evento.stopPropagation();
            seleccionar();
          }}
        >
          <sphereGeometry args={[0.23, 32, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.16}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {/* Anillo principal */}
        <mesh
          ref={anilloPrincipal}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry
            args={[0.28, 0.007, 8, 64]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.8}
            toneMapped={false}
          />
        </mesh>

        {/* Anillo secundario */}
        <mesh
          ref={anilloSecundario}
          rotation={[0, Math.PI / 3, 0]}
        >
          <torusGeometry
            args={[0.34, 0.005, 8, 64]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.45}
            toneMapped={false}
          />
        </mesh>

        {/* Resaltado de selección */}
        {seleccionada && (
          <mesh>
            <sphereGeometry args={[0.4, 24, 24]} />
            <meshBasicMaterial
              color={color}
              wireframe
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>

      {/* Etiqueta compacta */}
      {mostrarEtiqueta && (
        <Html
          position={[0.3, 0.27, 0]}
          distanceFactor={12}
          style={{
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <div
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-white/10 bg-[#070b18]/80 px-2 py-1 text-[10px] font-medium shadow-lg"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />

            <span className="text-white">
              {carga.valor > 0 ? "+" : ""}
              {(carga.valor * 1e9).toFixed(2)} nC
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/**
 * Una carga con sus controles de movimiento.
 */
function CargaInteractiva({
  carga,
  color,
  modo,
  seleccionada,
  mostrarEtiqueta,
  seleccionar,
  mover,
}: PropiedadesCarga) {
  const grupo = useRef<THREE.Group>(null);

  const posicion: [
    number,
    number,
    number
  ] = [
    carga.posicion.x,
    carga.posicion.y,
    modo === "2D" ? 0 : carga.posicion.z,
  ];

  function actualizarPosicion() {
    if (!grupo.current) return;

    const siguiente: Vector3D = {
      x: grupo.current.position.x,
      y: grupo.current.position.y,
      z:
        modo === "2D"
          ? 0
          : grupo.current.position.z,
    };

    mover(siguiente);
  }

  const modelo = (
    <group
      ref={grupo}
      position={posicion}
    >
      <ModeloCarga
        carga={carga}
        color={color}
        seleccionada={seleccionada}
        mostrarEtiqueta={mostrarEtiqueta}
        seleccionar={seleccionar}
      />
    </group>
  );

  if (!seleccionada) {
    return modelo;
  }

  return (
    <TransformControls
      mode="translate"
      size={0.75}
      showX
      showY
      showZ={modo === "3D"}
      onObjectChange={actualizarPosicion}
    >
      {modelo}
    </TransformControls>
  );
}

/**
 * Visualiza y permite mover hasta 10 cargas.
 */
export default function Cargas3D({
  cargas,
  modo = "3D",
  mostrarEtiquetas = true,
  cargaSeleccionada = null,
  seleccionarCarga,
  moverCarga,
}: Propiedades) {
  return (
    <group>
      {cargas.slice(0, 10).map((carga, indice) => (
        <CargaInteractiva
          key={carga.id}
          carga={carga}
          color={obtenerColor(carga.valor, indice)}
          modo={modo}
          seleccionada={
            cargaSeleccionada === carga.id
          }
          mostrarEtiqueta={mostrarEtiquetas}
          seleccionar={() =>
            seleccionarCarga?.(carga.id)
          }
          mover={(posicion) =>
            moverCarga?.(carga.id, posicion)
          }
        />
      ))}
    </group>
  );
}
