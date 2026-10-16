import type { Componente, Laboratorio, TipoComponente } from '../tipos';
import { crearComponente } from './modelos';

export const EJEMPLOS = ['Batería y resistencia', 'Bombilla e interruptor', 'Resistencias en serie', 'Resistencias en paralelo',
  'Circuito mixto', 'Bombillas en serie', 'Bombillas en paralelo', 'Medir corriente', 'Medir voltaje', 'Circuito abierto', 'Puente resistivo', 'Baterías en serie'];

export function crearLaboratorio(indice = 0): Laboratorio {
  const componentes: Componente[] = [], cables: Laboratorio['cables'] = [];
  const agregar = (id: string, tipo: TipoComponente, x: number, y: number, valor?: number) => {
    const c = { ...crearComponente(tipo,x,y), id, nombre:id };
    if (valor !== undefined) c.valor = valor;
    componentes.push(c); return c;
  };
  let contador = 0;
  const unir = (a: string, pa: number, b: string, pb: number) => cables.push({ id:`c${contador++}`, a:{componente:a,puerto:pa}, b:{componente:b,puerto:pb} });
  agregar('B1','bateria',220,380,12);
  const bombillas = [1,5,6].includes(indice);
  const tipo = bombillas ? 'bombilla' : 'resistencia';
  agregar('R1',tipo,460,190,100);
  if ([3,4,6,10].includes(indice)) {
    agregar('R2',tipo,460,310,200);
    agregar('J+','nodo',320,250); agregar('J−','nodo',620,250);
    unir('B1',0,'J+',0); unir('J+',0,'R1',0); unir('J+',0,'R2',0);
    unir('R1',1,'J−',0); unir('R2',1,'J−',0);
    if (indice === 4) { agregar('R3','resistencia',770,380,50); unir('J−',0,'R3',0); unir('R3',1,'B1',1); }
    else unir('J−',0,'B1',1);
    if (indice === 10) {
      // Puente de Wheatstone: dividir las dos ramas y unir sus puntos medios.
      cables.splice(3,2);
      agregar('R3','resistencia',760,190,300); agregar('R4','resistencia',760,310,400);
      agregar('R5','resistencia',610,250,150).rotacion = 90;
      componentes.find(c => c.id === 'J−')!.x = 900;
      unir('R1',1,'R3',0); unir('R2',1,'R4',0); unir('R3',1,'J−',0); unir('R4',1,'J−',0);
      unir('R5',0,'R1',1); unir('R5',1,'R2',1);
    }
  } else {
    unir('B1',0,'R1',0);
    if ([1,9].includes(indice)) {
      agregar('S1','interruptor',700,310).cerrado = indice !== 9;
      unir('R1',1,'S1',0); unir('S1',1,'B1',1);
    } else if ([2,5,7,11].includes(indice)) {
      agregar('R2',indice === 7 ? 'amperimetro' : indice === 11 ? 'pila' : tipo,700,310,indice === 11 ? 1.5 : 200);
      unir('R1',1,'R2',indice === 11 ? 1 : 0); unir('R2',indice === 11 ? 0 : 1,'B1',1);
    } else unir('R1',1,'B1',1);
    if (indice === 8) { agregar('V1','voltimetro',470,480); unir('V1',0,'R1',0); unir('V1',1,'R1',1); }
  }
  return { componentes,cables };
}
