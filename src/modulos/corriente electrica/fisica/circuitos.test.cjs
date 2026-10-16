const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const archivo = path.join(__dirname, 'circuitos.ts');
const codigo = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const modulo = { exports: {} };
new Function('module', 'exports', 'require', codigo)(modulo, modulo.exports, require);
const { resistenciaEquivalente, resolverCircuito, crearEjemplo, calcularOhm, actualizarNodo } = modulo.exports;
const cerca = (a, b) => assert.ok(Math.abs(a - b) < 1e-10 * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('serie: resistencia total, corriente común y ley de tensiones', () => {
  const red = crearEjemplo('serie');
  const r = resolverCircuito(red, 12);
  cerca(r.resistencia, 600); cerca(r.corriente, 0.02);
  cerca(r.elementos.slice(1).reduce((s, e) => s + e.voltaje, 0), 12);
  r.elementos.slice(1).forEach(e => cerca(e.corriente, r.corriente));
});
test('paralelo: voltaje común y ley de corrientes', () => {
  const r = resolverCircuito(crearEjemplo('paralelo'), 12);
  cerca(r.resistencia, 600 / 11); cerca(r.corriente, 0.22);
  r.elementos.slice(1).forEach(e => cerca(e.voltaje, 12));
  cerca(r.elementos.slice(1).reduce((s, e) => s + e.corriente, 0), r.corriente);
});
test('mixto: R1 + (R2 || R3), reparto de tensión y potencia', () => {
  const r = resolverCircuito(crearEjemplo('mixto'), 22);
  cerca(r.resistencia, 220); cerca(r.corriente, 0.1); cerca(r.potencia, 2.2);
  const porId = Object.fromEntries(r.elementos.map(e => [e.id, e]));
  cerca(porId.R1.voltaje, 10); cerca(porId.R2.voltaje, 12); cerca(porId.R3.voltaje, 12);
  cerca(porId.R2.corriente + porId.R3.corriente, porId.R1.corriente);
  cerca(porId.R1.potencia + porId.R2.potencia + porId.R3.potencia, r.potencia);
});
test('grupos anidados: conservación de potencia y suma de corrientes', () => {
  const red = { id: 'raiz', tipo: 'paralelo', elementos: [crearEjemplo('mixto'),
    { id: 's', tipo: 'serie', elementos: [{ id: 'a', tipo: 'resistencia', ohmios: 20 }, { id: 'b', tipo: 'resistencia', ohmios: 80 }] }] };
  const r = resolverCircuito(red, 10);
  cerca(r.corriente, 10 / 220 + 0.1);
  cerca(r.elementos.filter(e => ['R1','R2','R3','a','b'].includes(e.id)).reduce((s,e) => s + e.potencia, 0), r.potencia);
});
test('voltaje cero: corrientes, tensiones y potencias nulas', () => {
  resolverCircuito(crearEjemplo('mixto'), 0).elementos.forEach(e => {
    cerca(e.corriente, 0); cerca(e.voltaje, 0); cerca(e.potencia, 0);
  });
});
test('invertir fuente invierte corriente y tensión, conserva disipación', () => {
  const a = resolverCircuito(crearEjemplo('mixto'), 12);
  const b = resolverCircuito(crearEjemplo('mixto'), -12);
  a.elementos.forEach((e,i) => { cerca(e.corriente, -b.elementos[i].corriente); cerca(e.voltaje, -b.elementos[i].voltaje); cerca(e.potencia, b.elementos[i].potencia); });
});
test('ley de Ohm: proporcionalidad V-I y relación inversa con R', () => {
  cerca(calcularOhm(10, 100).corriente, 0.1);
  cerca(calcularOhm(20, 100).corriente, 0.2);
  cerca(calcularOhm(10, 200).corriente, 0.05);
  cerca(calcularOhm(10, 100).potencia, 1);
});
test('rechaza valores inválidos y conexiones vacías', () => {
  for (const ohmios of [0,-1,NaN,Infinity]) assert.throws(() => resistenciaEquivalente({ id:'r',tipo:'resistencia',ohmios }));
  assert.throws(() => resistenciaEquivalente({ id:'s',tipo:'serie',elementos:[] }));
  assert.throws(() => calcularOhm(Infinity, 10));
});
test('edición inmutable recalcula el circuito sin modificar el original', () => {
  const red = crearEjemplo('serie');
  const nueva = actualizarNodo(red, 'R1', n => ({ ...n, ohmios: 400 }));
  cerca(resistenciaEquivalente(red), 600); cerca(resistenciaEquivalente(nueva), 900);
});
