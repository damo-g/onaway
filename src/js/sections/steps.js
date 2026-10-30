import { registerOptions } from '../options.js';
import { onEnterOnce, prefersReducedMotion } from '../motion.js';

// Locked first: tear (stamp-bitten outer edges, a straight dashed seam), symbol at the foot, printed across.
registerOptions('steps', {
  ticket: ['tear', 'stamps', 'stamp', 'pin', 'notch'],
  symbol: ['foot', 'centre'],
  animation: ['across', 'write', 'unroll'],
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
