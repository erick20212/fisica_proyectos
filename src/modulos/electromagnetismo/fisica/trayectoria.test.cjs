// node:test + TypeScript ya instalado: sin navegador ni dependencias nuevas.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function cargarTS(archivo, mocks = {}, cache = new Map()) {
  archivo = path.resolve(archivo);
  if (cache.has(archivo)) return cache.get(archivo).exports;
  const modulo = { exports: {} };
  cache.set(archivo, modulo);
  const js = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const importar = (nombre) => {
    if (Object.hasOwn(mocks, nombre)) return mocks[nombre];
    if (nombre.startsWith('.')) {
      const base = path.resolve(path.dirname(archivo), nombre);
      return cargarTS(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx', mocks, cache);
    }
    return require(nombre);
  };
  vm.runInThisContext('(function(require,module,exports){' + js + '\n})',
    { filename: archivo })(importar, modulo, modulo.exports);
  return modulo.exports;
}

const motor = cargarTS(path.join(__dirname, 'trayectoria.ts'));
const { simularTrayectoria, calcularAceleracion, avanzarParticula, interpolarPosicion,
  calcularEnergiaMecanica, CONFIGURACION_TRAYECTORIA } = motor;
const fuente = (nC, x, y = 0, z = 0) => ({
  id: `${nC}:${x}:${y}:${z}`, valor: nC * 1e-9, posicion: { x, y, z },
});
const particula = (cambios = {}) => ({ id: 'prueba', carga: 1e-9, masa: 1e-6,
  posicion: { x: 0, y: 0, z: 0 }, velocidad: { x: 0, y: 0, z: 0 }, ...cambios });
const config = (cambios = {}) => ({ ...CONFIGURACION_TRAYECTORIA, ...cambios });
const cerca = (actual, esperado, tolerancia = 1e-10) => {
  assert.ok(Math.abs(actual - esperado) <= tolerancia, `${actual} != ${esperado} (tol ${tolerancia})`);
};
function validarResultado(r) {
  assert.equal(r.puntos.length, r.velocidades.length);
  assert.equal(r.puntos.length, r.tiempos.length);
  for (let i = 0; i < r.puntos.length; i++) {
    assert.ok([...Object.values(r.puntos[i]), ...Object.values(r.velocidades[i]), r.tiempos[i]]
      .every(Number.isFinite));
    if (i) assert.ok(r.tiempos[i] > r.tiempos[i - 1]);
  }
}

