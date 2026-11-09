// GT-10 option B · Mapbox Standard, configured to the brand. Standard can't be restyled layer by layer like option A;
// it takes a handful of colours (land, water, green space, roads, buildings, labels…), a light preset, and a colour
// grade: a lookup table (LUT) applied to everything it draws, its 3D trees and landmarks included. So each palette
// is a set of colours mixed from the five brand tokens plus, where it needs one, a grade made from them.
import { T, mix, rgb } from '../colors.js';

// Standard's own colour defaults (from its schema), so a palette never inherits the last one's colours
export const DEFAULTS = {
  colorLand: 'hsl(20, 20%, 95%)', colorWater: 'hsl(200, 100%, 80%)', colorGreenspace: 'hsl(115, 60%, 84%)',
  colorCommercial: 'hsla(24, 100%, 94%, 1)', colorIndustrial: 'hsl(230, 15%, 92%)', colorEducation: 'hsl(40, 50%, 88%)', colorMedical: 'hsl(0, 50%, 92%)',
  colorBuildings: 'hsl(40, 43%, 93%)', colorMotorways: 'hsl(214, 23%, 70%)', colorTrunks: 'hsl(235, 20%, 70%)', colorRoads: 'hsl(224, 25%, 80%)',
  colorPlaceLabels: 'hsl(0, 0%, 0%)', colorRoadLabels: 'hsl(0, 0%, 25%)', colorPointOfInterestLabels: 'hsl(203, 7%, 55%)', roadsBrightness: 0.4,
};

// ---------- colour grades (LUTs) ----------
const hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const fromHsl = ([h, s, l]) => {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
};
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const hueWeight = (h, centre, width) => { const d = Math.abs(((h - centre + 540) % 360) - 180); return Math.max(0, 1 - d / width); };
const P = Object.fromEntries(Object.entries(T).map(([k, v]) => [k, rgb(v)]));

export const GRADES = {
  // Gentle: greens fall to camel, blues to grey, a little paper in everything (for the brand palettes, so the
  // green trees and blue glass of the 3D city don't break them)
  gentle: (c) => {
    let [h, s, l] = hsl(c);
    const green = hueWeight(h, 110, 60);
    const blue = hueWeight(h, 210, 50);
    h = h + (35 - h) * green * 0.85;
    s *= Math.max(0, 1 - green * 0.45 - blue * 0.85);
    return lerp(fromHsl([h, s, l]), P.paper, 0.06);
  },
  // Autumn, after OV-01: greens turn amber, ochre and rust (by brightness), blues go slate grey, everything
  // softens towards an overcast paper sky
  autumn: (c) => {
    let [h, s, l] = hsl(c);
    const green = hueWeight(h, 105, 65);
    const blue = hueWeight(h, 210, 55);
    const target = l < 0.35 ? 12 : l < 0.55 ? 28 : 42; // dark leaves rust, mid ochre, light amber
    h = h + (target - h) * green * 0.9;
    s = s * (1 - blue * 0.7) * (1 - 0.15) + green * 0.12;
    l = l * 0.92 + 0.05;
    return lerp(fromHsl([h, Math.min(1, s), l]), P.paper, 0.05);
  },
  // Brand: every colour re-drawn in the brand's own range, by brightness from carbon through camel to paper; warm
  // reds keep a rust accent and yellows a yellow one
  brand: (c) => {
    const [h, s] = hsl(c);
    const L = lum(c);
    const ramp = L < 0.55 ? lerp(P.carbon, P.camel, L / 0.55) : lerp(P.camel, P.paper, (L - 0.55) / 0.45);
    const red = hueWeight(h, 8, 30) * s;
    const yel = hueWeight(h, 48, 18) * s;
    return lerp(lerp(lerp(ramp, P.rust, red * 0.5), P.yellow, yel * 0.6), c, 0.12);
  },
  // Brand, richer (round 2): the brand ramp with some of each colour's own hue kept (parks a sage camel, water a
  // slate paper) and a gentle S-curve, so the city has more depth and the land and buildings separate
  brandRich: (c) => {
    const out = lerp(GRADES.brand(c), GRADES.gentle(c), 0.3);
    return out.map((v) => Math.max(0, Math.min(255, 128 + (v - 128) * 1.1))); // a touch more contrast
  },
  // Night: blues and greens to carbon greys, warm lights kept
  night: (c) => {
    let [h, s, l] = hsl(c);
    const cool = hueWeight(h, 170, 90);
    s *= 1 - cool * 0.7;
    return lerp(fromHsl([h, s, l]), P.carbon, 0.05);
  },
};

