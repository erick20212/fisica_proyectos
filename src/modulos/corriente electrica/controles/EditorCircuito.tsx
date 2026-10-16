import type { Circuito } from '../tipos';
import { actualizarNodo } from '../fisica/circuitos';

interface Props { red: Circuito; cambiar: (red: Circuito) => void }
const estilo = 'rounded border border-white/15 bg-[#111a2c] p-2 text-sm text-white';

export default function EditorCircuito({ red, cambiar }: Props) {
  const nuevo = (): Circuito => ({ id: `R-${crypto.randomUUID().slice(0, 6)}`, tipo: 'resistencia', ohmios: 100 });
  function dibujar(nodo: Circuito, profundidad = 0) {
    return <div key={nodo.id} className="mt-3 rounded-lg border border-cyan-400/15 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-cyan-300">{nodo.id}</span>
        <select aria-label={`Conexión de ${nodo.id}`} className={estilo} value={nodo.tipo}
          onChange={e => cambiar(actualizarNodo(red, nodo.id, actual => {
            const tipo = e.target.value as Circuito['tipo'];
            if (tipo === 'resistencia') return { id: actual.id, tipo, ohmios: 100 };
            return { id: actual.id, tipo, elementos: actual.tipo === 'resistencia' ? [nuevo(), nuevo()] : actual.elementos };
          }))}>
          <option value="resistencia">Resistencia</option>
          <option value="serie" disabled={profundidad >= 3}>Serie</option>
          <option value="paralelo" disabled={profundidad >= 3}>Paralelo</option>
        </select>
        {nodo.tipo === 'resistencia' && <label className="text-xs text-slate-300">
          <input aria-label={`Resistencia ${nodo.id} en ohmios`} className={`${estilo} mr-2 w-24`} type="number" min="1" max="1000000" step="1"
            value={nodo.ohmios} onChange={e => {
              const ohmios = Number(e.target.value);
              if (Number.isFinite(ohmios) && ohmios >= 1 && ohmios <= 1e6)
                cambiar(actualizarNodo(red, nodo.id, n => ({ id: n.id, tipo: 'resistencia', ohmios })));
            }} />Ω</label>}
      </div>
      {nodo.tipo !== 'resistencia' && <>
        {nodo.elementos.map(hijo => <div key={hijo.id}>
          {dibujar(hijo, profundidad + 1)}
          {nodo.elementos.length > 1 && <button className="mt-1 text-xs text-rose-300" onClick={() =>
            cambiar(actualizarNodo(red, nodo.id, n => n.tipo === 'resistencia' ? n : { ...n, elementos: n.elementos.filter(h => h.id !== hijo.id) }))}>
            Quitar {hijo.id}</button>}
        </div>)}
        <button disabled={nodo.elementos.length >= 4} className="mt-3 rounded border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 disabled:opacity-30"
          onClick={() => cambiar(actualizarNodo(red, nodo.id, n => n.tipo === 'resistencia' ? n : { ...n, elementos: [...n.elementos, nuevo()] }))}>
          + Añadir resistencia</button>
      </>}
    </div>;
  }
  return <section aria-label="Constructor del circuito"><h2 className="font-semibold">Arma tu circuito</h2>
    <p className="mt-2 text-xs leading-5 text-slate-400">Cambia cada elemento a serie o paralelo para crear grupos mixtos. Hasta cuatro elementos por grupo y tres niveles de grupos.</p>
    {dibujar(red)}
  </section>;
}
