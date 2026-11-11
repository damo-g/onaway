// GT-10 option B · Mapbox GL JS v3, Standard style. Exploration page (explore/gt10/b/), never linked from the site.
// The map itself is the live section's (src/js/gta/mapbox.js, imported): this page drives it with every setting as
// a dev-panel option ("gt10b", the first value of each is the pick, the live section's locked value), and adds the
// exploration's extras: textures over the screen and from ./textures/, the map editor (colour pickers, texture
// opacity, "Copy config") and the frame-rate meter.
import { registerOptions } from '../../../src/js/options.js';
import { prefersReducedMotion } from '../../../src/js/motion.js';
import { createSection } from '../../../src/js/gta/controller.js';
import { createGtaMap } from '../../../src/js/gta/mapbox.js';
import { createMeter } from '../meter.js';
import { grainTile, airbrushTile, softGrainTile, tileable, neutral, asUrl, INK } from '../../../src/js/gta/texture.js';
import { sunTimes, torontoTime } from '../../../src/js/gta/presets.js';

// the logo-work textures, if any have been dropped into ./textures/ (each becomes a texture option)
const LOGO = Object.fromEntries(Object.entries(import.meta.glob('./textures/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' }))
  .map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), url]));

const OPTIONS = {
  palette: ['brandrich', 'brandlut', 'overcast', 'overbrand', 'monochrome', 'carbon', 'standard'],
  buildings: ['stone', 'sand', 'camel', 'clay', 'umber', 'ink', 'paper'],
  light: ['live', 'palette', 'day', 'dawn', 'dusk', 'night'],
  objects: ['all', 'facades', 'no-trees', 'flat'],
  labels: ['places', 'none', 'all'],
  poi: ['on', 'landmarks', 'off'],
  names: ['off', 'ours'],
  zone: ['sans', 'mono', 'off'],
  font: ['mono', 'din'],
  texture: ['soft-grain', 'grain', 'airbrush', 'none', ...Object.keys(LOGO)],
  placement: ['ground', 'screen', 'both'],
  opacity: ['20', '10', '30', '40', '0'],
  mark: ['glow+sign', 'lit+sign', 'lit+label', 'lit', 'glow', 'label', 'sign', 'pin', 'none'],
  highlight: ['spotlight', 'tint', 'outline'],
  match: ['close', 'area'],
  closeness: ['16', '16.5', '15.5', '15'],
  stop: ['drift', 'orbit'],
  layout: ['card', 'veil'],
  card: ['light', 'auto'],
  pitch: ['60', '50', '45'],
  orbit: ['on', 'off'],
  speed: ['0.7', '0.75', '1', '0.6'],
};
registerOptions('gt10b', OPTIONS);
await import('../../../src/js/main.js');

const el = document.querySelector('[data-section="gt10b"]');
const opt = (key) => el.dataset[key] ?? OPTIONS[key]?.[0];
const reduced = prefersReducedMotion();
const editor = { overrides: {}, opacity: null }; // map editor state (colour overrides, opacity slider)
const opacity = () => (editor.opacity ?? +opt('opacity')) / 100;
const perf = createMeter();

// ---------- textures ----------
// Generated (soft gradient grain, paper grain, airbrush) or a logo texture made seamless. On the ground (the map's
// own layer, mapbox.js); on screen: two layers over the section, multiply then soft-light.
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

const gta = createGtaMap(el, {
  opt,
  container: el.querySelector('.g10-map'),
  token: import.meta.env.VITE_MAPBOX_TOKEN,
  reduced,
  overrides: () => editor.overrides,
  texture: textureCanvas,
  textureOpacity: opacity,
  onConfig: () => { syncEditor(); applyScreenTexture(); },
});

