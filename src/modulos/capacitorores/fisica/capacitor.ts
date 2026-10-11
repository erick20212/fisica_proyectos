import type { AccionSimulador, EstadoSimulador, MaterialDielectrico, ResultadoCapacitor } from "../tipos";

export const PERMITIVIDAD_VACIO = 8.8541878128e-12; // F/m

// Valores educativos de referencia a temperatura ambiente (OpenStax, tabla 18.1).
// https://openstax.org/books/physics/pages/18-5-capacitors-and-dielectrics
export const MATERIALES: MaterialDielectrico[] = [
  { id: "vacio", nombre: "Vacío", permitividadRelativa: 1, color: "#64748b" },
  { id: "aire", nombre: "Aire", permitividadRelativa: 1.00059, color: "#38bdf8" },
  { id: "ptfe", nombre: "PTFE (teflón)", permitividadRelativa: 2.1, color: "#a78bfa" },
  { id: "papel", nombre: "Papel", permitividadRelativa: 3.7, color: "#fbbf24" },
  { id: "vidrio", nombre: "Vidrio (Pyrex)", permitividadRelativa: 5.6, color: "#34d399" },
];

export const LIMITES = {
  area: { minimo: 20e-6, maximo: 400e-6 },
  separacion: { minimo: 1e-3, maximo: 10e-3 },
  voltaje: { minimo: -12, maximo: 12 },
} as const;

export const ESTADO_INICIAL: EstadoSimulador = {
  area: 100e-6,
  separacion: 5e-3,
  material: "vacio",
  voltajeBateria: 1.5,
  bateriaConectada: true,
  cargaAislada: 0,
};

export function obtenerMaterial(id: string): MaterialDielectrico {
  const material = MATERIALES.find((m) => m.id === id);
  if (!material) throw new Error("Material dieléctrico desconocido.");
  return material;
}

export function calcularCapacitancia(area: number, separacion: number, permitividadRelativa: number): number {
  if (![area, separacion, permitividadRelativa].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("Área, separación y permitividad deben ser finitas y positivas.");
  }
  const capacitancia = PERMITIVIDAD_VACIO * permitividadRelativa * area / separacion;
  if (!Number.isFinite(capacitancia) || capacitancia <= 0) throw new Error("Capacitancia fuera del rango numérico.");
  return capacitancia;
}

export function calcularEstadoCapacitor(estado: EstadoSimulador): ResultadoCapacitor {
  if (!Number.isFinite(estado.voltajeBateria) || !Number.isFinite(estado.cargaAislada)) {
    throw new Error("Voltaje y carga deben ser finitos.");
  }
  const capacitancia = calcularCapacitancia(estado.area, estado.separacion,
    obtenerMaterial(estado.material).permitividadRelativa);
  const carga = estado.bateriaConectada ? capacitancia * estado.voltajeBateria : estado.cargaAislada;
  const voltaje = estado.bateriaConectada ? estado.voltajeBateria : carga / capacitancia;
  const campo = voltaje / estado.separacion;
  const energia = estado.bateriaConectada ? 0.5 * capacitancia * voltaje ** 2 : carga ** 2 / (2 * capacitancia);
  if (![carga, voltaje, campo, energia].every(Number.isFinite)) throw new Error("Resultado eléctrico no finito.");
  return { capacitancia, carga, voltaje, campo, energia };
}

/** Conmutación ideal, sin corrientes transitorias ni descarga artificial. */
export function actualizarSimulador(estado: EstadoSimulador, accion: AccionSimulador): EstadoSimulador {
  switch (accion.tipo) {
    case "restablecer": return { ...ESTADO_INICIAL };
    case "bateria": return estado.bateriaConectada
      ? { ...estado, bateriaConectada: false, cargaAislada: calcularEstadoCapacitor(estado).carga }
      : { ...estado, bateriaConectada: true };
    case "material":
      return MATERIALES.some((m) => m.id === accion.valor) ? { ...estado, material: accion.valor } : estado;
    case "area":
    case "separacion":
    case "voltaje": {
      const limite = LIMITES[accion.tipo];
      if (!Number.isFinite(accion.valor) || accion.valor < limite.minimo || accion.valor > limite.maximo) return estado;
      const campo = accion.tipo === "voltaje" ? "voltajeBateria" : accion.tipo;
      return { ...estado, [campo]: accion.valor };
    }
  }
}

export function formatearSI(valor: number, unidad: string): string {
  if (valor === 0) return `0 ${unidad}`;
  const prefijos = [
    { escala: 1e9, prefijo: "G" }, { escala: 1e6, prefijo: "M" },
    { escala: 1e3, prefijo: "k" }, { escala: 1, prefijo: "" },
    { escala: 1e-3, prefijo: "m" }, { escala: 1e-6, prefijo: "µ" },
    { escala: 1e-9, prefijo: "n" }, { escala: 1e-12, prefijo: "p" },
    { escala: 1e-15, prefijo: "f" },
  ];
  const elegido = prefijos.find((p) => Math.abs(valor) >= p.escala);
  if (!elegido) return `${valor.toExponential(3)} ${unidad}`;
  return `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(valor / elegido.escala)} ${elegido.prefijo}${unidad}`;
}
