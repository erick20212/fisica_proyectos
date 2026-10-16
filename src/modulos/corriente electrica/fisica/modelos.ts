import type { Componente, Laboratorio, Terminal, TipoComponente } from '../tipos';

export const NOMBRES: Record<TipoComponente, string> = {
  bateria: 'Batería', fuente: 'Fuente DC', pila: 'Pila', resistencia: 'Resistencia', variable: 'Reóstato',
  potenciometro: 'Potenciómetro', bombilla: 'Bombilla', interruptor: 'Interruptor', pulsador: 'Pulsador',
  amperimetro: 'Amperímetro', voltimetro: 'Voltímetro', multimetro: 'Multímetro', nodo: 'Unión', tierra: 'Tierra',
};
export const esFuente = (c: Componente) => ['bateria', 'fuente', 'pila'].includes(c.tipo);
export const esVoltimetro = (c: Componente) => c.tipo === 'voltimetro' || (c.tipo === 'multimetro' && c.modo === 'V');
export const numeroPuertos = (c: Componente) => ['nodo', 'tierra'].includes(c.tipo) ? 1 : c.tipo === 'potenciometro' ? 3 : 2;
export const clave = (t: Terminal) => `${t.componente}:${t.puerto}`;
export function posicionTerminal(c: Componente, puerto: number) {
  const dx = numeroPuertos(c) === 1 ? 0 : puerto === 0 ? -55 : puerto === 1 ? 55 : 0;
  const dy = puerto === 2 ? 43 : 0;
  const angulo = c.rotacion * Math.PI / 180;
  return { x: c.x + dx * Math.cos(angulo) - dy * Math.sin(angulo), y: c.y + dx * Math.sin(angulo) + dy * Math.cos(angulo) };
}
export function crearComponente(tipo: TipoComponente, x: number, y: number): Componente {
  return { id: crypto.randomUUID(), tipo, nombre: NOMBRES[tipo], x, y, rotacion: 0,
    valor: tipo === 'pila' ? 1.5 : ['bateria','fuente'].includes(tipo) ? 12 : tipo === 'bombilla' ? 24 : 100,
    interna: 0.1, cerrado: tipo !== 'pulsador', fraccion: 0.5, modo: 'V' };
}

/** Validación compartida para archivos importados y motor. No se aceptan referencias colgantes. */
export function validarLaboratorio(red: Laboratorio): void {
  if (!red || !Array.isArray(red.componentes) || !Array.isArray(red.cables) || red.componentes.length > 80 || red.cables.length > 160)
    throw new Error('Circuito inválido: máximo 80 componentes y 160 cables.');
  const ids = new Set<string>();
  for (const c of red.componentes) {
    if (!c || typeof c.id !== 'string' || ids.has(c.id) || !Object.hasOwn(NOMBRES, c.tipo) ||
        typeof c.nombre !== 'string' || c.nombre.length > 80 ||
        ![c.x,c.y,c.rotacion,c.valor,c.interna,c.fraccion].every(Number.isFinite) ||
        Math.abs(c.x) > 10000 || Math.abs(c.y) > 10000 || c.rotacion % 90 !== 0 ||
        typeof c.cerrado !== 'boolean' || !['V','A'].includes(c.modo) ||
        c.interna < 0.01 || c.interna > 1000 || c.fraccion < 0.01 || c.fraccion > 0.99 ||
        (esFuente(c) ? Math.abs(c.valor) > 240 : c.valor < 0.1 || c.valor > 1e6)) throw new Error('Propiedades de componente inválidas.');
    ids.add(c.id);
  }
  const cableIds = new Set<string>();
  for (const cable of red.cables) {
    if (!cable || typeof cable.id !== 'string' || cableIds.has(cable.id)) throw new Error('Identificador de cable inválido.');
    cableIds.add(cable.id);
    for (const t of [cable.a, cable.b]) {
      const c = t && red.componentes.find(c => c.id === t.componente);
      if (!c || !Number.isInteger(t.puerto) || t.puerto < 0 || t.puerto >= numeroPuertos(c)) throw new Error('Terminal inexistente.');
    }
    if (clave(cable.a) === clave(cable.b)) throw new Error('Un cable necesita dos terminales diferentes.');
  }
}
