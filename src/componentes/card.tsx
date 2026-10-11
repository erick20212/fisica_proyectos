import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PropsCard {
  numero: number;
  titulo: string;
  descripcion: string;
  modulos: number;
  icono: LucideIcon;
  alAbrir: () => void;
}
export default function Card({
  numero,
  titulo,
  descripcion,
  modulos,
  icono: Icono,
  alAbrir,
}: PropsCard) {
  return (
    <button
      type="button"
      onClick={alAbrir}
      className="
        group relative w-full overflow-hidden
        rounded-2xl border border-cyan-400/15
        bg-[#0c1224] p-5 text-left
        transition-all duration-300
        hover:-translate-y-1
        hover:border-cyan-400/60
        hover:shadow-[0_0_35px_rgba(34,211,238,0.12)]
      "
    >
      {/* Imagen visual futurista */}
      <div
        className="
          relative mb-6 flex h-44 items-center
          justify-center overflow-hidden
          rounded-xl
          bg-gradient-to-br
          from-[#10233c] via-[#10132c] to-[#26113d]
        "
      >
        {/* Anillos decorativos */}
        <div className="absolute h-36 w-36 rounded-full border border-cyan-400/20" />

        <div className="absolute h-28 w-28 rotate-45 rounded-full border border-purple-400/30" />

        <div className="absolute h-20 w-20 -rotate-45 rounded-full border border-cyan-300/40" />

        {/* Icono de la unidad */}
        <Icono
          size={54}
          strokeWidth={1.2}
          className="
            relative z-10 text-cyan-300
            drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]
            transition-transform duration-300
            group-hover:scale-110
          "
        />

        {/* Efecto luminoso al pasar el mouse */}
        <div
          className="
            absolute inset-0 bg-cyan-400/0
            transition-colors duration-300
            group-hover:bg-cyan-400/5
          "
        />
      </div>

      {/* Número de unidad */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.2em] text-cyan-400">
          UNIDAD {String(numero).padStart(2, "0")}
        </span>

        <ArrowUpRight
          size={18}
          className="
            text-slate-500 transition-all duration-300
            group-hover:-translate-y-1
            group-hover:translate-x-1
            group-hover:text-cyan-300
          "
        />
      </div>

      {/* Título */}
      <h3 className="mb-3 min-h-14 text-lg font-semibold leading-snug text-white">
        {titulo}
      </h3>

      {/* Descripción */}
      <p className="mb-6 min-h-20 text-sm leading-6 text-slate-400">
        {descripcion}
      </p>

      {/* Información inferior */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-xs text-slate-400">
          {modulos} módulos
        </span>

        <span className="text-xs font-medium text-cyan-300">
          Explorar unidad →
        </span>
      </div>
    </button>
  );
}
