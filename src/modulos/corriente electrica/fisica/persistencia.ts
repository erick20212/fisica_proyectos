import type { Laboratorio } from '../tipos';
import { validarLaboratorio } from './modelos';

export function serializar(red: Laboratorio): string {
  validarLaboratorio(red);
  return JSON.stringify({ version:1, circuito:red }, null, 2);
}
export function recuperar(texto: string): Laboratorio {
  if (texto.length > 500000) throw new Error('Archivo demasiado grande.');
  const archivo = JSON.parse(texto);
  if (archivo.version !== 1) throw new Error('Formato o versión de circuito no compatible.');
  validarLaboratorio(archivo.circuito);
  return archivo.circuito;
}
