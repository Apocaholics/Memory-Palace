import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, randomInt, shuffle, formatCard, isRed } from '../src/cards.js';

const UINT32_RANGE = 2 ** 32;

// Повертає по черзі задані значення замість crypto.getRandomValues.
function sequence(values) {
  let i = 0;
  const next = () => values[i++];
  next.used = () => i;
  return next;
}

test('createDeck: 52 унікальні коди, по 13 кожної масті, без джокерів', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck).size, 52);
  for (const suit of ['S', 'H', 'D', 'C']) {
    assert.equal(deck.filter((code) => code.endsWith(suit)).length, 13);
  }
  for (const code of deck) {
    assert.match(code, /^(A|[2-9]|10|J|Q|K)[SHDC]$/);
  }
});

test('randomInt: межі генератора дають значення в [0, n)', () => {
  assert.equal(randomInt(52, sequence([0])), 0);
  // Найбільше значення, яке ще не відкидається, дає n - 1.
  const limit = UINT32_RANGE - (UINT32_RANGE % 52);
  assert.equal(randomInt(52, sequence([limit - 1])), 51);
  assert.equal(randomInt(1, sequence([UINT32_RANGE - 1])), 0);
});

test('randomInt: значення із зони зсуву відкидаються', () => {
  const next = sequence([UINT32_RANGE - 1, 5]);
  assert.equal(randomInt(52, next), 5);
  assert.equal(next.used(), 2);
});

test('randomInt: зі справжнім генератором лишається в [0, n)', () => {
  for (let i = 0; i < 1000; i++) {
    const value = randomInt(7);
    assert.ok(Number.isInteger(value) && value >= 0 && value < 7);
  }
});

test('shuffle: з детермінованим randomInt дає очікуваний порядок', () => {
  assert.deepEqual(shuffle(['a', 'b', 'c', 'd'], () => 0), ['b', 'c', 'd', 'a']);
  assert.deepEqual(shuffle(['a', 'b', 'c', 'd'], (n) => n - 1), ['a', 'b', 'c', 'd']);
});

test('shuffle: не губить, не дублює карт і не мутує вхід', () => {
  const deck = createDeck();
  const copy = [...deck];
  const shuffled = shuffle(deck);
  assert.deepEqual(deck, copy);
  assert.notEqual(shuffled, deck);
  assert.deepEqual([...shuffled].sort(), [...deck].sort());
});

test('formatCard: ранг і символ масті', () => {
  assert.equal(formatCard('QC'), 'Q♣');
  assert.equal(formatCard('10H'), '10♥');
  assert.equal(formatCard('AS'), 'A♠');
  assert.equal(formatCard('7D'), '7♦');
});

test('isRed: істинна лише для черв і бубон', () => {
  assert.equal(isRed('7H'), true);
  assert.equal(isRed('10D'), true);
  assert.equal(isRed('AS'), false);
  assert.equal(isRed('QC'), false);
});
