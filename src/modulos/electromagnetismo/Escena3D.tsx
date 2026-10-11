
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";

import {
  OrbitControls,
  Stars,
} from "@react-three/drei";

import {
  EffectComposer,
  Bloom,
} from "@react-three/postprocessing";

import type {
  CargaElectrica,
  Particula,
  ModoVisualizacion,
  ModuloElectromagnetismo,
  Vector3D,
} from "./tipos";

import type {
  ResultadoTrayectoria,
} from "./fisica/trayectoria";

import Cargas3D from "./componentes/Cargas3D";
import LineasCampo from "./componentes/LineasCampo";
import Equipotenciales from "./componentes/Equipotenciales";
import Particula3D from "./componentes/Particula3D";

interface Propiedades {
  modulo: ModuloElectromagnetismo;
  modo: ModoVisualizacion;

  cargas: CargaElectrica[];

  cargaSeleccionada?: string | null;
  seleccionarCarga?: (id: string | null) => void;

  moverCarga?: (
    id: string,
    posicion: Vector3D
  ) => void;

  mostrarLineas: boolean;
  mostrarEquipotenciales: boolean;
  mostrarCuadricula: boolean;

  puntoConsulta?: Vector3D;

  particula?: Particula;
  trayectoria?: ResultadoTrayectoria | null;

  reproduciendo?: boolean;
  velocidadReproduccion?: number;
  reinicio?: number;
  alFinalizar?: () => void;
}

/**
 * Cuadrícula de referencia sobre el plano XY.
 */
function Cuadricula() {
  return (
    <gridHelper
      args={[20, 40, "#315479", "#17243e"]}
      rotation={[Math.PI / 2, 0, 0]}
      position={[0, 0, -0.05]}
    />
  );
}

/**
 * Marcador del punto de consulta.
 */
