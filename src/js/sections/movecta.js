import { prefersReducedMotion } from '../motion.js';

// MV-04b closing CTA, Floor to Floor (locked: destination House · 2s a stop · checkpoint labels on · crew leaves).
// Two elevations on one street: where you're moving from follows the chip (a condo floor, a house, an office
// floor), the new place is a house. The crew (yellow square) leaves your unit, takes the elevator or stairs down,
// loads, drives, arrives and places everything; each checkpoint lights as it's reached, then the old unit
// empties and the new one fills. Starts once at 40% in view; replays on a new pick. Reduced motion: route drawn,
// every checkpoint lit, new place filled, no crew.
const PLACES = {
  studio: { cta: 'your studio', for: 'home', size: 'studio', from: { f: 24, u: 22 } },
  12: { cta: 'your 1–2 bedroom', for: 'home', size: '1-2', from: { f: 18, u: 14 } },
  3: { cta: 'your 3+ bedroom', for: 'home', size: '3plus', from: { f: 6, u: 4 } },
  house: { cta: 'your house', for: 'home', size: 'house', from: { house: true } },
  work: { cta: 'your office', for: 'business', size: '', from: { f: 12, u: 9, office: true } },
};
const PER_STOP = 2000;
const G = 420; // ground line
const ease = (q) => (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) ** 2 / 2);
const ord = (n) => n + (n % 100 > 10 && n % 100 < 14 ? 'TH' : { 1: 'ST', 2: 'ND', 3: 'RD' }[n % 10] || 'TH');

