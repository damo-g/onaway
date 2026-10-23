# ONAWAY website

Static marketing site for ONAWAY: cleaning, moving and delivery across the GTA (Toronto, Halton, Peel, York, Durham). Pre-launch and locally owned. The brand idea is a transit system for everyday life: routes, stops, arrival boards, tickets and signs. The tone is warm, direct and local.

## Read first
- `docs/build-context.md` covers the stack, tokens, conditions and section order. **It wins every conflict.**
- `docs/homepage-locked-decisions.md` has the exact locked settings for each homepage section.
- `docs/brand-guide.md` has the voice, colour and logo rules.
- `docs/mocks/*.html` are the locked mocks, the reference for layout, behaviour and timing. To view them, serve the folder with `npx serve docs/mocks`; CSS masks fail over `file://`. The top bar, option toggles and spec panel in the mocks are review tools. Build with the locked options already set, and never ship the toggles.

## Stack (committed, don't swap without asking)
- **Build:** Vite in multi-page mode, outputting static HTML.
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite`, with tokens in `@theme` inside `src/styles/main.css`.
- **JavaScript:** Alpine.js for small interactions and GSAP + ScrollTrigger for pins and scrubs. Use plain WebGL for shaders; no Three.js.
- **Smooth scroll:** Lenis, driven by `gsap.ticker`, with `ScrollTrigger.update` on scroll. It is turned off under `prefers-reduced-motion`.
- **Partials:** Handlebars via `vite-plugin-handlebars` for the nav and footer.
- **Fonts:** self-hosted WOFF2 files in `public/fonts`, Instrument Sans (variable, `wdth` + `wght`) and Overpass Mono. No Google Fonts in production.
- **Hosting:** local first on `npm run dev` (localhost:5173). Client demos go through `cloudflared tunnel --url http://localhost:5173`. Cloudflare Pages comes later; no domain is bought yet.

## Design tokens (the only values allowed)
- **Colour:** paper #F7F2E7 · carbon #202521 · yellow #E4BB3F · rust #A9503E · camel #B49A78.
  - Hairlines are carbon at 20% on paper and paper at 14% on carbon.
  - Yellow is for signals only and never text on paper; use 3 yellow moments per screen at most.
  - Camel is never used for text.
- **Type:** Instrument Sans SemiCondensed (`font-stretch: 87.5%`) for everything except labels, which are Overpass Mono.
  - Sizes: display 110 caps · h1 68 caps · h2 42 · h3 26 · lead 20 · body 16 · small 14 · label 12 (mono, caps, about 0.12em tracking).
- **Spacing scale:** 8 · 13 · 21 · 34 · 55 · 89 · 144, and nothing else.
  - Sections are 144 apart (89 on mobile).
  - Blocks inside a section are 55–89 apart; components use 21–34.
  - Nothing sits closer than 34 to a section edge.
- **Grid:**
  - Stretch grid, width auto: 12 columns on desktop (1024+), 8 on tablet (768–1023), 4 on mobile.
  - **Margin = gutter = 20** up to the 1512 frame, then both grow with the screen (32 at 1920, capped at 40). Defined once as `--grid-margin` / `--grid-gutter` in `src/styles/main.css`.
  - Splits are 7/5 and 8/4.
  - Sections use the shell in `src/partials/section.hbs`: default (page grid), `inset` (Carbon panel with a paper margin each side, the quote) or `bleed` (full width, the footer and hero plate).
- **Frames:** the design artboard is 1512 × 860, with the fold at 860. Check at 1512, 1280, 768 and 390.
- **Airy is a requirement.** When in doubt, take the next step up the spacing scale.

## Homepage order
1. Hero, HF-01
2. Services, R2-E (pinned scrub; at least 89 below the signs)
3. Steps, TS-02
4. Promises, OT-05
5. GTA, GT-09
6. Quote, QC-02: an **inset Carbon panel with a 20px paper margin on each side**
7. Footer, FT-02: **full width and full height Carbon**

Leave 144 of paper between the quote and the footer.

## Rules for every change
- Work **one section at a time** on the branch `section/NN-name`. Don't start the next section until the user signs off.
- **Tokens only:** no raw hex, px or spacing outside the theme.
- **Semantic HTML**, visible focus states, and WCAG AA contrast. Decorative canvases get `aria-hidden`.
- **Reduced motion:** build the end state first, then add motion. Motion goes one thing at a time, left to right, ease-out. No parallax.
- **Images:** AVIF/WebP with `srcset`, lazy loaded below the fold.
- **Performance budget:** page JS under 120 KB gzipped, LCP under 2.5s on 4G.
- **Copy:** use it exactly as in the mocks unless the user changes it. CTA wording is "Get a free quote".
- **Checking:** before saying a section is done, run the dev server, screenshot it at 1512, 1280 and 390 (Playwright, `npm run shots`), plus 1920 for wide screens, compare against the section image and the mock, and fix what doesn't match. Screenshots go to the OS temp folder, never into the repo.
- **Review panel:** section options live only in the dev review panel; the locked option is the default; nothing from the panel ships in the build. Register options with `registerOptions(id, { option: [locked, ...alternatives] })` from `src/js/options.js`.
- **Motion:** use `onEnterOnce` and `pinScrub` from `src/js/motion.js`; both jump to the end state under reduced motion.
- **Commits:** small, named by section, e.g. `hero: pinned scrub`.

## Commands
- `npm run dev` starts the dev server on localhost:5173.
- `npm run build` writes the static site to `dist/`.
- `npm run preview` serves the built `dist/`.
- `cloudflared tunnel --url http://localhost:5173` gives a temporary public link for a client.
