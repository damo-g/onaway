import { registerOptions } from '../options.js';
import { pinScrub, prefersReducedMotion, ScrollTrigger } from '../motion.js';

// Locked first: overcast plate, navbar clear once docked, zoom 1.00 → 1.25. Fallback mode (scroll-past) comes later.
registerOptions('hero', { weather: ['ov01', 'tb05'], docked: ['clear', 'solid'], zoom: ['1.25', '1.04', 'off'] });

const ZOOM = { '1.25': 0.25, '1.04': 0.04, off: 0 };
// HF-01 timeline, t 0→1: the bar docks over 0→.45, the headline writes in at .46 and .50,
// the description at .54 and the service cards from .52 to .82, then it rests.
const DOCK = 0.45;

const cl = (v) => Math.min(1, Math.max(0, v));
const L = (a, b, t) => a + (b - a) * t;
const eo = (v) => 1 - (1 - v) ** 3;
const eio = (v) => (v < 0.5 ? 4 * v ** 3 : 1 - (-2 * v + 2) ** 3 / 2);

export function init(el) {
  const nav = document.querySelector('.site-nav');
  const plate = el.querySelector('.hero__plate');
  const chip = el.querySelector('.hero__chip');
  const lede = el.querySelector('.hero__lede');
  const lines = [...el.querySelectorAll('.hero__title span')];
  const desc = el.querySelector('.hero__desc');
  const cards = [...el.querySelectorAll('.hero-card')];
  const opt = (key, locked) => el.dataset[key] ?? locked;
  let m;
  let last = 1;

  // Sizes come from the CSS tokens for the current breakpoint (registered, so they resolve to px)
  function measure() {
    const root = getComputedStyle(document.documentElement);
    const px = (name) => parseFloat(root.getPropertyValue(name));
    m = {
      vh: el.clientHeight,
      margin: px('--grid-margin'),
      navA: px('--nav-h-a'),
      navD: px('--nav-h'),
      wmA: px('--wm-h-a'),
      wmD: px('--wm-h'),
      btnA: px('--btn-h-a'),
      gapA: px('--hero-gap-a'),
      // On mobile the bar's buttons stay flush right in state A; there's no room for an inset
      quoteInsetA: window.matchMedia('(width >= 768px)').matches ? px('--grid-margin') : 0,
    };
  }

  function render(t) {
    last = t;
    const { vh, margin, navA, navD } = m;
    const k = cl(t / DOCK);
    const ke = eio(k);
    const travel = vh - navA;
    const scrolled = travel * k;

    // Plate: inset by the margin → full bleed; its bottom edge reaches the fold early
    const inset = L(margin, 0, ke);
    const bottom = L(vh - navA - m.gapA, vh, eo(cl(k * 1.6)));
    plate.style.clipPath = `inset(${inset}px ${inset}px ${vh - bottom}px ${inset}px)`;
    el.style.setProperty('--hero-zoom', 1 + ZOOM[opt('zoom', '1.25')] * ke);

    // Navbar: rises from the fold, shrinks to its docked size, wordmark settles at 80%
    const navY = travel - scrolled;
    const s = nav.style;
    s.setProperty('--nav-y', `${navY}px`);
    s.setProperty('--nav-h', `${L(navA, navD, ke)}px`);
    s.setProperty('--wm-h', `${L(m.wmA, m.wmD, eio(cl(k / 0.8)))}px`);
    // Call and quote share one height: centred and inset in state A, filling the docked bar flush right
    const btn = `${L(m.btnA, navD, ke)}px`;
    s.setProperty('--quote-h', btn);
    s.setProperty('--call-h', btn);
    s.setProperty('--quote-inset', `${L(m.quoteInsetA, 0, ke)}px`);
    const solid = opt('docked', 'clear') === 'solid';
    s.setProperty('--hero-bg', solid ? 1 : 1 - cl((t - DOCK) / 0.06));
    s.setProperty('--hero-line', solid ? cl(k * 4 - 3) : 0);

    // State A details leave as the bar rises: the descriptor at once, the GTA tag when the bar reaches it
    lede.style.opacity = 1 - cl(scrolled / 24);
    const chipBottom = bottom - margin;
    chip.style.right = `${inset + margin}px`;
    chip.style.bottom = `${vh - chipBottom}px`;
    chip.style.opacity = cl((navY - chipBottom - 4) / 26);

    // End state, one thing at a time
    [0.46, 0.5].forEach((at, i) => {
      const p = eo(cl((t - at) / 0.12));
      lines[i].style.opacity = p;
      lines[i].style.transform = `translateY(${24 * (1 - p)}px)`;
    });
    const d = eo(cl((t - 0.54) / 0.12));
    desc.style.opacity = d;
    desc.style.transform = `translateY(${13 * (1 - d)}px)`;
    const run = cl((t - 0.52) / 0.3);
    cards.forEach((card, i) => {
      const p = eo(cl((run - i * 0.12) / 0.6));
      card.style.opacity = p;
      card.style.transform = `translateY(${28 * (1 - p)}px)`;
      card.parentElement.inert = p < 0.5;
    });
  }

  measure();
  ScrollTrigger.addEventListener('refreshInit', measure);
  if (!prefersReducedMotion()) el.classList.add('is-scripted');

  if (import.meta.env.DEV) {
    // Review panel: swap the plate for the chosen weather, re-render on any option change
    const pictures = { ov01: el.querySelector('.hero__plate picture') };
    const showWeather = () => {
      const want = opt('weather', 'ov01');
      const current = el.querySelector('.hero__plate picture');
      if (current.dataset.image === want) return;
      pictures[want] ??= el.querySelector(`template[data-weather="${want}"]`).content.querySelector('picture');
      current.replaceWith(pictures[want]);
    };
    showWeather();
    el.addEventListener('section:options', () => {
      showWeather();
      render(last);
    });
  }

  pinScrub(el, () => (m.vh - m.navA) / DOCK, render, { smooth: 0.6 });
  el.classList.add('is-ready');
}
