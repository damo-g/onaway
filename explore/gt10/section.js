// GT-10 shared · the section's behaviour, engine-neutral: the intro, the idle tour, "Do we cover you?" (postal code
// or town), the hand-off to the quote, pausing and replay. Each option page supplies an adapter for its map:
//
//   adapter.camera                    the moves from camera.js, created on the page's map
//   adapter.drawn(maxMs)              resolves once the view on screen is drawn (or after maxMs)
//   adapter.warm(lngLat)              optional: start loading a place before the camera goes there (→ promise)
//   adapter.highlight(region | null)  light an area (the style is the page's option), or clear it
//   adapter.pin(label, lngLat) / adapter.unpin()
//   adapter.zoomFor(placeName, 'tour' | 'match')
//   adapter.outline(region)           the area's outline points, for framing it
//   adapter.areaZoom()                the camera's zoom now (after framing an area)
//   adapter.tourFloor                 optional: how high the tour's flights rise (zoom; default 11.6)
//
// Words and data come from the live site: the panel partial (src/partials/gta-panel.hbs), the places, the tour and
// the region centres (src/js/data/places.js), the postal table and the town lookup (src/js/data/area.js).
import { onEnterOnce, prefersReducedMotion } from '../../src/js/motion.js';
import { PLACE_AT, TOUR, regionLabel } from '../../src/js/data/places.js';
import { lookupArea } from '../../src/js/data/area.js';
import { TIMING } from './camera.js';

