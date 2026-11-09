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
import { grainTile, airbrushTile, softGrainTile, tileable, neutral, asUrl, asImageData, INK } from '../texture.js';
import { T, mix, alpha } from '../colors.js';
import { PALETTES, paletteConfig, liveLight, sunTimes, torontoTime } from './presets.js';

// the logo-work textures, if any have been dropped into ./textures/ (each becomes a texture option)
const LOGO = Object.fromEntries(Object.entries(import.meta.glob('./textures/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), url]));

const OPTIONS = {
  palette: ['brandlut', ...Object.keys(PALETTES).filter((p) => p !== 'brandlut')],
  light: ['live', 'palette', 'day', 'dawn', 'dusk', 'night'],
  objects: ['all', 'facades', 'no-trees', 'flat'],
  labels: ['places', 'none', 'all'],
  poi: ['on', 'landmarks', 'off'],
  names: ['off', 'ours'],
  font: ['din', 'mono'],
  texture: ['soft-grain', 'grain', 'airbrush', 'none', ...Object.keys(LOGO)],
  placement: ['screen', 'ground', 'both'],
  opacity: ['10', '20', '30', '40', '0'],
  mark: ['lit', 'glow', 'label', 'sign', 'pin', 'none'],
  highlight: ['spotlight', 'tint', 'outline'],
  match: ['close', 'area'],
  closeness: ['16', '16.5', '15.5', '15'],
  stop: ['drift', 'orbit'],
  layout: ['card', 'veil'],
  card: ['light', 'auto'],
  pitch: ['60', '50', '45'],
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

// card=light (the pick): the card stays on paper whatever the map does. card=auto: it turns dark with the map.
const mapDark = () => !!PALETTES[opt('palette')]?.dark || ['dusk', 'night'].includes(lightPreset());
function theme() {
  const dark = opt('card') === 'auto' && mapDark();
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
  if (name === 'soft-grain') texCache[name] = softGrainTile();
  else if (name === 'grain') texCache[name] = grainTile(INK.carbon, INK.camel, 256);
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
const SIZE = { airbrush: '1400px', grain: '256px', 'soft-grain': '768px' };
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
    colorBuildingSelect: mix('paper', 'yellow', 0.55), colorBuildingHighlight: mix('paper', 'yellow', 0.35), colorPlaceLabelSelect: T.rust, // the place marks
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
  // the place's light pool (the glow mark, and a softer one under the lit buildings): on the ground, under the
  // buildings, about 600 m across, fading in and out
  map.addSource('g10-place', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  const pool = (r) => ['interpolate', ['exponential', 2], ['zoom'], 10, r / 64, 16, r, 18, r * 4];
  map.addLayer({ id: 'mark-glow', type: 'circle', source: 'g10-place', ...bottom, paint: { 'circle-color': T.yellow, 'circle-radius': pool(300), 'circle-blur': 1, 'circle-pitch-alignment': 'map', 'circle-opacity': 0, 'circle-opacity-transition': { duration: 900 } } });
  map.addLayer({ id: 'mark-core', type: 'circle', source: 'g10-place', ...bottom, paint: { 'circle-color': mix('paper', 'yellow', 0.6), 'circle-radius': pool(110), 'circle-blur': 1, 'circle-pitch-alignment': 'map', 'circle-opacity': 0, 'circle-opacity-transition': { duration: 900 } } });
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
  const dark = mapDark();
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
const zoomFor = () => +opt('closeness');

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
  pin: (label, at) => markOn(label, at),
  unpin: () => markOff(),
  tourFloor: 12.4, // flights between z16 stops rise to about z12.4 (not option A's 11.6)
};

// ---------- marking the place (dev panel → mark) ----------
// lit: the buildings around the place light up in yellow, nearest first, over a soft pool of light · glow: a pool
// of light on the ground · label: Standard's own label for the town turns rust · sign: the name floating · pin:
// the name on a stem (option A's) · none: the sentence alone says where
const BUILDINGS = { featuresetId: 'buildings', importId: 'basemap' };
const PLACE_LABELS = { featuresetId: 'place-labels', importId: 'basemap' };
let markRun = 0;
function markOn(label, at) {
  if (!map) return;
  const m = opt('mark');
  const run = ++markRun;
  map.getSource('g10-place')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: at } }] });
  if (m === 'pin' || m === 'sign') labels.pin(label, at, { sign: m === 'sign' });
  map.setPaintProperty('mark-glow', 'circle-opacity', m === 'glow' ? 0.5 : m === 'lit' || m === 'label' ? 0.22 : 0);
  map.setPaintProperty('mark-core', 'circle-opacity', m === 'glow' ? 0.45 : 0);
  if (m === 'lit') {
    // the buildings in a box around the place on screen, lit in eight waves from the centre outwards
    const p = map.project(at);
    const R = 210;
    let found = [];
    try { found = map.queryRenderedFeatures([[p.x - R, p.y - R * 0.75], [p.x + R, p.y + R * 0.75]], { target: BUILDINGS }); } catch {}
    const corner = (g) => (g?.type === 'Polygon' ? g.coordinates[0][0] : g?.type === 'MultiPolygon' ? g.coordinates[0][0][0] : null);
    const near = found.map((f) => { const c = corner(f.geometry); const q = c ? map.project(c) : p; return { f, d: Math.hypot(q.x - p.x, q.y - p.y) }; })
      .sort((a, b) => a.d - b.d).slice(0, 140);
    const waves = 8;
    for (let w = 0; w < waves; w++) {
      setTimeout(() => {
        if (run !== markRun) return;
        for (const { f } of near.slice(Math.floor((near.length * w) / waves), Math.floor((near.length * (w + 1)) / waves))) { try { map.setFeatureState(f, { select: true }); } catch {} }
      }, reduced ? 0 : w * 110);
    }
    window.__gt10.lit = near.length;
  }
  if (m === 'label') {
    let onScreen = [];
    try { onScreen = map.queryRenderedFeatures({ target: PLACE_LABELS }); } catch {}
    const key = label.toLowerCase();
    const hit = onScreen.find((f) => String(f.properties?.name ?? '').toLowerCase() === key) ?? onScreen.find((f) => String(f.properties?.name ?? '').toLowerCase().includes(key));
    if (hit) try { map.setFeatureState(hit, { select: true }); } catch {}
  }
}
function markOff() {
  markRun++;
  labels?.unpin();
  if (!map?.getLayer('mark-glow')) return;
  map.setPaintProperty('mark-glow', 'circle-opacity', 0);
  map.setPaintProperty('mark-core', 'circle-opacity', 0);
  try { map.removeFeatureState({ target: BUILDINGS }); } catch {} // (no id: every building)
  try { map.removeFeatureState({ target: PLACE_LABELS }); } catch {}
}

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
  camera = createCamera(map, { pitch: +opt('pitch'), speed: +opt('speed'), orbit: opt('orbit') === 'on', reduced, padding: padding(), apply, drift: opt('stop') === 'drift' ? 45 : 0 });
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
  if (['palette', 'light', 'objects', 'labels', 'poi', 'font', 'card'].some(changed)) { applyConfig(); scheduleLive(); }
  if (['highlight', 'names'].some(changed)) paintOverlays();
  if (['texture', 'placement', 'opacity'].some(changed)) applyTexture();
  if (!map || !camera) return;
  if (changed('layout')) requestAnimationFrame(() => { camera.set({ padding: padding() }); map.easeTo({ padding: padding(), duration: reduced ? 0 : 600 }); });
  if (changed('pitch')) { camera.set({ pitch: +opt('pitch') }); map.easeTo({ pitch: +opt('pitch'), duration: reduced ? 0 : 800 }); }
  if (changed('orbit')) camera.set({ orbit: opt('orbit') === 'on' });
  if (changed('speed')) camera.set({ speed: +opt('speed') });
  if (changed('stop')) camera.set({ drift: opt('stop') === 'drift' ? 45 : 0 });
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
