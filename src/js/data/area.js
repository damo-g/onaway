// "Do we cover you?": a postal code or a town name → our area.
// Postal codes go through the FSA table (postcodes.js, still a placeholder until checked against Canada Post).
// Towns match the places we serve, their communities (Georgetown, Bolton, Woodbridge…) and the nearby towns
// we don't serve yet, forgiving case, accents, "City of", a short start ("missis") and a slip of a letter.
//
// lookupArea(input) →
//   { empty: true }                                         nothing typed
//   { ok: true, kind, fsa?, region, place, label }          we cover it (place: a PLACES name, label: what to write)
//   { ok: false, kind, fsa?, label }                        outside our five areas
//   { unknown: true, query }                                neither a postal code nor a town we know
import { lookupPostcode } from './postcodes.js';
import { PLACES, REGION_CENTRE } from './places.js';

const REGION_OF = Object.fromEntries(PLACES);

// Communities and other names → the place we serve them as
const ALIASES = {
  toronto: 'Toronto', 'old toronto': 'Downtown', 'downtown toronto': 'Downtown', 'the city': 'Toronto',
  'north york': 'North York', willowdale: 'North York', 'don mills': 'North York', 'downsview': 'North York',
  'east york': 'East York', leaside: 'East York', 'the beaches': 'East York', beaches: 'East York',
  weston: 'York', 'mount dennis': 'York',
  scarborough: 'Scarborough', agincourt: 'Scarborough', malvern: 'Scarborough', 'west hill': 'Scarborough',
  etobicoke: 'Etobicoke', mimico: 'Etobicoke', 'long branch': 'Etobicoke', rexdale: 'Etobicoke', islington: 'Etobicoke',
  'port credit': 'Mississauga', streetsville: 'Mississauga', meadowvale: 'Mississauga', malton: 'Mississauga', cooksville: 'Mississauga', 'erin mills': 'Mississauga',
  bramalea: 'Brampton', 'heart lake': 'Brampton', springdale: 'Brampton',
  bolton: 'Caledon', 'caledon east': 'Caledon', inglewood: 'Caledon', 'caledon village': 'Caledon',
  woodbridge: 'Vaughan', maple: 'Vaughan', concord: 'Vaughan', kleinburg: 'Vaughan', thornhill: 'Vaughan',
  unionville: 'Markham', cornell: 'Markham', 'markham village': 'Markham', 'milliken': 'Markham',
  'oak ridges': 'Richmond Hill',
  'king city': 'King', nobleton: 'King', schomberg: 'King', 'king township': 'King',
  'whitchurch-stouffville': 'Stouffville', 'whitchurch stouffville': 'Stouffville', 'ballantrae': 'Stouffville',
  sharon: 'East Gwillimbury', 'holland landing': 'East Gwillimbury', 'mount albert': 'East Gwillimbury', queensville: 'East Gwillimbury',
  keswick: 'Georgina', sutton: 'Georgina', pefferlaw: 'Georgina',
  bowmanville: 'Clarington', courtice: 'Clarington', newcastle: 'Clarington', orono: 'Clarington',
  brooklin: 'Whitby',
  georgetown: 'Halton Hills', acton: 'Halton Hills',
  'port perry': 'Durham', scugog: 'Durham', brock: 'Durham', beaverton: 'Durham', cannington: 'Durham',
};

// Nearby towns outside our five areas, spelled as we'd write them
const OUTSIDE = ['Hamilton', 'Stoney Creek', 'Ancaster', 'Dundas', 'Grimsby', 'St. Catharines', 'Niagara Falls', 'Welland', 'Brantford',
  'Guelph', 'Kitchener', 'Waterloo', 'Cambridge', 'Orangeville', 'Shelburne', 'Alliston', 'New Tecumseth', 'Bradford', 'Innisfil',
  'Barrie', 'Orillia', 'Lindsay', 'Kawartha Lakes', 'Peterborough', 'Port Hope', 'Cobourg', 'Belleville', 'Kingston', 'Ottawa',
  'London', 'Windsor', 'Sudbury', 'Montreal', 'Mono', 'Erin'];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[.,'’]/g, '').replace(/^(the )?(city|town|township|municipality|region) of /, '').replace(/\s+(on|ontario|canada)$/, '')
  .replace(/\s+/g, ' ').trim();

// name (normalised) → { place | region-only | outside label }
const INDEX = new Map();
for (const [name] of PLACES) INDEX.set(norm(name), { place: name, label: name });
for (const [alias, target] of Object.entries(ALIASES)) {
  const label = alias.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/-(\w)/g, (m, c) => `-${c.toUpperCase()}`);
  if (!INDEX.has(alias)) INDEX.set(alias, { place: target, label: target === 'Toronto' ? 'Toronto' : label });
}
for (const name of OUTSIDE) INDEX.set(norm(name), { outside: true, label: name });

