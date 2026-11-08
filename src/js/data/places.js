// Towns and neighbourhoods we serve, with their region, for the quote area picker (from the QC-02 mock).
export const PLACES = [
  ['Downtown', 'Toronto'], ['North York', 'Toronto'], ['Scarborough', 'Toronto'], ['Etobicoke', 'Toronto'],
  ['East York', 'Toronto'], ['York', 'Toronto'], ['Mississauga', 'Peel'], ['Brampton', 'Peel'], ['Caledon', 'Peel'],
  ['Vaughan', 'York'], ['Markham', 'York'], ['Richmond Hill', 'York'], ['Newmarket', 'York'], ['Aurora', 'York'],
  ['King', 'York'], ['Stouffville', 'York'], ['East Gwillimbury', 'York'], ['Georgina', 'York'], ['Pickering', 'Durham'],
  ['Ajax', 'Durham'], ['Whitby', 'Durham'], ['Oshawa', 'Durham'], ['Clarington', 'Durham'], ['Uxbridge', 'Durham'],
  ['Oakville', 'Halton'], ['Burlington', 'Halton'], ['Milton', 'Halton'], ['Halton Hills', 'Halton'],
];

export const regionLabel = (region) => (region === 'Toronto' ? 'City of Toronto' : `${region} Region`);

// The GTA section (05): the place each region centres on, and the idle tour (once through, then rest wide)
export const REGION_CENTRE = { Toronto: 'Downtown', Peel: 'Mississauga', York: 'Markham', Durham: 'Oshawa', Halton: 'Oakville' };
export const TOUR = ['Downtown', 'Mississauga', 'Markham', 'Oakville', 'Scarborough', 'Brampton', 'Pickering', 'Vaughan', 'Burlington', 'Oshawa'];

// Where each place is, [longitude, latitude]: its centre or main town, for a real map
export const PLACE_AT = {
  Downtown: [-79.3832, 43.6487],
  'North York': [-79.4111, 43.7682], // North York Centre
  Scarborough: [-79.2575, 43.7764], // Town Centre
  Etobicoke: [-79.5653, 43.6435],
  'East York': [-79.3277, 43.6911],
  York: [-79.4875, 43.6896], // the former city, Weston Road and Eglinton
  Mississauga: [-79.6421, 43.5933], // City Centre
  Brampton: [-79.7599, 43.6858], // downtown
  Caledon: [-79.736, 43.877], // Bolton
  Vaughan: [-79.5277, 43.7942], // Vaughan Metropolitan Centre
  Markham: [-79.337, 43.8561],
  'Richmond Hill': [-79.4403, 43.8828],
  Newmarket: [-79.4613, 44.0592],
  Aurora: [-79.4504, 44.0065],
  King: [-79.5272, 43.9264], // King City
  Stouffville: [-79.2525, 43.9706],
  'East Gwillimbury': [-79.4424, 44.1003], // Sharon
  Georgina: [-79.4646, 44.2474], // Keswick
  Pickering: [-79.0868, 43.8384],
  Ajax: [-79.0204, 43.8509],
  Whitby: [-78.9429, 43.8975],
  Oshawa: [-78.8658, 43.8971],
  Clarington: [-78.6876, 43.9126], // Bowmanville
  Uxbridge: [-79.1207, 44.1086],
  Oakville: [-79.6877, 43.4675],
  Burlington: [-79.799, 43.3255],
  Milton: [-79.8774, 43.5183],
  'Halton Hills': [-79.9216, 43.6476], // Georgetown
};
