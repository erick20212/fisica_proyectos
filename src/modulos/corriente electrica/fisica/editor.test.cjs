const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function cargar(archivo,mocks={},cache=new Map()) {
  archivo=path.resolve(__dirname,archivo);
  if(cache.has(archivo)) return cache.get(archivo).exports;
  const modulo={exports:{}};cache.set(archivo,modulo);
  const js=ts.transpileModule(fs.readFileSync(archivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('require','module','exports',js)(nombre=>{
    if(mocks[nombre]) return mocks[nombre];
    if(nombre.startsWith('.')) {const base=path.resolve(path.dirname(archivo),nombre);return cargar(fs.existsSync(base+'.ts')?base+'.ts':base+'.tsx',mocks,cache);}
    return require(nombre);
  },modulo,modulo.exports);
  return modulo.exports;
}
const { crearLaboratorio }=cargar('ejemplos.ts');
const { resolverRed }=cargar('redElectrica.ts');
function nodos(e) {return !e||typeof e!=='object'?[]:Array.isArray(e)?e.flatMap(nodos):[e,...nodos(e.props?.children)];}
function texto(e) {return typeof e==='string'?e:typeof e==='number'?String(e):Array.isArray(e)?e.map(texto).join(''):e?.props?texto(e.props.children):'';}
function laboratorio(indice=0) {
  let cursor=0,estados=[];const captura=new Set();
  const superficie={getScreenCTM:()=>({inverse:()=>({})}),setPointerCapture:id=>captura.add(id),hasPointerCapture:id=>captura.has(id),releasePointerCapture:id=>captura.delete(id)};
  const react={useState:inicial=>{const i=cursor++;if(!(i in estados)) estados[i]=inicial;return [estados[i],v=>{estados[i]=typeof v==='function'?v(estados[i]):v;}];},useRef:()=>{cursor++;return {current:superficie};}};
  const Componente=cargar('../componentes/Laboratorio2D.tsx',{react}).default;
  const p={red:crearLaboratorio(indice),seleccion:[],pausado:false,electrones:false,reconectar:null,
    cambiar:r=>{p.red=r;},seleccionar:s=>{p.seleccion=s;},finReconectar:()=>{p.reconectar=null;},
    pulsar:(id,cerrado)=>{p.red={...p.red,componentes:p.red.componentes.map(c=>c.id===id?{...c,cerrado}:c)};},mantenerPulsador:id=>{p.pulso=id;}};
  return {p,captura,render:()=>{cursor=0;p.solucion=resolverRed(p.red);return nodos(Componente(p));}};
}
const evento=(x=0,y=0)=>({button:0,pointerId:1,clientX:x,clientY:y,shiftKey:false,stopPropagation(){},preventDefault(){}});
global.DOMPoint=class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}};

