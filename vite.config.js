import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import handlebars from 'vite-plugin-handlebars';

const root = import.meta.dirname;

export default defineConfig({
  plugins: [
    tailwindcss(),
    handlebars({
      // nav.hbs / footer.hbs → {{> nav}}; sections → {{> [01-hero]}}
      partialDirectory: [resolve(root, 'src/partials'), resolve(root, 'src/sections')],
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        tokens: resolve(root, 'tokens.html'),
      },
    },
  },
});
