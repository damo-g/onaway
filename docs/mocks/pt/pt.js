// PT · page transition mocks, round 2. One engine for the three mocks; every page is built to the live site at
// 1512 × 860 (home at the R2-E end state, the hero with its mini cards, the open Services drop, the service hero,
// the quote page, About). Each mock passes its category and options; other links use a plain crossfade.
// The navbar sits outside the pages and never moves (in production: view-transition-name: nav).
import { WORDMARK, PICTO, F, SVCPAGE } from './assets.js';

export const EASE = 'cubic-bezier(.16,1,.3,1)';      // a long, soft ease-out: arrivals
export const SOFT = 'cubic-bezier(.4,0,.2,1)';       // standard, for small supporting moves
export const INOUT = 'cubic-bezier(.65,0,.35,1)';    // moves that start and stop on screen
export const OUT = 'cubic-bezier(.5,0,.75,0)';       // ease-in: things leaving

const ARROW = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M20 12H4m11 5l5-5l-5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const DOWN = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 4v16m5-5l-5 5l-5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const UPRIGHT = '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M17 7L6 18M11 6h7v7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PHONE = '<svg viewBox="0 0 24 24" width="21" height="21"><path d="M9.2 5.7l-.4-.9c-.3-.6-.4-.9-.6-1.1a2 2 0 0 0-.9-.6C7 3 6.6 3 6 3c-.9 0-1.4 0-1.8.2a2.1 2.1 0 0 0-1.1 1.2C3 4.8 3 5.4 3.1 6.4c.6 5.3 3.5 10.1 8 12.9c4.3 2.6 7.8 2.4 8.8 1.4c.5-.5.9-1.4.9-2.1c0-.7 0-1-.5-1.6c-.4-.5-1.6-1.4-3-2.2c-.6-.3-.9-.5-1.2-.5c-.6 0-1.1.6-1.6 1c-.5.5-1 .7-1.7.4c-1.3-.6-3.3-2.6-3.9-3.9c-.3-.7-.1-1.2.4-1.7c.4-.5 1-1 1-1.6c0-.3-.2-.6-.5-1.2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
const SVC = {
  cleaning: { name: 'Cleaning', desc: 'Homes and workplaces, once or on a schedule', fact: '2 HR QUOTE' },
  moving: { name: 'Moving', desc: 'Homes and offices, one room to a full floor', fact: 'WE WRAP IT' },
  delivery: { name: 'Delivery', desc: 'Single items to full loads, same-day or scheduled', fact: 'GTA-WIDE' },
};

