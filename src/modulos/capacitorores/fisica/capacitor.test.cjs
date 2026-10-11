const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function cargar(archivo, mocks = {}, cache = new Map()) {
  archivo = path.resolve(archivo);
  if (cache.has(archivo)) return cache.get(archivo).exports;
  const modulo = { exports: {} }; cache.set(archivo, modulo);
  const js = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const importar = (nombre) => {
    if (Object.hasOwn(mocks, nombre)) return mocks[nombre];
    if (nombre.startsWith('.')) {
      const base = path.resolve(path.dirname(archivo), nombre);
      return cargar(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx', mocks, cache);
    }
    return require(nombre);
  };
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})', { filename: archivo })(importar, modulo, modulo.exports);
  return modulo.exports;
}
const { ESTADO_INICIAL, calcularEstadoCapacitor: calcular, calcularCapacitancia,
  actualizarSimulador: cambiar, formatearSI } = cargar(path.join(__dirname, 'capacitor.ts'));
const inicial = () => ({ ...ESTADO_INICIAL });
const cerca = (actual, esperado) => assert.ok(Math.abs(actual - esperado) <= Math.max(1e-30, Math.abs(esperado) * 1e-12), `${actual} != ${esperado}`);
const desconectar = (e) => cambiar(e, { tipo: 'bateria' });

