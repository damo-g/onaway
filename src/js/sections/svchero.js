import { renderDotMatrix } from '../dotmatrix.js';
import { registerOptions } from '../options.js';
import { prefersReducedMotion } from '../motion.js';

// Service page hero (CL-06e Platforms): the band's board cycles its facts every 2.8s (static under
// reduced motion; facts come from data-facts), the "by" time follows Toronto, and the band then the platforms swing in once on load.

// The platforms' hover (Nov 2026): the colour change, plus a turn in perspective, kept very subtle (they're links,
// not ornaments). pointer (the side under the pointer comes towards you, 2.5° at most, settling back on leave) · left
// (always turns its left side in) · right · lift (as built: rises 3px)
registerOptions('svchero', { hover: ['pointer', 'left', 'right', 'lift'] });

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
  // Phones: a description too long for its one line becomes a ticker (main.css): the shift and a duration from its length
  const phone = matchMedia('(width < 768px)');
  const subs = [...el.querySelectorAll('.svc-door__sub')];
  subs.forEach((sub) => { const t = document.createElement('span'); t.append(...sub.childNodes); sub.append(t); });
  function tickers() {
    subs.forEach((sub) => {
      const over = phone.matches && !prefersReducedMotion() ? sub.scrollWidth - sub.clientWidth : 0;
      sub.classList.toggle('is-ticker', over > 2);
      if (over > 2) {
        sub.style.setProperty('--shift', `${-Math.ceil(over + 21)}px`);
        sub.style.setProperty('--dur', `${Math.max(5, (over + 21) / 28).toFixed(1)}s`); // about 28px a second of travel, plus the holds
      }
    });
  }
  document.fonts?.ready.then(tickers);
  new ResizeObserver(tickers).observe(el);

  // The platforms follow the pointer (hover: pointer); nothing moves under reduced motion
  if (!prefersReducedMotion()) {
    el.querySelectorAll('.svc-door').forEach((door) => {
      door.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = door.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        door.style.setProperty('--ry', `${(x * 5).toFixed(2)}deg`);
        door.style.setProperty('--rx', `${(-y * 3).toFixed(2)}deg`);
      });
      door.addEventListener('pointerleave', () => { door.style.removeProperty('--ry'); door.style.removeProperty('--rx'); });
    });
  }
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
