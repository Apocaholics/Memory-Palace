import { createDeck, shuffle } from './cards.js';
import { reduce } from './session.js';
import { init, render } from './ui.js';

let session = null;

function dispatch(action) {
  const next = reduce(session, action);
  if (next === session) return;
  session = next;
  render(session);
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

init(onAction);
render(session);
