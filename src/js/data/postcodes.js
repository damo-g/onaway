// Postal code → service area, by the first three characters (FSA). From the GT-09 mock.
// PLACEHOLDER: must be verified against Canada Post before launch (see docs/build-context.md §6).
// Returns { bad } for malformed input, else { fsa, region, place, ok }.
export function lookupPostcode(input) {
  const p = (input || '').replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]\d[A-Z]/.test(p)) return { bad: true };
  const fsa = p.slice(0, 3);
  const [c, d, e] = fsa;
  const has = (letters) => letters.includes(e);
  let place = null;
  let region = null;

  if (c === 'M') {
    region = 'Toronto';
    place = { 1: 'Scarborough', 2: 'North York', 3: 'North York', 4: 'East York', 5: 'Downtown', 6: 'Toronto', 7: 'Downtown', 8: 'Etobicoke', 9: 'Etobicoke' }[d] || 'Toronto';
  } else if (c === 'L') {
    if (d === '5') { region = 'Peel'; place = 'Mississauga'; }
    else if (d === '4') {
      if (has('TUVWXYZ')) { region = 'Peel'; place = 'Mississauga'; }
      else if (has('HJKL')) { region = 'York'; place = 'Vaughan'; }
      else if (has('BCDES')) { region = 'York'; place = 'Richmond Hill'; }
      else if (e === 'G') { region = 'York'; place = 'Aurora'; }
      else if (e === 'A') { region = 'York'; place = 'Stouffville'; }
    } else if (d === '6') {
      if (e === 'A') { region = 'York'; place = 'Vaughan'; }
      else if (has('BCDEFG')) { region = 'York'; place = 'Markham'; }
      else if (has('HJKLM')) { region = 'Halton'; place = 'Oakville'; }
      else { region = 'Peel'; place = 'Brampton'; }
    } else if (d === '7') {
      if (e === 'A') { region = 'Peel'; place = 'Brampton'; }
      else if (has('CEK')) { region = 'Peel'; place = 'Caledon'; }
      else if (has('GJ')) { region = 'Halton'; place = 'Halton Hills'; }
      else if (has('LMNPRST')) { region = 'Halton'; place = 'Burlington'; }
    } else if (d === '3') {
      if (has('PRST')) { region = 'York'; place = 'Markham'; }
      else if (has('XY')) { region = 'York'; place = 'Newmarket'; }
      else region = 'York';
    } else if (d === '1') {
      region = 'Durham';
      place = has('VWXY') ? 'Pickering' : has('STZ') ? 'Ajax' : has('MNPR') ? 'Whitby' : has('GHJKL') ? 'Oshawa' : has('BCE') ? 'Clarington' : null;
    } else if (fsa === 'L9T') { region = 'Halton'; place = 'Milton'; }
  }
  return { fsa, region, place, ok: !!region };
}
