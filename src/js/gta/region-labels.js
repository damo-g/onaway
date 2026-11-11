// GT-10 shared · map-only placement. The places themselves (names, coordinates, tour, region centres) are the
// site's own data, imported from src/js/data/places.js; only what a real map needs on top lives here.

// Region names on the wide views, placed by hand near each area's middle (the polygon centroid falls in odd places)
export const REGION_LABELS = {
  Toronto: { text: 'City of Toronto', at: [-79.39, 43.72] },
  Peel: { text: 'Peel', at: [-79.76, 43.76] },
  York: { text: 'York', at: [-79.42, 43.96] },
  Halton: { text: 'Halton', at: [-79.86, 43.5] },
  Durham: { text: 'Durham', at: [-78.98, 43.98] },
};