test('1: conectada, duplicar A duplica C, Q y U, con V constante', () => {
  const e = inicial(), a = calcular(e), b = calcular(cambiar(e, { tipo: 'area', valor: e.area * 2 }));
  cerca(b.capacitancia, a.capacitancia * 2); cerca(b.carga, a.carga * 2);
  cerca(b.energia, a.energia * 2); cerca(b.voltaje, a.voltaje); cerca(b.campo, a.campo);
});
test('2: conectada, duplicar d reduce C y Q a la mitad', () => {
  const e = inicial(), a = calcular(e), b = calcular(cambiar(e, { tipo: 'separacion', valor: e.separacion * 2 }));
  cerca(b.capacitancia, a.capacitancia / 2); cerca(b.carga, a.carga / 2); cerca(b.voltaje, a.voltaje);
});
test('3: aislada, duplicar A conserva Q y reduce V y U a la mitad', () => {
  const e = desconectar(inicial()), a = calcular(e), b = calcular(cambiar(e, { tipo: 'area', valor: e.area * 2 }));
  assert.equal(b.carga, a.carga); cerca(b.voltaje, a.voltaje / 2); cerca(b.energia, a.energia / 2);
});
test('4: aislada, duplicar d conserva Q, duplica V y U y mantiene E', () => {
  const e = desconectar(inicial()), a = calcular(e), b = calcular(cambiar(e, { tipo: 'separacion', valor: e.separacion * 2 }));
  assert.equal(b.carga, a.carga); cerca(b.voltaje, a.voltaje * 2); cerca(b.energia, a.energia * 2); cerca(b.campo, a.campo);
});
test('5: dieléctrico conectado aumenta C y Q en εr, con V constante', () => {
  const e = inicial(), a = calcular(e), b = calcular(cambiar(e, { tipo: 'material', valor: 'ptfe' }));
  cerca(b.capacitancia, a.capacitancia * 2.1); cerca(b.carga, a.carga * 2.1); cerca(b.voltaje, a.voltaje);
});
test('6: dieléctrico aislado mantiene Q y reduce V y energía', () => {
  const e = desconectar(inicial()), a = calcular(e), b = calcular(cambiar(e, { tipo: 'material', valor: 'vidrio' }));
  assert.equal(b.carga, a.carga); cerca(b.voltaje, a.voltaje / 5.6); cerca(b.energia, a.energia / 5.6);
});
test('7: invertir V invierte Q y E, conserva C y U', () => {
  const e = inicial(), a = calcular(e), b = calcular(cambiar(e, { tipo: 'voltaje', valor: -e.voltajeBateria }));
  cerca(b.carga, -a.carga); cerca(b.campo, -a.campo); cerca(b.energia, a.energia); cerca(b.capacitancia, a.capacitancia);
});
test('8: conectada a 0 V, Q, E y U son cero', () => {
  const r = calcular(cambiar(inicial(), { tipo: 'voltaje', valor: 0 }));
  assert.equal(r.carga, 0); assert.equal(r.campo, 0); assert.equal(r.energia, 0);
});
test('9: cambiar el voltaje de la fuente aislada no cambia el capacitor', () => {
  const e = desconectar(inicial()), a = calcular(e), b = calcular(cambiar(e, { tipo: 'voltaje', valor: -12 }));
  assert.deepEqual(b, a);
});
test('reconectar aplica V de la fuente y desconectar captura la nueva Q', () => {
  let e = desconectar(inicial());
  e = cambiar(e, { tipo: 'area', valor: 200e-6 });
  e = cambiar(e, { tipo: 'voltaje', valor: -3 });
  e = cambiar(e, { tipo: 'bateria' });
  const r = calcular(e); assert.equal(r.voltaje, -3); cerca(r.carga, -3 * r.capacitancia);
  e = cambiar(e, { tipo: 'bateria' }); assert.equal(e.cargaAislada, r.carga);
  e = cambiar(e, { tipo: 'separacion', valor: 10e-3 }); cerca(calcular(e).voltaje, -6);
});
test('aislamiento con Q cero permanece sin campo aunque la batería cambie', () => {
  let e = desconectar(cambiar(inicial(), { tipo: 'voltaje', valor: 0 }));
  e = cambiar(e, { tipo: 'voltaje', valor: 12 });
  e = cambiar(e, { tipo: 'material', valor: 'papel' });
  assert.equal(calcular(e).voltaje, 0); assert.equal(calcular(e).energia, 0);
});
test('SI, fórmula analítica y validación de entradas', () => {
  const r = calcular(inicial());
  cerca(r.capacitancia, 8.8541878128e-12 * 1e-4 / 0.005);
  cerca(r.carga, r.capacitancia * 1.5); cerca(r.campo, 300);
  cerca(r.energia, 0.5 * r.capacitancia * 1.5 ** 2);
  assert.throws(() => calcularCapacitancia(0, 1, 1));
  assert.throws(() => calcularCapacitancia(1, 0, 1));
  assert.throws(() => calcularCapacitancia(1, 1, Infinity));
  for (const valor of [NaN, Infinity, -1]) assert.deepEqual(cambiar(inicial(), { tipo: 'area', valor }), inicial());
  assert.equal(cambiar(inicial(), { tipo: 'area', valor: 20 / 1e6 }).area, 20e-6);
  assert.equal(formatearSI(0, 'C'), '0 C'); assert.match(formatearSI(r.capacitancia, 'F'), /fF|pF/);
});

