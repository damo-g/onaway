// GT-10 option A · MapLibre GL v5 + OpenFreeMap. Exploration page (explore/gt10/), never linked from the site.
// The GT-09 behaviour on a real 3D map: the intro descent, the idle tour with orbit, the postal check that flies
// to the area (its outline drawn in yellow), then down to the place, and the pull-back outside the area.
// Tiles are fetched ahead (the whole GTA up front, each next stop while the current one shows), so flights
// never pass through blank, unloaded frames.
// The map takes no gestures at all, so page scroll (Lenis, as on the site) is never captured.
import Lenis from 'lenis';
import { PLACES, REGION_CENTRE, TOUR, REGION_LABELS } from './places.js';
import { lookupPostcode } from './postcodes.js';
import { createCamera, zoomFor, TIMING } from './camera.js';
import { mapStyle, C } from './maplibre-style.js';
import regionsUrl from './regions.geojson?url';

// ---------- review options (toolbar; ?layout=card etc. in the URL; remembered in this browser) ----------
const DEFAULTS = { layout: 'veil', buildings: 'shaded', relief: 'on', pitch: '60', orbit: 'on', speed: '0.6' };
const KEY = 'onaway:gt10a-r2'; // (round 2: new defaults, so round 1's remembered choices don't carry over)
const stored = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
const url = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => k in DEFAULTS));
const opts = { ...DEFAULTS, ...stored, ...url };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || (() => { try { return sessionStorage.getItem('onaway:gt10-rm') === '1'; } catch { return false; } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(opts)); } catch {} };

const body = document.body;
const sec = document.getElementById('gta3d');
const panel = sec.querySelector('.g10-panel');
const slot = sec.querySelector('.gta__slot');
const placeText = sec.querySelector('.gta__place');
const form = sec.querySelector('.gta__check');
const input = form.querySelector('input');
const result = form.querySelector('.gta__result');
body.dataset.layout = opts.layout;
body.classList.toggle('is-reduced', reduced);

function syncToolbar() {
  document.querySelectorAll('.g10-tg').forEach((g) => g.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(opts[g.dataset.k] === b.dataset.v))));
  document.getElementById('g10-rm').setAttribute('aria-pressed', String(reduced));
}
syncToolbar();

