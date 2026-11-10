import { registerOptions } from '../options.js';
import { onEnterOnce, prefersReducedMotion } from '../motion.js';
import { areaSearch } from '../area-search.js';

// Locked first: dark panel, X and O route marks, asking service + area + when.
registerOptions('quote', {
  colour: ['dark', 'light', 'yellow'],
  marks: ['xo', 'box', 'cross', 'street'],
  ask: ['3', '2', '1'],
  head: ['off', 'headline'], // the sentence alone (the eyebrow retired, Nov 2026), or the display headline over it
  size: ['68', '42'], // the sentence on desktop
  // The button before the sentence is complete (pressing it opens the next blank in every case):
  // dim (70%, as built) · outline (hollow, fills when ready) · stops (three route stops fill as you answer)
  // · board (a departure-board line: NEXT · …) · live (always the full button; its words say the next step)
  wait: ['dim', 'outline', 'stops', 'board', 'live'],
  // Desktop layout: poster (centred, as built) · left (flush left) · split (7/5: the sentence, then a ticket of the
  // answers and the button) · aside (8/4: the note and button in the right column) · masthead (the headline across,
  // the sentence under it, the button on a hairline)
  layout: ['poster', 'left', 'split', 'aside', 'masthead'],
  // An extra, brand-led: none · stamps (each answer is stamped onto the panel) · billboard (the panel as a wayfinding
  // sign on posts) · flap (the blanks as split-flap tiles that flip when set)
  effect: ['none', 'stamps', 'billboard', 'flap'],
});
const SHORT = { 'this week': 'This week', 'next week': 'Next week', later: 'Later', 'not sure yet': 'Not sure' };

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
    // the answer shows wherever an option repeats it: the split layout's ticket, the stops, the stamps
    const label = value ? (SHORT[value] ?? value.charAt(0).toUpperCase() + value.slice(1)) : '';
    el.querySelector(`[data-sum="${key}"] dd`).textContent = label || '—';
    el.querySelector(`[data-stop="${key}"]`).classList.toggle('is-on', !!value);
    const stamp = el.querySelector(`[data-stamp="${key}"]`);
    stamp.querySelector('b').textContent = label;
    stamp.classList.toggle('is-on', !!value);
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
      area.clear();
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

  // Area: postal code or town, matched as in the GTA check (05); the same search as the quote page
  const area = areaSearch({
    input: areaInput,
    list: results,
    pick: (it) => { set('area', it.label); close({ focusBlank: true }); },
    empty: 'Try a postal code, like L5B 1A1.',
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
