
import { useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Atom,
  AlertCircle,
} from "lucide-react";

import type {
  CargaElectrica,
  Particula,
  ModoVisualizacion,
} from "../tipos";

import type {
  ResultadoTrayectoria,
  ConfiguracionTrayectoria,
} from "../fisica/trayectoria";

import {
  simularTrayectoria,
  CONFIGURACION_TRAYECTORIA,
} from "../fisica/trayectoria";

interface Propiedades {
  cargas: CargaElectrica[];
  modo: ModoVisualizacion;

  particula: Particula;
  cambiarParticula: (particula: Particula) => void;

  trayectoria: ResultadoTrayectoria | null;
  cambiarTrayectoria: (
    trayectoria: ResultadoTrayectoria | null
  ) => void;

  reproduciendo: boolean;
  cambiarReproduciendo: (valor: boolean) => void;

  velocidadReproduccion: number;
  cambiarVelocidadReproduccion: (valor: number) => void;

  reiniciarAnimacion: () => void;
}

export default function ControlesTrayectoria({
  cargas,
  modo,
  particula,
  cambiarParticula,
  trayectoria,
  cambiarTrayectoria,
  reproduciendo,
  cambiarReproduciendo,
  velocidadReproduccion,
  cambiarVelocidadReproduccion,
  reiniciarAnimacion,
}: Propiedades) {
  const [configuracion, setConfiguracion] =
    useState<ConfiguracionTrayectoria>({
      ...CONFIGURACION_TRAYECTORIA,
    });

  const [error, setError] = useState<string | null>(null);

  const [calculando, setCalculando] = useState(false);

  function actualizarParticula(
    campo: "carga" | "masa",
    valor: string
  ) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return;

    cambiarParticula({
      ...particula,
      [campo]:
        campo === "carga"
          ? numero * 1e-9
          : numero,
    });

    invalidarTrayectoria();
  }

  function actualizarVector(
    tipo: "posicion" | "velocidad",
    eje: "x" | "y" | "z",
    valor: string
  ) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return;

    cambiarParticula({
      ...particula,
      [tipo]: {
        ...particula[tipo],
        [eje]: numero,
      },
    });

    invalidarTrayectoria();
  }

  function invalidarTrayectoria() {
    cambiarReproduciendo(false);
    cambiarTrayectoria(null);
    setError(null);
  }

  function actualizarConfiguracion(
    campo: "pasoTiempo" | "tiempoMaximo",
    valor: string
  ) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return;

    setConfiguracion((anterior) => ({
      ...anterior,
      [campo]: numero,
    }));

    invalidarTrayectoria();
  }

  function lanzarParticula() {
    try {
      setError(null);
      setCalculando(true);
      cambiarReproduciendo(false);

      if (particula.masa <= 0) {
        throw new Error(
          "La masa de la partícula debe ser mayor que cero."
        );
      }

      if (configuracion.pasoTiempo <= 0) {
        throw new Error(
          "El paso temporal debe ser mayor que cero."
        );
      }

      if (configuracion.tiempoMaximo <= 0) {
        throw new Error(
          "El tiempo máximo debe ser mayor que cero."
        );
      }

      const particulaSimulada: Particula = {
        ...particula,
        posicion: {
          ...particula.posicion,
          z: modo === "2D" ? 0 : particula.posicion.z,
        },
        velocidad: {
          ...particula.velocidad,
          z: modo === "2D" ? 0 : particula.velocidad.z,
        },
      };

      const resultado = simularTrayectoria(
        particulaSimulada,
        cargas,
        configuracion
      );

      if (resultado.motivoFinalizacion === "error_numerico") {
        throw new Error(
          "La simulación encontró una inestabilidad numérica. " +
          "Reduce el paso temporal o aleja la partícula de las cargas."
        );
      }

      cambiarTrayectoria(resultado);
      reiniciarAnimacion();

      cambiarReproduciendo(true);
    } catch (errorDesconocido) {
      cambiarTrayectoria(null);

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo calcular la trayectoria."
      );
    } finally {
      setCalculando(false);
    }
  }

  function pausarOReanudar() {
    if (!trayectoria) return;

    cambiarReproduciendo(!reproduciendo);
  }

  function restablecer() {
    cambiarReproduciendo(false);
    reiniciarAnimacion();
    setError(null);
  }

  const campoEntrada =
    "mt-1 w-full rounded-lg border border-white/10 " +
    "bg-black/30 px-3 py-2 text-sm text-white " +
    "outline-none focus:border-cyan-400/60 " +
    "disabled:opacity-40";

  return (
    <aside className="h-full overflow-y-auto bg-[#090e1e] p-5 text-white">
      {/* Encabezado */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-3">
          <Atom size={21} className="text-violet-300" />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Trayectoria de partículas
          </h2>

          <p className="text-xs text-slate-400">
            Movimiento bajo campos eléctricos
          </p>
        </div>
      </div>

      {/* Parámetros de la partícula */}
      <section className="mb-6">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Propiedades de la partícula
        </h3>

        <div className="space-y-4">
          <label className="block text-xs text-slate-400">
            Carga eléctrica (nC)

            <input
              type="number"
              step="0.1"
              value={particula.carga * 1e9}
              onChange={(e) =>
                actualizarParticula("carga", e.target.value)
              }
              className={campoEntrada}
            />
          </label>

          <label className="block text-xs text-slate-400">
            Masa (kg)

            <input
              type="number"
              min="0"
              step="0.001"
              value={particula.masa}
              onChange={(e) =>
                actualizarParticula("masa", e.target.value)
              }
              className={campoEntrada}
            />
          </label>
        </div>
      </section>

      {/* Posición inicial */}
      <section className="mb-6 border-t border-white/10 pt-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Posición inicial (m)
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((eje) => (
            <label
              key={eje}
              className="text-xs text-slate-400"
            >
              {eje.toUpperCase()}

              <input
                type="number"
                step="0.1"
                disabled={modo === "2D" && eje === "z"}
                value={
                  modo === "2D" && eje === "z"
                    ? 0
                    : particula.posicion[eje]
                }
                onChange={(e) =>
                  actualizarVector(
                    "posicion",
                    eje,
                    e.target.value
                  )
                }
                className={campoEntrada}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Velocidad inicial */}
      <section className="mb-6 border-t border-white/10 pt-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Velocidad inicial (m/s)
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((eje) => (
            <label
              key={eje}
              className="text-xs text-slate-400"
            >
              V{eje}

              <input
                type="number"
                step="0.1"
                disabled={modo === "2D" && eje === "z"}
                value={
                  modo === "2D" && eje === "z"
                    ? 0
                    : particula.velocidad[eje]
                }
                onChange={(e) =>
                  actualizarVector(
                    "velocidad",
                    eje,
                    e.target.value
                  )
                }
                className={campoEntrada}
              />
            </label>
          ))}
        </div>
      </section>

      {/* Parámetros numéricos */}
      <section className="mb-6 border-t border-white/10 pt-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Configuración de simulación
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-400">
            Paso temporal (s)

            <input
              type="number"
              min="0.000001"
              step="0.0001"
              value={configuracion.pasoTiempo}
              onChange={(e) =>
                actualizarConfiguracion(
                  "pasoTiempo",
                  e.target.value
                )
              }
              className={campoEntrada}
            />
          </label>

          <label className="text-xs text-slate-400">
            Duración (s)

            <input
              type="number"
              min="0.001"
              step="0.5"
              value={configuracion.tiempoMaximo}
              onChange={(e) =>
                actualizarConfiguracion(
                  "tiempoMaximo",
                  e.target.value
                )
              }
              className={campoEntrada}
            />
          </label>
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          RK4 calcula la evolución física usando el
          paso temporal seleccionado.
        </p>
      </section>

      {/* Controles de reproducción */}
      <section className="mb-6 border-t border-white/10 pt-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Reproducción
        </h3>

        <button
          type="button"
          onClick={lanzarParticula}
          disabled={calculando}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-400/25 disabled:opacity-50"
        >
          <Play size={17} />
          {calculando ? "Calculando..." : "Lanzar partícula"}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={pausarOReanudar}
            disabled={!trayectoria}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
          >
            {reproduciendo ? (
              <>
                <Pause size={16} />
                Pausar
              </>
            ) : (
              <>
                <Play size={16} />
                Reanudar
              </>
            )}
          </button>

          <button
            type="button"
            onClick={restablecer}
            disabled={!trayectoria}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw size={16} />
            Reiniciar
          </button>
        </div>

        {/* Velocidad visual */}
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <label
              htmlFor="velocidad-reproduccion"
              className="text-xs text-slate-400"
            >
              Velocidad de reproducción
            </label>

            <span className="font-mono text-xs text-cyan-300">
              {velocidadReproduccion.toFixed(1)}x
            </span>
          </div>

          <input
            id="velocidad-reproduccion"
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={velocidadReproduccion}
            onChange={(e) =>
              cambiarVelocidadReproduccion(
                Number(e.target.value)
              )
            }
            className="w-full cursor-pointer accent-cyan-400"
          />
        </div>
      </section>

      {/* Información de la trayectoria */}
      {trayectoria && (
        <section className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={16} className="text-cyan-300" />

            <h3 className="text-sm font-medium text-cyan-200">
              Trayectoria calculada
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Puntos: {trayectoria.puntos.length}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Tiempo físico:{" "}
            {trayectoria.tiempos[
              trayectoria.tiempos.length - 1
            ]?.toFixed(4) ?? "0"}{" "}
            s
          </p>

          <p className="mt-2 text-xs text-slate-400">
            Finalización:{" "}
            {trayectoria.motivoFinalizacion.replaceAll("_", " ")}
          </p>
        </section>
      )}

      {/* Mensajes de error */}
      {error && (
        <div
          role="alert"
          className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-xs leading-5 text-rose-300"
        >
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </aside>
  );
}
