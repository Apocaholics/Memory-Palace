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
  cardBack: 'Карта сорочкою догори',
  reveal: 'Відкрити',
  markOk: '✓',
  markOkLabel: 'Збіглося',
  markFail: '✗',
  markFailLabel: 'Помилка',
  undo: 'Скасувати',
  errorsTitle: 'Помилки',
  noErrors: 'Без помилок',
};

const $ = (selector) => document.querySelector(selector);

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
    const action = { type: button.dataset.action };
    if (button.dataset.ok) action.ok = button.dataset.ok === 'true';
    onAction(action);
  });
}

export function render(session) {
  const screen = session ? session.phase : 'start';
  for (const section of document.querySelectorAll('[data-screen]')) {
    section.hidden = section.dataset.screen !== screen;
  }
  // Карти з інших екранів не лишаються в DOM навіть у прихованих секціях.
  for (const slot of document.querySelectorAll('.card-slot')) {
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
  $('[data-screen="layout"] [data-action="next"]').hidden = isLast;
  $('[data-screen="layout"] [data-action="layoutDone"]').hidden = !isLast;
}

// Поки карта закрита, її лиця немає в DOM: рендериться лише сорочка.
function renderCheck(session) {
  const total = session.order.length;
  const { revealed, marks } = session;
  $('#check-position').textContent = `${TEXT.position} ${marks.length + 1} / ${total}`;
  $('#check-card').replaceChildren(revealed ? cardFace(currentCheckCard(session)) : cardBack());
  $('[data-screen="check"] [data-action="reveal"]').hidden = revealed;
  for (const button of document.querySelectorAll('[data-screen="check"] [data-action="mark"]')) {
    button.hidden = !revealed;
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

function cardBack() {
  const card = document.createElement('div');
  card.className = 'card card-back';
  card.setAttribute('role', 'img');
  card.setAttribute('aria-label', TEXT.cardBack);
  return card;
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
