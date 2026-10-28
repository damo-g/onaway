import { prefersReducedMotion } from '../motion.js';
import { icon } from '../icons.js';

// DL-05 closing CTA, the window at the door. Pick what's going; the route draws from the pickup to your door.
// The crew (yellow square) picks up, wraps, sets off (an "on the way" message pops up), carries in and places,
// a checkpoint every PER_STOP_MS; the door and its window light on arrival and the result line confirms it.
// Regular drop-offs: three doors, each with its own window. Starts once at 40% in view; replays on a new pick.
// Reduced motion: everything drawn, doors filled, result shown, no crew. Times are an illustration, not a schedule.
export const DROP = {
  PER_STOP_MS: 2000, // pause at each checkpoint (never under 2000)
  SHOW_MESSAGE: true,
  MESSAGE_TEXT: 'ON THE WAY · 30 MIN',
  CREW_LEAVES: true,
  SAMPLE_WINDOW: 14, // start hour shown at the door for single drops
  SAMPLE_ARRIVAL: '2:45 PM',
  REGULAR_WINDOWS: [10, 12, 14],
  WINDOW_HOURS: 2,
};
const D = DROP;
const WHAT = {
  one: { cta: 'one item', for: 'home', what: 'single', from: 'PICKUP · SELLER' },
  few: { cta: 'a few pieces', for: 'home', what: 'few', from: 'PICKUP' },
  store: { cta: 'a store pickup', for: 'home', what: 'store', from: 'PICKUP · STORE' },
  reg: { cta: 'regular drop-offs', for: 'business', what: 'regular', from: 'PICKUP · YOUR SHOP' },
};
const RY = 150; // the route
const X0 = 40;
const X1 = 640;
const ease = (q) => (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
const fh = (h) => `${((h + 11) % 12) + 1} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;

function quoteBy() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  const fmt = (hh, mm) => `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  if (h < 8) return `by ${fmt(10, 0)}`;
  if (h >= 18) return 'by 10:00 AM tomorrow';
  return `by ${fmt(h + 2, m)}`;
}

// The drawing for one pick; checkpoints are [x, label, dy, kind, door]
function scene(p) {
  const reg = p.what === 'regular';
  const drops = reg ? D.REGULAR_WINDOWS.map((h, i) => [`DROP ${i + 1}`, h]) : [['YOUR DOOR', D.SAMPLE_WINDOW]];
  const dx = reg ? [X0 + (X1 - X0) * 0.45, X0 + (X1 - X0) * 0.72, X1] : [X1];
  const W = [[X0, 'PICKED UP', 34]];
  if (reg) W.push([X0 + 90, 'LOADED', 54], ...dx.map((x, i) => [x, 'DONE', 34, 'drop', i]));
  else W.push([X0 + 150, 'WRAPPED AND SECURED', 54], [X0 + 300, 'ON THE WAY', 34, 'msg'], [X1 - 60, 'CARRIED IN', 34], [X1, 'PLACED', 54, 'drop', 0]);

  let s = `<rect class="dcta__pick" x="${X0 - 13}" y="${RY - 13}" width="26" height="26"/><text class="dcta__tag" x="${X0 - 13}" y="${RY - 27}">${p.from}</text>`;
  drops.forEach(([name, h], i) => {
    const x = dx[i];
    s += `<rect class="dcta__door" data-d="${i}" x="${x - 9}" y="${RY - 15}" width="18" height="30"/><text class="dcta__tag" x="${x + 9}" y="${RY - 27}" text-anchor="end">${name}</text>`;
    s += `<text class="dcta__win" data-d="${i}" x="${x + 9}" y="${RY - 41}" text-anchor="end">WINDOW ${fh(h)} – ${fh(h + D.WINDOW_HOURS)}</text>`;
  });
  const d = `M${X0},${RY} H${X1}`;
  s += `<path class="dcta__todo" d="${d}"/><path class="dcta__done" d="${d}"/>`;
  W.forEach(([x, label, dy, kind], i) => {
    if (i > 0 && kind !== 'drop') s += `<rect class="dcta__stop" data-i="${i}" x="${x - 5}" y="${RY - 5}" width="10" height="10"/>`;
    s += `<text class="dcta__cp" data-i="${i}" x="${x}" y="${RY + dy}" text-anchor="${i === 0 ? 'start' : x >= X1 - 1 ? 'end' : 'middle'}">${label}</text>`;
  });
  const m = W.find((w) => w[3] === 'msg');
  if (m && D.SHOW_MESSAGE) s += `<g class="dcta__msg"><rect x="${m[0] - 78}" y="${RY - 64}" width="156" height="26" rx="2"/><text x="${m[0]}" y="${RY - 47}" text-anchor="middle">${D.MESSAGE_TEXT}</text></g>`;
  s += `<text class="dcta__res" x="${X0}" y="${RY + 96}">${reg ? 'THREE DROPS · EACH INSIDE ITS WINDOW' : `ARRIVED ${D.SAMPLE_ARRIVAL} · INSIDE THE WINDOW`}</text>`;
  s += '<rect class="dcta__crew" x="-5" y="-5" width="10" height="10"/>';
  return { s, W, last: drops.length - 1 };
}

