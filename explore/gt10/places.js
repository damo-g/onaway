// GT-10 shared · the places of the live GT-09 section (src/js/sections/gta.js), as real coordinates
// [longitude, latitude]. Same names, same tour, same region centres as the live section.

export const PLACES = {
  Burlington: [-79.799, 43.3255],
  Oakville: [-79.6877, 43.4675],
  Milton: [-79.8774, 43.5183],
  'Halton Hills': [-79.9216, 43.6476], // Georgetown
  Mississauga: [-79.6421, 43.5933], // City Centre
  Brampton: [-79.7599, 43.6858], // downtown
  Caledon: [-79.736, 43.877], // Bolton
  Etobicoke: [-79.5653, 43.6435],
  Downtown: [-79.3832, 43.6487],
  'North York': [-79.4111, 43.7682], // North York Centre
  'East York': [-79.3277, 43.6911],
  Scarborough: [-79.2575, 43.7764], // Town Centre
  Vaughan: [-79.5277, 43.7942], // Vaughan Metropolitan Centre
  'Richmond Hill': [-79.4403, 43.8828],
  Markham: [-79.337, 43.8561],
  Newmarket: [-79.4613, 44.0592],
  Aurora: [-79.4504, 44.0065],
  Stouffville: [-79.2525, 43.9706],
  Pickering: [-79.0868, 43.8384],
  Ajax: [-79.0204, 43.8509],
  Whitby: [-78.9429, 43.8975],
  Oshawa: [-78.8658, 43.8971],
  Clarington: [-78.6876, 43.9126], // Bowmanville
};

// The live section's region centres and idle tour, unchanged
export const REGION_CENTRE = { Toronto: 'Downtown', Peel: 'Mississauga', York: 'Markham', Durham: 'Oshawa', Halton: 'Oakville' };
export const TOUR = ['Downtown', 'Mississauga', 'Markham', 'Oakville', 'Scarborough', 'Brampton', 'Pickering', 'Vaughan', 'Burlington', 'Oshawa'];

// Region labels for the map, placed by hand near each area's middle (not the polygon centroid, which falls in odd places)
export const REGION_LABELS = {
  Toronto: { text: 'City of Toronto', at: [-79.39, 43.72] },
  Peel: { text: 'Peel', at: [-79.76, 43.76] },
  York: { text: 'York', at: [-79.42, 43.96] },
  Halton: { text: 'Halton', at: [-79.86, 43.5] },
  Durham: { text: 'Durham', at: [-78.98, 43.98] },
};

// The whole GTA, for the pull-back (west, south, east, north)
export const GTA_BOUNDS = [[-80.2, 43.28], [-78.62, 44.32]];
