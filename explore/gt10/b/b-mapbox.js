// GT-10 option B · Mapbox GL JS v3, Standard style. Exploration page (explore/gt10/b/), never linked from the site.
// The same page and behaviour as option A (the real homepage around the section; the shared controller, camera,
// areas, labels and highlight), on Mapbox's Standard map: real lighting, 3D buildings, landmarks and trees.
// Options live in the site's dev review panel under "gt10b" (the first value of each is the pick); the map editor
// (bottom left, dev only) has colour pickers, the texture opacity and "Copy config".
// The map takes no gestures at all, so page scroll is never captured.
import { registerOptions } from '../../../src/js/options.js';
import { prefersReducedMotion } from '../../../src/js/motion.js';
import { PLACE_AT } from '../../../src/js/data/places.js';
import { createCamera } from '../camera.js';
import { createSection } from '../section.js';
import { loadAreas, WORLD_FC } from '../areas.js';
import { createHighlight, createLabels, panelPadding } from '../overlays.js';
import { createMeter } from '../meter.js';
import { grainTile, airbrushTile, tileable, neutral, asUrl, asImageData, INK } from '../texture.js';
import { T, mix, alpha } from '../colors.js';
import { PALETTES, paletteConfig, liveLight, sunTimes, torontoTime } from './presets.js';

