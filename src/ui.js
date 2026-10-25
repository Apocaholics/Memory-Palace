import { formatCard, isRed } from './cards.js';
import { currentCheckCard, errorPositions, score } from './session.js';

const TEXT = {
  appName: 'Палац пам\'яті',
  newDeck: 'Нова колода',
  startLead: 'Тренажер запам\'ятовування колоди з 52 карт.',
  step1: 'Отримайте випадковий порядок і складіть за ним фізичну колоду.',
  step2: 'Запам\'ятайте колоду, гортаючи її в руках.',
  step3: 'Запишіть порядок карт з пам\'яті на папері.',
  step4: 'Звірте запис: сайт відкриватиме карти по одній.',
  back: 'Назад',
  next: 'Далі',
  layoutDone: 'Колода складена',
  memorizeText: 'Гортайте колоду й запам\'ятовуйте. Коли будете готові записувати, натисніть кнопку.',
  backToLayout: 'Повернутися до розкладки',
  startWriting: 'Записую',
  writeText: 'Запишіть колоду з пам\'яті на папері. Коли закінчите, натисніть «Перевірити».',
  startCheck: 'Перевірити',
  position: 'Позиція',
  markOk: '✓',
  markOkLabel: 'Збіглося',
  markFail: '✗',
  markFailLabel: 'Помилка',
  undo: 'Скасувати',
  errorsTitle: 'Помилки',
  noErrors: 'Без помилок',
  confirmNewDeck: 'Почати нову колоду? Поточна сесія буде втрачена.',
  yes: 'Так',
  cancel: 'Скасувати',
};

const $ = (selector) => document.querySelector(selector);

// Кнопка, що щойно з'явилась під пальцем, не приймає другий тап подвійного натискання.
const DOUBLE_TAP_MS = 400;
// Посеред сесії «Нова колода» спершу питає підтвердження; на «Старті» й підсумку ні.
const SCREENS_WITHOUT_CONFIRM = ['start', 'summary'];
let currentScreen = 'start';

// Клавіша натискає відповідну кнопку поточного екрана, лише якщо та видима й активна.
const KEY_BUTTONS = {
  ArrowRight: '[data-action="next"]',
  ' ': '[data-action="next"]',
  ArrowLeft: '[data-action="back"]',
  1: '[data-action="mark"][data-ok="true"]',
  2: '[data-action="mark"][data-ok="false"]',
  Backspace: '[data-action="undo"]',
};
const shownAt = new WeakMap();

function armDoubleTapGuard(el) {
  shownAt.set(el, performance.now());
}

function setHidden(el, hidden) {
  if (el.hidden && !hidden) armDoubleTapGuard(el);
  el.hidden = hidden;
}

function justShown(button) {
  const now = performance.now();
  return [button, button.closest('[data-screen]')].some((el) => el && now - (shownAt.get(el) ?? -Infinity) < DOUBLE_TAP_MS);
}

// Кнопки з data-action перетворюються на дії; що з ними робити, вирішує main.js.
export function init(onAction) {
  document.title = TEXT.appName;
  for (const el of document.querySelectorAll('[data-text]')) {
    el.textContent = TEXT[el.dataset.text];
  }
  for (const el of document.querySelectorAll('[data-label]')) {
    el.setAttribute('aria-label', TEXT[el.dataset.label]);
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    // detail > 0 лише для кліку вказівником; клавіатура захисту не потребує.
    if (event.detail > 0 && justShown(button)) return;
    const action = { type: button.dataset.action };
    if (button.dataset.ok) action.ok = button.dataset.ok === 'true';
    if (action.type === 'newDeck' && !SCREENS_WITHOUT_CONFIRM.includes(currentScreen)) {
      $('#confirm-new-deck').showModal();
      return;
    }
    onAction(action);
  });
  const dialog = $('#confirm-new-deck');
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'yes') onAction({ type: 'newDeck' });
    dialog.returnValue = '';
  });
  document.addEventListener('keydown', (event) => {
    const selector = KEY_BUTTONS[event.key];
    if (!selector || event.ctrlKey || event.altKey || event.metaKey || dialog.open) return;
    const button = [...document.querySelectorAll(`[data-screen="${currentScreen}"] :is(${selector})`)].find(
      (candidate) => !candidate.hidden && !candidate.disabled,
    );
    if (!button) return;
    // Без цього Пробіл ще й натиснув би кнопку у фокусі, а Пробіл чи Backspace прокрутили б сторінку.
    event.preventDefault();
    button.click();
  });
}

export function render(session) {
  const screen = session ? session.phase : 'start';
  currentScreen = screen;
  for (const section of document.querySelectorAll('[data-screen]')) {
    setHidden(section, section.dataset.screen !== screen);
  }
  // Карти з інших екранів (зокрема список помилок минулого підсумку) не лишаються в DOM навіть у прихованих секціях.
  for (const slot of document.querySelectorAll('.card-slot, #summary-errors')) {
    slot.replaceChildren();
  }
  if (screen === 'layout') renderLayout(session);
  if (screen === 'check') renderCheck(session);
  if (screen === 'summary') renderSummary(session);
}

function renderLayout(session) {
  const total = session.order.length;
  const index = session.layoutIndex;
  const isLast = index === total - 1;
  $('#layout-position').textContent = `${index + 1} / ${total}`;
  $('#layout-card').replaceChildren(cardFace(session.order[index]));
  $('[data-screen="layout"] [data-action="back"]').disabled = index === 0;
  setHidden($('[data-screen="layout"] [data-action="next"]'), isLast);
  setHidden($('[data-screen="layout"] [data-action="layoutDone"]'), !isLast);
}

// У DOM лише поточна карта: наступна з'являється тільки після позначки поточної.
function renderCheck(session) {
  const total = session.order.length;
  const { marks } = session;
  $('#check-position').textContent = `${TEXT.position} ${marks.length + 1} / ${total}`;
  $('#check-card').replaceChildren(cardFace(currentCheckCard(session)));
  // ✓/✗ лишаються на місці, тож без цього подвійний тап позначив би й наступну карту.
  for (const button of document.querySelectorAll('[data-screen="check"] [data-action="mark"]')) {
    armDoubleTapGuard(button);
  }
  $('[data-screen="check"] [data-action="undo"]').disabled = marks.length === 0;
}

function renderSummary(session) {
  const errors = errorPositions(session);
  $('#summary-score').textContent = `${score(session)} / ${session.order.length}`;
  $('#summary-no-errors').hidden = errors.length > 0;
  $('#summary-errors').replaceChildren(
    ...errors.map((position) => {
      const code = session.order[position - 1];
      const item = document.createElement('li');
      const card = document.createElement('span');
      card.className = isRed(code) ? 'red' : '';
      card.textContent = formatCard(code);
      item.append(`№${position} — `, card);
      return item;
    }),
  );
}

// Лице карти створюється заново при кожному рендері, щоб у DOM була лише поточна карта.
function cardFace(code) {
  const card = document.createElement('div');
  card.className = isRed(code) ? 'card red' : 'card';
  const label = document.createElement('span');
  label.className = 'card-label';
  label.textContent = formatCard(code);
  card.append(label);
  return card;
}
