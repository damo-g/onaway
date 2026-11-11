import { registerOptions } from '../options.js';
import { onEnterOnce, prefersReducedMotion } from '../motion.js';
import { areaSearch } from '../area-search.js';

// Locked first (Nov 2026: the billboard, angled, masthead, light, head off, 68, stops + live). The locked set is also written on
// the section (06-quote.html), so the build, which has no panel, shows it too.
registerOptions('quote', {
  // The board's colour (the panel's, without a board): light (the ticket's face) · dark · yellow
  colour: ['light', 'dark', 'yellow'],
  marks: ['xo', 'box', 'cross', 'street'], // the route behind the panel (no board only)
  ask: ['3', '2', '1'],
  // label: "Get a free quote" as the sign's ID band beside the W (mono) · headline: the display headline packed on the
  // sentence · off: the sentence alone
  head: ['off', 'label', 'headline'],
  size: ['68', '42'], // the sentence on desktop
  // The button before the sentence is complete (pressing it opens the next blank in every case):
  // stopslive (the full button, three route stops filling as you answer) · live (the full button; only its words
  // change) · stops (hollow, the stops filling) · fill (hollow, a yellow bar along its foot grows with each answer)
  // · count (the full button, "1/3" where the arrow goes) · dim (70%, as built)
  wait: ['stopslive', 'live', 'stops', 'fill', 'count', 'dim'],
  // Desktop layout: aside (8/4: the note and button in the right column) · poster (centred) · left (flush left) ·
  // masthead (the headline across, the sentence under it, the button on a hairline) · split (7/5: a ticket of the
  // answers and the button)
  // masthead (locked Nov 2026: the sentence across, the note and button on one row under it, no rules) · stagger (the
  // button and note stepping down into the right five twelfths)
  layout: ['masthead', 'stagger', 'aside', 'poster', 'left', 'split'],
  // The sentence's setting: billboard (a wayfinding board on two posts to the ground) · hanging (hung on rods from
  // the map above, like the Services signs) · post (on one post at its side) · flap (the panel, its blanks as
  // split-flap tiles) · none (the panel)
  effect: ['billboard', 'hanging', 'post', 'flap', 'none'],
  board: ['l', 'm', 'xl'], // the board's width on desktop: 10 · 8 · 12 columns
  view: ['angled', 'flat'], // angled: turned 4°, its near edge showing (desktop; the pickers turn with it)
});
const BOARDS = ['billboard', 'hanging', 'post'];
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
    // the answer shows wherever an option repeats it: the split layout's ticket, the stops
    const label = value ? (SHORT[value] ?? value.charAt(0).toUpperCase() + value.slice(1)) : '';
    el.querySelector(`[data-sum="${key}"] dd`).textContent = label || '—';
    el.querySelector(`[data-stop="${key}"]`).classList.toggle('is-on', !!value);
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
    // progress, for the fill and count options
    const got = order.filter((k) => values[k]).length;
    el.style.setProperty('--qc-p', `${(got / order.length) * 100}%`);
    el.querySelector('.qc__count').textContent = `${got}/${order.length}`;
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

  // ---- the board: its posts reach the ground (the footer), its rods the map above; on paper, not a dark panel
  const body = el.querySelector('.qc__body');
  const footer = document.querySelector('[data-section="footer"]');
  const above = el.previousElementSibling;
  function rig() {
    const board = BOARDS.includes(el.dataset.effect);
    if (board) el.removeAttribute('data-nav-theme');
    else el.dataset.navTheme = 'dark';
    if (!board) return;
    const b = body.getBoundingClientRect();
    if (footer) el.style.setProperty('--post-h', `${Math.max(0, Math.round(footer.getBoundingClientRect().top - b.bottom))}px`);
    if (above) el.style.setProperty('--rod-h', `${Math.max(0, Math.round(b.top - above.getBoundingClientRect().bottom))}px`);
  }
  rig();
  new ResizeObserver(rig).observe(document.body);
  document.fonts?.ready.then(rig);

  if (!prefersReducedMotion()) {
    el.classList.add('is-armed');
    onEnterOnce(el, () => {
      el.classList.remove('is-armed', 'is-go');
      void el.offsetWidth;
      el.classList.add('is-armed', 'is-go');
    }, { start: 'top 70%' });
  }

  if (import.meta.env.DEV) el.addEventListener('section:options', () => { update(); requestAnimationFrame(rig); });
}
