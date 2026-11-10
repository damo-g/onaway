import { registerOptions } from '../options.js';
import { onEnterOnce, prefersReducedMotion } from '../motion.js';

// Locked first: tear (stamp-bitten outer edges, a straight dashed seam with the W notch at each end), symbol at
// the foot, written in (Nov 2026; across was too dramatic).
registerOptions('steps', {
  ticket: ['tear', 'stamps', 'stamp', 'pin', 'notch'],
  symbol: ['foot', 'centre'],
  animation: ['write', 'unroll', 'across'],
  // Desktop size (Nov 2026, the ticket felt too large): xl the current one (7 columns, 500 tall) · l 432 tall ·
  // m 377 tall, 42 numbers · m6 six columns, 432 · s6 six columns, 377 · xs 288 tall, 26 numbers
  size: ['xl', 'l', 'm', 'm6', 's6', 'xs'],
});

export function init(el) {
  const ticket = el.querySelector('.ticket');
  // Reduced motion: never armed, so the ticket simply shows its end state
  if (prefersReducedMotion()) return;

  // Armed: every piece waits at its first frame (CSS), then runs once the ticket is in view
  const play = () => {
    ticket.classList.remove('is-armed', 'is-go');
    void ticket.offsetWidth;
    ticket.classList.add('is-armed', 'is-go');
  };
  ticket.classList.add('is-armed');
  onEnterOnce(ticket, play, { start: 'top 75%' });

  if (import.meta.env.DEV) el.addEventListener('section:options', play);
}
