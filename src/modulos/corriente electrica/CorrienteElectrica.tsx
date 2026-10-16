import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Componente, TipoComponente } from './tipos';
import { formato } from './fisica/circuitos';
import { crearLaboratorio } from './fisica/ejemplos';
import { crearComponente, NOMBRES } from './fisica/modelos';
import { integrarEnergia } from './fisica/energia';
import { clasificarRed, quitarPartes } from './fisica/conexiones';
import { resolverRed } from './fisica/redElectrica';
import { recuperar, serializar } from './fisica/persistencia';
import useLaboratorio from './controles/useLaboratorio';
import PropiedadesComponente from './controles/PropiedadesComponente';
import EjemplosCircuitos from './controles/EjemplosCircuitos';
import Laboratorio2D from './componentes/Laboratorio2D';
import LeyOhm from './componentes/LeyOhm';

const BOTON = 'rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs hover:border-cyan-300/50 disabled:opacity-30';
const CATEGORIAS: { nombre:string; tipos:TipoComponente[] }[] = [
  {nombre:'Fuentes',tipos:['bateria','fuente','pila']},
  {nombre:'Pasivos',tipos:['resistencia','variable','potenciometro','bombilla']},
  {nombre:'Control y conexiones',tipos:['interruptor','pulsador','nodo','tierra']},
  {nombre:'Instrumentos',tipos:['amperimetro','voltimetro','multimetro']},
];

