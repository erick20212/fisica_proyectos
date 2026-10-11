
import type {
  CargaElectrica,
  Vector3D,
} from "../tipos";

import { calcularPotencialElectrico } from "./potencialElectrico";
import { validarCargas } from "./campoElectrico";

/**
 * Segmento de una línea equipotencial 2D.
 */
export interface SegmentoEquipotencial {
  inicio: Vector3D;
  fin: Vector3D;
  potencial: number;
}

/**
 * Superficie triangular 3D.
 *
 * Cada grupo de tres vértices
 * representa un triángulo.
 */
export interface SuperficieEquipotencial {
  potencial: number;
  vertices: number[];
}

/**
 * Configuración del volumen de cálculo.
 * Las distancias se expresan en metros.
 */
export interface ConfiguracionEquipotenciales {
  limite: number;
  resolucion2D: number;
  resolucion3D: number;
  radioExclusion: number;
}

export const CONFIGURACION_EQUIPOTENCIALES:
  ConfiguracionEquipotenciales = {
    limite: 5,
    resolucion2D: 100,
    resolucion3D: 30,
    radioExclusion: 0.08,
  };

/**
 * Valida la configuración antes de calcular.
 */
function validarConfiguracion(
  configuracion: ConfiguracionEquipotenciales
): void {
  const {
    limite,
    resolucion2D,
    resolucion3D,
    radioExclusion,
  } = configuracion;

  if (
    !Number.isFinite(limite) ||
    limite <= 0 ||
    !Number.isInteger(resolucion2D) ||
    resolucion2D < 2 ||
    !Number.isInteger(resolucion3D) ||
    resolucion3D < 2 ||
    !Number.isFinite(radioExclusion) ||
    radioExclusion <= 0
  ) {
    throw new Error(
      "La configuración de equipotenciales no es válida."
    );
  }
}

/**
 * Evalúa el potencial excluyendo una pequeña
 * región próxima a cada carga puntual.
 *
 * Esto evita evaluar singularidades.
 */
function evaluarPotencial(
  punto: Vector3D,
  cargas: CargaElectrica[],
  radioExclusion: number
): number {
  for (const carga of cargas) {
    if (carga.valor === 0) continue;

    const dx = punto.x - carga.posicion.x;
    const dy = punto.y - carga.posicion.y;
    const dz = punto.z - carga.posicion.z;

    if (
      Math.hypot(dx, dy, dz) < radioExclusion
    ) {
      return NaN;
    }
  }

  return calcularPotencialElectrico(punto, cargas);
}

/**
 * Interpola la posición donde el potencial
 * alcanza un valor determinado entre
 * dos vértices de una celda.
 */
function interpolar(
  a: Vector3D,
  b: Vector3D,
  va: number,
  vb: number,
  nivel: number
): Vector3D {
  const diferencia = vb - va;

  const t =
    Math.abs(diferencia) < 1e-15
      ? 0.5
      : Math.max(
          0,
          Math.min(1, (nivel - va) / diferencia)
        );

  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: a.z + t * (b.z - a.z),
  };
}

// =======================================
// EQUIPOTENCIALES EN 2D
// =======================================

/**
 * Calcula segmentos equipotenciales
 * sobre el plano XY, con z = 0.
 *
 * Algoritmo: Marching Squares.
 */
export function generarEquipotenciales2D(
  cargas: CargaElectrica[],
  niveles: number[],
  configuracion: ConfiguracionEquipotenciales =
    CONFIGURACION_EQUIPOTENCIALES
): SegmentoEquipotencial[] {
  validarCargas(cargas);
  validarConfiguracion(configuracion);

  const { limite, resolucion2D, radioExclusion } =
    configuracion;

  const segmentos: SegmentoEquipotencial[] = [];
  const n = resolucion2D;
  const paso = (2 * limite) / n;

  const puntos: Vector3D[][] = [];
  const valores: number[][] = [];

  // Evaluar el potencial en la cuadrícula.
  for (let i = 0; i <= n; i++) {
    puntos[i] = [];
    valores[i] = [];

    for (let j = 0; j <= n; j++) {
      const punto: Vector3D = {
        x: -limite + i * paso,
        y: -limite + j * paso,
        z: 0,
      };

      puntos[i][j] = punto;

      valores[i][j] = evaluarPotencial(
        punto,
        cargas,
        radioExclusion
      );
    }
  }

  // Aristas: inferior, derecha,
  // superior e izquierda.
  const aristas: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];

  for (const nivel of niveles) {
    if (!Number.isFinite(nivel)) {
      throw new Error(
        "Los niveles de potencial deben ser finitos."
      );
    }

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const p = [
          puntos[i][j],
          puntos[i + 1][j],
          puntos[i + 1][j + 1],
          puntos[i][j + 1],
        ];

        const v = [
          valores[i][j],
          valores[i + 1][j],
          valores[i + 1][j + 1],
          valores[i][j + 1],
        ];

        // No generar segmentos sobre celdas
        // que intersectan la zona excluida.
        if (v.some((valor) => !Number.isFinite(valor))) {
          continue;
        }

        const cruces: Vector3D[] = [];

        for (const [a, b] of aristas) {
          const cruza =
            (v[a] < nivel && v[b] >= nivel) ||
            (v[b] < nivel && v[a] >= nivel);

          if (cruza) {
            cruces.push(
              interpolar(
                p[a],
                p[b],
                v[a],
                v[b],
                nivel
              )
            );
          }
        }

        if (cruces.length === 2) {
          segmentos.push({
            inicio: cruces[0],
            fin: cruces[1],
            potencial: nivel,
          });
        }

        // Caso ambiguo de cuatro cruces.
        // Se decide según el potencial
        // interpolado en el centro.
        if (cruces.length === 4) {
          const valorCentro =
            (v[0] + v[1] + v[2] + v[3]) / 4;

          const pares =
            (v[0] >= nivel) ===
            (valorCentro >= nivel)
              ? [[0, 1], [2, 3]]
              : [[0, 3], [1, 2]];

          for (const [a, b] of pares) {
            segmentos.push({
              inicio: cruces[a],
              fin: cruces[b],
              potencial: nivel,
            });
          }
        }
      }
    }
  }

  return segmentos;
}

