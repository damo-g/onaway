// GT-10 option A · MapLibre GL v5 + OpenFreeMap. Exploration page (explore/gt10/), never linked from the site.
// The page is the real homepage around the section: the site's navbar, sections 04 and 06, the footer and main.js
// (Lenis, the dev review panel, the quote's pre-fill). The section's behaviour is shared (section.js, camera.js);
// this file is the MapLibre side: the style, the area highlight, the labels and tile loading.
// Options live in the site's dev review panel (bottom right) under "gt10"; the first value of each is the pick.
// The map takes no gestures at all, so page scroll is never captured.
import { registerOptions } from '../../src/js/options.js';
import { prefersReducedMotion } from '../../src/js/motion.js';
import { PLACE_AT, TOUR } from '../../src/js/data/places.js';
import { createCamera } from '../../src/js/gta/camera.js';
import { createSection } from '../../src/js/gta/controller.js';
import { loadAreas } from '../../src/js/gta/areas.js';
import { createHighlight, createLabels, panelPadding } from '../../src/js/gta/overlays.js';
import { addSectionGrain } from '../../src/js/gta/texture.js';
import { createMeter } from './meter.js';
import { mapStyle, hatchImage } from './maplibre-style.js';

const OPTIONS = {
  palette: ['kraft', 'tonal', 'carbon', 'quiet'],
  depth: ['on', 'off'],
  grain: ['on', 'off'],
  highlight: ['spotlight', 'tint', 'glow', 'hatch', 'outline', 'dim'],
  match: ['area', 'close'],
  layout: ['veil', 'card'],
  pitch: ['60', '45', '55', '65', '70'],
  speed: ['0.75', '0.6', '1', '0.45', '0.35'],
  orbit: ['on', 'off'],
  buildings: ['shaded', 'flat'],
  relief: ['on', 'off'],
};
registerOptions('gt10', OPTIONS);
// the site itself (after the options are registered, so its dev panel shows them)
await import('../../src/js/main.js');

const el = document.querySelector('[data-section="gt10"]');
const panel = el.querySelector('.gta__panel');
const opt = (key) => el.dataset[key] ?? OPTIONS[key][0];
const reduced = prefersReducedMotion();
const theme = () => { if (opt('palette') === 'carbon') el.dataset.navTheme = 'dark'; else delete el.dataset.navTheme; };
theme();

// shared: the paper grain over the section, the dev meter, the five areas
addSectionGrain(el);
const perf = createMeter();
const { outlines, regions, masks } = await loadAreas();

// ---------- the map, loaded only when the section nears the screen ----------
let map;
let maplibregl;
let camera;
let section;
let labels;
let hl;

const tiles = import.meta.env.DEV ? `${location.origin}/__tiles/{z}/{x}/{y}.pbf` : null; // dev: the local cache (tile-cache.js)
const glyphs = `${location.origin}/explore/gt10/glyphs/{fontstack}/{range}.pbf`; // Overpass Mono (build-glyphs.mjs)
const style = () => mapStyle({ palette: opt('palette'), depth: opt('depth'), buildings: opt('buildings'), relief: opt('relief'), highlight: opt('highlight'), tiles, glyphs, regions, masks });

const padding = () => panelPadding(el, panel, opt('layout'));

// Each place sits close, just under zoom 14: above it the map switches to the heavy z14 tiles (four times as
// many), which take over a second to draw at 60°. z13 tiles still carry every building.
const CLOSE = { Downtown: 13.95, 'North York': 13.95, Mississauga: 13.95 };
const zoomFor = (name, kind) => (CLOSE[name] ?? 13.9) - (kind === 'tour' ? 0.1 : 0);

