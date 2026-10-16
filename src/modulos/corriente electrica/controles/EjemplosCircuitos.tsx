import { EJEMPLOS } from '../fisica/ejemplos';

export default function EjemplosCircuitos({ elegir }: { elegir:(indice:number) => void }) {
  return <details className="group relative z-30" onKeyDown={e => {
    if(e.key==='Escape') {e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus();}
  }}>
    <summary className="cursor-pointer list-none rounded-lg border border-cyan-400/30 bg-[#111a2c] px-3 py-2 text-xs text-slate-100">Ejemplos educativos <span aria-hidden="true">▾</span></summary>
    <div aria-label="Ejemplos de circuitos disponibles" className="absolute left-0 top-full mt-2 max-h-72 w-64 max-w-[80vw] overflow-y-auto rounded-xl border border-cyan-400/30 bg-[#111a2c] p-1.5 shadow-xl shadow-black/50">
      {EJEMPLOS.map((nombre,indice) => <button key={nombre} className="block w-full rounded-lg px-3 py-2.5 text-left text-xs text-slate-100 hover:bg-cyan-400/15 focus:bg-cyan-400/15 focus:outline-none"
        onClick={e => {elegir(indice);const contenedor=e.currentTarget.closest('details');if(contenedor) {contenedor.open=false;contenedor.querySelector('summary')?.focus();}}}>{nombre}</button>)}
    </div>
  </details>;
}
