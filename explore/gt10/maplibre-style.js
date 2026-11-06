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

// buildings: 'shaded' (height-graded warm greys, vertical gradient) | 'flat' (one grey)
export function mapStyle({ buildings = 'shaded' } = {}) {
  const shaded = buildings === 'shaded';
  return {
    version: 8,
    // OpenFreeMap's glyphs (Noto Sans). Production: self-host Overpass Mono glyphs for the road numbers.
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
    },
    // A low sun from the south-west (polar 72° from overhead = low), warm
    light: { anchor: 'map', position: [1.2, 215, 72], color: '#FFF3DE', intensity: shaded ? 0.5 : 0.22 },
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
      { id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: { 'fill-color': '#F0E9DA', 'fill-opacity': 0.8 } },
      { id: 'landcover', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'farmland']]], paint: { 'fill-color': '#F2ECDF', 'fill-opacity': 0.6 } },
      { id: 'airport', type: 'fill', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#ECE5D6' } },
      // (the region tint and region lines are inserted here, under the lake, so the lake trims them to the shore)
      { id: 'lake', type: 'fill', source: 'omt', 'source-layer': 'water', paint: { 'fill-color': C.lake } },
      { id: 'river', type: 'line', source: 'omt', 'source-layer': 'waterway', paint: { 'line-color': C.camel, 'line-opacity': 0.7, 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 14, 1.6] } },
      { id: 'runway', type: 'line', source: 'omt', 'source-layer': 'aeroway', filter: ['==', ['get', 'class'], 'runway'], paint: { 'line-color': '#E2DAC9', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 16] } },
      // roads, quietest first: local streets a whisper, arterials a pencil line, highways full Carbon
      { id: 'road-minor', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12, filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'track']]], paint: { 'line-color': ink(0.1), 'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.4, 15, 1.4] } },
      { id: 'road-mid', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 9, filter: ['in', ['get', 'class'], ['literal', ['secondary', 'tertiary']]], paint: { 'line-color': ink(0.2), 'line-width': ['interpolate', ['linear'], ['zoom'], 9, 0.4, 15, 2] } },
      { id: 'road-major', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['in', ['get', 'class'], ['literal', ['primary', 'trunk']]], paint: { 'line-color': ink(0.38), 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 2.6] } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 10, filter: ['==', ['get', 'class'], 'rail'], paint: { 'line-color': ink(0.25), 'line-width': 0.8, 'line-dasharray': [3, 3] } },
      { id: 'highway', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'motorway'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': C.carbon, 'line-opacity': ['case', ['==', ['get', 'brunnel'], 'tunnel'], 0.35, 1], 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 7, 0.8, 10, 1.8, 14, 5] } },
      // buildings: extruded from z13, rising in as the camera arrives; taller is darker, so downtown has weight
      {
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 13,
        filter: ['!=', ['get', 'hide_3d'], true],
        paint: {
          'fill-extrusion-color': shaded
            ? ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, '#EDE6D9', 20, '#E0D8C9', 60, '#CEC5B5', 140, '#B2A99A', 260, '#8E877B']
            : '#DDD5C7',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 13.8, ['coalesce', ['get', 'render_height'], 6]],
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
