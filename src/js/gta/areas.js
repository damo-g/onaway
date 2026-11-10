// GT-10 shared · the five areas, ready for any engine: each outline (for framing an area at the tilt), the areas as
// GeoJSON (outer rings wound counter-clockwise, so an inner glow's offset falls inside), and for the spotlight a mask
// per area: the whole world with that area cut out. Both collections key their features by `region` (promoteId).
import regionsUrl from './regions.geojson?url';

const area = (r) => r.reduce((s, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return s + x1 * y2 - x2 * y1; }, 0);
const wind = (r, ccw) => ((area(r) > 0) === ccw ? r : [...r].reverse());
const WORLD = [[-179, -80], [179, -80], [179, 84], [-179, 84], [-179, -80]];

export async function loadAreas() {
  const raw = await (await fetch(regionsUrl)).json();
  const outlines = {};
  const regions = { type: 'FeatureCollection', features: [] };
  const masks = { type: 'FeatureCollection', features: [] };
  for (const f of raw.features) {
    const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates.flat(1).sort((a, b) => b.length - a.length)[0];
    const region = f.properties.region;
    outlines[region] = ring;
    regions.features.push({ type: 'Feature', properties: { region }, geometry: { type: 'Polygon', coordinates: [wind(ring, true)] } });
    masks.features.push({ type: 'Feature', properties: { region }, geometry: { type: 'Polygon', coordinates: [wind(WORLD, true), wind(ring, false)] } });
  }
  return { outlines, regions, masks };
}

// A world-sized polygon (for a texture laid on the ground)
export const WORLD_FC = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [WORLD] } }] };
