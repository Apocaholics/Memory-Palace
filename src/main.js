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

// Під час розкладки й перевірки екран не гасне. Без API чи при відмові браузера працюємо без цього.
const AWAKE_PHASES = ['layout', 'check'];
let wakeLock = null;
let wakeLockRequested = false;

const wakeLockWanted = () => AWAKE_PHASES.includes(session?.phase) && document.visibilityState === 'visible';

function releaseWakeLock() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}

async function syncWakeLock() {
  if (!wakeLockWanted()) {
    releaseWakeLock();
    return;
  }
  if (wakeLock || wakeLockRequested || !navigator.wakeLock) return;
  wakeLockRequested = true;
  try {
    const lock = await navigator.wakeLock.request('screen');
    // Браузер сам відпускає lock, коли вкладка ховається; visibilitychange запитає його знову.
    lock.addEventListener('release', () => {
      if (wakeLock === lock) wakeLock = null;
    });
    wakeLock = lock;
    if (!wakeLockWanted()) releaseWakeLock();
  } catch {
    // Відмова (енергозбереження, політика браузера) не заважає тренуванню.
  } finally {
    wakeLockRequested = false;
  }
}

onTransition((prev, next) => (next ? store.save(next) : store.clear()));
onTransition(syncWakeLock);
document.addEventListener('visibilitychange', syncWakeLock);

init(onAction);
render(session);
syncWakeLock();
