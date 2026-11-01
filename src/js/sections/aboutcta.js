import { prefersReducedMotion } from '../motion.js';
import { icon } from '../icons.js';

// AC-04b About closing panel. The job chip sets the button and the strip along the bottom, one drawing for all
// three: the strip is split into stretches (Cleaning: rooms of different widths with doorways and the Cleaning
// page's coarse dust; Moving and Delivery: five equal stretches of road under its flowing centre line), each
// with a stop at its centre (rooms label their top-left corner; the road labels sit centred over their stop). The crew (yellow square) stops at each one:
// the label brightens and the stop fills (Cleaning: the room's dust lifts over 2s first), then it moves on (in the
// rooms along a path, solid behind it; on the road along the flowing centre line). A 1.8s pause at the end and it goes again; a new chip restarts. Starts once at 40% in
// view. Phones show the first, middle and last stretch. Reduced motion: the crew at the end, everything done.
const STRETCHES = {
  cleaning: [['Kitchen', 18], ['Bath', 12], ['Living', 28], ['Bedroom', 24], ['Hall', 18]],
  moving: [['Packed', 1], ['Elevator', 1], ['Loaded', 1], ['On the road', 1], ['Placed', 1]],
  delivery: [['Picked up', 1], ['Wrapped', 1], ['On the way', 1], ['Carried in', 1], ['Placed', 1]],
};
const PHONE = [0, 2, 4];
const HOLD = { cleaning: 2000, road: 1200 }; // how long the crew stays at each stop
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
  const crew = road.querySelector('.acta__crew');
  const reduced = prefersReducedMotion();
  let current = 'cleaning';
  let run = 0;
  let started = false;
  let stops = [];
  let path = null;

  const tick = () => el.querySelectorAll('[data-qby]').forEach((n) => (n.textContent = quoteBy()));
  tick();
  setInterval(tick, 30000);

  const place = (x) => (crew.style.transform = `translateX(${x}px)`);
  const wait = (ms, me) => new Promise((res) => {
    const t0 = performance.now();
    (function f() { if (me !== run || performance.now() - t0 >= ms) return res(); requestAnimationFrame(f); })();
  });

  // Drawn in px at the strip's width. Cleaning adds walls (with a doorway the path runs through), coarse specks
  // (1 per 520 px², 1.6–3.2 square, 14–44%, seeded per room, kept off the path) and a dotted path ahead
  function draw() {
    const clean = current === 'cleaning';
    const W = road.clientWidth;
    const H = road.clientHeight;
    const mid = H / 2;
    const all = STRETCHES[current];
    const list = innerWidth < 768 ? PHONE.map((i) => all[i]) : all;
    const total = list.reduce((s, r) => s + r[1], 0);
    let x = 0;
    let marks = '';
    let dust = '';
    const centres = [];
    list.forEach(([name, share], i) => {
      const w = (W * share) / total;
      if (clean && i) marks += `<line class="acta__wall" x1="${x}" y1="0" x2="${x}" y2="${H * 0.32}"/><line class="acta__wall" x1="${x}" y1="${H * 0.68}" x2="${x}" y2="${H}"/>`;
      // Rooms label their top-left corner; the road labels sit centred over their stop
      marks += clean ? `<text class="acta__rl" data-i="${i}" x="${x + 13}" y="15">${name.toUpperCase()}</text>` : `<text class="acta__rl" data-i="${i}" x="${x + w / 2}" y="15" text-anchor="middle">${name.toUpperCase()}</text>`;
      if (clean) {
        const g = seeded(53 + i * 97);
        const n = Math.round((w * H) / 520);
        for (let k = 0; k < n; k++) {
          const size = 1.6 + g() * 1.6;
          const sx = x + 6 + g() * (w - 12);
          let sy = 21 + g() * (H - 27);
          if (Math.abs(sy - mid) < 5) sy += sy < mid ? -5 : 5;
          dust += `<rect class="acta__dust" data-i="${i}" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" opacity="${(0.14 + g() * 0.3).toFixed(2)}"/>`;
        }
      }
      centres.push(x + w / 2);
      x += w;
    });
    const [a, b] = [centres[0], centres.at(-1)];
    plan.innerHTML = marks + dust +
      // Rooms get the path (dotted ahead, solid behind); on the road the flowing centre line is the path
      (clean ? `<line class="acta__todo" x1="${a}" y1="${mid}" x2="${b}" y2="${mid}"/><line class="acta__done" x1="${a}" y1="${mid}" x2="${b}" y2="${mid}"/>` : '') +
      centres.map((c, i) => `<rect class="acta__pstop" data-i="${i}" x="${c - 5}" y="${mid - 5}" width="10" height="10"/>`).join('');
    const done = plan.querySelector('.acta__done');
    path = done ? { line: done, a, len: b - a } : null;
    if (path) path.line.style.strokeDasharray = path.len;
    stops = centres.map((c, i) => ({
      x: c,
      dust: [...plan.querySelectorAll(`.acta__dust[data-i="${i}"]`)],
      label: plan.querySelector(`.acta__rl[data-i="${i}"]`),
      stop: plan.querySelector(`.acta__pstop[data-i="${i}"]`),
    }));
  }

  const trail = (x) => path && (path.line.style.strokeDashoffset = path.len - Math.min(path.len, Math.max(0, x - path.a)));

  // Arriving: the label and stop light up; in a room the specks first lift at random over its 2s (each in 0.7s)
  function arrive(s, instant) {
    s.dust.forEach((d) => {
      d.style.transitionDelay = instant ? '0ms' : `${Math.round(Math.random() * HOLD.cleaning * 0.6)}ms`;
      d.style.transitionDuration = instant ? '0ms' : `${Math.round(HOLD.cleaning * 0.35)}ms`;
      d.classList.add('is-gone');
    });
    s.label.classList.add('is-on');
    s.stop.classList.add('is-on');
  }
  function reset() {
    stops.forEach((s) => {
      s.dust.forEach((d) => { d.style.transitionDelay = '0ms'; d.style.transitionDuration = ''; d.classList.remove('is-gone'); });
      s.label.classList.remove('is-on');
      s.stop.classList.remove('is-on');
    });
  }
  function move(from, to, me) {
    const dur = Math.min(1600, 700 + Math.abs(to - from) * 1.6);
    return new Promise((res) => {
      let t0 = null;
      (function f(t) {
        if (me !== run) return res();
        t0 ??= t;
        const q = Math.min(1, (t - t0) / dur);
        const x = from + (to - from) * ease(q);
        place(x);
        trail(x);
        if (q < 1) requestAnimationFrame(f);
        else res();
      })(performance.now());
    });
  }

  async function drive() {
    const me = ++run;
    if (reduced) {
      stops.forEach((s) => arrive(s, true));
      place(stops.at(-1).x);
      trail(Infinity);
      return;
    }
    reset();
    place(stops[0].x);
    trail(stops[0].x);
    if (!started) return;
    const hold = current === 'cleaning' ? HOLD.cleaning : HOLD.road;
    await wait(600, me);
    for (let i = 0; i < stops.length; i++) {
      if (me !== run) return;
      if (i) await move(stops[i - 1].x, stops[i].x, me);
      if (me !== run) return;
      arrive(stops[i]);
      await wait(hold + 250, me);
    }
    await wait(PAUSE, me);
    if (me === run) drive();
  }

  function pick(key) {
    current = key;
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    cta.innerHTML = `Get a ${key} quote <span aria-hidden="true">${icon('arrow-right-02')}</span>`;
    cta.href = `/quote/?service=${key}`;
    el.classList.toggle('is-clean', key === 'cleaning');
    draw();
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
    draw();
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
