import { renderDotMatrix } from '../dotmatrix.js';
import { prefersReducedMotion } from '../motion.js';

// Service page hero (CL-06e Platforms): the band's board cycles its facts every 2.8s (static under
// reduced motion; facts come from data-facts), the "by" time follows Toronto, and the band then the platforms swing in once on load.

function quoteBy() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  const fmt = (hh, mm) => `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  if (h < 8) return `by ${fmt(10, 0)}`;
  if (h >= 18) return `by ${fmt(10, 0)} tomorrow`;
  return `by ${fmt(h + 2, m)}`;
}

export function init(el) {
  const by = () => el.querySelectorAll('[data-q="by"]').forEach((n) => (n.textContent = quoteBy()));
  by();
  setInterval(by, 30000);

  const board = el.querySelector('.svc-band__board');
  const facts = (board.dataset.facts || board.dataset.dm).split('|');
  renderDotMatrix(el);
  if (prefersReducedMotion()) return;

  let i = 0;
  setInterval(() => {
    i = (i + 1) % facts.length;
    board.dataset.dm = facts[i];
    renderDotMatrix(el);
  }, 2800);
  el.classList.add('is-go');
}
