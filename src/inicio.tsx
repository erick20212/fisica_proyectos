
import { BatteryCharging, CircuitBoard, Zap } from "lucide-react";
import Card from "./componentes/card";


interface Propiedades {
  alSeleccionarUnidad: (id: string) => void;
}

const unidades = [
  {
    id: "electromagnetismo",
    numero: 1,
    titulo: "Electricidad, Campo Eléctrico y Potencial Eléctrico",
    descripcion:
      "Explora cargas puntuales, campos eléctricos, superficies equipotenciales y trayectorias de partículas mediante simulaciones 3D.",
    modulos: 3,
    icono: Zap,
  },
  {
    id: "capacitorores",
    numero: 2,
    titulo: "Capacitores y almacenamiento de energía",
    descripcion: "Experimenta con un capacitor de placas paralelas: modifica su geometría, dieléctrico y batería y observa sus propiedades eléctricas en 2D.",
    modulos: 1,
    icono: BatteryCharging,
  },
  {
    id: "corriente-electrica",
    numero: 3,
    titulo: "Corriente eléctrica",
    descripcion: "Arma circuitos con resistencias en serie, paralelo y mixto. Calcula corriente, voltaje y potencia y explora la ley de Ohm en tiempo real.",
    modulos: 2,
    icono: CircuitBoard,
  },
];

export default function Inicio({
  alSeleccionarUnidad,
}: Propiedades) {
  return (
    <main className="relative h-full overflow-y-auto bg-[#050713] text-white">

      {/* Iluminación ambiental */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[600px] max-w-full -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-14">

        {/* Presentación */}
        <section className="mb-12">
          <p className="mb-4 text-xs font-semibold tracking-[0.25em] text-cyan-400">
            LABORATORIO VIRTUAL DE FÍSICA
          </p>
        </section>

        {/* Tarjetas de las unidades */}
        <section>
          <h2 className="mb-6 text-xl font-semibold">
            Unidades disponibles
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {unidades.map((unidad) => (
              <Card
                key={unidad.id}
                numero={unidad.numero}
                titulo={unidad.titulo}
                descripcion={unidad.descripcion}
                modulos={unidad.modulos}
                icono={unidad.icono}
                alAbrir={() => alSeleccionarUnidad(unidad.id)}
              />
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
