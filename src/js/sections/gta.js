// 05 Across the GTA · GT-10: the section's map is a real 3D city (Mapbox Standard, src/js/gta/mapbox.js) and its
// behaviour is the shared controller (src/js/gta/controller.js): the intro, the idle tour, "Do we cover you?"
// (postal code or town), the hand-off to the quote (06).
//
// Loading. Mapbox GL is about 525 KB gzipped, with its own deferred budget (docs/build-context.md). It never
// competes with the page's first load, yet the map is drawn before the visitor reaches it:
//   1. after the page has loaded and gone idle: the map's code (Mapbox GL and ours), its stylesheet, the areas and
//      a connection to Mapbox. No map yet, so nothing is billed (a map load is counted when a map starts).
//   2. once the visitor has scrolled the page themselves and reached Services (the section after the hero): the
//      map starts, off screen, on the still's view, and loads the first tour stops.
//   3. on entry: the intro and the tour, on a map that is already drawn.
// Landing on the section (a link to /#gta, a restored scroll): all at once. On Save-Data or a 2G connection: only
// as the section nears the screen. Until the map has drawn, and wherever it can't run, the still
// (src/assets/images/gta-map.png) shows and the section works on it, the sentence touring the places.
import { registerOptions } from '../options.js';
import { prefersReducedMotion } from '../motion.js';
import { PLACE_AT, TOUR } from '../data/places.js'; // (already in the page: the quote uses it)

// Dev review panel: the open choices (the locked value first). Nothing here ships.
registerOptions('gta', {
  buildings: ['stone', 'sand', 'camel', 'clay', 'umber', 'ink', 'paper'],
  palette: ['brandrich', 'brandlut'],
  light: ['live', 'day', 'dawn', 'dusk', 'night'],
  intro: ['still', 'flight'], // still: the map takes over from the still image's view · flight: it descends from over the lake first
});

const MAPBOX = 'https://api.mapbox.com';
const conn = navigator.connection;
const frugal = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? ''); // the visitor saves data, or the line is slow

// After the page's load event, when the browser is idle (never in the way of the first load or LCP)
function whenSettled(fn) {
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 4000 }) : setTimeout(fn, 1500));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}
// Before the page has loaded, wait for it; after, at once
const whenLoaded = (fn) => (document.readyState === 'complete' ? fn() : addEventListener('load', fn, { once: true }));

// The input's hint in full where it fits, else its short form (a phone, the narrower desktop card): never cut off
function fitPlaceholder(input) {
  if (!input) return;
  const full = input.placeholder;
  const short = full.split(',')[0]; // "Postal code or town"
  const ctx = document.createElement('canvas').getContext('2d');
  const fit = () => {
    const cs = getComputedStyle(input);
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if ('fontStretch' in ctx) ctx.fontStretch = 'semi-condensed'; // (else measured a touch wide: the short form, harmless)
    const room = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    input.placeholder = ctx.measureText(full).width <= room ? full : short;
  };
  document.fonts.ready.then(fit);
  new ResizeObserver(fit).observe(input);
}

export function init(el) {
  const reduced = prefersReducedMotion();
  const panel = el.querySelector('.gta__panel');
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const still = import.meta.env.DEV && new URLSearchParams(location.search).has('gta-still'); // dev: capture the still
  fitPlaceholder(el.querySelector('.gta__row input'));

  // 1. the code (and Mapbox GL, through preloadMap), fetched once
  let code;
  function loadCode() {
    code ??= Promise.all([import('../gta/mapbox.js'), import('../gta/controller.js'), import('../gta/texture.js')]).then(([mapbox, controller, texture]) => {
      if (token) mapbox.preloadMap();
      return { ...mapbox, ...controller, ...texture };
    });
    return code;
  }
  function prefetch() {
    if (token) document.head.append(Object.assign(document.createElement('link'), { rel: 'preconnect', href: MAPBOX, crossOrigin: 'anonymous' }));
    loadCode();
  }

  // 2. the map, started off screen and drawn ahead of the visitor
  let started = false;
  async function boot() {
    if (started) return;
    started = true;
    stopWatching();
    const { createGtaMap, LOCKED, STILL_CAMERA, createSection, grainTile, asUrl, INK } = await loadCode();
    const opt = (key) => el.dataset[key] ?? LOCKED[key];
    const speed = () => +opt('speed');
    const orbitOn = () => opt('orbit') === 'on';
    // The card's paper tooth (tactile, like the tickets): the paper grain, under the words
    panel.style.setProperty('--gta-grain', asUrl(grainTile(INK.carbon, INK.camel, 220)));
    const gta = createGtaMap(el, { opt, panel, token, reduced, navOverlap: false });
    if (import.meta.env.DEV) el.addEventListener('section:options', () => gta.applyConfig());
    const map = await gta.boot();
    if (!map) { // no map: the section runs on the still
      createSection(el, { camera: STILL_CAMERA, drawn: () => Promise.resolve(), highlight() {}, pin() {}, unpin() {}, zoomFor: () => 0, outline: () => [], areaZoom: () => 0 },
        { speed, orbitOn, matchMode: () => opt('match') });
      return;
    }
    if (import.meta.env.DEV) window.__gta = gta;
    // the map takes the intro's first view and fades in over the still once that view is drawn
    gta.camera.toIntroStart();
    if (!still) createSection(el, gta.adapter, { speed, orbitOn, matchMode: () => opt('match') });
    await gta.adapter.drawn(8000);
    el.classList.add('is-live');
    // then the first two tour stops, so the tour's first flights land on a drawn city
    if (!still && !reduced) for (const name of TOUR.slice(0, 2)) await gta.adapter.warm(PLACE_AT[name]);
  }

  // When to start (a map start is a billed map load, so only for a visitor who is reading on): once they have
  // scrolled the page themselves (a wheel, a touch, a key, a pointer: never a restored scroll, a script, a crawler
  // or a speed test) and reached the section after the hero, Services; on a frugal connection, only once the
  // section is within 800px. Landing on the section itself never waits.
  const services = document.querySelector('[data-section="services"]');
  const INPUT = ['wheel', 'touchmove', 'keydown', 'pointerdown'];
  let engaged = false;
  const reached = () => {
    if (frugal) return el.getBoundingClientRect().top < innerHeight + 800;
    return services ? services.getBoundingClientRect().top < innerHeight / 2 : scrollY > innerHeight;
  };
  const check = () => { if (engaged && reached()) whenLoaded(boot); };
  const engage = () => { engaged = true; INPUT.forEach((t) => removeEventListener(t, engage)); check(); };
  function stopWatching() { removeEventListener('scroll', check); INPUT.forEach((t) => removeEventListener(t, engage)); }
  INPUT.forEach((t) => addEventListener(t, engage, { passive: true }));
  addEventListener('scroll', check, { passive: true });
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); boot(); } }).observe(el);
  if (!frugal) whenSettled(prefetch);
}