// ---------- tiles ahead of the camera ----------
// The blank frames in a flight, and the half-drawn arrivals, are tiles the map hasn't parsed yet (parsing, not
// downloading, is the slow part). So places are loaded into MapLibre's own tile cache before the camera gets there:
// a pool of six, the close-up z13 tiles first (they're what the arrival shows), and the newest place ahead of
// older requests. The first two tour stops load during the intro, each next stop the moment the camera lands on the
// one before, and the tour band at z11 (the high part of every flight, which peaks at z11.6) behind them.
// This borrows MapLibre internals (TileManager._loadTile and its out-of-view cache): the version must stay at 5.24
// for it, and production with self-hosted tiles may not need it at all.
const tx = (lng, z) => Math.floor(((lng + 180) / 360) * 2 ** z);
const ty = (lat, z) => Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
const seen = new Map(); // tile key → promise that settles when it's parsed
const settle = new Map(); // tile key → its resolver (kept off the tile ID, which is posted to the worker)
const done = (key) => { settle.get(key)?.(); settle.delete(key); };
const queue = [];
let active = 0;
let TileCtor = null;
let IdCtor = null;
function tileManager() {
  const tm = map?.style?.tileManagers?.omt;
  const sample = tm?._inViewTiles.getAllTiles()[0];
  TileCtor ??= sample?.constructor;
  IdCtor ??= sample?.tileID?.constructor;
  return TileCtor && IdCtor ? tm : null;
}
function enqueue(list, { first = false } = {}) {
  const tm = tileManager();
  if (!tm) return;
  const ids = [];
  const waits = [];
  for (const [z, x, y] of list) {
    const id = new IdCtor(z, 0, z, x, y);
    if (seen.has(id.key)) { waits.push(seen.get(id.key)); continue; }
    if (tm._inViewTiles.getTileById(id.key)) continue;
    const p = new Promise((r) => settle.set(id.key, r));
    seen.set(id.key, p);
    waits.push(p);
    ids.push(id);
  }
  if (first) queue.unshift(...ids);
  else queue.push(...ids);
  pump();
  return Promise.all(waits);
}
function pump() {
  const tm = tileManager();
  while (tm && active < 6 && queue.length) {
    const id = queue.shift();
    if (tm._inViewTiles.getTileById(id.key)) { done(id.key); continue; }
    active++;
    const tile = new TileCtor(id, tm._source.tileSize * id.overscaleFactor());
    tm._loadTile(tile, id.key, tile.state)
      .then(() => { if (tile.hasData() && !tm._inViewTiles.getTileById(id.key)) tm._outOfViewCache.add(id, tile, tile.getExpiryTimeout()); })
      .catch(() => seen.delete(id.key))
      .finally(() => { done(id.key); active--; pump(); });
  }
}
let warmedGta = false;
window.__gt10.pool = () => ({ queue: queue.length, active, seen: seen.size, tm: !!tileManager() });
function warm(at) {
  // the pool borrows its classes from a tile already on screen: before the first one, wait for it
  if (!tileManager()) return new Promise((r) => map.once('idle', () => r(warm(at))));
  const [lng, lat] = at;
  const list = [];
  // z13 first; the view at 60° reaches further north than south, so more rows above the place than below
  for (const [z, r, up] of [[13, 2, 4], [12, 1, 2], [11, 1, 1]]) {
    const cx = tx(lng, z);
    const cy = ty(lat, z);
    for (let y = cy - up; y <= cy + 1; y++) for (let x = cx - r; x <= cx + r; x++) list.push([z, x, y]);
  }
  const ready = enqueue(list, { first: true }) ?? Promise.resolve();
  if (!warmedGta) {
    warmedGta = true;
    const gta = [];
    // the tour's flights peak at z11.6, so the middle of every flight is drawn from z11 tiles across the tour's band
    for (let x = tx(-80.0, 11); x <= tx(-78.75, 11); x++) for (let y = ty(44.0, 11); y <= ty(43.25, 11); y++) gta.push([11, x, y]);
    enqueue(gta);
  }
  return ready;
}

// Resolves once the map tiles on screen are in (or after max ms), so a stop never starts over an empty map.
// Only the map tiles count: the relief and the fades may finish a moment later.
function drawn(max = 1200) {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); map.off('render', check); map.off('sourcedata', check); resolve(); };
    const check = () => { try { if (map.isSourceLoaded('omt')) done(); } catch {} };
    const t = setTimeout(done, max);
    map.on('render', check);
    map.on('sourcedata', check);
    check();
  });
}

const adapter = {
  get camera() { return camera; },
  drawn,
  warm,
  highlight: (region) => hl?.set(region),
  zoomFor,
  outline: (region) => outlines[region],
  areaZoom: () => map.getZoom(),
  pin: (label, at) => labels.pin(label, at),
  unpin: () => labels?.unpin(),
};

