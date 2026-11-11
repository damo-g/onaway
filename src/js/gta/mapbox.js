// GT-10 · the section's map on Mapbox GL JS v3 (the Standard style), shared by the live section (05-gta, the locked
// settings) and the option B exploration (explore/gt10/b, every setting as a dev-panel option).
//
//   createGtaMap(el, { opt, ... }) → { boot, adapter, applyConfig, paint, applyGroundTexture, rebuildStyle, … }
//
// opt(key) reads a setting (the exploration: its dev-panel options; the live section: the locked values). The map
// is a picture, never a control: no gestures at all, so the page always scrolls, and it is hidden from assistive
// tech (the sentence carries the meaning).
import { createCamera } from './camera.js';
import { loadAreas, WORLD_FC } from './areas.js';
import { createHighlight, createLabels, panelPadding } from './overlays.js';
import { asImageData } from './texture.js';
import { bakeGrade, bakeSoftGrain } from './bake.js';
import { T, mix, alpha } from './colors.js';
import { PALETTES, paletteConfig, liveLight } from './presets.js';

// The locked settings (docs/homepage-locked-decisions.md, GT-10). The exploration's dev panel offers the rest.
export const LOCKED = {
  palette: 'brandrich', buildings: 'stone', light: 'live', objects: 'all', labels: 'places', poi: 'on', names: 'off',
  zone: 'sans', font: 'mono', intro: 'still', texture: 'soft-grain', opacity: '20', mark: 'glow+sign', highlight: 'spotlight',
  match: 'close', closeness: '16', stop: 'drift', layout: 'card', card: 'light', pitch: '60', orbit: 'on', speed: '0.7',
};

const STYLE = 'mapbox://styles/mapbox/standard';
const BUILDINGS = { featuresetId: 'buildings', importId: 'basemap' };
const PLACE_LABELS = { featuresetId: 'place-labels', importId: 'basemap' };
const k = ['number', ['feature-state', 'k'], 0]; // an area's highlight, 0–1 (overlays.js fades it)
const HIGHLIGHTS = { spotlight: ['hl-spot', 'hl-inner', 'hl-line-thin'], tint: ['hl-tint', 'hl-line-thin'], outline: ['hl-casing', 'hl-line'] };

// Map labels: font=mono draws every label in Overpass Mono, the site's own self-hosted font. Standard only offers
// Mapbox's hosted fonts; Mapbox's localFontFamily has the browser draw the glyphs from a CSS font instead (weights
// from the style's Regular, Medium and Bold), so no font is uploaded anywhere.
const fontFamily = (font) => (font === 'mono' ? '"Overpass Mono", monospace' : null);
const fontsReady = (font) => (font === 'mono' ? Promise.all(['400', '500', '700'].map((w) => document.fonts.load(`${w} 16px "Overpass Mono"`))).catch(() => {}) : Promise.resolve());

// Everything the map needs before it can start, fetched and made once: Mapbox GL and its stylesheet, the five
// areas, the label font, and (off the main thread, bake.js) the palette's colour grade and the soft grain.
// preloadMap() can run long before the map starts: it creates no map, so it is not a billed map load.
let preloaded;
export function preloadMap(font = LOCKED.font, palette = LOCKED.palette) {
  preloaded ??= Promise.all([import('mapbox-gl'), loadAreas(), import('mapbox-gl/dist/mapbox-gl.css'), fontsReady(font), bakeGrade(palette), bakeSoftGrain()]);
  return preloaded;
}

