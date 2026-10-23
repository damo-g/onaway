import { registerOptions } from '../options.js';
import { onEnterOnce, prefersReducedMotion } from '../motion.js';
import { lookupPostcode } from '../data/postcodes.js';

// Locked first: overlay layout, drawn map, light tone, idle tour, place zoom, coverage check on.
registerOptions('gta', {
  layout: ['overlay', 'split', 'caption'],
  map: ['drawn', 'grid'],
  tone: ['light', 'dark'],
  idle: ['tour', 'still'],
  zoom: ['place', 'area'],
  check: ['on', 'off'],
});

// Place positions on the drawn map (viewBox 1472 × 820), from the GT-09 mock
const VB = { w: 1472, h: 820 };
const PLACES = {
  Burlington: [90, 722], Oakville: [230, 662], Milton: [150, 470], 'Halton Hills': [170, 330], Mississauga: [420, 590],
  Brampton: [400, 360], Caledon: [380, 120], Etobicoke: [590, 590], Downtown: [775, 650], 'North York': [760, 420],
  'East York': [830, 520], Scarborough: [980, 500], Vaughan: [640, 240], 'Richmond Hill': [770, 210], Markham: [920, 236],
  Newmarket: [790, 70], Aurora: [760, 130], Stouffville: [1010, 140], Pickering: [1110, 452], Ajax: [1180, 432],
  Whitby: [1270, 420], Oshawa: [1360, 410], Clarington: [1435, 380],
};
const REGION_CENTRE = { Toronto: 'Downtown', Peel: 'Mississauga', York: 'Markham', Durham: 'Oshawa', Halton: 'Oakville' };
const TOUR = ['Downtown', 'Mississauga', 'Markham', 'Oakville', 'Scarborough', 'Brampton', 'Pickering', 'Vaughan', 'Burlington', 'Oshawa'];
const STOP = 3400; // per tour stop
const ZOOM = { place: 2.2, area: 1.6 };

