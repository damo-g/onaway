import { prefersReducedMotion } from '../motion.js';
import { icon } from '../icons.js';

// AC-04b About closing panel. The job chip sets the button and the strip along the bottom. Moving and Delivery
// get the road: a flowing centre line (CSS) and five stops the crew (yellow square) fills as it passes. Cleaning
// gets a floor plan: rooms of different widths, doorways in their walls, coarse dust (as on the Cleaning page)
// that lifts right behind the crew as it wipes through, each room's label brightening once it's done. Both run
// 9s, pause 1.8s and go again (the dust settles back in); a new chip restarts. Starts once at 40% in view.
// Reduced motion: the crew at the end, every stop filled, every room clean.
const STOPS = {
  moving: ['Packed', 'Elevator', 'Loaded', 'On the road', 'Placed'],
  delivery: ['Picked up', 'Wrapped', 'On the way', 'Carried in', 'Placed'],
};
// Cleaning rooms and their share of the strip; phones show the first, middle and last
const ROOMS = [['Kitchen', 18], ['Bath', 12], ['Living', 28], ['Bedroom', 24], ['Hall', 18]];
const PHONE_ROOMS = [0, 2, 4];
const PASS = 9000;
const PAUSE = 1800;
const ease = (q) => (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
const seeded = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

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
  const plan = road.querySelector('.acta__plan');
  const stops = [...road.querySelectorAll('.acta__stop')];
  const crew = road.querySelector('.acta__crew');
  const reduced = prefersReducedMotion();
  let current = 'cleaning';
  let run = 0;
  let started = false;
  let room = { specks: [], labels: [] };

  const tick = () => el.querySelectorAll('[data-qby]').forEach((n) => (n.textContent = quoteBy()));
  tick();
  setInterval(tick, 30000);

  const place = (x) => (crew.style.transform = `translateX(${x}px)`);

  // The floor plan, drawn in px at the strip's width: walls with a doorway the crew passes through, a label in
  // each room's corner, and coarse specks (1 per 520 px², 1.6–3.2 square, 14–44%) seeded per room
  function drawPlan() {
    const W = road.clientWidth;
    const H = road.clientHeight;
    const rooms = innerWidth < 768 ? PHONE_ROOMS.map((i) => ROOMS[i]) : ROOMS;
    const total = rooms.reduce((s, r) => s + r[1], 0);
    let x = 0;
    let s = '';
    const specks = [];
    const ends = [];
    rooms.forEach(([name, share], i) => {
      const w = (W * share) / total;
      if (i) s += `<line class="acta__wall" x1="${x}" y1="0" x2="${x}" y2="${H * 0.32}"/><line class="acta__wall" x1="${x}" y1="${H * 0.68}" x2="${x}" y2="${H}"/>`;
      s += `<text class="acta__rl" x="${x + 13}" y="15">${name.toUpperCase()}</text>`;
      const g = seeded(53 + i * 97);
      const n = Math.round((w * H) / 520);
      for (let k = 0; k < n; k++) {
        const size = 1.6 + g() * 1.6;
        specks.push({ x: x + 6 + g() * (w - 12), y: 21 + g() * (H - 27), size, o: 0.14 + g() * 0.3 });
      }
      ends.push(x + w);
      x += w;
    });
    specks.sort((a, b) => a.x - b.x);
    s += specks.map((p) => `<rect class="acta__dust" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${p.size.toFixed(1)}" height="${p.size.toFixed(1)}" opacity="${p.o.toFixed(2)}"/>`).join('');
    plan.innerHTML = s;
    const dust = [...plan.querySelectorAll('.acta__dust')];
    room = { specks: specks.map((p, i) => ({ x: p.x, el: dust[i] })), labels: [...plan.querySelectorAll('.acta__rl')].map((t, i) => ({ end: ends[i], el: t })), W };
  }

  // The crew runs from the first stop to the last (road) or wall to wall (plan)
  function drive() {
    const me = ++run;
    const clean = current === 'cleaning';
    const shown = stops.filter((s) => s.offsetParent);
    const [x0, x1] = clean ? [13, road.clientWidth - 13] : [shown[0].offsetLeft, shown.at(-1).offsetLeft];
    let next = 0; // specks are sorted by x: everything before this one has lifted
    const step = (x) => {
      if (clean) {
        while (next < room.specks.length && room.specks[next].x <= x) room.specks[next++].el.classList.add('is-gone');
        room.labels.forEach((l) => l.el.classList.toggle('is-on', x >= l.end - 13));
      } else {
        shown.forEach((s) => s.classList.toggle('is-on', x >= s.offsetLeft - 0.5));
      }
    };
    if (reduced) {
      stops.forEach((s) => s.classList.add('is-on'));
      room.specks.forEach((p) => p.el.classList.add('is-gone'));
      room.labels.forEach((l) => l.el.classList.add('is-on'));
      place(x1);
      return;
    }
    // Back to the start: stops empty, the dust settles back in
    stops.forEach((s) => s.classList.remove('is-on'));
    room.specks.forEach((p) => p.el.classList.remove('is-gone'));
    room.labels.forEach((l) => l.el.classList.remove('is-on'));
    place(x0);
    if (!started) return;
    const t0 = performance.now();
    (function f(t) {
      if (me !== run) return;
      const q = Math.min(1, (t - t0) / PASS);
      const x = x0 + (x1 - x0) * ease(q);
      place(x);
      step(q < 1 ? x : Infinity); // at the end, everything the crew stopped short of comes clean too
      if (q < 1) requestAnimationFrame(f);
      else setTimeout(() => me === run && drive(), PAUSE);
    })(t0);
  }

  function pick(key) {
    current = key;
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    cta.innerHTML = `Get a ${key} quote <span aria-hidden="true">${icon('arrow-right-02')}</span>`;
    cta.href = `/quote/?service=${key}`;
    el.classList.toggle('is-clean', key === 'cleaning');
    if (key === 'cleaning') drawPlan();
    else stops.forEach((s, i) => (s.querySelector('b').textContent = STOPS[key][i]));
    drive();
  }

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) pick(b.dataset.k);
  });
  let width = road.clientWidth;
  new ResizeObserver(() => {
    if (road.clientWidth === width) return;
    width = road.clientWidth;
    if (current === 'cleaning') drawPlan();
    drive();
  }).observe(road);
  pick('cleaning');
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    started = true;
    drive();
  }, { threshold: 0.4 });
  io.observe(el.querySelector('.ccta__panel'));
}
