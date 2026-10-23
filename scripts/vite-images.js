// Responsive images without client JS: sources in src/assets/images are encoded to AVIF + WebP at
// a few widths (cached in node_modules/.cache), served in dev and emitted in the build only when a
// page uses them. In templates: {{picture "ov01" alt="…" sizes="100vw" loading="eager"}}
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { parse, resolve } from 'node:path';
import Handlebars from 'handlebars';
import sharp from 'sharp';

const FORMATS = { avif: { quality: 55 }, webp: { quality: 78 } };
const BASE = '/images/r/';

export function images({ src, cache, widths = [768, 1280, 1920, 2560] }) {
  const meta = new Map();
  const used = new Set();
  let ready;

  async function generate() {
    await mkdir(cache, { recursive: true });
    for (const file of await readdir(src)) {
      const { name, ext } = parse(file);
      if (!/^\.(png|jpe?g)$/i.test(ext)) continue;
      const input = resolve(src, file);
      const { mtimeMs } = await stat(input);
      const { width, height } = await sharp(input).metadata();
      const ws = widths.filter((w) => w < width).concat(width > widths.at(-1) ? [] : [width]);
      meta.set(name, { width, height, widths: ws });
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
      ready ??= generate();
      await ready;
    },
    configureServer(server) {
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