// =======================================
// EQUIPOTENCIALES EN 3D
// =======================================

/**
 * Descomposición de un cubo
 * en seis tetraedros.
 */
const TETRAEDROS: number[][] = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
];

const ARISTAS_TETRAEDRO: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];

/**
 * Extrae los triángulos de una isosuperficie
 * dentro de un tetraedro.
 */
function procesarTetraedro(
  puntos: Vector3D[],
  valores: number[],
  nivel: number,
  destino: number[]
): void {
  const cruces: Vector3D[] = [];

  for (const [a, b] of ARISTAS_TETRAEDRO) {
    const cruza =
      (valores[a] < nivel && valores[b] >= nivel) ||
      (valores[b] < nivel && valores[a] >= nivel);

    if (cruza) {
      cruces.push(
        interpolar(
          puntos[a],
          puntos[b],
          valores[a],
          valores[b],
          nivel
        )
      );
    }
  }

  function agregarTriangulo(
    a: Vector3D,
    b: Vector3D,
    c: Vector3D
  ) {
    destino.push(
      a.x, a.y, a.z,
      b.x, b.y, b.z,
      c.x, c.y, c.z
    );
  }

  if (cruces.length === 3) {
    agregarTriangulo(
      cruces[0],
      cruces[1],
      cruces[2]
    );
  } else if (cruces.length === 4) {
    agregarTriangulo(
      cruces[0],
      cruces[1],
      cruces[2]
    );

    agregarTriangulo(
      cruces[0],
      cruces[2],
      cruces[3]
    );
  }
}

/**
 * Genera superficies de potencial constante
 * mediante una cuadrícula 3D y tetraedros.
 *
 * Devuelve geometría triangular para Three.js.
 */
export function generarEquipotenciales3D(
  cargas: CargaElectrica[],
  niveles: number[],
  configuracion: ConfiguracionEquipotenciales =
    CONFIGURACION_EQUIPOTENCIALES
): SuperficieEquipotencial[] {
  validarCargas(cargas);
  validarConfiguracion(configuracion);

  const {
    limite,
    resolucion3D,
    radioExclusion,
  } = configuracion;

  const n = resolucion3D;
  const paso = (2 * limite) / n;
  const lado = n + 1;

  const totalPuntos = lado ** 3;
  const valores = new Float64Array(totalPuntos);

  const indice = (i: number, j: number, k: number) =>
    i * lado * lado + j * lado + k;

  // Evaluar el potencial una sola vez.
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      for (let k = 0; k <= n; k++) {
        const punto: Vector3D = {
          x: -limite + i * paso,
          y: -limite + j * paso,
          z: -limite + k * paso,
        };

        valores[indice(i, j, k)] =
          evaluarPotencial(
            punto,
            cargas,
            radioExclusion
          );
      }
    }
  }

  const desplazamientos: [number, number, number][] = [
    [0, 0, 0],
    [1, 0, 0],
    [1, 1, 0],
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
  ];

  const superficies: SuperficieEquipotencial[] = [];

  for (const nivel of niveles) {
    if (!Number.isFinite(nivel)) {
      throw new Error(
        "Los niveles de potencial deben ser finitos."
      );
    }

    const vertices: number[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        for (let k = 0; k < n; k++) {
          const puntosCubo: Vector3D[] = [];
          const valoresCubo: number[] = [];

          for (const [di, dj, dk] of desplazamientos) {
            const x = i + di;
            const y = j + dj;
            const z = k + dk;

            puntosCubo.push({
              x: -limite + x * paso,
              y: -limite + y * paso,
              z: -limite + z * paso,
            });

            valoresCubo.push(
              valores[indice(x, y, z)]
            );
          }

          if (
            valoresCubo.some(
              (valor) => !Number.isFinite(valor)
            )
          ) {
            continue;
          }

          const minimo = Math.min(...valoresCubo);
          const maximo = Math.max(...valoresCubo);

          if (nivel < minimo || nivel > maximo) {
            continue;
          }

          for (const tetraedro of TETRAEDROS) {
            procesarTetraedro(
              tetraedro.map(
                (indiceVertice) =>
                  puntosCubo[indiceVertice]
              ),
              tetraedro.map(
                (indiceVertice) =>
                  valoresCubo[indiceVertice]
              ),
              nivel,
              vertices
            );
          }
        }
      }
    }

    superficies.push({
      potencial: nivel,
      vertices,
    });
  }

  return superficies;
}
