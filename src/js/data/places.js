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