for (const signo of [-1, 1]) {
  test(`equilibrio exacto: dos fuentes ${signo > 0 ? 'positivas' : 'negativas'}`, () => {
    const p = particula();
    const r = simularTrayectoria(p, [fuente(signo * 2, -2.5), fuente(signo * 2, 2.5)]);
    validarResultado(r);
    assert.equal(r.motivoFinalizacion, 'tiempo_maximo');
    assert.equal(r.tiempos.at(-1), 10);
    assert.ok(r.puntos.every((punto) => punto.x === 0 && punto.y === 0 && punto.z === 0));
    assert.ok(r.velocidades.every((v) => v.x === 0 && v.y === 0 && v.z === 0));
    assert.equal(r.errorRelativoEnergiaMaximo, 0);
  });
}
for (const x of [-0.5, 0.5]) {
  test(`dos negativas: desplazamiento X=${x} acelera hacia ese lado`, () => {
    const p = particula({ posicion: { x, y: 0, z: 0 } });
    const cargas = [fuente(-2, -2.5), fuente(-2, 2.5)];
    const a = calcularAceleracion(p.posicion, p, cargas);
    const esperado = 8.9875517923e9 * 2e-9 * 1e-3 * (1 / 2 ** 2 - 1 / 3 ** 2);
    cerca(a.x, Math.sign(x) * esperado, 1e-15);
    const r = simularTrayectoria(p, cargas, config({ tiempoMaximo: 1 }));
    validarResultado(r);
    assert.ok(Math.sign(x) * r.velocidades.at(-1).x > 0);
    assert.ok(Math.sign(x) * (r.puntos.at(-1).x - x) > 0);
  });
}
for (const signo of [-1, 1]) {
  test(`dipolo: partícula ${signo > 0 ? 'positiva' : 'negativa'} acelera en el sentido correcto`, () => {
    const p = particula({ carga: signo * 1e-9 });
    const cargas = [fuente(-2, -2.5), fuente(2, 2.5)];
    const a = calcularAceleracion(p.posicion, p, cargas);
    cerca(a.x, -signo * 2 * 8.9875517923e9 * 2e-9 / 2.5 ** 2 * 1e-3, 1e-15);
    const r = simularTrayectoria(p, cargas, config({ tiempoMaximo: 1 }));
    validarResultado(r);
    assert.ok(signo * r.puntos.at(-1).x < 0);
  });
}
test('neutra en reposo: permanece inmóvil; aceleración neutra evita singularidad', () => {
  const p = particula({ carga: 0 });
  const r = simularTrayectoria(p, [fuente(2, 1)]);
  assert.deepEqual(r.puntos.at(-1), p.posicion);
  assert.deepEqual(calcularAceleracion(p.posicion, p, [fuente(2, 0)]), { x: 0, y: 0, z: 0 });
});
test('movimiento rectilíneo uniforme 3D sin fuerza, incluso con fuentes presentes', () => {
  for (const carga of [0, 1e-9]) {
    const p = particula({ carga, posicion: { x: 1, y: 2, z: 3 }, velocidad: { x: 0.3, y: -0.5, z: 0.7 } });
    const r = simularTrayectoria(p, carga === 0 ? [fuente(-2, -2)] : [],
      config({ pasoTiempo: 0.07, tiempoMaximo: 0.5 }));
    validarResultado(r);
    cerca(r.puntos.at(-1).x, 1.15);
    cerca(r.puntos.at(-1).y, 1.75);
    cerca(r.puntos.at(-1).z, 3.35);
    assert.deepEqual(r.velocidades.at(-1), p.velocidad);
    assert.equal(r.tiempos.at(-1), 0.5);
  }
});
for (const cantidad of [3, 5, 10]) {
  test(`superposición de ${cantidad} fuentes: aceleración y trayectoria 3D`, () => {
    const cargas = Array.from({ length: cantidad }, (_, i) => fuente(
      (i % 2 ? -1 : 1) * (i + 1), 2 * Math.cos(i * 2.4), 2 * Math.sin(i * 2.4), i % 3 - 1));
    const p = particula({ posicion: { x: 0.3, y: 0.6, z: 0.9 }, velocidad: { x: 0.2, y: -0.3, z: 0.4 } });
    const esperado = { x: 0, y: 0, z: 0 };
    for (const c of cargas) {
      const d = { x: p.posicion.x - c.posicion.x, y: p.posicion.y - c.posicion.y, z: p.posicion.z - c.posicion.z };
      const factor = 8.9875517923e9 * c.valor * p.carga / p.masa / Math.hypot(d.x, d.y, d.z) ** 3;
      for (const eje of ['x', 'y', 'z']) esperado[eje] += d[eje] * factor;
    }
    const actual = calcularAceleracion(p.posicion, p, cargas);
    for (const eje of ['x', 'y', 'z']) cerca(actual[eje], esperado[eje], 1e-14);
    const r = simularTrayectoria(p, cargas, config({ tiempoMaximo: 0.5 }));
    validarResultado(r);
    for (const eje of ['x', 'y', 'z']) assert.notEqual(r.puntos.at(-1)[eje], p.posicion[eje]);
    for (const eje of ['x', 'y', 'z']) assert.notEqual(r.velocidades.at(-1)[eje], p.velocidad[eje]);
    assert.ok(Math.abs(r.puntos.at(-1).z - p.posicion.z - 0.5 * p.velocidad.z) > 1e-7);
    assert.ok(r.errorRelativoEnergiaMaximo < 1e-6);
  });
}
test('RK4 respeta velocidad inicial y converge al reducir dt', () => {
  const p = particula({ masa: 1e-9, posicion: { x: 1, y: 0.2, z: 0.4 }, velocidad: { x: 0.1, y: 0.5, z: 0.7 } });
  const cargas = [fuente(2, 0)];
  const referencia = avanzarParticula(avanzarParticula(p, cargas, 0.0005), cargas, 0.0005);
  const pequeno = avanzarParticula(p, cargas, 0.001);
  const grande = avanzarParticula(p, cargas, 0.002);
  const referenciaGrande = avanzarParticula(avanzarParticula(p, cargas, 0.001), cargas, 0.001);
  const error = (a, b) => Math.hypot(a.velocidad.x - b.velocidad.x, a.velocidad.y - b.velocidad.y, a.velocidad.z - b.velocidad.z);
  assert.ok(error(grande, referenciaGrande) > 15 * error(pequeno, referencia));
  const dt = 1e-6, paso = avanzarParticula(p, cargas, dt);
  for (const eje of ['x', 'y', 'z']) cerca((paso.posicion[eje] - p.posicion[eje]) / dt, p.velocidad[eje], 1e-5);
});
test('órbita circular: energía y convergencia con paso máximo grande', (t) => {
  const k = 8.9875517923e9, mu = k * 2e-9;
  const periodo = 2 * Math.PI / Math.sqrt(mu);
  const p = particula({ carga: -1e-9, masa: 1e-9,
    posicion: { x: 1, y: 0, z: 0 }, velocidad: { x: 0, y: Math.sqrt(mu), z: 0 } });
  const cargas = [fuente(2, 0)];
  const r = simularTrayectoria(p, cargas, config({ pasoTiempo: 0.1, tiempoMaximo: periodo * 3 }));
  validarResultado(r);
  assert.equal(r.motivoFinalizacion, 'tiempo_maximo');
  assert.ok(r.errorRelativoEnergiaMaximo < 1e-6, `energía: ${r.errorRelativoEnergiaMaximo}`);
  const fin = r.puntos.at(-1);
  cerca(fin.x, 1, 3e-6); cerca(fin.y, 0, 3e-6); cerca(fin.z, 0);
  assert.ok(r.tiempos[2] - r.tiempos[0] < 0.1, 'el paso debe adaptarse');
  const energia = calcularEnergiaMecanica(p, cargas);
  cerca(energia, -0.5 * p.masa * mu, 1e-20);
  const fino = simularTrayectoria(p, cargas, config({ pasoTiempo: 0.02, tiempoMaximo: periodo * 3,
    toleranciaRelativa: 1e-12, toleranciaPosicion: 1e-13, toleranciaVelocidad: 1e-13 }));
  assert.equal(fino.motivoFinalizacion, 'tiempo_maximo');
  const errorPosicion = (r) => Math.hypot(r.puntos.at(-1).x - 1, r.puntos.at(-1).y, r.puntos.at(-1).z);
  assert.ok(errorPosicion(fino) < errorPosicion(r) / 5);
  assert.ok(fino.errorRelativoEnergiaMaximo < r.errorRelativoEnergiaMaximo);
  t.diagnostic(`Energía relativa máxima: ${r.errorRelativoEnergiaMaximo.toExponential(3)}; ` +
    `error tras tres órbitas: ${errorPosicion(r).toExponential(3)} m; refinado: ${errorPosicion(fino).toExponential(3)} m.`);
});
test('colisión entre muestras: neutra rápida y cruce rasante', () => {
  for (const y of [0, 0.049]) {
    const p = particula({ carga: 0, posicion: { x: -1, y, z: 0 }, velocidad: { x: 10, y: 0, z: 0 } });
    const r = simularTrayectoria(p, [fuente(-2, 0)], config({ pasoTiempo: 1, tiempoMaximo: 1 }));
    validarResultado(r);
    assert.equal(r.motivoFinalizacion, 'colision');
    cerca(Math.hypot(r.puntos.at(-1).x, r.puntos.at(-1).y), 0.05, 1e-10);
    cerca(r.tiempos.at(-1), (1 - Math.sqrt(0.05 ** 2 - y ** 2)) / 10, 1e-10);
  }
});
test('repulsión: desacelera y revierte la velocidad sin imponer una trayectoria', () => {
  const p = particula({ masa: 1e-9, posicion: { x: 1, y: 0, z: 0 },
    velocidad: { x: -1, y: 0, z: 0 } });
  const r = simularTrayectoria(p, [fuente(2, 0)], config({ pasoTiempo: 0.1, tiempoMaximo: 0.5 }));
  validarResultado(r);
  assert.equal(r.motivoFinalizacion, 'tiempo_maximo');
  assert.ok(Math.min(...r.puntos.map((p) => p.x)) < 1);
  assert.ok(r.velocidades.at(-1).x > 0);
  assert.ok(r.puntos.at(-1).x > 1);
  assert.ok(r.errorRelativoEnergiaMaximo < 1e-6);
});
test('atracción fuerte: adaptativo llega al contacto sin NaN y conserva energía', (t) => {
  const p = particula({ masa: 1e-9, posicion: { x: -1, y: 0, z: 0 }, velocidad: { x: 1, y: 0, z: 0 } });
  const r = simularTrayectoria(p, [fuente(-2, 0)], config({ pasoTiempo: 0.2, tiempoMaximo: 2 }));
  validarResultado(r);
  assert.equal(r.motivoFinalizacion, 'colision');
  cerca(Math.abs(r.puntos.at(-1).x), 0.05, 2e-8);
  assert.ok(r.errorRelativoEnergiaMaximo < 1e-6, `energía: ${r.errorRelativoEnergiaMaximo}`);
  t.diagnostic(`Contacto a ${r.tiempos.at(-1).toFixed(8)} s; energía relativa máxima: ${r.errorRelativoEnergiaMaximo.toExponential(3)}.`);
});
test('finaliza exactamente en tiempo, borde espacial, colisión inicial y presupuesto', () => {
  const p = particula({ carga: 0, velocidad: { x: 1, y: 0, z: 0 } });
  const tiempo = simularTrayectoria(p, [], config({ pasoTiempo: 0.001, tiempoMaximo: 10 }));
  assert.equal(tiempo.motivoFinalizacion, 'tiempo_maximo');
  assert.equal(tiempo.tiempos.at(-1), 10);
  const borde = simularTrayectoria({ ...p, velocidad: { x: 20, y: 0, z: 0 } }, [],
    config({ pasoTiempo: 1, tiempoMaximo: 1, limiteEspacio: 1 }));
  assert.equal(borde.motivoFinalizacion, 'limite_espacio');
  cerca(borde.puntos.at(-1).x, 1); cerca(borde.tiempos.at(-1), 0.05);
  assert.equal(simularTrayectoria(particula(), [fuente(2, 0)]).motivoFinalizacion, 'colision');
  const presupuesto = simularTrayectoria(p, [], config({ maximoPasos: 1, tiempoMaximo: 1 }));
  assert.equal(presupuesto.motivoFinalizacion, 'maximo_pasos');
  assert.ok(presupuesto.tiempos.at(-1) < 1);
  assert.equal(simularTrayectoria({ ...p, posicion: { x: 16, y: 0, z: 0 } }, []).motivoFinalizacion, 'limite_espacio');
});
test('entradas inválidas, desbordamiento y datos originales protegidos', () => {
  assert.throws(() => simularTrayectoria(particula({ masa: 0 }), []));
  assert.throws(() => simularTrayectoria(particula(), [], config({ pasoTiempo: 0 })));
  assert.throws(() => simularTrayectoria(particula(), [], config({ toleranciaRelativa: 0 })));
  assert.throws(() => avanzarParticula(particula({ carga: 0, velocidad: { x: 1e308, y: 0, z: 0 } }), [], 100));
  assert.throws(() => simularTrayectoria(particula(), Array.from({ length: 11 }, (_, i) => fuente(2, i))));
  const p = particula({ carga: 1e300, masa: 1e-300 });
  const r = simularTrayectoria(p, [fuente(2, 1)]);
  assert.equal(r.motivoFinalizacion, 'error_numerico'); validarResultado(r);
  const original = particula(), cargas = [fuente(-2, 2)];
  const copia = JSON.stringify([original, cargas]);
  simularTrayectoria(original, cargas, config({ tiempoMaximo: 0.1 }));
  assert.equal(JSON.stringify([original, cargas]), copia);
});
test('interpolación usa tiempos físicos no uniformes y respeta extremos', () => {
  const r = { puntos: [{ x: 0, y: 0, z: 0 }, { x: 2, y: 4, z: 6 }, { x: 4, y: 8, z: 12 }],
    tiempos: [0, 0.2, 1], velocidades: [], motivoFinalizacion: 'tiempo_maximo' };
  assert.deepEqual(interpolarPosicion(r, 0.1), { x: 1, y: 2, z: 3 });
  assert.deepEqual(interpolarPosicion(r, 0.6), { x: 3, y: 6, z: 9 });
  assert.deepEqual(interpolarPosicion(r, -1), r.puntos[0]);
  assert.deepEqual(interpolarPosicion(r, 2), r.puntos[2]);
});

