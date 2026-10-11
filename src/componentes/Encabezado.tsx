import { Atom, Activity } from "lucide-react";

export default function Encabezado() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-cyan-400/15 bg-[#070b17] px-6">
      <div className="flex items-center gap-3">
        <Atom className="text-cyan-400" size={28} />

        <div>
          <h1 className="text-sm font-bold tracking-[0.15em] text-white">
            NEXUS PHYSICS
          </h1>
          <p className="text-[10px] tracking-widest text-cyan-400/70">
            LABORATORIO VIRTUAL 3D
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <Activity size={15} />
        <span className="hidden sm:inline">
          SISTEMA ACTIVO
        </span>
      </div>
    </header>
  );
}