// ---------- smooth scroll, as on the site (off under reduced motion) ----------
if (!reduced) {
  const lenis = new Lenis();
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

// ---------- meters: FPS (last second) and load timings from page start ----------
const fpsEl = document.getElementById('g10-fps');
const perfEl = document.getElementById('g10-perf');
const perf = { lib: null, firstFrame: null, settled: null, intro: null };
window.__gt10 = { perf, fps: [] }; // (map attached below, for tests)
(() => {
  let frames = 0;
  let last = performance.now();
  const tick = (t) => {
    frames++;
    if (t - last >= 1000) {
      const fps = Math.round((frames * 1000) / (t - last));
      fpsEl.textContent = `${fps} fps`;
      window.__gt10.fps.push(fps);
      frames = 0;
      last = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
const showPerf = () => {
  const f = (v) => (v == null ? '…' : `${(v / 1000).toFixed(2)}s`);
  const since = (v) => (v == null || perf.boot == null ? null : v - perf.boot);
  perfEl.textContent = `from load start: lib ${f(since(perf.lib))} · first frame ${f(since(perf.firstFrame))}`;
};
showPerf();

// ---------- the sentence ----------
function write(text) {
  placeText.classList.remove('is-typing');
  void placeText.offsetWidth;
  placeText.textContent = text;
  placeText.classList.add('is-typing');
}
const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));

// ---------- the map, loaded only when the section nears the screen ----------
let map;
let camera;
let maplibregl;
let placeMarker;
const regionMarkers = [];

// Room the camera keeps clear for the panel, so the place lands in the open part of the map
function padding() {
  if (innerWidth < 768) return { top: 40, right: 20, bottom: 40, left: 20 };
  const w = panel.offsetWidth;
  return opts.layout === 'card' ? { top: 60, right: 40, bottom: 60, left: w + 60 } : { top: 60, right: 40, bottom: 60, left: Math.round(w * 0.8) };
}

// ---------- tiles ahead of the camera ----------
// The blank frames in a flight are tiles the map hasn't processed yet (downloading is the small part: each
// tile is parsed in a worker before it can be drawn, and the camera outruns that). So the next stop's tiles
// are loaded and parsed into MapLibre's own tile cache while the current stop is on screen; when the camera
// arrives the map takes them straight from the cache and draws at once.
// (This uses MapLibre internals: TileManager._loadTile and its out-of-view cache. Fine for an exploration;
// production would pin the MapLibre version, or self-host tiles near enough not to need it.)
const tx = (lng, z) => Math.floor(((lng + 180) / 360) * 2 ** z);
const ty = (lat, z) => Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
const queued = new Set();
let TileCtor = null;
let IdCtor = null; // (neither class is exported: both are borrowed from a tile already on screen)
async function preload(list) {
  const tm = map?.style?.tileManagers?.omt;
  if (!tm) return;
  const sample = tm._inViewTiles.getAllTiles()[0];
  TileCtor ??= sample?.constructor;
  IdCtor ??= sample?.tileID?.constructor;
  window.__gt10.pre ??= { ok: 0, fail: 0 };
  if (!TileCtor || !IdCtor) return;
  const todo = [];
  for (const [z, x, y] of list) {
    const id = new IdCtor(z, 0, z, x, y);
    if (queued.has(id.key) || tm._inViewTiles.getTileById(id.key)) continue;
    queued.add(id.key);
    todo.push(id);
  }
  // four at a time, so the map's own on-screen requests are never starved
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map(async (id) => {
      const tile = new TileCtor(id, tm._source.tileSize * id.overscaleFactor());
      try {
        await tm._loadTile(tile, id.key, tile.state);
        if (tile.hasData() && !tm._inViewTiles.getTileById(id.key)) { tm._outOfViewCache.add(id, tile, tile.getExpiryTimeout()); window.__gt10.pre.ok++; }
      } catch (err) { queued.delete(id.key); window.__gt10.pre.fail++; window.__gt10.pre.err = String(err).slice(0, 120); }
    }));
  }
}
// the whole GTA at z10: the high part of every flight
function warmGta() {
  const list = [];
  for (let x = tx(-80.25, 10); x <= tx(-78.55, 10); x++) for (let y = ty(44.35, 10); y <= ty(43.25, 10); y++) list.push([10, x, y]);
  return preload(list);
}
// one place, every zoom the descent into it passes through (z11–13; stops stay under z14); the view at 60° reaches further north
// than south, so more rows above the place than below
function warmPlace([lng, lat]) {
  const list = [];
  for (const [z, r] of [[11, 1], [12, 2], [13, 3]]) {
    const cx = tx(lng, z);
    const cy = ty(lat, z);
    for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r - 2; y <= cy + 1; y++) list.push([z, x, y]);
  }
  return preload(list);
}

// Every hop rises to about z10.8, over the GTA tiles the intro has already loaded and drawn, then descends
// into the next place, whose tiles at each zoom on the way down were fetched while the last stop was showing.
// (A low glide at z13 looked like the answer but goes blank: tilted at 60° it reveals more new ground per
// frame than the map can process.)
const HOP_FLOOR = 10.8;

// Hold until what's on screen is drawn (or 2.5 s at most), so a stop never starts its orbit over an empty map
function drawn(max = 2500) {
  return new Promise((resolve) => {
    if (map.areTilesLoaded()) return resolve();
    const t = setTimeout(done, max);
    function done() { clearTimeout(t); map.off('idle', done); resolve(); }
    map.on('idle', done);
  });
}

