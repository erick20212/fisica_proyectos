export type Circuito =
  | { id: string; tipo: 'resistencia'; ohmios: number }
  | { id: string; tipo: 'serie' | 'paralelo'; elementos: Circuito[] };

export interface ResultadoElemento {
  id: string;
  resistencia: number;
  voltaje: number;
  corriente: number;
  potencia: number;
}

export interface ResultadoCircuito extends ResultadoElemento {
  elementos: ResultadoElemento[];
}

export type TipoComponente = 'bateria' | 'fuente' | 'pila' | 'resistencia' | 'variable' | 'potenciometro'
  | 'bombilla' | 'interruptor' | 'pulsador' | 'amperimetro' | 'voltimetro' | 'multimetro' | 'nodo' | 'tierra';
export interface Componente {
  id: string;
  tipo: TipoComponente;
  nombre: string;
  x: number;
  y: number;
  rotacion: number;
  valor: number;
  interna: number;
  cerrado: boolean;
  fraccion: number;
  modo: 'V' | 'A';
}
export interface Terminal { componente: string; puerto: number }
export interface Cable { id: string; a: Terminal; b: Terminal }
export interface Laboratorio { componentes: Componente[]; cables: Cable[] }
export interface Lectura {
  voltaje: number | null;
  corriente: number | null;
  potencia: number | null;
  estado: string;
}
export interface SolucionRed {
  componentes: Record<string, Lectura>;
  cables: Record<string, number>;
  potenciales: Record<string, number>;
  avisos: string[];
  error: string | null;
  potencia: number;
  potenciaFuentes: number;
  potenciaCables: number;
  equivalente: number | null;
  corrienteFuente: number | null;
  errorKirchhoff: number;
  islas: number;
}
