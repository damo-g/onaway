// GT-10 option A · MapLibre GL v5 + OpenFreeMap. Exploration page (explore/gt10/), never linked from the site.
// The GT-09 behaviour on a real 3D map: the intro descent, the idle tour with orbit, the postal check that flies
// to the place, drops the pin, tints the region and writes the place in, and the pull-back outside the area.
// The map takes no gestures at all, so page scroll (Lenis, as on the site) is never captured.
import Lenis from 'lenis';
import { PLACES, REGION_CENTRE, TOUR, REGION_LABELS } from './places.js';
import { lookupPostcode } from './postcodes.js';
import { createCamera, zoomFor, TIMING } from './camera.js';
import { mapStyle, C } from './maplibre-style.js';
import regionsUrl from './regions.geojson?url';

// ---------- review options (toolbar; ?layout=card etc. in the URL; remembered in this browser) ----------
const DEFAULTS = { layout: 'veil', buildings: 'shaded', pitch: '45', orbit: 'on', speed: '1' };
const KEY = 'onaway:gt10a';
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
window.__gt10 = { perf, fps: [] };
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

// A small circle (metres) as a polygon, for the pin's column
function circle([lng, lat], r, n = 40) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([lng + (r / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a), lat + (r / 110540) * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [pts] } };
}

async function boot() {
  perf.boot = performance.now(); // the section neared the screen: the map starts loading
  [{ default: maplibregl }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]);
  perf.lib = performance.now();
  showPerf();
  const phone = matchMedia('(pointer: coarse)').matches;
  map = new maplibregl.Map({
    container: sec.querySelector('.g10-map'),
    style: mapStyle({ buildings: opts.buildings }),
    center: [-79.3, 43.18],
    zoom: 7.3,
    pitch: 0,
    bearing: -28,
    maxPitch: 70,
    interactive: false, // no wheel, no drag, no touch: the page always scrolls
    pixelRatio: Math.min(devicePixelRatio, phone ? 1.5 : 2),
    attributionControl: { compact: true, customAttribution: 'Regions © OpenStreetMap contributors' },
    fadeDuration: 200,
  });
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
  // the region tint and the region lines sit under the lake, so the lake trims them to the shore
  map.addSource('regions', { type: 'geojson', data: regionsUrl });
  map.addLayer({ id: 'region-tint', type: 'fill', source: 'regions', filter: ['==', ['get', 'region'], ''], paint: { 'fill-color': C.yellow, 'fill-opacity': 0, 'fill-opacity-transition': { duration: reduced ? 0 : 700 } } }, 'lake');
  map.addLayer({ id: 'region-line', type: 'line', source: 'regions', paint: { 'line-color': 'rgba(32, 37, 33, 0.3)', 'line-width': 1, 'line-dasharray': [2, 2] } }, 'lake');
  // the pin: a yellow column standing up from the place, rising after arrival
  map.addSource('pin', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'pin', type: 'fill-extrusion', source: 'pin', paint: { 'fill-extrusion-color': C.yellow, 'fill-extrusion-height': 0, 'fill-extrusion-height-transition': { duration: reduced ? 0 : 700 }, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 1, 'fill-extrusion-vertical-gradient': true } });
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
function pinUp(ll, name) {
  const tall = name === 'Downtown' ? 360 : 220;
  map.setPaintProperty('pin', 'fill-extrusion-height', 0);
  map.getSource('pin').setData({ type: 'FeatureCollection', features: [circle(ll, name === 'Downtown' ? 34 : 50)] });
  requestAnimationFrame(() => map.setPaintProperty('pin', 'fill-extrusion-height', tall));
}
function pinDown() { map?.setPaintProperty('pin', 'fill-extrusion-height', 0); }
function tint(region) {
  map.setFilter('region-tint', ['==', ['get', 'region'], region]);
  map.setPaintProperty('region-tint', 'fill-opacity', 0.16);
}
function untint() { map?.setPaintProperty('region-tint', 'fill-opacity', 0); }

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
  const ok = await camera.fly(PLACES[name], { zoom: zoomFor(name, 'tour'), duration: TIMING.tourFly });
  if (!ok || mine !== running || !touring) return;
  placeOn(name, PLACES[name]);
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
  untint();
  pinDown();
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

  // one thing at a time: arrive, then the pin, then the tint, then the highlighter, then a slow quarter orbit
  const ok = await camera.fly(PLACES[name], { zoom: zoomFor(name), duration: TIMING.matchFly });
  if (!ok || mine !== running) return;
  pinUp(PLACES[name], name);
  placeOn(shown, PLACES[name]);
  await wait(650);
  if (mine !== running) return;
  tint(a.region);
  await wait(500);
  if (mine !== running) return;
  slot.classList.add('is-lit');
  await wait(400);
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
    untint();
    pinDown();
    placeOff();
    result.textContent = '';
    started = false;
    sec.scrollIntoView({ block: 'start' });
    start();
  }
});
addEventListener('resize', () => camera?.set({ padding: padding() }));