// Dot-matrix text as an SVG (lit dots in currentColor, unlit at 14%), as src/js/dotmatrix.js
export function dm(text, pitch = 5) {
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

// ---------- pages ----------
const home = () => `
  <div class="hero" data-hero>
    <div class="hero-title"><h2 class="disp">Steady hands<br>at your door</h2><p>Cleaning, Moving &amp; Delivery for homes and businesses across the <span>GTA</span></p></div>
    <div class="hc">${Object.entries(SVC).map(([k, s]) => `<a class="hc-card" data-go="service" data-svc="${k}" data-src>${PICTO[k]}<span data-name>${s.name}</span><i>${ARROW}</i></a>`).join('')}</div>
  </div>
  <div class="in" data-r2e>
    <div class="r2-head"><h2 class="h1" data-block>What we take<br>off your plate.</h2><p class="lead" data-block>Three services, one crew standard. Pick one to see what's included and book a window.</p></div>
    <div class="r2-cards">${Object.entries(SVC).map(([k, s]) => `
      <a class="r2-card" data-go="service" data-svc="${k}" data-src data-block><span class="r2-tile" data-tile>${PICTO[k]}</span><span class="r2-name"><b data-name>${s.name}</b><small>${s.desc}</small></span><span class="r2-fact">${dm(s.fact, 4)}</span><span class="r2-arrow">${ARROW}</span></a>`).join('')}
    </div>
  </div>`;

const service = (k) => {
  const p = SVCPAGE[k];
  return `<div class="in">
    <p class="sv-crumb lb mut" data-block>Home&nbsp; / &nbsp;Services&nbsp; / &nbsp;<b>${p.name}</b></p>
    <div class="sv-head" data-block><h1 class="h1">${p.title}</h1>
      <div class="sv-side"><p class="lead">${p.lead}</p><p class="lb mut sv-by">Your quote arrives in writing <b>by 10:00 AM</b></p><a class="sv-call">Or call +1 647 877 1411</a></div></div>
    <div class="sv-hang">
      <div class="sv-rail" data-rail></div>
      <div class="sv-band" data-band><span class="sv-band__tile" data-tile>${p.tile.replace(/var\(--band-tile\)/g, 'var(--tile)')}</span><span class="sv-band__name" data-name>${p.name}</span><span class="sv-band__board">${dm(p.fact, 3)}</span><span class="sv-band__arrow">${DOWN}</span></div>
      <div class="sv-doors">${p.doors.map((d) => `<a class="sv-door" data-door><span class="sv-door__tile">${d.svg.replace(/var\(--door-tile\)/g, 'var(--tile)')}</span><span><b>${d.name}</b><small>${d.sub}</small></span><i>${ARROW}</i></a>`).join('')}</div>
    </div></div>`;
};

const quote = () => `<div class="in">
    <div class="q-head" data-block><h1 class="h1">Get a free quote.</h1><p class="lead">Tell us what you need. Your quote arrives in writing <b>by 10:00 AM</b>.</p><small>Open 8 AM – 8 PM daily. Send it any time.</small></div>
  </div>
  <div class="q-body">
    <div class="q-steps" data-block><span class="lb">01</span><div><h2>The job</h2>
      <p class="lb mut q-for">For a</p><div class="q-chips"><span class="q-chip on">Home</span><span class="q-chip">Business</span></div>
      <p class="lb mut">Service</p><div class="q-tiles">${Object.keys(SVC).map((k) => `<span class="q-tile">${PICTO[k]}${SVC[k].name}</span>`).join('')}</div></div></div>
    <div class="q-ticket" data-quote-ticket data-block>
      <div class="qt-head" data-qt-head><span class="w">W</span><span class="lb">Quote request</span><span class="lb">0 of 5 answered</span></div>
      <div class="qt-rows">${['Service', 'For a', 'Where', 'The place', 'When', 'Name', 'Reach'].map((l) => `<div class="qt-row"><span class="lb">${l}</span><span data-dash>—</span></div>`).join('')}</div>
    </div>
  </div>`;

const about = () => `<div class="in">
    <div class="ab"><h1 class="h1" data-block>A local crew<br>with a system.</h1>
      <p class="lead" data-block>A Toronto company that cleans, moves and delivers for homes and businesses across the GTA, with a plan written down before anyone lifts a thing.</p>
      <div class="ab-mark" data-block><div class="wm">${WORDMARK}</div><div class="parts"><div><b>ONA</b><span>Yoruba for road,<br>or the way.</span></div><div><b>WAY</b><span>On our way,<br>and on time.</span></div></div></div>
    </div></div>
  <div class="ab-paint" data-block></div>`;

export function mount({ category, options, play }) {
  const shell = document.querySelector('.pt-shell');
  // Round 3: the option buttons come from the options (the recommended one marked and chosen first), and the
  // verdict card shows the chosen option's score, sentiment, and what works and what doesn't
  const optBox = document.querySelector('[data-k="opt"]');
  const ids = Object.keys(options);
  const recId = ids.find((k) => options[k].rec) ?? ids[0];
  if (optBox && options[recId].score !== undefined) {
    optBox.innerHTML = '<span class="tl0">Option</span>' + ids.map((k) => `<button class="tbtn${options[k].rec ? ' rec' : ''}" data-v="${k}" aria-pressed="${k === recId}">${options[k].label}${options[k].rec ? '<span class="recb">Rec</span>' : ''}</button>`).join('');
  }
  const verdict = document.querySelector('.verdict');
  const showVerdict = () => {
    const o = options[document.querySelector('[data-k="opt"] [aria-pressed="true"]')?.dataset.v];
    if (!verdict || !o || o.score === undefined) return;
    verdict.innerHTML = `<div class="v-top"><span class="v-name">${o.label}</span><span class="v-score">${o.score.toFixed(1)}<small> / 10</small></span></div>`
      + (o.rec ? '<p class="v-rec">Recommended</p>' : '')
      + `<p class="v-sent">${o.verdict}</p><ul>${(o.pros || []).map((x) => `<li class="pro">${x}</li>`).join('')}${(o.cons || []).map((x) => `<li class="con">${x}</li>`).join('')}</ul>`;
  };
  showVerdict();
  shell.innerHTML = `
    <div class="pt-frame" data-view="r2e">
      <header class="pt-nav">
        <a class="pt-wm" data-go="home" aria-label="ONAWAY home">${WORDMARK}</a>
        <nav class="pt-links"><a data-go="service" data-svc="cleaning">Services +</a><a data-go="general">About</a><a data-go="general">Help</a>
          <div class="nd">${Object.entries(SVC).map(([k, s]) => `<a class="nd-row" data-go="service" data-svc="${k}" data-src><span data-name>${s.name}</span><i>${ARROW}</i></a>`).join('')}</div></nav>
        <span class="pt-fr">FR</span>
        <a class="pt-call">${PHONE}+1 647 877 1411</a>
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

  // The homepage shows either the R2-E end state or the hero (PT-01's From toggle); the nav view opens the drop
  const view = () => document.querySelector('[data-k="from"] [aria-pressed="true"]')?.dataset.v ?? 'r2e';
  const showView = () => {
    const v = view();
    frame.dataset.view = v;
    page('home').querySelector('[data-hero]').style.display = v === 'hero' ? '' : 'none';
    page('home').querySelector('[data-r2e]').style.display = v === 'hero' ? 'none' : '';
  };
  showView();

  let current = 'home';
  let busy = false;
  const reduced = () => document.getElementById('rm')?.getAttribute('aria-pressed') === 'true' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chosen = () => document.querySelector('[data-k="opt"] [aria-pressed="true"]')?.dataset.v;

  // What every option gets
  const ctx = (from, to, link, point) => ({
    frame, from, to, link, point, PICTO, dm, view: view(),
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
    // a copy of an element, laid over it exactly
    clone(el, z = 11) {
      const r = this.r(el);
      const c = el.cloneNode(true);
      c.classList.add('pt-ov');
      c.removeAttribute('data-quote-ticket');
      c.style.cssText = `position:absolute;margin:0;left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px;z-index:${z}`;
      frame.append(c);
      return c;
    },
    a(el, keyframes, o = {}) { return el.animate(keyframes, { fill: 'both', easing: EASE, ...o }).finished; },
    wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
    blocks(el) { return [...el.querySelectorAll('[data-block]')].filter((b) => b.offsetParent !== null); },
    crossfade(d = 300) {
      return Promise.all([
        this.a(from, [{ opacity: 1 }, { opacity: 0 }], { duration: d * 0.6, easing: SOFT }),
        this.a(to, [{ opacity: 0 }, { opacity: 1 }], { duration: d, delay: d * 0.3, easing: SOFT }),
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
    if (current === 'home' && frame.dataset.view === 'nav') frame.querySelector('.nd').style.visibility = 'hidden';
    if (target !== 'home') frame.dataset.view = 'page';
    const run = reduced() ? () => c.crossfade(150) : type === category ? options[chosen()].run : () => c.crossfade();
    try { await run(c); } catch (e) { console.error(e); }
    // clean up: the new page alone, no leftovers
    from.classList.remove('is-on');
    for (const el of [from, to, ...frame.querySelectorAll('*')]) el.getAnimations?.().forEach((x) => x.cancel());
    for (const el of [from, to]) el.removeAttribute('style');
    frame.querySelectorAll('.pt-ov').forEach((o) => o.remove());
    // (the pictograms' own inline styles, inside their SVGs, stay)
    frame.querySelectorAll('[style]').forEach((el) => { if (!el.matches('.pt-frame, [data-hero], [data-r2e]') && !el.closest('svg')) el.removeAttribute('style'); });
    frame.querySelector('.nd').style.visibility = '';
    current = target;
    if (target === 'home') showView();
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

  // Play: back to the homepage (instantly), then through the mock's own link for the current view
  document.getElementById('play')?.addEventListener('click', async () => {
    if (busy) return;
    if (current !== 'home') {
      page(current).classList.remove('is-on');
      page('home').classList.add('is-on');
      current = 'home';
      back.classList.remove('is-on');
    }
    showView();
    await new Promise((r) => setTimeout(r, 350));
    const link = frame.querySelector(typeof play === 'function' ? play(view()) : play);
    const b = link.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    go(link.dataset.go, link, { x: (b.left + b.width / 2 - f.left) / scale, y: (b.top + b.height / 2 - f.top) / scale });
  });

  // toolbar toggles: choosing an option or a starting point replays it
  document.querySelector('.top').addEventListener('click', (e) => {
    const b = e.target.closest('.tbtn');
    if (!b) return;
    const g = b.closest('.tg');
    if (g) g.querySelectorAll('.tbtn').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    else if (b.id === 'rm') b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    if (g?.dataset.k === 'opt') showVerdict();
    if (g?.dataset.k === 'opt' || g?.dataset.k === 'from') document.getElementById('play')?.click();
  });
}