export default function CorrienteElectrica() {
  const [modulo,setModulo] = useState<'circuitos'|'ohm'>('circuitos');
  const { red,cambiar,deshacer,rehacer,puedeDeshacer,puedeRehacer } = useLaboratorio();
  const [seleccion,seleccionar] = useState<string[]>([]);
  const [pausado,setPausado] = useState(false);
  const [electrones,setElectrones] = useState(false);
  const [mensaje,setMensaje] = useState('');
  const [pulso,setPulso] = useState<string|null>(null);
  const [reconectar,setReconectar] = useState<{id:string;extremo:'a'|'b'}|null>(null);
  const [energia,setEnergia] = useState<{total:number;tiempo:number;componentes:Record<string,number>}>({total:0,tiempo:0,componentes:{}});
  const archivo = useRef<HTMLInputElement>(null);
  const efectiva = useMemo(() => ({...red,componentes:red.componentes.map(c => c.tipo === 'pulsador' ? {...c,cerrado:c.id === pulso} : c)}),[red,pulso]);
  const solucion = useMemo(() => resolverRed(efectiva),[efectiva]);
  const topologia = useMemo(() => clasificarRed(efectiva),[efectiva]);
  useEffect(() => {
    if (pausado || solucion.error || modulo !== 'circuitos') return;
    let ultimo = performance.now();
    const id = window.setInterval(() => {
      const ahora = performance.now(), dt = (ahora-ultimo)/1000; ultimo = ahora;
      if (document.hidden) return;
      setEnergia(e => integrarEnergia(e,efectiva,solucion,dt));
    },100);
    return () => clearInterval(id);
  },[pausado,solucion,efectiva,modulo]);
  const editar = (c:Componente) => cambiar({...red,componentes:red.componentes.map(n => n.id === c.id ? c : n)});
  const eliminar = useCallback(() => {
    if(!seleccion.length) return;
    cambiar(quitarPartes(red,seleccion));
    seleccionar([]);setReconectar(null);
  },[red,seleccion,cambiar]);
  useEffect(() => {
    const teclado = (e:KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,button')) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {e.preventDefault();eliminar();}
    };
    window.addEventListener('keydown',teclado);return () => window.removeEventListener('keydown',teclado);
  },[eliminar]);
  function duplicar() {
    const elegidos = red.componentes.filter(c => seleccion.includes(c.id));
    if (red.componentes.length + elegidos.length > 80) {setMensaje('Máximo 80 componentes.');return;}
    const mapa = new Map(elegidos.map(c => [c.id,crypto.randomUUID()]));
    const copias = elegidos.map(c => ({...c,id:mapa.get(c.id)!,nombre:`${c.nombre} copia`.slice(0,80),x:c.x+35,y:c.y+35}));
    const cables = red.cables.filter(c => mapa.has(c.a.componente) && mapa.has(c.b.componente)).map(c => ({id:crypto.randomUUID(),a:{...c.a,componente:mapa.get(c.a.componente)!},b:{...c.b,componente:mapa.get(c.b.componente)!}}));
    if (red.cables.length + cables.length > 160) {setMensaje('Máximo 160 cables.');return;}
    cambiar({...red,componentes:[...red.componentes,...copias],cables:[...red.cables,...cables]});seleccionar(copias.map(c => c.id));
  }
  function guardar() {
    try {
      const texto = serializar(red); localStorage.setItem('laboratorio-corriente-v1',texto);
      const url = URL.createObjectURL(new Blob([texto],{type:'application/json'}));
      const enlace = document.createElement('a');enlace.href=url;enlace.download='circuito.json';enlace.click();setTimeout(() => URL.revokeObjectURL(url),1000);
      setMensaje('Circuito guardado en este navegador y descargado como JSON.');
    } catch {setMensaje('No se pudo guardar. Comprueba el almacenamiento y las propiedades del circuito.');}
  }
  function cargar(texto:string) {
    try {cambiar(recuperar(texto));seleccionar([]);setReconectar(null);setMensaje('Circuito cargado.');setEnergia({total:0,tiempo:0,componentes:{}});}
    catch (e) {setMensaje(e instanceof Error ? e.message : 'Archivo inválido.');}
  }
  const elegido = seleccion.length === 1 ? red.componentes.find(c => c.id === seleccion[0]) : undefined;
  const cable = seleccion.length === 1 ? red.cables.find(c => c.id === seleccion[0]) : undefined;
  return <div className="h-full overflow-y-auto bg-[#050713] p-3 text-white md:p-5">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] tracking-[0.2em] text-cyan-400">UNIDAD 03 · CORRIENTE ELÉCTRICA</p><h1 className="mt-1 text-xl font-semibold">Laboratorio de circuitos</h1></div>
      <nav className="flex gap-2" aria-label="Módulos de corriente eléctrica">{(['circuitos','ohm'] as const).map(m => <button key={m} className={`${BOTON} ${modulo === m ? 'border-cyan-400 text-cyan-200' : ''}`} aria-pressed={modulo === m} onClick={() => {setModulo(m);setPulso(null);}}>{m === 'circuitos' ? 'Simulador de circuitos' : 'Ley de Ohm'}</button>)}</nav>
    </header>
    {modulo === 'ohm' ? <LeyOhm /> : <>
      <div className="mb-4 flex flex-wrap gap-2">
        <button className={BOTON} onClick={guardar}>Guardar</button><button className={BOTON} onClick={() => archivo.current?.click()}>Cargar JSON</button>
        <button className={BOTON} onClick={() => {try {cargar(localStorage.getItem('laboratorio-corriente-v1') ?? '');} catch {setMensaje('Almacenamiento no disponible.');}}}>Recuperar guardado</button>
        <button className={BOTON} disabled={!puedeDeshacer} onClick={deshacer}>Deshacer</button><button className={BOTON} disabled={!puedeRehacer} onClick={rehacer}>Rehacer</button>
        <button className={BOTON} onClick={() => {setEnergia({total:0,tiempo:0,componentes:{}});setPausado(false);setPulso(null);}}>Reiniciar simulación</button>
        <button className={BOTON} onClick={() => {cambiar({componentes:[],cables:[]});seleccionar([]);setReconectar(null);setEnergia({total:0,tiempo:0,componentes:{}});}}>Limpiar circuito</button>
        <EjemplosCircuitos elegir={indice => {cambiar(crearLaboratorio(indice));seleccionar([]);setReconectar(null);setEnergia({total:0,tiempo:0,componentes:{}});}} />
        <input ref={archivo} className="hidden" type="file" accept=".json,application/json" onChange={async e => {const f=e.target.files?.[0];if(f) {if(f.size>500000) setMensaje('Archivo demasiado grande.');else cargar(await f.text());}e.target.value='';}} />
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-[150px_minmax(0,1fr)_250px] xl:grid-cols-[160px_minmax(0,1fr)_270px]">
        <aside className="rounded-xl border border-white/10 bg-[#0a1020] p-3"><h2 className="text-sm font-semibold">Componentes</h2><p className="my-2 text-[11px] text-slate-400">Arrastra al laboratorio o pulsa para añadir.</p>
          {CATEGORIAS.map(grupo => <section key={grupo.nombre} className="mt-4"><h3 className="mb-2 text-[10px] uppercase tracking-wider text-slate-400">{grupo.nombre}</h3><div className="flex flex-wrap gap-1 lg:block lg:space-y-1">{grupo.tipos.map(tipo => <button key={tipo} draggable onDragStart={e => e.dataTransfer.setData('componente',tipo)} className="w-full rounded border border-white/10 bg-white/[0.03] p-2 text-left text-xs hover:border-cyan-400"
            onClick={() => {if(red.componentes.length>=80) return;const c=crearComponente(tipo,380+(red.componentes.length%5)*35,180+(red.componentes.length%6)*45);cambiar({...red,componentes:[...red.componentes,c]});seleccionar([c.id]);}}>+ {NOMBRES[tipo]}</button>)}</div></section>)}
          <p className="mt-4 text-[11px] text-slate-400">Cable: pulsa terminal de origen y destino. Unión: conecta varios cables a un mismo terminal.</p>
        </aside>
        <Laboratorio2D red={efectiva} solucion={solucion} cambiar={cambiar} seleccion={seleccion} seleccionar={seleccionar} pausado={pausado} electrones={electrones} reconectar={reconectar} finReconectar={() => setReconectar(null)} eliminarSeleccion={eliminar} mantenerPulsador={setPulso} pulsar={(id,cerrado) => {const c=red.componentes.find(c => c.id === id);if(c) editar({...c,cerrado});}} />
        <div className="min-w-0 space-y-3 lg:sticky lg:top-0 lg:max-h-[80vh] lg:overflow-y-auto">
        <aside className="rounded-xl border border-white/10 bg-[#0a1020] p-4"><h2 className="mb-3 text-sm font-semibold">Propiedades y mediciones</h2>
          {seleccion.length > 0 && <div className="mb-4 flex flex-wrap gap-2"><button className={BOTON} onClick={() => cambiar({...red,componentes:red.componentes.map(c => seleccion.includes(c.id) ? {...c,rotacion:(c.rotacion+90)%360} : c)})}>Rotar 90°</button><button className={BOTON} onClick={duplicar}>Duplicar</button><button className={`${BOTON} text-rose-300`} onClick={eliminar}>Eliminar</button></div>}
          {elegido ? <PropiedadesComponente key={elegido.id} c={elegido} lectura={solucion.componentes[elegido.id]} energia={energia.componentes[elegido.id] ?? 0} cambiar={editar} pulsar={activo => setPulso(activo ? elegido.id : null)} /> : cable ? <div className="space-y-3 text-xs"><p>Cable conductor: 0.001 Ω</p><p>Corriente a → b: {formato(solucion.cables[cable.id] ?? 0)} A</p>{(['a','b'] as const).map(extremo => <button key={extremo} className={BOTON} onClick={() => setReconectar({id:cable.id,extremo})}>Reconectar extremo {extremo.toUpperCase()}</button>)}</div> : <p className="text-xs leading-5 text-slate-400">Selecciona un componente para editar sus propiedades o un cable para cambiar sus conexiones. Mayús + clic permite seleccionar varios.</p>}
        </aside>
      <section aria-label="Estado y resultados del circuito" className="space-y-3 rounded-xl border border-white/10 bg-[#0a1020] p-4 text-xs">
        <p className="font-semibold text-cyan-200">{topologia} · {red.componentes.length} componentes · {red.cables.length} cables</p>
        <div className="flex flex-col items-start gap-3"><button className={BOTON} onClick={() => setPausado(!pausado)}>{pausado ? 'Reanudar' : 'Pausar'} animación y energía</button>
          <label className="flex items-center gap-2"><input type="checkbox" checked={electrones} onChange={e => setElectrones(e.target.checked)} />Flujo de electrones (inverso a I)</label>
          <span className="text-slate-400">Modelo DC estacionario; los valores se recalculan al editar incluso en pausa.</span></div>
        <div className="grid gap-3 break-words text-cyan-200">
          <span>R externa equivalente: {solucion.equivalente == null ? '— (abierto, sin fuente o varias fuentes)' : `${formato(solucion.equivalente)} Ω`}</span>
          <span>I entregada: {solucion.corrienteFuente == null ? 'ver fuentes' : `${formato(solucion.corrienteFuente)} A`}</span>
          <span>P carga y cables: {formato(solucion.potencia+solucion.potenciaCables)} W</span><span>E carga y cables: {formato(energia.total)} J</span><span>Tiempo activo: {formato(energia.tiempo)} s</span><span>Residuo KCL: {solucion.errorKirchhoff.toExponential(1)} A</span>
        </div>
        <p className="text-slate-400">Cables: 0.001 Ω; contactos cerrados: 0.001 Ω; amperímetro: 0.01 Ω. Voltímetro ideal sin carga. Fuentes con resistencia interna. Todas las tierras comparten referencia.</p>
        <div aria-live="polite">{solucion.error && <p className="text-rose-300">No hay solución: {solucion.error}</p>}{solucion.avisos.map((a,i) => <p className="mt-1 text-amber-200" key={i}>{a}</p>)}{mensaje && <p className="mt-2 text-cyan-200">{mensaje}</p>}</div>
      </section>
        </div>
      </div>
    </>}
  </div>;
}
