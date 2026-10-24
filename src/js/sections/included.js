import { prefersReducedMotion } from '../motion.js';
import { MOVING } from '../data/moving-plan.js';
import { DELIVERY } from '../data/delivery-plan.js';

// WI-01b What's included: five stops in the crew's order, every list visible. Tour: one stop every 3.6s,
// the line filling toward the next; hovering the route pauses it, clicking a stop holds it there.
// Lists are drafts for the client to confirm. + items show only while their add-on is on: Cleaning's
// Deep clean switch, or the add-on chips on Moving and Delivery (data-plan, lists in src/js/data/*-plan.js).
const CLEANING = {
  home: [
    { n: 'Kitchen', t: ['Counters and backsplash wiped', 'Sink and taps cleaned and shined', 'Stovetop and the outside of appliances', 'Cabinet fronts and handles', 'Bins emptied and relined'], d: ['Inside the oven', 'Inside the fridge', 'Inside cabinets and drawers'] },
    { n: 'Bathrooms', t: ['Toilet, tub and shower scrubbed', 'Sink, taps and mirror', 'Counters and cabinet fronts', 'Bins emptied', 'Towels folded or hung'], d: ['Grout and tile detail', 'Exhaust fan cover', 'Inside cabinets'] },
    { n: 'Living and bedrooms', t: ['Surfaces dusted, top to bottom', 'Mirrors and glass', 'Switches and door handles', 'Beds made, linens changed if left out', 'Cushions and throws tidied'], d: ['Baseboards', 'Window tracks and sills', 'Blinds, slat by slat'] },
    { n: 'Floors', t: ['Carpets and rugs vacuumed', 'Hard floors mopped', 'Stairs, if there are any', 'Entry mats shaken out'], d: ['Under and behind movable furniture', 'Edges and corners by hand'] },
    { n: 'Final walkthrough', t: ['The crew lead checks every room against this list', 'Anything missed is done before we leave', 'Lights off, doors locked as you asked', 'A note left with what was done'], d: [] },
  ],
  work: [
    { n: 'Desks and surfaces', t: ['Clear desks and tables wiped', 'Reception and shared counters', 'Touch points: handles, switches, buttons', 'Bins and recycling emptied'], d: ['Chairs and partitions wiped down', 'High dusting: vents, ledges, frames'] },
    { n: 'Kitchenette', t: ['Counters, sink and taps', 'Microwave and appliances, outside', 'Tables and chairs wiped', 'Dishes into the dishwasher'], d: ['Inside the fridge and microwave', 'Inside cabinets'] },
    { n: 'Washrooms', t: ['Toilets, urinals and sinks', 'Mirrors and fixtures', 'Supplies refilled from your stock', 'Floors mopped and disinfected'], d: ['Grout and tile detail', 'Partitions and doors'] },
    { n: 'Floors', t: ['Carpets vacuumed', 'Hard floors mopped', 'Entrance mats cleaned', 'Stairs and landings'], d: ['Under desks and around cables', 'Edges and corners by hand'] },
    { n: 'Final walkthrough', t: ['The crew lead checks every area against this list', 'Anything missed is done before we leave', 'Lights off, alarm set, doors locked as instructed', 'A note left with what was done'], d: [] },
  ],
};
// Cleaning's deep items (d) become + items under the "deep" add-on
const PLANS = {
  cleaning: Object.fromEntries(Object.entries(CLEANING).map(([k, v]) => [k, v.map((s) => ({ n: s.n, t: [...s.t, ...s.d.map((t) => ({ add: 'deep', t }))] }))])),
  moving: MOVING,
  delivery: DELIVERY,
};
const STEP = 3600;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function init(el) {
  const route = el.querySelector('.incl__route');
  const note = el.querySelector('.incl__note');
  const DATA = PLANS[el.dataset.plan || 'cleaning'];
  const still = prefersReducedMotion();
  const S = { space: el.querySelector('[data-space][aria-pressed="true"]').dataset.space, on: new Set(), i: 0, held: false, picked: false };
  const item = (x) => {
    if (typeof x === 'string') return `<li>${esc(x)}</li>`;
    const t = x.href ? esc(x.t).replace(esc(x.link), `<a href="${x.href}">${esc(x.link)}</a>`) : esc(x.t);
    return `<li class="is-add" data-add="${x.add}"${S.on.has(x.add) ? '' : ' hidden'}><i aria-hidden="true">+</i>${t}</li>`;
  };
  let anim = null;
  let gen = 0;

  function build() {
    route.innerHTML = `<div class="incl__line" aria-hidden="true"><b></b></div><ol class="incl__stops">${DATA[S.space]
      .map((s, i) => `<li class="incl__stop"><button type="button" class="incl__head" data-stop="${i}"><i class="incl__sq" aria-hidden="true"></i><span class="incl__num label">${String(i + 1).padStart(2, '0')}</span><span class="incl__name">${esc(s.n)}</span></button><ul class="incl__list">${s.t.map(item).join('')}</ul></li>`)
      .join('')}</ol>`;
  }

  // Stop i is current: earlier stops passed; the line fills from stop i toward the next
  function show(i, run) {
    S.i = i;
    anim?.cancel();
    anim = null;
    const my = ++gen;
    const stops = [...route.querySelectorAll('.incl__stop')];
    stops.forEach((s, j) => {
      s.classList.toggle('is-on', j === i);
      s.classList.toggle('is-past', j < i);
      s.querySelector('.incl__head').setAttribute('aria-current', j === i ? 'step' : 'false');
    });
    const fill = route.querySelector('.incl__line b');
    const vertical = getComputedStyle(route).getPropertyValue('--route-dir').trim() === 'v';
    const prop = vertical ? 'height' : 'width';
    const at = (j) => (j >= stops.length ? (vertical ? route.offsetHeight : route.offsetWidth) : vertical ? stops[j].offsetTop + 8 : stops[j].offsetLeft + 8);
    fill.style.width = fill.style.height = '';
    fill.style[prop] = `${at(i)}px`;
    if (!run || still || S.picked || vertical) return;
    anim = fill.animate([{ [prop]: `${at(i)}px` }, { [prop]: `${at(i + 1)}px` }], { duration: STEP, easing: 'linear', fill: 'forwards' });
    if (S.held) anim.pause();
    anim.onfinish = () => my === gen && show((S.i + 1) % stops.length, true);
  }

  // Hovering the route pauses the tour; the rest of the section doesn't
  route.addEventListener('mouseenter', () => { S.held = true; anim?.pause(); });
  route.addEventListener('mouseleave', () => { S.held = false; if (!S.picked) anim?.play(); });
  route.addEventListener('click', (e) => {
    const b = e.target.closest('[data-stop]');
    if (!b) return;
    S.picked = true;
    show(Number(b.dataset.stop), false);
  });

  el.querySelectorAll('[data-space]').forEach((b) =>
    b.addEventListener('click', () => {
      S.space = b.dataset.space;
      el.querySelectorAll('[data-space]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      S.picked = false;
      build();
      show(0, true);
    }),
  );
  // Add-ons are independent; each shows only its own + items. The note shows while any is on
  // (data-note="on") or until one is (data-note="off"); Moving has none.
  el.querySelectorAll('[data-add]').forEach((b) =>
    b.addEventListener('click', () => {
      const k = b.dataset.add;
      const on = !S.on.has(k);
      if (on) S.on.add(k);
      else S.on.delete(k);
      b.setAttribute(b.getAttribute('role') === 'switch' ? 'aria-checked' : 'aria-pressed', String(on));
      route.querySelectorAll(`li[data-add="${k}"]`).forEach((li) => (li.hidden = !on));
      if (note) note.hidden = (note.dataset.note === 'off') === S.on.size > 0;
    }),
  );

  build();
  show(0, true);
  // Re-measure on resize (skip the observer's first call, which fires on load)
  let measured = false;
  new ResizeObserver(() => {
    if (!measured) { measured = true; return; }
    show(S.i, !S.picked);
  }).observe(route);
}
