# ONAWAY website

Static marketing site for ONAWAY. Read `CLAUDE.md` and `docs/build-context.md` first.

## Commands
- `npm install`: install dependencies
- `npm run dev`: dev server on http://localhost:5173 (token test at `/tokens.html`)
- `npm run build`: static site into `dist/`
- `npm run preview`: serve `dist/`
- `npm run shots -- tokens.html [--grid]`: screenshots at 1512, 1280, 768 and 390 into `screenshots/` (dev server must be running; first run `npx playwright install chromium`)
- `cloudflared tunnel --url http://localhost:5173`: temporary public link for a client

## Layout
- `index.html` includes `src/partials/nav.hbs`, `src/sections/01-hero.html` … `07-footer.html` and `src/partials/footer.hbs`
- `src/styles/main.css`: Tailwind v4 `@theme` tokens (the only allowed values)
- `src/js/main.js`: Alpine + Lenis (synced to GSAP ScrollTrigger in `lenis.js`)
- `public/fonts`: Instrument Sans (variable, wdth + wght) and Overpass Mono, WOFF2, OFL

Press **G** on `tokens.html` to toggle the 12 / 8 / 4 grid overlay.
