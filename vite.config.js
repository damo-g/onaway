import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import handlebars from 'vite-plugin-handlebars';

const root = import.meta.dirname;

export default defineConfig({
  plugins: [
    tailwindcss(),
    handlebars({
      // nav.hbs / footer.hbs / section.hbs → {{> nav}}; sections → {{> [01-hero]}}
      partialDirectory: [resolve(root, 'src/partials'), resolve(root, 'src/sections')],
      helpers: { eq: (a, b) => a === b },
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
});
