// 05 Across the GTA · GT-10: the section's map is a real 3D city (Mapbox Standard, src/js/gta/mapbox.js) and its
// behaviour is the shared controller (src/js/gta/controller.js): the intro, the idle tour, "Do we cover you?"
// (postal code or town), the hand-off to the quote (06).
//
// Mapbox GL is about 518 KB gzipped, so it has its own deferred budget (docs/build-context.md): it loads only as the
// section nears the screen, never with the page, and so does everything else of the section's (src/js/gta/:
// the map, the camera, the controller and the town lookup). Until the map has drawn, and wherever it can't run, the still
// (src/assets/images/gta-map.png) shows and the section works on it, the sentence touring the places.
import { registerOptions } from '../options.js';
import { prefersReducedMotion } from '../motion.js';

// Dev review panel: the open choices (the locked value first). Nothing here ships.
registerOptions('gta', {
  buildings: ['stone', 'sand', 'camel', 'clay', 'umber', 'ink', 'paper'],
  palette: ['brandrich', 'brandlut'],
  light: ['live', 'day', 'dawn', 'dusk', 'night'],
  intro: ['still', 'flight'], // still: the map takes over from the still image's view · flight: it descends from over the lake first
});

export function init(el) {
  const reduced = prefersReducedMotion();
  const panel = el.querySelector('.gta__panel');
  const still = import.meta.env.DEV && new URLSearchParams(location.search).has('gta-still'); // dev: capture the still

  let started = false;
  async function boot() {
    if (started) return;
    started = true;
    const [{ createGtaMap, LOCKED, STILL_CAMERA }, { createSection }, { grainTile, asUrl, INK }] = await Promise.all([
      import('../gta/mapbox.js'), import('../gta/controller.js'), import('../gta/texture.js'),
    ]);
    const opt = (key) => el.dataset[key] ?? LOCKED[key];
    const speed = () => +opt('speed');
    const orbitOn = () => opt('orbit') === 'on';
    // The card's paper tooth (tactile, like the tickets): the paper grain, under the words
    panel.style.setProperty('--gta-grain', asUrl(grainTile(INK.carbon, INK.camel, 220)));
    const gta = createGtaMap(el, { opt, panel, token: import.meta.env.VITE_MAPBOX_TOKEN, reduced, navOverlap: false });
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
  }
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); boot(); } }, { rootMargin: '800px 0px' }).observe(el);
}