// A LUT image as Mapbox reads it: N rows (green) of N×N columns (blue slices of N reds), as a base64 PNG
export function lutData(grade, N = 32) {
  const c = document.createElement('canvas');
  c.width = N * N;
  c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N * N, N);
  for (let gi = 0; gi < N; gi++) for (let bi = 0; bi < N; bi++) for (let ri = 0; ri < N; ri++) {
    const out = grade([(ri / (N - 1)) * 255, (gi / (N - 1)) * 255, (bi / (N - 1)) * 255]);
    const i = (gi * N * N + bi * N + ri) * 4;
    img.data[i] = out[0]; img.data[i + 1] = out[1]; img.data[i + 2] = out[2]; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL('image/png').split(',')[1];
}

// ---------- palettes ----------
// colors: Standard colour config · grade: a LUT from GRADES · theme: one of Standard's own (no grade) ·
// light: the light preset that suits it (used when the light option is 'palette') · fog: haze for the horizon ·
// ground: the paper/land tone a texture is mixed for · dark: the section turns dark with it
export const PALETTES = {
  // Overcast, after OV-01 (the hero's painted Toronto): grey-green ground, slate water, autumn trees, a soft haze
  overcast: {
    label: 'Overcast', grade: 'autumn', light: 'day', fog: { color: mix('paper', 'carbon', 0.12), 'high-color': mix('paper', 'carbon', 0.08), 'horizon-blend': 0.18, range: [0.8, 9], 'space-color': mix('paper', 'carbon', 0.1), 'star-intensity': 0 },
    colors: {
      colorLand: mix(mix('paper', 'carbon', 0.14), 'camel', 0.08), colorWater: mix(mix('carbon', 'paper', 0.52), 'camel', 0.06), colorGreenspace: mix(mix('paper', 'camel', 0.42), 'carbon', 0.14),
      colorCommercial: mix('paper', 'carbon', 0.16), colorIndustrial: mix('paper', 'carbon', 0.2), colorEducation: mix(mix('paper', 'camel', 0.3), 'rust', 0.08), colorMedical: mix('paper', 'camel', 0.25),
      colorBuildings: mix('paper', 'carbon', 0.1), colorMotorways: mix('paper', 'carbon', 0.42), colorTrunks: mix('paper', 'carbon', 0.32), colorRoads: mix('paper', 'carbon', 0.2),
      colorPlaceLabels: T.carbon, colorRoadLabels: mix('carbon', 'paper', 0.3), colorPointOfInterestLabels: mix('carbon', 'camel', 0.4), roadsBrightness: 0.3,
    },
  },
  // Carbon night: carbon land, paper lines, camel water edges, the city lit (night light suits it)
  carbon: {
    label: 'Carbon night', grade: 'night', light: 'night', dark: true,
    colors: {
      colorLand: mix('carbon', 'paper', 0.07), colorWater: T.carbon, colorGreenspace: mix('carbon', 'camel', 0.18),
      colorCommercial: mix('carbon', 'paper', 0.11), colorIndustrial: mix('carbon', 'paper', 0.1), colorEducation: mix('carbon', 'camel', 0.14), colorMedical: mix('carbon', 'camel', 0.14),
      colorBuildings: mix('carbon', 'camel', 0.4), colorMotorways: mix('paper', 'camel', 0.25), colorTrunks: mix('carbon', 'paper', 0.5), colorRoads: mix('carbon', 'paper', 0.3),
      colorPlaceLabels: T.paper, colorRoadLabels: mix('paper', 'carbon', 0.3), colorPointOfInterestLabels: T.camel, roadsBrightness: 0.6,
    },
  },
  // Brand LUT: Standard's own colours, all re-drawn through a grade made from the five brand colours
  brandlut: { label: 'Brand LUT', grade: 'brand', light: 'day', colors: {} },
  // Brand LUT, richer (proposed, round 2): the brand grade keeping some of each colour's own hue, with the land
  // lifted towards paper and the parks and water given a tone of their own, for more depth
  brandrich: {
    label: 'Brand LUT, richer', grade: 'brandRich', light: 'day',
    colors: { colorLand: mix('paper', 'camel', 0.08), colorGreenspace: mix(mix('paper', 'camel', 0.35), 'carbon', 0.08), colorWater: mix(mix('paper', 'carbon', 0.3), 'camel', 0.12) },
  },
  // Overcast × Brand (proposed, round 2): Overcast's quiet grey-green ground and slate lake, drawn through the brand
  // grade instead of the autumn one (between the two favourites)
  overbrand: { label: 'Overcast × Brand', grade: 'brand', light: 'day', colors: 'overcast' },
  // Mapbox's built-in themes, for reference
  monochrome: { label: 'Mapbox Monochrome', theme: 'monochrome', light: 'day', colors: {} },
  standard: { label: 'Mapbox default', theme: 'default', light: 'day', colors: {} },
};