// the logo-work textures, if any have been dropped into ./textures/ (each becomes a texture option)
const LOGO = Object.fromEntries(Object.entries(import.meta.glob('./textures/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), url]));

const OPTIONS = {
  palette: Object.keys(PALETTES),
  light: ['palette', 'live', 'day', 'dawn', 'dusk', 'night'],
  objects: ['all', 'facades', 'no-trees', 'flat'],
  labels: ['places', 'none', 'all'],
  poi: ['off', 'landmarks', 'on'],
  names: ['ours', 'off'],
  font: ['din', 'mono'],
  texture: ['airbrush', 'grain', 'none', ...Object.keys(LOGO)],
  placement: ['screen', 'ground', 'both'],
  opacity: ['20', '10', '30', '40', '0'],
  highlight: ['spotlight', 'tint', 'outline'],
  match: ['area', 'close'],
  closeness: ['15', '14.5', '16'],
  layout: ['veil', 'card'],
  pitch: ['50', '60', '45'],
  orbit: ['on', 'off'],
  speed: ['0.75', '1', '0.6'],
};
registerOptions('gt10b', OPTIONS);
await import('../../../src/js/main.js');

const el = document.querySelector('[data-section="gt10b"]');
const panel = el.querySelector('.gta__panel');
const opt = (key) => el.dataset[key] ?? OPTIONS[key][0];
const reduced = prefersReducedMotion();
const editor = { overrides: {}, opacity: null }; // map editor state (colour overrides, opacity slider)
const opacity = () => (editor.opacity ?? +opt('opacity')) / 100;
const perf = createMeter();
const { outlines, regions, masks } = await loadAreas();

// The section turns dark with the Carbon palette, and with dusk or night light (the panel inverts, the navbar
// switches over it), so a dark map never sits beside a paper panel. (gt10.css: [data-palette="carbon"], [data-dark])
function theme() {
  const dark = PALETTES[opt('palette')]?.dark || ['dusk', 'night'].includes(lightPreset());
  if (dark) { el.dataset.navTheme = 'dark'; el.dataset.dark = ''; } else { delete el.dataset.navTheme; delete el.dataset.dark; }
}

// ---------- textures ----------
// Generated (paper grain, airbrush) or a logo texture made seamless. On screen: two layers over the section,
// multiply then soft-light. On the ground: a pattern on a world-sized fill in Standard's bottom slot, so it moves
// with the map.
const screenTex = ['multiply', 'soft-light'].map((mode) => {
  const d = document.createElement('div');
  d.dataset.mode = mode;
  d.className = `g10b-tex g10b-tex--${mode}`;
  d.setAttribute('aria-hidden', 'true');
  el.append(d);
  return d;
});
const texCache = {};
async function textureCanvas(name) {
  if (texCache[name]) return texCache[name];
  if (name === 'grain') texCache[name] = grainTile(INK.carbon, INK.camel, 256);
  else if (name === 'airbrush') texCache[name] = airbrushTile({ inks: [INK.paper, INK.camel, [196, 150, 112]], n: 512, scale: 2, seed: 4, alpha: 0.6 }); // paper, camel, and camel warmed with rust; drawn large (see SIZE)
  else if (LOGO[name]) {
    const img = new Image();
    img.src = LOGO[name];
    await img.decode();
    texCache[name] = tileable(img, 384);
  }
  return texCache[name] ?? null;
}
// how large each texture repeats on screen: the airbrush's clouds broad and soft, the grain fine
const SIZE = { airbrush: '1400px', grain: '256px' };
async function applyTexture() {
  const name = opt('texture');
  const where = opt('placement');
  const c = name === 'none' ? null : await textureCanvas(name);
  const onScreen = c && where !== 'ground';
  screenTex.forEach((d) => {
    // each layer gets the texture made neutral for its blend (no overall wash or darkening, only the texture)
    const key = `${name}:${d.dataset.mode}`;
    if (onScreen) texCache[key] ??= asUrl(neutral(c, d.dataset.mode));
    d.style.backgroundImage = onScreen ? texCache[key] : 'none';
    d.style.backgroundSize = SIZE[name] ?? '768px';
    d.style.opacity = onScreen ? String(Math.min(1, opacity() * 2)) : '0';
  });
  if (!map?.getLayer('tex-ground')) return;
  const onGround = c && where !== 'screen';
  if (onGround) {
    const id = `g10-tex-${name}`;
    if (!map.hasImage(id)) map.addImage(id, asImageData(c), { pixelRatio: name === 'airbrush' ? 0.5 : 2 }); // the airbrush laid broad on the ground too
    map.setPaintProperty('tex-ground', 'fill-pattern', id);
  }
  map.setLayoutProperty('tex-ground', 'visibility', onGround ? 'visible' : 'none');
  map.setPaintProperty('tex-ground', 'fill-opacity', onGround ? Math.min(1, opacity() * 1.6) : 0);
}

// ---------- the basemap config: palette + light + 3D + labels + editor overrides ----------
let liveTimer = 0;
function lightPreset() {
  const l = opt('light');
  if (l === 'palette') return PALETTES[opt('palette')]?.light ?? 'day';
  if (l === 'live') return liveLight();
  return l;
}
function scheduleLive() {
  clearTimeout(liveTimer);
  if (opt('light') !== 'live') return;
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(60, 0, 0); // the top of the next hour
  liveTimer = setTimeout(() => { applyConfig(); scheduleLive(); }, next - now + 500);
}
function config() {
  const c = paletteConfig(opt('palette'), editor.overrides);
  const objects = opt('objects');
  Object.assign(c, {
    lightPreset: lightPreset(),
    show3dObjects: objects !== 'flat', show3dBuildings: objects !== 'flat', show3dLandmarks: objects !== 'flat',
    show3dTrees: objects === 'all' || objects === 'facades', show3dFacades: objects === 'facades',
    showPlaceLabels: opt('labels') !== 'none', showRoadLabels: opt('labels') === 'all', showTransitLabels: false, showPedestrianRoads: opt('labels') === 'all',
    showPointOfInterestLabels: opt('poi') === 'on', showLandmarkIcons: opt('poi') !== 'off', showLandmarkIconLabels: opt('poi') !== 'off',
    showAdminBoundaries: false, // the five areas are ours
    font: opt('font') === 'mono' ? 'Roboto Mono' : 'DIN Pro',
  });
  return c;
}
function applyConfig() {
  theme();
  if (!map) return;
  map.setConfig('basemap', config());
  const fog = PALETTES[opt('palette')]?.fog;
  map.setFog(fog ?? null);
  paintOverlays();
  syncEditor();
}

// ---------- the map, loaded only when the section nears the screen ----------
let map;
let mapboxgl;
let camera;
let section;
let labels;
let hl;

// Our layers on Standard: the ground texture, the five areas and their highlight, all in the bottom slot (under
// roads, buildings and labels). Highlight styles: spotlight (outside dims, inside glows evenly), tint, outline.
const k = ['number', ['feature-state', 'k'], 0];
const HIGHLIGHTS = { spotlight: ['hl-spot', 'hl-inner', 'hl-line-thin'], tint: ['hl-tint', 'hl-line-thin'], outline: ['hl-casing', 'hl-line'] };
function addOverlays() {
  map.addSource('g10-world', { type: 'geojson', data: WORLD_FC });
  map.addSource('regions', { type: 'geojson', data: regions, promoteId: 'region' });
  map.addSource('masks', { type: 'geojson', data: masks, promoteId: 'region' });
  const bottom = { slot: 'bottom' };
  map.addLayer({ id: 'tex-ground', type: 'fill', source: 'g10-world', ...bottom, layout: { visibility: 'none' }, paint: { 'fill-opacity': 0 } });
  map.addLayer({ id: 'region-line', type: 'line', source: 'regions', ...bottom, paint: { 'line-color': alpha('carbon', 0.34), 'line-width': 1, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'hl-spot', type: 'fill', source: 'masks', ...bottom, paint: { 'fill-color': T.carbon, 'fill-opacity': ['*', k, 0.22] } });
  map.addLayer({ id: 'hl-inner', type: 'fill', source: 'regions', ...bottom, paint: { 'fill-color': mix('paper', 'yellow', 0.5), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10.5, ['*', k, 0.36], 12.5, ['*', k, 0.16], 14, ['*', k, 0.06]] } });
  map.addLayer({ id: 'hl-tint', type: 'fill', source: 'regions', ...bottom, paint: { 'fill-color': T.yellow, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, ['*', k, 0.3], 11, ['*', k, 0.2], 14, ['*', k, 0.04]] } });
  map.addLayer({ id: 'hl-casing', type: 'line', source: 'regions', ...bottom, layout: { 'line-join': 'round' }, paint: { 'line-color': T.carbon, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 9], 'line-opacity': ['*', k, 0.18] } });
  map.addLayer({ id: 'hl-line', type: 'line', source: 'regions', ...bottom, layout: { 'line-join': 'round' }, paint: { 'line-color': T.yellow, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 14, 5], 'line-opacity': k } });
  map.addLayer({ id: 'hl-line-thin', type: 'line', source: 'regions', ...bottom, layout: { 'line-join': 'round' }, paint: { 'line-color': T.yellow, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 3], 'line-opacity': k } });
}
function paintOverlays() {
  if (!map?.getLayer('hl-spot')) return;
  const dark = 'dark' in el.dataset;
  const on = new Set(HIGHLIGHTS[opt('highlight')] ?? HIGHLIGHTS.spotlight);
  for (const id of ['hl-spot', 'hl-inner', 'hl-tint', 'hl-casing', 'hl-line', 'hl-line-thin']) map.setLayoutProperty(id, 'visibility', on.has(id) ? 'visible' : 'none');
  map.setPaintProperty('region-line', 'line-color', dark ? alpha('paper', 0.3) : alpha('carbon', 0.34));
  map.setPaintProperty('hl-spot', 'fill-opacity', ['*', k, dark ? 0.5 : 0.22]);
  map.setPaintProperty('hl-inner', 'fill-color', dark ? T.yellow : mix('paper', 'yellow', 0.5));
  labels?.regions(opt('names') === 'ours');
  applyTexture();
}

