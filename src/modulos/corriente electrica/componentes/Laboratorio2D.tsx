import { useRef, useState } from 'react';
import type { PointerEvent as EventoPuntero } from 'react';
import type { Componente, Laboratorio, SolucionRed, Terminal, TipoComponente } from '../tipos';
import { clave, crearComponente, esFuente, numeroPuertos, posicionTerminal } from '../fisica/modelos';
import { NOMBRES } from '../fisica/modelos';
import { formato } from '../fisica/circuitos';
import ComponenteElectrico from './ComponenteElectrico';

interface Props {
  red:Laboratorio; solucion:SolucionRed; cambiar:(r:Laboratorio) => void;
  seleccion:string[]; seleccionar:(s:string[]) => void; pausado:boolean; electrones:boolean;
  reconectar:{ id:string; extremo:'a'|'b' }|null; finReconectar:() => void;
  pulsar:(id:string, cerrado:boolean) => void;
  mantenerPulsador?:(id:string|null) => void;
  eliminarSeleccion?:() => void;
}
interface Arrastre { x:number; y:number; dx:number; dy:number; ids:string[]; pan:boolean; caja:boolean; acumular:boolean; control?:string }
export default function Laboratorio2D({ red,solucion,cambiar,seleccion,seleccionar,pausado,electrones,reconectar,finReconectar,pulsar,mantenerPulsador,eliminarSeleccion }:Props) {
  const svg = useRef<SVGSVGElement>(null);
  const [vista,setVista] = useState({ x:0,y:0,escala:1 });
  const [arrastre,setArrastre] = useState<Arrastre|null>(null);
  const [inicio,setInicio] = useState<Terminal|null>(null);
  const [pan,setPan] = useState(false);
  const [seleccionMultiple,setSeleccionMultiple] = useState(false);
  function punto(clientX:number,clientY:number) {
    const matriz = svg.current?.getScreenCTM();
    const p = matriz ? new DOMPoint(clientX,clientY).matrixTransform(matriz.inverse()) : {x:clientX,y:clientY};
    return { x:(p.x-vista.x)/vista.escala,y:(p.y-vista.y)/vista.escala };
  }
  const mostrados = red.componentes.map(c => arrastre && !arrastre.pan && !arrastre.caja && arrastre.ids.includes(c.id) ? { ...c,x:c.x+arrastre.dx,y:c.y+arrastre.dy } : c);
  function terminal(t:Terminal) {
    if (reconectar) {
      if (!red.cables.some(c => c.id === reconectar.id)) {finReconectar();return;}
      const nueva = { ...red,cables:red.cables.map(c => c.id === reconectar.id ? { ...c,[reconectar.extremo]:t } : c) };
      const editado = nueva.cables.find(c => c.id === reconectar.id)!;
      if (clave(editado.a) !== clave(editado.b)) cambiar(nueva);
      finReconectar(); return;
    }
    if (!inicio || !red.componentes.some(c => c.id === inicio.componente && inicio.puerto < numeroPuertos(c))) { setInicio(t); return; }
    if (clave(inicio) !== clave(t) && red.cables.length < 160 && !red.cables.some(c => [clave(c.a),clave(c.b)].includes(clave(inicio)) && [clave(c.a),clave(c.b)].includes(clave(t))))
      cambiar({ ...red,cables:[...red.cables,{id:crypto.randomUUID(),a:inicio,b:t}] });
    setInicio(null);
  }
  function iniciar(e:EventoPuntero, c?:Componente) {
    if (e.button !== 0 && e.button !== 1) return;
    e.stopPropagation();e.preventDefault();
    // Arrastrar el fondo mueve la vista por defecto. La selección por recuadro
    // queda disponible con Mayús o con el modo «Seleccionar varias».
    const esPan = pan || e.button === 1 || (!c && !e.shiftKey && !seleccionMultiple);
    const acumular = e.shiftKey || seleccionMultiple;
    const ids = c ? acumular ? seleccion.includes(c.id) ? seleccion.filter(id => id !== c.id) : [...seleccion,c.id] : seleccion.includes(c.id) ? seleccion : [c.id] : acumular ? seleccion : [];
    if (!esPan) seleccionar(ids);
    const p = punto(e.clientX,e.clientY);
    const control = !esPan && !acumular && c && ['interruptor','pulsador'].includes(c.tipo) ? c.id : undefined;
    if (c?.tipo === 'pulsador' && control) mantenerPulsador?.(c.id);
    setArrastre({ ...p,dx:0,dy:0,ids:c&&!ids.includes(c.id)?[]:ids,pan:esPan,caja:!c&&!esPan,acumular,control });
    svg.current?.setPointerCapture(e.pointerId);
  }
  function terminar(e:EventoPuntero, cancelar = false) {
    if (arrastre && !arrastre.pan && !cancelar) {
      if (arrastre.caja) {
        const dentro = (x:number,y:number) => x>=Math.min(arrastre.x,arrastre.x+arrastre.dx)&&x<=Math.max(arrastre.x,arrastre.x+arrastre.dx)&&y>=Math.min(arrastre.y,arrastre.y+arrastre.dy)&&y<=Math.max(arrastre.y,arrastre.y+arrastre.dy);
        const componentes = red.componentes.filter(c => dentro(c.x,c.y)).map(c => c.id);
        const cables = red.cables.filter(c => [c.a,c.b].every(t => {const componente=red.componentes.find(c => c.id===t.componente);if(!componente) return false;const p=posicionTerminal(componente,t.puerto);return dentro(p.x,p.y);})).map(c => c.id);
        seleccionar([...new Set([...(arrastre.acumular ? arrastre.ids : []),...componentes,...cables])]);
      } else if (Math.hypot(arrastre.dx,arrastre.dy)>3) {
        cambiar({ ...red,componentes:mostrados.map(c => ({...c,x:Math.max(-9900,Math.min(9900,c.x)),y:Math.max(-9900,Math.min(9900,c.y))})) });
      } else if (arrastre.control) {
        const c=red.componentes.find(c => c.id===arrastre.control);
        if(c?.tipo==='interruptor') pulsar(c.id,!c.cerrado);
      }
    }
    mantenerPulsador?.(null);
    setArrastre(null);
    if (svg.current?.hasPointerCapture(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
  }
  return <section className="min-w-0 overflow-hidden rounded-xl border border-cyan-400/20 bg-[#080f20]">
    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 p-2 text-xs">
      <button className={`rounded p-2 ${pan ? 'bg-cyan-600' : 'bg-white/5'}`} onClick={() => {setPan(!pan);setSeleccionMultiple(false);}} aria-pressed={pan}>✥ Desplazar</button>
      <button className={`rounded p-2 ${seleccionMultiple ? 'bg-cyan-600' : 'bg-white/5'}`} onClick={() => {setSeleccionMultiple(!seleccionMultiple);setPan(false);}} aria-pressed={seleccionMultiple}>Seleccionar varias</button>
      {eliminarSeleccion && <button disabled={!seleccion.length} className="rounded border border-rose-400/40 bg-rose-500/10 p-2 text-rose-200 disabled:opacity-30" onClick={eliminarSeleccion}>Quitar selección ({seleccion.length})</button>}
      <button className="rounded bg-white/5 p-2" onClick={() => setVista(v => ({...v,escala:Math.min(2.5,v.escala*1.2)}))}>+ Zoom</button>
      <button className="rounded bg-white/5 p-2" onClick={() => setVista(v => ({...v,escala:Math.max(0.3,v.escala/1.2)}))}>− Zoom</button>
      <button className="rounded bg-white/5 p-2" onClick={() => setVista({x:0,y:0,escala:1})}>Centrar</button>
      <span className="ml-auto text-cyan-200">{reconectar ? 'Selecciona el nuevo terminal del cable' : inicio ? 'Selecciona el terminal de destino' : 'Conecta pulsando dos terminales'}</span>
      {(inicio || reconectar) && <button className="text-rose-300" onClick={() => {setInicio(null);finReconectar();}}>Cancelar conexión</button>}
    </div>
    <svg ref={svg} viewBox="0 0 1100 650" className={`h-[clamp(320px,52vh,480px)] w-full touch-none select-none ${arrastre?.pan ? 'cursor-grabbing' : 'cursor-grab'}`} role="application" aria-label="Laboratorio de circuitos. Arrastra el fondo para mover la vista; Mayús y arrastre para seleccionar un área; pulsa terminales para conectar."
      onPointerDown={e => iniciar(e)} onPointerMove={e => {
        if (!arrastre) return;
        if (arrastre.pan) {
          const matriz = svg.current?.getScreenCTM();
          const p = matriz ? new DOMPoint(e.clientX,e.clientY).matrixTransform(matriz.inverse()) : {x:e.clientX,y:e.clientY};
          setVista(v => ({...v,x:p.x-arrastre.x*v.escala,y:p.y-arrastre.y*v.escala}));
        } else {
          const p = punto(e.clientX,e.clientY);
          setArrastre({...arrastre,dx:p.x-arrastre.x,dy:p.y-arrastre.y});
        }
      }} onPointerUp={e => terminar(e)} onPointerCancel={e => terminar(e,true)} onLostPointerCapture={() => {setArrastre(null);mantenerPulsador?.(null);}}
      onWheel={e => {
        const p = punto(e.clientX,e.clientY);
        setVista(v => {const escala = Math.max(0.3,Math.min(2.5,v.escala*(e.deltaY < 0 ? 1.1 : 1/1.1)));return {escala,x:v.x+p.x*(v.escala-escala),y:v.y+p.y*(v.escala-escala)};});
      }} onDragOver={e => e.preventDefault()} onDrop={e => {
        e.preventDefault(); const tipo = e.dataTransfer.getData('componente') as TipoComponente;
        if (!Object.hasOwn(NOMBRES,tipo) || red.componentes.length >= 80) return;
        const p = punto(e.clientX,e.clientY); const c = crearComponente(tipo,p.x,p.y);
        cambiar({...red,componentes:[...red.componentes,c]});seleccionar([c.id]);
      }}>
      <defs><pattern id="rejilla-circuito" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#23344e" /></pattern></defs>
      <rect width="1100" height="650" fill="url(#rejilla-circuito)" />
      <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.escala})`}>
        {red.cables.map(cable => {
          const ca = mostrados.find(c => c.id === cable.a.componente), cb = mostrados.find(c => c.id === cable.b.componente);
          if (!ca || !cb) return null;
          const a = posicionTerminal(ca,cable.a.puerto), b = posicionTerminal(cb,cable.b.puerto);
          const direccion = (c:Componente,puerto:number) => {
            const r=c.rotacion*Math.PI/180;
            const dx=puerto===0?-1:puerto===1?1:0,dy=puerto===2?1:0;
            return {x:Math.round(dx*Math.cos(r)-dy*Math.sin(r)),y:Math.round(dx*Math.sin(r)+dy*Math.cos(r))};
          };
          const da=direccion(ca,cable.a.puerto),db=direccion(cb,cable.b.puerto);
          const sa={x:a.x+da.x*24,y:a.y+da.y*24},sb={x:b.x+db.x*24,y:b.y+db.y*24};
          const medio=(sa.x+sb.x)/2;
          const ruta=da.y===0&&db.y===0&&((sb.x-sa.x)*da.x<0||(sa.x-sb.x)*db.x<0)
            ? `V${Math.min(ca.y,cb.y)-85} H${sb.x} V${sb.y}`
            : da.x===0&&db.x===0 ? `H${Math.min(ca.x,cb.x)-85} V${sb.y} H${sb.x}`
            : da.y===0&&db.y===0 ? `H${medio} V${sb.y} H${sb.x}`
            : da.y===0 ? `V${sb.y} H${sb.x}` : `H${sb.x} V${sb.y}`;
          const d=`M${a.x},${a.y} L${sa.x},${sa.y} ${ruta} L${b.x},${b.y}`;
          const corriente = solucion.cables[cable.id] ?? 0;
          return <g key={cable.id} role="button" tabIndex={0} aria-label={`Seleccionar cable ${cable.id}`} onKeyDown={e => {if(e.key==='Enter'||e.key===' ') {e.preventDefault();seleccionar([cable.id]);}}} onPointerDown={e => {e.stopPropagation();seleccionar(e.shiftKey||seleccionMultiple ? seleccion.includes(cable.id) ? seleccion.filter(id=>id!==cable.id) : [...seleccion,cable.id] : [cable.id]);}}>
            <path d={d} stroke="transparent" strokeWidth="18" fill="none" className="cursor-pointer" />
            <path d={d} stroke="#020617" strokeWidth="10" strokeLinejoin="round" fill="none" />
            <path d={d} stroke={seleccion.includes(cable.id) ? '#fbbf24' : '#47617b'} strokeWidth="6" strokeLinejoin="round" fill="none" />
            <path d={d} stroke="#a6bed0" strokeOpacity="0.25" strokeWidth="2" fill="none" pointerEvents="none" />
            {Math.abs(corriente) > 1e-8 && !solucion.error && <path d={d} data-flujo="cable" stroke={electrones ? '#fb7185' : '#b6fcff'} strokeWidth="5" strokeDasharray="1 19" strokeLinecap="round" fill="none" pointerEvents="none"
              style={{ animation:`corriente-cable ${Math.max(0.25,Math.min(6,1/Math.sqrt(Math.abs(corriente))))}s linear infinite`,animationDirection:Math.sign(corriente)*(electrones ? -1 : 1) > 0 ? 'normal':'reverse',animationPlayState:pausado ? 'paused':'running' }} />}
          </g>;
        })}
        {mostrados.map(c => <g key={c.id} transform={`translate(${c.x} ${c.y})`}>
          {seleccion.includes(c.id) && <rect x="-67" y="-64" width="134" height="126" rx="12" fill="#22d3ee10" stroke="#22d3ee" strokeDasharray="4 3" />}
          <g className="cursor-grab" role="button" tabIndex={0} aria-label={`Seleccionar ${c.nombre}${c.tipo==='interruptor' ? ' y abrir o cerrar' : ''}`} onPointerDown={e => iniciar(e,c)} onKeyDown={e => {if(e.key==='Enter'||e.key===' ') {e.preventDefault();seleccionar([c.id]);if(c.tipo==='interruptor') pulsar(c.id,!c.cerrado);if(c.tipo==='pulsador') mantenerPulsador?.(c.id);}}} onKeyUp={() => {if(c.tipo==='pulsador') mantenerPulsador?.(null);}} onBlur={() => {if(c.tipo==='pulsador') mantenerPulsador?.(null);}}>
            <rect x="-50" y="-38" width="100" height="76" fill="transparent" />
            <g transform={`rotate(${c.rotacion})`}><ComponenteElectrico c={c} lectura={solucion.componentes[c.id]} /></g>
            <text y={c.tipo==='bombilla'?-56:-44} textAnchor="middle" fill="#e2e8f0" fontSize="12">{c.nombre}</text>
            <text y="53" textAnchor="middle" fill="#94a3b8" fontSize="11">{esFuente(c) ? `${formato(c.valor)} V` : ['resistencia','variable','potenciometro','bombilla'].includes(c.tipo) ? `${formato(c.valor)} Ω` : ''}</text>
          </g>
          {Math.abs(solucion.componentes[c.id]?.corriente ?? 0)>1e-8 && !solucion.error && numeroPuertos(c)===2 && !['voltimetro'].includes(c.tipo) && <g transform={`rotate(${c.rotacion})`} pointerEvents="none">
            <path d="M-55 0 H55" data-flujo="componente" fill="none" stroke={electrones ? '#fb7185':'#b6fcff'} strokeWidth="3" strokeDasharray="1 19" strokeLinecap="round" opacity="0.7"
              style={{animation:`corriente-cable ${Math.max(0.25,Math.min(6,1/Math.sqrt(Math.abs(solucion.componentes[c.id].corriente!))))}s linear infinite`,animationDirection:Math.sign(solucion.componentes[c.id].corriente!)*(electrones?-1:1)>0?'normal':'reverse',animationPlayState:pausado?'paused':'running'}} />
          </g>}
          {Array.from({length:numeroPuertos(c)},(_,puerto) => {
            const p = posicionTerminal(c,puerto); const activo = inicio && inicio.componente === c.id && inicio.puerto === puerto;
            return <g key={puerto} role="button" tabIndex={0} aria-label={`Terminal ${puerto} de ${c.nombre}`} className="cursor-crosshair"
              onPointerDown={e => {e.stopPropagation();terminal({componente:c.id,puerto});}}
              onKeyDown={e => {if(e.key === 'Enter' || e.key === ' ') {e.preventDefault();terminal({componente:c.id,puerto});}}}>
              <circle cx={p.x-c.x} cy={p.y-c.y} r="12" fill="transparent" />
              <circle cx={p.x-c.x} cy={p.y-c.y} r="5" fill={activo ? '#fbbf24' : '#e2e8f0'} stroke="#0891b2" strokeWidth="2" />
            </g>;
          })}
        </g>)}
        {arrastre?.caja && <rect x={Math.min(arrastre.x,arrastre.x+arrastre.dx)} y={Math.min(arrastre.y,arrastre.y+arrastre.dy)} width={Math.abs(arrastre.dx)} height={Math.abs(arrastre.dy)} fill="#22d3ee18" stroke="#67e8f9" strokeDasharray="6 4" pointerEvents="none" />}
      </g>
    </svg>
    <style>{'@keyframes corriente-cable {to {stroke-dashoffset:-20}}'}</style>
    <p className="px-3 pb-3 text-xs leading-5 text-slate-400">Clic y arrastre en el fondo: mover la vista. Mayús + arrastre o «Seleccionar varias»: marcar un área. «Quitar selección» o Supr: eliminar. Un clic en interruptor: encender/apagar; pulsador: mantener presionado. Arrastra cada componente para moverlo. Cruces sin punto no son uniones. El movimiento ilustra la corriente, no la velocidad real de electrones.</p>
  </section>;
}