function MarcadorConsulta({
  posicion,
}: {
  posicion: Vector3D;
}) {
  return (
    <group
      position={[
        posicion.x,
        posicion.y,
        posicion.z,
      ]}
    >
      <mesh>
        <sphereGeometry args={[0.065, 20, 20]} />
        <meshBasicMaterial
          color="#d8a4ff"
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <torusGeometry args={[0.18, 0.009, 8, 48]} />
        <meshBasicMaterial
          color="#c084fc"
          transparent
          opacity={0.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Escena principal de electromagnetismo.
 */
export default function Escena3D({
  modulo,
  modo,
  cargas,

  cargaSeleccionada,
  seleccionarCarga,
  moverCarga,

  mostrarLineas,
  mostrarEquipotenciales,
  mostrarCuadricula,

  puntoConsulta,
  particula,
  trayectoria,

  reproduciendo = false,
  velocidadReproduccion = 1,
  reinicio = 0,
  alFinalizar,
}: Propiedades) {
  const es2D = modo === "2D";
  const [arrastrando, setArrastrando] = useState(false);
  const [cargasGeometria, setCargasGeometria] = useState(cargas);
  const ultimasCargas = useRef(cargas);
  useEffect(() => {
    ultimasCargas.current = cargas;
  }, [cargas]);
  const cambiarArrastre = useCallback((activo: boolean) => {
    // Cada arrastre comienza con la distribución actual, sin volver durante
    // el primer intervalo a la geometría de un arrastre anterior.
    if (activo) setCargasGeometria(ultimasCargas.current);
    setArrastrando(activo);
  }, []);
  useEffect(() => {
    if (!arrastrando) return;
    const temporizador = window.setInterval(() => {
      setCargasGeometria(ultimasCargas.current);
    }, 120);
    return () => window.clearInterval(temporizador);
  }, [arrastrando]);
  // Las esferas y el panel usan el estado inmediato; la geometría costosa
  // se actualiza a frecuencia limitada y vuelve a calidad completa al soltar.
  const cargasCampo = arrastrando ? cargasGeometria : cargas;

  // Densidad adaptativa de líneas de campo.
  const densidadLineas =
    cargas.length <= 2
      ? 32
      : cargas.length <= 4
        ? 24
        : 20;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#03040e]">
      <Canvas
        key={modo}
        orthographic={es2D}
        camera={
          es2D
            ? {
                position: [0, 0, 18],
                zoom: 50,
                near: 0.1,
                far: 100,
              }
            : {
                position: [7, 5, 13],
                fov: 52,
                near: 0.1,
                far: 120,
              }
        }
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        <color
          attach="background"
          args={["#03040e"]}
        />

        <ambientLight intensity={0.55} />

        <directionalLight
          position={[5, 8, 5]}
          intensity={1.1}
        />

        {/* Fondo espacial */}
        {!es2D && (
          <Stars
            radius={90}
            depth={50}
            count={1800}
            factor={2.5}
            saturation={0}
            fade
          />
        )}

        {/* Cuadrícula */}
        {mostrarCuadricula && <Cuadricula />}

        {/* Cargas eléctricas interactivas */}
        <Cargas3D
          cargas={cargas}
          modo={modo}
          mostrarEtiquetas
          cargaSeleccionada={cargaSeleccionada}
          seleccionarCarga={modulo === "cargas" ? seleccionarCarga : undefined}
          moverCarga={modulo === "cargas" ? moverCarga : undefined}
          cambiarArrastre={cambiarArrastre}
        />

        {/* Líneas de campo con flechas */}
        {mostrarLineas &&
          modulo !== "trayectoria" && (
            <LineasCampo
              cargas={cargasCampo}
              modo={modo}
              densidad={arrastrando ? 8 : densidadLineas}
            />
          )}

        {/* Líneas y superficies equipotenciales */}
        {mostrarEquipotenciales &&
          modulo !== "trayectoria" && (
            <Equipotenciales
              cargas={cargasCampo}
              modo={modo}
              visible
              opacidad={0.18}
            />
          )}

        {/* Punto de consulta del potencial */}
        {modulo === "potencial" &&
          puntoConsulta && (
            <MarcadorConsulta
              posicion={{
                ...puntoConsulta,
                z: es2D
                  ? 0
                  : puntoConsulta.z,
              }}
            />
          )}

        {/* Simulador de trayectoria */}
        {modulo === "trayectoria" &&
          particula && (
            <Particula3D
              particula={particula}
              trayectoria={trayectoria ?? null}
              reproduciendo={reproduciendo}
              velocidadReproduccion={
                velocidadReproduccion
              }
              reinicio={reinicio}
              mostrarTrayectoria
              alFinalizar={alFinalizar}
            />
          )}

        {/* Cámara interactiva */}
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enableRotate={!es2D}
          enableDamping
          dampingFactor={0.07}
          minDistance={2}
          maxDistance={50}
          enablePan
          enableZoom
        />

        {/* Efecto luminoso futurista */}
        <EffectComposer>
          <Bloom
            intensity={0.95}
            luminanceThreshold={0.45}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      {/* Información flotante */}
      <div className="pointer-events-none absolute bottom-5 left-5 rounded-xl border border-cyan-400/20 bg-[#050713]/85 px-4 py-3 backdrop-blur-md">
        <p className="text-xs font-semibold tracking-widest text-cyan-300">
          SIMULACIÓN {modo}
        </p>

        <p className="mt-2 text-xs text-slate-400">
          {cargas.length} / 10 cargas eléctricas
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {modulo === "cargas"
            ? "Líneas de campo eléctrico"
            : modulo === "potencial"
              ? "Consulta de potencial eléctrico"
              : "Movimiento de partículas cargadas"}
        </p>
        {modulo === "cargas" && (
          <p className="mt-2 text-xs text-cyan-200">
            Arrastra una esfera para moverla{es2D ? " en XY" : "; Shift + arrastre vertical para Z"}.
          </p>
        )}
      </div>
    </div>
  );
}