const screenTex = ['multiply', 'soft-light'].map((mode) => {
  const d = document.createElement('div');
  d.dataset.mode = mode;
  d.className = `g10b-tex g10b-tex--${mode}`;
  d.setAttribute('aria-hidden', 'true');
  el.append(d);
  return d;
});
// how large each texture repeats on screen: the airbrush's clouds broad and soft, the grain fine
const SIZE = { airbrush: '1400px', grain: '256px', 'soft-grain': '768px' };
async function applyScreenTexture() {
  const name = opt('texture');
  const c = name === 'none' ? null : await textureCanvas(name);
  const onScreen = c && opt('placement') !== 'ground';
  screenTex.forEach((d) => {
    // each layer gets the texture made neutral for its blend (no overall wash or darkening, only the texture)
    const key = `${name}:${d.dataset.mode}`;
    if (onScreen) texCache[key] ??= asUrl(neutral(c, d.dataset.mode));
    d.style.backgroundImage = onScreen ? texCache[key] : 'none';
    d.style.backgroundSize = SIZE[name] ?? '768px';
    d.style.opacity = onScreen ? String(Math.min(1, opacity() * 2)) : '0';
  });
}
function applyTexture() {
  applyScreenTexture();
  gta.applyGroundTexture();
}

// ---------- the map, loaded only when the section nears the screen ----------
async function boot() {
  perf.boot = performance.now();
  const map = await gta.boot();
  if (!map) return;
  perf.lib = perf.firstFrame = performance.now();
  window.__gt10.map = map;
  const section = createSection(el, gta.adapter, { speed: () => +opt('speed'), orbitOn: () => opt('orbit') === 'on', matchMode: () => opt('match') });
  window.__gt10.section = section;
}
new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); boot(); } }, { rootMargin: '800px 0px' }).observe(el);
applyScreenTexture();

// ---------- options changed in the dev panel ----------
let applied = { ...el.dataset };
el.addEventListener('section:options', () => {
  const was = applied;
  applied = { ...el.dataset };
  const changed = (key) => was[key] !== applied[key];
  if (changed('palette')) editor.overrides = {};
  if (changed('opacity')) editor.opacity = null;
  const map = gta.map;
  const camera = gta.camera;
  if (changed('font') && map) gta.rebuildStyle();
  else if (['palette', 'buildings', 'light', 'objects', 'labels', 'poi', 'card'].some(changed)) { gta.applyConfig(); gta.scheduleLive(); }
  if (changed('zone')) gta.labels?.zone(null); // the next match shows it in the new style
  if (['highlight', 'names'].some(changed)) gta.paint();
  if (['texture', 'placement', 'opacity'].some(changed)) applyTexture();
  if (!map || !camera) return;
  const padding = gta.padding();
  if (changed('layout')) requestAnimationFrame(() => { camera.set({ padding: gta.padding() }); map.easeTo({ padding: gta.padding(), duration: reduced ? 0 : 600 }); });
  if (changed('pitch')) { camera.set({ pitch: +opt('pitch') }); map.easeTo({ pitch: +opt('pitch'), padding, duration: reduced ? 0 : 800 }); }
  if (changed('orbit')) camera.set({ orbit: opt('orbit') === 'on' });
  if (changed('speed')) camera.set({ speed: +opt('speed') });
  if (changed('stop')) camera.set({ drift: opt('stop') === 'drift' ? 45 : 0 });
});

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
    const c = gta.config();
    const colors = Object.fromEntries(Object.entries(c).filter(([key]) => key.startsWith('color') || key === 'roadsBrightness'));
    return JSON.stringify({ palette: opt('palette'), theme: c.theme, lightPreset: c.lightPreset, colors }, null, 2);
  };
  syncEditor = () => {
    const c = gta.config();
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
    if (key) { editor.overrides[key] = e.target.value; gta.map?.setConfigProperty('basemap', key, e.target.value); box.querySelector('textarea').value = json(); }
    if (e.target.matches('[data-opacity]')) { editor.opacity = +e.target.value; e.target.nextElementSibling.textContent = `${e.target.value}%`; applyTexture(); }
  });
  box.addEventListener('click', async (e) => {
    if (e.target.matches('[data-copy]')) {
      const text = json();
      try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; } catch { box.querySelector('textarea').select(); e.target.textContent = 'Select and copy'; }
      setTimeout(() => { e.target.textContent = 'Copy config'; }, 1500);
    }
    if (e.target.matches('[data-reset]')) { editor.overrides = {}; gta.applyConfig(); }
  });
  syncEditor();
}

