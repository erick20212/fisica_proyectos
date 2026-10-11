
/**
 * Vector o posición en un espacio tridimensional.
 *
 * Posiciones: metros (m).
 * Velocidades: metros por segundo (m/s).
 * Campos eléctricos: newtons por coulomb (N/C).
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Carga eléctrica puntual.
 *
 * valor: carga en coulombs (C).
 * posicion: coordenadas en metros (m).
 */
export interface CargaElectrica {
  id: string;
  valor: number;
  posicion: Vector3D;
}

/**
 * Partícula cargada que puede moverse
 * bajo la influencia de campos eléctricos.
 */
export interface Particula {
  id: string;
  carga: number;
  masa: number;
  posicion: Vector3D;
  velocidad: Vector3D;
}

/**
 * Punto donde se consultan las magnitudes
 * del campo eléctrico y del potencial.
 */
export interface PuntoConsulta {
  posicion: Vector3D;
}

/**
 * Módulos de la Unidad 1.
 */
export type ModuloElectromagnetismo =
  | "cargas"
  | "potencial"
  | "trayectoria";

/**
 * Modos de visualización.
 */
export type ModoVisualizacion = "2D" | "3D";

/**
 * Configuración de las visualizaciones.
 */
export interface ConfiguracionSimulacion {
  modulo: ModuloElectromagnetismo;
  modo: ModoVisualizacion;

  mostrarCargas: boolean;
  mostrarLineasCampo: boolean;
  mostrarEquipotenciales: boolean;
  mostrarCuadricula: boolean;
}

/**
 * Resultado de una consulta del campo eléctrico.
 */
export interface ResultadoCampoElectrico {
  posicion: Vector3D;
  campo: Vector3D;
  magnitud: number;
}

/**
 * Resultado de una consulta del potencial eléctrico.
 */
export interface ResultadoPotencial {
  posicion: Vector3D;
  potencial: number;
}

/**
 * Estado de ejecución de una trayectoria.
 */
export type EstadoTrayectoria =
  | "detenida"
  | "ejecutando"
  | "pausada"
  | "finalizada";
