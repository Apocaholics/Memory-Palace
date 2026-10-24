import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../src/cards.js';
import { reduce } from '../src/session.js';
import { createSessionStore, validateSession, STORAGE_KEY } from '../src/storage.js';

const ORDER = createDeck();
const START = { type: 'start', order: ORDER, id: 'id-1', createdAt: '2026-10-24T22:51:03.123Z' };

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error('SecurityError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

function run(...types) {
  return types.reduce((s, type) => reduce(s, typeof type === 'string' ? { type } : type), reduce(null, START));
}

const toLast = Array(51).fill('next');
const VALID = {
  layout: run('next'),
  memorize: run(...toLast, 'layoutDone'),
  write: run(...toLast, 'layoutDone', 'startWriting'),
  checkClosed: run(...toLast, 'layoutDone', 'startWriting', 'startCheck', 'reveal', { type: 'mark', ok: false }),
  checkOpen: run(...toLast, 'layoutDone', 'startWriting', 'startCheck', 'reveal'),
  summary: { ...run(...toLast, 'layoutDone', 'startWriting', 'startCheck'), phase: 'summary', marks: Array(52).fill(true) },
};

test('validateSession приймає валідну сесію кожної фази', () => {
  for (const [name, session] of Object.entries(VALID)) {
    assert.equal(validateSession(session), session, name);
  }
});

test('validateSession відкидає пошкоджені дані', () => {
  const base = VALID.checkClosed;
  const swapped = [...ORDER];
  swapped[1] = swapped[0];
  const invalid = {
    'не обʼєкт': 'session',
    null: null,
    'чужа версія': { ...base, version: 2 },
    'без id': { ...base, id: undefined },
    'без createdAt': { ...base, createdAt: 5 },
    'неповна колода': { ...base, order: ORDER.slice(1) },
    дублікати: { ...base, order: swapped },
    'невідома карта': { ...base, order: [...ORDER.slice(1), 'XX'] },
    'невідома фаза': { ...base, phase: 'done' },
    'layoutIndex > 51': { ...base, layoutIndex: 52 },
    'layoutIndex < 0': { ...base, layoutIndex: -1 },
    'layoutIndex дробовий': { ...base, layoutIndex: 1.5 },
    'revealed не boolean': { ...base, revealed: 'yes' },
    'marks не масив': { ...base, marks: 'true' },
    'marks не boolean': { ...base, marks: [1] },
    'забагато marks у check': { ...base, marks: Array(52).fill(true) },
    'неповні marks у summary': { ...VALID.summary, marks: Array(51).fill(true) },
    'revealed поза check': { ...VALID.layout, revealed: true },
  };
  for (const [name, value] of Object.entries(invalid)) {
    assert.equal(validateSession(value), null, name);
  }
});

test('save і load: сесія переживає перезавантаження під ключем mpc.session', () => {
  const storage = fakeStorage();
  createSessionStore(storage).save(VALID.checkOpen);
  assert.equal(STORAGE_KEY, 'mpc.session');
  assert.ok(storage.data.has('mpc.session'));
  assert.deepEqual(createSessionStore(storage).load(), VALID.checkOpen);
});

test('load без збереженої сесії повертає null', () => {
  assert.equal(createSessionStore(fakeStorage()).load(), null);
});

test('пошкоджений JSON чи невалідна сесія: null і очищення сховища', () => {
  for (const raw of ['{not json', JSON.stringify({ ...VALID.layout, version: 2 }), JSON.stringify({ ...VALID.layout, order: ORDER.slice(1) })]) {
    const storage = fakeStorage({ [STORAGE_KEY]: raw });
    assert.equal(createSessionStore(storage).load(), null);
    assert.equal(storage.data.has(STORAGE_KEY), false);
  }
});

test('clear видаляє збережену сесію', () => {
  const storage = fakeStorage();
  const store = createSessionStore(storage);
  store.save(VALID.layout);
  store.clear();
  assert.equal(store.load(), null);
});

test('недоступне сховище не кидає винятків', () => {
  for (const storage of [throwingStorage(), null]) {
    const store = createSessionStore(storage);
    assert.equal(store.load(), null);
    assert.doesNotThrow(() => store.save(VALID.layout));
    assert.doesNotThrow(() => store.clear());
  }
});
