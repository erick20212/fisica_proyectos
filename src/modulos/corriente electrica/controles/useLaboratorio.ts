import { useCallback, useReducer } from 'react';
import type { Laboratorio } from '../tipos';
import { crearLaboratorio } from '../fisica/ejemplos';

interface Historial { actual:Laboratorio; antes:Laboratorio[]; despues:Laboratorio[] }
type Accion = { tipo:'cambiar'; red:Laboratorio } | { tipo:'deshacer' | 'rehacer' };
export function reducerHistorial(h: Historial, a: Accion): Historial {
  if (a.tipo === 'cambiar') return { actual:a.red, antes:[...h.antes.slice(-49),h.actual], despues:[] };
  if (a.tipo === 'deshacer' && h.antes.length) return { actual:h.antes.at(-1)!, antes:h.antes.slice(0,-1), despues:[h.actual,...h.despues] };
  if (a.tipo === 'rehacer' && h.despues.length) return { actual:h.despues[0], antes:[...h.antes,h.actual], despues:h.despues.slice(1) };
  return h;
}
export default function useLaboratorio() {
  const [h, dispatch] = useReducer(reducerHistorial, undefined, () => ({ actual:crearLaboratorio(), antes:[], despues:[] }));
  const cambiar = useCallback((red:Laboratorio) => dispatch({ tipo:'cambiar',red }), []);
  return { red:h.actual, cambiar, deshacer:() => dispatch({tipo:'deshacer'}), rehacer:() => dispatch({tipo:'rehacer'}),
    puedeDeshacer:h.antes.length > 0, puedeRehacer:h.despues.length > 0 };
}
