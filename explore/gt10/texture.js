// GT-10 shared · textures, generated once in the brand colours, all tileable (they repeat without seams).
//   grainTile     the paper grain: fine tooth, a few darker specks, short fibres
//   airbrushTile  soft airbrushed clouds of colour with film grain, like the hero's painted surfaces
//   tileable      any image (the logo textures) made seamless by mirroring it into a 2×2 tile
// Each returns a canvas; asUrl() turns one into a CSS url(), asImageData() into pixels a map can use as a pattern.

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const INK = { paper: rgb('#F7F2E7'), carbon: rgb('#202521'), camel: rgb('#B49A78'), rust: rgb('#A9503E'), yellow: rgb('#E4BB3F') };

function canvas(n) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  return c;
}

// The paper grain (the same one option A lays over its section)
export function grainTile(ink = INK.carbon, fibre = INK.camel, n = 220) {
  const c = canvas(n);
  const g = c.getContext('2d', { willReadFrequently: true });
  const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = Math.random();
    img.data.set(ink, i * 4);
    img.data[i * 4 + 3] = v > 0.994 ? 46 : v * v * 24; // mostly fine tooth, a few darker specks
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = `rgba(${fibre.join(', ')}, 0.12)`;
  g.lineWidth = 0.6;
  for (let i = 0; i < 26; i++) { // short paper fibres, drawn on all four neighbours so they wrap
    const x = Math.random() * n;
    const y = Math.random() * n;
    const a = Math.random() * Math.PI;
    const l = 6 + Math.random() * 14;
    for (const [ox, oy] of [[0, 0], [-n, 0], [0, -n], [-n, -n]]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.quadraticCurveTo(x + ox + Math.cos(a) * l * 0.5 + 2, y + oy + Math.sin(a) * l * 0.5 - 2, x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l);
      g.stroke();
    }
  }
  return c;
}

