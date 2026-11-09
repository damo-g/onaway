// GT-10 shared · what sits on top of any engine's map: the area highlight's fade and the HTML labels and pin.
// Uses only calls MapLibre and Mapbox share (setFeatureState, Marker, getZoom, on).
import { REGION_LABELS } from './places.js';

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
    m.innerHTML = `<div class="g10-region label">${r.text}</div>`;
    regionMarkers.push(new Marker({ element: m }).setLngLat(r.at).addTo(map));
  }
  let regionsOn = true;
  const show = () => regionMarkers.forEach((m) => m.getElement().firstChild.classList.toggle('is-on', regionsOn && map.getZoom() < 10.6));
  map.on('zoom', show);
  show();
  const p = document.createElement('div');
  p.innerHTML = '<div class="g10-place"><span class="g10-place__chip"><i></i><span class="label"></span></span><b class="g10-place__stem"></b></div>';
  const placeMarker = new Marker({ element: p, anchor: 'bottom' }).setLngLat([-79.38, 43.65]).addTo(map);
  const placeEl = () => placeMarker.getElement().firstChild;
  return {
    pin(label, at, { sign = false } = {}) { placeMarker.setLngLat(at); placeEl().querySelector('.label').textContent = label; placeEl().classList.toggle('g10-place--sign', sign); placeEl().classList.add('is-on'); },
    unpin() { placeEl().classList.remove('is-on'); },
    regions(on) { regionsOn = on; show(); },
  };
}

// Room the camera keeps clear for the navbar and the panel, so places land in the open part of the map
export function panelPadding(el, panel, layout) {
  const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 89;
  const right = panel.getBoundingClientRect().right - el.getBoundingClientRect().left;
  return { top: nav + 34, right: 55, bottom: 55, left: Math.round(layout === 'card' ? right + 55 : right * 0.82) };
}