PALETTES.overbrand.colors = PALETTES.overcast.colors; // the same colours (imported, not copied)
PALETTES.overbrand.fog = PALETTES.overcast.fog;

// Building colours (dev panel → buildings), mixed from the tokens; each passes through the palette's grade like
// everything else. palette: the palette's own. Dark palettes keep their own whatever the option.
export const BUILDINGS = {
  stone: mix(mix('paper', 'camel', 0.45), 'carbon', 0.1), // warm grey stone, a clear step darker than the land, so every block reads as volume
  sand: mix('paper', 'camel', 0.3),
  brick: mix(mix('paper', 'camel', 0.45), 'rust', 0.22), // a soft terracotta city
  paper: T.paper, // pale blocks on the land: the light does the shaping
};

const lutCache = {};
// The full basemap config for a palette (+ any editor overrides)
export function paletteConfig(name, overrides = {}, buildings = 'palette') {
  const p = PALETTES[name] ?? PALETTES.brandlut;
  const config = { ...DEFAULTS, ...p.colors, ...(BUILDINGS[buildings] && !p.dark ? { colorBuildings: BUILDINGS[buildings] } : {}), ...overrides };
  if (p.grade) {
    lutCache[p.grade] ??= lutData(GRADES[p.grade]);
    config.theme = 'custom';
    config['theme-data'] = lutCache[p.grade];
  } else config.theme = p.theme ?? 'default';
  return config;
}

// ---------- light: live Toronto time ----------
// Sunrise and sunset for Toronto from the date (the standard solar approximation, within a few minutes): dawn and
// dusk are the 45 minutes either side, day between, night outside.
const TORONTO = [-79.38, 43.65];
export function sunTimes(date = new Date()) {
  const rad = Math.PI / 180;
  const day = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5);
  const decl = 23.44 * rad * Math.sin((2 * Math.PI * (284 + day)) / 365);
  const ha = Math.acos(-Math.tan(TORONTO[1] * rad) * Math.tan(decl)) / rad;
  const B = (2 * Math.PI * (day - 81)) / 364;
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const noon = 12 - TORONTO[0] / 15 - eot / 60; // UTC hours
  return { rise: noon - ha / 15, set: noon + ha / 15 };
}
export function liveLight(date = new Date()) {
  const { rise, set } = sunTimes(date);
  const h = date.getUTCHours() + date.getUTCMinutes() / 60;
  const near = (a) => Math.abs(((h - a + 36) % 24) - 12) < 0.75; // within 45 min (distance around the clock)
  if (near(rise)) return 'dawn';
  if (near(set)) return 'dusk';
  return h > rise && h < set ? 'day' : 'night';
}
export const torontoTime = (date = new Date()) => date.toLocaleTimeString('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit' });
