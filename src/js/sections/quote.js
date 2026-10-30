import { registerOptions } from '../options.js';
import { onEnterOnce, prefersReducedMotion } from '../motion.js';
import { lookupPostcode } from '../data/postcodes.js';
import { PLACES, regionLabel } from '../data/places.js';

// Locked first: dark panel, X and O route marks, asking service + area + when.
registerOptions('quote', {
  colour: ['dark', 'light', 'yellow'],
  marks: ['xo', 'box', 'cross', 'street'],
  ask: ['3', '2', '1'],
  head: ['label', 'headline'], // a small label over the sentence, or the old display headline
  size: ['68', '42'], // the sentence on desktop
});

const EMPTY = { service: 'a hand', area: 'your area', when: 'sometime soon' };

// "by 4:30 PM": Toronto time + 2 hours; before 8 AM or after 6 PM it's 10 AM (tomorrow after 6 PM)
function quoteBy() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  const fmt = (hh, mm) => `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
  if (h < 8) return `by ${fmt(10, 0)}`;
  if (h >= 18) return `by ${fmt(10, 0)} tomorrow`;
  return `by ${fmt(h + 2, m)}`;
}

export function init(el) {
  const form = el.querySelector('.qc__form');
  const blanks = Object.fromEntries([...el.querySelectorAll('.qc-blank')].map((b) => [b.dataset.blank, b]));
  const pops = Object.fromEntries(Object.keys(blanks).map((k) => [k, el.querySelector(`#qc-pop-${k}`)]));
  const cta = el.querySelector('.qc__cta');
  const ctaLabel = el.querySelector('.qc__cta-label');
  const areaInput = pops.area.querySelector('.qc-pop__input');
  const results = pops.area.querySelector('.qc-pop__results');
  const values = { service: '', area: '', when: '' };
  const ask = () => Number(el.dataset.ask ?? 3);
  let openKey = null;

  // ---- answers
  function set(key, value) {
    values[key] = value;
    form.elements[key].value = value;
    const b = blanks[key];
    b.querySelector('.qc-blank__text').textContent = value || EMPTY[key];
    b.classList.toggle('is-set', !!value);
    b.classList.toggle('is-empty', !value);
    update();
  }

  // The button says the missing step; the next empty blank breathes
  function update() {
    const needArea = ask() >= 2;
    const ready = !!values.service && (!needArea || !!values.area);
    const wasReady = cta.getAttribute('aria-disabled') === 'false';
    ctaLabel.textContent = !values.service ? 'Pick a service to start' : needArea && !values.area ? 'Add your area' : 'Get a free quote';
    cta.setAttribute('aria-disabled', String(!ready));
    if (ready && !wasReady) {
      cta.classList.remove('is-ready');
      void cta.offsetWidth;
      cta.classList.add('is-ready');
    }
    const order = ['service', 'area', 'when'].slice(0, ask());
    const next = order.find((k) => !values[k]);
    Object.entries(blanks).forEach(([k, b]) => b.classList.toggle('is-next', k === next));
  }

  // ---- pickers
  function place(key) {
    const b = blanks[key].getBoundingClientRect();
    const host = el.querySelector('.qc__body').getBoundingClientRect();
    const pop = pops[key];
    const maxLeft = host.width - pop.offsetWidth;
    pop.style.left = `${Math.max(0, Math.min(b.left - host.left, maxLeft))}px`;
    pop.style.top = `${b.bottom - host.top + 13}px`;
  }

  function open(key) {
    if (openKey === key) return close();
    close();
    openKey = key;
    pops[key].hidden = false;
    blanks[key].setAttribute('aria-expanded', 'true');
    place(key);
    if (key === 'area') {
      areaInput.value = '';
      search();
      areaInput.focus();
    } else {
      pops[key].querySelector('button').focus();
    }
  }

  function close({ focusBlank = false } = {}) {
    if (!openKey) return;
    const key = openKey;
    pops[key].hidden = true;
    blanks[key].setAttribute('aria-expanded', 'false');
    openKey = null;
    if (focusBlank) blanks[key].focus();
  }

  Object.entries(blanks).forEach(([key, b]) => b.addEventListener('click', (e) => { e.stopPropagation(); open(key); }));
  Object.values(pops).forEach((pop) => pop.addEventListener('click', (e) => e.stopPropagation()));
  document.addEventListener('click', () => close());
  el.addEventListener('keydown', (e) => {
    if (!openKey) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close({ focusBlank: true });
      return;
    }
    // Up/down move through the options
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const items = [...pops[openKey].querySelectorAll('button')];
      if (!items.length) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement);
      const n = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
      items[i < 0 ? 0 : n].focus();
    }
  });
  el.addEventListener('focusout', (e) => {
    if (openKey && !pops[openKey].contains(e.relatedTarget) && e.relatedTarget !== blanks[openKey]) close();
  });

  pops.service.querySelectorAll('button').forEach((o) => o.addEventListener('click', () => { set('service', o.dataset.value); close({ focusBlank: true }); }));
  pops.when.querySelectorAll('button').forEach((o) => o.addEventListener('click', () => { set('when', o.dataset.value); close({ focusBlank: true }); }));

  // Area: a postal code is looked up; a town is matched by name. Rows show the region tag.
  function row(name, region, code) {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `<i aria-hidden="true"></i><span></span><small></small>`;
    b.querySelector('span').textContent = name;
    b.querySelector('small').textContent = `${code ? `${code} · ` : ''}${regionLabel(region)}`;
    b.addEventListener('click', () => { set('area', name); close({ focusBlank: true }); });
    return b;
  }
  function message(text) {
    const p = document.createElement('p');
    p.className = 'qc-pop__msg';
    p.textContent = text;
    return p;
  }
  function search() {
    const v = areaInput.value.trim();
    results.replaceChildren();
    if (!v) return;
    if (/^[A-Za-z]\d[A-Za-z]/.test(v)) {
      const a = lookupPostcode(v);
      if (a.ok) results.append(row(a.place && a.place !== 'Toronto' ? a.place : a.region === 'Toronto' ? 'Toronto' : regionLabel(a.region), a.region, a.fsa));
      else results.append(message(`${a.fsa} is outside our five areas for now. Add it on the next page and we will tell you straight.`));
    } else {
      const s = v.toLowerCase();
      const starts = PLACES.filter(([n]) => n.toLowerCase().startsWith(s));
      const contains = PLACES.filter(([n]) => !n.toLowerCase().startsWith(s) && n.toLowerCase().includes(s));
      starts.concat(contains).slice(0, 5).forEach(([n, r]) => results.append(row(n, r, '')));
      if (!results.children.length) results.append(message('Try a postal code, like L5B 1A1.'));
    }
    results.querySelector('button')?.classList.add('is-first');
  }
  areaInput.addEventListener('input', search);
  areaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      results.querySelector('button')?.click();
    }
  });

  // ---- pre-fill the area from the GTA check (05)
  try {
    const where = JSON.parse(sessionStorage.getItem('onaway:where'));
    if (where?.place) set('area', where.place);
  } catch {}
  document.addEventListener('gta:place', (e) => set('area', e.detail.place));

  // ---- "by" time, kept current
  const by = () => el.querySelectorAll('[data-quote-by]').forEach((n) => (n.textContent = quoteBy()));
  by();
  setInterval(by, 30000);

  // ---- send: for now, the "one more page" state; answers wait for the quote page
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cta.getAttribute('aria-disabled') === 'true') {
      const next = ['service', 'area', 'when'].slice(0, ask()).find((k) => !values[k]);
      if (next) open(next);
      return;
    }
    // Continue on the quote page, which picks these answers up
    try { sessionStorage.setItem('onaway:quote', JSON.stringify(values)); } catch {}
    location.href = '/quote/';
  });

  update();

  if (!prefersReducedMotion()) {
    el.classList.add('is-armed');
    onEnterOnce(el, () => {
      el.classList.remove('is-armed', 'is-go');
      void el.offsetWidth;
      el.classList.add('is-armed', 'is-go');
    }, { start: 'top 70%' });
  }

  if (import.meta.env.DEV) el.addEventListener('section:options', update);
}
