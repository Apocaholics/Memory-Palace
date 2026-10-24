import { formatCard, isRed } from './cards.js';

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
};

const $ = (selector) => document.querySelector(selector);

// Кнопки з data-action перетворюються на дії; що з ними робити, вирішує main.js.
export function init(onAction) {
  document.title = TEXT.appName;
  for (const el of document.querySelectorAll('[data-text]')) {
    el.textContent = TEXT[el.dataset.text];
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button && !button.disabled) onAction({ type: button.dataset.action });
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
