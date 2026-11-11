// GT-10 · what sits on top of the map (any engine): the area highlight's fade and the HTML labels and pin.
// Uses only calls MapLibre and Mapbox share (setFeatureState, Marker, getZoom, on).
import { REGION_LABELS } from './region-labels.js';

// The area highlight, drawn by the page's own layers from feature-state `k` (0–1) on the 'regions' and 'masks'
// sources. The chosen area switches at once (no waiting on the map's worker, so the area before can never flash),
// then fades in over 0.7s; clearing fades it out; the area going out finishes leaving before the next comes in.
export function createHighlight(map, regionIds, { reduced = false, sources = ['regions', 'masks'] } = {}) {
  const fade = Object.fromEntries(regionIds.map((r) => [r, 0]));
  let lit = null;
  let fading = false;
  function paint() {
    for (const [region, k] of Object.entries(fade)) for (const source of sources) if (map.getSource(source)) map.setFeatureState({ source, id: region }, { k });
  }
  function set(region) {
    lit = region;
    if (reduced) { for (const r of Object.keys(fade)) fade[r] = r === lit ? 1 : 0; paint(); return; }
    if (fading) return;
    fading = true;
    let last = performance.now();
    const frame = (t) => {
      const d = (t - last) / 700;
      last = t;
      let moving = false;
      for (const r of Object.keys(fade)) {
        const goal = r === lit ? 1 : 0;
        const others = Object.entries(fade).some(([o, k]) => o !== r && o !== lit && k > 0);
        if (goal === 1 && others) { moving = true; continue; }
        if (fade[r] !== goal) { fade[r] = goal > fade[r] ? Math.min(1, fade[r] + d) : Math.max(0, fade[r] - d); moving = true; }
      }
      paint();
      if (moving) requestAnimationFrame(frame);
      else fading = false;
    };
    requestAnimationFrame(frame);
  }
  return { set, paint };
}

// Region names on the wide views (Overpass Mono, HTML) and the pin: a mono label on a stem, dropped onto a yellow
// stop. Marker is the engine's Marker class.
export function createLabels(map, Marker) {
  const regionMarkers = [];
  for (const r of Object.values(REGION_LABELS)) {
    // (the label sits inside the marker: the engine writes its own inline styles on the marker element)
    const m = document.createElement('div');
    m.innerHTML = `<div class="gta-region label">${r.text}</div>`;
    regionMarkers.push(new Marker({ element: m }).setLngLat(r.at).addTo(map));
  }
  let regionsOn = true;
  // The matched area's name (a match lights an area): one step up the type scale from the place names under it,
  // so the area reads above its towns. Fades as the camera goes down into the city.
  const z = document.createElement('div');
  z.innerHTML = '<div class="gta-zone" aria-hidden="true"></div>';
  const zoneMarker = new Marker({ element: z }).setLngLat([-79.38, 43.65]).addTo(map);
  const zoneEl = () => zoneMarker.getElement().firstChild;
  let zoned = null;
  const show = () => {
    const zoom = map.getZoom();
    regionMarkers.forEach((m, i) => m.getElement().firstChild.classList.toggle('is-on', regionsOn && zoom < 10.6 && Object.keys(REGION_LABELS)[i] !== zoned));
    zoneEl().classList.toggle('is-on', !!zoned && zoom < 12.2);
  };
  map.on('zoom', show);
  show();
  const p = document.createElement('div');
  p.innerHTML = '<div class="gta-pin"><span class="gta-pin__chip"><i></i><span class="label"></span></span><b class="gta-pin__stem"></b></div>';
  const placeMarker = new Marker({ element: p, anchor: 'bottom' }).setLngLat([-79.38, 43.65]).addTo(map);
  const placeEl = () => placeMarker.getElement().firstChild;
  return {
    pin(label, at, { sign = false } = {}) { placeMarker.setLngLat(at); placeEl().querySelector('.label').textContent = label; placeEl().classList.toggle('gta-pin--sign', sign); placeEl().classList.add('is-on'); },
    unpin() { placeEl().classList.remove('is-on'); },
    regions(on) { regionsOn = on; show(); },
    // zone(region, style): show the area's name large ('mono' Overpass Mono, 'sans' Instrument Sans), or clear it
    zone(region, style = 'mono') {
      const r = REGION_LABELS[region];
      zoned = r && style !== 'off' ? region : null;
      if (zoned) { zoneMarker.setLngLat(r.at); zoneEl().textContent = r.text; zoneEl().dataset.style = style; }
      show();
    },
  };
}

// Room the camera keeps clear for the panel (and the navbar, when it lies over the map), so places land in the
// open part of the map. navOverlap false: the section sits below the navbar (the live section).
export function panelPadding(el, panel, layout, { navOverlap = true } = {}) {
  const nav = navOverlap ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 89 : 0;
  const box = el.getBoundingClientRect();
  const p = panel.getBoundingClientRect();
  const right = p.right - box.left;
  // tablet and phone: the card runs across the foot, so the map frames the room above it
  if (right > box.width * 0.6) {
    const e = box.width < 768 ? 21 : 34;
    return { top: nav + e, right: e, bottom: Math.max(0, Math.round(box.bottom - p.top)) + e, left: e };
  }
  return { top: nav + 34, right: 55, bottom: 55, left: Math.round(layout === 'card' ? right + 55 : right * 0.82) };
}
