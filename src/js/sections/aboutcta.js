import { prefersReducedMotion } from '../motion.js';
import { icon } from '../icons.js';

// AC-04b About closing panel. The job chip sets the button and the road's stops. On the road the centre line
// flows (CSS) and the crew (yellow square) passes the stops over 9s, filling each, pauses 1.8s, and goes
// again; a new chip restarts it. Starts once at 40% in view. Reduced motion: crew at the last stop, all filled.
const STOPS = {
  cleaning: ['Kitchen', 'Baths', 'Living', 'Floors', 'Checked'],
  moving: ['Packed', 'Elevator', 'Loaded', 'On the road', 'Placed'],
  delivery: ['Picked up', 'Wrapped', 'On the way', 'Carried in', 'Placed'],
};
const PASS = 9000;
const PAUSE = 1800;
const ease = (q) => (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);

function quoteBy() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  const fmt = (hh, mm) => `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  if (h < 8) return `by ${fmt(10, 0)}`;
  if (h >= 18) return 'by 10:00 AM tomorrow';
  return `by ${fmt(h + 2, m)}`;
}

export function init(el) {
  const chips = el.querySelector('.ccta__chips');
  const cta = el.querySelector('.ccta__cta');
  const road = el.querySelector('.acta__road');
  const stops = [...road.querySelectorAll('.acta__stop')];
  const crew = road.querySelector('.acta__crew');
  const reduced = prefersReducedMotion();
  let run = 0;
  let started = false;

  const tick = () => el.querySelectorAll('[data-qby]').forEach((n) => (n.textContent = quoteBy()));
  tick();
  setInterval(tick, 30000);

  const place = (x) => (crew.style.transform = `translateX(${x}px)`);

  // The crew runs from the first stop to the last; only the stops shown (phones show three) light up
  function drive() {
    const me = ++run;
    const shown = stops.filter((s) => s.offsetParent);
    const x0 = shown[0].offsetLeft;
    const x1 = shown.at(-1).offsetLeft;
    if (reduced) {
      stops.forEach((s) => s.classList.add('is-on'));
      place(x1);
      return;
    }
    stops.forEach((s) => s.classList.remove('is-on'));
    place(x0);
    if (!started) return;
    const t0 = performance.now();
    (function f(t) {
      if (me !== run) return;
      const q = Math.min(1, (t - t0) / PASS);
      const x = x0 + (x1 - x0) * ease(q);
      place(x);
      shown.forEach((s) => s.classList.toggle('is-on', x >= s.offsetLeft - 0.5));
      if (q < 1) requestAnimationFrame(f);
      else setTimeout(() => me === run && drive(), PAUSE);
    })(t0);
  }

  function pick(key) {
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    cta.innerHTML = `Get a ${key} quote <span aria-hidden="true">${icon('arrow-right-02')}</span>`;
    cta.href = `/quote/?service=${key}`;
    stops.forEach((s, i) => (s.querySelector('b').textContent = STOPS[key][i]));
    drive();
  }

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) pick(b.dataset.k);
  });
  let width = road.clientWidth;
  new ResizeObserver(() => { if (road.clientWidth !== width) { width = road.clientWidth; drive(); } }).observe(road);
  pick('cleaning');
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    started = true;
    drive();
  }, { threshold: 0.4 });
  io.observe(el.querySelector('.ccta__panel'));
}
