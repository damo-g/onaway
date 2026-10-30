import { prefersReducedMotion } from '../motion.js';
import { icon } from '../icons.js';

// AC-04b About closing panel. The job chip sets the button and the strip along the bottom. Moving and Delivery
// get the road: a flowing centre line (CSS) and five stops the crew (yellow square) fills as it passes over 9s.
// Cleaning gets a floor plan: rooms of different widths with doorways, the Cleaning page's coarse dust, and the
// crew's path (dotted ahead, solid behind) through a stop in each room. The crew stops at each one; that room's
// dust lifts over 2s, its label brightens and its stop fills, then it moves on (the Cleaning page's rhythm).
// Both pause 1.8s at the end and go again (the dust settles back in); a new chip restarts. Starts once at 40%
// in view. Reduced motion: the crew at the end, every stop filled, every room clean.
const STOPS = {
  moving: ['Packed', 'Elevator', 'Loaded', 'On the road', 'Placed'],
  delivery: ['Picked up', 'Wrapped', 'On the way', 'Carried in', 'Placed'],
};
// Cleaning rooms and their share of the strip; phones show the first, middle and last
const ROOMS = [['Kitchen', 18], ['Bath', 12], ['Living', 28], ['Bedroom', 24], ['Hall', 18]];
const PHONE_ROOMS = [0, 2, 4];
const PASS = 9000;
const PER_ROOM = 2000;
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
  let rooms = [];
  let path = null;

  const tick = () => el.querySelectorAll('[data-qby]').forEach((n) => (n.textContent = quoteBy()));
  tick();
  setInterval(tick, 30000);

  const place = (x) => (crew.style.transform = `translateX(${x}px)`);
  const wait = (ms, me) => new Promise((res) => {
    const t0 = performance.now();
    (function f() { if (me !== run || performance.now() - t0 >= ms) return res(); requestAnimationFrame(f); })();
  });

  // The floor plan, drawn in px at the strip's width: walls with a doorway, a label in each room's corner, the
  // crew's path with a stop at each room's centre, and coarse specks (1 per 520 px², 1.6–3.2 square, 14–44%)
  // seeded per room, kept clear of the path
  function drawPlan() {
    const W = road.clientWidth;
    const H = road.clientHeight;
    const mid = H / 2;
    const list = innerWidth < 768 ? PHONE_ROOMS.map((i) => ROOMS[i]) : ROOMS;
    const total = list.reduce((s, r) => s + r[1], 0);
    let x = 0;
    let walls = '';
    let dust = '';
    const centres = [];
    list.forEach(([name, share], i) => {
      const w = (W * share) / total;
      if (i) walls += `<line class="acta__wall" x1="${x}" y1="0" x2="${x}" y2="${H * 0.32}"/><line class="acta__wall" x1="${x}" y1="${H * 0.68}" x2="${x}" y2="${H}"/>`;
      walls += `<text class="acta__rl" data-i="${i}" x="${x + 13}" y="15">${name.toUpperCase()}</text>`;
      const g = seeded(53 + i * 97);
      const n = Math.round((w * H) / 520);
      for (let k = 0; k < n; k++) {
        const size = 1.6 + g() * 1.6;
        const sx = x + 6 + g() * (w - 12);
        let sy = 21 + g() * (H - 27);
        if (Math.abs(sy - mid) < 5) sy += sy < mid ? -5 : 5;
        dust += `<rect class="acta__dust" data-i="${i}" x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" opacity="${(0.14 + g() * 0.3).toFixed(2)}"/>`;
      }
      centres.push(x + w / 2);
      x += w;
    });
    const [a, b] = [centres[0], centres.at(-1)];
    plan.innerHTML = walls + dust +
      `<line class="acta__todo" x1="${a}" y1="${mid}" x2="${b}" y2="${mid}"/><line class="acta__done" x1="${a}" y1="${mid}" x2="${b}" y2="${mid}"/>` +
      centres.map((c, i) => `<rect class="acta__pstop" data-i="${i}" x="${c - 5}" y="${mid - 5}" width="10" height="10"/>`).join('');
    path = { line: plan.querySelector('.acta__done'), a, len: b - a };
    path.line.style.strokeDasharray = path.len;
    rooms = centres.map((c, i) => ({
      x: c,
      dust: [...plan.querySelectorAll(`.acta__dust[data-i="${i}"]`)],
      label: plan.querySelector(`.acta__rl[data-i="${i}"]`),
      stop: plan.querySelector(`.acta__pstop[data-i="${i}"]`),
    }));
  }

  const trail = (x) => path && (path.line.style.strokeDashoffset = path.len - Math.max(0, x - path.a));

  // A room comes clean: specks lift at random over its 2s (each fading in 0.7s), then its label and stop light up
  function clean(r, instant) {
    r.dust.forEach((d) => {
      d.style.transitionDelay = instant ? '0ms' : `${Math.round(Math.random() * PER_ROOM * 0.6)}ms`;
      d.style.transitionDuration = instant ? '0ms' : `${Math.round(PER_ROOM * 0.35)}ms`;
      d.classList.add('is-gone');
    });
    r.label.classList.add('is-on');
    r.stop.classList.add('is-on');
  }
  function dirty() {
    rooms.forEach((r) => {
      r.dust.forEach((d) => { d.style.transitionDelay = '0ms'; d.style.transitionDuration = ''; d.classList.remove('is-gone'); });
      r.label.classList.remove('is-on');
      r.stop.classList.remove('is-on');
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

  // Cleaning: stop at each room, clean it, move on
  async function driveClean(me) {
    if (reduced) {
      rooms.forEach((r) => clean(r, true));
      place(rooms.at(-1).x);
      trail(Infinity);
      return;
    }
    dirty();
    place(rooms[0].x);
    trail(rooms[0].x);
    if (!started) return;
    await wait(600, me);
    for (let i = 0; i < rooms.length; i++) {
      if (me !== run) return;
      if (i) await move(rooms[i - 1].x, rooms[i].x, me);
      if (me !== run) return;
      clean(rooms[i]);
      await wait(PER_ROOM + 250, me);
    }
    await wait(PAUSE, me);
    if (me === run) drive();
  }

  // The road: the crew passes all five stops in one eased run
  function driveRoad(me) {
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

  function drive() {
    const me = ++run;
    if (current === 'cleaning') driveClean(me);
    else driveRoad(me);
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
