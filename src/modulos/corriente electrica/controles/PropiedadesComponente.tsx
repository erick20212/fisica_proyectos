import { useState } from 'react';
import type { Componente, Lectura } from '../tipos';
import { esFuente } from '../fisica/modelos';
import { formato } from '../fisica/circuitos';

export function ControlValor({ etiqueta,valor,min,max,paso = 0.1,cambiar }: {
  etiqueta:string; valor:number; min:number; max:number; paso?:number; cambiar:(v:number) => void;
}) {
  const [texto,setTexto] = useState<string|null>(null);
  return <label className="block text-xs text-slate-300">{etiqueta}
    <input className="mt-1 w-full rounded border border-white/15 bg-[#111a2c] p-2 text-sm text-white" type="number" min={min} max={max} step={paso} value={texto ?? valor}
      onChange={e => {setTexto(e.target.value); const v = Number(e.target.value); if(e.target.value !== '' && Number.isFinite(v) && v >= min && v <= max) cambiar(v);}}
      onBlur={() => setTexto(null)} />
    <input aria-label={`${etiqueta} deslizador`} type="range" className="my-2 w-full accent-cyan-400" min={min} max={max} step={paso} value={valor} onChange={e => {setTexto(null);cambiar(Number(e.target.value));}} />
  </label>;
}

export default function PropiedadesComponente({ c,lectura,energia,cambiar,pulsar }: {
  c:Componente; lectura?:Lectura; energia:number; cambiar:(c:Componente) => void; pulsar:(activo:boolean) => void;
}) {
  return <div className="space-y-4">
    <label className="block text-xs text-slate-300">Nombre<input className="mt-1 w-full rounded border border-white/15 bg-[#111a2c] p-2 text-sm" maxLength={80} value={c.nombre} onChange={e => cambiar({...c,nombre:e.target.value})} /></label>
    {esFuente(c) ? <>
      <ControlValor etiqueta="Fuerza electromotriz (V)" valor={c.valor} min={-240} max={240} cambiar={valor => cambiar({...c,valor})} />
      <ControlValor etiqueta="Resistencia interna (Ω)" valor={c.interna} min={0.01} max={20} paso={0.01} cambiar={interna => cambiar({...c,interna})} />
    </> : ['resistencia','variable','potenciometro','bombilla'].includes(c.tipo) && <ControlValor etiqueta="Resistencia (Ω)" valor={c.valor} min={0.1} max={10000} cambiar={valor => cambiar({...c,valor})} />}
    {c.tipo === 'potenciometro' && <ControlValor etiqueta="Posición del cursor (0–1)" valor={c.fraccion} min={0.01} max={0.99} paso={0.01} cambiar={fraccion => cambiar({...c,fraccion})} />}
    {c.tipo === 'multimetro' && <label className="text-xs">Modo de medición<select className="ml-2 rounded bg-[#111a2c] p-2" value={c.modo} onChange={e => cambiar({...c,modo:e.target.value as 'V'|'A'})}><option value="V">Voltímetro (paralelo)</option><option value="A">Amperímetro (serie)</option></select></label>}
    {c.tipo === 'interruptor' && <button className="w-full rounded border border-cyan-400/30 p-2 text-sm text-cyan-200" onClick={() => cambiar({...c,cerrado:!c.cerrado})}>{c.cerrado ? 'Abrir interruptor' : 'Cerrar interruptor'}</button>}
    {c.tipo === 'pulsador' && <button className="w-full touch-none rounded border border-rose-400/30 p-2 text-sm text-rose-200" onPointerDown={e => {e.currentTarget.setPointerCapture(e.pointerId);pulsar(true);}} onPointerUp={() => pulsar(false)} onPointerCancel={() => pulsar(false)} onLostPointerCapture={() => pulsar(false)} onKeyDown={e => {if(e.key === ' ' || e.key === 'Enter') {e.preventDefault();pulsar(true);}}} onKeyUp={() => pulsar(false)} onBlur={() => pulsar(false)}>Mantener pulsado</button>}
    <dl className="space-y-2 rounded-lg bg-black/20 p-3 text-xs">
      {([['Voltaje',lectura?.voltaje,'V'],['Corriente',lectura?.corriente,'A'],['Potencia terminal',lectura?.potencia,'W'],['Energía disipada',energia,'J']] as const).map(([nombre,valor,u]) => <div className="flex justify-between gap-2" key={nombre}><dt className="text-slate-400">{nombre}</dt><dd className="font-mono text-cyan-200">{valor == null ? 'Indeterminada' : `${formato(valor)} ${u}`}</dd></div>)}
      <p className="pt-2 text-slate-400">{lectura?.estado ?? 'Sin solución'}</p>
    </dl>
    {c.tipo === 'bombilla' && <p className="text-xs leading-5 text-amber-200">Filamento simplificado: resistencia constante. Brillo ilustrativo según potencia (saturación a 5 W), sin temperatura ni ruptura.</p>}
    {esFuente(c) && <p className="text-xs leading-5 text-slate-400">Terminal 0: +; 1: −. V₀ − V₁ = ε + r·I. Corriente positiva entra por +. Potencia negativa: entrega energía.</p>}
    {['amperimetro','voltimetro','multimetro'].includes(c.tipo) && <p className="text-xs leading-5 text-slate-400">V: entrada ideal sin corriente, conectar en paralelo. A: 0.01 Ω, conectar en serie. No se mide resistencia con fuentes activas.</p>}
    {c.tipo === 'potenciometro' && <p className="text-xs text-slate-400">0 y 1: extremos; 2: cursor. Dos resistencias suman el valor total. La corriente indicada entra por 0.</p>}
  </div>;
}