const padding = () => panelPadding(el, panel, opt('layout'));
// How close the stops sit (dev panel → closeness). Standard raises its 3D buildings from about z14.5 and fully
// at z15, so z15 is the pick; each step closer adds detail and costs frames. The tilt (dev panel → pitch) is the
// other big cost: 50° keeps the 3D city at a steadier frame rate than 60°.
const zoomFor = (name, kind) => +opt('closeness') - (kind === 'tour' ? 0.1 : 0);

// Resolves once the tiles on screen are in (or after max ms)
function drawn(max = 1500) {
  return new Promise((resolve) => {
    const done = () => { clearTimeout(t); map.off('render', check); resolve(); };
    const check = () => { if (map.areTilesLoaded()) done(); };
    const t = setTimeout(done, max);
    map.on('render', check);
    check();
  });
}

// Load a place's tiles before the camera goes there: Mapbox's own public preload (jumpTo with preloadOnly
// loads the view's tiles without moving the camera)
function warm(at) {
  if (!map) return Promise.resolve();
  map.jumpTo({ center: at, zoom: +opt('closeness') - 0.1, pitch: +opt('pitch'), bearing: map.getBearing(), padding: padding(), preloadOnly: true });
  return new Promise((r) => setTimeout(r, 1200));
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
  [{ default: mapboxgl }] = await Promise.all([import('mapbox-gl'), import('mapbox-gl/dist/mapbox-gl.css')]);
  perf.lib = performance.now();
  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: el.querySelector('.g10-map'),
    style: 'mapbox://styles/mapbox/standard',
    config: { basemap: config() },
    projection: 'mercator', // flat, like option A (Standard defaults to a globe when zoomed out)
    center: [-79.3, 43.18],
    zoom: 7.6,
    pitch: 0,
    bearing: -28,
    maxPitch: 72,
    interactive: false, // no wheel, no drag, no touch: the page always scrolls
    attributionControl: false,
    logoPosition: 'bottom-right',
  });
  map.addControl(new mapboxgl.AttributionControl({ compact: false }), 'bottom-right');
  window.__gt10.map = map;
  map.once('render', () => { perf.firstFrame = performance.now(); });
  await new Promise((r) => map.once('style.load', r));
  addOverlays();
  applyConfig();
  await new Promise((r) => (map.loaded() ? r() : map.once('load', r)));
  labels = createLabels(map, mapboxgl.Marker);
  hl = createHighlight(map, Object.keys(outlines), { reduced });
  paintOverlays();
  scheduleLive();
  // The tour's driver updates the camera the way Mapbox's own animations do: straight on the transform, firing
  // only 'move' (and 'zoom'), with the moving flags held while it runs. (jumpTo every frame fires start, move and
  // end each time.) Mapbox internals; jumpTo is the fallback.
  const fast = typeof map._fireMoveEvents === 'function' && map.transform;
  const apply = fast ? {
    start() { map._moving = map._zooming = map._rotating = map._pitching = true; map.fire('movestart'); },
    frame(cam) {
      const tr = map.transform;
      if (cam.zoom != null) tr.zoom = cam.zoom;
      if (cam.center) tr.center = mapboxgl.LngLat.convert(cam.center);
      if (cam.pitch != null) tr.pitch = cam.pitch;
      tr.bearing = cam.bearing;
      if (cam.padding && !tr.isPaddingEqual(cam.padding)) tr.padding = cam.padding;
      map._fireMoveEvents();
    },
    end() { map._moving = map._zooming = map._rotating = map._pitching = false; map.fire('moveend'); },
  } : undefined;
  camera = createCamera(map, { pitch: +opt('pitch'), speed: +opt('speed'), orbit: opt('orbit') === 'on', reduced, padding: padding(), apply });
  section = createSection(el, adapter, { speed: () => +opt('speed'), orbitOn: () => opt('orbit') === 'on', matchMode: () => opt('match') });
  window.__gt10.section = section;
}
new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); boot(); } }, { rootMargin: '800px 0px' }).observe(el);
applyTexture();
theme();

