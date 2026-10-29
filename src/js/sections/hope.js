import { prefersReducedMotion } from '../motion.js';
import { registerOptions } from '../options.js';

// The essay's drop cap; the first value is the locked default
registerOptions('hope', { dropcap: ['3', '2', 'raised', 'off'], capcolor: ['carbon', 'rust'], capfont: ['display', 'mono'] });

// WE-02 Hope is not a plan. Once, when the ledger is 40% in view: from 0.9s, row by row 0.9s apart, a Rust line
// strikes through the hope (0.6s), then the plan slides in (0.5s, 0.35s into the strike). The CSS holds the timing;
// this only marks the rows. Reduced motion: never armed, so everything shows finished.
const START = 900;
const STEP = 900;

export function init(el) {
  if (prefersReducedMotion()) return;
  const ledger = el.querySelector('.hope__ledger');
  const rows = [...el.querySelectorAll('.hope__rows li')];
  el.classList.add('is-armed');
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    rows.forEach((r, i) => setTimeout(() => r.classList.add('is-done'), START + i * STEP));
  }, { threshold: 0.4 });
  io.observe(ledger);
}
