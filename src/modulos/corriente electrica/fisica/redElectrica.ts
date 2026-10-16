import type { Laboratorio, SolucionRed } from '../tipos';
import { clave, esFuente, esVoltimetro, numeroPuertos, validarLaboratorio } from './modelos';

// Resistencias explícitas: hacen medible la corriente de cada cable y evitan
// indeterminación de corrientes en lazos de conductores ideales.
export const R_CABLE = 0.001;
export const R_CONTACTO = 0.001;
export const R_AMPERIMETRO = 0.01;
interface Rama { id: string; a: string; b: string; r: number; v: number; fuente: boolean; cable: boolean }

/** Eliminación de Gauss con pivoteo parcial escalado y comprobación de residuo. */
export function resolverSistema(matriz: number[][], vector: number[]): number[] {
  const n = vector.length;
  if (!n) return [];
  const a = matriz.map((fila, i) => [...fila, vector[i]]);
  const escalas = matriz.map(f => Math.max(...f.map(Math.abs)));
  for (let k = 0; k < n; k++) {
    let pivote = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) / escalas[i] > Math.abs(a[pivote][k]) / escalas[pivote]) pivote = i;
    if (!escalas[pivote] || Math.abs(a[pivote][k]) < 1e-14 * escalas[pivote]) throw new Error('Red singular o mal condicionada. Revisa las fuentes y tierras.');
    [a[k], a[pivote]] = [a[pivote], a[k]];
    [escalas[k], escalas[pivote]] = [escalas[pivote], escalas[k]];
    for (let i = k + 1; i < n; i++) {
      const factor = a[i][k] / a[k][k];
      for (let j = k; j <= n; j++) a[i][j] -= factor * a[k][j];
    }
  }
  const x = Array(n).fill(0) as number[];
  for (let i = n - 1; i >= 0; i--) {
    x[i] = (a[i][n] - a[i].slice(i + 1, n).reduce((s, v, j) => s + v * x[i + 1 + j], 0)) / a[i][i];
    if (!Number.isFinite(x[i])) throw new Error('El sistema no tiene una solución numérica finita.');
  }
  const residuo = Math.max(...matriz.map((f, i) => Math.abs(f.reduce((s, v, j) => s + v * x[j], 0) - vector[i])));
  const escala = Math.max(1, ...matriz.map((f, i) => f.reduce((s, v, j) => s + Math.abs(v * x[j]), Math.abs(vector[i]))));
  if (residuo > 1e-8 * escala) throw new Error('La solución no satisface las ecuaciones con precisión suficiente.');
  return x;
}

