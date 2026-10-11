export interface MaterialDielectrico {
  id: string;
  nombre: string;
  permitividadRelativa: number;
  color: string;
}

/** Estado en SI: área m², separación m, voltaje V y carga C. */
export interface EstadoSimulador {
  area: number;
  separacion: number;
  material: string;
  voltajeBateria: number;
  bateriaConectada: boolean;
  cargaAislada: number;
}

export interface ResultadoCapacitor {
  capacitancia: number;
  carga: number; // Carga libre de la placa superior; la inferior tiene -Q.
  voltaje: number; // V superior - V inferior.
  campo: number; // Componente de E desde la placa superior hacia la inferior.
  energia: number;
}

export type AccionSimulador =
  | { tipo: "area" | "separacion" | "voltaje"; valor: number }
  | { tipo: "material"; valor: string }
  | { tipo: "bateria" }
  | { tipo: "restablecer" };