export function createSection(el, adapter, { speed = () => 0.6, orbitOn = () => true, matchMode = () => 'area' } = {}) {
  const panel = el.querySelector('.gta__panel');
  const slot = el.querySelector('.gta__slot');
  const placeText = el.querySelector('.gta__place');
  const form = el.querySelector('.gta__check');
  const input = form.querySelector('input');
  const result = form.querySelector('.gta__result');
  const reduced = prefersReducedMotion();
  const { camera } = adapter;

  // ---------- the sentence ----------
  function write(text) {
    placeText.classList.remove('is-typing');
    void placeText.offsetWidth;
    placeText.textContent = text;
    placeText.classList.add('is-typing');
  }
  function say(html) {
    result.classList.remove('is-in');
    void result.offsetWidth;
    result.innerHTML = html;
    result.classList.add('is-in');
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // ---------- state ----------
  let touring = false;
  let k = 0;
  let hovered = false; // over the panel (the map itself never pauses the tour: it fills the screen)
  let focused = false;
  let visible = false;
  let started = false;
  let running = 0; // bumps when a match or replay takes over, so an older tour or match step bails
  let chain = 0; // the one live tour chain; resuming while a stop is still playing never starts a second

  // ---------- the idle tour: one continuous motion, once through, then rest on the whole GTA ----------
  // The view turns slowly the whole way (camera.spin) and each leg is laid over that turn (camera.leg), so a stop
  // flows into the next flight and the flight into the next stop: nothing ever halts and restarts. The turn eases
  // to a stop when the tour pauses (the panel hovered or focused, the section scrolled away).
  async function step() {
    const mine = running;
    const me = ++chain;
    if (!touring || hovered || focused || !visible) { camera.spin(false); return; }
    if (k >= TOUR.length) {
      touring = false;
      write('the GTA');
      adapter.unpin();
      await camera.pullBack();
      return;
    }
    const name = TOUR[k++];
    write(name);
    adapter.unpin();
    camera.spin(orbitOn());
    const ok = await camera.leg(PLACE_AT[name], { zoom: adapter.zoomFor(name, 'tour'), minZoom: adapter.tourFloor ?? 11.6 });
    if (!ok || mine !== running || !touring) return;
    // the next stop loads while this one is on screen; the camera only leaves once it's in
    const next = TOUR[k] ? adapter.warm?.(PLACE_AT[TOUR[k]]) : null;
    await adapter.drawn(2500);
    if (mine !== running || !touring) return;
    adapter.pin(name, PLACE_AT[name]);
    await new Promise((r) => setTimeout(r, TIMING.tourStop / speed())); // the stop: the turn carries on
    // not loaded yet (a slow machine, a cold cache): stay a little longer rather than arrive half-drawn (6s at most)
    if (next) await Promise.race([next, new Promise((r) => setTimeout(r, 6000))]);
    if (mine === running && me === chain) step();
  }
  function resume() {
    if (touring && !hovered && !focused && visible && !camera.busy) step();
  }

  async function start() {
    if (started) return;
    started = true;
    const mine = ++running;
    camera.toIntroStart();
    await adapter.drawn(3000); // the first view is drawn before it moves (no half-loaded opening frames)
    if (mine !== running) return;
    let first = Promise.resolve();
    if (!reduced) { adapter.warm?.(PLACE_AT[TOUR[1]]); first = adapter.warm?.(PLACE_AT[TOUR[0]]) ?? first; } // the first stops load during the intro
    await camera.intro();
    if (mine !== running) return;
    if (reduced) return; // no tour under reduced motion: it rests on the whole GTA
    // a short rest on the whole GTA, longer if the first stop isn't loaded yet (6s at most)
    await Promise.all([wait(TIMING.introLead), Promise.race([first, new Promise((r) => setTimeout(r, 6000))])]);
    if (mine !== running) return;
    touring = true;
    k = 0;
    step();
  }

  function reset() {
    running++;
    touring = false;
    started = false;
    camera.stop();
    slot.classList.remove('is-lit');
    slot.classList.add('is-idle');
    write('the GTA');
    adapter.highlight(null);
    adapter.unpin();
    result.textContent = '';
  }

  panel.addEventListener('pointerenter', () => { hovered = true; });
  panel.addEventListener('pointerleave', () => { hovered = false; resume(); });
  form.addEventListener('focusin', () => { focused = true; });
  form.addEventListener('focusout', (e) => { if (!form.contains(e.relatedTarget)) { focused = false; resume(); } });
  new IntersectionObserver(([e]) => {
    const was = visible;
    visible = e.isIntersecting;
    if (visible && !was && started) resume();
  }, { threshold: 0.4 }).observe(el);

  // The panel writes in (the live section's entrance), then the map's intro plays. The dev panel's
  // "Replay section" runs it again from the top.
  if (!reduced) el.classList.add('is-armed');
  onEnterOnce(el, () => {
    if (started) reset();
    if (!reduced) {
      el.classList.remove('is-go');
      void el.offsetWidth;
      el.classList.add('is-go');
    }
    visible = true;
    start();
  }, { start: 'top 60%' });

  // ---------- "Do we cover you?" ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = lookupArea(input.value);
    if (a.empty) { say('Type a postal code, like <b>M6K 1A1</b>, or the name of your town.'); return; }
    if (a.unknown) { say(`We couldn’t place <b>${esc(a.query)}</b>. Try a postal code, like <b>M6K 1A1</b>, or the name of your town.`); return; }

    const mine = ++running;
    touring = false;
    camera.stop();
    slot.classList.remove('is-idle', 'is-lit');
    adapter.highlight(null);
    adapter.unpin();

    if (!a.ok) {
      say(`<b>Not yet.</b> ${esc(a.label)} is outside our five areas. Ask anyway, and we will tell you straight.`);
      write('your area, soon');
      try { sessionStorage.removeItem('onaway:where'); } catch {}
      await camera.pullBack();
      return;
    }

    const area = regionLabel(a.region);
    if (a.regionOnly) say(`<b>Yes.</b> We cover all of ${area}${a.fsa ? ` (${a.fsa})` : ''}. Same crew, same promises.`);
    else if (a.kind === 'postcode') say(`<b>Yes.</b> ${a.fsa} is ${a.label !== 'Toronto' ? `${a.label}, ` : ''}${a.region === 'Toronto' ? 'in the City of Toronto' : area}. Same crew, same promises.`);
    else say(`<b>Yes.</b> ${esc(a.label)} is in ${a.region === 'Toronto' ? 'the City of Toronto' : area}. Same crew, same promises.`);
    write(a.label);

    // Hand-off: the quote section (06) pre-fills "where" from this
    const where = { fsa: a.fsa ?? null, region: a.region, place: a.label };
    try { sessionStorage.setItem('onaway:where', JSON.stringify(where)); } catch {}
    document.dispatchEvent(new CustomEvent('gta:place', { detail: where }));

    // One thing at a time: frame the area, light it, write the place in, then move to the place. 'area' (the
    // pick): a calm pan towards it that stays at area level, the area still lit around it, then a slow drift.
    // 'close': down among its buildings and a slow circle, like the tour. A whole region (a region name, or a
    // postal code that only knows its region) stays on the area.
    const at = PLACE_AT[a.place];
    const close = matchMode() === 'close';
    if (!a.regionOnly && close) adapter.warm?.(at); // loads while the camera frames the area
    const framed = await camera.region(adapter.outline(a.region), { duration: TIMING.matchRegion });
    if (!framed || mine !== running) return;
    adapter.highlight(a.region);
    await wait(500);
    if (mine !== running) return;
    slot.classList.add('is-lit');
    if (a.regionOnly) return;
    await wait(TIMING.matchHold);
    if (mine !== running) return;
    if (!close) {
      const panned = await camera.focus(at, { zoom: Math.min(11.4, adapter.areaZoom() + TIMING.focusZoom), duration: TIMING.focus });
      if (!panned || mine !== running) return;
      adapter.pin(a.label, at);
      await wait(300);
      if (mine !== running) return;
      camera.orbit(TIMING.focusDrift, TIMING.focusDriftMs);
      return;
    }
    const ok = await camera.fly(at, { zoom: adapter.zoomFor(a.place, 'match'), duration: TIMING.matchFly, minZoom: 9.5 });
    if (!ok || mine !== running) return;
    await adapter.drawn(2500);
    if (mine !== running) return;
    adapter.pin(a.label, at);
    await wait(300);
    if (mine !== running) return;
    camera.orbit(TIMING.matchOrbit, TIMING.matchOrbitMs);
  });

  return { reset, replay: () => { reset(); visible = true; start(); }, get state() { return { touring, hovered, focused, visible, started }; } };
}
