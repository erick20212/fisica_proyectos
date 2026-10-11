
import { useCallback, useMemo, useState } from "react";
import {
  Zap,
  Calculator,
  Route,
  Layers3,
} from "lucide-react";

import Escena3D from "./Escena3D";

import ControlesCargas from "./controles/ControlesCargas";
import ControlesPotencial from "./controles/ControlesPotencial";
import ControlesTrayectoria from "./controles/ControlesTrayectoria";

import type {
  CargaElectrica,
  Particula,
  Vector3D,
  ModoVisualizacion,
  ModuloElectromagnetismo,
} from "./tipos";

import type {
  ResultadoTrayectoria,
  ConfiguracionTrayectoria,
} from "./fisica/trayectoria";
import { CONFIGURACION_TRAYECTORIA } from "./fisica/trayectoria";

// ========================================
// CONFIGURACIONES INICIALES
// ========================================

const CARGAS_INICIALES: CargaElectrica[] = [
  {
    id: "carga-positiva",
    valor: 2e-9,
    posicion: {
      x: -2.5,
      y: 0,
      z: 0,
    },
  },
  {
    id: "carga-negativa",
    valor: -2e-9,
    posicion: {
      x: 2.5,
      y: 0,
      z: 0,
    },
  },
];

const PARTICULA_INICIAL: Particula = {
  id: "particula-principal",
  carga: 1e-9,
  masa: 1e-6,
  posicion: { x: 0, y: -1.5, z: 0 },
  velocidad: { x: 1, y: 0, z: 0 },
};

const MODULOS = [
  {
    id: "cargas",
    titulo: "Cargas puntuales",
    icono: Zap,
  },
  {
    id: "potencial",
    titulo: "Potencial eléctrico",
    icono: Calculator,
  },
  {
    id: "trayectoria",
    titulo: "Trayectoria",
    icono: Route,
  },
] as const;

