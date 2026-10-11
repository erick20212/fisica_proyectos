import { useReducer } from "react";
import { BatteryCharging, Zap } from "lucide-react";
import Capacitor2D from "./componentes/Capacitor2D";
import ControlesCapacitor from "./controles/ControlesCapacitor";
import { actualizarSimulador, calcularEstadoCapacitor, ESTADO_INICIAL, formatearSI } from "./fisica/capacitor";

export default function Capacitorores() {
  const [estado, cambiar] = useReducer(actualizarSimulador, ESTADO_INICIAL);
  const resultado = calcularEstadoCapacitor(estado);
  const resultados = [
    { titulo: "Capacitancia", simbolo: "C", valor: formatearSI(resultado.capacitancia, "F"), formula: "ε₀ εr A / d" },
    { titulo: "Carga en placa superior", simbolo: "Q", valor: formatearSI(resultado.carga, "C"), formula: estado.bateriaConectada ? "C × V" : "Q constante" },
    { titulo: "Voltaje del capacitor", simbolo: "V", valor: formatearSI(resultado.voltaje, "V"), formula: estado.bateriaConectada ? "V = V de la batería" : "Q / C" },
    { titulo: "Campo eléctrico |E|", simbolo: "E", valor: formatearSI(Math.abs(resultado.campo), "V/m"), formula: "|V| / d" },
    { titulo: "Energía almacenada", simbolo: "U", valor: formatearSI(resultado.energia, "J"), formula: estado.bateriaConectada ? "½ C V²" : "Q² / (2C)" },
  ];
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#050713] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#080d1c] px-5 py-4">
        <div className="flex items-center gap-3"><div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2"><BatteryCharging size={21} className="text-cyan-300" /></div>
          <div><p className="text-[10px] tracking-[0.22em] text-cyan-400">UNIDAD 02 / MÓDULO 01</p><h1 className="mt-1 text-sm font-semibold md:text-base">Simulador de capacitores</h1></div>
          <span className="ml-auto rounded-md border border-white/10 px-2 py-1 text-[10px] text-slate-400">2D INTERACTIVO</span></div>
      </header>
      <div className="grid min-h-0 flex-1 items-start gap-4 overflow-y-auto p-4 lg:grid-cols-[290px_minmax(0,1fr)]">
        <ControlesCapacitor estado={estado} cambiar={cambiar} />
        <main className="min-w-0 space-y-4">
          <Capacitor2D estado={estado} resultado={resultado} cambiar={cambiar} />
          <section aria-label="Resultados físicos" className="rounded-2xl border border-white/10 bg-[#090e1e] p-5">
            <div className="mb-4 flex items-center gap-2"><Zap size={16} className="text-cyan-300" /><h2 className="text-sm font-semibold">Resultados en tiempo real</h2></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {resultados.map((dato) => <div key={dato.simbolo} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[11px] text-slate-400">{dato.titulo}</p><p className="mt-2 font-mono text-lg text-cyan-200">{dato.valor}</p>
                <p className="mt-2 text-[11px] text-slate-500">{dato.simbolo} = {dato.formula}</p>
              </div>)}
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3"><p className="text-[11px] text-slate-400">Estado de la batería</p>
                <p className={`mt-2 text-sm font-semibold ${estado.bateriaConectada ? "text-emerald-300" : "text-amber-300"}`}>{estado.bateriaConectada ? "Conectada" : "Desconectada"}</p>
                <p className="mt-2 text-[11px] text-slate-500">Fuente: {formatearSI(estado.voltajeBateria, "V")}</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">La placa inferior tiene carga opuesta (−Q). Modelo electrostático ideal, sin efectos de borde ni transitorios. La escala gráfica es ilustrativa.</p>
          </section>
        </main>
      </div>
    </div>
  );
}
