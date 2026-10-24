const TEXT = {
  appName: 'Палац пам\'яті',
  newDeck: 'Нова колода',
  startLead: 'Тренажер запам\'ятовування колоди з 52 карт.',
  step1: 'Отримайте випадковий порядок і складіть за ним фізичну колоду.',
  step2: 'Запам\'ятайте колоду, гортаючи її в руках.',
  step3: 'Запишіть порядок карт з пам\'яті на папері.',
  step4: 'Звірте запис: сайт відкриватиме карти по одній.',
};

export function init() {
  document.title = TEXT.appName;
  for (const el of document.querySelectorAll('[data-text]')) {
    el.textContent = TEXT[el.dataset.text];
  }
}

export function render(session) {
  const screen = session ? session.phase : 'start';
  for (const section of document.querySelectorAll('[data-screen]')) {
    section.hidden = section.dataset.screen !== screen;
  }
}