function distance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return d[a.length][b.length];
}

function findTown(q) {
  if (INDEX.has(q)) return INDEX.get(q);
  if (q.length >= 4) {
    const starts = [...INDEX.keys()].filter((k) => k.startsWith(q));
    if (starts.length === 1) return INDEX.get(starts[0]);
  }
  if (q.length >= 5) {
    const near = [...INDEX.keys()].map((k) => [k, distance(q, k)]).filter(([, d]) => d <= (q.length >= 8 ? 2 : 1)).sort((x, y) => x[1] - y[1]);
    if (near.length && (near.length === 1 || near[0][1] < near[1][1])) return INDEX.get(near[0][0]);
  }
  return null;
}

// The regions by name ("York" alone means York Region; the old city of York is "York, Toronto")
for (const r of ['Peel', 'York', 'Halton', 'Durham']) {
  INDEX.set(norm(r), { region: r, label: `${r} Region` });
  INDEX.set(`${norm(r)} region`, { region: r, label: `${r} Region` });
}
INDEX.set('york toronto', { place: 'York', label: 'York' });
INDEX.set('gta', { place: 'Toronto', label: 'Toronto' });

// A matched place → what the section writes and where it goes
function inside(kind, t, fsa) {
  const { place, label } = t;
  if (place === 'Toronto') return { ok: true, kind, fsa, region: 'Toronto', place: 'Downtown', label: 'Toronto' };
  const region = t.region ?? (place === 'Durham' ? 'Durham' : null);
  if (region) return { ok: true, kind, fsa, region, place: REGION_CENTRE[region], label, regionOnly: true };
  return { ok: true, kind, fsa, region: REGION_OF[place], place, label };
}

export function lookupArea(input) {
  const raw = (input || '').trim();
  if (!raw) return { empty: true };
  const compact = raw.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z]\d[A-Z]/.test(compact)) {
    const a = lookupPostcode(compact);
    if (!a.ok) return { ok: false, kind: 'postcode', fsa: a.fsa, label: a.fsa };
    if (a.place) return inside('postcode', { place: a.place, label: a.place }, a.fsa);
    const centre = REGION_CENTRE[a.region];
    return { ok: true, kind: 'postcode', fsa: a.fsa, region: a.region, place: centre, label: a.region === 'Toronto' ? 'Toronto' : `${a.region} Region`, regionOnly: true };
  }
  const t = findTown(norm(raw));
  if (!t) return { unknown: true, query: raw };
  if (t.outside) return { ok: false, kind: 'town', label: t.label };
  return inside('town', t);
}

// Suggestions as the visitor types (the quote section's area blank, the quote page's pickers): the same postal
// codes, towns, communities, regions and forgiveness as lookupArea, as a short list.
// suggestAreas(input, max) → [{ label, place, region, code?, via?, out? }]: label is what to write, place the PLACES
// name it maps to, via the place a community belongs to ("Woodbridge" via Vaughan), out a place outside our areas.
export function suggestAreas(input, max = 5) {
  const raw = (input || '').trim();
  if (!raw) return [];
  const compact = raw.replace(/\s/g, '').toUpperCase();
  const item = (a) => (a.ok ? { label: a.label, place: a.place, region: a.region, code: a.fsa ?? '', via: !a.regionOnly && a.label !== a.place && a.label !== 'Toronto' ? a.place : '' } : { label: a.label, code: a.fsa ?? '', out: true });
  if (/^[A-Z]\d[A-Z]/.test(compact)) return [item(lookupArea(compact))];
  if (/^[A-Z]\d?$/.test(compact) && /\d/.test(compact)) return []; // a postal code on its way
  const q = norm(raw);
  if (!q) return [];
  const ranked = [];
  for (const [key, t] of INDEX) {
    const rank = key.startsWith(q) ? 0 : key.split(/[\s-]/).some((w) => w.startsWith(q)) ? 1 : q.length >= 3 && key.includes(q) ? 2 : -1;
    if (rank < 0) continue;
    // places we serve first, then communities, regions, and towns outside
    const kind = t.outside ? 3 : t.region ? 2 : REGION_OF[t.place] && t.label === t.place ? 0 : 1;
    ranked.push([rank, kind, key, t]);
  }
  ranked.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].length - b[2].length);
  const out = [];
  const seen = new Set();
  const add = (a) => { const it = item(a); if (!seen.has(it.label)) { seen.add(it.label); out.push(it); } };
  for (const [, , , t] of ranked) {
    if (out.length >= max) break;
    add(t.outside ? { ok: false, kind: 'town', label: t.label } : inside('town', t));
  }
  if (!out.length) { // a slip of a letter
    const a = lookupArea(raw);
    if (!a.unknown) add(a);
  }
  return out;
}
