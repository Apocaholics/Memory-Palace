import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../src/cards.js';
import { reduce } from '../src/session.js';

const ORDER = createDeck();
const START = { type: 'start', order: ORDER, id: 'id-1', createdAt: '2026-10-24T22:51:03.123Z' };

// Заморожений стан: будь-яка спроба мутації в reduce кине TypeError.
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function session(overrides = {}) {
  return deepFreeze({ ...reduce(null, START), ...overrides });
}

test('start: нова сесія на позиції 1 розкладки', () => {
  assert.deepEqual(reduce(null, START), {
    version: 1,
    id: 'id-1',
    createdAt: '2026-10-24T22:51:03.123Z',
    order: ORDER,
    phase: 'layout',
    layoutIndex: 0,
    revealed: false,
    marks: [],
  });
});

test('start: при наявній сесії нічого не робить', () => {
  const s = session({ layoutIndex: 10 });
  assert.equal(reduce(s, { ...START, id: 'id-2' }), s);
});

test('дії без сесії повертають null', () => {
  for (const type of ['next', 'back', 'layoutDone']) {
    assert.equal(reduce(null, { type }), null);
  }
});

test('next: наступна позиція, на останній нічого не робить', () => {
  assert.equal(reduce(session({ layoutIndex: 0 }), { type: 'next' }).layoutIndex, 1);
  assert.equal(reduce(session({ layoutIndex: 50 }), { type: 'next' }).layoutIndex, 51);
  const last = session({ layoutIndex: 51 });
  assert.equal(reduce(last, { type: 'next' }), last);
});

test('back: попередня позиція, на першій нічого не робить', () => {
  assert.equal(reduce(session({ layoutIndex: 51 }), { type: 'back' }).layoutIndex, 50);
  assert.equal(reduce(session({ layoutIndex: 1 }), { type: 'back' }).layoutIndex, 0);
  const first = session({ layoutIndex: 0 });
  assert.equal(reduce(first, { type: 'back' }), first);
});

test('layoutDone: лише на позиції 52 переводить у memorize', () => {
  const done = reduce(session({ layoutIndex: 51 }), { type: 'layoutDone' });
  assert.equal(done.phase, 'memorize');
  assert.equal(done.layoutIndex, 51);
  const notLast = session({ layoutIndex: 50 });
  assert.equal(reduce(notLast, { type: 'layoutDone' }), notLast);
});

test('дії розкладки поза фазою layout нічого не роблять', () => {
  const s = session({ phase: 'memorize', layoutIndex: 51 });
  for (const type of ['next', 'back', 'layoutDone']) {
    assert.equal(reduce(s, { type }), s);
  }
});

test('невідома дія повертає ту саму сесію', () => {
  const s = session();
  assert.equal(reduce(s, { type: 'unknown' }), s);
});