test('editor: conexión entre dos terminales crea un cable real resoluble',()=>{
  const h=laboratorio();h.p.red.cables=[];
  let n=h.render();const terminales=()=>n.filter(e=>e.props?.['aria-label']?.startsWith('Terminal '));
  terminales()[0].props.onPointerDown(evento());n=h.render();terminales()[2].props.onPointerDown(evento());
  assert.equal(h.p.red.cables.length,1);assert.equal(h.p.red.cables[0].a.componente,'B1');assert.equal(h.p.red.cables[0].b.componente,'R1');
  assert.equal(resolverRed(h.p.red).error,null);
});
test('editor: arrastre conserva identidad de cables y confirma una sola edición',()=>{
  const h=laboratorio();const antes=structuredClone(h.p.red.cables);let n=h.render();
  n.find(e=>e.props?.className==='cursor-grab').props.onPointerDown(evento(220,380));
  assert.ok(h.captura.has(1));n=h.render();n.find(e=>e.type==='svg').props.onPointerMove(evento(270,410));
  n=h.render();n.find(e=>e.type==='svg').props.onPointerUp(evento(270,410));
  assert.equal(h.p.red.componentes[0].x,270);assert.equal(h.p.red.componentes[0].y,410);assert.deepEqual(h.p.red.cables,antes);assert.equal(h.captura.size,0);
});
test('editor: cancelar arrastre no cambia la posición y Mayús selecciona varios',()=>{
  const h=laboratorio();let n=h.render();const grupos=()=>n.filter(e=>e.props?.className==='cursor-grab');
  grupos()[0].props.onPointerDown(evento(220,380));n=h.render();n.find(e=>e.type==='svg').props.onPointerMove(evento(400,400));n=h.render();n.find(e=>e.type==='svg').props.onPointerCancel(evento());
  assert.equal(h.p.red.componentes[0].x,220);n=h.render();grupos()[1].props.onPointerDown({...evento(460,190),shiftKey:true});assert.equal(h.p.seleccion.length,2);
});
test('editor: reconectar extremo modifica terminal y mantiene el cable',()=>{
  const h=laboratorio(2);const cable=h.p.red.cables[0];h.p.reconectar={id:cable.id,extremo:'b'};
  const n=h.render();const t=n.find(e=>e.props?.['aria-label']==='Terminal 1 de R2');t.props.onPointerDown(evento());
  const nuevo=h.p.red.cables.find(c=>c.id===cable.id);assert.equal(nuevo.b.componente,'R2');assert.equal(nuevo.b.puerto,1);assert.equal(h.p.reconectar,null);
});
test('editor: partículas invierten sentido para electrones y se detienen en pausa o I=0',()=>{
  const h=laboratorio();let n=h.render();const animaciones=()=>n.filter(e=>e.props?.style?.animation);
  assert.ok(animaciones().length);const direccion=animaciones()[0].props.style.animationDirection;
  h.p.electrones=true;n=h.render();assert.notEqual(animaciones()[0].props.style.animationDirection,direccion);
  h.p.pausado=true;n=h.render();assert.equal(animaciones()[0].props.style.animationPlayState,'paused');
  h.p.red.componentes[0].valor=0;n=h.render();assert.equal(animaciones().length,0);
});
test('editor: soltar biblioteca añade componente en la posición del laboratorio',()=>{
  const h=laboratorio();const n=h.render();n.find(e=>e.type==='svg').props.onDrop({...evento(700,200),dataTransfer:{getData:()=> 'bombilla'}});
  const c=h.p.red.componentes.at(-1);assert.equal(c.tipo,'bombilla');assert.equal(c.x,700);assert.equal(c.y,200);assert.equal(h.p.seleccion[0],c.id);
});
test('bombilla: efecto luminoso depende de potencia calculada y desaparece sin potencia',()=>{
  const Dibujar=cargar('../componentes/ComponenteElectrico.tsx').default;const c=crearLaboratorio(1).componentes[1];
  const apagada=nodos(Dibujar({c,lectura:{potencia:0}})),encendida=nodos(Dibujar({c,lectura:{potencia:2}}));
  assert.equal(apagada.filter(e=>e.props?.['data-luz']==='halo').length,0);assert.equal(encendida.filter(e=>e.props?.['data-luz']==='halo').length,1);
  const debil=nodos(Dibujar({c,lectura:{potencia:0.01}}));
  assert.ok(debil.find(e=>e.props?.['data-luz']==='halo').props.opacity<encendida.find(e=>e.props?.['data-luz']==='halo').props.opacity);
});

