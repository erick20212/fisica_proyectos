
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import Encabezado from "./componentes/Encabezado";
import Menu from "./componentes/Menu";

import Electromagnetismo from "./modulos/electromagnetismo/Electromagnetismo";
import Capacitorores from "./modulos/capacitorores/Capacitorores";
import Inicio from "./inicio";

export default function App() {
  const [unidadActual, setUnidadActual] = useState<string | null>(
    null
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#03040e] text-white">
      <Encabezado />

      <Menu />

      {unidadActual !== null && (
        <div className="border-b border-white/10 bg-[#090d1b] px-6 py-3">
          <button
            type="button"
            onClick={() => setUnidadActual(null)}
            className="flex items-center gap-2 text-sm text-cyan-300 hover:text-white"
          >
            <ArrowLeft size={17} />
            Volver al inicio
          </button>
        </div>
      )}

      <main className="min-h-0 flex-1">
        {unidadActual === null && (
          <Inicio alSeleccionarUnidad={setUnidadActual} />
        )}

        {unidadActual === "electromagnetismo" && (
          <Electromagnetismo />
        )}
        {unidadActual === "capacitorores" && <Capacitorores />}
      </main>
    </div>
  );
}