export function init(el) {
  const plate = el.querySelector('.gta__plate');
  const panel = el.querySelector('.gta__panel');
  const zoom = el.querySelector('#gmap-zoom');
  const pin = el.querySelector('#gmap-pin');
  const regions = [...el.querySelectorAll('.gmap .rf')];
  const placeGroups = [...el.querySelectorAll('.gmap .pl')];
  const slot = el.querySelector('.gta__slot');
  const placeText = el.querySelector('.gta__place');
  const form = el.querySelector('.gta__check');
  const input = form.querySelector('input');
  const result = form.querySelector('.gta__result');
  const reduced = prefersReducedMotion();
  const opt = (key, locked) => el.dataset[key] ?? locked;
  if (reduced) el.classList.add('is-static');

  let current = null; // { name, z } the map is flown to
  let k = 0;
  let timer = null;
  let touring = false;
  let hovered = false;
  let focused = false;
  let visible = false;

  // Centre of the open map (right of the overlay panel, above the caption band) in viewBox units
  function focusPoint() {
    const W = plate.clientWidth;
    const H = plate.clientHeight;
    const s = Math.max(W / VB.w, H / VB.h); // preserveAspectRatio: slice
    const ox = (VB.w - W / s) / 2;
    const oy = (VB.h - H / s) / 2;
    let cx = W / 2;
    let cy = H / 2;
    if (getComputedStyle(panel).position === 'absolute') {
      const p = panel.getBoundingClientRect();
      const m = plate.getBoundingClientRect();
      if (opt('layout', 'overlay') === 'caption') cy = (p.top - m.top) / 2;
      else cx = (p.right - m.left + W) / 2;
    }
    return { x: ox + cx / s, y: oy + cy / s };
  }

  const highlight = (name) => placeGroups.forEach((g) => g.classList.toggle('is-on', g.dataset.place === name));

  function fly(name, z) {
    const p = PLACES[name];
    if (!p) return wide();
    current = { name, z };
    highlight(name);
    const f = focusPoint();
    zoom.style.transform = `translate(${f.x - p[0] * z}px, ${f.y - p[1] * z}px) scale(${z})`;
    pin.style.transform = `translate(${p[0]}px, ${p[1]}px) scale(${1.2 / z})`;
    pin.style.opacity = 1;
  }

  function hop(name) {
    const p = PLACES[name];
    current = null;
    zoom.style.transform = '';
    highlight(name);
    pin.style.transform = `translate(${p[0]}px, ${p[1]}px)`;
    pin.style.opacity = 1;
  }

  function wide() {
    current = null;
    zoom.style.transform = '';
    pin.style.opacity = 0;
    highlight(null);
  }

  function write(text) {
    placeText.classList.remove('is-typing');
    void placeText.offsetWidth;
    placeText.textContent = text;
    placeText.classList.add('is-typing');
  }

  // Idle tour: once through the ten places, then rest wide on the whole GTA. Pauses on hover, focus
  // and when the map is mostly off screen; resumes where it left off.
  function step() {
    timer = null;
    if (!touring || hovered || focused || !visible) return;
    if (k >= TOUR.length) {
      touring = false;
      write('the GTA');
      wide();
      return;
    }
    const name = TOUR[k++];
    write(name);
    if (opt('idle', 'tour') === 'tour') fly(name, Math.max(1.3, ZOOM[opt('zoom', 'place')] * 0.7));
    else hop(name);
    timer = setTimeout(step, STOP);
  }

  function update() {
    if (!touring) return;
    if (hovered || focused || !visible) {
      clearTimeout(timer);
      timer = null;
    } else if (!timer) {
      timer = setTimeout(step, STOP / 2);
    }
  }

  function startTour() {
    if (reduced) return;
    clearTimeout(timer);
    touring = true;
    k = 0;
    timer = setTimeout(step, 1600);
  }

  el.querySelector('.gta__stage').addEventListener('mouseenter', () => { hovered = true; update(); });
  el.querySelector('.gta__stage').addEventListener('mouseleave', () => { hovered = false; update(); });
  form.addEventListener('focusin', () => { focused = true; update(); });
  form.addEventListener('focusout', (e) => { if (!form.contains(e.relatedTarget)) { focused = false; update(); } });
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }, { threshold: 0.4 }).observe(plate);

  // Postal-code check: fly to the place, pin it, tint the region, write it into the sentence
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const a = lookupPostcode(input.value);
    result.classList.remove('is-in');
    void result.offsetWidth;
    result.classList.add('is-in');
    if (a.bad) {
      result.innerHTML = 'Postal codes start letter, number, letter, like <b>M6K</b>.';
      return;
    }
    clearTimeout(timer);
    touring = false;
    regions.forEach((r) => r.classList.toggle('is-hit', a.ok && r.dataset.region === a.region));
    slot.classList.remove('is-idle', 'is-lit');

    if (!a.ok) {
      result.innerHTML = `<b>Not yet.</b> ${a.fsa} is outside our five areas. Ask anyway, and we will tell you straight.`;
      write('your area, soon');
      wide();
      return;
    }

    const area = a.region === 'Toronto' ? 'in the City of Toronto' : `${a.region} Region`;
    result.innerHTML = `<b>Yes.</b> ${a.fsa} is ${a.place && a.place !== 'Toronto' ? `${a.place}, ` : ''}${area}. Same crew, same promises.`;
    let name = a.place && PLACES[a.place] ? a.place : REGION_CENTRE[a.region];
    let shown = a.place && PLACES[a.place] ? a.place : a.region === 'Toronto' ? 'Toronto' : `${a.region} Region`;
    if (a.place === 'Toronto') {
      name = 'Downtown';
      shown = 'Toronto';
    }
    write(shown);
    fly(name, ZOOM[opt('zoom', 'place')]);
    setTimeout(() => slot.classList.add('is-lit'), reduced ? 0 : 500);

    // Hand-off: the quote section (06) pre-fills "where" from this
    const where = { fsa: a.fsa, region: a.region, place: shown };
    try { sessionStorage.setItem('onaway:where', JSON.stringify(where)); } catch {}
    document.dispatchEvent(new CustomEvent('gta:place', { detail: where }));
  });

  // Keep the flown-to place in focus when the plate resizes
  new ResizeObserver(() => current && fly(current.name, current.z)).observe(plate);

  if (!reduced) {
    const play = () => {
      el.classList.remove('is-armed', 'is-go');
      void el.offsetWidth;
      el.classList.add('is-armed', 'is-go');
      if (!slot.classList.contains('is-lit')) startTour();
    };
    el.classList.add('is-armed');
    onEnterOnce(el, play, { start: 'top 60%' });
  }

  if (import.meta.env.DEV) {
    el.addEventListener('section:options', () => current && fly(current.name, current.z));
  }
}
