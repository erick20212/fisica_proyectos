import { useState } from 'react';
import { calcularOhm, formato } from '../fisica/circuitos';
import { ControlValor } from '../controles/PropiedadesComponente';

export default function LeyOhm() {
  const [voltaje, setVoltaje] = useState(12);
  const [resistencia, setResistencia] = useState(100);
  const r = calcularOhm(voltaje, resistencia);
  const maximoI = 24 / resistencia;
  const escalaI = 10 ** Math.ceil(Math.log10(maximoI));
  const px = 340 + voltaje / 24 * 270;
  const py = 190 - r.corriente / escalaI * 140;
  const escalaIR = Math.max(0.1,Math.abs(voltaje));
  const curvaIR = Array.from({length:151},(_,i) => {
    const resistenciaMuestra = 10 ** (i/150*3);
    return `${i === 0 ? 'M' : 'L'}${70+i/150*540},${190-(voltaje/resistenciaMuestra)/escalaIR*140}`;
  }).join(' ');
  return <section className="space-y-5 rounded-xl border border-white/10 bg-[#090e1e] p-5">
    <h2 className="text-lg font-semibold">Visualizador de ley de Ohm</h2>
    <p className="text-sm text-slate-400">V = I × R. La pendiente de la gráfica I(V) es 1/R: una resistencia mayor produce menos corriente para el mismo voltaje.</p>
    <div className="grid gap-5 sm:grid-cols-2">
      <ControlValor etiqueta="Voltaje para ley de Ohm (V)" valor={voltaje} min={-24} max={24} cambiar={setVoltaje} />
      <ControlValor etiqueta="Resistencia para ley de Ohm (Ω)" valor={resistencia} min={1} max={1000} paso={1} cambiar={setResistencia} />
    </div>
    <svg viewBox="0 0 680 205" className="w-full rounded-lg bg-[#050b18]" role="img" aria-label="Circuito de Ohm con batería, resistencia y corriente animada">
      <path d="M120 130 V50 H300 M380 50 H560 V130 H370 M310 130 H120" fill="none" stroke="#64748b" strokeWidth="4" />
      {Math.abs(r.corriente)>1e-10 && <path d="M120 130 V50 H300 M380 50 H560 V130 H370 M310 130 H120" fill="none" stroke="#67e8f9" strokeWidth="4" strokeDasharray="2 18" style={{animation:`ohm-corriente ${Math.max(0.25,Math.min(6,1/Math.sqrt(Math.abs(r.corriente))))}s linear infinite`,animationDirection:voltaje>=0?'normal':'reverse'}} />}
      <rect x="300" y="37" width="80" height="26" rx="5" fill="#d6b68a" stroke="#fef3c7" strokeWidth="2" />
      <path d="M310 106 V154 M350 118 V142 M350 130 H370" stroke="#fbbf24" strokeWidth="4" />
      <g fill="#e2e8f0" fontSize="13" textAnchor="middle"><text x="340" y="25">R = {formato(resistencia)} Ω</text><text x="340" y="182">V = {formato(voltaje)} V · I = {formato(r.corriente)} A</text><text x="290" y="115">+</text><text x="375" y="115">−</text></g>
    </svg>
    <style>{'@keyframes ohm-corriente {to {stroke-dashoffset:-20}}'}</style>
    <p className="text-sm text-cyan-200">Con {formato(voltaje)} V y {formato(resistencia)} Ω circulan {formato(r.corriente)} A. Duplicar V duplica I; duplicar R reduce I a la mitad. {voltaje < 0 ? 'La corriente circula en sentido inverso a la referencia.' : voltaje === 0 ? 'Sin voltaje no hay corriente ni disipación.' : 'La resistencia disipa energía eléctrica.'}</p>
    <h3 className="font-semibold">Corriente–voltaje · R fija</h3>
    <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
      <p>I = V/R = <strong className="text-cyan-300">{formato(r.corriente)} A</strong></p>
      <p>V = I·R = <strong className="text-cyan-300">{formato(r.corriente * resistencia)} V</strong></p>
      <p>P = V·I = <strong className="text-cyan-300">{formato(r.potencia)} W</strong></p>
    </div>
    <svg viewBox="0 0 680 400" className="w-full rounded-lg bg-[#050b18]" role="img" aria-label={`Gráfica I contra V para ${resistencia} ohmios. Corriente actual ${r.corriente} amperios.`}>
      <g stroke="#334155"><path d="M70 190 H620 M340 40 V340" />
        <path d="M70 50 H610 M70 330 H610" strokeDasharray="4 5" /></g>
      <path d={`M70 ${190 + maximoI / escalaI * 140} L610 ${190 - maximoI / escalaI * 140}`} stroke="#36dfff" strokeWidth="3" />
      <circle cx={px} cy={py} r="7" fill="#fb7185" />
      <g fill="#cbd5e1" fontSize="13"><text x="618" y="182">V (V)</text><text x="350" y="32">I (A)</text>
        <text x="56" y="215">−24</text><text x="595" y="215">24</text><text x="345" y="210">0</text>
        <text x="80" y="43">+{formato(escalaI)} A</text><text x="80" y="351">−{formato(escalaI)} A</text>
        <text x="70" y="385">Escala vertical automática según R. Punto rosa: estado actual.</text>
      </g>
    </svg>
    <h3 className="font-semibold">Corriente–resistencia · V fijo</h3>
    <svg viewBox="0 0 680 400" className="w-full rounded-lg bg-[#050b18]" role="img" aria-label="Gráfica I-R con eje de resistencia logarítmico de 1 a 1000 ohmios">
      <path d="M70 40 V340 M70 190 H620" fill="none" stroke="#475569" />
      <path d={curvaIR} fill="none" stroke="#a78bfa" strokeWidth="3" />
      <circle cx={70+Math.log10(resistencia)/3*540} cy={190-r.corriente/escalaIR*140} r="6" fill="#fb7185" />
      <g fill="#cbd5e1" fontSize="12"><text x="18" y="45">I (A)</text><text x="18" y="63">{formato(escalaIR)}</text><text x="12" y="335">−{formato(escalaIR)}</text><text x="45" y="195">0</text>
        {[1,10,100,1000].map((v,i) => <text key={v} x={70+i*180} y="360" textAnchor="middle">{v}</text>)}
        <text x="70" y="385">R (Ω), escala logarítmica. I = V/R. Escala vertical automática.</text></g>
    </svg>
  </section>;
}
