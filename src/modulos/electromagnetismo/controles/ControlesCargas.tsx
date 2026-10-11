
import {
  Plus,
  Trash2,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

import type {
  CargaElectrica,
  ModoVisualizacion,
} from "../tipos";

interface Propiedades {
  cargas: CargaElectrica[];

  modo: ModoVisualizacion;
  cambiarModo: (modo: ModoVisualizacion) => void;

  mostrarLineas: boolean;
  cambiarMostrarLineas: (valor: boolean) => void;

  mostrarEquipotenciales: boolean;
  cambiarMostrarEquipotenciales: (valor: boolean) => void;

  mostrarCuadricula: boolean;
  cambiarMostrarCuadricula: (valor: boolean) => void;

  agregarCarga: (valor: number) => void;
  eliminarCarga: (id: string) => void;

  actualizarCarga: (
    id: string,
    cambios: Partial<CargaElectrica>
  ) => void;

  restablecerCargas: () => void;
}

const MAXIMO_CARGAS = 10;

/**
 * Control reutilizable para activar
 * o desactivar opciones visuales.
 */
function Interruptor({
  titulo,
  activo,
  alCambiar,
}: {
  titulo: string;
  activo: boolean;
  alCambiar: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-300">
        {titulo}
      </span>

      <input
        type="checkbox"
        checked={activo}
        onChange={(e) => alCambiar(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-cyan-400"
      />
    </label>
  );
}

/**
 * Panel del visualizador de cargas.
 */
export default function ControlesCargas({
  cargas,
  modo,
  cambiarModo,
  mostrarLineas,
  cambiarMostrarLineas,
  mostrarEquipotenciales,
  cambiarMostrarEquipotenciales,
  mostrarCuadricula,
  cambiarMostrarCuadricula,
  agregarCarga,
  eliminarCarga,
  actualizarCarga,
  restablecerCargas,
}: Propiedades) {
  const limiteAlcanzado = cargas.length >= MAXIMO_CARGAS;

  function modificarPosicion(
    carga: CargaElectrica,
    eje: "x" | "y" | "z",
    valor: number
  ) {
    if (!Number.isFinite(valor)) return;

    actualizarCarga(carga.id, {
      posicion: {
        ...carga.posicion,
        [eje]: valor,
      },
    });
  }

  return (
    <aside className="h-full overflow-y-auto bg-[#090e1e] p-5 text-white">

      {/* Encabezado */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
          <Zap size={21} className="text-cyan-300" />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Cargas eléctricas
          </h2>

          <p className="text-xs text-slate-400">
            Configuración del campo eléctrico
          </p>
        </div>
      </div>

      {/* Selector 2D / 3D */}
      <section className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Visualización
        </h3>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/30 p-1">
          {(["2D", "3D"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => cambiarModo(opcion)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                modo === opcion
                  ? "bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/40"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {opcion}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {modo === "2D"
            ? "Visualización en el plano XY."
            : "Visualización tridimensional XYZ."}
        </p>
      </section>

      {/* Administración de cargas */}
      <section className="mb-6 border-t border-white/10 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Distribución de cargas
          </h3>

          <span className="rounded-md bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300">
            {cargas.length} / {MAXIMO_CARGAS}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={limiteAlcanzado}
            onClick={() => agregarCarga(2e-9)}
            className="flex items-center justify-center gap-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-3 text-sm text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} />
            Positiva
          </button>

          <button
            type="button"
            disabled={limiteAlcanzado}
            onClick={() => agregarCarga(-2e-9)}
            className="flex items-center justify-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} />
            Negativa
          </button>
        </div>

        <div className="space-y-3">
          {cargas.map((carga, indice) => {
            const positiva = carga.valor > 0;

            return (
              <div
                key={carga.id}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                        positiva
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-cyan-400/15 text-cyan-300"
                      }`}
                    >
                      {positiva ? "+" : carga.valor < 0 ? "−" : "0"}
                    </span>

                    <span className="text-sm font-medium">
                      Carga {indice + 1}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => eliminarCarga(carga.id)}
                    title="Eliminar carga"
                    aria-label={`Eliminar carga ${indice + 1}`}
                    className="rounded-md p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Magnitud de carga */}
                <label className="mb-2 block text-xs text-slate-400">
                  Carga eléctrica (nC)
                </label>

                <input
                  type="number"
                  step="0.5"
                  value={Number(
                    (carga.valor * 1e9).toFixed(6)
                  )}
                  onChange={(e) => {
                    const valor = Number(e.target.value);

                    if (Number.isFinite(valor)) {
                      actualizarCarga(carga.id, {
                        valor: valor * 1e-9,
                      });
                    }
                  }}
                  className="mb-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                />

                {/* Coordenadas */}
                <p className="mb-2 text-xs text-slate-400">
                  Posición (metros)
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(["x", "y", "z"] as const).map((eje) => (
                    <label
                      key={eje}
                      className="text-xs text-slate-400"
                    >
                      {eje.toUpperCase()}

                      <input
                        type="number"
                        step="0.25"
                        disabled={modo === "2D" && eje === "z"}
                        value={
                          modo === "2D" && eje === "z"
                            ? 0
                            : carga.posicion[eje]
                        }
                        onChange={(e) =>
                          modificarPosicion(
                            carga,
                            eje,
                            Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none focus:border-cyan-400/60 disabled:opacity-40"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {cargas.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
              No hay cargas eléctricas.
            </div>
          )}
        </div>
      </section>

      {/* Opciones visuales */}
      <section className="mb-6 border-t border-white/10 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <Eye size={16} className="text-cyan-400" />

          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Elementos visibles
          </h3>
        </div>

        <div className="divide-y divide-white/5">
          <Interruptor
            titulo="Líneas de campo"
            activo={mostrarLineas}
            alCambiar={cambiarMostrarLineas}
          />

          <Interruptor
            titulo="Equipotenciales"
            activo={mostrarEquipotenciales}
            alCambiar={cambiarMostrarEquipotenciales}
          />

          <Interruptor
            titulo="Cuadrícula"
            activo={mostrarCuadricula}
            alCambiar={cambiarMostrarCuadricula}
          />
        </div>
      </section>

      {/* Restablecer */}
      <section className="border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={restablecerCargas}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"
        >
          <RotateCcw size={16} />
          Restablecer cargas
        </button>
      </section>

      {/* Información inferior */}
      <div className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <SlidersHorizontal size={14} />
        <span>Parámetros del campo eléctrico</span>
      </div>
    </aside>
  );
}
