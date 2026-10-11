
import { useState } from "react";
import {
  Calculator,
  MapPin,
  Zap,
  RotateCcw,
  AlertCircle,
} from "lucide-react";

import type {
  CargaElectrica,
  Vector3D,
  ModoVisualizacion,
} from "../tipos";

import {
  calcularPotencialElectrico,
} from "../fisica/potencialElectrico";

import {
  calcularCampoElectrico,
} from "../fisica/campoElectrico";

import { magnitud } from "../fisica/vectores";

// Propiedades del componente
interface Propiedades {
  cargas: CargaElectrica[];
  modo: ModoVisualizacion;
  punto: Vector3D;
  cambiarPunto: (punto: Vector3D) => void;
}

// Formato para resultados científicos
function formatearNumero(valor: number): string {
  if (!Number.isFinite(valor)) {
    return "No definido";
  }

  if (valor === 0) return "0";

  const absoluto = Math.abs(valor);

  if (absoluto >= 100000 || absoluto < 0.001) {
    return valor.toExponential(4);
  }

  return valor.toLocaleString("es-PE", {
    maximumFractionDigits: 4,
  });
}

// Tarjeta reutilizable de resultados
function Resultado({
  titulo,
  valor,
  unidad,
  destacado = false,
}: {
  titulo: string;
  valor: string;
  unidad: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destacado
          ? "border-cyan-400/30 bg-cyan-400/[0.07]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="mb-2 text-xs text-slate-400">
        {titulo}
      </p>

      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`break-all font-mono text-lg font-semibold ${
            destacado ? "text-cyan-300" : "text-white"
          }`}
        >
          {valor}
        </span>

        <span className="text-xs text-slate-400">
          {unidad}
        </span>
      </div>
    </div>
  );
}

// Panel de calculadora de potencial
export default function ControlesPotencial({
  cargas,
  modo,
  punto,
  cambiarPunto,
}: Propiedades) {
  const [resultado, setResultado] = useState<{
    potencial: number;
    campo: Vector3D;
    intensidad: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  function modificarCoordenada(
    eje: "x" | "y" | "z",
    valor: string
  ) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) return;

    cambiarPunto({
      ...punto,
      [eje]: numero,
    });

    // Invalidar el resultado anterior
    setResultado(null);
    setError(null);
  }

  function calcular() {
    try {
      setError(null);

      const posicion: Vector3D = {
        ...punto,
        z: modo === "2D" ? 0 : punto.z,
      };

      const potencial = calcularPotencialElectrico(
        posicion,
        cargas
      );

      const campo = calcularCampoElectrico(
        posicion,
        cargas
      );

      setResultado({
        potencial,
        campo,
        intensidad: magnitud(campo),
      });
    } catch (errorDesconocido) {
      setResultado(null);

      setError(
        errorDesconocido instanceof Error
          ? errorDesconocido.message
          : "No se pudo calcular el potencial eléctrico."
      );
    }
  }

  function restablecer() {
    cambiarPunto({ x: 0, y: 0, z: 0 });
    setResultado(null);
    setError(null);
  }

  return (
    <aside className="h-full overflow-y-auto bg-[#090e1e] p-5 text-white">
      {/* Encabezado */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl border border-purple-400/20 bg-purple-400/10 p-3">
          <Calculator
            size={21}
            className="text-purple-300"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Calculadora de potencial
          </h2>

          <p className="text-xs text-slate-400">
            Consulta de magnitudes eléctricas
          </p>
        </div>
      </div>

      {/* Información de las cargas */}
      <div className="mb-6 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-4">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-cyan-300" />

          <span className="text-sm text-cyan-200">
            Distribución activa
          </span>
        </div>

        <p className="mt-2 text-xs text-slate-400">
          {cargas.length} cargas eléctricas configuradas
        </p>

        <p className="mt-1 text-xs text-slate-500">
          El cálculo utiliza las cargas del visualizador.
        </p>
      </div>

      {/* Coordenadas */}
      <section className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-purple-300" />

          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Punto de consulta
          </h3>
        </div>

        <p className="mb-4 text-xs leading-5 text-slate-500">
          Introduce la posición donde deseas conocer
          el potencial eléctrico.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((eje) => (
            <label
              key={eje}
              className="text-xs text-slate-400"
            >
              {eje.toUpperCase()} (m)

              <input
                type="number"
                step="0.1"
                disabled={modo === "2D" && eje === "z"}
                value={
                  modo === "2D" && eje === "z"
                    ? 0
                    : punto[eje]
                }
                onChange={(e) =>
                  modificarCoordenada(
                    eje,
                    e.target.value
                  )
                }
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-2 py-3 text-sm text-white outline-none focus:border-purple-400/60 disabled:opacity-40"
              />
            </label>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Modo de visualización: {modo}
        </p>
      </section>

      {/* Botones */}
      <div className="mb-6 grid grid-cols-[1fr_auto] gap-2">
        <button
          type="button"
          onClick={calcular}
          className="flex items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/25"
        >
          <Calculator size={16} />
          Calcular potencial
        </button>

        <button
          type="button"
          onClick={restablecer}
          title="Restablecer punto"
          aria-label="Restablecer punto"
          className="rounded-lg border border-white/10 bg-white/5 px-3 text-slate-300 hover:bg-white/10"
        >
          <RotateCcw size={17} />
        </button>
      </div>

      {/* Errores */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-300"
        >
          <AlertCircle size={17} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados */}
      {resultado && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Resultados del cálculo
          </h3>

          <Resultado
            titulo="Potencial eléctrico"
            valor={formatearNumero(resultado.potencial)}
            unidad="V"
            destacado
          />

          <Resultado
            titulo="Intensidad del campo eléctrico"
            valor={formatearNumero(resultado.intensidad)}
            unidad="N/C"
          />

          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((eje) => (
              <div
                key={eje}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <p className="mb-2 text-xs text-slate-400">
                  E{eje}
                </p>

                <p className="break-all font-mono text-xs text-white">
                  {formatearNumero(resultado.campo[eje])}
                </p>

                <p className="mt-1 text-[10px] text-slate-500">
                  N/C
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Información científica */}
      <div className="mt-7 border-t border-white/10 pt-5">
        <p className="mb-2 text-xs font-medium text-purple-300">
          Fundamento físico
        </p>

        <p className="text-xs leading-6 text-slate-500">
          El potencial eléctrico total se calcula mediante
          el principio de superposición de los potenciales
          generados por cada carga puntual.
        </p>

        <p className="mt-3 font-mono text-sm text-cyan-300">
          V = Σ (k · qᵢ / rᵢ)
        </p>
      </div>
    </aside>
  );
}
