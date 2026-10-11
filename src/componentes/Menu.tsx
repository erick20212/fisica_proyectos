import { Zap } from "lucide-react";

export default function Menu() {
  return (
    <nav className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-[#090d1b] px-5">
      <div className="flex items-center gap-2 rounded-md border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-300">
        <Zap size={14} />
        Electromagnetismo
      </div>
    </nav>
  );
}