export function resolverRed(red: Laboratorio): SolucionRed {
  const salida: SolucionRed = { componentes: {}, cables: {}, potenciales: {}, avisos: [], error: null,
    potencia: 0, potenciaFuentes: 0, potenciaCables: 0, equivalente: null, corrienteFuente: null, errorKirchhoff: 0, islas: 0 };
  try {
    validarLaboratorio(red);
    if (!red.componentes.length) { salida.avisos.push('Añade componentes y conecta sus terminales para construir un circuito.'); return salida; }
    const terminales = red.componentes.flatMap(c => Array.from({ length: numeroPuertos(c) }, (_, puerto) => clave({ componente:c.id, puerto })));
    // Todas las tierras representan el mismo nodo de referencia (conexión ideal).
    const tierras = red.componentes.filter(c => c.tipo === 'tierra').map(c => `${c.id}:0`);
    const nodo = (t: string) => tierras.includes(t) ? tierras[0] : t;
    const nodos = [...new Set(terminales.map(nodo))];
    const ramas: Rama[] = red.cables.map(c => ({ id:c.id, a:nodo(clave(c.a)), b:nodo(clave(c.b)), r:R_CABLE, v:0, fuente:false, cable:true }));
    for (const c of red.componentes) {
      const a = nodo(`${c.id}:0`), b = nodo(`${c.id}:1`);
      if (numeroPuertos(c) === 1 || esVoltimetro(c) || (['interruptor','pulsador'].includes(c.tipo) && !c.cerrado)) continue;
      if (c.tipo === 'potenciometro') {
        const cursor = nodo(`${c.id}:2`);
        ramas.push({ id:c.id, a, b:cursor, r:c.valor*c.fraccion, v:0, fuente:false, cable:false },
          { id:`${c.id}/cursor`, a:cursor, b, r:c.valor*(1-c.fraccion), v:0, fuente:false, cable:false });
      } else ramas.push({ id:c.id, a, b, r:esFuente(c) ? c.interna : ['interruptor','pulsador'].includes(c.tipo) ? R_CONTACTO :
        c.tipo === 'amperimetro' || c.tipo === 'multimetro' ? R_AMPERIMETRO : c.valor,
        v:esFuente(c) ? c.valor : 0, fuente:esFuente(c), cable:false });
    }
    const adyacentes = new Map(nodos.map(n => [n, [] as string[]]));
    ramas.forEach(r => { adyacentes.get(r.a)!.push(r.b); adyacentes.get(r.b)!.push(r.a); });
    const islas = new Map<string, number>();
    const grupos: string[][] = [];
    for (const n of nodos) {
      if (islas.has(n)) continue;
      const grupo: string[] = [], pendientes = [n];
      islas.set(n, grupos.length);
      while (pendientes.length) {
        const p = pendientes.pop()!; grupo.push(p);
        for (const vecino of adyacentes.get(p)!) if (!islas.has(vecino)) { islas.set(vecino, grupos.length); pendientes.push(vecino); }
      }
      grupos.push(grupo);
    }
    salida.islas = grupos.length;
    const corrientes: Record<string, number> = {};
    for (const grupo of grupos) {
      const referencia = grupo.find(n => n === tierras[0]) ?? grupo[0];
      const libres = grupo.filter(n => n !== referencia);
      const indice = new Map(libres.map((n,i) => [n,i]));
      const locales = ramas.filter(r => islas.get(r.a) === islas.get(grupo[0]));
      const fuentes = locales.filter(r => r.fuente);
      const tam = libres.length + fuentes.length;
      const m = Array.from({ length:tam }, () => Array(tam).fill(0) as number[]);
      const z = Array(tam).fill(0) as number[];
      const agregar = (i: number | undefined, j: number | undefined, v: number) => { if (i !== undefined && j !== undefined) m[i][j] += v; };
      for (const r of locales) {
        const a = indice.get(r.a), b = indice.get(r.b);
        if (r.fuente) {
          const s = libres.length + fuentes.indexOf(r);
          agregar(a,s,1); agregar(b,s,-1); agregar(s,a,1); agregar(s,b,-1);
          m[s][s] = -r.r; z[s] = r.v;
        } else {
          agregar(a,a,1/r.r); agregar(b,b,1/r.r); agregar(a,b,-1/r.r); agregar(b,a,-1/r.r);
        }
      }
      const x = resolverSistema(m,z);
      salida.potenciales[referencia] = 0;
      libres.forEach((n,i) => { salida.potenciales[n] = x[i]; });
      for (const r of locales) {
        corrientes[r.id] = r.fuente ? x[libres.length + fuentes.indexOf(r)] : (salida.potenciales[r.a]-salida.potenciales[r.b])/r.r;
      }
    }
    for (const t of terminales) salida.potenciales[t] = salida.potenciales[nodo(t)];
    for (const c of red.cables) {
      salida.cables[c.id] = corrientes[c.id];
      salida.potenciaCables += corrientes[c.id] ** 2 * R_CABLE;
    }
    for (const c of red.componentes) {
      const a = nodo(`${c.id}:0`), b = nodo(`${c.id}:1`);
      if (numeroPuertos(c) === 1) { salida.componentes[c.id] = { voltaje:salida.potenciales[a], corriente:0, potencia:0, estado:c.tipo === 'tierra' ? 'Referencia 0 V' : 'Unión eléctrica' }; continue; }
      const mismaIsla = islas.get(a) === islas.get(b);
      const voltaje = mismaIsla ? salida.potenciales[a]-salida.potenciales[b] : null;
      const corriente = corrientes[c.id] ?? 0;
      const potencia = voltaje === null ? null : voltaje * corriente;
      salida.componentes[c.id] = { voltaje, corriente, potencia, estado:esVoltimetro(c) ? mismaIsla ? 'Medición en paralelo (ideal)' : 'Sin referencia común' :
        Math.abs(corriente) > 1e-9 ? 'Con corriente' : 'Sin corriente / abierto' };
      if (c.tipo === 'potenciometro') {
        const segunda = corrientes[`${c.id}/cursor`];
        salida.componentes[c.id].potencia = corriente**2*c.valor*c.fraccion + segunda**2*c.valor*(1-c.fraccion);
        salida.componentes[c.id].estado = 'Corriente indicada en terminal 0; cursor independiente';
      }
      const lectura = salida.componentes[c.id];
      if (esFuente(c)) {
        salida.potenciaFuentes += -(potencia ?? 0);
        if (Math.abs(corriente) > 1e-8 && voltaje !== null && Math.abs(voltaje) < Math.max(0.02, Math.abs(c.valor)*0.02)) {
          salida.avisos.push(`${c.nombre}: posible cortocircuito. La resistencia interna limita la corriente.`);
        }
      } else salida.potencia += lectura.potencia ?? 0;
      if (esVoltimetro(c) && !mismaIsla) salida.avisos.push(`${c.nombre}: terminales sin referencia común; el voltaje es indeterminado.`);
      if ((c.tipo === 'amperimetro' || (c.tipo === 'multimetro' && c.modo === 'A')) && Math.abs(corriente) > 5) salida.avisos.push(`${c.nombre}: corriente elevada; conecta el amperímetro en serie, nunca directamente a la fuente.`);
    }
    for (const n of nodos) {
      const balance = ramas.reduce((s,r) => s + (r.a === n ? corrientes[r.id] : 0) - (r.b === n ? corrientes[r.id] : 0),0);
      salida.errorKirchhoff = Math.max(salida.errorKirchhoff, Math.abs(balance));
    }
    const fuentes = red.componentes.filter(esFuente);
    if (fuentes.length === 1) {
      const f = salida.componentes[fuentes[0].id];
      salida.corrienteFuente = -(f.corriente ?? 0);
      salida.equivalente = f.voltaje !== null && Math.abs(f.corriente ?? 0) > 1e-10 ? Math.abs(f.voltaje / f.corriente!) : null;
      // Una fuente de prueba permite medir R externa incluso con ε=0.
      // No se reutiliza la corriente de prueba como corriente real.
      if (salida.equivalente === null && fuentes[0].valor !== 1) {
        const prueba = resolverRed({...red,componentes:red.componentes.map(c => c.id === fuentes[0].id ? {...c,valor:1} : c)});
        if (!prueba.error) salida.equivalente = prueba.equivalente;
      }
      if (Math.abs(f.corriente ?? 0) < 1e-9) salida.avisos.push('Fuente sin corriente: circuito abierto, sin carga conectada o voltaje nulo.');
    } else if (fuentes.length > 1) salida.avisos.push('Varias fuentes: no se presenta una única resistencia equivalente V/I. Revisa las lecturas por componente.');
    else salida.avisos.push('No hay fuentes de voltaje: la red pasiva no recibe energía.');
    if (grupos.length > 1) salida.avisos.push(`${grupos.length} islas eléctricas independientes. Los potenciales de islas distintas no son comparables.`);
    return salida;
  } catch (error) {
    return { ...salida, componentes:{}, cables:{}, potenciales:{}, potencia:0, potenciaCables:0, potenciaFuentes:0,
      equivalente:null, corrienteFuente:null, error:error instanceof Error ? error.message : 'No se pudo resolver el circuito.' };
  }
}
