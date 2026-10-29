import { prefersReducedMotion } from '../motion.js';

// AB-02c About hero: the wordmark is a road. On load its letters are laid stroke by stroke along their
// centrelines (a mask drawn with stroke-dashoffset on pathLength 1, hidden by CSS until then, left to right, 0.9s each, 110ms apart, from 0.4s), then
// the Paper lane markings fade in and flow (CSS, 2.4s; hovering the wordmark pauses them). Hover or focus
// ọ̀nà or Onabule and WAY steps back, leaving ONA. Reduced motion: letters whole, lanes still.
const STROKE = 900;
const STAGGER = 110;
const START = 400;

export function init(el) {
  const lay = [...el.querySelectorAll('.layp path')];
  if (prefersReducedMotion()) {
    el.classList.add('is-laid');
  } else {
    const order = lay.map((p) => [p.getBBox().x, p]).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
    order.forEach((p, i) => {
      p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: STROKE, delay: START + i * STAGGER, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'both' });
    });
    setTimeout(() => el.classList.add('is-laid'), START + order.length * STAGGER + STROKE);
  }

  const rows = [...el.querySelectorAll('.about-name__rows li')];
  const light = (row) => {
    rows.forEach((r) => r.classList.toggle('is-on', r === row));
    el.classList.toggle('is-ona', row?.dataset.k === 'ona');
  };
  rows.forEach((r) => {
    r.addEventListener('mouseenter', () => light(r));
    r.addEventListener('focus', () => light(r));
    r.addEventListener('mouseleave', () => light(null));
    r.addEventListener('blur', () => light(null));
  });
}