// ---------- options changed in the dev panel ----------
let applied = { ...el.dataset };
el.addEventListener('section:options', () => {
  const was = applied;
  applied = { ...el.dataset };
  const changed = (key) => was[key] !== applied[key];
  if (changed('palette')) editor.overrides = {};
  if (changed('opacity')) editor.opacity = null;
  theme();
  if (['palette', 'light', 'objects', 'labels', 'poi', 'font'].some(changed)) { applyConfig(); scheduleLive(); }
  if (['highlight', 'names'].some(changed)) paintOverlays();
  if (['texture', 'placement', 'opacity'].some(changed)) applyTexture();
  if (!map || !camera) return;
  if (changed('layout')) requestAnimationFrame(() => { camera.set({ padding: padding() }); map.easeTo({ padding: padding(), duration: reduced ? 0 : 600 }); });
  if (changed('pitch')) { camera.set({ pitch: +opt('pitch') }); map.easeTo({ pitch: +opt('pitch'), duration: reduced ? 0 : 800 }); }
  if (changed('orbit')) camera.set({ orbit: opt('orbit') === 'on' });
  if (changed('speed')) camera.set({ speed: +opt('speed') });
});
addEventListener('resize', () => camera?.set({ padding: padding() }));

// ---------- the map editor (dev only): colour pickers, texture opacity, Copy config ----------
const PICKERS = [['colorLand', 'Land'], ['colorWater', 'Water'], ['colorGreenspace', 'Green space'], ['colorRoads', 'Roads'], ['colorMotorways', 'Motorways'], ['colorBuildings', 'Buildings'], ['colorPlaceLabels', 'Labels']];
let syncEditor = () => {};
if (import.meta.env.DEV) {
  const box = document.createElement('details');
  box.className = 'g10b-editor label';
  box.innerHTML = `<summary>Map editor</summary>
    <div class="g10b-editor__body">
      ${PICKERS.map(([key, name]) => `<label><span>${name}</span><input type="color" data-key="${key}"></label>`).join('')}
      <label><span>Texture</span><input type="range" min="0" max="40" step="1" data-opacity><output></output></label>
      <p class="g10b-editor__light"></p>
      <div class="g10b-editor__row"><button type="button" data-copy>Copy config</button><button type="button" data-reset>Reset colours</button></div>
      <textarea readonly rows="5" aria-label="Config JSON"></textarea>
    </div>`;
  document.body.append(box);
  const toHex = (c) => { const ctx = document.createElement('canvas').getContext('2d'); ctx.fillStyle = c; return ctx.fillStyle.startsWith('#') ? ctx.fillStyle : '#000000'; };
  const json = () => {
    const c = config();
    const colors = Object.fromEntries(Object.entries(c).filter(([key]) => key.startsWith('color') || key === 'roadsBrightness'));
    return JSON.stringify({ palette: opt('palette'), theme: c.theme, lightPreset: c.lightPreset, colors }, null, 2);
  };
  syncEditor = () => {
    const c = config();
    box.querySelectorAll('input[type=color]').forEach((i) => { i.value = toHex(c[i.dataset.key]); });
    const slider = box.querySelector('[data-opacity]');
    slider.value = Math.round(opacity() * 100);
    slider.nextElementSibling.textContent = `${slider.value}%`;
    const { rise, set } = sunTimes();
    const hm = (h) => { const d = new Date(); d.setUTCHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0); return torontoTime(d); };
    box.querySelector('.g10b-editor__light').textContent = `Light: ${c.lightPreset}${opt('light') === 'live' ? ` (live, ${torontoTime()} Toronto · sunrise ${hm(rise)}, sunset ${hm(set)})` : ''}`;
    box.querySelector('textarea').value = json();
  };
  box.addEventListener('input', (e) => {
    const key = e.target.dataset.key;
    if (key) { editor.overrides[key] = e.target.value; if (map) map.setConfigProperty('basemap', key, e.target.value); box.querySelector('textarea').value = json(); }
    if (e.target.matches('[data-opacity]')) { editor.opacity = +e.target.value; e.target.nextElementSibling.textContent = `${e.target.value}%`; applyTexture(); }
  });
  box.addEventListener('click', async (e) => {
    if (e.target.matches('[data-copy]')) {
      const text = json();
      try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; } catch { box.querySelector('textarea').select(); e.target.textContent = 'Select and copy'; }
      setTimeout(() => { e.target.textContent = 'Copy config'; }, 1500);
    }
    if (e.target.matches('[data-reset]')) { editor.overrides = {}; applyConfig(); }
  });
  syncEditor();
}
