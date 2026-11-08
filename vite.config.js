import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import handlebars from 'vite-plugin-handlebars';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { images } from './scripts/vite-images.js';
import { faq, faqJsonLd } from './src/data/faq.js';

const root = import.meta.dirname;
// Hugeicons (iconify.design/hugeicons), vendored in src/icons: {{{icon "arrow-right-02"}}} inlines one at 1em
const ICONS = Object.fromEntries(readdirSync(resolve(root, 'src/icons')).filter((f) => f.endsWith('.svg')).map((f) => [f.slice(0, -4), readFileSync(resolve(root, 'src/icons', f), 'utf8').trim()]));
function icon(name, options) {
  if (!ICONS[name]) throw new Error(`No icon "${name}" in src/icons`);
  const cls = options?.hash?.class ? ` ${options.hash.class}` : '';
  return ICONS[name].replace('<svg ', `<svg class="icon${cls}" aria-hidden="true" focusable="false" `);
}
const img = images({
  src: resolve(root, 'src/assets/images'),
  cache: resolve(root, 'node_modules/.cache/onaway-images'),
});

export default defineConfig(async ({ command }) => ({
  plugins: [
    img.plugin,
    // Dev only: the GT-10 map exploration's local tile cache (explore/gt10/tile-cache.js). Imported only by the dev
    // server, so the site's build never depends on the exploration folder.
    command === 'serve' && (await import('./explore/gt10/tile-cache.js')).gt10TileCache(root),
    // Dev only: clean URLs like the server's .htaccess (/quote and /quote/ serve quote.html)
    {
      name: 'onaway-clean-urls',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const m = req.url.match(/^\/([\w-]+)\/?(\?.*)?$/);
          if (m && existsSync(resolve(root, `${m[1]}.html`))) req.url = `/${m[1]}.html${m[2] || ''}`;
          next();
        });
      },
    },
    tailwindcss(),
    handlebars({
      // nav.hbs / footer.hbs / section.hbs → {{> nav}}; sections → {{> [01-hero]}}
      partialDirectory: [resolve(root, 'src/partials'), resolve(root, 'src/sections')],
      // `dev` gates review-only markup (e.g. alternative images) so it never reaches the build
      // `faq` is every question and answer (src/data/faq.js): the Help page and the service pages' Questions
      context: { dev: command === 'serve', faq },
      helpers: { eq: (a, b) => a === b, picture: img.picture, faqJsonLd, icon },
    }),
  ],
  // allowedHosts: client demos and phone checks through `cloudflared tunnel --url http://localhost:5173`
  server: { port: 5173, strictPort: true, allowedHosts: ['.trycloudflare.com'] },
  build: {
    rollupOptions: {
      // tokens.html is a dev review page (served by `npm run dev`), not part of the site build
      input: {
        main: resolve(root, 'index.html'),
        notFound: resolve(root, '404.html'), // served by .htaccess ErrorDocument
        quote: resolve(root, 'quote.html'),
        cleaning: resolve(root, 'cleaning.html'),
        moving: resolve(root, 'moving.html'),
        delivery: resolve(root, 'delivery.html'),
        help: resolve(root, 'help.html'),
        about: resolve(root, 'about.html'),
        privacy: resolve(root, 'privacy.html'),
        accessibility: resolve(root, 'accessibility.html'),
      },
    },
  },
}));