// The five areas' bounds, for framing a region on a match
let regionBounds = {};
fetch(regionsUrl).then((r) => r.json()).then((g) => {
  for (const f of g.features) {
    const pts = f.geometry.coordinates.flat(f.geometry.type === 'MultiPolygon' ? 2 : 1);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    regionBounds[f.properties.region] = [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
  }
});

async function boot() {
  perf.boot = performance.now(); // the section neared the screen: the map starts loading
  [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
  perf.lib = performance.now();
  showPerf();
  const phone = matchMedia('(pointer: coarse)').matches;
  map = new maplibregl.Map({
    container: sec.querySelector('.g10-map'),
    // in dev, tiles come from the local cache (explore/gt10/tile-cache.js), standing in for self-hosted tiles
    style: mapStyle({ buildings: opts.buildings, relief: opts.relief, tiles: import.meta.env.DEV ? `${location.origin}/__tiles/{z}/{x}/{y}.pbf` : null }),
    center: [-79.3, 43.18],
    zoom: 7.3,
    pitch: 0,
    bearing: -28,
    maxPitch: 72,
    cancelPendingTileRequestsWhileZooming: false, // keep loading what a flight passes through
    // the out-of-view tile cache is otherwise capped at about 5 screens of tiles (60 here), which threw the
    // preloaded next stop away before the camera got there; 40 lets it hold ~500
    maxTileCacheSize: 600,
    maxTileCacheZoomLevels: 40,
    interactive: false, // no wheel, no drag, no touch: the page always scrolls
    pixelRatio: Math.min(devicePixelRatio, phone ? 1.5 : 2),
    attributionControl: { compact: true, customAttribution: 'Regions © OpenStreetMap contributors' },
    fadeDuration: 200,
  });
  window.__gt10.map = map;
  map.once('render', () => { perf.firstFrame = performance.now(); showPerf(); });
  map.on('load', () => {
    // the attribution starts folded (MapLibre opens it on narrow maps); the (i) shows it
    map.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    addOverlays();

    camera = createCamera(map, { pitch: +opts.pitch, speed: +opts.speed, orbit: opts.orbit === 'on', reduced, padding: padding() });
    if (visible) start();
  });
}

function addOverlays() {
  // the five areas: a quiet dashed line always, and on a match the area's outline drawn in yellow on a soft
  // Carbon casing. Under the lake, so the lake trims them to the shore.
  map.addSource('regions', { type: 'geojson', data: regionsUrl });
  map.addLayer({ id: 'region-line', type: 'line', source: 'regions', paint: { 'line-color': 'rgba(32, 37, 33, 0.28)', 'line-width': 1, 'line-dasharray': [2, 2] } }, 'lake');
  const none = ['==', ['get', 'region'], ''];
  map.addLayer({ id: 'region-casing', type: 'line', source: 'regions', filter: none, layout: { 'line-join': 'round' }, paint: { 'line-color': C.carbon, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 9], 'line-opacity': 0, 'line-opacity-transition': { duration: reduced ? 0 : 700 } } }, 'lake');
  map.addLayer({ id: 'region-outline', type: 'line', source: 'regions', filter: none, layout: { 'line-join': 'round' }, paint: { 'line-color': C.yellow, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 14, 5], 'line-opacity': 0, 'line-opacity-transition': { duration: reduced ? 0 : 700 } } }, 'lake');
  // region names (HTML, Instrument Sans), shown only on the wide views
  for (const [, r] of Object.entries(REGION_LABELS)) {
    // (the label sits inside the marker: MapLibre writes its own inline opacity on the marker element)
    const el = document.createElement('div');
    el.innerHTML = `<div class="g10-region">${r.text}</div>`;
    regionMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(r.at).addTo(map));
  }
  const showRegions = () => regionMarkers.forEach((m) => (m.getElement().firstChild.style.opacity = map.getZoom() < 10.6 ? 1 : 0));
  map.on('zoom', showRegions);
  showRegions();
  // the current place's name, beside its pin
  const el = document.createElement('div');
  el.innerHTML = '<div class="g10-place"><i></i><span></span></div>';
  placeMarker = new maplibregl.Marker({ element: el, anchor: 'left', offset: [18, -10] }).setLngLat(PLACES.Downtown).addTo(map);
  map.once('idle', () => { perf.settled = performance.now(); showPerf(); });
}

