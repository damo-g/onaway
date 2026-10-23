// Responsive images without client JS: sources in src/assets/images are encoded to AVIF + WebP at
// a few widths (cached in node_modules/.cache), served in dev and emitted in the build only when a
// page uses them. In templates: {{picture "ov01" alt="…" sizes="100vw" loading="eager"}}
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { parse, resolve } from 'node:path';
import Handlebars from 'handlebars';
import sharp from 'sharp';

// High quality on purpose: these are painted plates where softness shows. 4:4:4 keeps colour edges crisp.
const FORMATS = {
  avif: { quality: 72, effort: 6, chromaSubsampling: '4:4:4' },
  webp: { quality: 88, effort: 5, smartSubsample: true },
};
// Changing the encoder settings starts a fresh cache folder, so old softer files are never reused
const SIGNATURE = Object.entries(FORMATS).map(([f, o]) => `${f}${o.quality}`).join('-');
const BASE = '/images/r/';

export function images({ src, cache: cacheRoot, widths = [768, 1280, 1920, 2560] }) {
  const cache = resolve(cacheRoot, SIGNATURE);
  const meta = new Map();
  const used = new Set();
  let scanned; // sizes of every source: pages wait on this
  let ready; // encoded files: image requests and the build wait on this

  async function scan() {
    for (const file of await readdir(src)) {
      const { name, ext } = parse(file);
      if (!/^\.(png|jpe?g)$/i.test(ext)) continue;
      const input = resolve(src, file);
      const { width, height } = await sharp(input).metadata();
      // Every width below the source, plus the source width itself for high-DPI screens
      const ws = widths.filter((w) => w < width).concat([width]);
      meta.set(name, { input, width, height, widths: ws });
    }
  }

  async function encode() {
    await scanned;
    await mkdir(cache, { recursive: true });
    for (const { input, widths: ws } of meta.values()) {
      const { name } = parse(input);
      const { mtimeMs } = await stat(input);
      for (const w of ws) {
        for (const [format, options] of Object.entries(FORMATS)) {
          const out = resolve(cache, `${name}-${w}.${format}`);
          try {
            if ((await stat(out)).mtimeMs >= mtimeMs) continue;
          } catch {}
          await sharp(input).resize({ width: w }).toFormat(format, options).toFile(out);
        }
      }
    }
  }

  const start = () => {
    scanned ??= scan();
    ready ??= encode();
  };

  const srcset = (name, format) => meta.get(name).widths.map((w) => `${BASE}${name}-${w}.${format} ${w}w`).join(', ');

  function picture(name, options) {
    const m = meta.get(name);
    if (!m) throw new Error(`[images] no source image "${name}" in ${src}`);
    m.widths.forEach((w) => Object.keys(FORMATS).forEach((f) => used.add(`${name}-${w}.${f}`)));
    const { alt = '', sizes = '100vw', loading = 'lazy', fetchpriority, class: cls, imgClass } = options.hash;
    const e = Handlebars.escapeExpression;
    const fallback = m.widths.find((w) => w >= 1280) ?? m.widths.at(-1);
    return new Handlebars.SafeString(
      `<picture${cls ? ` class="${e(cls)}"` : ''} data-image="${e(name)}">` +
        `<source type="image/avif" srcset="${srcset(name, 'avif')}" sizes="${e(sizes)}">` +
        `<source type="image/webp" srcset="${srcset(name, 'webp')}" sizes="${e(sizes)}">` +
        `<img src="${BASE}${name}-${fallback}.webp" width="${m.width}" height="${m.height}" alt="${e(alt)}"` +
        ` loading="${e(loading)}" decoding="async"${fetchpriority ? ` fetchpriority="${e(fetchpriority)}"` : ''}` +
        `${imgClass ? ` class="${e(imgClass)}"` : ''}>` +
        `</picture>`,
    );
  }

  const plugin = {
    name: 'onaway-images',
    enforce: 'pre',
    async buildStart() {
      start();
      await ready;
    },
    // Runs before the Handlebars plugin (this plugin is listed first), so {{picture}} always has sizes
    transformIndexHtml: {
      order: 'pre',
      async handler() {
        start();
        await scanned;
      },
    },
    configureServer(server) {
      start();
      server.middlewares.use(BASE, async (req, res, next) => {
        const file = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
        if (!/^[\w-]+\.(avif|webp)$/.test(file)) return next();
        try {
          await ready;
          const body = await readFile(resolve(cache, file));
          res.setHeader('Content-Type', `image/${file.split('.').pop()}`);
          res.setHeader('Cache-Control', 'no-cache');
          res.end(body);
        } catch {
          next();
        }
      });
    },
    async generateBundle() {
      for (const file of used) {
        this.emitFile({ type: 'asset', fileName: `${BASE.slice(1)}${file}`, source: await readFile(resolve(cache, file)) });
      }
    },
  };

  return { plugin, picture, srcset };
}