// Ejecuta los callbacks reales de Particula3D con refs persistentes. Comprueba
// reproducción sin necesitar WebGL; la inspección visual se realiza aparte.
function reproductor(props) {
  const refs = []; let indice = 0, frame, posicion;
  const Line = () => null;
  const componente = cargarTS(path.join(__dirname, '../componentes/Particula3D.tsx'), {
    react: { useMemo: (f) => f(), useRef: (inicial) => refs[indice++] ??= { current: inicial } },
    '@react-three/fiber': { useFrame: (f) => { frame = f; } },
    '@react-three/drei': { Line },
  }).default;
  const render = (cambios = {}) => {
    props = { ...props, ...cambios }; indice = 0;
    const arbol = componente(props);
    refs[0].current = { position: { set: (x, y, z) => { posicion = { x, y, z }; } } };
    return arbol;
  };
  return { render, avanzar: (dt) => frame({}, dt), posicion: () => posicion };
}
test('reproducción: inicio exacto, pausa, reanudación, velocidad, reinicio y repetición', () => {
  const p = particula({ carga: 0, velocidad: { x: 1, y: 0, z: 0 } });
  const r = simularTrayectoria(p, [], config({ pasoTiempo: 0.1, tiempoMaximo: 1 }));
  const copia = JSON.stringify(r); let finales = 0;
  const visor = reproductor({ particula: p, trayectoria: r, reproduciendo: true, reinicio: 0,
    alFinalizar: () => finales++ });
  visor.render(); visor.avanzar(0.1); cerca(visor.posicion().x, 0);
  visor.avanzar(0.2); cerca(visor.posicion().x, 0.2);
  visor.render({ reproduciendo: false }); visor.avanzar(0.3); cerca(visor.posicion().x, 0.2);
  visor.render({ reproduciendo: true }); visor.avanzar(0.1); cerca(visor.posicion().x, 0.3);
  visor.render({ velocidadReproduccion: 2 }); visor.avanzar(0.1); cerca(visor.posicion().x, 0.5);
  visor.render({ reinicio: 1, reproduciendo: false }); visor.avanzar(0.2); cerca(visor.posicion().x, 0);
  visor.render({ reproduciendo: true }); visor.avanzar(1); cerca(visor.posicion().x, 1);
  assert.equal(finales, 1); visor.avanzar(1); assert.equal(finales, 1);
  visor.render({ reproduciendo: false }); visor.avanzar(0.1);
  visor.render({ reproduciendo: true }); visor.avanzar(0.1); cerca(visor.posicion().x, 0);
  visor.avanzar(0.1); cerca(visor.posicion().x, 0.2);
  assert.equal(JSON.stringify(r), copia, 'la reproducción no modifica los datos físicos');
  const nuevo = particula({ posicion: { x: 2, y: 3, z: 4 } });
  visor.render({ trayectoria: null, particula: nuevo, reproduciendo: false }); visor.avanzar(0.5);
  assert.deepEqual(visor.posicion(), nuevo.posicion);
});
test('partícula inmóvil: no se dibuja una línea ficticia', () => {
  const p = particula();
  const r = simularTrayectoria(p, [fuente(-2, -2.5), fuente(-2, 2.5)]);
  const visor = reproductor({ particula: p, trayectoria: r, reproduciendo: false });
  assert.equal(visor.render().props.children[0], false);
});