const placeEl = () => placeMarker.getElement().firstChild;
const placeOn = (name, ll) => { placeMarker.setLngLat(ll); placeEl().querySelector('span').textContent = name; placeEl().classList.add('is-on'); };
const placeOff = () => placeMarker && placeEl().classList.remove('is-on');
function outline(region) {
  const f = ['==', ['get', 'region'], region];
  map.setFilter('region-casing', f);
  map.setFilter('region-outline', f);
  map.setPaintProperty('region-casing', 'line-opacity', 0.18);
  map.setPaintProperty('region-outline', 'line-opacity', 1);
}
function unoutline() {
  if (!map) return;
  map.setPaintProperty('region-casing', 'line-opacity', 0);
  map.setPaintProperty('region-outline', 'line-opacity', 0);
}

// ---------- the idle tour: fly → orbit → next, once through, then rest on the whole GTA ----------
let touring = false;
let k = 0;
let hovered = false;
let focused = false;
let visible = false;
let started = false;
let running = 0; // bumps when a match or replay takes over, so an old tour or match step bails

async function step() {
  const mine = running;
  if (!touring || hovered || focused || !visible) return;
  if (k >= TOUR.length) {
    touring = false;
    write('the GTA');
    placeOff();
    await camera.pullBack();
    return;
  }
  const name = TOUR[k++];
  write(name);
  placeOff();
  const ok = await camera.fly(PLACES[name], { zoom: zoomFor(name, 'tour'), duration: TIMING.tourFly, minZoom: HOP_FLOOR });
  if (!ok || mine !== running || !touring) return;
  await drawn();
  if (mine !== running || !touring) return;
  placeOn(name, PLACES[name]);
  if (TOUR[k]) warmPlace(PLACES[TOUR[k]]); // the next stop downloads while this one is on screen
  const done = await camera.orbit(TIMING.tourOrbit, TIMING.tourStop);
  if (!reduced && opts.orbit !== 'on') await wait(TIMING.tourStop);
  if (reduced) await new Promise((r) => setTimeout(r, TIMING.tourStop));
  if ((done || reduced || opts.orbit !== 'on') && mine === running) step();
}
function resume() {
  if (touring && !hovered && !focused && visible && !camera?.busy) step();
}

async function start() {
  if (started || !camera) return;
  started = true;
  const mine = ++running;
  await camera.intro();
  if (mine !== running) return;
  perf.intro = performance.now(); // the intro has landed
  // with the overview drawn, preload the high part of every flight and the first two stops
  warmGta().then(() => warmPlace(PLACES[TOUR[0]])).then(() => warmPlace(PLACES[TOUR[1]]));
  if (reduced) return; // no tour under reduced motion: it rests on the whole GTA
  await wait(1600);
  if (mine !== running) return;
  touring = true;
  k = 0;
  step();
}

sec.addEventListener('mouseenter', () => { hovered = true; });
sec.addEventListener('mouseleave', () => { hovered = false; resume(); });
form.addEventListener('focusin', () => { focused = true; });
form.addEventListener('focusout', (e) => { if (!form.contains(e.relatedTarget)) { focused = false; resume(); } });
new IntersectionObserver(([e]) => {
  const was = visible;
  visible = e.isIntersecting;
  if (visible && !started) start();
  else if (visible && !was) resume();
}, { threshold: 0.4 }).observe(sec);
new IntersectionObserver(([e]) => { if (e.isIntersecting && !map) boot(); }, { rootMargin: '600px 0px' }).observe(sec);