function quoteBy() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  const fmt = (hh, mm) => `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  if (h < 8) return `by ${fmt(10, 0)}`;
  if (h >= 18) return 'by 10:00 AM tomorrow';
  return `by ${fmt(h + 2, m)}`;
}

// Draws the street for one pick; returns the SVG and the crew's waypoints [x, y, label, dx, dy, anchor]
function scene(F) {
  let s = `<line class="mcta__ground" x1="-20" y1="${G}" x2="700" y2="${G}"/>`;
  const W = [];
  if (F.house) {
    const x0 = 30, w = 170, mid = 360;
    s += `<path class="mcta__bd" d="M${x0},${G} V300 L${x0 + w / 2},238 L${x0 + w},300 V${G}"/><line class="mcta__floor" x1="${x0}" y1="${mid}" x2="${x0 + w}" y2="${mid}"/>`;
    s += `<line class="mcta__shaft" x1="${x0 + w - 30}" y1="${mid}" x2="${x0 + w - 58}" y2="${G}"/><rect class="mcta__unit" x="${x0 + 10}" y="302" width="${w - 60}" height="54"/>`;
    s += `<rect class="mcta__door" x="${x0 + w - 2}" y="${G - 34}" width="6" height="34"/><text class="mcta__tag is-key" x="${x0}" y="222">FROM · HOUSE</text>`;
    W.push([x0 + 50, 330], [x0 + w - 30, 330, 'STAIRS AND FLOORS PROTECTED', 13, -8], [x0 + w - 30, G - 7], [x0 + w + 17, G - 7, 'LOADED', 0, -21]);
  } else {
    const x0 = 30, w = 150, fh = Math.min(16, 320 / F.f), top = G - F.f * fh, sx = x0 + w - 24, uy = G - F.u * fh + fh / 2;
    s += `<rect class="mcta__bd" x="${x0}" y="${top}" width="${w}" height="${G - top}"/>`;
    for (let i = 1; i < F.f; i++) s += `<line class="mcta__floor" x1="${x0}" y1="${G - i * fh}" x2="${x0 + w}" y2="${G - i * fh}"/>`;
    s += `<line class="mcta__shaft" x1="${sx}" y1="${top + 4}" x2="${sx}" y2="${G}"/><rect class="mcta__unit" x="${x0 + 8}" y="${G - F.u * fh + 2}" width="${w - 44}" height="${fh - 4}"/>`;
    s += `<text class="mcta__tag is-key" x="${x0}" y="${top - 13}">FROM · ${ord(F.u)} FLOOR</text>`;
    s += `<rect class="mcta__door" x="${x0 + w}" y="${G - 14}" width="34" height="14"/><text class="mcta__tag" x="${x0 + w}" y="${G + 21}">DOCK</text>`;
    W.push([x0 + 40, uy], [sx, uy, F.office ? 'SERVICE ELEVATOR BOOKED' : 'ELEVATOR BOOKED', 13, -8], [sx, G - 7], [x0 + w + 17, G - 7, 'LOADED', 0, -21]);
  }
  // The new place: a two-storey house
  const x0 = 480, w = 170;
  s += `<path class="mcta__bd" d="M${x0},${G} V318 L${x0 + w / 2},262 L${x0 + w},318 V${G}"/><line class="mcta__floor" x1="${x0}" y1="370" x2="${x0 + w}" y2="370"/>`;
  s += `<rect class="mcta__door" x="${x0 - 3}" y="${G - 34}" width="6" height="34"/><text class="mcta__tag is-key" x="${x0 + w}" y="246" text-anchor="end">TO · NEW PLACE</text>`;
  s += `<rect class="mcta__new" x="${x0 + 16}" y="374" width="${w - 32}" height="42"/><rect class="mcta__new" x="${x0 + 16}" y="322" width="${w - 32}" height="44"/>`;
  W.push([340, G - 7, 'ON THE ROAD', 0, -21, 'middle'], [x0 - 14, G - 7, 'ARRIVED', 0, -21, 'end'], [x0 + w / 2, G - 24], [x0 + w / 2, 344, 'PLACED, ROOM BY ROOM', 0, G + 21 - 344, 'middle']);

  // Right-angled route, dotted ahead and solid behind, a square at each checkpoint
  let d = `M${W[0][0]},${W[0][1]}`;
  for (let i = 1; i < W.length; i++) {
    const [x, y] = W[i];
    const [px, py] = W[i - 1];
    d += y === py ? ` H${x}` : x === px ? ` V${y}` : ` H${x} V${y}`;
  }
  s += `<path class="mcta__todo" d="${d}"/><path class="mcta__done" d="${d}"/>`;
  W.forEach(([x, y, label, dx, dy, anchor], i) => {
    if (label) s += `<rect class="mcta__stop" data-i="${i}" x="${x - 5}" y="${y - 5}" width="10" height="10"/><text class="mcta__cp" data-i="${i}" x="${x + dx}" y="${y + dy}" text-anchor="${anchor || 'start'}">${label}</text>`;
  });
  s += '<rect class="mcta__crew" x="-5" y="-5" width="10" height="10"/>';
  return { s, W };
}

export function init(el) {
  const svg = el.querySelector('.ccta__plan svg');
  const cta = el.querySelector('.ccta__cta');
  const chips = el.querySelector('.ccta__chips');
  const reduced = prefersReducedMotion();
  let current = '12';
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
    const p = PLACES[key];
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    cta.innerHTML = `Get a moving quote for ${p.cta} <span aria-hidden="true">→</span>`;
    const q = new URLSearchParams({ service: 'moving', for: p.for });
    if (p.size) q.set('size', p.size);
    cta.href = `/quote/?${q}`;

    const { s, W } = scene(p.from);
    svg.innerHTML = s;
    const done = svg.querySelector('.mcta__done');
    const crew = svg.querySelector('.mcta__crew');
    const len = done.getTotalLength();
    done.style.strokeDasharray = len;
    const cum = [0];
    for (let i = 1; i < W.length; i++) cum.push(cum[i - 1] + Math.abs(W[i][0] - W[i - 1][0]) + Math.abs(W[i][1] - W[i - 1][1]));
    const at = (l) => { done.style.strokeDashoffset = len - l; const pt = done.getPointAtLength(Math.min(l, len)); crew.setAttribute('transform', `translate(${pt.x},${pt.y})`); };
    const mark = (i) => svg.querySelectorAll(`[data-i="${i}"]`).forEach((n) => n.classList.add('is-on'));
    const arrive = () => { svg.querySelector('.mcta__unit').classList.add('is-empty'); svg.querySelectorAll('.mcta__new').forEach((n) => n.classList.add('is-on')); };
    function move(i) {
      const a = cum[i - 1];
      const b = cum[i];
      const dur = Math.min(2200, 600 + (b - a) * 3.2);
      return new Promise((res) => {
        let t0 = null;
        (function f(t) { if (k.dead) return res(); t0 ??= t; const q2 = Math.min(1, (t - t0) / dur); at(a + (b - a) * ease(q2)); if (q2 < 1) requestAnimationFrame(f); else res(); })(performance.now());
      });
    }

    if (reduced) {
      at(len);
      W.forEach((_, i) => mark(i));
      arrive();
      crew.style.display = 'none';
      return;
    }
    at(0);
    if (!play) return;
    (async () => {
      await wait(1400, k);
      for (let i = 1; i < W.length; i++) {
        if (k.dead) return;
        await move(i);
        if (k.dead) return;
        if (!W[i][2]) continue;
        mark(i);
        if (i === W.length - 1) arrive();
        await wait(PER_STOP, k);
      }
      crew.classList.add('is-gone'); // the crew leaves after the last stop
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
