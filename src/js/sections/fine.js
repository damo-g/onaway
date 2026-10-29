import { prefersReducedMotion } from '../motion.js';

// SD-03c Our fine print is the big print. Once, at 40% in view, the Carbon bar over each promise lifts to the
// right (0.8s), 0.35s apart from 0.6s. Reduced motion: never armed, so no bars.
export function init(el) {
  if (prefersReducedMotion()) return;
  const promises = [...el.querySelectorAll('.fine__p')];
  el.classList.add('is-armed');
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    promises.forEach((p, i) => setTimeout(() => p.classList.add('is-lifted'), 600 + i * 350));
  }, { threshold: 0.4 });
  io.observe(el.querySelector('.fine__body'));
}
