// GT-10 · bake the map's heavy one-off pictures ahead, off the main thread (bake.worker.js), so starting the map
// never freezes the page: the palette's colour grade (a LUT image, into presets.js lutCache) and the soft gradient
// grain (pixels for the ground texture). Each is baked once; without workers or OffscreenCanvas they are made on
// the main thread instead, when first needed.
import { PALETTES, GRADES, lutCache, lutData } from './presets.js';
import { softGrainTile, asImageData } from './texture.js';

let worker;
let next = 0;
const waiting = new Map();
function run(kind, arg) {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return Promise.reject(new Error('no worker'));
  if (!worker) {
    worker = new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data: { id, result, error } }) => {
      const p = waiting.get(id);
      waiting.delete(id);
      if (error) p?.reject(new Error(error)); else p?.resolve(result);
    };
  }
  const id = ++next;
  return new Promise((resolve, reject) => {
    waiting.set(id, { resolve, reject });
    worker.postMessage({ id, kind, arg });
  });
}

// The palette's grade, ready in presets.js lutCache (resolves at once for a palette without one)
const luts = {};
export function bakeGrade(palette) {
  const grade = PALETTES[palette]?.grade;
  if (!grade || lutCache[grade]) return Promise.resolve();
  luts[grade] ??= run('lut', grade)
    .catch(() => lutData(GRADES[grade]))
    .then((b64) => { lutCache[grade] ??= b64; });
  return luts[grade];
}

// The soft gradient grain's pixels ({ width, height, data }, what map.addImage takes)
let grain;
export function bakeSoftGrain() {
  grain ??= run('soft-grain', {}).catch(() => asImageData(softGrainTile()));
  return grain;
}
