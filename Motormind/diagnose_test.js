import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnose } from './diagnose.js';

test('devuelve las causas de un código, de la más a la menos probable', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301'] });
  assert.deepEqual(r.causes.map((c) => c.id), ['bobina-cil1', 'bujias', 'inyector-cil1']);
});

test('respeta el formato de la respuesta', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301'] });
  assert.equal(r.vehicle, 'Chery Tiggo 4 Pro 1.5T');
  assert.deepEqual(r.codes, [{ code: 'P0301', description: 'Fallo de encendido en el cilindro 1' }]);
  assert.deepEqual(r.notFound, []);
  assert.deepEqual(r.causes[0], {
    id: 'bobina-cil1',
    title: 'Bobina de encendido del cilindro 1 averiada',
    component: 'Bobina de encendido cil. 1',
    probability: 0.45,
    codes: ['P0301'],
    steps: [
      { text: 'Intercambiar la bobina del cilindro 1 con la del 2 y borrar los códigos', expected: 'Si la bobina es la causa, el fallo pasa a P0302' },
      { text: 'Medir la resistencia del primario', expected: '0,5–0,8 Ω' },
    ],
  });
});

test('un vehículo que no existe es un error', () => {
  assert.throws(() => diagnose({ vehicleId: 'no-existe', codes: ['P0300'] }));
});

test('un código desconocido va a notFound y el resto se diagnostica igual', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301', 'P9999'] });
  assert.deepEqual(r.notFound, ['P9999']);
  assert.deepEqual(r.codes, [{ code: 'P0301', description: 'Fallo de encendido en el cilindro 1' }]);
  assert.deepEqual(r.causes.map((c) => c.id), ['bobina-cil1', 'bujias', 'inyector-cil1']);
});

test('solo códigos desconocidos: sin causas y todos en notFound', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P9999'] });
  assert.deepEqual(r.codes, []);
  assert.deepEqual(r.notFound, ['P9999']);
  assert.deepEqual(r.causes, []);
});

test('el resultado no depende del orden de los códigos', () => {
  const a = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301', 'P9999', 'P0300', 'P8888'] });
  const b = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P8888', 'P0300', 'P9999', 'P0301'] });
  assert.deepEqual(a, b);
});

test('codes y notFound salen ordenados alfabéticamente', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P9999', 'P0301', 'P8888', 'P0300'] });
  assert.deepEqual(r.codes.map((c) => c.code), ['P0300', 'P0301']);
  assert.deepEqual(r.notFound, ['P8888', 'P9999']);
});

test('los códigos repetidos se deduplican', () => {
  const once = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301', 'P9999'] });
  const twice = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301', 'P9999', 'P0301', 'P9999'] });
  assert.deepEqual(twice, once);
});

test('lista vacía: respuesta vacía sin error', () => {
  assert.deepEqual(diagnose({ vehicleId: 'tiggo4-15t', codes: [] }), {
    vehicle: 'Chery Tiggo 4 Pro 1.5T',
    codes: [],
    notFound: [],
    causes: [],
  });
});

test('los empates de probabilidad se desempatan por id', () => {
  // inyector-cil1 y toma-aire tienen 0.25 tras combinar P0300 y P0301
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0300', 'P0301'] });
  assert.deepEqual(r.causes.map((c) => c.id), [
    'bobina-cil1',
    'bujias',
    'inyector-cil1',
    'toma-aire',
    'presion-combustible',
  ]);
});

test('vehículo inexistente: el error nombra el vehículo, incluso con lista vacía', () => {
  assert.throws(() => diagnose({ vehicleId: 'no-existe', codes: ['P0300'] }), /Vehículo no encontrado: no-existe/);
  assert.throws(() => diagnose({ vehicleId: 'no-existe', codes: [] }), /Vehículo no encontrado: no-existe/);
});

test('el código se normaliza con trim y mayúsculas', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: [' p0301 '] });
  assert.deepEqual(r.codes, [{ code: 'P0301', description: 'Fallo de encendido en el cilindro 1' }]);
  assert.deepEqual(r.notFound, []);
});

test('una clave del manual con espacios se encuentra igual (Golf "P0420 ")', () => {
  const r = diagnose({ vehicleId: 'golf7-14tsi', codes: ['P0420'] });
  assert.deepEqual(r.notFound, []);
  assert.deepEqual(r.codes.map((c) => c.code), ['P0420']);
  assert.deepEqual(r.causes.map((c) => c.id), ['catalizador', 'sonda-posterior']);
});

