// PT · page transition mocks: one engine for all three. Each mock passes its category ('service' | 'quote' |
// 'general') and its options; links of the other categories use a plain crossfade. The navbar sits outside the
// pages, so it never moves (in production: view-transition-name: nav).
import { WORDMARK, PICTO, F } from './assets.js';

export const EASE = 'cubic-bezier(.2,.8,.2,1)';      // ease-out: arrivals
export const INOUT = 'cubic-bezier(.65,0,.35,1)';    // moves that start and stop on screen
export const OUT = 'cubic-bezier(.5,0,.75,0)';       // ease-in: things leaving

const SVC = {
  cleaning: { name: 'Cleaning', desc: 'Homes and workplaces, once or on a schedule' },
  moving: { name: 'Moving', desc: 'Homes and offices, one room to a full floor' },
  delivery: { name: 'Delivery', desc: 'Single items to full loads, same-day or scheduled' },
};
const ARROW = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M20 12H4m11 5l5-5l-5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const UPRIGHT = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M17 7L6 18M11 6h7v7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// Dot-matrix text as an SVG (lit dots in currentColor, unlit at 14%)
export function dm(text, pitch = 6) {
  const cols = [];
  [...text.toUpperCase()].forEach((ch, i) => {
    const g = (F[ch] ?? F[' ']).split(' ');
    if (i) cols.push(null);
    for (let c = 0; c < g[0].length; c++) cols.push(g.map((row) => row[c] === '1'));
  });
  const r = pitch * 0.38;
  let dots = '';
  cols.forEach((col, x) => (col ?? Array(7).fill(false)).forEach((on, y) => {
    dots += `<circle cx="${x * pitch + pitch / 2}" cy="${y * pitch + pitch / 2}" r="${r}" fill="currentColor"${on ? '' : ' opacity=".14"'}/>`;
  }));
  return `<svg width="${cols.length * pitch}" height="${7 * pitch}" viewBox="0 0 ${cols.length * pitch} ${7 * pitch}">${dots}</svg>`;
}

const home = () => `
  <div class="pt-home-head"><h2 class="pt-h1">What we take<br>off your plate.</h2><p class="pt-lead">Three services, one crew standard. Pick one to see what's included and book a window.</p></div>
  <div class="pt-cards">${Object.entries(SVC).map(([k, s]) => `
    <a class="pt-card" data-go="service" data-svc="${k}"><span class="pt-tile">${PICTO[k]}</span><span><b>${s.name}</b><small>${s.desc}</small></span><i>${ARROW}</i></a>`).join('')}
  </div>`;
const service = (k) => `
  <div class="pt-svc">
    <div><p class="pt-label">Service · ${SVC[k].name}</p><h1 class="pt-disp" style="margin-top:21px">${SVC[k].name}.</h1>
      <p class="pt-lead">${SVC[k].desc}. Quoted in writing within 2 hours.</p>
      <p style="margin-top:34px"><a class="pt-btn" data-go="quote">Get a free quote ${ARROW}</a></p></div>
    <div style="display:flex;justify-content:flex-end"><span class="pt-svc-tile" data-hero-tile>${PICTO[k]}</span></div>
  </div>
  <div class="pt-plate"></div>`;
const quote = () => `
  <div class="pt-quote-grid">
    <div><p class="pt-label">Free · in writing within 2 hours</p><h1 class="pt-h1" style="margin-top:21px">Get a<br>free quote.</h1><p class="pt-lead">Four short steps. No account, no card.</p></div>
    <div class="pt-ticket" data-quote-ticket>
      <div class="pt-row"><span class="pt-label">01 · What do you need?</span></div>
      <div class="pt-row">${Object.keys(SVC).map((k) => `<span class="pt-chip" style="--tile:#EFE7D6">${PICTO[k]}${SVC[k].name}</span>`).join('')}</div>
      <div class="pt-row"><span class="pt-label">02 · Where</span></div>
      <div class="pt-row"><span class="pt-label">03 · When</span></div>
      <div class="pt-row"><span class="pt-label">04 · You</span></div>
      <div style="padding-top:21px"><span class="pt-btn">Send my quote request ${ARROW}</span></div>
    </div>
  </div>`;
const about = () => `
  <div class="pt-about"><div><p class="pt-label">About ONAWAY</p><h1 class="pt-disp" style="margin-top:21px">The way<br>it should be.</h1></div>
    <p class="pt-lead">Locally owned, GTA-wide. One crew standard for cleaning, moving and delivery.</p></div>
  <div class="pt-plate" style="height:340px"></div>`;

