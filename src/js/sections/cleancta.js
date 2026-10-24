import { prefersReducedMotion } from '../motion.js';

// CC-02b closing CTA. Pick a space: its plan draws in quiet lines, every room dusted. The crew (yellow square)
// works the route in What's included order; each room it reaches comes clean (coarse dust lifts over 2s, the
// label brightens, the stop fills), then on to the next. After the last room the crew leaves. Starts once at
// 40% in view; replays on a new pick. Reduced motion: plan drawn, every room clean, no crew.
const PLANS = {
  studio: { cta: 'your studio', for: 'home', size: 'studio', rooms: [[0, 0, 420, 460, 'LIVING + SLEEP'], [420, 0, 220, 200, 'KITCHEN'], [420, 200, 220, 140, 'BATH'], [420, 340, 220, 120, 'ENTRY']], route: ['KITCHEN', 'BATH', 'LIVING + SLEEP', 'ENTRY'] },
  12: { cta: 'your 1–2 bedroom', for: 'home', size: '1-2', rooms: [[0, 0, 360, 280, 'LIVING'], [360, 0, 280, 180, 'KITCHEN'], [360, 180, 280, 100, 'BATH'], [0, 280, 320, 180, 'BEDROOM'], [320, 280, 320, 180, 'BEDROOM 2']], route: ['KITCHEN', 'BATH', 'LIVING', 'BEDROOM', 'BEDROOM 2'] },
  3: { cta: 'your 3+ bedroom', for: 'home', size: '3plus', rooms: [[0, 0, 300, 250, 'LIVING'], [300, 0, 200, 150, 'KITCHEN'], [500, 0, 140, 150, 'BATH'], [300, 150, 340, 100, 'HALL'], [0, 250, 220, 210, 'BEDROOM'], [220, 250, 210, 210, 'BEDROOM 2'], [430, 250, 210, 120, 'BEDROOM 3'], [430, 370, 210, 90, 'BATH 2']], route: ['KITCHEN', 'BATH', 'HALL', 'BEDROOM 3', 'BATH 2', 'BEDROOM 2', 'BEDROOM', 'LIVING'] },
  house: { cta: 'your house', for: 'home', size: 'house', rooms: [[0, 40, 300, 200, 'LIVING'], [0, 240, 180, 220, 'KITCHEN'], [180, 240, 120, 220, 'BATH'], [340, 40, 150, 210, 'BEDROOM'], [490, 40, 150, 210, 'BEDROOM 2'], [340, 250, 300, 110, 'BATH 2'], [340, 360, 300, 100, 'BEDROOM 3']], floors: [[0, 'MAIN'], [340, 'UPPER']], route: ['KITCHEN', 'BATH', 'LIVING', 'BEDROOM', 'BEDROOM 2', 'BATH 2', 'BEDROOM 3'] },
  work: { cta: 'your workplace', for: 'business', size: '', rooms: [[0, 0, 640, 300, 'OPEN OFFICE'], [0, 300, 240, 160, 'KITCHENETTE'], [240, 300, 200, 160, 'WASHROOMS'], [440, 300, 200, 160, 'MEETING']], desks: true, route: ['OPEN OFFICE', 'KITCHENETTE', 'WASHROOMS', 'MEETING'] },
};
const PER_ROOM = 2000;
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

  function link(p) {
    cta.innerHTML = `Get a quote for ${p.cta} <span aria-hidden="true">→</span>`;
    const q = new URLSearchParams({ service: 'cleaning', for: p.for });
    if (p.size) q.set('size', p.size);
    cta.href = `/quote/?${q}`;
  }

  function draw(key, play) {
    token.dead = true;
    const k = { dead: false };
    token = k;
    current = key;
    const p = PLANS[key];
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === key)));
    link(p);

    const rooms = p.rooms;
    const idx = (n) => rooms.findIndex((r) => r[4] === n);
    let s = `<defs>${rooms.map((r, i) => `<clipPath id="ccta-cl${i}"><rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/></clipPath>`).join('')}</defs>`;
    // Coarse dust: 1 speck per 520 units², 1.6–3.2 square, seeded per room so it's the same every visit
    rooms.forEach((r, i) => {
      const g = seeded(31 + i * 97);
      let dust = '';
      const n = Math.round((r[2] * r[3]) / 520);
      for (let j = 0; j < n; j++) {
        const w = 1.6 + g() * 1.6;
        dust += `<rect class="ccta__dust" x="${(r[0] + 6 + g() * (r[2] - 12)).toFixed(1)}" y="${(r[1] + 34 + g() * (r[3] - 40)).toFixed(1)}" width="${w.toFixed(1)}" height="${w.toFixed(1)}" opacity="${(0.14 + g() * 0.3).toFixed(2)}"/>`;
      }
      s += `<g class="ccta__room" data-i="${i}" clip-path="url(#ccta-cl${i})">${dust}</g>`;
    });
    rooms.forEach((r) => { s += `<rect class="ccta__wall" pathLength="1" x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}"/><text class="ccta__rl" data-n="${r[4]}" x="${r[0] + 13}" y="${r[1] + 24}">${r[4]}</text>`; });
    if (p.floors) p.floors.forEach((f) => { s += `<rect class="ccta__outer ccta__wall" pathLength="1" x="${f[0]}" y="40" width="300" height="420"/><text class="ccta__fl" x="${f[0]}" y="24">${f[1]}</text>`; });
    else s += '<rect class="ccta__outer ccta__wall" pathLength="1" x="0" y="0" width="640" height="460"/>';
    if (p.desks) for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) s += `<rect class="ccta__desk" x="${150 + c * 78}" y="${60 + r * 72}" width="54" height="30"/>`;
    const centre = (n) => { const r = rooms[idx(n)]; return [r[0] + r[2] / 2, r[1] + r[3] / 2 + 8]; };
    const pts = p.route.map(centre);
    let d = `M${pts[0].join(',')}`;
    for (let i = 1; i < pts.length; i++) d += ` H${pts[i][0]} V${pts[i][1]}`;
    s += `<path class="ccta__todo" d="${d}"/><path class="ccta__done" d="${d}"/>${pts.map((x) => `<rect class="ccta__stop" x="${x[0] - 6}" y="${x[1] - 6}" width="12" height="12"/>`).join('')}<rect class="ccta__crew" x="-5" y="-5" width="10" height="10"/>`;
    svg.innerHTML = s;

    const done = svg.querySelector('.ccta__done');
    const crew = svg.querySelector('.ccta__crew');
    const stops = [...svg.querySelectorAll('.ccta__stop')];
    const len = done.getTotalLength();
    done.style.strokeDasharray = len;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]));
    const at = (l) => { done.style.strokeDashoffset = len - l; const pt = done.getPointAtLength(l); crew.setAttribute('transform', `translate(${pt.x},${pt.y})`); };

    function clean(i, instant) {
      const n = p.route[i];
      const dust = svg.querySelectorAll(`.ccta__room[data-i="${idx(n)}"] .ccta__dust`);
      const label = svg.querySelector(`.ccta__rl[data-n="${n}"]`);
      stops[i].classList.add('is-done');
      if (instant) { dust.forEach((x) => x.classList.add('is-gone')); label.classList.add('is-clean'); return Promise.resolve(); }
      dust.forEach((x) => { x.style.transitionDelay = `${Math.round(Math.random() * PER_ROOM * 0.6)}ms`; x.style.transitionDuration = `${Math.round(PER_ROOM * 0.35)}ms`; x.classList.add('is-gone'); });
      return wait(PER_ROOM, k).then(() => label.classList.add('is-clean'));
    }
    function move(i) {
      const a = cum[i - 1];
      const b = cum[i];
      const dur = Math.min(1600, 700 + (b - a) * 1.6);
      return new Promise((res) => {
        let t0 = null;
        (function f(t) { if (k.dead) return res(); t0 ??= t; const q = Math.min(1, (t - t0) / dur); at(a + (b - a) * ease(q)); if (q < 1) requestAnimationFrame(f); else res(); })(performance.now());
      });
    }

    if (reduced) {
      svg.querySelectorAll('.ccta__wall, .ccta__rl').forEach((x) => x.classList.add('is-on'));
      at(len);
      crew.style.display = 'none';
      pts.forEach((_, i) => clean(i, true));
      return;
    }
    at(0);
    if (!play) return;
    requestAnimationFrame(() => requestAnimationFrame(() => svg.querySelectorAll('.ccta__wall, .ccta__rl').forEach((x) => x.classList.add('is-on'))));
    (async () => {
      await wait(1500, k);
      for (let i = 0; i < pts.length; i++) {
        if (k.dead) return;
        if (i > 0) await move(i);
        if (k.dead) return;
        await clean(i);
        await wait(250, k);
      }
      crew.classList.add('is-gone'); // the crew leaves after the last room
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
