import type { Laboratorio, SolucionRed } from '../tipos';
import { esFuente } from './modelos';

export interface AcumuladoEnergia { total:number; tiempo:number; componentes:Record<string,number> }
/** Integral por tramos DC constantes. Excluye las pérdidas internas de las fuentes. */
export function integrarEnergia(e:AcumuladoEnergia, red:Laboratorio, s:SolucionRed, dt:number): AcumuladoEnergia {
  if (s.error || !Number.isFinite(dt) || dt <= 0) return e;
  const componentes = {...e.componentes};
  for (const c of red.componentes) if (!esFuente(c)) componentes[c.id] = (componentes[c.id] ?? 0) + Math.max(0,s.componentes[c.id]?.potencia ?? 0)*dt;
  return {tiempo:e.tiempo+dt,total:e.total+(s.potencia+s.potenciaCables)*dt,componentes};
}
