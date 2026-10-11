import { useId, useRef, type PointerEvent, type KeyboardEvent } from "react";
import type { AccionSimulador, EstadoSimulador, ResultadoCapacitor } from "../tipos";
import { LIMITES, obtenerMaterial, formatearSI } from "../fisica/capacitor";

interface Propiedades {
  estado: EstadoSimulador;
  resultado: ResultadoCapacitor;
  cambiar: (accion: AccionSimulador) => void;
}

export default function Capacitor2D({ estado, resultado, cambiar }: Propiedades) {
  const id = useId().replaceAll(":", "");
  const svg = useRef<SVGSVGElement>(null);
  const arrastre = useRef<{
    tipo: "area" | "separacion"; puntero: number; x: number; y: number;
    area: number; separacion: number;
  } | null>(null);
  const material = obtenerMaterial(estado.material);
  // Escalas gráficas acotadas: la perspectiva y los símbolos son ilustrativos.
  const raizMinima = Math.sqrt(LIMITES.area.minimo * 1e6);
  const rangoRaiz = Math.sqrt(LIMITES.area.maximo * 1e6) - raizMinima;
  const escalaArea = (Math.sqrt(estado.area * 1e6) - raizMinima) / rangoRaiz;
  const ancho = 150 + 150 * escalaArea;
  const profundidad = 30 + 30 * escalaArea;
  const perspectiva = 40 + 20 * escalaArea;
  const hueco = 65 + 125 * (estado.separacion - LIMITES.separacion.minimo) /
    (LIMITES.separacion.maximo - LIMITES.separacion.minimo);
  const izquierda = 480 - (ancho + perspectiva) / 2;
  const superior = 250 - hueco / 2;
  const inferior = 250 + hueco / 2;
  const conexionSuperior = izquierda + ancho / 2 + perspectiva;
  const conexionInferior = izquierda + ancho / 2;
  const colorSuperior = resultado.carga > 0 ? "#fb7185" : resultado.carga < 0 ? "#22d3ee" : "#94a3b8";
  const colorInferior = resultado.carga < 0 ? "#fb7185" : resultado.carga > 0 ? "#22d3ee" : "#94a3b8";
  const simbolos = resultado.carga === 0 ? 0 : Math.min(24, Math.max(1,
    Math.ceil(4 * Math.log1p(Math.abs(resultado.carga) / 5e-14))));
  const intensidad = Math.min(1, Math.log1p(Math.abs(resultado.campo) / 100) / Math.log1p(12000 / 100));
  const columnasCampo = 3 + Math.round(3 * intensidad);
  const cable = estado.bateriaConectada ? "#56cbdc" : "#53647e";

  function cursor(evento: PointerEvent<SVGGElement>) {
    const matriz = svg.current?.getScreenCTM();
    return matriz ? new DOMPoint(evento.clientX, evento.clientY).matrixTransform(matriz.inverse()) : null;
  }
  function iniciar(tipo: "area" | "separacion", evento: PointerEvent<SVGGElement>) {
    if (evento.button !== 0) return;
    const punto = cursor(evento);
    if (!punto) return;
    evento.preventDefault();
    arrastre.current = { tipo, puntero: evento.pointerId, x: punto.x, y: punto.y,
      area: estado.area, separacion: estado.separacion };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }
  function mover(evento: PointerEvent<SVGGElement>) {
    const actual = arrastre.current;
    if (!actual || actual.puntero !== evento.pointerId) return;
    const punto = cursor(evento);
    if (!punto) return;
    let valor: number;
    if (actual.tipo === "separacion") {
      valor = actual.separacion + (punto.y - actual.y) * 2 * 9e-3 / 125;
    } else {
      const escalaInicial = (Math.sqrt(actual.area * 1e6) - raizMinima) / rangoRaiz;
      const escala = Math.max(0, Math.min(1, escalaInicial + (punto.x - actual.x) / 85));
      valor = (raizMinima + escala * rangoRaiz) ** 2 / 1e6;
    }
    const limites = LIMITES[actual.tipo];
    cambiar({ tipo: actual.tipo, valor: Math.max(limites.minimo, Math.min(limites.maximo, valor)) });
  }
  function terminar(evento: PointerEvent<SVGGElement>) {
    if (arrastre.current?.puntero !== evento.pointerId) return;
    arrastre.current = null;
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId);
  }
  function teclado(tipo: "area" | "separacion", evento: KeyboardEvent<SVGGElement>) {
    const direccion = ["ArrowUp", "ArrowRight"].includes(evento.key) ? 1 :
      ["ArrowDown", "ArrowLeft"].includes(evento.key) ? -1 : 0;
    if (!direccion && evento.key !== "Home" && evento.key !== "End") return;
    evento.preventDefault();
    const limites = LIMITES[tipo];
    const valor = evento.key === "Home" ? limites.minimo : evento.key === "End" ? limites.maximo :
      estado[tipo] + direccion * (tipo === "area" ? 10e-6 : 0.1e-3);
    cambiar({ tipo, valor: Math.max(limites.minimo, Math.min(limites.maximo, valor)) });
  }
  function placa(y: number, color: string, signo: number) {
    const plano = `${izquierda},${y} ${izquierda + ancho},${y} ${izquierda + ancho + perspectiva},${y - profundidad} ${izquierda + perspectiva},${y - profundidad}`;
    return (
      <g>
        <polygon points={plano} fill="#10283e" fillOpacity={0.87} stroke={color} strokeWidth={1.5} />
        <polygon points={`${izquierda},${y} ${izquierda + ancho},${y} ${izquierda + ancho},${y + 7} ${izquierda},${y + 7}`}
          fill={color} fillOpacity={0.28} stroke={color} strokeWidth={1} />
        <polygon points={`${izquierda + ancho},${y} ${izquierda + ancho + perspectiva},${y - profundidad} ${izquierda + ancho + perspectiva},${y - profundidad + 7} ${izquierda + ancho},${y + 7}`}
          fill={color} fillOpacity={0.12} stroke={color} strokeWidth={1} />
        {Array.from({ length: simbolos }, (_, indice) => {
          const columnas = Math.min(8, simbolos);
          const filas = Math.ceil(simbolos / columnas);
          const t = (Math.floor(indice / columnas) + 0.5) / filas;
          return <text key={indice} data-carga={signo > 0 ? "positiva" : "negativa"}
            x={izquierda + ancho * ((indice % columnas + 0.5) / columnas) + perspectiva * t}
            y={y - profundidad * t + 5} textAnchor="middle" fontSize={18} fontWeight={600} fill={color}>
            {signo > 0 ? "+" : "−"}
          </text>;
        })}
      </g>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#060c1a]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-5 py-4">
        <div><h2 className="text-sm font-semibold text-white">Capacitor de placas paralelas</h2><p className="mt-1 text-xs text-slate-500">Arrastra los controles de área y separación, o usa el panel.</p></div>
        <span className={`rounded-full border px-3 py-1.5 text-[11px] ${estado.bateriaConectada ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
          {estado.bateriaConectada ? "Batería conectada · V constante" : "Capacitor aislado · Q constante"}
        </span>
      </div>
      <div className="overflow-x-auto bg-[radial-gradient(ellipse_at_center,#0b2234_0%,#060c1a_70%)]">
        <svg ref={svg} viewBox="0 0 840 520" className="mx-auto block w-full min-w-[620px] max-w-[1040px]"
          aria-labelledby={`${id}-titulo ${id}-descripcion`} role="group"
          data-polaridad-superior={resultado.carga > 0 ? "positiva" : resultado.carga < 0 ? "negativa" : "neutra"}>
          <title id={`${id}-titulo`}>Simulación 2D de un capacitor conectado a una batería</title>
          <desc id={`${id}-descripcion`}>Placas semitransparentes con cargas en sus superficies enfrentadas. Campo uniforme, {formatearSI(Math.abs(resultado.campo), "V/m")}. Voltaje del capacitor: {formatearSI(resultado.voltaje, "V")}. Dos controles permiten arrastrar el área y la separación.</desc>
          <defs>
            <pattern id={`${id}-rejilla`} width={24} height={24} patternUnits="userSpaceOnUse"><path d="M 24 0 H 0 V 24" fill="none" stroke="#35c4df" strokeOpacity={0.045} /></pattern>
            <pattern id={`${id}-material`} width={12} height={12} patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke={material.color} strokeOpacity={0.25} strokeWidth={1} /></pattern>
            <linearGradient id={`${id}-bateria`} x1="0" x2="1"><stop offset="0" stopColor="#12263c" /><stop offset="0.5" stopColor="#33516a" /><stop offset="1" stopColor="#15283b" /></linearGradient>
            <marker id={`${id}-flecha`} viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto"><path d="M0 0L10 5L0 10Z" fill="#8cefff" /></marker>
            <marker id={`${id}-medida`} viewBox="0 0 10 10" refX={5} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#94a3b8" /></marker>
          </defs>
          <rect width={840} height={520} fill={`url(#${id}-rejilla)`} />
          <text x={32} y={34} fontSize={11} letterSpacing={3} fill="#627b94">LABORATORIO / CAPACITANCIA</text>
          <text x={808} y={34} textAnchor="end" fontSize={11} fill="#627b94">VISTA 2D · PERSPECTIVA ILUSTRATIVA</text>

          {/* Ambos cables se abren para aislar idealmente el capacitor. */}
          <g fill="none" stroke={cable} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
            <path d={`M115 250V85H230 M270 85H${conexionSuperior}V${superior - profundidad}`} />
            <path d={`M115 371V465H230 M270 465H${conexionInferior}V${inferior + 7}`} />
            {[85, 465].map((y) => <g key={y}><circle cx={230} cy={y} r={3} /><circle cx={270} cy={y} r={3} />
              <path d={`M230 ${y}L270 ${estado.bateriaConectada ? y : y - 20}`} /></g>)}
          </g>
          {!estado.bateriaConectada && <text x={245} y={125} textAnchor="middle" fontSize={12} fill="#fbbf24">circuito abierto</text>}

          {/* Batería: el signo indicado pertenece a la fuente, incluso aislada. */}
          <g>
            <rect x={75} y={261} width={80} height={105} fill={`url(#${id}-bateria)`} stroke="#516f89" strokeWidth={1.5} />
            <path d="M75 280V261C75 245 155 245 155 261V280Z" fill="#d8993b" stroke="#f2bb63" />
            <ellipse cx={115} cy={366} rx={40} ry={10} fill="#142538" stroke="#516f89" />
            <rect x={106} y={246} width={18} height={12} rx={3} fill="#aac6d7" />
            <text x={115} y={278} textAnchor="middle" fontSize={19} fontWeight={600} fill="#271c0d">{estado.voltajeBateria === 0 ? "0" : estado.voltajeBateria > 0 ? "+" : "−"}</text>
            <text x={115} y={313} textAnchor="middle" fontSize={17} fontWeight={600} fill="#eefaff">{estado.voltajeBateria.toFixed(1)} V</text>
            <text x={115} y={345} textAnchor="middle" fontSize={19} fill="#b7d4e4">{estado.voltajeBateria === 0 ? "0" : estado.voltajeBateria > 0 ? "−" : "+"}</text>
            <text x={115} y={403} textAnchor="middle" fontSize={13} fill="#94a3b8">BATERÍA</text>
          </g>

          {/* Volumen dieléctrico, sin dipolos ni efectos de borde inventados. */}
          {material.id !== "vacio" && <g data-dielectrico={material.id}>
            <polygon points={`${izquierda + 8},${superior + 10} ${izquierda + ancho - 8},${superior + 10} ${izquierda + ancho - 8},${inferior - 3} ${izquierda + 8},${inferior - 3}`}
              fill={material.color} fillOpacity={material.id === "aire" ? 0.035 : 0.11} stroke={material.color} strokeOpacity={0.22} />
            <polygon points={`${izquierda + ancho - 8},${superior + 10} ${izquierda + ancho + perspectiva - 8},${superior - profundidad + 10} ${izquierda + ancho + perspectiva - 8},${inferior - profundidad - 3} ${izquierda + ancho - 8},${inferior - 3}`}
              fill={`url(#${id}-material)`} stroke={material.color} strokeOpacity={0.25} />
          </g>}

          {/* E uniforme: todas las líneas son paralelas y apuntan según V. */}
          {resultado.campo !== 0 && <g data-direccion={resultado.campo > 0 ? "superior-inferior" : "inferior-superior"}
            stroke="#8cefff" strokeWidth={1.2 + intensidad} opacity={0.35 + 0.55 * intensidad}>
            {[0.25, 0.7].flatMap((t, fila) => Array.from({ length: columnasCampo }, (_, columna) => {
              const x = izquierda + ancho * ((columna + 1) / (columnasCampo + 1)) + perspectiva * t;
              const arriba = superior + 22 - profundidad * t;
              const abajo = inferior - 17 - profundidad * t;
              return <line key={`${fila}-${columna}`} data-linea-campo="true" x1={x} x2={x}
                y1={resultado.campo > 0 ? arriba : abajo} y2={resultado.campo > 0 ? abajo : arriba}
                markerEnd={`url(#${id}-flecha)`} />;
            }))}
          </g>}
          {placa(inferior, colorInferior, -resultado.carga)}
          {placa(superior, colorSuperior, resultado.carga)}
          <text x={izquierda - 24} y={superior + 5} textAnchor="end" fontSize={22} fill={colorSuperior}>{resultado.carga === 0 ? "0" : resultado.carga > 0 ? "+" : "−"}</text>
          <text x={izquierda - 24} y={inferior + 5} textAnchor="end" fontSize={22} fill={colorInferior}>{resultado.carga === 0 ? "0" : resultado.carga < 0 ? "+" : "−"}</text>

          {/* Separación: control directo accesible con puntero y teclado. */}
          <path d={`M${izquierda + ancho + perspectiva + 10} ${superior + 7}H730 M${izquierda + ancho + perspectiva + 10} ${inferior}H730`}
            stroke="#64748b" strokeDasharray="3 5" opacity={0.6} />
          <line x1={720} x2={720} y1={superior + 7} y2={inferior} stroke="#94a3b8" markerStart={`url(#${id}-medida)`} markerEnd={`url(#${id}-medida)`} />
          <text x={740} y={250} fontSize={14} fill="#cbd5e1">d</text>
          <text x={740} y={270} fontSize={14} fill="#67e8f9">{(estado.separacion * 1e3).toFixed(1)} mm</text>
          <g role="slider" tabIndex={0} aria-label="Arrastrar separación" aria-valuemin={1} aria-valuemax={10}
            aria-valuenow={estado.separacion * 1e3} aria-valuetext={`${(estado.separacion * 1e3).toFixed(1)} milímetros`}
            style={{ touchAction: "none", cursor: "ns-resize" }} className="outline-none focus:opacity-70"
            onPointerDown={(e) => iniciar("separacion", e)} onPointerMove={mover} onPointerUp={terminar}
            onPointerCancel={terminar} onLostPointerCapture={() => { arrastre.current = null; }} onKeyDown={(e) => teclado("separacion", e)}>
            <circle cx={720} cy={inferior} r={20} fill="transparent" /><circle cx={720} cy={inferior} r={9} fill="#0c2837" stroke="#67e8f9" strokeWidth={2} />
            <path d={`M717 ${inferior - 3}L720 ${inferior - 6}L723 ${inferior - 3} M717 ${inferior + 3}L720 ${inferior + 6}L723 ${inferior + 3}`} fill="none" stroke="#67e8f9" />
          </g>

          {/* Área: medida ilustrativa sobre una superficie, nunca una longitud. */}
          <line x1={izquierda - 18} y1={inferior + 26} x2={izquierda + perspectiva - 18} y2={inferior - profundidad + 26}
            stroke="#94a3b8" markerStart={`url(#${id}-medida)`} markerEnd={`url(#${id}-medida)`} />
          <text x={izquierda - 18} y={inferior + 52} fontSize={14} fill="#cbd5e1">A = {(estado.area * 1e6).toFixed(1)} mm²</text>
          <g role="slider" tabIndex={0} aria-label="Arrastrar área de las placas" aria-valuemin={20} aria-valuemax={400}
            aria-valuenow={estado.area * 1e6} aria-valuetext={`${(estado.area * 1e6).toFixed(1)} milímetros cuadrados`}
            style={{ touchAction: "none", cursor: "ew-resize" }} className="outline-none focus:opacity-70"
            onPointerDown={(e) => iniciar("area", e)} onPointerMove={mover} onPointerUp={terminar}
            onPointerCancel={terminar} onLostPointerCapture={() => { arrastre.current = null; }} onKeyDown={(e) => teclado("area", e)}>
            <circle cx={izquierda + ancho + perspectiva} cy={inferior - profundidad} r={20} fill="transparent" />
            <circle cx={izquierda + ancho + perspectiva} cy={inferior - profundidad} r={9} fill="#0c2837" stroke="#34d399" strokeWidth={2} />
            <path d={`M${izquierda + ancho + perspectiva - 4} ${inferior - profundidad}h8`} stroke="#34d399" strokeWidth={2} />
          </g>
          <text x={808} y={500} textAnchor="end" fontSize={12} fill={material.color}>{material.nombre} · εr = {material.permitividadRelativa}</text>
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/5 px-5 py-3 text-[11px] text-slate-500">
        <span><span className="text-rose-400">+ </span>carga positiva</span><span><span className="text-cyan-300">− </span>carga negativa</span>
        <span>Los símbolos no representan un número real de electrones.</span>
        <span className="sm:hidden">Desliza la escena para ver las medidas.</span>
      </div>
    </section>
  );
}
