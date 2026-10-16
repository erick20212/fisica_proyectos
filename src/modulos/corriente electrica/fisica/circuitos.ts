import type { Circuito, ResultadoCircuito, ResultadoElemento } from '../tipos';

/** Red resistiva ideal de dos terminales, sin transitorios. Unidades SI. */
export function resistenciaEquivalente(circuito: Circuito): number {
  if (circuito.tipo === 'resistencia') {
    if (!Number.isFinite(circuito.ohmios) || circuito.ohmios <= 0) {
      throw new Error('La resistencia debe ser finita y mayor que cero.');
    }
    return circuito.ohmios;
  }
  if (circuito.elementos.length < 1) throw new Error('Una conexión necesita al menos un elemento.');
  const valores = circuito.elementos.map(resistenciaEquivalente);
  const resistencia = circuito.tipo === 'serie'
    ? valores.reduce((suma, r) => suma + r, 0)
    : 1 / valores.reduce((suma, r) => suma + 1 / r, 0);
  if (!Number.isFinite(resistencia) || resistencia <= 0) throw new Error('Red fuera del rango numérico.');
  return resistencia;
}

export function calcularOhm(voltaje: number, resistencia: number): Omit<ResultadoElemento, 'id'> {
  if (!Number.isFinite(voltaje) || !Number.isFinite(resistencia) || resistencia <= 0) {
    throw new Error('Se requiere un voltaje finito y una resistencia positiva.');
  }
  const corriente = voltaje / resistencia;
  const potencia = voltaje * corriente;
  if (![corriente, potencia].every(Number.isFinite)) throw new Error('Resultado fuera del rango numérico.');
  return { resistencia, voltaje, corriente, potencia };
}

export function resolverCircuito(circuito: Circuito, voltaje: number): ResultadoCircuito {
  const elementos: ResultadoElemento[] = [];
  const visitar = (nodo: Circuito, tension: number): ResultadoElemento => {
    const resultado = { id: nodo.id, ...calcularOhm(tension, resistenciaEquivalente(nodo)) };
    elementos.push(resultado);
    if (nodo.tipo !== 'resistencia') {
      for (const hijo of nodo.elementos) {
        visitar(hijo, nodo.tipo === 'paralelo' ? tension : resultado.corriente * resistenciaEquivalente(hijo));
      }
    }
    return resultado;
  };
  return { ...visitar(circuito, voltaje), elementos };
}

export function crearEjemplo(tipo: 'serie' | 'paralelo' | 'mixto'): Circuito {
  const r = (id: string, ohmios: number): Circuito => ({ id, tipo: 'resistencia', ohmios });
  if (tipo === 'mixto') return { id: 'red', tipo: 'serie', elementos: [r('R1', 100),
    { id: 'grupo', tipo: 'paralelo', elementos: [r('R2', 200), r('R3', 300)] }] };
  return { id: 'red', tipo, elementos: [r('R1', 100), r('R2', 200), r('R3', 300)] };
}

export function actualizarNodo(red: Circuito, id: string, cambio: (nodo: Circuito) => Circuito): Circuito {
  if (red.id === id) return cambio(red);
  return red.tipo === 'resistencia' ? red : { ...red, elementos: red.elementos.map(n => actualizarNodo(n, id, cambio)) };
}

export function formato(valor: number): string {
  return new Intl.NumberFormat('es-PE', { maximumSignificantDigits: 5 }).format(valor);
}
