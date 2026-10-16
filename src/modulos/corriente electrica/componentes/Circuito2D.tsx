import type { Circuito, ResultadoCircuito } from '../tipos';
import { formato } from '../fisica/circuitos';

interface Medida { ancho: number; alto: number }
function medir(n: Circuito): Medida {
  if (n.tipo === 'resistencia') return { ancho: 190, alto: 90 };
  const hijos = n.elementos.map(medir);
  return n.tipo === 'serie'
    ? { ancho: hijos.reduce((a, m) => a + m.ancho, 0), alto: Math.max(...hijos.map(m => m.alto)) }
    : { ancho: Math.max(...hijos.map(m => m.ancho)) + 60, alto: hijos.reduce((a, m) => a + m.alto, 0) + 20 };
}

export default function Circuito2D({ red, resultado }: { red: Circuito; resultado: ResultadoCircuito }) {
  const medida = medir(red);
  const ancho = medida.ancho + 160;
  const alto = medida.alto + 180;
  const centro = 50 + medida.alto / 2;
  function dibujar(n: Circuito, x: number, y: number, espacio: Medida) {
    if (n.tipo === 'resistencia') {
      const m = resultado.elementos.find(e => e.id === n.id)!;
      const cy = y + espacio.alto / 2;
      const cx = x + espacio.ancho / 2;
      return <g key={n.id}>
        <path d={`M ${x} ${cy} H ${cx - 36} M ${cx + 36} ${cy} H ${x + espacio.ancho}`} />
        <rect x={cx - 36} y={cy - 12} width="72" height="24" rx="3" fill="#123249" />
        <text x={cx} y={cy - 24}>{n.id}: {formato(n.ohmios)} Ω</text>
        <text x={cx} y={cy + 32} className="fill-slate-300">{formato(m.corriente)} A · {formato(m.voltaje)} V</text>
      </g>;
    }
    if (n.tipo === 'serie') {
      let dx = x;
      const extra = (espacio.ancho - medir(n).ancho) / n.elementos.length;
      return <g key={n.id}>{n.elementos.map(h => {
        const tam = medir(h);
        const grafico = dibujar(h, dx, y, { ancho: tam.ancho + extra, alto: espacio.alto });
        dx += tam.ancho + extra;
        return grafico;
      })}</g>;
    }
    let dy = y + (espacio.alto - medir(n).alto) / 2 + 10;
    const centros: number[] = [];
    const ramas = n.elementos.map(h => {
      const tam = medir(h);
      centros.push(dy + tam.alto / 2);
      const grafico = dibujar(h, x + 30, dy, { ancho: espacio.ancho - 60, alto: tam.alto });
      dy += tam.alto;
      return grafico;
    });
    const cy = y + espacio.alto / 2;
    return <g key={n.id}>
      <path d={`M ${x} ${cy} H ${x + 30} M ${x + espacio.ancho - 30} ${cy} H ${x + espacio.ancho}
        M ${x + 30} ${Math.min(cy, centros[0])} V ${Math.max(cy, centros.at(-1)!)}
        M ${x + espacio.ancho - 30} ${Math.min(cy, centros[0])} V ${Math.max(cy, centros.at(-1)!)}`} />
      {ramas}
    </g>;
  }
  return <section className="overflow-x-auto rounded-xl border border-cyan-400/15 bg-[#070e1d] p-3" aria-label="Esquema del circuito">
    <svg viewBox={`0 0 ${ancho} ${alto}`} style={{ minWidth: Math.max(600, ancho * 0.75) }} className="w-full" role="img" aria-label="Circuito resistivo conectado a una fuente ideal de voltaje">
      <g stroke="#36dfff" strokeWidth="2" fill="none">
        <path d={`M 80 ${centro} H 40 V ${alto - 65} H ${ancho / 2 - 10} M ${ancho / 2 + 10} ${alto - 65} H ${ancho - 40} V ${centro} H ${ancho - 80}`} />
        <path d={`M ${ancho / 2 - 10} ${alto - 85} V ${alto - 45} M ${ancho / 2 + 10} ${alto - 76} V ${alto - 54}`} stroke="white" />
        <g className="fill-cyan-100" style={{ fontSize: 13, textAnchor: 'middle' }} stroke="none">
          <text x={ancho / 2} y={alto - 16}>Fuente: {formato(resultado.voltaje)} V · I total: {formato(resultado.corriente)} A</text>
          <text x={ancho / 2 - 26} y={alto - 92}>+</text><text x={ancho / 2 + 26} y={alto - 92}>−</text>
        </g>
        <g style={{ fontSize: 12, textAnchor: 'middle' }} className="[&_text]:stroke-none [&_text]:fill-cyan-100">
          {dibujar(red, 80, 50, medida)}
        </g>
      </g>
    </svg>
    <p className="text-xs text-slate-400">Fuente ideal de corriente continua. Corrientes y tensiones con referencia desde el terminal + al −; un valor negativo indica sentido inverso.</p>
  </section>;
}