const diagramas = cargar(path.join(__dirname, '../componentes/Capacitor2D.tsx'), {
  react: { useId: () => 'test', useRef: (valor) => ({ current: valor }) },
}).default;
function nodos(arbol, predicado) {
  const encontrados = [];
  function visitar(nodo) {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) { nodo.forEach(visitar); return; }
    if (predicado(nodo)) encontrados.push(nodo);
    visitar(nodo.props?.children);
  }
  visitar(arbol); return encontrados;
}
const dibujar = (estado, accion = () => {}) => diagramas({ estado, resultado: calcular(estado), cambiar: accion });
test('SVG: flechas uniformes de + a −, invertidas con V y ausentes a V=0', () => {
  for (const voltaje of [1.5, -1.5, 0]) {
    const e = cambiar(inicial(), { tipo: 'voltaje', valor: voltaje });
    const dibujo = dibujar(e);
    const lineas = nodos(dibujo, (n) => n.props?.['data-linea-campo']);
    const cargas = nodos(dibujo, (n) => n.props?.['data-carga']);
    if (voltaje === 0) { assert.equal(lineas.length, 0); assert.equal(cargas.length, 0); continue; }
    assert.ok(lineas.length > 0);
    for (const linea of lineas) {
      assert.equal(linea.props.x1, linea.props.x2);
      assert.ok(Math.sign(voltaje) * (linea.props.y2 - linea.props.y1) > 0);
    }
    const plano = nodos(dibujo, (n) => n.props?.['data-polaridad-superior'])[0];
    assert.equal(plano.props['data-polaridad-superior'], voltaje > 0 ? 'positiva' : 'negativa');
  }
});
test('SVG: símbolos dependen de Q, no del tamaño de la placa aislada', () => {
  const contar = (e) => nodos(dibujar(e), (n) => n.props?.['data-carga']).length;
  const e = inicial();
  assert.ok(contar(cambiar(e, { tipo: 'area', valor: 400e-6 })) > contar(e));
  const aislada = desconectar(e);
  assert.equal(contar(cambiar(aislada, { tipo: 'area', valor: 400e-6 })), contar(aislada));
  assert.deepEqual(nodos(dibujar(cambiar(aislada, { tipo: 'voltaje', valor: -12 })), (n) => n.props?.['data-direccion'])
    .map((n) => n.props['data-direccion']), ['superior-inferior']);
});
test('SVG: área y distancia cambian la geometría y teclado actualiza controles', () => {
  const e = inicial(), dibujo = dibujar(e), mayor = dibujar(cambiar(e, { tipo: 'area', valor: 400e-6 }));
  const poligonos = (a) => nodos(a, (n) => n.type === 'polygon').map((n) => n.props.points);
  assert.notDeepEqual(poligonos(mayor), poligonos(dibujo));
  assert.notDeepEqual(poligonos(dibujar(cambiar(e, { tipo: 'separacion', valor: 10e-3 }))), poligonos(dibujo));
  let accion;
  const sliders = nodos(dibujar(e, (a) => { accion = a; }), (n) => n.props?.role === 'slider');
  sliders[0].props.onKeyDown({ key: 'ArrowUp', preventDefault() {} });
  assert.equal(accion.tipo, 'separacion'); cerca(accion.valor, 5.1e-3);
  sliders[1].props.onKeyDown({ key: 'End', preventDefault() {} });
  assert.equal(accion.tipo, 'area'); cerca(accion.valor, 400e-6);
});
test('SVG: arrastre continuo de separación y área, captura y cancelación', () => {
  const original = global.DOMPoint;
  global.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };
  try {
    let accion, capturado = false;
    const dibujo = dibujar(inicial(), (a) => { accion = a; });
    const raiz = nodos(dibujo, (n) => n.type === 'svg')[0];
    raiz.props.ref.current = { getScreenCTM: () => ({ inverse: () => ({}) }) };
    const objetivo = { setPointerCapture: () => { capturado = true; },
      hasPointerCapture: () => capturado, releasePointerCapture: () => { capturado = false; } };
    const evento = (x, y) => ({ button: 0, pointerId: 1, clientX: x, clientY: y, currentTarget: objetivo, preventDefault() {} });
    const sliders = nodos(dibujo, (n) => n.props?.role === 'slider');
    sliders[0].props.onPointerDown(evento(720, 300)); assert.equal(capturado, true);
    sliders[0].props.onPointerMove(evento(720, 320));
    assert.equal(accion.tipo, 'separacion'); assert.ok(accion.valor > ESTADO_INICIAL.separacion);
    sliders[0].props.onPointerUp(evento(720, 320)); assert.equal(capturado, false);
    sliders[1].props.onPointerDown(evento(600, 300));
    sliders[1].props.onPointerMove(evento(620, 300));
    assert.equal(accion.tipo, 'area'); assert.ok(accion.valor > ESTADO_INICIAL.area);
    sliders[1].props.onPointerCancel(evento(620, 300)); assert.equal(capturado, false);
  } finally { if (original === undefined) delete global.DOMPoint; else global.DOMPoint = original; }
});
