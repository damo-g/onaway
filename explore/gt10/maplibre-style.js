// GT-10 option A · the map style (docs/gt10-3d-map-context.md §5), on OpenFreeMap's OpenMapTiles vector tiles.
// Paper land, a quiet lake (never blue), camel rivers, Carbon highways, warm-grey buildings lit by a low sun,
// no POIs or transit, almost no labels (places and regions are HTML labels in the brand fonts, see a-maplibre.js).
// The region tint and the pin are added on top (yellow: the section's one yellow moment).

export const C = {
  paper: '#F7F2E7',
  paper2: '#EFE7D6',
  lake: '#E8DFCC', // a step darker than Paper-2, so the shore reads
  carbon: '#202521',
  yellow: '#E4BB3F',
  camel: '#B49A78',
};
const ink = (a) => `rgba(32, 37, 33, ${a})`;

// Building heights, lifted a little at the low end so suburban houses keep some relief (a 6 m house reads as
// 11 m; anything over 30 m is true)
const H = ['coalesce', ['get', 'render_height'], 6];
const LIFTED = ['interpolate', ['linear'], H, 0, 7, 8, 13, 30, 34, 300, 300];

// buildings: 'shaded' (height-graded warm greys, vertical gradient) | 'flat' (one grey)
// relief: terrain shading from open elevation data (the Escarpment, the Oak Ridges Moraine), Carbon and camel
// tiles: a local tile URL template (the dev cache standing in for self-hosted tiles), else OpenFreeMap
export function mapStyle({ buildings = 'shaded', relief = 'on', tiles = null } = {}) {
  const shaded = buildings === 'shaded';
  return {
    version: 8,
    // OpenFreeMap's glyphs (Noto Sans). Production: self-host Overpass Mono glyphs for the road numbers.
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: tiles
        ? { type: 'vector', tiles: [tiles], minzoom: 0, maxzoom: 14, attribution: '<a href="https://openfreemap.org">OpenFreeMap</a> © OpenMapTiles Data from OpenStreetMap' }
        : { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      // Terrain: open elevation tiles (Mapzen terrarium encoding, AWS Open Data), for the hillshade only
      // (maxzoom 12: relief is a broad shape; closer zooms reuse those tiles, a fraction of the requests)
      dem: { type: 'raster-dem', tiles: [tiles ? tiles.replace('/__tiles/', '/__dem/').replace('.pbf', '.png') : 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 12, encoding: 'terrarium', attribution: 'Terrain: Mapzen, AWS Open Data' },
    },
    // A low sun from the south-west (polar 72° from overhead = low), warm
    light: { anchor: 'map', position: [1.2, 215, 72], color: '#FFF3DE', intensity: shaded ? 0.6 : 0.22 },
    // The tilted horizon melts into Paper rather than a blue sky
    sky: {
      'sky-color': C.paper,
      'horizon-color': C.paper2,
      'fog-color': C.paper,
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.35,
      'atmosphere-blend': 0,
    },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': C.paper } },
      // parks and woods: the faintest warm step, no green
      { id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['residential', 'suburb', 'neighbourhood']]], paint: { 'fill-color': '#F3EDE1', 'fill-opacity': 0.8 } },
      { id: 'landuse-work', type: 'fill', source: 'omt', 'source-layer': 'landuse', filter: ['in', ['get', 'class'], ['literal', ['commercial', 'retail', 'industrial', 'railway']]], paint: { 'fill-color': '#EDE5D5', 'fill-opacity': 0.85 } },
      // parks and woods: a camel-warmed step (no green)
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#EBE2CE', 'fill-opacity': 0.85 } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]], paint: { 'fill-color': '#EDE5D2', 'fill-opacity': 0.7 } },
      { id: 'airport', type: 'fill', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ECE5D6' } },
      {
        id: 'relief', type: 'hillshade', source: 'dem', layout: { visibility: relief === 'on' ? 'visible' : 'none' },
        paint: { 'hillshade-exaggeration': 0.5, 'hillshade-illumination-direction': 300, 'hillshade-shadow-color': 'rgba(32, 37, 33, 0.32)', 'hillshade-highlight-color': 'rgba(255, 252, 244, 0.55)', 'hillshade-accent-color': 'rgba(180, 154, 120, 0.4)' },
      },
      // (the region outline is inserted here, under the lake, so the lake trims it to the shore)
      { id: 'lake', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.lake } },
      // a drawn shoreline in camel
      { id: 'shore', type: 'line', source: 'omt', 'source-layer': 'water', paint: { 'line-color': C.camel, 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 14, 1.2] } },
      { id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': C.camel, 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 14, 1.6] } },
      { id: 'runway', type: 'line', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['get', 'class'], 'runway'], paint: { 'line-color': '#E2DAC9', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 16] } },
      // roads, quietest first: local streets a whisper, arterials a pencil line, highways full Carbon
      { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]], paint: { 'line-color': ink(0.1), 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 15, 1.4] } },
      { id: 'road-mid', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]], paint: { 'line-color': ink(0.2), 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 15, 2] } },
      { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk']]], paint: { 'line-color': ink(0.38), 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 2.6] } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10, filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': ink(0.25), 'line-width': 0.8, 'line-dasharray': [3, 3] } },
      { id: 'highway', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'motorway'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.carbon, 'line-opacity': ['case', ['==', ['get', 'brunnel'], 'tunnel'], 0.35, 1], 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 7, 0.8, 10, 1.8, 14, 5] } },
      { id: 'building-edge', type: 'line', source: 'omt', 'source-layer': 'building', minzoom: 14, paint: { 'line-color': ink(0.18), 'line-width': 0.6 } },
      // buildings: extruded from z13, at full height almost at once; taller is darker, so downtown has weight
      {
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 13,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': shaded
            ? ['interpolate', ['linear'], LIFTED, 0, '#E9DFCD', 15, '#DDD2BF', 40, '#CABFAC', 100, '#ADA392', 200, '#8A8174', 320, '#625D55']
            : '#DDD5C7',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 12.6, 0, 13.1, LIFTED],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': 0.94,
          'fill-extrusion-vertical-gradient': shaded,
        },
      },
      // highway numbers only (401, QEW, 427…), sparse. Overpass Mono needs self-hosted glyphs; Noto Sans for now.
      {
        id: 'highway-ref',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 9,
        maxzoom: 13,
        filter: ['all', ['==', ['get', 'class'], 'motorway'], ['has', 'ref']],
        layout: { 'symbol-placement': 'line', 'symbol-spacing': 700, 'text-field': ['get', 'ref'], 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-letter-spacing': 0.12, 'text-rotation-alignment': 'viewport', 'text-keep-upright': true },
        paint: { 'text-color': C.carbon, 'text-halo-color': C.paper, 'text-halo-width': 2 },
      },
    ],
  };
}
