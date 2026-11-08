// GT-10 option A · the map style (docs/gt10-3d-map-context.md §5), on OpenMapTiles vector tiles (OpenFreeMap).
// Every colour is mixed from the five brand tokens (paper, carbon, yellow, rust, camel): no other colours.
// Four palettes (dev panel → palette), from a wide tonal range to the round-2 quiet one. Yellow stays the signal:
// the matched area and the pin, nothing else. No POIs or transit; few labels, in Overpass Mono (our own glyphs).
// The area highlight layers live in the style too, so switching palette or highlight is a live style diff.

export const T = { paper: '#F7F2E7', carbon: '#202521', yellow: '#E4BB3F', rust: '#A9503E', camel: '#B49A78' };

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
// t of b into a (as CSS color-mix(in srgb, b t, a))
export const mix = (a, b, t) => hex(rgb(T[a] ?? a).map((v, i) => v + (rgb(T[b] ?? b)[i] - v) * t));
export const alpha = (c, a) => `rgba(${rgb(T[c] ?? c).join(', ')}, ${a})`;

// ---------- palettes ----------
// Each fills the same roles. Building stops follow the (lifted) height: 0, 15, 40, 100, 200, 320 m.
export const PALETTES = {
  // Tonal: the whole range of each brand colour, paper through camel to carbon. Parks and woods in camel steps,
  // camel-warm buildings that darken to carbon downtown, rail lines in rust (routes, as in the brand).
  tonal: {
    land: T.paper, residential: mix('paper', 'camel', 0.13), work: mix('paper', 'rust', 0.08), park: mix('paper', 'camel', 0.34),
    wood: mix('paper', 'camel', 0.44), farm: mix('paper', 'camel', 0.16), airport: mix('paper', 'carbon', 0.06), runway: mix('paper', 'carbon', 0.17),
    lake: mix('paper', 'camel', 0.27), shore: alpha('camel', 0.9), river: alpha(mix('camel', 'carbon', 0.2), 0.85),
    roadMinor: alpha('carbon', 0.13), roadMid: alpha('carbon', 0.3), roadMajor: alpha('carbon', 0.55), highway: T.carbon, rail: alpha('rust', 0.75),
    buildings: [mix('paper', 'camel', 0.2), mix('paper', 'camel', 0.36), mix('paper', 'camel', 0.58), T.camel, mix('camel', 'carbon', 0.4), mix('camel', 'carbon', 0.68)],
    flat: mix('paper', 'camel', 0.45), edge: alpha('carbon', 0.22),
    light: { color: mix('paper', 'yellow', 0.3), intensity: 0.4 },
    sky: { sky: T.paper, horizon: mix('paper', 'camel', 0.18), fog: T.paper },
    hill: { shadow: alpha('carbon', 0.38), highlight: alpha('paper', 0.6), accent: alpha('camel', 0.5) },
    text: T.carbon, halo: T.paper, regionLine: alpha('carbon', 0.34),
    tint: { color: T.yellow, far: 0.3, near: 0.09 }, spot: { color: T.carbon, opacity: 0.18 }, hatch: T.yellow, line: T.yellow, casing: T.carbon,
  },
  // Kraft: camel-led, like the kraft Help band. Kraft land, paper-light parks and lake, paper houses, and towers
  // that warm through rust to carbon.
  kraft: {
    land: mix('paper', 'camel', 0.24), residential: mix('paper', 'camel', 0.34), work: mix(mix('paper', 'camel', 0.44), 'rust', 0.1), park: mix('paper', 'camel', 0.06),
    wood: mix('paper', 'camel', 0.12), farm: mix('paper', 'camel', 0.2), airport: mix('paper', 'camel', 0.36), runway: mix('camel', 'carbon', 0.15),
    lake: mix('paper', 'camel', 0.05), shore: alpha(mix('camel', 'carbon', 0.35), 0.8), river: alpha(mix('camel', 'carbon', 0.35), 0.9),
    roadMinor: alpha('carbon', 0.16), roadMid: alpha('carbon', 0.32), roadMajor: alpha('carbon', 0.55), highway: T.carbon, rail: alpha('rust', 0.85),
    buildings: [mix('paper', 'camel', 0.1), T.paper, mix('paper', 'rust', 0.18), mix('camel', 'rust', 0.45), mix('rust', 'carbon', 0.35), mix('rust', 'carbon', 0.6)],
    flat: T.paper, edge: alpha('carbon', 0.25),
    light: { color: mix('paper', 'yellow', 0.35), intensity: 0.36 },
    sky: { sky: mix('paper', 'camel', 0.1), horizon: mix('paper', 'camel', 0.25), fog: mix('paper', 'camel', 0.14) },
    hill: { shadow: alpha('carbon', 0.32), highlight: alpha('paper', 0.5), accent: alpha('rust', 0.25) },
    text: T.carbon, halo: mix('paper', 'camel', 0.22), regionLine: alpha('carbon', 0.36),
    tint: { color: T.yellow, far: 0.34, near: 0.14 }, spot: { color: mix('carbon', 'rust', 0.18), opacity: 0.26 }, hatch: T.yellow, line: T.yellow, casing: T.carbon,
  },
  // Carbon: the city at night. Carbon ground, camel water lines, rust rail, buildings that brighten through camel
  // to paper as they rise. The section turns dark with it (the panel inverts, the navbar switches over it).
  carbon: {
    land: mix('carbon', 'paper', 0.07), residential: mix('carbon', 'paper', 0.1), work: mix('carbon', 'paper', 0.13), park: mix('carbon', 'camel', 0.18),
    wood: mix('carbon', 'camel', 0.22), farm: mix('carbon', 'camel', 0.1), airport: mix('carbon', 'paper', 0.11), runway: mix('carbon', 'paper', 0.22),
    lake: T.carbon, shore: alpha('camel', 0.6), river: alpha('camel', 0.7),
    roadMinor: alpha('paper', 0.1), roadMid: alpha('paper', 0.22), roadMajor: alpha('paper', 0.4), highway: mix('paper', 'camel', 0.25), rail: alpha('rust', 0.95),
    buildings: [mix('carbon', 'paper', 0.16), mix('carbon', 'camel', 0.38), mix('carbon', 'camel', 0.62), T.camel, mix('camel', 'paper', 0.45), mix('camel', 'paper', 0.8)],
    flat: mix('carbon', 'camel', 0.45), edge: alpha('paper', 0.14),
    light: { color: mix('paper', 'yellow', 0.4), intensity: 0.35 },
    sky: { sky: T.carbon, horizon: mix('carbon', 'camel', 0.18), fog: T.carbon },
    hill: { shadow: alpha('carbon', 0.9), highlight: alpha('paper', 0.12), accent: alpha('camel', 0.2) },
    text: T.paper, halo: T.carbon, regionLine: alpha('paper', 0.3),
    tint: { color: T.yellow, far: 0.22, near: 0.1 }, spot: { color: T.carbon, opacity: 0.6 }, hatch: T.yellow, line: T.yellow, casing: T.carbon,
  },
  // Quiet: round 2 as reviewed, re-mixed from the tokens. Faint warm steps, near-white lake.
  quiet: {
    land: T.paper, residential: mix('paper', 'camel', 0.06), work: mix('paper', 'camel', 0.12), park: mix('paper', 'camel', 0.17),
    wood: mix('paper', 'camel', 0.14), farm: mix('paper', 'camel', 0.14), airport: mix('paper', 'camel', 0.12), runway: mix('paper', 'camel', 0.25),
    lake: mix('paper', 'camel', 0.2), shore: alpha('camel', 0.55), river: alpha('camel', 0.7),
    roadMinor: alpha('carbon', 0.1), roadMid: alpha('carbon', 0.2), roadMajor: alpha('carbon', 0.38), highway: T.carbon, rail: alpha('carbon', 0.25),
    buildings: [mix('paper', 'camel', 0.18), mix('paper', 'camel', 0.35), mix(mix('paper', 'camel', 0.4), 'carbon', 0.12), mix(mix('paper', 'camel', 0.4), 'carbon', 0.3), mix(mix('paper', 'camel', 0.4), 'carbon', 0.48), mix(mix('paper', 'camel', 0.4), 'carbon', 0.65)],
    flat: mix(mix('paper', 'camel', 0.3), 'carbon', 0.08), edge: alpha('carbon', 0.18),
    light: { color: mix('paper', 'yellow', 0.2), intensity: 0.45 },
    sky: { sky: T.paper, horizon: mix('paper', 'camel', 0.15), fog: T.paper },
    hill: { shadow: alpha('carbon', 0.32), highlight: alpha('paper', 0.55), accent: alpha('camel', 0.4) },
    text: T.carbon, halo: T.paper, regionLine: alpha('carbon', 0.28),
    tint: { color: T.yellow, far: 0.26, near: 0.1 }, spot: { color: T.carbon, opacity: 0.14 }, hatch: T.yellow, line: T.yellow, casing: T.carbon,
  },
};

