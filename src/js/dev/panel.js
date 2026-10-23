// Dev review panel. Loaded only under import.meta.env.DEV (see main.js), so nothing here ships.
// Section options come from registerOptions() (src/js/options.js); the first value is the locked default.
// State precedence: URL (?hero=scroll or ?hero.mode=scroll) > localStorage > locked default.
import { ScrollTrigger, replaySection } from '../motion.js';

const OPTIONS_KEY = 'onaway:options';
const MOTION_KEY = 'onaway:motion';
const GRID_KEY = 'onaway:grid';

const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};

let registry;
let state;
let gridOn;
let ui;

export function initPanel() {
  registry = window.__onawayOptions ?? new Map();
  const params = new URLSearchParams(location.search);

  // Simulated reduced motion must be set before Lenis and ScrollTrigger init.
  const motionParam = params.get('motion');
  if (motionParam) store.set(MOTION_KEY, motionParam === 'reduce');
  if (store.get(MOTION_KEY, false)) document.documentElement.dataset.motion = 'reduce';

  state = resolveState(params);
  for (const id of registry.keys()) applySection(id);
  store.set(OPTIONS_KEY, state);

  gridOn = params.has('grid') ? params.get('grid') !== '0' : store.get(GRID_KEY, false);
  mount();
  setGrid(gridOn);
}

function resolveState(params) {
  const saved = store.get(OPTIONS_KEY, {});
  const next = {};
  for (const [id, options] of registry) {
    next[id] = {};
    for (const [opt, values] of Object.entries(options)) {
      const fromUrl = params.get(`${id}.${opt}`) ?? (values.includes(params.get(id)) ? params.get(id) : null);
      const fromStore = saved[id]?.[opt];
      next[id][opt] = [fromUrl, fromStore].find((v) => values.includes(v)) ?? values[0];
    }
  }
  return next;
}

function applySection(id) {
  const el = document.querySelector(`[data-section="${id}"]`);
  if (!el) return;
  for (const [opt, value] of Object.entries(state[id])) el.dataset[opt] = value;
  el.dispatchEvent(new CustomEvent('section:options', { detail: { ...state[id] } }));
}

function setOption(id, opt, value) {
  state[id][opt] = value;
  applySection(id);
  store.set(OPTIONS_KEY, state);
  syncUrl();
  ScrollTrigger.refresh();
  render();
}

// Keep non-default choices in the URL so a tunnel link shows the same state.
function syncUrl() {
  const params = new URLSearchParams(location.search);
  for (const [id, options] of registry) {
    params.delete(id);
    for (const opt of Object.keys(options)) params.delete(`${id}.${opt}`);
    const changed = Object.entries(options).filter(([opt, values]) => state[id][opt] !== values[0]);
    if (changed.length === 1 && Object.keys(options).length === 1) params.set(id, state[id][changed[0][0]]);
    else for (const [opt] of changed) params.set(`${id}.${opt}`, state[id][opt]);
  }
  const qs = params.toString();
  history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
}

function resetOptions() {
  for (const [id, options] of registry) {
    for (const [opt, values] of Object.entries(options)) state[id][opt] = values[0];
    applySection(id);
  }
  store.set(OPTIONS_KEY, state);
  syncUrl();
  ScrollTrigger.refresh();
  render();
}

function setGrid(on) {
  gridOn = on;
  store.set(GRID_KEY, on);
  ui.overlay.hidden = !on;
  render();
}