export function init(el) {
  const svg = el.querySelector('.ccta__plan svg');
  const cta = el.querySelector('.ccta__cta');
  const chips = el.querySelector('.ccta__chips');
  const reduced = prefersReducedMotion();
  const per = Math.max(2000, D.PER_STOP_MS);
  let current = 'one';
  let token = { dead: true };
  let started = false;

  const tick = () => el.querySelectorAll('[data-qby]').forEach((n) => (n.textContent = quoteBy()));
  tick();
  setInterval(tick, 30000);

  const wait = (ms, k) => new Promise((res) => {
    const t0 = performance.now();
    (function f() { if (k.dead || performance.now() - t0 >= ms) return res(); requestAnimationFrame(f); })();
  });

  function draw(key, play) {
    token.dead = true;
    const k = { dead: false };
    token = k;
    current = key;
    const p = WHAT[key];
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    cta.innerHTML = `Get a delivery quote for ${p.cta} <span aria-hidden="true">${icon('arrow-right-02')}</span>`;
    cta.href = `/quote/?${new URLSearchParams({ service: 'delivery', for: p.for, what: p.what })}`;

    const { s, W, last } = scene(p);
    el.classList.toggle('is-reg', p.what === 'regular');
    svg.innerHTML = s;
    const done = svg.querySelector('.dcta__done');
    const crew = svg.querySelector('.dcta__crew');
    const len = X1 - X0;
    done.style.strokeDasharray = len;
    const at = (x) => { done.style.strokeDashoffset = len - (x - X0); crew.setAttribute('transform', `translate(${x},${RY})`); };
    function mark(i) {
      svg.querySelectorAll(`[data-i="${i}"]`).forEach((n) => n.classList.add('is-on'));
      const [, , , kind, door] = W[i];
      if (kind === 'msg') svg.querySelector('.dcta__msg')?.classList.add('is-on');
      if (kind !== 'drop') return;
      svg.querySelectorAll(`[data-d="${door}"]`).forEach((n) => n.classList.add('is-on'));
      if (door === last) svg.querySelector('.dcta__res').classList.add('is-on');
    }
    function move(a, b) {
      const dur = Math.min(2400, 600 + (b - a) * 4);
      return new Promise((res) => {
        let t0 = null;
        (function f(t) { if (k.dead) return res(); t0 ??= t; const q = Math.min(1, (t - t0) / dur); at(a + (b - a) * ease(q)); if (q < 1) requestAnimationFrame(f); else res(); })(performance.now());
      });
    }

    if (reduced) {
      at(X1);
      W.forEach((_, i) => mark(i));
      crew.style.display = 'none';
      return;
    }
    at(X0);
    if (!play) return;
    (async () => {
      await wait(1200, k);
      mark(0);
      await wait(per, k);
      for (let i = 1; i < W.length; i++) {
        if (k.dead) return;
        await move(W[i - 1][0], W[i][0]);
        if (k.dead) return;
        mark(i);
        await wait(per, k);
      }
      if (D.CREW_LEAVES) crew.classList.add('is-gone');
    })();
  }

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) draw(b.dataset.k, started || reduced);
  });
  draw(current, false);
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    started = true;
    draw(current, true);
  }, { threshold: 0.4 });
  io.observe(el.querySelector('.ccta__panel'));
}
