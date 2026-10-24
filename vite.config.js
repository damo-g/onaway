import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import handlebars from 'vite-plugin-handlebars';
import { existsSync } from 'node:fs';
import { images } from './scripts/vite-images.js';

const root = import.meta.dirname;
const img = images({
  src: resolve(root, 'src/assets/images'),
  cache: resolve(root, 'node_modules/.cache/onaway-images'),
});

export default defineConfig(({ command }) => ({
  plugins: [
    img.plugin,
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
      context: { dev: command === 'serve' },
      helpers: { eq: (a, b) => a === b, picture: img.picture },
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      // tokens.html is a dev review page (served by `npm run dev`), not part of the site build
      input: {
        main: resolve(root, 'index.html'),
        notFound: resolve(root, '404.html'), // served by .htaccess ErrorDocument
        quote: resolve(root, 'quote.html'),
        cleaning: resolve(root, 'cleaning.html'),
      },
    },
  },
}));