async function boot() {
  perf.boot = performance.now();
  [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
  perf.lib = performance.now();
  // MapLibre 5 parses every tile on one worker by default (more only on Safari): the reason the city came in a
  // tile at a time. Half the cores (2–6) parse in parallel.
  maplibregl.setWorkerCount(Math.max(2, Math.min(6, Math.floor((navigator.hardwareConcurrency || 4) / 2))));
  map = new maplibregl.Map({
    container: el.querySelector('.g10-map'),
    style: style(),
    center: [-79.3, 43.18],
    zoom: 7.6,
    pitch: 0,
    bearing: -28,
    maxPitch: 72,
    cancelPendingTileRequestsWhileZooming: false, // keep loading what a flight passes through
    maxTileCacheSize: 600, // room for the preloaded next place (the default keeps about 60 out-of-view tiles)
    maxTileCacheZoomLevels: 40,
    interactive: false, // no wheel, no drag, no touch: the page always scrolls
    pixelRatio: Math.min(devicePixelRatio, 2),
    attributionControl: { compact: false, customAttribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' },
    fadeDuration: 200,
  });
  window.__gt10.map = map;
  map.on('styleimagemissing', (e) => {
    if (!e.id.startsWith('g10-hatch-') || map.hasImage(e.id)) return;
    const { image, options } = hatchImage(`#${e.id.slice(10)}`);
    map.addImage(e.id, image, options);
  });
  map.once('render', () => { perf.firstFrame = performance.now(); });
  await new Promise((r) => map.once('load', r));
  // load the first two tour stops while the visitor is still on the section above
  warm(PLACE_AT[TOUR[1]]);
  warm(PLACE_AT[TOUR[0]]);
  labels = createLabels(map, maplibregl.Marker);
  hl = createHighlight(map, Object.keys(outlines), { reduced });
  // The tour's driver updates the camera the way MapLibre's own animations do: straight on the transform, firing
  // only 'move' (and 'zoom'), with the map's moving flags held while it runs, so the renderer and tile loading stay
  // in "in flight" mode. (jumpTo every frame fires start, move and end each time and cost about a third of the
  // frames.) MapLibre internals, like the preloading: they hold for 5.24; jumpTo is the fallback.
  const fast = typeof map._getTransformForUpdate === 'function' && typeof map._applyUpdatedTransform === 'function' && typeof map._fireMoveEvents === 'function';
  const apply = fast ? {
    start() { map._moving = map._zooming = map._rotating = map._pitching = true; map.fire('movestart'); },
    frame(cam) {
      const tr = map._getTransformForUpdate();
      if (cam.zoom != null && tr.zoom !== cam.zoom) tr.setZoom(cam.zoom);
      if (cam.center) tr.setCenter(maplibregl.LngLat.convert(cam.center));
      if (cam.pitch != null && tr.pitch !== cam.pitch) tr.setPitch(cam.pitch);
      tr.setBearing(cam.bearing);
      if (cam.padding && !tr.isPaddingEqual(cam.padding)) tr.setPadding(cam.padding);
      map._applyUpdatedTransform(tr);
      map._fireMoveEvents();
    },
    end() { map._moving = map._zooming = map._rotating = map._pitching = false; map.fire('moveend'); },
  } : undefined;
  camera = createCamera(map, { pitch: +opt('pitch'), speed: +opt('speed'), orbit: opt('orbit') === 'on', reduced, padding: padding(), apply });
  section = createSection(el, adapter, { speed: () => +opt('speed'), orbitOn: () => opt('orbit') === 'on', matchMode: () => opt('match') });
  window.__gt10.section = section;
}
new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); boot(); } }, { rootMargin: '800px 0px' }).observe(el);

// ---------- options changed in the dev panel ----------
let applied = { ...el.dataset };
el.addEventListener('section:options', () => {
  const was = applied;
  applied = { ...el.dataset };
  theme();
  if (!map) return;
  const changed = (k) => was[k] !== applied[k];
  if (['palette', 'depth', 'buildings', 'relief', 'highlight'].some(changed)) {
    map.setStyle(style(), { diff: true });
    map.once('styledata', () => hl?.paint());
  }
  if (changed('layout')) requestAnimationFrame(() => { camera.set({ padding: padding() }); map.easeTo({ padding: padding(), duration: reduced ? 0 : 600 }); });
  if (changed('pitch')) { camera.set({ pitch: +opt('pitch') }); map.easeTo({ pitch: +opt('pitch'), duration: reduced ? 0 : 800 }); }
  if (changed('orbit')) camera.set({ orbit: opt('orbit') === 'on' });
  if (changed('speed')) camera.set({ speed: +opt('speed') });
});
addEventListener('resize', () => camera?.set({ padding: padding() }));
