import { prefersReducedMotion } from '../motion.js';

// TM-02b The people who show up. Once, as it comes into view, the heading, dek, painting and captions rise in
// 0.1s apart and the painting settles from 1.03 (CSS holds the timing). Reduced motion: never armed, static.
export function init(el) {
  if (prefersReducedMotion()) return;
  el.classList.add('is-armed');
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    el.classList.add('is-in');
  }, { threshold: 0.15 });
  io.observe(el);
}