export function createGtaMap(el, {
  opt = (key) => LOCKED[key],
  container = el.querySelector('.gta__map'),
  panel = el.querySelector('.gta__panel'),
  token,
  reduced = false,
  navOverlap = true, // false: the section sits below the navbar (the live section), so no room is kept for it
  overrides = () => ({}), // colour overrides (the exploration's map editor)
  texture = async (name) => (name === 'soft-grain' ? bakeSoftGrain() : null), // a texture by name: a canvas, or pixels
  textureOpacity = () => +opt('opacity') / 100,
  groundTexture = () => opt('placement') !== 'screen', // the live section lays its texture on the ground
  onConfig = () => {}, // after each config change (the exploration's editor and theme)
} = {}) {
  let map;
  let mapboxgl;
  let camera;
  let labels;
  let hl;
  let areas;
  let liveTimer = 0;
  let markRun = 0;

  // ---------- the basemap config: palette, buildings, light, 3D, labels ----------
  const lightPreset = () => {
    const l = opt('light');
    if (l === 'palette') return PALETTES[opt('palette')]?.light ?? 'day';
    return l === 'live' ? liveLight() : l;
  };
  // card=light: the card stays on paper whatever the map does. card=auto: it turns dark with a dark map.
  const mapDark = () => !!PALETTES[opt('palette')]?.dark || ['dusk', 'night'].includes(lightPreset());
  function theme() {
    el.toggleAttribute('data-map-dark', mapDark()); // the labels on the map turn paper on a dark map (main.css)
    const dark = opt('card') === 'auto' && mapDark();
    if (dark) { el.dataset.navTheme = 'dark'; el.dataset.dark = ''; } else { delete el.dataset.navTheme; delete el.dataset.dark; }
  }
  function config() {
    const c = paletteConfig(opt('palette'), overrides(), opt('buildings'));
    const objects = opt('objects');
    const labelsOpt = opt('labels');
    const poi = opt('poi');
    return Object.assign(c, {
      lightPreset: lightPreset(),
      show3dObjects: objects !== 'flat', show3dBuildings: objects !== 'flat', show3dLandmarks: objects !== 'flat',
      show3dTrees: objects === 'all' || objects === 'facades', show3dFacades: objects === 'facades',
      showPlaceLabels: labelsOpt !== 'none', showRoadLabels: labelsOpt === 'all', showTransitLabels: false, showPedestrianRoads: labelsOpt === 'all',
      showPointOfInterestLabels: poi === 'on', showLandmarkIcons: poi !== 'off', showLandmarkIconLabels: poi !== 'off',
      showAdminBoundaries: false, // the five areas are ours
      colorBuildingSelect: mix('paper', 'yellow', 0.45), colorBuildingHighlight: mix('paper', 'yellow', 0.3), colorPlaceLabelSelect: T.rust, // the place marks
      font: 'DIN Pro', // (font=mono: drawn in Overpass Mono by the browser instead, see fontFamily)
    });
  }
  // Live light follows Toronto's time, re-checked at the top of each hour
  function scheduleLive() {
    clearTimeout(liveTimer);
    if (opt('light') !== 'live') return;
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(60, 0, 0);
    liveTimer = setTimeout(() => { applyConfig(); scheduleLive(); }, next - now + 500);
  }
  function applyConfig() {
    theme();
    if (map) {
      map.setConfig('basemap', config());
      map.setFog(PALETTES[opt('palette')]?.fog ?? null);
      paint();
    }
    onConfig();
  }

  // ---------- our layers, in Standard's bottom slot (under roads, buildings and labels) ----------
  function addLayers() {
    const { regions, masks } = areas;
    map.addSource('gta-world', { type: 'geojson', data: WORLD_FC });
    map.addSource('regions', { type: 'geojson', data: regions, promoteId: 'region' });
    map.addSource('masks', { type: 'geojson', data: masks, promoteId: 'region' });
    map.addSource('gta-place', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    const bottom = { slot: 'bottom' };
    map.addLayer({ id: 'tex-ground', type: 'fill', source: 'gta-world', ...bottom, layout: { visibility: 'none' }, paint: { 'fill-opacity': 0 } });
    // the place's pool of light (the glow mark, and a softer one under lit buildings): about 600 m across
    const pool = (r) => ['interpolate', ['exponential', 2], ['zoom'], 10, r / 64, 16, r, 18, r * 4];
    const fade = { 'circle-blur': 1, 'circle-pitch-alignment': 'map', 'circle-opacity': 0, 'circle-opacity-transition': { duration: reduced ? 0 : 900 } };
    map.addLayer({ id: 'mark-glow', type: 'circle', source: 'gta-place', ...bottom, paint: { 'circle-color': T.yellow, 'circle-radius': pool(300), ...fade } });
    map.addLayer({ id: 'mark-core', type: 'circle', source: 'gta-place', ...bottom, paint: { 'circle-color': mix('paper', 'yellow', 0.6), 'circle-radius': pool(110), ...fade } });
    // the five areas, and the matched one's highlight (spotlight: outside dims, inside glows evenly · tint · outline)
    map.addLayer({ id: 'region-line', type: 'line', source: 'regions', ...bottom, paint: { 'line-color': alpha('carbon', 0.34), 'line-width': 1, 'line-dasharray': [2, 2] } });
    map.addLayer({ id: 'hl-spot', type: 'fill', source: 'masks', ...bottom, paint: { 'fill-color': T.carbon, 'fill-opacity': ['*', k, 0.22] } });
    map.addLayer({ id: 'hl-inner', type: 'fill', source: 'regions', ...bottom, paint: { 'fill-color': mix('paper', 'yellow', 0.5), 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10.5, ['*', k, 0.36], 12.5, ['*', k, 0.16], 14, ['*', k, 0.06]] } });
    map.addLayer({ id: 'hl-tint', type: 'fill', source: 'regions', ...bottom, paint: { 'fill-color': T.yellow, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, ['*', k, 0.3], 11, ['*', k, 0.2], 14, ['*', k, 0.04]] } });
    map.addLayer({ id: 'hl-casing', type: 'line', source: 'regions', ...bottom, layout: { 'line-join': 'round' }, paint: { 'line-color': T.carbon, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 9], 'line-opacity': ['*', k, 0.18] } });
    map.addLayer({ id: 'hl-line', type: 'line', source: 'regions', ...bottom, layout: { 'line-join': 'round' }, paint: { 'line-color': T.yellow, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 14, 5], 'line-opacity': k } });
    map.addLayer({ id: 'hl-line-thin', type: 'line', source: 'regions', ...bottom, layout: { 'line-join': 'round' }, paint: { 'line-color': T.yellow, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 3], 'line-opacity': k } });
  }
  function paint() {
    if (!map?.getLayer('hl-spot')) return;
    const dark = mapDark();
    const on = new Set(HIGHLIGHTS[opt('highlight')] ?? HIGHLIGHTS.spotlight);
    for (const id of ['hl-spot', 'hl-inner', 'hl-tint', 'hl-casing', 'hl-line', 'hl-line-thin']) map.setLayoutProperty(id, 'visibility', on.has(id) ? 'visible' : 'none');
    map.setPaintProperty('region-line', 'line-color', dark ? alpha('paper', 0.3) : alpha('carbon', 0.34));
    map.setPaintProperty('hl-spot', 'fill-opacity', ['*', k, dark ? 0.5 : 0.22]);
    map.setPaintProperty('hl-inner', 'fill-color', dark ? T.yellow : mix('paper', 'yellow', 0.5));
    labels?.regions(opt('names') === 'ours');
    applyGroundTexture();
  }
  // The texture laid on the ground: a pattern on a world-sized fill, so it moves with the map
  const textures = {};
  async function applyGroundTexture() {
    if (!map?.getLayer('tex-ground')) return;
    const name = opt('texture');
    const on = name && name !== 'none' && groundTexture() && textureOpacity() > 0;
    if (on) {
      const id = `gta-tex-${name}`;
      if (!map.hasImage(id)) {
        textures[name] ??= await texture(name);
        if (!textures[name] || !map.getLayer('tex-ground')) return;
        const img = textures[name].getContext ? asImageData(textures[name]) : textures[name];
        if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: name === 'airbrush' ? 0.5 : 2 });
      }
      map.setPaintProperty('tex-ground', 'fill-pattern', id);
    }
    map.setLayoutProperty('tex-ground', 'visibility', on ? 'visible' : 'none');
    map.setPaintProperty('tex-ground', 'fill-opacity', on ? Math.min(1, textureOpacity() * 1.6) : 0);
  }

  // ---------- marking the place: one mark or two together (glow+sign) ----------
  // glow: a pool of light on the ground · sign: the name floating · lit: the buildings around it light up, nearest
  // first · label: Standard's own label for the town turns rust · pin: the name on a stem · none
  function markOn(label, at) {
    if (!map) return;
    const parts = new Set(opt('mark').split('+'));
    const has = (p) => parts.has(p);
    const run = ++markRun;
    map.getSource('gta-place')?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: at } }] });
    if (has('pin') || has('sign')) labels.pin(label, at, { sign: has('sign') });
    map.setPaintProperty('mark-glow', 'circle-opacity', has('glow') ? 0.5 : has('lit') || has('label') ? 0.22 : 0);
    map.setPaintProperty('mark-core', 'circle-opacity', has('glow') ? 0.45 : 0);
    if (has('lit')) {
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
    }
    if (has('label')) {
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
    try { map.removeFeatureState({ target: BUILDINGS }); } catch {}
    try { map.removeFeatureState({ target: PLACE_LABELS }); } catch {}
  }

  // ---------- the camera's helpers ----------
  const padding = () => panelPadding(el, panel, opt('layout'), { navOverlap });
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
  // Load a place's tiles before the camera goes there (Mapbox's public preload: jumpTo with preloadOnly)
  function warm(at) {
    if (!map) return Promise.resolve();
    map.jumpTo({ center: at, zoom: close() - 0.1, pitch: +opt('pitch'), bearing: map.getBearing(), padding: padding(), preloadOnly: true });
    return new Promise((r) => setTimeout(r, 1200));
  }

  // Resolves once the map has nothing left to load or draw (or after max ms, or as soon as stop() says so)
  function settled(max, stop) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = () => (map.loaded() && map.areTilesLoaded()) || stop() || performance.now() - t0 > max ? resolve() : setTimeout(tick, 80);
      setTimeout(tick, 80);
    });
  }
  // Draw places once, ahead of the visitor, while the map is still hidden under the still: the GPU compiles the
  // shaders for each kind of 3D object (buildings, trees, landmarks, their shadows) the first time it draws one, a
  // hitch of up to ~0.7 s that would otherwise land on the tour's first flight. Shaders are per kind, not per pixel,
  // so it's drawn on a small canvas: a few tiles instead of dozens, light enough not to be felt on a scrolling page.
  // ready() waits for a quiet moment (the page not scrolling). Then the map goes back to its size and view.
  async function prerender(ats, { stop = () => false, ready = async () => {}, max = 4000 } = {}) {
    if (!map) return;
    const home = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), padding: map.getPadding() };
    const size = container.style.cssText;
    container.style.width = '320px';
    container.style.height = '200px';
    map.resize();
    for (const at of ats) {
      await ready();
      if (stop()) break;
      map.jumpTo({ center: at, zoom: close(), pitch: +opt('pitch'), bearing: home.bearing, padding: { top: 0, right: 0, bottom: 0, left: 0 } });
      await settled(max, stop);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // drawn at least once
    }
    container.style.cssText = size;
    map.resize();
    map.jumpTo(home);
    await settled(max, () => false);
  }

  // How close the stops come: the locked closeness (16) on tablet and desktop; on phones 0.6 of a zoom level wider
  // (about 1.5× the area), so a narrow screen still reads as a place, not a single block. The 3D landmarks and
  // buildings still stand at 15.4.
  const close = () => +opt('closeness') - (matchMedia('(width < 768px)').matches ? 0.6 : 0);

  // What the shared controller (controller.js) drives
  const adapter = {
    get camera() { return camera; },
    drawn,
    warm,
    prerender,
    highlight: (region) => { hl?.set(region); labels?.zone(region, opt('zone')); },
    zoomFor: () => close(), // stops at z16 (15.4 on phones): Standard stands its everyday 3D buildings from about z15
    outline: (region) => areas.outlines[region],
    areaZoom: () => map.getZoom(),
    pin: (label, at) => markOn(label, at),
    unpin: () => markOff(),
    tourFloor: 12.4, // flights between z16 stops rise to about z12.4
  };

  // A new label font needs the style rebuilt (our layers and the highlight are added back)
  async function rebuildStyle() {
    await fontsReady(opt('font'));
    map.setStyle(STYLE, { config: { basemap: config() }, localFontFamily: fontFamily(opt('font')), diff: false });
    await new Promise((r) => map.once('style.load', r));
    addLayers();
    applyConfig();
    hl?.paint();
  }

  // ---------- boot: the library, the map, our layers, the camera. Resolves with the map, or null if it can't
  // run (no token, no WebGL, Mapbox refusing the token or the month's limit): the section then keeps its still.
  async function boot() {
    if (!token) return null;
    try {
      const [[lib, loaded]] = await Promise.all([preloadMap(opt('font'), opt('palette')), bakeGrade(opt('palette'))]);
      mapboxgl = lib.default;
      areas = loaded;
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container,
        style: STYLE,
        config: { basemap: config() },
        projection: 'mercator', // flat (Standard defaults to a globe when zoomed out)
        center: [-79.3, 43.18],
        zoom: 7.6,
        pitch: 0,
        bearing: -28,
        maxPitch: 72,
        interactive: false, // no wheel, no drag, no touch: the page always scrolls
        pixelRatio: Math.min(devicePixelRatio || 1, 2), // a 3× phone draws at 2×: barely softer, far lighter on the GPU and battery
        attributionControl: false,
        logoPosition: 'bottom-right',
        localFontFamily: fontFamily(opt('font')),
      });
      // Mapbox's logo and credit are required wherever the map shows (bottom right, in the brand's mono)
      map.addControl(new mapboxgl.AttributionControl({ compact: false }), 'bottom-right');
      map.getCanvas().setAttribute('aria-hidden', 'true'); // a picture: the sentence carries the meaning (the credit's links stay reachable)
      map.getCanvas().removeAttribute('tabindex');
      // a refused token or a used-up month: the map never loads, so give up and keep the still
      const failed = new Promise((r) => map.on('error', (e) => { if ([401, 403, 429].includes(e?.error?.status)) r(true); }));
      const ok = await Promise.race([
        new Promise((r) => map.once('style.load', () => r(true))),
        failed.then(() => false),
        new Promise((r) => setTimeout(() => r(false), 15000)),
      ]);
      if (!ok) { map.remove(); map = null; return null; }
      addLayers();
      applyConfig();
      await new Promise((r) => (map.loaded() ? r() : map.once('load', r)));
      labels = createLabels(map, mapboxgl.Marker);
      hl = createHighlight(map, Object.keys(areas.outlines), { reduced });
      paint();
      scheduleLive();
      camera = createCamera(map, { pitch: +opt('pitch'), speed: +opt('speed'), orbit: opt('orbit') === 'on', reduced, padding: padding(), apply: fastApply(), drift: opt('stop') === 'drift' ? 45 : 0, introFrom: opt('intro') ?? 'flight' });
      addEventListener('resize', () => camera?.set({ padding: padding() }));
      return map;
    } catch (err) {
      console.warn('GTA map unavailable, keeping the still:', err?.message ?? err);
      try { map?.remove(); } catch {}
      map = null;
      return null;
    }
  }

  // The tour's driver moves the camera the way Mapbox's own animations do: straight on the transform, firing only
  // 'move' (jumpTo every frame fires start, move and end each time). Mapbox internals; jumpTo is the fallback.
  function fastApply() {
    if (typeof map._fireMoveEvents !== 'function' || !map.transform) return undefined;
    return {
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
    };
  }

  theme();
  return {
    boot, adapter, config, applyConfig, scheduleLive, paint, applyGroundTexture, rebuildStyle, padding, mapDark, lightPreset,
    get map() { return map; },
    get camera() { return camera; },
    get labels() { return labels; },
  };
}

// A stand-in camera for when the map can't run: every move resolves at once, so the section still works (the
// sentence still tours its places and answers "Do we cover you?") over the still image.
export const STILL_CAMERA = new Proxy({}, { get: (_, key) => (key === 'busy' ? false : () => Promise.resolve(true)) });