function copiarCargas(): CargaElectrica[] {
  return CARGAS_INICIALES.map((carga) => ({
    ...carga,
    posicion: { ...carga.posicion },
  }));
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

export default function Electromagnetismo() {
  const [modulo, setModulo] =
    useState<ModuloElectromagnetismo>("cargas");

  const [modo, setModo] =
    useState<ModoVisualizacion>("3D");

  const [cargas, setCargas] =
    useState<CargaElectrica[]>(copiarCargas);

  // NUEVO: selección de una carga en la escena.
  const [
    cargaSeleccionada,
    setCargaSeleccionada,
  ] = useState<string | null>(null);

  const [mostrarLineas, setMostrarLineas] =
    useState(true);

  const [
    mostrarEquipotenciales,
    setMostrarEquipotenciales,
  ] = useState(false);

  const [
    mostrarCuadricula,
    setMostrarCuadricula,
  ] = useState(true);

  const [puntoConsulta, setPuntoConsulta] =
    useState<Vector3D>({
      x: 0,
      y: 1,
      z: 0,
    });

  const [particula, setParticula] =
    useState<Particula>({
      ...PARTICULA_INICIAL,
      posicion: { ...PARTICULA_INICIAL.posicion },
      velocidad: { ...PARTICULA_INICIAL.velocidad },
    });

  const [trayectoria, setTrayectoria] =
    useState<ResultadoTrayectoria | null>(null);
  const [configuracionTrayectoria, setConfiguracionTrayectoria] =
    useState<ConfiguracionTrayectoria>({ ...CONFIGURACION_TRAYECTORIA });

  const [reproduciendo, setReproduciendo] =
    useState(false);

  const [
    velocidadReproduccion,
    setVelocidadReproduccion,
  ] = useState(1);

  const [reinicio, setReinicio] = useState(0);

  // ========================================
  // SIMULACIÓN DE TRAYECTORIA
  // ========================================

  const invalidarTrayectoria = useCallback(() => {
    setReproduciendo(false);
    setTrayectoria(null);
    setReinicio((valor) => valor + 1);
  }, []);

  // ========================================
  // CAMBIAR MODO 2D / 3D
  // ========================================

  function cambiarModo(nuevoModo: ModoVisualizacion) {
    if (nuevoModo === modo) return;

    setModo(nuevoModo);
    setCargaSeleccionada(null);

    if (nuevoModo === "2D") {
      setCargas((anteriores) =>
        anteriores.map((carga) => ({
          ...carga,
          posicion: {
            ...carga.posicion,
            z: 0,
          },
        }))
      );

      setPuntoConsulta((anterior) => ({
        ...anterior,
        z: 0,
      }));

      setParticula((anterior) => ({
        ...anterior,
        posicion: {
          ...anterior.posicion,
          z: 0,
        },
        velocidad: {
          ...anterior.velocidad,
          z: 0,
        },
      }));
    }

    invalidarTrayectoria();
  }

  // ========================================
  // AGREGAR CARGA
  // ========================================

  function agregarCarga(valor: number) {
    if (!Number.isFinite(valor)) return;

    setCargas((anteriores) => {
      if (anteriores.length >= 10) {
        return anteriores;
      }

      const nuevaCarga: CargaElectrica = {
        id: crypto.randomUUID(),
        valor,
        posicion: {
          x: 0,
          y: 0.5 + anteriores.length * 0.5,
          z: 0,
        },
      };

      return [...anteriores, nuevaCarga];
    });

    invalidarTrayectoria();
  }

  // ========================================
  // ELIMINAR CARGA
  // ========================================

  function eliminarCarga(id: string) {
    setCargas((anteriores) =>
      anteriores.filter((carga) => carga.id !== id)
    );

    if (cargaSeleccionada === id) {
      setCargaSeleccionada(null);
    }

    invalidarTrayectoria();
  }

  // ========================================
  // ACTUALIZAR CARGA DESDE EL PANEL
  // ========================================

  function actualizarCarga(
    id: string,
    cambios: Partial<CargaElectrica>
  ) {
    setCargas((anteriores) =>
      anteriores.map((carga) => {
        if (carga.id !== id) return carga;

        const actualizada: CargaElectrica = {
          ...carga,
          ...cambios,
          id: carga.id,
        };

        if (modo === "2D") {
          actualizada.posicion = {
            ...actualizada.posicion,
            z: 0,
          };
        }

        return actualizada;
      })
    );

    invalidarTrayectoria();
  }

  // ========================================
  // NUEVO: MOVER CARGA DESDE LA ESCENA 3D
  // ========================================

  const moverCarga = useCallback(
    (id: string, nuevaPosicion: Vector3D) => {
      if (
        !Number.isFinite(nuevaPosicion.x) ||
        !Number.isFinite(nuevaPosicion.y) ||
        !Number.isFinite(nuevaPosicion.z)
      ) {
        return;
      }

      const posicion: Vector3D = {
        x: nuevaPosicion.x,
        y: nuevaPosicion.y,
        z: modo === "2D" ? 0 : nuevaPosicion.z,
      };

      setCargas((anteriores) =>
        anteriores.map((carga) => {
          if (carga.id !== id) return carga;

          if (
            carga.posicion.x === posicion.x &&
            carga.posicion.y === posicion.y &&
            carga.posicion.z === posicion.z
          ) {
            return carga;
          }

          return {
            ...carga,
            posicion: { ...posicion },
          };
        })
      );

      // La trayectoria calculada anteriormente
      // deja de ser válida si se mueve una carga.
      setReproduciendo(false);
      setTrayectoria(null);
    },
    [modo]
  );

  // ========================================
  // RESTABLECER CARGAS
  // ========================================

  function restablecerCargas() {
    setCargas(copiarCargas());
    setCargaSeleccionada(null);
    invalidarTrayectoria();
  }

  // ========================================
  // CONFIGURACIÓN DE PARTÍCULA
  // ========================================

  function cambiarParticula(nueva: Particula) {
    const actualizada =
      modo === "2D"
        ? {
            ...nueva,
            posicion: {
              ...nueva.posicion,
              z: 0,
            },
            velocidad: {
              ...nueva.velocidad,
              z: 0,
            },
          }
        : nueva;

    setParticula(actualizada);
    invalidarTrayectoria();
  }

  // ========================================
  // NAVEGACIÓN ENTRE MÓDULOS
  // ========================================

  function seleccionarModulo(
    nuevoModulo: ModuloElectromagnetismo
  ) {
    setModulo(nuevoModulo);
    setCargaSeleccionada(null);

    if (nuevoModulo !== "trayectoria") {
      setReproduciendo(false);
    }
  }

  function reiniciarAnimacion() {
    setReinicio((valor) => valor + 1);
  }

  const finalizarAnimacion = useCallback(() => {
    setReproduciendo(false);
  }, []);

  const tituloModulo = useMemo(() => {
    switch (modulo) {
      case "cargas":
        return "Visualizador de cargas puntuales";

      case "potencial":
        return "Calculadora de potencial eléctrico";

      case "trayectoria":
        return "Simulador de trayectoria";
    }
  }, [modulo]);

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050713] text-white">
      {/* Encabezado */}
      <div className="shrink-0 border-b border-white/10 bg-[#080d1c] px-5 py-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2">
            <Layers3
              size={20}
              className="text-cyan-300"
            />
          </div>

          <div>
            <p className="text-xs tracking-widest text-cyan-400">
              UNIDAD 01
            </p>

            <h1 className="text-sm font-semibold text-white md:text-base">
              Electricidad, Campo Eléctrico y Potencial Eléctrico
            </h1>
          </div>
        </div>

        {/* Pestañas */}
        <nav
          aria-label="Módulos de la Unidad 1"
          className="flex gap-2 overflow-x-auto"
        >
          {MODULOS.map((opcion) => {
            const Icono = opcion.icono;
            const activo = modulo === opcion.id;

            return (
              <button
                key={opcion.id}
                type="button"
                onClick={() =>
                  seleccionarModulo(opcion.id)
                }
                aria-current={
                  activo ? "page" : undefined
                }
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2.5 text-xs font-medium transition ${
                  activo
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <Icono size={16} />
                {opcion.titulo}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Panel + escena */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Panel lateral */}
        <div className="min-h-0 overflow-y-auto border-r border-white/10">
          {modulo === "cargas" && (
            <ControlesCargas
              cargas={cargas}
              modo={modo}
              cambiarModo={cambiarModo}
              mostrarLineas={mostrarLineas}
              cambiarMostrarLineas={setMostrarLineas}
              mostrarEquipotenciales={
                mostrarEquipotenciales
              }
              cambiarMostrarEquipotenciales={
                setMostrarEquipotenciales
              }
              mostrarCuadricula={mostrarCuadricula}
              cambiarMostrarCuadricula={
                setMostrarCuadricula
              }
              agregarCarga={agregarCarga}
              eliminarCarga={eliminarCarga}
              actualizarCarga={actualizarCarga}
              restablecerCargas={restablecerCargas}
            />
          )}

          {modulo === "potencial" && (
            <ControlesPotencial
              key={`${modo}-${JSON.stringify(cargas)}`}
              cargas={cargas}
              modo={modo}
              punto={puntoConsulta}
              cambiarPunto={setPuntoConsulta}
            />
          )}

          {modulo === "trayectoria" && (
            <ControlesTrayectoria
              configuracion={configuracionTrayectoria}
              cambiarConfiguracion={setConfiguracionTrayectoria}
              cargas={cargas}
              modo={modo}
              particula={particula}
              cambiarParticula={cambiarParticula}
              trayectoria={trayectoria}
              cambiarTrayectoria={setTrayectoria}
              reproduciendo={reproduciendo}
              cambiarReproduciendo={
                setReproduciendo
              }
              velocidadReproduccion={
                velocidadReproduccion
              }
              cambiarVelocidadReproduccion={
                setVelocidadReproduccion
              }
              reiniciarAnimacion={
                reiniciarAnimacion
              }
            />
          )}
        </div>

        {/* Escena tridimensional */}
        <div className="relative min-h-[420px] overflow-hidden lg:min-h-0">
          <Escena3D
            modulo={modulo}
            modo={modo}
            cargas={cargas}
            cargaSeleccionada={cargaSeleccionada}
            seleccionarCarga={setCargaSeleccionada}
            moverCarga={moverCarga}
            mostrarLineas={mostrarLineas}
            mostrarEquipotenciales={
              mostrarEquipotenciales
            }
            mostrarCuadricula={
              mostrarCuadricula
            }
            puntoConsulta={puntoConsulta}
            particula={particula}
            trayectoria={trayectoria}
            reproduciendo={reproduciendo}
            velocidadReproduccion={
              velocidadReproduccion
            }
            reinicio={reinicio}
            alFinalizar={finalizarAnimacion}
          />

          {/* Indicador */}
          <div className="pointer-events-none absolute right-5 top-5 hidden rounded-lg border border-white/10 bg-[#050713]/80 px-4 py-2 text-xs text-cyan-300 backdrop-blur-md md:block">
            {tituloModulo}
          </div>
        </div>
      </div>
    </div>
  );
}
