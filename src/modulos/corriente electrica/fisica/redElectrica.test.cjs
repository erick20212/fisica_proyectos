const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function cargar(archivo) {
  const absoluto = path.resolve(__dirname,archivo);
  if (cache.has(absoluto)) return cache.get(absoluto).exports;
  const modulo = {exports:{}}; cache.set(absoluto,modulo);
  const js = ts.transpileModule(fs.readFileSync(absoluto,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('module','exports','require',js)(modulo,modulo.exports,n => n.startsWith('.') ? cargar(path.relative(__dirname,path.resolve(path.dirname(absoluto),n+'.ts'))) : require(n));
  return modulo.exports;
}
const { resolverRed, resolverSistema } = cargar('redElectrica.ts');
const { crearLaboratorio, EJEMPLOS } = cargar('ejemplos.ts');
const { crearComponente, posicionTerminal, validarLaboratorio } = cargar('modelos.ts');
const { serializar, recuperar } = cargar('persistencia.ts');
const { integrarEnergia } = cargar('energia.ts');
const { clasificarRed, quitarPartes } = cargar('conexiones.ts');
const { reducerHistorial } = cargar('../controles/useLaboratorio.ts');
function cerca(a,b,tol=1e-7) { assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`); }
function resolver(red) { const s=resolverRed(red);assert.equal(s.error,null); assert.ok(s.errorKirchhoff<1e-6);cerca(s.potenciaFuentes,s.potencia+s.potenciaCables);return s; }
function conectar(red,a,pa,b,pb) {red.cables.push({id:crypto.randomUUID(),a:{componente:a,puerto:pa},b:{componente:b,puerto:pb}});}

test('MNA simple: ley de Ohm incluyendo resistencia interna y cables',()=>{
  const s=resolver(crearLaboratorio(0));const i=12/100.102;
  cerca(s.componentes.R1.corriente,i);cerca(s.componentes.B1.corriente,-i);
  cerca(s.componentes.R1.voltaje,100*i);cerca(s.equivalente,100.002);
});
test('MNA serie: misma corriente y suma de caídas igual a fuerza electromotriz',()=>{
  const red=crearLaboratorio(2),s=resolver(red),i=12/300.103;
  cerca(s.componentes.R1.corriente,i);cerca(s.componentes.R2.corriente,i);
  cerca(s.componentes.R1.voltaje+s.componentes.R2.voltaje+i*0.103,12);
});
test('MNA paralelo: corrientes de ramas suman la de la fuente',()=>{
  const s=resolver(crearLaboratorio(3));
  cerca(s.componentes.R1.corriente+s.componentes.R2.corriente,-s.componentes.B1.corriente);
  cerca(s.componentes.R1.voltaje/s.componentes.R2.voltaje,1,2e-5);
});
test('MNA mixto: balance de potencia y corriente en derivaciones',()=>{
  const s=resolver(crearLaboratorio(4));
  cerca(s.componentes.R1.corriente+s.componentes.R2.corriente,s.componentes.R3.corriente);
  const eq=(100.002*200.002)/(300.004)+50+0.003;
  cerca(s.equivalente,eq,1e-6);
});
test('MNA puente arbitrario: rama transversal conduce, conserva KCL y potencia',()=>{
  const s=resolver(crearLaboratorio(10));
  assert.ok(Math.abs(s.componentes.R5.corriente)>1e-5);
  assert.ok(s.equivalente>0);assert.ok(s.islas===1);
});
test('interruptor abierto corta la corriente; cerrado la recupera',()=>{
  const red=crearLaboratorio(9);let s=resolver(red);
  cerca(s.componentes.R1.corriente,0);cerca(s.componentes.S1.voltaje,12);
  red.componentes.find(c=>c.id==='S1').cerrado=true;s=resolver(red);
  cerca(s.componentes.R1.corriente,12/100.104);
});
test('pulsador abierto/cerrado usa el mismo modelo eléctrico de contacto',()=>{
  const red=crearLaboratorio(9);const p=red.componentes.find(c=>c.id==='S1');p.tipo='pulsador';
  cerca(resolver(red).componentes.R1.corriente,0);p.cerrado=true;assert.ok(resolver(red).componentes.R1.corriente>0);
});
test('cortocircuito limitado por resistencia interna, sin infinitos',()=>{
  const red=crearLaboratorio(0);red.componentes=red.componentes.filter(c=>c.id==='B1');red.cables=[];conectar(red,'B1',0,'B1',1);
  const s=resolver(red);cerca(s.componentes.B1.corriente,-12/0.101);
  assert.ok(s.avisos.some(a=>a.includes('cortocircuito')));
});
test('islas flotantes: un voltímetro entre islas no inventa diferencias de potencial',()=>{
  const red=crearLaboratorio(0),c=crearComponente('voltimetro',500,500);red.componentes.push(c);
  conectar(red,c.id,0,'R1',0);const s=resolver(red);
  assert.equal(s.componentes[c.id].voltaje,null);assert.ok(s.avisos.some(a=>a.includes('referencia común')));
});
test('voltímetro ideal no carga la red y mide el voltaje real',()=>{
  const s=resolver(crearLaboratorio(8)),base=resolver(crearLaboratorio(0));
  cerca(s.componentes.R1.corriente,base.componentes.R1.corriente);
  cerca(s.componentes.V1.voltaje,s.componentes.R1.voltaje);cerca(s.componentes.V1.corriente,0);
});
test('amperímetro y multímetro A en serie miden la corriente de rama',()=>{
  const red=crearLaboratorio(7);let s=resolver(red);cerca(s.componentes.R2.corriente,s.componentes.R1.corriente);
  const c=red.componentes.find(c=>c.id==='R2');c.tipo='multimetro';c.modo='A';s=resolver(red);cerca(s.componentes.R2.corriente,s.componentes.R1.corriente);
  c.modo='V';s=resolver(red);cerca(s.componentes.R1.corriente,0);cerca(s.componentes.R2.voltaje,12);
});
test('baterías en serie y fuentes en paralelo con resistencias internas',()=>{
  const red=crearLaboratorio(11);let s=resolver(red);cerca(-s.componentes.B1.corriente,13.5/100.203);
  const base=crearLaboratorio(0);const b={...crearComponente('bateria',300,400),id:'B2',valor:6};base.componentes.push(b);conectar(base,'B1',0,'B2',0);conectar(base,'B1',1,'B2',1);
  s=resolver(base);assert.ok(s.componentes.B2.potencia>0);assert.ok(s.componentes.B1.potencia<0);
});
test('potenciómetro: extremos y cursor participan en el divisor de tensión',()=>{
  const red=crearLaboratorio(0);const c=red.componentes.find(c=>c.id==='R1');c.tipo='potenciometro';c.fraccion=0.25;
  const v={...crearComponente('voltimetro',500,400),id:'V'};red.componentes.push(v);conectar(red,'V',0,'R1',2);conectar(red,'V',1,'R1',1);
  const s=resolver(red);cerca(s.componentes.V.voltaje,0.75*s.componentes.R1.voltaje);
  cerca(s.componentes.R1.potencia,s.componentes.R1.corriente**2*100);
});
test('cambio de polaridad invierte corrientes, conserva disipación; V=0 apaga todo',()=>{
  const red=crearLaboratorio(1),a=resolver(red);red.componentes[0].valor=-12;const b=resolver(red);
  cerca(a.componentes.R1.corriente,-b.componentes.R1.corriente);cerca(a.componentes.R1.potencia,b.componentes.R1.potencia);
  red.componentes[0].valor=0;const c=resolver(red);cerca(c.potencia,0);
  assert.ok(c.equivalente>0);cerca(c.componentes.R1.corriente,0);
});
test('cambiar R actualiza corriente y potencia sin valores prefijados',()=>{
  const red=crearLaboratorio(0),a=resolver(red);red.componentes[1].valor=200;const b=resolver(red);
  cerca(b.componentes.R1.corriente,12/200.102);assert.ok(b.potencia<a.potencia);
});
test('mover y rotar componentes no cambia conexiones ni solución',()=>{
  const red=crearLaboratorio(4),a=resolver(red);red.componentes[1].x+=200;red.componentes[1].rotacion=90;
  const b=resolver(red);cerca(a.componentes.R1.corriente,b.componentes.R1.corriente);
  const t=posicionTerminal({...red.componentes[1],x:0,y:0},0);cerca(t.x,0);cerca(t.y,-55);
});
test('cruces geométricos no unen cables; solo importan terminales',()=>{
  const red=crearLaboratorio(3),a=resolver(red);red.componentes.forEach(c=>{c.x=0;c.y=0;});
  const b=resolver(red);cerca(a.componentes.R2.corriente,b.componentes.R2.corriente);
});
test('tierras comparten nodo cero, red sin fuentes y elementos aislados',()=>{
  const red=crearLaboratorio(0);const g1={...crearComponente('tierra',0,0),id:'g1'},g2={...crearComponente('tierra',0,100),id:'g2'};red.componentes.push(g1,g2);
  conectar(red,'g1',0,'B1',1);const s=resolver(red);cerca(s.potenciales['g1:0'],0);cerca(s.potenciales['g2:0'],0);
  const sola={componentes:[crearComponente('resistencia',0,0)],cables:[]};cerca(resolver(sola).potencia,0);
});
test('todos los ejemplos son redes válidas y satisfacen Kirchhoff',()=>{EJEMPLOS.forEach((_,i)=>resolver(crearLaboratorio(i)));});
test('guardar/recuperar conserva el circuito; rechaza archivos y terminales inválidos',()=>{
  const red=crearLaboratorio(10);assert.deepEqual(recuperar(serializar(red)),red);
  assert.throws(()=>recuperar('{"version":7}'));const mala=structuredClone(red);mala.cables[0].a.puerto=8;assert.throws(()=>validarLaboratorio(mala));assert.ok(resolverRed(mala).error);
  mala.cables=[];mala.componentes[0].interna=0;assert.throws(()=>validarLaboratorio(mala));
});
test('historial: deshacer/rehacer y nueva edición eliminan la rama futura',()=>{
  const a=crearLaboratorio(0),b=crearLaboratorio(1);let h={actual:a,antes:[],despues:[]};
  h=reducerHistorial(h,{tipo:'cambiar',red:b});h=reducerHistorial(h,{tipo:'deshacer'});assert.deepEqual(h.actual,a);
  h=reducerHistorial(h,{tipo:'rehacer'});assert.deepEqual(h.actual,b);
  h=reducerHistorial(h,{tipo:'deshacer'});h=reducerHistorial(h,{tipo:'cambiar',red:crearLaboratorio(2)});assert.equal(h.despues.length,0);
});
test('solver pivotea y rechaza sistemas singulares',()=>{
  const x=resolverSistema([[0,2],[1,1]],[4,3]);cerca(x[0],1);cerca(x[1],2);
  assert.throws(()=>resolverSistema([[1,1],[2,2]],[2,4]));
});
test('energía acumulada: E=Pt e integral por tramos con cambio de voltaje',()=>{
  const red=crearLaboratorio(0),s=resolver(red);let e={total:0,tiempo:0,componentes:{}};
  e=integrarEnergia(e,red,s,2);cerca(e.total,2*(s.potencia+s.potenciaCables));cerca(e.componentes.R1,2*s.componentes.R1.potencia);
  red.componentes[0].valor=6;const s2=resolver(red);e=integrarEnergia(e,red,s2,3);
  cerca(e.total,2*(s.potencia+s.potenciaCables)+3*(s2.potencia+s2.potenciaCables));cerca(e.tiempo,5);
  assert.equal(integrarEnergia(e,red,s2,0),e);assert.equal(integrarEnergia(e,red,{...s2,error:'fallo'},1),e);
});
test('clasifica serie, paralelo, mixto, puente, simple y abierto',()=>{
  for(const [i,esperado] of [[0,'Circuito simple'],[2,'Circuito serie'],[3,'Circuito paralelo'],[4,'Circuito mixto'],[9,'Circuito abierto'],[10,'Red de puente / topología general']])
    assert.equal(clasificarRed(crearLaboratorio(i)),esperado);
});
test('quitar piezas y cables seleccionados conserva el resto sin terminales colgantes',()=>{
  const red=crearLaboratorio(4),nueva=quitarPartes(red,['R1','c0']);
  assert.ok(!nueva.componentes.some(c=>c.id==='R1'));assert.ok(nueva.componentes.some(c=>c.id==='R2'));
  assert.ok(nueva.cables.every(c=>c.id!=='c0'&&c.a.componente!=='R1'&&c.b.componente!=='R1'));
  validarLaboratorio(nueva);assert.equal(resolverRed(nueva).error,null);assert.ok(red.componentes.some(c=>c.id==='R1'));
});
