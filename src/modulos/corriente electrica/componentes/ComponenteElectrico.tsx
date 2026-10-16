import type { Componente, Lectura } from '../tipos';
import { esFuente, esVoltimetro } from '../fisica/modelos';
import { formato } from '../fisica/circuitos';

export default function ComponenteElectrico({ c, lectura }: { c:Componente; lectura?:Lectura }) {
  // Escala perceptual: resalta potencias pequeñas sin inventar luz a P=0.
  const potencia = Math.max(0,lectura?.potencia ?? 0);
  const brillo = potencia>1e-12 ? Math.min(1, Math.sqrt(potencia / 5)) : 0;
  const lecturaDigital = esVoltimetro(c) ? lectura?.voltaje : lectura?.corriente;
  const id = `pieza-${Array.from(c.id).map(letra=>letra.codePointAt(0)!.toString(16)).join('-')}`;
  const metal=`${id}-metal`, vidrio=`${id}-vidrio`, luz=`${id}-luz`, cuerpo=`${id}-cuerpo`;
  const colores=['#101010','#7c3e1b','#c43426','#ed8d24','#e8c733','#32834a','#285ab5','#8545a0','#7d818a','#eeeeee'];
  const [mantisa,exponente]=Math.max(0.1,c.valor).toExponential(1).split('e');
  const digitos=Math.round(Number(mantisa)*10), multiplicador=Number(exponente)-1;
  return <g stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id={metal} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f1f5f9"/><stop offset="0.25" stopColor="#8a9aad"/><stop offset="0.5" stopColor="#eef2f6"/><stop offset="0.8" stopColor="#627186"/><stop offset="1" stopColor="#263447"/></linearGradient>
      <linearGradient id={cuerpo} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#64748b"/><stop offset="0.18" stopColor="#25354c"/><stop offset="0.75" stopColor="#101c30"/><stop offset="1" stopColor="#050b16"/></linearGradient>
      <radialGradient id={vidrio} cx="0.32" cy="0.23" r="0.85"><stop stopColor={brillo>0?'#fffbd0':'#d5f3ff'} stopOpacity={brillo>0?0.9:0.35}/><stop offset="0.5" stopColor={brillo>0?'#fbbf24':'#39566e'} stopOpacity={brillo>0?0.2+0.7*brillo:0.16}/><stop offset="1" stopColor={brillo>0?'#f59e0b':'#9bc4da'} stopOpacity="0.5"/></radialGradient>
      <radialGradient id={luz}><stop stopColor="#fff8b0" stopOpacity="0.95"/><stop offset="0.25" stopColor="#fde047" stopOpacity="0.65"/><stop offset="0.6" stopColor="#fbbf24" stopOpacity="0.25"/><stop offset="1" stopColor="#fbbf24" stopOpacity="0"/></radialGradient>
    </defs>
    {!['nodo','tierra'].includes(c.tipo) && <><path d="M-55 0 H-30 M30 0 H55" stroke="#475569" strokeWidth="7"/><path d="M-55 -1 H-30 M30 -1 H55" stroke="#cbd5e1" strokeWidth="2"/></>}
    {esFuente(c) ? <>
      <rect x="-36" y="-25" width="72" height="50" rx="9" fill={`url(#${cuerpo})`} stroke="#718299" strokeWidth="1.5"/>
      <path d="M-34 -19 Q-34 -24 -29 -24 H-6 V24 H-29 Q-34 24 -34 19 Z" fill="#d39742" stroke="none"/>
      <path d="M-30 -20 H27" stroke="#fff" strokeOpacity="0.3" strokeWidth="2"/>
      <rect x="-41" y="-9" width="6" height="18" rx="2" fill={`url(#${metal})`} strokeWidth="1"/>
      <rect x="35" y="-11" width="6" height="22" rx="2" fill={`url(#${metal})`} strokeWidth="1"/>
      <path d="M-21 -7 V7 M-28 0 H-14 M14 0 H25" stroke="#fff7df" strokeWidth="2"/>
      <text x="7" y="18" textAnchor="middle" fontSize="7" fill="#a8b7c9" stroke="none">{c.tipo==='pila'?'CELL':'DC POWER'}</text>
    </> : ['resistencia','variable','potenciometro'].includes(c.tipo) ? <>
      <path d="M-32 -9 Q-30 -15 -24 -15 H24 Q30 -15 32 -9 V9 Q30 15 24 15 H-24 Q-30 15 -32 9 Z" fill="#d4b38a" stroke="#957850" strokeWidth="1.5"/>
      <path d="M-26 -10 H25" stroke="#fff5db" strokeOpacity="0.8" strokeWidth="3"/>
      <path d="M-18 -13 V13" stroke={colores[Math.floor(digitos/10)]} strokeWidth="5"/><path d="M-7 -13 V13" stroke={colores[digitos%10]} strokeWidth="5"/>
      <path d="M5 -13 V13" stroke={multiplicador===-2?'#b5bec8':multiplicador===-1?'#cda84e':colores[multiplicador]} strokeWidth="5"/><path d="M22 -12 V12" stroke="#cda84e" strokeWidth="3"/>
      {c.tipo !== 'resistencia' && <path d="M-16 27 L20 -27 M10 -24 L20 -27 L20 -17" stroke="#67e8f9" />}
      {c.tipo === 'potenciometro' && <path d="M0 43 V14" stroke="#67e8f9" />}
    </> : c.tipo === 'bombilla' ? <>
      {brillo > 0 && <circle data-luz="halo" cy="-9" r="76" fill={`url(#${luz})`} stroke="none" opacity={Math.min(1,2*brillo)} pointerEvents="none"/>}
      <path d="M-36 25 Q-36 19 -28 19 H28 Q36 19 36 25 V31 H-36 Z" fill={`url(#${cuerpo})`} stroke="#64748b" strokeWidth="1.5"/>
      <path d="M-55 0 H-35 V26 M55 0 H35 V26" fill="none" stroke="#8d9eaf" strokeWidth="3"/>
      <path d="M-12 17 V9 C-12 4 -27 -2 -27 -18 A27 27 0 0 1 27 -18 C27 -2 12 4 12 9 V17 Z" fill={`url(#${vidrio})`} stroke={brillo>0?'#fff5bc':'#b0d6e6'} strokeWidth="1.5"/>
      <path d="M-18 -22 Q-18 -35 -8 -37" stroke="#fff" strokeOpacity="0.7" strokeWidth="4" fill="none"/>
      <path d="M-8 15 L-8 -10 M8 15 L8 -10" stroke="#8395a4" strokeWidth="1.5"/>
      {brillo>0&&<path d="M-9 -10 L-6 -16 L-3 -9 L0 -16 L3 -9 L6 -16 L9 -10" fill="none" stroke="#fbbf24" strokeWidth={4+4*brillo} opacity={0.3+0.6*brillo} data-luz="filamento"/>}
      <path d="M-9 -10 L-6 -16 L-3 -9 L0 -16 L3 -9 L6 -16 L9 -10" fill="none" stroke={brillo>0?'#fffde3':'#64748b'} strokeWidth={brillo>0?2:1.2}/>
      <rect x="-12" y="13" width="24" height="14" rx="3" fill={`url(#${metal})`} stroke="#68788b" strokeWidth="1"/>
      <path d="M-11 16 H11 M-11 20 H11 M-10 24 H10" stroke="#48586b" strokeWidth="1"/>
      <circle cx="-27" cy="26" r="2.5" fill="#d4dce5" stroke="#475569" strokeWidth="1"/><circle cx="27" cy="26" r="2.5" fill="#d4dce5" stroke="#475569" strokeWidth="1"/>
    </> : ['interruptor','pulsador'].includes(c.tipo) ? <>
      <rect x="-36" y="-20" width="72" height="44" rx="6" fill={`url(#${cuerpo})`} stroke="#64748b" strokeWidth="1.5"/>
      <circle cx="-28" cy="12" r="3" fill={`url(#${metal})`} strokeWidth="1"/><circle cx="28" cy="12" r="3" fill={`url(#${metal})`} strokeWidth="1"/>
      <circle cx="-22" r="5" fill="#e6ba6a" stroke="#9a7638" strokeWidth="1"/><circle cx="22" r="5" fill="#e6ba6a" stroke="#9a7638" strokeWidth="1"/>
      {c.tipo==='interruptor' ? <>
        <g transform={`rotate(${c.cerrado?0:-32} -22 0)`} style={{transition:'transform 150ms ease'}}><path d="M-22 0 H23" stroke="#c7d2de" strokeWidth="6"/><rect x="-3" y="-7" width="21" height="14" rx="4" fill={c.cerrado?'#059669':'#e35e46'} stroke="#0f172a" strokeWidth="1.5"/></g>
      </> : <>
        <rect x="-14" y={c.cerrado?-12:-19} width="28" height="21" rx="5" fill={c.cerrado?'#0d9488':'#e35e46'} stroke="#fbad98" strokeWidth="1.5"/>
        <path d={c.cerrado?'M-22 0 H22':'M-22 0 H-15 M15 0 H22'} stroke="#c7d2de" strokeWidth="3"/>
      </>}
      <text y="37" textAnchor="middle" fill={c.cerrado?'#6ee7b7':'#fca5a5'} stroke="none" fontSize="9">{c.cerrado?'ON · CERRADO':'OFF · ABIERTO'}</text>
    </> : c.tipo === 'nodo' ? <circle r="9" fill="#36dfff" stroke="#a5f3fc" /> : c.tipo === 'tierra' ? <path d="M0 0 V14 M-20 14 H20 M-12 22 H12 M-5 30 H5" stroke="#34d399" /> : <>
      <rect x="-35" y="-30" width="70" height="64" rx="9" fill="#ce972d" stroke="#f5bd54" strokeWidth="1.5"/>
      <rect x="-29" y="-24" width="58" height="45" rx="5" fill={`url(#${cuerpo})`} stroke="#111827" strokeWidth="1"/>
      <rect x="-25" y="-15" width="50" height="24" rx="3" fill="#c6d6b4" stroke="#475569" strokeWidth="1" />
      <text y="1" textAnchor="middle" fill="#213329" stroke="none" fontSize="9" fontFamily="monospace">
        {lecturaDigital == null ? '—' : formato(lecturaDigital)} {esVoltimetro(c) ? 'V' : 'A'}
      </text>
      <circle cy="24" r="6" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1"/><path d="M0 24 L3 20" stroke="#e2e8f0" strokeWidth="1"/>
    </>}
  </g>;
}