test('una causa referenciada que no está en el catálogo se omite y el resto se devuelve', () => {
  // en el Tiggo, P0420 apunta a sonda-anterior, que no está definida
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0420'] });
  assert.deepEqual(r.codes, [{ code: 'P0420', description: 'Eficiencia del catalizador por debajo del umbral (banco 1)' }]);
  assert.deepEqual(r.notFound, []);
  assert.deepEqual(r.causes.map((c) => c.id), ['catalizador', 'sonda-posterior']);
});

test('entrada inválida lanza TypeError', () => {
  assert.throws(() => diagnose({ vehicleId: 'tiggo4-15t', codes: 'P0301' }), TypeError);
  assert.throws(() => diagnose({ vehicleId: 'tiggo4-15t', codes: [301] }), TypeError);
  assert.throws(() => diagnose({ vehicleId: 'tiggo4-15t' }), TypeError);
});

test('causa compartida: una sola entrada con la probabilidad máxima y todos los códigos', () => {
  const r = diagnose({ vehicleId: 'tiggo4-15t', codes: ['P0301', 'P0300'] });
  const bujias = r.causes.filter((c) => c.id === 'bujias');
  assert.equal(bujias.length, 1);
  assert.equal(bujias[0].probability, 0.4);
  assert.deepEqual(bujias[0].codes, ['P0300', 'P0301']);
  assert.equal(bujias[0].title, 'Bujías desgastadas o con separación incorrecta');
  assert.equal(new Set(r.causes.map((c) => c.id)).size, r.causes.length);
});

test('el catálogo de causas es por vehículo, no global', () => {
  const r = diagnose({ vehicleId: 'golf7-14tsi', codes: ['P0300'] });
  const bujias = r.causes.find((c) => c.id === 'bujias');
  assert.equal(bujias.title, 'Bujías desgastadas');
  assert.equal(bujias.probability, 0.35);
  assert.equal(bujias.steps[0].expected, '0,8–0,9 mm');
});

test('llamarla dos veces con la misma entrada da lo mismo, aunque haya llamadas en el medio', () => {
  const input = { vehicleId: 'tiggo4-15t', codes: ['P0300', 'P0301'] };
  const first = diagnose(input);
  diagnose({ vehicleId: 'golf7-14tsi', codes: ['P0300', 'P0171'] });
  diagnose({ vehicleId: 'clio4-15dci', codes: ['P0401'] });
  assert.deepEqual(diagnose(input), first);
});

test('no muta el array de entrada', () => {
  const codes = Object.freeze(['P0301', 'P9999', 'P0300', 'P0300']);
  assert.doesNotThrow(() => diagnose({ vehicleId: 'tiggo4-15t', codes }));
  assert.deepEqual([...codes], ['P0301', 'P9999', 'P0300', 'P0300']);
});

test('mutar el resultado no contamina las llamadas siguientes (aliasing con el manual)', async () => {
  const { diagnose: fresh } = await import('./diagnose.js?fresh-instance');
  const input = { vehicleId: 'tiggo4-15t', codes: ['P0301'] };
  const first = diagnose(input);
  first.causes[0].steps[0].text = 'MUTADO';
  first.causes[0].steps.push({ text: 'extra', expected: 'extra' });
  first.causes[0].title = 'MUTADO';
  first.causes[0].codes.push('P0000');
  first.codes[0].description = 'MUTADO';
  assert.deepEqual(diagnose(input), fresh(input));
});

test('dos resultados no comparten referencias entre sí', () => {
  const input = { vehicleId: 'tiggo4-15t', codes: ['P0301'] };
  const a = diagnose(input);
  const b = diagnose(input);
  assert.notEqual(a.causes[0].steps, b.causes[0].steps);
  assert.notEqual(a.causes[0].steps[0], b.causes[0].steps[0]);
});

test('el resultado es igual para cualquier permutación de los códigos', () => {
  const base = ['P0300', 'P0301', 'P9999', 'P8888'];
  const permutations = (xs) =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
  const expected = diagnose({ vehicleId: 'tiggo4-15t', codes: base });
  const all = permutations(base);
  assert.equal(all.length, 24);
  for (const codes of all) {
    assert.deepEqual(diagnose({ vehicleId: 'tiggo4-15t', codes }), expected, codes.join(','));
  }
});

test('empate real sin fusión (Golf: bujias y caudalimetro en 0,35) se desempata por id', () => {
  const r = diagnose({ vehicleId: 'golf7-14tsi', codes: ['P0171', 'P0300'] });
  assert.deepEqual(r.causes.map((c) => c.id), [
    'bobina-lapiz',
    'toma-aire',
    'bujias',
    'caudalimetro',
    'presion-combustible',
    'carbonilla',
  ]);
});
