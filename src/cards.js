export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS = ['S', 'H', 'D', 'C'];

const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const UINT32_RANGE = 2 ** 32;

export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => rank + suit));
}

function cryptoUint32() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// Рівномірне ціле в [0, n): значення з неповного останнього блоку відкидаються,
// інакше x % n давав би перевагу меншим числам.
export function randomInt(n, nextUint32 = cryptoUint32) {
  const limit = UINT32_RANGE - (UINT32_RANGE % n);
  let x = nextUint32();
  while (x >= limit) x = nextUint32();
  return x % n;
}

// Фішер–Єйтс над копією колоди.
export function shuffle(deck, rand = randomInt) {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const suitOf = (code) => code.slice(-1);

export function formatCard(code) {
  return code.slice(0, -1) + SUIT_SYMBOLS[suitOf(code)];
}

export function isRed(code) {
  const suit = suitOf(code);
  return suit === 'H' || suit === 'D';
}
