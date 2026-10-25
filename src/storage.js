import { createDeck } from './cards.js';
import { SESSION_VERSION } from './session.js';

export const STORAGE_KEY = 'mpc.session';

const PHASES = ['layout', 'memorize', 'write', 'check', 'summary'];
const DECK = new Set(createDeck());

const isIndex = (value, length) => Number.isInteger(value) && value >= 0 && value < length;

function isValidOrder(order) {
  return Array.isArray(order) && order.length === DECK.size && order.every((code) => DECK.has(code)) && new Set(order).size === DECK.size;
}

function isValidMarks(session) {
  const { marks, phase, order } = session;
  if (!Array.isArray(marks) || !marks.every((mark) => typeof mark === 'boolean')) return false;
  if (phase === 'check') return marks.length < order.length;
  if (phase === 'summary') return marks.length === order.length;
  return true;
}

// Повертає саму сесію, якщо вона цілісна, інакше null.
export function validateSession(value) {
  if (!value || typeof value !== 'object') return null;
  const valid =
    value.version === SESSION_VERSION &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    isValidOrder(value.order) &&
    PHASES.includes(value.phase) &&
    isIndex(value.layoutIndex, value.order.length) &&
    isValidMarks(value);
  return valid ? value : null;
}

// Будь-яка помилка сховища (приватний режим, заборона, null) означає роботу без збереження.
export function createSessionStore(storage) {
  function clear() {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // Сховище недоступне: очищати нічого.
    }
  }

  function load() {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
    if (raw === null) return null;
    let session = null;
    try {
      session = validateSession(JSON.parse(raw));
    } catch {
      // Пошкоджений JSON обробляється так само, як невалідна сесія.
    }
    if (!session) clear();
    return session;
  }

  function save(session) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Сховище недоступне: застосунок працює без збереження.
    }
  }

  return { load, save, clear };
}