test('editor: clic en interruptor abre y cierra; arrastre no cambia su estado',()=>{
  const h=laboratorio(1);const interruptor=()=>h.p.red.componentes.find(c=>c.id==='S1');
  const cuerpo=n=>n.find(e=>e.props?.['aria-label']==='Seleccionar S1 y abrir o cerrar');
  let n=h.render();cuerpo(n).props.onPointerDown(evento(700,310));n=h.render();n.find(e=>e.type==='svg').props.onPointerUp(evento(700,310));
  assert.equal(interruptor().cerrado,false);assert.ok(Math.abs(resolverRed(h.p.red).componentes.R1.corriente)<1e-8);
  n=h.render();cuerpo(n).props.onPointerDown(evento(700,310));n=h.render();n.find(e=>e.type==='svg').props.onPointerUp(evento(700,310));assert.equal(interruptor().cerrado,true);
  n=h.render();cuerpo(n).props.onPointerDown(evento(700,310));n=h.render();n.find(e=>e.type==='svg').props.onPointerMove(evento(750,350));n=h.render();n.find(e=>e.type==='svg').props.onPointerUp(evento(750,350));assert.equal(interruptor().cerrado,true);assert.equal(interruptor().x,750);
});
test('editor: pulsador del lienzo libera el contacto al soltar o cancelar',()=>{
  const h=laboratorio(1);h.p.red.componentes.find(c=>c.id==='S1').tipo='pulsador';
  let n=h.render();n.find(e=>e.props?.['aria-label']==='Seleccionar S1').props.onPointerDown(evento(700,310));assert.equal(h.p.pulso,'S1');
  n=h.render();n.find(e=>e.type==='svg').props.onPointerCancel(evento());assert.equal(h.p.pulso,null);
});
test('editor: recuadro selecciona varias partes y activa quitar selección',()=>{
  const h=laboratorio();let eliminados=false;h.p.eliminarSeleccion=()=>{eliminados=true;};
  let n=h.render();n.find(e=>e.type==='svg').props.onPointerDown({...evento(120,130),shiftKey:true});n=h.render();n.find(e=>e.type==='svg').props.onPointerMove(evento(600,430));n=h.render();n.find(e=>e.type==='svg').props.onPointerUp(evento(600,430));
  assert.ok(h.p.seleccion.includes('B1'));assert.ok(h.p.seleccion.includes('R1'));assert.ok(h.p.seleccion.includes('c0'));
  n=h.render();const boton=n.find(e=>e.type==='button'&&texto(e).startsWith('Quitar selección'));assert.equal(boton.props.disabled,false);boton.props.onClick();assert.equal(eliminados,true);
});
test('editor: modo selección permite alternar piezas sin activar interruptores',()=>{
  const h=laboratorio(1);let n=h.render();n.find(e=>e.type==='button'&&texto(e)==='Seleccionar varias').props.onClick();
  n=h.render();n.find(e=>e.props?.['aria-label']==='Seleccionar S1 y abrir o cerrar').props.onPointerDown(evento(700,310));n=h.render();n.find(e=>e.type==='svg').props.onPointerUp(evento(700,310));
  assert.ok(h.p.seleccion.includes('S1'));assert.equal(h.p.red.componentes.find(c=>c.id==='S1').cerrado,true);
  n=h.render();n.find(e=>e.props?.['aria-label']==='Seleccionar S1 y abrir o cerrar').props.onPointerDown(evento(700,310));assert.ok(!h.p.seleccion.includes('S1'));
});
test('Ohm: gráficas y punto de corriente se actualizan al variar V y R',()=>{
  let cursor=0;const estados=[];
  const react={useState:v=>{const i=cursor++;if(!(i in estados)) estados[i]=v;return [estados[i],nuevo=>{estados[i]=nuevo;}];}};
  const Ohm=cargar('../componentes/LeyOhm.tsx',{react}).default;
  const render=()=>{cursor=0;return nodos(Ohm());};
  let n=render();assert.equal(n.filter(e=>e.type==='svg').length,3);
  const control=n.find(e=>e.props?.etiqueta==='Voltaje para ley de Ohm (V)');control.props.cambiar(-12);n=render();assert.ok(n.some(e=>e.props?.style?.animationDirection==='reverse'));
  n.find(e=>e.props?.etiqueta==='Resistencia para ley de Ohm (Ω)').props.cambiar(200);n=render();assert.ok(n.some(e=>texto(e).includes('-0.06 A')));
  n.find(e=>e.props?.etiqueta==='Voltaje para ley de Ohm (V)').props.cambiar(0);n=render();assert.equal(n.filter(e=>e.props?.style?.animation).length,0);
});
test('editor: arrastrar el fondo desplaza la vista y conserva circuito y selección',()=>{
  const h=laboratorio();h.p.seleccion=['R1'];const original=structuredClone(h.p.red);
  let n=h.render();n.find(e=>e.type==='svg').props.onPointerDown(evento(10,20));n=h.render();n.find(e=>e.type==='svg').props.onPointerMove(evento(100,60));n=h.render();
  assert.ok(n.some(e=>e.props?.transform==='translate(90 40) scale(1)'));
  n.find(e=>e.type==='svg').props.onPointerUp(evento(100,60));assert.deepEqual(h.p.red,original);assert.deepEqual(h.p.seleccion,['R1']);
});
test('ejemplos: todos los nombres son visibles, cada botón carga y cierra el desplegable',()=>{
  const Ejemplos=cargar('../controles/EjemplosCircuitos.tsx').default;let elegido=-1,foco=false;
  const raiz=Ejemplos({elegir:i=>{elegido=i;}}),n=nodos(raiz);const opciones=n.filter(e=>e.type==='button');
  assert.equal(opciones.length,12);assert.ok(opciones.every(e=>texto(e).length>0&&e.props.className.includes('text-slate-100')));
  const details={open:true,querySelector:()=>({focus:()=>{foco=true;}})};
  opciones[10].props.onClick({currentTarget:{closest:()=>details}});assert.equal(elegido,10);assert.equal(details.open,false);assert.equal(foco,true);
  details.open=true;raiz.props.onKeyDown({key:'Escape',currentTarget:details});assert.equal(details.open,false);
});
