
import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  Html,
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
  cambiarArrastre?: (activo: boolean) => void;
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
  interactiva: boolean;
  cambiarArrastre?: (activo: boolean) => void;
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
}: Pick<
  PropiedadesCarga,
  | "carga"
  | "color"
  | "seleccionada"
  | "mostrarEtiqueta"
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
        <mesh>
          <sphereGeometry args={[0.15, 32, 32]} />
          <meshBasicMaterial
            color={color}
            toneMapped={false}
          />
        </mesh>

        {/* Halo */}
        <mesh raycast={() => {}}>
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
          raycast={() => {}}
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
          raycast={() => {}}
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
          <mesh raycast={() => {}}>
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
  carga, color, modo, seleccionada, mostrarEtiqueta,
  seleccionar, mover, interactiva, cambiarArrastre,
}: PropiedadesCarga) {
  const { camera, controls, gl } = useThree();
  const arrastre = useRef<{
    pointerId: number;
    target: Pick<Element, "hasPointerCapture" | "setPointerCapture" | "releasePointerCapture">;
    plano: THREE.Plane;
    inicio: THREE.Vector3;
    posicion: THREE.Vector3;
    profundidad: boolean;
    clientY: number;
    metrosPorPixel: number;
    controles: { enabled: boolean } | null;
    habilitados: boolean;
    cursor: string;
  } | null>(null);

  const finalizar = useCallback(() => {
    const actual = arrastre.current;
    if (!actual) return;
    arrastre.current = null;
    if (actual.controles) actual.controles.enabled = actual.habilitados;
    gl.domElement.style.setProperty("cursor", actual.cursor);
    if (actual.target.hasPointerCapture(actual.pointerId)) {
      actual.target.releasePointerCapture(actual.pointerId);
    }
    cambiarArrastre?.(false);
  }, [gl, cambiarArrastre]);

  // Cancelación, pérdida de captura y desmontaje usan la misma limpieza.
  useEffect(() => {
    const canvas = gl.domElement;
    const terminar = () => finalizar();
    canvas.addEventListener("lostpointercapture", terminar);
    canvas.addEventListener("pointercancel", terminar);
    return () => {
      canvas.removeEventListener("lostpointercapture", terminar);
      canvas.removeEventListener("pointercancel", terminar);
      terminar();
    };
  }, [gl, finalizar]);

  function iniciar(evento: ThreeEvent<PointerEvent>) {
    if (!interactiva || evento.button !== 0 || arrastre.current) return;
    evento.stopPropagation();
    const posicion = new THREE.Vector3(
      carga.posicion.x, carga.posicion.y, modo === "2D" ? 0 : carga.posicion.z
    );
    const normal = modo === "2D"
      ? new THREE.Vector3(0, 0, 1)
      : camera.getWorldDirection(new THREE.Vector3());
    const plano = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, posicion);
    const inicio = evento.ray.intersectPlane(plano, new THREE.Vector3());
    if (!inicio) return;
    const controles = controls && "enabled" in controls
      ? controls as unknown as { enabled: boolean } : null;
    // Escala de pantalla en metros, incluso con cámara rotada o zoom.
    const profundidadCamara = Math.abs(posicion.clone().sub(camera.position).dot(normal));
    const altura = camera instanceof THREE.PerspectiveCamera
      ? 2 * profundidadCamara * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / camera.zoom
      : camera instanceof THREE.OrthographicCamera
        ? (camera.top - camera.bottom) / camera.zoom : 1;
    arrastre.current = {
      pointerId: evento.pointerId,
      target: evento.currentTarget as unknown as Pick<Element, "hasPointerCapture" | "setPointerCapture" | "releasePointerCapture">,
      plano, inicio, posicion,
      profundidad: modo === "3D" && evento.shiftKey,
      clientY: evento.clientY,
      metrosPorPixel: altura / Math.max(1, gl.domElement.clientHeight),
      controles, habilitados: controles?.enabled ?? true,
      cursor: gl.domElement.style.cursor,
    };
    // OrbitControls es un objeto externo mutable, no estado de React.
    if (controles) Object.assign(controles, { enabled: false });
    arrastre.current.target.setPointerCapture(evento.pointerId);
    gl.domElement.style.setProperty("cursor", "grabbing");
    seleccionar();
    cambiarArrastre?.(true);
  }

  function desplazar(evento: ThreeEvent<PointerEvent>) {
    const actual = arrastre.current;
    if (!actual || evento.pointerId !== actual.pointerId) return;
    evento.stopPropagation();
    const siguiente = actual.posicion.clone();
    if (actual.profundidad) {
      siguiente.z += (actual.clientY - evento.clientY) * actual.metrosPorPixel;
    } else {
      const punto = evento.ray.intersectPlane(actual.plano, new THREE.Vector3());
      if (!punto) return;
      siguiente.add(punto.sub(actual.inicio));
    }
    mover({ x: siguiente.x, y: siguiente.y, z: modo === "2D" ? 0 : siguiente.z });
  }

  return (
    <group
      position={[carga.posicion.x, carga.posicion.y, modo === "2D" ? 0 : carga.posicion.z]}
      onPointerDown={iniciar}
      onPointerMove={desplazar}
      onPointerUp={(evento) => {
        if (arrastre.current?.pointerId !== evento.pointerId) return;
        desplazar(evento);
        evento.stopPropagation();
        finalizar();
      }}
    >
      <ModeloCarga carga={carga} color={color} seleccionada={seleccionada}
        mostrarEtiqueta={mostrarEtiqueta} />
    </group>
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
  cambiarArrastre,
}: Propiedades) {
  return (
    <group>
      {cargas.slice(0, 10).map((carga, indice) => (
        <CargaInteractiva
          key={carga.id}
          interactiva={Boolean(moverCarga)}
          cambiarArrastre={cambiarArrastre}
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