// Periodic value noise (wraps every `period` cells, so the tile is seamless), summed over octaves
function periodicNoise(period, seed) {
  const h = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  return (x, y, p = period) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = (a) => ((a % p) + p) % p;
    const a = h(w(xi), w(yi));
    const b = h(w(xi + 1), w(yi));
    const c = h(w(xi), w(yi + 1));
    const d = h(w(xi + 1), w(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

// Airbrush: two soft colour clouds over a ground, with film grain, like a sprayed, painted surface.
// ink: [ground, cloud A, cloud B] as RGB; alpha: overall strength of the clouds.
export function airbrushTile({ inks = [INK.paper, INK.camel, INK.rust], n = 384, scale = 3, seed = 1, alpha = 1 } = {}) {
  const c = canvas(n);
  const g = c.getContext('2d', { willReadFrequently: true });
  const img = g.createImageData(n, n);
  const na = periodicNoise(scale, seed);
  const nb = periodicNoise(scale * 2, seed + 7);
  const fbm = (noise, x, y, base) => {
    let v = 0;
    let amp = 0.5;
    let p = base;
    for (let o = 0; o < 4; o++) { v += amp * noise(x * (p / base), y * (p / base), p); p *= 2; amp *= 0.5; }
    return v;
  };
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const [g0, a1, b1] = inks;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x / n) * scale;
      const v = (y / n) * scale;
      const ca = smooth(0.42, 0.78, fbm(na, u, v, scale)) * alpha;
      const cb = smooth(0.5, 0.85, fbm(nb, u * 2, v * 2, scale * 2)) * alpha * 0.7;
      const grain = (Math.random() - 0.5) * 18;
      const i = (y * n + x) * 4;
      for (let k = 0; k < 3; k++) {
        let col = g0[k] + (a1[k] - g0[k]) * ca;
        col += (b1[k] - col) * cb;
        img.data[i + k] = Math.max(0, Math.min(255, col + grain));
      }
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// Any image made seamless: mirrored into a 2×2 tile (each edge meets its own reflection)
export function tileable(image, size = 512) {
  const c = canvas(size * 2);
  const g = c.getContext('2d', { willReadFrequently: true });
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    g.save();
    g.translate(sx > 0 ? 0 : size * 2, sy > 0 ? 0 : size * 2);
    g.scale(sx, sy);
    g.drawImage(image, 0, 0, size, size);
    g.restore();
  }
  return c;
}

export const asUrl = (c) => `url(${c.toDataURL()})`;
export const asImageData = (c) => c.getContext('2d').getImageData(0, 0, c.width, c.height);

// The paper grain laid over a whole section, words included, so map and panel read as one printed sheet.
// (CSS: .g10-grain in gt10.css; dark grain on paper, light grain on the Carbon palette.)
export function addSectionGrain(el) {
  const grain = document.createElement('div');
  grain.className = 'g10-grain';
  grain.setAttribute('aria-hidden', 'true');
  el.append(grain);
  el.style.setProperty('--g10-grain-dark', asUrl(grainTile(INK.carbon)));
  el.style.setProperty('--g10-grain-light', asUrl(grainTile(INK.paper)));
  return grain;
}

// A texture made neutral for a blend mode, so it adds texture without washing the map out or darkening it overall.
//   multiply:   lifted so its lightest tone is pure white (white is invisible in multiply; only the texture darkens)
//   soft-light: re-centred on mid-grey (mid-grey is invisible in soft-light; only the texture's detail shows)
export function neutral(c, mode) {
  const n = c.width;
  const out = document.createElement('canvas');
  out.width = out.height = n;
  const src = c.getContext('2d').getImageData(0, 0, n, n);
  const g = out.getContext('2d', { willReadFrequently: true });
  const img = g.createImageData(n, n);
  const d = src.data;
  // luminance over a white backing (transparent pixels count as white)
  const L = new Float32Array(n * n);
  let sum = 0;
  let max = 0;
  for (let i = 0; i < n * n; i++) {
    const a = d[i * 4 + 3] / 255;
    const l = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) * a + 255 * (1 - a);
    L[i] = l; sum += l; if (l > max) max = l;
  }
  const mean = sum / (n * n);
  for (let i = 0; i < n * n; i++) {
    const a = d[i * 4 + 3] / 255;
    if (mode === 'multiply') {
      const lift = 255 / Math.max(1, max);
      for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.min(255, (d[i * 4 + k] * a + 255 * (1 - a)) * lift);
    } else {
      const v = Math.max(0, Math.min(255, 128 + (L[i] - mean) * 1.6));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    }
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return out;
}

// Soft gradient grain, after airbrushed illustration (spray paint on paper): broad, soft gradients of tone, built
// from grain rather than flat fill. Round 2: a balance of the spray and the paper grain. The grain is a continuous
// fine tooth (every pixel a little, deeper where the tone is deep), softened by a light blur so it reads as tooth,
// not sprinkled dots; only a few true specks remain, in the deepest tone.
// ink: the grain's colour (a warm brown mixed from rust and carbon); tint: the soft tone under it.
export function softGrainTile({ n = 768, scale = 2, seed = 9, ink = INK.rust.map((v, i) => v + (INK.carbon[i] - v) * 0.45), tint = INK.camel, tooth = 0.5, specks = 0.05, shade = 0.22 } = {}) {
  const c = canvas(n);
  const g = c.getContext('2d', { willReadFrequently: true });
  const img = g.createImageData(n, n);
  const lo = periodicNoise(scale, seed);
  const hi = periodicNoise(scale * 2, seed + 3);
  const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const B = new Float32Array(n * n); // the soft gradient, 0–1
  const G = new Float32Array(n * n); // the grain's strength
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const u = (x / n) * scale;
      const v = (y / n) * scale;
      const b = smooth(0.22, 0.82, 0.68 * lo(u, v) + 0.32 * hi(u * 2, v * 2, scale * 2));
      const j = y * n + x;
      B[j] = b;
      let a = tooth * Math.random() ** 2.5 * (0.2 + 0.8 * b); // the tooth, everywhere, deeper with the tone
      if (Math.random() < 0.0015 + specks * b ** 2.2) a += 0.35; // a speck of spray, only where the tone is deep
      G[j] = a;
    }
  }
  // soften the grain (a 3×3 blur that wraps, so the tile stays seamless)
  const W = [1, 2, 1];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let a = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) a += G[((y + dy + n) % n) * n + ((x + dx + n) % n)] * W[dx + 1] * W[dy + 1];
      a = Math.min(1, (a / 16) * 1.6);
      const t = B[y * n + x] * shade; // the soft tone under the grain
      const out = 1 - (1 - a) * (1 - t);
      const i = (y * n + x) * 4;
      for (let k = 0; k < 3; k++) img.data[i + k] = out ? (ink[k] * a + tint[k] * t * (1 - a)) / out : tint[k];
      img.data[i + 3] = out * 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}
