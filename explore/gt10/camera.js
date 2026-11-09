// GT-10 shared · the camera language (docs/gt10-3d-map-context.md §3). Engine-neutral: it uses only the calls
// MapLibre GL and Mapbox GL share (flyTo, easeTo, jumpTo, project, unproject, stop, moveend), so option B reuses it.
// Rules: one move at a time (every move cancels the one before), never orbit and fly together, no bounce.
// Under reduced motion every move jumps straight to its end state. Engine-specific tuning (how close each place
// sits) comes in from the page as `zoomFor`.

const EASE = {
  out: (t) => 1 - (1 - t) ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  linear: (t) => t,
  // smootherstep: speed and acceleration both start and end at zero (no jolt at take-off or landing)
  smooth: (t) => t * t * t * (t * (t * 6 - 15) + 10),
};

// ---------- the flight path ----------
// The optimal "zoom out, across, zoom in" path (van Wijk & Nuij), the same maths MapLibre's and Mapbox's flyTo use,
// computed here so the tour can drive the camera itself: one continuous motion where the view keeps turning
// through the flight instead of stopping, turning, stopping. Returns a function of progress (0–1) → centre and
// zoom, and the path's length S (for a constant on-screen speed). minZoom caps how high the arc rises.
const merc = ([lng, lat]) => [(lng + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2];
const unmerc = ([x, y]) => [x * 360 - 180, (360 / Math.PI) * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - 90];
export function flightPath(from, z0, to, z1, { minZoom = null, width = 1200, curve = 1.42 } = {}) {
  const scale = 512 * 2 ** z0;
  const p0 = merc(from).map((v) => v * scale);
  const p1 = merc(to).map((v) => v * scale);
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const u1 = Math.hypot(dx, dy);
  const w0 = width;
  const w1 = w0 / 2 ** (z1 - z0);
  const at = (k, zoom) => ({ center: unmerc([(p0[0] + dx * k) / scale, (p0[1] + dy * k) / scale]), zoom });
  if (u1 < 1) return { S: Math.abs(z1 - z0) * 0.7, at: (t) => at(t, z0 + (z1 - z0) * t) };
  let rho = curve;
  if (minZoom != null) rho = Math.sqrt(((w0 / 2 ** (Math.min(minZoom, z0, z1) - z0)) / u1) * 2);
  const rho2 = rho * rho;
  const r = (i) => { const b = (w1 * w1 - w0 * w0 + (i ? -1 : 1) * rho2 * rho2 * u1 * u1) / (2 * (i ? w1 : w0) * rho2 * u1); return Math.log(Math.sqrt(b * b + 1) - b); };
  const r0 = r(0);
  const S = (r(1) - r0) / rho;
  const w = (x) => Math.cosh(r0) / Math.cosh(r0 + rho * x);
  const u = (x) => (w0 * ((Math.cosh(r0) * Math.tanh(r0 + rho * x) - Math.sinh(r0)) / rho2)) / u1;
  return { S, at: (t) => (t >= 1 ? { center: to, zoom: z1 } : at(u(t * S), z0 + Math.log2(1 / w(t * S)))) };
}

// Tour and match timings (§3), in one place for every option. Durations are divided by the speed option.
export const TIMING = { tourStop: 3400, tourOrbit: 8, matchRegion: 1800, matchHold: 900, matchFly: 2000, matchOrbit: 90, matchOrbitMs: 6000, focus: 2600, focusZoom: 1.7, focusDrift: 20, focusDriftMs: 9000, pullBack: 1600, introLead: 1200 };

// The intro's first view: high over Lake Ontario, south of the city, turned a little
export const INTRO_FROM = { center: [-79.3, 43.18], zoom: 7.6, pitch: 0, bearing: -28 };

export function createCamera(map, initial = {}) {
  const s = { pitch: 60, speed: 0.6, orbit: true, reduced: false, pitchDip: 15, drift: 0, padding: { top: 0, right: 0, bottom: 0, left: 0 }, ...initial };
  let token = 0;
  let busy = false;

  // ---------- the tour's continuous camera ----------
  // A per-frame driver for the tour: a slow turn that never stops (it eases down when the tour pauses and back up
  // when it resumes) with flights laid over it. Position and zoom follow the flight path with smootherstep easing;
  // the bearing keeps its own steady turn throughout, so arrivals and departures flow into each other.
  // How the driver applies each frame. The default (jumpTo) works in any engine but treats every frame as a
  // finished move (start, move and end events, the map believing it's at rest), which costs frames; an engine page
  // can pass a lighter path that updates the camera the way the engine's own animations do (initial.apply).
  const apply = initial.apply ?? { start() {}, frame: (cam) => map.jumpTo(cam), end() {} };
  const drive = { raf: 0, last: 0, avg: 0, spin: 0, target: 0, drift: 0, driftTarget: 0, leg: null, active: false };
  // move a lng/lat by metres along a bearing
  const advance = ([lng, lat], m, bearing) => { const r = (bearing * Math.PI) / 180; return [lng + (m * Math.sin(r)) / (111320 * Math.cos((lat * Math.PI) / 180)), lat + (m * Math.cos(r)) / 111320]; };
  function frame(now) {
    // the animation's own clock: it advances by the frame's time, but a frame much slower than the recent ones (a
    // tile going to the GPU) only counts as a little more than usual, so a spike becomes a moment's slow-down instead
    // of a visible jump. A steadily slow machine keeps its normal pace (the cap follows the recent average).
    const raw = Math.min(200, now - (drive.last || now));
    if (raw > 0) drive.avg = drive.avg ? drive.avg * 0.92 + raw * 0.08 : raw;
    const dt = Math.min(raw, Math.max(20, (drive.avg || 16.7) * 1.5));
    drive.last = now;
    drive.spin += (drive.target - drive.spin) * Math.min(1, dt / 900); // the turn eases in and out over ~1s
    drive.drift += (drive.driftTarget - drive.drift) * Math.min(1, dt / 900); // and so does the glide (m/s)
    const cam = { bearing: map.getBearing() + drive.spin * dt, padding: s.padding };
    const leg = drive.leg;
    if (leg) {
      leg.elapsed += dt;
      const t = Math.min(1, leg.elapsed / leg.duration);
      const e = EASE.smooth(t);
      // the camera eases a little more upright at the top of the arc and settles back as it lands (less horizon
      // to draw mid-flight, and a gentler, more cinematic arrival)
      Object.assign(cam, leg.path.at(e), { pitch: leg.pitch0 + (s.pitch - leg.pitch0) * e - leg.dip * Math.sin(Math.PI * e) });
      // the glide carries on into the flight and fades out by the landing (no jolt at take-off, lands on the place)
      if (drive.drift > 0.01 || leg.off) {
        leg.off ??= [0, 0];
        const [lng2, lat2] = advance([0, cam.center[1]], (drive.drift * dt) / 1000, cam.bearing); // (from lng 0: lng2 is the change)
        leg.off[0] += lng2; leg.off[1] += lat2 - cam.center[1];
        cam.center = [cam.center[0] + leg.off[0] * (1 - e), cam.center[1] + leg.off[1] * (1 - e)];
      }
      if (t >= 1) { drive.leg = null; busy = false; leg.done(true); }
    }
    if (!leg && drive.drift > 0.01) cam.center = advance(map.getCenter().toArray(), (drive.drift * dt) / 1000, cam.bearing);
    apply.frame(cam);
    if (drive.leg || Math.abs(drive.spin) > 1e-5 || drive.target || drive.drift > 0.01 || drive.driftTarget) drive.raf = requestAnimationFrame(frame);
    else { drive.raf = 0; drive.last = 0; drive.active = false; apply.end(); }
  }
  const run = () => {
    if (drive.raf) return;
    if (!drive.active) { drive.active = true; apply.start(); }
    drive.last = 0;
    drive.raf = requestAnimationFrame(frame);
  };
  function halt() {
    cancelAnimationFrame(drive.raf);
    drive.raf = 0;
    drive.last = 0;
    drive.spin = 0;
    drive.target = 0;
    drive.drift = 0;
    drive.driftTarget = 0;
    if (drive.active) { drive.active = false; apply.end(); }
    if (drive.leg) { const l = drive.leg; drive.leg = null; l.done(false); }
  }

  // Runs one camera call and resolves when it settles: true if it finished, false if a newer move replaced it
  function move(call) {
    halt(); // a scripted move takes over from the tour's driver
    const mine = ++token;
    // stop the running move first: its moveend must not be mistaken for this one's
    map.stop();
    busy = true;
    return new Promise((resolve) => {
      map.once('moveend', () => {
        if (mine === token) busy = false;
        resolve(mine === token);
      });
      call();
    });
  }
  const dur = (ms) => ms / s.speed;

  // The whole GTA, north up, at the chosen pitch (capped at 55 so the far regions stay in view), scaled to the
  // open part of the map
  function gtaView(extra = {}) {
    const w = map.getContainer().clientWidth - (s.padding.left || 0) - (s.padding.right || 0);
    const zoom = 9.15 + Math.log2(Math.max(320, w) / 1100);
    return { center: [-79.42, 43.79], zoom, pitch: Math.min(s.pitch, 55), bearing: 0, padding: s.padding, ...extra };
  }

  // Frame a shape (its outline points) at a pitch: fitting a bounding box ignores the tilt, so the near edge lands
  // too close and the area sits off to one side. This tries the view, measures where the points land on screen,
  // and corrects zoom and centre a few times, all inside one frame (nothing is drawn in between), then puts the
  // camera back where it was.
  function fit(points, { pitch, bearing = 0, margin = 0.9 } = {}) {
    const saved = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing(), padding: map.getPadding() };
    const el = map.getContainer();
    const p = s.padding;
    const availW = el.clientWidth - p.left - p.right;
    const availH = el.clientHeight - p.top - p.bottom;
    const xs = points.map((q) => q[0]);
    const ys = points.map((q) => q[1]);
    let center = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    let zoom = 9;
    for (let i = 0; i < 7; i++) {
      map.jumpTo({ center, zoom, pitch, bearing, padding: p });
      const px = points.map((q) => map.project(q));
      const l = Math.min(...px.map((q) => q.x));
      const r = Math.max(...px.map((q) => q.x));
      const t = Math.min(...px.map((q) => q.y));
      const b = Math.max(...px.map((q) => q.y));
      center = map.unproject([(l + r) / 2, (t + b) / 2]).toArray();
      zoom += Math.log2(Math.min((availW * margin) / (r - l), (availH * margin) / (b - t)));
      zoom = Math.max(6, Math.min(13, zoom));
    }
    map.jumpTo(saved);
    return { center, zoom, pitch, bearing, padding: p };
  }

  return {
    settings: s,
    get busy() { return busy; },
    set(next) { Object.assign(s, next); },
    // Interrupt whatever is running (a newer move, or the visitor's own action)
    stop() { token++; busy = false; halt(); map.stop(); },

    // The tour's turn: on (degrees per stop over the stop's time, as §3's orbit) or easing to a halt
    spin(on) {
      if (s.reduced) return;
      drive.target = on && s.orbit ? (TIMING.tourOrbit / TIMING.tourStop) * s.speed : 0;
      drive.driftTarget = on ? s.drift * s.speed : 0; // the glide, if the page sets one (metres a second)
      if (drive.target || drive.spin || drive.driftTarget || drive.drift) run();
    },

    // One tour leg along the flight path, carried by the driver (the turn continues through it). Its duration
    // follows the path's length, so every leg moves at the same calm speed on screen.
    leg(center, { zoom = 13.9, minZoom = 11.6 } = {}) {
      if (s.reduced) return move(() => map.jumpTo({ center, zoom, pitch: s.pitch, padding: s.padding }));
      map.stop();
      ++token;
      if (drive.leg) { const l = drive.leg; drive.leg = null; l.done(false); }
      const path = flightPath(map.getCenter().toArray(), map.getZoom(), center, zoom, { minZoom, width: Math.max(map.getContainer().clientWidth, map.getContainer().clientHeight) });
      const duration = Math.max(1700, Math.min(3600, path.S * 620)) / s.speed;
      busy = true;
      return new Promise((done) => {
        drive.leg = { path, duration, elapsed: 0, pitch0: map.getPitch(), dip: s.pitchDip, done };
        run();
      });
    },

    // Put the camera at the intro's first view, ready to play (and so its tiles can load first)
    toIntroStart() { map.jumpTo({ ...INTRO_FROM, padding: s.padding }); },

    // Intro: from high over Lake Ontario, descend and tilt into the GTA (2.5s, ease-out)
    intro() {
      const end = gtaView({ bearing: -12 });
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.easeTo({ ...end, duration: dur(2500), easing: EASE.out, essential: true }));
    },

    // Fly-to: a curved path (out, across, in), 1.6–2.2s, ease-in-out. minZoom caps how far out the arc rises.
    fly(center, { zoom = 14, duration = 1900, minZoom = 10.2 } = {}) {
      const end = { center, zoom, pitch: s.pitch, bearing: map.getBearing(), padding: s.padding };
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.flyTo({ ...end, curve: 1.4, minZoom, duration: dur(duration), easing: EASE.inOut, essential: true }));
    },

    // Region: frame a whole area by its outline, north up, at a gentler tilt, so the whole of it reads
    region(points, { duration = 1800 } = {}) {
      const end = fit(points, { pitch: Math.min(s.pitch, 45) });
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.flyTo({ ...end, curve: 1.4, minZoom: Math.min(end.zoom, 9.2), duration: dur(duration), easing: EASE.inOut, essential: true }));
    },

    // Focus: a calm pan from the framed area towards the place, closing in a little but staying at area level
    // (no curve, no dive): the area stays in view and lit around the place
    focus(center, { zoom, duration = 2600 } = {}) {
      const end = { center, zoom, pitch: Math.min(s.pitch, 50), bearing: map.getBearing(), padding: s.padding };
      if (s.reduced) return move(() => map.jumpTo(end));
      return move(() => map.easeTo({ ...end, duration: dur(duration), easing: EASE.inOut, essential: true }));
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
    fit,
  };
}
