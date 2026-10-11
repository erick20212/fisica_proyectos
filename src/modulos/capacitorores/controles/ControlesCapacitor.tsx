import { BatteryCharging, PlugZap, Unplug, RotateCcw } from "lucide-react";
import { useState } from "react";
import type { AccionSimulador, EstadoSimulador } from "../tipos";
import { LIMITES, MATERIALES } from "../fisica/capacitor";

interface Propiedades {
  estado: EstadoSimulador;
  cambiar: (accion: AccionSimulador) => void;
}

function ControlNumerico({ titulo, unidad, valor, minimo, maximo, paso, cambiar }: {
  titulo: string; unidad: string; valor: number; minimo: number; maximo: number;
  paso: number; cambiar: (valor: number) => void;
}) {
  const [borrador, setBorrador] = useState<string | null>(null);
  const id = `capacitor-${titulo.toLowerCase().replaceAll(" ", "-")}`;
  const actualizar = (entrada: string) => {
    if (entrada.trim() === "") return;
    const numero = Number(entrada);
    if (Number.isFinite(numero) && numero >= minimo && numero <= maximo) cambiar(numero);
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-slate-300">{titulo}</label>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
          <input id={id} type="number" min={minimo} max={maximo} step={paso}
            value={borrador ?? Number(valor.toFixed(4))} onChange={(e) => {
              setBorrador(e.target.value);
              actualizar(e.target.value);
            }} onBlur={() => setBorrador(null)}
            className="w-16 bg-transparent text-right font-mono text-sm text-cyan-200" />
          <span className="text-xs text-slate-500">{unidad}</span>
        </div>
      </div>
      <input type="range" aria-label={titulo} min={minimo} max={maximo} step={paso}
        value={valor} onChange={(e) => { setBorrador(null); actualizar(e.target.value); }} className="w-full cursor-pointer accent-cyan-400" />
      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        <span>{minimo} {unidad}</span><span>{maximo} {unidad}</span>
      </div>
    </div>
  );
}

export default function ControlesCapacitor({ estado, cambiar }: Propiedades) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-[#090e1e] p-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2.5"><BatteryCharging size={20} className="text-cyan-300" /></div>
        <div><h2 className="text-sm font-semibold text-white">Configura el capacitor</h2><p className="mt-1 text-xs text-slate-500">Placas paralelas · modelo ideal</p></div>
      </div>
      <div className="space-y-6">
        <ControlNumerico titulo="Área de las placas" unidad="mm²" valor={estado.area * 1e6}
          minimo={LIMITES.area.minimo * 1e6} maximo={LIMITES.area.maximo * 1e6} paso={1}
          cambiar={(valor) => cambiar({ tipo: "area", valor: valor / 1e6 })} />
        <ControlNumerico titulo="Separación" unidad="mm" valor={estado.separacion * 1e3}
          minimo={1} maximo={10} paso={0.1} cambiar={(valor) => cambiar({ tipo: "separacion", valor: valor / 1e3 })} />
        <div className="border-t border-white/10 pt-5">
          <label htmlFor="material-capacitor" className="mb-3 block text-sm text-slate-300">Material dieléctrico</label>
          <select id="material-capacitor" value={estado.material} onChange={(e) => cambiar({ tipo: "material", valor: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-[#070b18] px-3 py-2.5 text-sm text-white">
            {MATERIALES.map((material) => <option key={material.id} value={material.id}>{material.nombre} · εr = {material.permitividadRelativa}</option>)}
          </select>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">El material llena todo el espacio entre placas. Valores de referencia a temperatura ambiente.</p>
        </div>
        <div className="border-t border-white/10 pt-5">
          <ControlNumerico titulo="Voltaje de la batería" unidad="V" valor={estado.voltajeBateria}
            minimo={-12} maximo={12} paso={0.1} cambiar={(valor) => cambiar({ tipo: "voltaje", valor })} />
          <button type="button" onClick={() => cambiar({ tipo: "voltaje", valor: -estado.voltajeBateria })}
            className="mt-3 text-xs text-cyan-300 underline decoration-cyan-400/30 underline-offset-4">Invertir polaridad</button>
        </div>
        <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
          <button type="button" aria-pressed={estado.bateriaConectada} onClick={() => cambiar({ tipo: "bateria" })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-400/20">
            {estado.bateriaConectada ? <Unplug size={17} /> : <PlugZap size={17} />}
            {estado.bateriaConectada ? "Desconectar batería" : "Conectar batería"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-400">{estado.bateriaConectada
            ? "La batería mantiene V constante. Al cambiar C, cambia la carga Q."
            : "Capacitor aislado: Q se conserva. Cambiar la fuente no afecta al capacitor hasta reconectarla."}</p>
        </div>
        <button type="button" onClick={() => cambiar({ tipo: "restablecer" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-slate-400 hover:bg-white/5"><RotateCcw size={15} />Restablecer experimento</button>
      </div>
    </aside>
  );
}
