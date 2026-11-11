// GT-10 · the map's heavy one-off pictures, made off the main thread (bake.js): the colour grade as a LUT image and
// the soft gradient grain. Each is pure pixel work (presets.js lutPixels, texture.js softGrainPixels).
import { GRADES, lutPixels } from './presets.js';
import { softGrainPixels } from './texture.js';

// bytes → base64, in slices (a spread of the whole array would overflow the call stack)
function base64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

self.onmessage = async ({ data: { id, kind, arg } }) => {
  try {
    if (kind === 'lut') {
      const N = 32;
      const c = new OffscreenCanvas(N * N, N);
      c.getContext('2d').putImageData(new ImageData(lutPixels(GRADES[arg], N), N * N, N), 0, 0);
      const png = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer());
      self.postMessage({ id, result: base64(png) });
    } else if (kind === 'soft-grain') {
      const img = softGrainPixels(arg);
      self.postMessage({ id, result: img }, [img.data.buffer]);
    }
  } catch (err) {
    self.postMessage({ id, error: String(err?.message ?? err) });
  }
};