// Depth (dev panel → depth): what each palette uses for cast shadows, the lake's engraved contour lines, park
// edges, the highway's casing, and the even inner light of the two-way spotlight
Object.assign(PALETTES.tonal, { shade: alpha('carbon', 0.16), contour: alpha(mix('camel', 'carbon', 0.2), 0.5), parkEdge: alpha('camel', 0.65), hwCasing: T.paper, inner: { color: mix('paper', 'yellow', 0.55), opacity: 0.34 } });
Object.assign(PALETTES.kraft, { shade: alpha(mix('rust', 'carbon', 0.6), 0.2), contour: alpha(mix('camel', 'carbon', 0.3), 0.5), parkEdge: alpha(mix('camel', 'carbon', 0.25), 0.5), hwCasing: mix('paper', 'camel', 0.08), inner: { color: mix('paper', 'yellow', 0.5), opacity: 0.4 } });
Object.assign(PALETTES.carbon, { shade: alpha('carbon', 0.65), contour: alpha('camel', 0.35), parkEdge: alpha('camel', 0.3), hwCasing: T.carbon, inner: { color: T.yellow, opacity: 0.16 } });
Object.assign(PALETTES.quiet, { shade: alpha('carbon', 0.1), contour: alpha('camel', 0.35), parkEdge: alpha('camel', 0.4), hwCasing: T.paper, inner: { color: mix('paper', 'yellow', 0.4), opacity: 0.3 } });

