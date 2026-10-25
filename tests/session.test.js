import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck } from '../src/cards.js';
import { reduce, currentCheckCard, score, errorPositions } from '../src/session.js';

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
    version: 2,
    id: 'id-1',
    createdAt: '2026-10-24T22:51:03.123Z',
    order: ORDER,
    phase: 'layout',
    layoutIndex: 0,
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

test('backToLayout: із memorize на позицію 52 розкладки', () => {
  const s = reduce(session({ phase: 'memorize', layoutIndex: 51 }), { type: 'backToLayout' });
  assert.equal(s.phase, 'layout');
  assert.equal(s.layoutIndex, 51);
  assert.equal(reduce(s, { type: 'back' }).layoutIndex, 50);
});

test('startWriting: із memorize у write', () => {
  assert.equal(reduce(session({ phase: 'memorize', layoutIndex: 51 }), { type: 'startWriting' }).phase, 'write');
});

test('backToLayout і startWriting поза фазою memorize нічого не роблять', () => {
  for (const phase of ['layout', 'write', 'check', 'summary']) {
    const s = session({ phase, layoutIndex: 51 });
    assert.equal(reduce(s, { type: 'backToLayout' }), s);
    assert.equal(reduce(s, { type: 'startWriting' }), s);
  }
  assert.equal(reduce(null, { type: 'backToLayout' }), null);
  assert.equal(reduce(null, { type: 'startWriting' }), null);
});

const markAll = (s, oks) => oks.reduce((acc, ok) => reduce(acc, { type: 'mark', ok }), s);
const checking = (overrides = {}) => session({ phase: 'check', layoutIndex: 51, ...overrides });

test('startCheck: із write у check з порожніми позначками, перша карта поточна', () => {
  const s = reduce(session({ phase: 'write', layoutIndex: 51 }), { type: 'startCheck' });
  assert.equal(s.phase, 'check');
  assert.deepEqual(s.marks, []);
  assert.equal(currentCheckCard(s), ORDER[0]);
});

test('startCheck поза фазою write нічого не робить', () => {
  for (const phase of ['layout', 'memorize', 'check', 'summary']) {
    const s = session({ phase, layoutIndex: 51 });
    assert.equal(reduce(s, { type: 'startCheck' }), s);
  }
  assert.equal(reduce(null, { type: 'startCheck' }), null);
});

test('кроку «Відкрити» немає: дія reveal нічого не робить', () => {
  const s = checking();
  assert.equal(reduce(s, { type: 'reveal' }), s);
  assert.equal('revealed' in s, false);
});

test('mark: записує позначку, поточною стає наступна карта', () => {
  const s = reduce(checking(), { type: 'mark', ok: false });
  assert.deepEqual(s.marks, [false]);
  assert.equal(s.phase, 'check');
  assert.equal(currentCheckCard(s), ORDER[1]);
});

test('mark поза фазою check нічого не робить', () => {
  for (const phase of ['layout', 'memorize', 'write']) {
    const s = session({ phase, layoutIndex: 51 });
    assert.equal(reduce(s, { type: 'mark', ok: true }), s);
  }
  assert.equal(reduce(null, { type: 'mark', ok: true }), null);
});

test('mark: 52-га позначка переводить у summary', () => {
  const s51 = markAll(checking(), Array(51).fill(true));
  assert.equal(s51.phase, 'check');
  const done = markAll(s51, [false]);
  assert.equal(done.phase, 'summary');
  assert.equal(done.marks.length, 52);
  assert.equal(reduce(done, { type: 'mark', ok: true }), done);
});

test('undo: прибирає останню позначку, поточною знову стає попередня карта', () => {
  const s = reduce(checking({ marks: [true, false] }), { type: 'undo' });
  assert.deepEqual(s.marks, [true]);
  assert.equal(currentCheckCard(s), ORDER[1]);
});

test('undo кілька разів поспіль до позиції 1', () => {
  let s = markAll(checking(), [true, false, true]);
  for (let i = 0; i < 3; i++) s = reduce(s, { type: 'undo' });
  assert.deepEqual(s.marks, []);
  assert.equal(currentCheckCard(s), ORDER[0]);
});

test('undo з порожніми позначками чи поза check нічого не робить', () => {
  const empty = checking();
  assert.equal(reduce(empty, { type: 'undo' }), empty);
  const summary = session({ phase: 'summary', layoutIndex: 51, marks: Array(52).fill(true) });
  assert.equal(reduce(summary, { type: 'undo' }), summary);
});

test('currentCheckCard = order[marks.length]', () => {
  assert.equal(currentCheckCard(checking()), ORDER[0]);
  assert.equal(currentCheckCard(checking({ marks: [true, false, true] })), ORDER[3]);
});

const summary = (marks) => session({ phase: 'summary', layoutIndex: 51, marks });

test('score і errorPositions: змішаний випадок', () => {
  const marks = Array(52).fill(true);
  marks[11] = false;
  marks[2] = false;
  marks[51] = false;
  const s = summary(marks);
  assert.equal(score(s), 49);
  assert.deepEqual(errorPositions(s), [3, 12, 52]);
});

test('усі 52 правильно: 52 / 52 і без помилок', () => {
  const s = summary(Array(52).fill(true));
  assert.equal(score(s), 52);
  assert.deepEqual(errorPositions(s), []);
});

test('усі 52 помилкові: 0 / 52 і список із 52 позицій', () => {
  const s = summary(Array(52).fill(false));
  assert.equal(score(s), 0);
  assert.deepEqual(errorPositions(s), Array.from({ length: 52 }, (_, i) => i + 1));
});

test('reset з будь-якої фази повертає null', () => {
  for (const phase of ['layout', 'memorize', 'write', 'check', 'summary']) {
    assert.equal(reduce(session({ phase }), { type: 'reset' }), null);
  }
  assert.equal(reduce(null, { type: 'reset' }), null);
});
