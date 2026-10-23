import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import handlebars from 'vite-plugin-handlebars';
import { images } from './scripts/vite-images.js';

const root = import.meta.dirname;
const img = images({
  src: resolve(root, 'src/assets/images'),
  cache: resolve(root, 'node_modules/.cache/onaway-images'),
});

export default defineConfig(({ command }) => ({
  plugins: [
    img.plugin,
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
      },
    },
  },
}));