// ---------- the area highlight (dev panel → highlight) ----------
// Which layers each highlight style uses. All are drawn from feature-state (instant, on the main thread), faded
// by the page: the right area lights the moment it is chosen, never the one before.
export const HIGHLIGHTS = {
  tint: ['hl-tint', 'hl-line-thin'], // a yellow wash over the area, strongest from afar
  spotlight: ['hl-spot', 'hl-inner', 'hl-line-thin'], // two-way: everything outside dims, the area itself glows evenly
  glow: ['hl-glow', 'hl-line-thin'], // yellow light along the inside of the border, fading inward
  hatch: ['hl-hatch', 'hl-line-thin'], // drawn yellow hatching, like a planner's map
  outline: ['hl-casing', 'hl-line'], // round 2: a bold yellow border on a soft Carbon casing
  dim: ['hl-spot', 'hl-line-thin'], // one-way: only the outside dims
};
const HL_LAYERS = ['hl-spot', 'hl-inner', 'hl-tint', 'hl-hatch', 'hl-glow', 'hl-casing', 'hl-line', 'hl-line-thin'];
const k = ['number', ['feature-state', 'k'], 0]; // the area's fade, 0–1
export const hatchId = (p) => `g10-hatch-${p.hatch.slice(1)}`;

// Building heights, lifted a little at the low end so suburban houses keep some relief (6 m reads as 11 m)
const H = ['coalesce', ['get', 'render_height'], 6];
const LIFTED = ['interpolate', ['linear'], H, 0, 7, 8, 13, 30, 34, 300, 300];

