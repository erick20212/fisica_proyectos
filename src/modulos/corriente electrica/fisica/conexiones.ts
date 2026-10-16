import type { Laboratorio } from '../tipos';
import { clave, esFuente, esVoltimetro, numeroPuertos } from './modelos';

export function quitarPartes(red:Laboratorio, ids:string[]): Laboratorio {
  const quitar=new Set(ids);
  return {componentes:red.componentes.filter(c=>!quitar.has(c.id)),
    cables:red.cables.filter(c=>!quitar.has(c.id)&&!quitar.has(c.a.componente)&&!quitar.has(c.b.componente))};
}

/** Clasificación topológica. Las pequeñas resistencias de contacto no alteran
 * las conexiones reconocidas; el cálculo numérico las conserva en MNA. */
export function clasificarRed(red:Laboratorio): string {
  const fuentes=red.componentes.filter(esFuente);
  if (fuentes.length!==1) return fuentes.length ? 'Red con varias fuentes' : 'Sin fuente';
  const padre=new Map<string,string>();
  const buscar=(n:string):string => {if(!padre.has(n)) padre.set(n,n);const p=padre.get(n)!;if(p!==n) padre.set(n,buscar(p));return padre.get(n)!;};
  const unir=(a:string,b:string) => padre.set(buscar(a),buscar(b));
  red.cables.forEach(c=>unir(clave(c.a),clave(c.b)));
  const tierras=red.componentes.filter(c=>c.tipo==='tierra');
  tierras.slice(1).forEach(c=>unir(`${tierras[0].id}:0`,`${c.id}:0`));
  red.componentes.filter(c=>(['interruptor','pulsador'].includes(c.tipo)&&c.cerrado)||c.tipo==='amperimetro'||(c.tipo==='multimetro'&&c.modo==='A')).forEach(c=>unir(`${c.id}:0`,`${c.id}:1`));
  const inicio=buscar(`${fuentes[0].id}:0`),fin=buscar(`${fuentes[0].id}:1`);
  if(inicio===fin) return 'Cortocircuito de la fuente';
  let aristas: {a:string;b:string}[]=[];
  for(const c of red.componentes) {
    if(esFuente(c)||esVoltimetro(c)||numeroPuertos(c)===1||['amperimetro','multimetro','interruptor','pulsador'].includes(c.tipo)) continue;
    const a=buscar(`${c.id}:0`),b=buscar(`${c.id}:1`);
    if(c.tipo==='potenciometro') {const cursor=buscar(`${c.id}:2`);aristas.push({a,b:cursor},{a:cursor,b});}
    else aristas.push({a,b});
  }
  aristas=aristas.filter(e=>e.a!==e.b);
  const visitados=new Set([inicio]);let cambio=true;
  while(cambio) {cambio=false;for(const e of aristas) if(visitados.has(e.a)!==visitados.has(e.b)) {visitados.add(e.a);visitados.add(e.b);cambio=true;}}
  if(!visitados.has(fin)) return 'Circuito abierto';
  aristas=aristas.filter(e=>visitados.has(e.a));
  let serie=false,paralelo=false;
  for(let iter=0;iter<200;iter++) {
    const nodos=[...new Set(aristas.flatMap(e=>[e.a,e.b]))];
    const hoja=nodos.find(n=>n!==inicio&&n!==fin&&aristas.filter(e=>e.a===n||e.b===n).length===1);
    if(hoja) {aristas=aristas.filter(e=>e.a!==hoja&&e.b!==hoja);continue;}
    const repetida=aristas.findIndex((e,i)=>aristas.some((f,j)=>j<i&&((e.a===f.a&&e.b===f.b)||(e.a===f.b&&e.b===f.a))));
    if(repetida>=0) {aristas.splice(repetida,1);paralelo=true;continue;}
    const intermedio=nodos.find(n=>n!==inicio&&n!==fin&&aristas.filter(e=>e.a===n||e.b===n).length===2);
    if(intermedio) {
      const enlaces=aristas.filter(e=>e.a===intermedio||e.b===intermedio);
      const extremos=enlaces.map(e=>e.a===intermedio?e.b:e.a);
      aristas=aristas.filter(e=>!enlaces.includes(e));if(extremos[0]!==extremos[1]) aristas.push({a:extremos[0],b:extremos[1]});serie=true;continue;
    }
    break;
  }
  if(aristas.length>1) return 'Red de puente / topología general';
  return serie&&paralelo?'Circuito mixto':paralelo?'Circuito paralelo':serie?'Circuito serie':'Circuito simple';
}