function toggleReducedMotion() {
  store.set(MOTION_KEY, document.documentElement.dataset.motion !== 'reduce');
  const params = new URLSearchParams(location.search);
  params.delete('motion');
  const qs = params.toString();
  location.replace(`${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
}

function sections() {
  return [...document.querySelectorAll('[data-section]')];
}

function currentSection() {
  const mid = window.innerHeight / 2;
  const list = sections();
  return list.filter((el) => el.getBoundingClientRect().top <= mid).pop() ?? list[0];
}

function scrollToSection(el) {
  if (window.lenis) window.lenis.scrollTo(el, { immediate: true });
  else el.scrollIntoView({ behavior: 'instant', block: 'start' });
}

// ---------- UI ----------

const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; }
  .fab {
    position: fixed; right: 21px; bottom: 21px; z-index: 2;
    width: 44px; height: 44px; border-radius: 50%; border: 0; padding: 0;
    display: grid; place-items: center; cursor: pointer;
    background: var(--color-carbon); color: var(--color-paper);
    box-shadow: 0 0 0 1px var(--color-line-dark), 0 8px 21px color-mix(in srgb, var(--color-carbon) 30%, transparent);
  }
  .fab:focus-visible, button:focus-visible { outline: 2px solid var(--color-rust); outline-offset: 3px; }
  .pop {
    position: fixed; inset: auto 21px 76px auto; margin: 0;
    width: min(340px, calc(100vw - 42px)); max-height: calc(100vh - 110px); overflow: auto;
    padding: 21px; border: 1px solid var(--color-line); background: var(--color-paper); color: var(--color-carbon);
    font: 14px/1.5 var(--font-sans); font-stretch: 87.5%;
    box-shadow: 0 13px 34px color-mix(in srgb, var(--color-carbon) 18%, transparent);
  }
  h2, h3 { margin: 0; font-family: var(--font-mono); font-size: 12px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; }
  h3 { margin-top: 21px; padding-top: 13px; border-top: 1px solid var(--color-line); }
  .muted { color: color-mix(in srgb, var(--color-carbon) 65%, transparent); margin: 8px 0 0; }
  .opt { margin-top: 13px; }
  .opt-name { font-family: var(--font-mono); font-size: 12px; letter-spacing: .06em; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  button.chip {
    font: 600 13px/1 var(--font-sans); font-stretch: 87.5%; cursor: pointer;
    padding: 8px 13px; border: 1px solid var(--color-carbon); background: transparent; color: var(--color-carbon);
  }
  button.chip[aria-pressed="true"] { background: var(--color-carbon); color: var(--color-paper); }
  .lock { font-family: var(--font-mono); font-size: 10px; letter-spacing: .06em; opacity: .7; margin-left: 4px; }
  kbd { font-family: var(--font-mono); font-size: 11px; border: 1px solid currentColor; padding: 0 4px; margin-left: 4px; }
  .overlay {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    display: grid; grid-template-columns: repeat(var(--grid-cols), minmax(0, 1fr));
    column-gap: var(--grid-gutter); padding-inline: var(--grid-margin);
  }
  .overlay[hidden] { display: none; }
  .overlay i {
    background: color-mix(in srgb, var(--color-rust) 10%, transparent);
    box-shadow: inset 1px 0 color-mix(in srgb, var(--color-rust) 35%, transparent), inset -1px 0 color-mix(in srgb, var(--color-rust) 35%, transparent);
  }
  @media (width < 1024px) { .overlay i:nth-child(n + 9) { display: none; } }
  @media (width < 768px) { .overlay i:nth-child(n + 5) { display: none; } }
  .fold {
    position: absolute; inset-inline: 0; top: var(--height-fold); border-top: 1px dashed var(--color-rust);
    font: 600 12px/1 var(--font-mono); letter-spacing: .12em; color: var(--color-rust); text-align: right; padding: 8px 21px 0;
  }
`;

function mount() {
  const host = document.createElement('div');
  host.id = 'onaway-dev';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483000;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>${CSS}</style>
    <div class="overlay" aria-hidden="true" hidden>${'<i></i>'.repeat(12)}<div class="fold">FOLD · 860</div></div>
    <button class="fab" type="button" popovertarget="pop" aria-label="Review panel" title="Review panel">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 2v14M7 2v14M11 2v14M16 2v14" stroke="currentColor" stroke-width="2"/></svg>
    </button>
    <div class="pop" id="pop" popover role="dialog" aria-label="Review panel"></div>
  `;
  document.body.append(host);

  ui = { root, overlay: root.querySelector('.overlay'), pop: root.querySelector('#pop') };

  // Fill before it paints (beforetoggle is sync), focus once it's open.
  ui.pop.addEventListener('beforetoggle', (e) => {
    if (e.newState === 'open') render(true);
  });
  ui.pop.addEventListener('toggle', (e) => {
    if (e.newState === 'open') ui.pop.querySelector('button')?.focus();
  });
  ui.pop.addEventListener('click', onPanelClick);

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'g' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    setGrid(!gridOn);
  });
  window.addEventListener('dev:grid', () => setGrid(!gridOn));
}

function render(force = false) {
  if (!ui || (!force && !ui.pop.matches(':popover-open'))) return;
  const current = currentSection();
  const id = current?.dataset.section;
  const options = registry.get(id);
  const reduced = document.documentElement.dataset.motion === 'reduce';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const optionsHtml = options
    ? Object.entries(options).map(([opt, values]) => `
        <div class="opt" role="group" aria-label="${esc(opt)}">
          <div class="opt-name">${esc(opt)}</div>
          <div class="row">${values.map((v, i) => `
            <button type="button" class="chip" data-act="opt" data-id="${esc(id)}" data-opt="${esc(opt)}" data-value="${esc(v)}"
              aria-pressed="${state[id][opt] === v}">${esc(v)}${i === 0 ? '<span class="lock">LOCKED</span>' : ''}</button>`).join('')}
          </div>
        </div>`).join('')
    : '<p class="muted">No options registered for this section.</p>';

  ui.pop.innerHTML = `
    <h2>Section · ${esc(id ?? 'none')}</h2>
    ${optionsHtml}
    <h3>Tools</h3>
    <div class="row">
      <button type="button" class="chip" data-act="grid" aria-pressed="${gridOn}">Grid overlay<kbd>G</kbd></button>
      <button type="button" class="chip" data-act="motion" aria-pressed="${reduced}">Reduced motion</button>
      <button type="button" class="chip" data-act="replay" data-id="${esc(id ?? '')}">Replay section</button>
      <button type="button" class="chip" data-act="reset">Reset options</button>
    </div>
    <h3>Jump to</h3>
    <div class="row">${sections().map((el) => `
      <button type="button" class="chip" data-act="jump" data-id="${esc(el.dataset.section)}" aria-pressed="${el === current}">${esc(el.dataset.section)}</button>`).join('')}
    </div>
    <p class="muted">Panel is dev only and never ships. Locked options are the default.</p>
  `;
}

function onPanelClick(e) {
  const btn = e.target.closest('button[data-act]');
  if (!btn) return;
  const { act, id, opt, value } = btn.dataset;
  const refocus = () => ui.pop.querySelector(`button[data-act="${act}"]${id ? `[data-id="${id}"]` : ''}${value ? `[data-value="${value}"]` : ''}`)?.focus();

  if (act === 'opt') setOption(id, opt, value);
  else if (act === 'grid') setGrid(!gridOn);
  else if (act === 'motion') return toggleReducedMotion();
  else if (act === 'replay') replaySection(id);
  else if (act === 'reset') resetOptions();
  else if (act === 'jump') {
    const el = document.querySelector(`[data-section="${id}"]`);
    if (el) scrollToSection(el);
    render();
  }
  refocus();
}