// opts: palette, buildings 'shaded'|'flat', relief 'on'|'off', highlight, tiles (local URL template or null),
// glyphs (URL template), regions and masks (GeoJSON)
export function mapStyle({ palette = 'kraft', buildings = 'shaded', relief = 'on', highlight = 'spotlight', depth = 'on', tiles = null, glyphs, regions, masks }) {
  const P = PALETTES[palette] ?? PALETTES.tonal;
  const shaded = buildings === 'shaded';
  const on = new Set(HIGHLIGHTS[highlight] ?? HIGHLIGHTS.tint);
  const vis = (id) => ({ visibility: on.has(id) ? 'visible' : 'none' });
  const deep = { visibility: depth === 'on' ? 'visible' : 'none' };
  const b = P.buildings;
  return {
    version: 8,
    glyphs,
    sources: {
      omt: tiles
        ? { type: 'vector', tiles: [tiles], minzoom: 0, maxzoom: 14, attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://openmaptiles.org">© OpenMapTiles</a>' }
        : { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      // Terrain shading from open elevation tiles (Mapzen terrarium, AWS Open Data); in Canada they are built from
      // NRCan's CDEM, with NASA SRTM and NOAA ETOPO1 elsewhere
      dem: {
        type: 'raster-dem', tiles: [tiles ? tiles.replace('/__tiles/', '/__dem/').replace('.pbf', '.png') : 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 12, encoding: 'terrarium',
        attribution: 'Terrain: Mapzen · <a href="https://open.canada.ca/en/open-government-licence-canada">NRCan CDEM</a> · NASA SRTM',
      },
      regions: { type: 'geojson', data: regions, promoteId: 'region' }, // OSM boundaries: covered by the map's OSM credit
      masks: { type: 'geojson', data: masks, promoteId: 'region' },
    },
    // a low warm sun from the south-west (60° from overhead: low enough to model the sides, high enough to keep roofs light)
    light: { anchor: 'map', position: [1.2, 215, 60], color: P.light.color, intensity: shaded ? P.light.intensity : 0.22 },
    sky: { 'sky-color': P.sky.sky, 'horizon-color': P.sky.horizon, 'fog-color': P.sky.fog, 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.7, 'fog-ground-blend': 0.35, 'atmosphere-blend': 0 },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': P.land } },
      { id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': P.residential } },
      { id: 'landuse-work', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['commercial', 'retail', 'industrial', 'railway']]], paint: { 'fill-color': P.work } },
      { id: 'farm', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'farmland'], paint: { 'fill-color': P.farm, 'fill-opacity': 0.8 } },
      { id: 'wood', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass']]], paint: { 'fill-color': P.wood, 'fill-opacity': 0.75 } },
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': P.park, 'fill-opacity': 0.9 } },
      { id: 'park-edge', type: 'line', source: 'omt', 'source-layer': 'park', minzoom: 10, layout: deep, paint: { 'line-color': P.parkEdge, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 14, 1] } },
      { id: 'airport', type: 'fill', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': P.airport } },
      {
        id: 'relief', type: 'hillshade', source: 'dem', layout: { visibility: relief === 'on' ? 'visible' : 'none' },
        // strong on the wide views (the Escarpment, the Moraine); faded close up, where the z12 elevation data is
        // too coarse and would smudge the streets
        paint: { 'hillshade-exaggeration': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12.5, 0.2, 13.5, 0.08], 'hillshade-illumination-direction': 300, 'hillshade-shadow-color': P.hill.shadow, 'hillshade-highlight-color': P.hill.highlight, 'hillshade-accent-color': P.hill.accent },
      },
      // the areas: a quiet dashed line always; the matched area's highlight (under the lake, so it stops at the shore)
      { id: 'region-line', type: 'line', source: 'regions', paint: { 'line-color': P.regionLine, 'line-width': 1, 'line-dasharray': [2, 2] } },
      { id: 'hl-spot', type: 'fill', source: 'masks', layout: vis('hl-spot'), paint: { 'fill-color': P.spot.color, 'fill-opacity': ['*', k, P.spot.opacity] } },
      { id: 'hl-inner', type: 'fill', source: 'regions', layout: vis('hl-inner'), paint: { 'fill-color': P.inner.color, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10.5, ['*', k, P.inner.opacity], 12.5, ['*', k, P.inner.opacity * 0.5], 13.5, ['*', k, P.inner.opacity * 0.2]] } }, // even light over the area; faded close up so the buildings keep their colours
      { id: 'hl-tint', type: 'fill', source: 'regions', layout: vis('hl-tint'), // strongest from afar; close up it all but fades, so the buildings keep their own colours (the pin says yes there)
        paint: { 'fill-color': P.tint.color, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, ['*', k, P.tint.far], 11, ['*', k, P.tint.far * 0.7], 13.5, ['*', k, P.tint.near * 0.4]] } },
      { id: 'hl-hatch', type: 'fill', source: 'regions', layout: vis('hl-hatch'), paint: { 'fill-pattern': hatchId(P), 'fill-opacity': ['*', k, 0.9] } },
      {
        id: 'hl-glow', type: 'line', source: 'regions', layout: { ...vis('hl-glow'), 'line-join': 'round' },
        paint: { 'line-color': P.line, 'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 16, 11, 48, 14, 150], 'line-offset': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 8, 11, 24, 14, 75], 'line-blur': ['interpolate', ['exponential', 1.6], ['zoom'], 8, 14, 11, 42, 14, 130], 'line-opacity': ['*', k, 0.75] },
      },
      { id: 'hl-casing', type: 'line', source: 'regions', layout: { ...vis('hl-casing'), 'line-join': 'round' }, paint: { 'line-color': P.casing, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 9], 'line-opacity': ['*', k, 0.18] } },
      { id: 'hl-line', type: 'line', source: 'regions', layout: { ...vis('hl-line'), 'line-join': 'round' }, paint: { 'line-color': P.line, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 2.5, 14, 5], 'line-opacity': k } },
      { id: 'hl-line-thin', type: 'line', source: 'regions', layout: { ...vis('hl-line-thin'), 'line-join': 'round' }, paint: { 'line-color': P.line, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 3], 'line-opacity': k } },
      { id: 'lake', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': P.lake } },
      { id: 'shore', type: 'line', source: 'omt', 'source-layer': 'water', paint: { 'line-color': P.shore, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 14, 1.4] } },
      // engraved contour lines just off the shore, on the water, like an old chart (vector tile outer rings run
      // clockwise on screen, so a positive offset falls on the water side)
      { id: 'lake-contour-1', type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 8, layout: deep, paint: { 'line-color': P.contour, 'line-width': 0.8, 'line-offset': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 7] } },
      { id: 'lake-contour-2', type: 'line', source: 'omt', 'source-layer': 'water', minzoom: 8, layout: deep, paint: { 'line-color': P.contour, 'line-opacity': 0.55, 'line-width': 0.7, 'line-offset': ['interpolate', ['linear'], ['zoom'], 8, 7, 14, 16] } },
      { id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': P.river, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.6, 14, 1.8] } },
      { id: 'runway', type: 'line', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['get', 'class'], 'runway'], paint: { 'line-color': P.runway, 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 16] } },
      // roads, quietest first: local streets a whisper, arterials a pencil line, highways full strength
      { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]], paint: { 'line-color': P.roadMinor, 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 15, 1.4] } },
      { id: 'road-mid', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]], paint: { 'line-color': P.roadMid, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 15, 2] } },
      { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk']]], paint: { 'line-color': P.roadMajor, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 2.6] } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': P.rail, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 14, 1.6], 'line-dasharray': [3, 2] } },
      { id: 'highway-casing', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'motorway'], layout: { ...deep, 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.hwCasing, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 7, 2.4, 10, 4.6, 14, 11] } },
      { id: 'highway', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'motorway'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': P.highway, 'line-opacity': ['case', ['==', ['get', 'brunnel'], 'tunnel'], 0.35, 1], 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 7, 0.8, 10, 1.8, 14, 5] } },
      // cast shadows: two height bands, longer for taller (a low sun from the south-west throws them north-east),
      // offset in ground pixels so they lie on the street at any tilt. (Each band re-processes every building when a
      // tile is parsed, so two, not more.)
      ...[[0, 30, 7], [30, 9999, 34]].map(([lo, hi, d]) => ({
        id: `shadow-${lo}`, type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 13, layout: deep,
        filter: ['all', ['>=', LIFTED, lo], ['<', LIFTED, hi], ['!=', ['get', 'hide_3d'], true]],
        paint: { 'fill-color': P.shade, 'fill-translate': [d * 0.8, -d * 0.6], 'fill-translate-anchor': 'map', 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 12.8, 0, 13.3, 1] },
      })),
      { id: 'building-edge', type: 'line', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'line-color': P.edge, 'line-width': 0.6 } },
      // buildings: extruded from z13, at full height almost at once; taller is darker (or lighter, at night)
      {
        id: 'buildings', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13, filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': shaded ? ['interpolate', ['linear'], LIFTED, 0, b[0], 15, b[1], 40, b[2], 100, b[3], 200, b[4], 320, b[5]] : P.flat,
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12.6, 0, 13.1, LIFTED],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.95,
          'fill-extrusion-vertical-gradient': shaded,
        },
      },
      // highway numbers only (401, QEW, 427…), sparse, in Overpass Mono
      {
        id: 'highway-ref', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 9, maxzoom: 13.2,
        filter: ['all', ['==', ['get', 'class'], 'motorway'], ['has', 'ref']],
        layout: { 'symbol-placement': 'line', 'symbol-spacing': 700, 'text-field': ['get', 'ref'], 'text-font': ['OverpassMono-SemiBold'], 'text-size': 12, 'text-letter-spacing': 0.12, 'text-rotation-alignment': 'viewport', 'text-keep-upright': true },
        paint: { 'text-color': P.text, 'text-halo-color': P.halo, 'text-halo-width': 2 },
      },
    ],
  };
}

export { HL_LAYERS };

// The yellow hatching for the 'hatch' highlight, drawn once per colour (diagonal, 45°, at 2× for sharp lines)
export function hatchImage(color) {
  const s = 16;
  const c = document.createElement('canvas');
  c.width = c.height = s * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.beginPath();
  for (const o of [-s, 0, s]) { g.moveTo(o, s); g.lineTo(o + s, 0); }
  g.stroke();
  return { image: g.getImageData(0, 0, s * 2, s * 2), options: { pixelRatio: 2 } };
}