export function mount({ category, options, play }) {
  const shell = document.querySelector('.pt-shell');
  shell.innerHTML = `
    <div class="pt-frame">
      <header class="pt-nav">
        <a class="pt-wm" data-go="home" aria-label="ONAWAY home">${WORDMARK}</a>
        <nav class="pt-links"><a data-go="service" data-svc="cleaning">Services +</a><a data-go="general">About</a><a data-go="general">Help</a></nav>
        <span class="pt-fr">FR</span>
        <a class="pt-call">${'<svg viewBox="0 0 24 24" width="21" height="21"><path d="M9.2 5.7l-.4-.9c-.3-.6-.4-.9-.6-1.1a2 2 0 0 0-.9-.6C7 3 6.6 3 6 3c-.9 0-1.4 0-1.8.2a2.1 2.1 0 0 0-1.1 1.2C3 4.8 3 5.4 3.1 6.4c.6 5.3 3.5 10.1 8 12.9c4.3 2.6 7.8 2.4 8.8 1.4c.5-.5.9-1.4.9-2.1c0-.7 0-1-.5-1.6c-.4-.5-1.6-1.4-3-2.2c-.6-.3-.9-.5-1.2-.5c-.6 0-1.1.6-1.6 1c-.5.5-1 .7-1.7.4c-1.3-.6-3.3-2.6-3.9-3.9c-.3-.7-.1-1.2.4-1.7c.4-.5 1-1 1-1.6c0-.3-.2-.6-.5-1.2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'}+1 647 877 1411</a>
        <a class="pt-quote" data-go="quote">Get a free quote ${UPRIGHT}</a>
      </header>
      <section class="pt-page is-on" data-page="home">${home()}</section>
      <section class="pt-page" data-page="service"></section>
      <section class="pt-page" data-page="quote">${quote()}</section>
      <section class="pt-page" data-page="general">${about()}</section>
      <button class="pt-back" type="button">← Back to home</button>
    </div>`;
  const frame = shell.querySelector('.pt-frame');
  const back = frame.querySelector('.pt-back');
  const page = (k) => frame.querySelector(`[data-page="${k}"]`);
  let scale = 1;
  const fit = () => {
    scale = shell.clientWidth / 1512;
    frame.style.transform = `scale(${scale})`;
    shell.style.height = `${860 * scale}px`;
  };
  new ResizeObserver(fit).observe(shell);
  fit();

  let current = 'home';
  let busy = false;
  const reduced = () => document.getElementById('rm')?.getAttribute('aria-pressed') === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chosen = () => document.querySelector('[data-k="opt"] [aria-pressed="true"]')?.dataset.v;

  // What every option gets
  const ctx = (from, to, link, point) => ({
    frame, from, to, link, point, PICTO, dm,
    r(el) {
      const f = frame.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      return { x: (b.left - f.left) / scale, y: (b.top - f.top) / scale, w: b.width / scale, h: b.height / scale };
    },
    ov(css, html = '', z = 10) {
      const d = document.createElement('div');
      d.className = 'pt-ov';
      d.style.cssText = `z-index:${z};${css}`;
      d.innerHTML = html;
      frame.append(d);
      return d;
    },
    a(el, keyframes, o = {}) { return el.animate(keyframes, { fill: 'both', easing: EASE, ...o }).finished; },
    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
    crossfade(d = 260) {
      return Promise.all([
        this.a(from, [{ opacity: 1 }, { opacity: 0 }], { duration: d * 0.6, easing: 'ease-out' }),
        this.a(to, [{ opacity: 0 }, { opacity: 1 }], { duration: d, delay: d * 0.3, easing: 'ease-out' }),
      ]);
    },
  });

  async function go(kind, link, point) {
    if (busy) return;
    const target = kind === 'home' ? 'home' : kind;
    const svc = link?.dataset.svc;
    if (target === current && !(target === 'service' && svc && page('service').dataset.svc !== svc)) return;
    if (target === 'service') { page('service').innerHTML = service(svc || 'cleaning'); page('service').dataset.svc = svc || 'cleaning'; }
    const type = kind === 'service' || kind === 'quote' ? kind : 'general';
    const from = page(current);
    const to = page(target);
    busy = true;
    from.style.zIndex = 2;
    to.style.zIndex = 1;
    to.classList.add('is-on');
    const c = ctx(from, to, link, point);
    const run = reduced() ? () => c.crossfade(150) : type === category ? options[chosen()].run : () => c.crossfade();
    try { await run(c); } catch (e) { console.error(e); }
    // clean up: the new page alone, no leftovers
    from.classList.remove('is-on');
    for (const el of [from, to, ...frame.querySelectorAll('*')]) el.getAnimations?.().forEach((x) => x.cancel());
    for (const el of [from, to]) el.removeAttribute('style');
    frame.querySelectorAll('.pt-ov').forEach((o) => o.remove());
    frame.querySelectorAll('[style*="visibility"], [data-hero-tile], [data-quote-ticket]').forEach((el) => { el.style.visibility = ''; el.style.opacity = ''; });
    current = target;
    back.classList.toggle('is-on', current !== 'home');
    busy = false;
  }

  frame.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    const f = frame.getBoundingClientRect();
    go(a.dataset.go, a, { x: (e.clientX - f.left) / scale, y: (e.clientY - f.top) / scale });
  });
  back.addEventListener('click', () => go('home', null, null));

  // Play: from the homepage, through the mock's own link
  document.getElementById('play')?.addEventListener('click', async () => {
    if (busy) return;
    if (current !== 'home') {
      page(current).classList.remove('is-on');
      page('home').classList.add('is-on');
      current = 'home';
      back.classList.remove('is-on');
      await new Promise((r) => setTimeout(r, 300));
    }
    const link = frame.querySelector(play);
    const b = link.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    go(link.dataset.go, link, { x: (b.left + b.width / 2 - f.left) / scale, y: (b.top + b.height / 2 - f.top) / scale });
  });

  // toolbar toggles
  document.querySelector('.top').addEventListener('click', (e) => {
    const b = e.target.closest('.tbtn');
    if (!b) return;
    const g = b.closest('.tg');
    if (g) g.querySelectorAll('.tbtn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    else if (b.id === 'rm') b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    if (g?.dataset.k === 'opt') document.getElementById('play')?.click();
  });
}