// ---------- the postal check ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const a = lookupPostcode(input.value);
  result.classList.remove('is-in');
  void result.offsetWidth;
  result.classList.add('is-in');
  if (a.bad) {
    result.innerHTML = 'Postal codes start letter, number, letter, like <b>M6K</b>.';
    return;
  }
  if (!camera) return;
  const mine = ++running;
  touring = false;
  camera.stop();
  slot.classList.remove('is-idle', 'is-lit');
  unoutline();
  placeOff();

  if (!a.ok) {
    result.innerHTML = `<b>Not yet.</b> ${a.fsa} is outside our five areas. Ask anyway, and we will tell you straight.`;
    write('your area, soon');
    await camera.pullBack();
    return;
  }

  const area = a.region === 'Toronto' ? 'in the City of Toronto' : `${a.region} Region`;
  result.innerHTML = `<b>Yes.</b> ${a.fsa} is ${a.place && a.place !== 'Toronto' ? `${a.place}, ` : ''}${area}. Same crew, same promises.`;
  let name = a.place && PLACES[a.place] ? a.place : REGION_CENTRE[a.region];
  let shown = a.place && PLACES[a.place] ? a.place : a.region === 'Toronto' ? 'Toronto' : `${a.region} Region`;
  if (a.place === 'Toronto') { name = 'Downtown'; shown = 'Toronto'; }
  write(shown);
  const where = { fsa: a.fsa, region: a.region, place: shown };
  try { sessionStorage.setItem('onaway:where', JSON.stringify(where)); } catch {}
  document.getElementById('g10-carry').textContent = `${shown} (${a.fsa})`;

  // one thing at a time: frame the area, draw its outline, write the place in, then go down to the place
  // among its buildings and circle it slowly
  warmPlace(PLACES[name]); // starts downloading now, while the camera frames the area
  const framed = regionBounds[a.region] ? await camera.region(regionBounds[a.region], { duration: TIMING.matchRegion }) : true;
  if (!framed || mine !== running) return;
  outline(a.region);
  await wait(500);
  if (mine !== running) return;
  slot.classList.add('is-lit');
  await wait(TIMING.matchHold);
  if (mine !== running) return;
  const ok = await camera.fly(PLACES[name], { zoom: zoomFor(name), duration: TIMING.matchFly, minZoom: 9.5 });
  if (!ok || mine !== running) return;
  await drawn();
  if (mine !== running) return;
  placeOn(shown, PLACES[name]);
  await wait(300);
  if (mine !== running) return;
  camera.orbit(TIMING.matchOrbit, TIMING.matchOrbitMs);
});

// ---------- toolbar ----------
document.querySelector('.g10-bar').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.classList.contains('g10-bar__toggle')) {
    const open = b.closest('.g10-bar').classList.toggle('is-open');
    b.setAttribute('aria-expanded', String(open));
    return;
  }
  const g = b.closest('.g10-tg');
  if (g) {
    const k2 = g.dataset.k;
    opts[k2] = b.dataset.v;
    save();
    syncToolbar();
    if (k2 === 'layout') {
      body.dataset.layout = opts.layout;
      camera?.set({ padding: padding() });
      map?.easeTo({ padding: padding(), duration: reduced ? 0 : 600 });
    }
    if (k2 === 'buildings' && map) {
      const s = mapStyle({ buildings: opts.buildings });
      const b2 = s.layers.find((l) => l.id === 'buildings').paint;
      map.setPaintProperty('buildings', 'fill-extrusion-color', b2['fill-extrusion-color']);
      map.setPaintProperty('buildings', 'fill-extrusion-vertical-gradient', b2['fill-extrusion-vertical-gradient']);
      map.setLight(s.light);
    }
    if (k2 === 'relief') map?.setLayoutProperty('relief', 'visibility', opts.relief === 'on' ? 'visible' : 'none');
    if (k2 === 'pitch') { camera?.set({ pitch: +opts.pitch }); map?.easeTo({ pitch: +opts.pitch, duration: reduced ? 0 : 800 }); }
    if (k2 === 'orbit') camera?.set({ orbit: opts.orbit === 'on' });
    if (k2 === 'speed') camera?.set({ speed: +opts.speed });
    return;
  }
  if (b.id === 'g10-rm') {
    try { sessionStorage.setItem('onaway:gt10-rm', reduced ? '0' : '1'); } catch {}
    location.reload();
  }
  if (b.id === 'g10-replay' && camera) {
    running++;
    touring = false;
    camera.stop();
    slot.classList.remove('is-lit');
    slot.classList.add('is-idle');
    write('the GTA');
    unoutline();
    placeOff();
    result.textContent = '';
    started = false;
    sec.scrollIntoView({ block: 'start' });
    start();
  }
});
addEventListener('resize', () => camera?.set({ padding: padding() }));
