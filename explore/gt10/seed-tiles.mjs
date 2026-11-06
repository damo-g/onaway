// Fills the GT-10 dev tile cache (see tile-cache.js): the whole GTA at z9–11, and the ten tour places at
// z12–13 (z13 tiles carry the buildings; stops stay under z14, so z14 is never needed), plus the relief's
// elevation tiles. About 1,250 tiles, roughly 10 MB in node_modules/.cache/gt10-tiles.
// Run once: `node explore/gt10/seed-tiles.mjs`.
import { resolve } from 'node:path';
import { getTile } from './tile-cache.js';
import { PLACES, TOUR } from './places.js';

const root = resolve(import.meta.dirname, '../..');
const tx = (lng, z) => Math.floor(((lng + 180) / 360) * 2 ** z);
const ty = (lat, z) => Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);

const want = new Map();
const add = (z, x, y) => want.set(`${z}/${x}/${y}`, [z, x, y]);
for (const z of [9, 10, 11]) for (let x = tx(-80.25, z); x <= tx(-78.55, z); x++) for (let y = ty(44.35, z); y <= ty(43.25, z); y++) add(z, x, y);
for (const name of TOUR) {
  const [lng, lat] = PLACES[name];
  for (const [z, r] of [[12, 2], [13, 3]]) {
    const cx = tx(lng, z);
    const cy = ty(lat, z);
    for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r - 2; y <= cy + r; y++) add(z, x, y);
  }
}

// the elevation tiles for the relief (256 px tiles, so one zoom higher for the same detail), z9–12 over the GTA
for (const z of [9, 10, 11, 12]) for (let x = tx(-80.25, z); x <= tx(-78.55, z); x++) for (let y = ty(44.35, z); y <= ty(43.25, z); y++) want.set(`dem/${z}/${x}/${y}`, [z, x, y, 'dem']);

const list = [...want.values()];
let done = 0;
let bytes = 0;
const t0 = Date.now();
for (let i = 0; i < list.length; i += 6) {
  await Promise.all(list.slice(i, i + 6).map(async ([z, x, y, kind]) => {
    try { bytes += (await getTile(root, z, x, y, kind)).length; } catch (err) { console.warn(String(err)); }
    done++;
  }));
  if (done % 60 < 6) console.log(`${done}/${list.length} tiles · ${(bytes / 1048576).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
console.log(`done: ${list.length} tiles, ${(bytes / 1048576).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
