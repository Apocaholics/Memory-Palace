import { createDeck, shuffle } from './cards.js';
import { reduce } from './session.js';
import { createSessionStore } from './storage.js';
import { init, render } from './ui.js';

// Сам доступ до localStorage може кинути виняток (заборона cookies, приватний режим).
function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const store = createSessionStore(browserStorage());
let session = store.load();

// Слухачі викликаються після кожного переходу: збереження, wake lock, у майбутньому таймери.
const listeners = [];

function onTransition(listener) {
  listeners.push(listener);
}

function dispatch(action) {
  const next = reduce(session, action);
  if (next === session) return;
  const prev = session;
  session = next;
  render(session);
  for (const listener of listeners) listener(prev, next);
}

function onAction(action) {
  if (action.type === 'newDeck') {
    dispatch({ type: 'reset' });
    dispatch({
      type: 'start',
      order: shuffle(createDeck()),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    return;
  }
  dispatch(action);
}

onTransition((prev, next) => (next ? store.save(next) : store.clear()));

init(onAction);
render(session);