test('panel: nC a C, masa en kg e invalidación al modificar condiciones', () => {
  let nuevaParticula, nuevaConfiguracion, nuevaTrayectoria, reproduciendo;
  const p = particula();
  const c = config({ pasoTiempo: 0.002 });
  const controles = cargarTS(path.join(__dirname, '../controles/ControlesTrayectoria.tsx'), {
    react: { useState: (inicial) => [inicial, () => {}] },
  }).default;
  const arbol = controles({ cargas: [fuente(-2, -2.5), fuente(-2, 2.5)], modo: '3D', particula: p,
    configuracion: c, cambiarConfiguracion: (v) => { nuevaConfiguracion = v; },
    cambiarParticula: (v) => { nuevaParticula = v; }, trayectoria: null,
    cambiarTrayectoria: (v) => { nuevaTrayectoria = v; }, reproduciendo: false,
    cambiarReproduciendo: (v) => { reproduciendo = v; }, velocidadReproduccion: 1,
    cambiarVelocidadReproduccion: () => {}, reiniciarAnimacion: () => {} });
  const entradas = [], botones = [];
  function visitar(nodo) {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) { nodo.forEach(visitar); return; }
    if (nodo.type === 'input') entradas.push(nodo);
    if (nodo.type === 'button') botones.push(nodo);
    visitar(nodo.props?.children);
  }
  visitar(arbol);
  entradas[0].props.onChange({ target: { value: '-2.5' } });
  cerca(nuevaParticula.carga, -2.5e-9, 1e-24);
  assert.equal(nuevaTrayectoria, null); assert.equal(reproduciendo, false);
  entradas[1].props.onChange({ target: { value: '0.000002' } });
  cerca(nuevaParticula.masa, 2e-6, 1e-20);
  entradas[2].props.onChange({ target: { value: '0.5' } });
  assert.equal(nuevaParticula.posicion.x, 0.5);
  entradas[8].props.onChange({ target: { value: '0.005' } });
  assert.deepEqual(nuevaConfiguracion, { ...c, pasoTiempo: 0.005 });
  assert.equal(nuevaTrayectoria, null);
  // El lanzamiento real en equilibrio debe producir reposo, no una animación.
  botones[0].props.onClick();
  assert.equal(reproduciendo, true);
  assert.ok(nuevaTrayectoria.puntos.every((punto) => punto.x === 0 && punto.y === 0 && punto.z === 0));
});
