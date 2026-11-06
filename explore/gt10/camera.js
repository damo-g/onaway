// GT-10 shared · the camera language (docs/gt10-3d-map-context.md §3). Engine-neutral: it uses only the calls
// MapLibre GL and Mapbox GL share (flyTo, easeTo, jumpTo, cameraForBounds, stop, moveend), so option B reuses it.
// Rules: one move at a time (every move cancels the one before), never orbit and fly together, no bounce.
// Under reduced motion every move jumps straight to its end state.

const EASE = {
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  linear: (t) => t,
};

// Zoom per place: close, but just under 14. Above 14 the map switches to full-detail z14 tiles, about four times
// as many and far heavier, and at 60° they take over a second to draw after arrival (the empty 'skipped' frames).
// Under 14 it draws z13 tiles, which still carry every building; the lifted heights keep them standing.
const CLOSE = { Downtown: 13.95, 'North York': 13.95, Mississauga: 13.95 };
export const zoomFor = (name, kind = 'match') => (CLOSE[name] ?? 13.9) - (kind === 'tour' ? 0.1 : 0);

export function createCamera(map, initial = {}) {
  const s = { pitch: 60, speed: 0.6, orbit: true, reduced: false, padding: { top: 0, right: 0, bottom: 0, left: 0 }, ...initial };
  let token = 0;

  // Runs one camera call and resolves when it settles: true if it finished, false if a newer move replaced it
  function move(call) {
    const mine = ++token;
    // stop the running move first: its moveend must not be mistaken for this one's
    map.stop();
    return new Promise((resolve) => {
      map.once('moveend', () => resolve(mine === token));
      call();
    });
  }
  const dur = (ms) => ms / s.speed;

  // The whole GTA, north up, at the chosen pitch
  // (set directly, not fitted: fitting the bounds ignores the tilt and lands far too wide; scaled to the map's width)
  function gtaView(extra = {}) {
    const w = map.getContainer().clientWidth - (s.padding.left || 0) - (s.padding.right || 0);
    const zoom = 9.15 + Math.log2(Math.max(320, w) / 1100);
    return { center: [-79.42, 43.79], zoom, pitch: Math.min(s.pitch, 55), bearing: 0, padding: s.padding, ...extra };
  }

  return {
    settings: s,
    set(next) { Object.assign(s, next); },
    // Interrupt whatever is running (a newer move, or the visitor's own action)
    stop() { token++; map.stop(); },

    // Intro: from high over Lake Ontario, descend and tilt into the GTA (2.5s, ease-out)
    intro() {
      const end = gtaView({ bearing: -12 });
      if (s.reduced) return move(() => map.jumpTo(end));
      map.jumpTo({ center: [-79.3, 43.18], zoom: 7.3, pitch: 0, bearing: -28, padding: s.padding });
      return move(() => map.easeTo({ ...end, duration: dur(2500), easing: EASE.out, essential: true }));
    },

    // Fly-to: a curved path (out, across, in), 1.6–2.2s, ease-in-out. minZoom caps how far out the arc rises:
    // tour hops stay at z13+, where the tiles carry buildings, so the city stays in view the whole way
    fly(center, { zoom = 14, duration = 1900, minZoom = 10.2 } = {}) {
      const end = { center, zoom, pitch: s.pitch, bearing: map.getBearing(), padding: s.padding };
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.flyTo({ ...end, curve: 1.4, minZoom, duration: dur(duration), easing: EASE.inOut, essential: true }));
    },

    // Region: frame a whole area (west, south, east, north), north up, so its outline can be drawn
    region(bounds, { duration = 1800 } = {}) {
      const fit = map.cameraForBounds(bounds, { padding: s.padding, bearing: 0 }) || {};
      const end = { center: fit.center, zoom: (fit.zoom ?? 10) - 0.2, pitch: Math.min(s.pitch, 50), bearing: 0, padding: s.padding };
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.flyTo({ ...end, curve: 1.4, minZoom: 9.2, duration: dur(duration), easing: EASE.inOut, essential: true }));
    },

    // Orbit: slowly circle the place so the buildings show their depth (linear, so it never lurches)
    orbit(degrees, duration) {
      if (s.reduced || !s.orbit) return Promise.resolve(true);
      return move(() => map.easeTo({ bearing: map.getBearing() + degrees, duration: dur(duration), easing: EASE.linear, essential: true }));
    },

    // Pull-back: rise to the whole GTA, north up (1.6s)
    pullBack() {
      const end = gtaView();
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.easeTo({ ...end, duration: dur(1600), easing: EASE.inOut, essential: true }));
    },

    gtaView,
  };
}

// Tour and match timings (§3), in one place for every option
export const TIMING = { tourStop: 3400, tourFly: 1600, tourOrbit: 8, matchRegion: 1800, matchHold: 1200, matchFly: 2000, matchOrbit: 90, matchOrbitMs: 6000, pullBack: 1600 };
