# ONAWAY — Build Context

The starting brief for building the ONAWAY website. Read it together with **Homepage Locked Decisions** (what each section looks like) and the **Brand Guide** (the brand rules). If this doc and the older **Master Context Doc** disagree, this doc wins. The Master Context Doc still uses the old working name, Adeona.

## 1. The project in brief

- **Client:** Adedeji Onabule. The brand is **ONAWAY**, written Onaway in a sentence.
- **What it is:** cleaning, moving and delivery for homes and businesses across the GTA: Toronto, Halton, Peel, York and Durham.
- **Stage:** pre-launch, locally owned.
- **Positioning:** the reliable, approachable local option, neither the cheapest nor the biggest. A helpful neighbour who runs a tight schedule.
- **Big idea:** a transit system for everyday life, built from routes, stops, arrival boards, tickets and signs. The precision shows in the layout, never in the tone.
- **Tagline:** "The GTA's steady hands." It is never used next to a headline that already says "steady hands."
- **Voice:** direct, warm, confident, local. Short sentences, specific details, no fluff.
- **Pages:**
  - Home, built first.
  - Moving, Cleaning and Delivery service pages.
  - About, Quote, FAQ, Privacy and 404.
  - French is phase 2.
- **Primary CTA:** "Get a free quote". The secondary CTA is click-to-call.

## 2. Design system (becomes the Tailwind theme)

### Colour

| Token | Hex | Use |
|---|---|---|
| `paper` (Ticket Paper, the floral white) | #F7F2E7 | Base background. Never use pure white |
| `carbon` | #202521 | Text and dark sections. 13.95:1 contrast on paper |
| `yellow` (Station Yellow) | #E4BB3F | Signals only: the quote button, highlights, the signal square. Never as text on paper. At most 3 yellow moments per screen |
| `rust` | #A9503E | Links, emphasis, "GTA". 4.82:1 contrast on paper |
| `camel` | #B49A78 | Dividers and texture only. Never text |

Lines and hairlines are carbon at 20% on paper, and paper at 14% on carbon.

### Type

Two typefaces only. **Glasgow is dropped.**

- **Instrument Sans SemiCondensed** (`font-stretch: 87.5%`) for display, headings and body.
- **Overpass Mono** for labels, data, times and the tagline.

| Token | px | Face | Notes |
|---|---|---|---|
| display | 110 | Instrument Sans SemiCondensed, 600–700 | Caps, tight leading (about 0.9) |
| h1 | 68 | Same | Caps |
| h2 | 42 | Same | |
| h3 | 26 | Same | |
| lead | 20 | Instrument Sans SemiCondensed, 400–500 | |
| body | 16 | Same | |
| small | 14 | Same | |
| label | 12 | Overpass Mono, 400–600 | Caps with wide tracking (about 0.12em) |

Arrows are Instrument Sans glyphs: → ↗ ←.

### Grid

| | Wide (1512+) | Desktop (1024–1512; 1512 design, 1280 check) | Tablet (768–1023) | Mobile (390) |
|---|---|---|---|---|
| Columns | 12 | 12 | 8 | 4 |
| Margin | 20 → 40, fluid (32 at 1920) | **20** | 20 | 20 |
| Gutter | same as margin | 20 | 20 | 20 |

Stretch grid, width auto, no max width.

Splits are 7/5 and 8/4. The design artboard is 1512 × 860, with the first fold at 860.

> **Decided (October 23): margin and gutter are both 20px** up to the 1512 frame and grow fluidly to 40px on larger screens. This supersedes the earlier 24 gutter and the 40/16 tablet and mobile values. The 20px margin matches the locked mocks. This replaces the Brand Guide's 64px. Airiness comes from the vertical spacing scale and from generous column splits, not from a wide side margin.

### Spacing

The scale is **8 · 13 · 21 · 34 · 55 · 89 · 144**. Each step is the sum of the two before it, and no other values are used.

| Where | Value |
|---|---|
| Between sections | 144, or 89 on mobile |
| Between blocks inside a section | 55–89 |
| Inside components | 21–34 |
| Nearest any element may sit to a section edge | 34 |
| Below the R2-E signboard | at least 89 |

Being airy is a requirement, not a nice-to-have.

### Logo, symbol and imagery

- **Wordmark:** custom ONAWAY lettering with an arched W. It is supplied as SVG and never typeset.
- **Symbol:** the W inside a circle.
- **Yellow:** never used in the logo.
- **Imagery:** high-detail digital painting matching OV-01. Near-photoreal at a distance, painterly up close. Bright overcast late October, no text or logos, plain white trucks. People appear only from behind.
- **Dot matrix:** used only for numbers, times and arrival-board moments.
- **The yellow square:** the brand's signal. It is the wordmark's full stop in the footer and the hover marker on footer rows.

### Motion

- **Pace:** one thing at a time, left to right, ease-out.
- **Pinned sections:** the scroll drives them; nothing autoplays.
- **Entrances:** each section's entrance plays once, when it comes into view.
- **Reduced motion:** `prefers-reduced-motion` shows every section's end state.
- **Smooth scroll:** Lenis, switched off under reduced motion.
- **No parallax.**

## 3. Homepage sections and order

The full settings are in **Homepage Locked Decisions**.

| # | Section | Locked version | Build notes |
|---|---|---|---|
| 01 | Hero | HF-01 Hero Flow | Pinned scroll scrub of about 1500px. The plate scales up, the wordmark shrinks from 110 to 36 into the navbar, and the headline writes in |
| 02 | Services | R2-E Station Signs | Light environment, dark signs. Pinned scrub: the hanging chained signs fold into a full-width row board. Generous bottom padding |
| 03 | Steps | TS-02 Journey Ticket | Subtle stamp edge, symbol centred in the stub, write-in animation, tear-off CTA |
| 04 | Promises | OT-05 On the Way | Promise ledger plus a 4-image carousel: Cleaning → Moving → Delivery → crew. 6s per slide, plays once |
| 05 | Across the GTA | GT-09 We'll Be There | Overlay layout on the map mock. Tour when idle; the postal check flies the map to the place |
| 06 | Get a free quote | QC-02 Say It in a Sentence | Dark poster, centred, route background. **This is an inset Carbon panel with a 20px paper margin on the sides**, because its content is centred |
| 07 | Footer | FT-02 Window | **Full width and full height in Carbon, no margin.** Hanging columns, the Windows shader in the wordmark, live Toronto time |

- The gap between 06 and 07 is generous: 144 of paper.
- Content passes between sections: the place found in 05 pre-fills the "where" in 06.

## 4. Tech stack (committed)

| Job | Choice |
|---|---|
| Build and dev server | **Vite**, multi-page, outputting static HTML |
| Styling | **Tailwind CSS v4**, with the tokens above in `@theme` in `src/styles/main.css` |
| Interactions | **Alpine.js**: menus, the postcode picker, sentence pickers, the carousel |
| Scroll scenes | **GSAP + ScrollTrigger**, for pins and scrubs |
| Smooth scroll | **Lenis**, synced to ScrollTrigger |
| Shaders | Plain WebGL in one small module, with a still fallback |
| Shared nav and footer | Handlebars partials via `vite-plugin-handlebars` |
| Fonts | Self-hosted WOFF2 files for Instrument Sans (variable, including the width axis) and Overpass Mono. No Google Fonts call in production |
| Forms | Formspree or a small PHP handler on the host, decided at the quote page |
| Source control | **Git, local first.** Push to a private GitHub repo whenever you're ready, so there's an off-machine backup |
| Phase 1: local | Build and review on `localhost:5173` (`npm run dev`). For a client look during a call, use a Cloudflare Quick Tunnel: `cloudflared tunnel --url http://localhost:5173`. It's free and needs no account or domain |
| Hosting | **Namecheap cPanel shared hosting**, onaway.ca (addon domain). Every push to `main` builds in GitHub Actions and uploads `dist/` over FTPS. onaway.adeona.ca redirects to onaway.ca |

### Repo layout

```
onaway/
  index.html                 (homepage; other pages added later)
  src/
    partials/  nav.hbs  footer.hbs
    sections/  01-hero.html ... 07-footer.html   (one file per section, included into index)
    styles/    main.css      (Tailwind @theme tokens plus small component layers)
    js/        main.js  lenis.js  sections/hero.js ...  shaders/window.js
  public/
    fonts/  images/  svg/
  vite.config.js  package.json  README.md
```

### Git workflow

- Branch `section/01-hero`, and so on, one per section.
- Review it on localhost, or through the tunnel for the client, then merge to `main`.
- Merging to `main` deploys to https://onaway.ca automatically.
- Commits are small and named by section.

## 5. Conditions for every section

**Pixel brief**
- The section image the user attaches is the visual target.
- The locked mock HTML is the reference for behaviour and timing.

**Responsive at three widths**
- 1512, 1280 and 390, with 768 checked.
- Mobile is a real re-layout on 4 columns, not a scaled copy.

**Tokens only**
- No hex values, pixel sizes or spacing outside the theme.

**Accessibility**
- Semantic HTML and visible focus states.
- WCAG AA contrast. Yellow is never text on paper.
- Toggles are real buttons. Decorative canvases are `aria-hidden`.

**Reduced motion**
- Every section is designed for its end state first.

**Performance**
- Images in AVIF or WebP with `srcset`.
- Lazy load everything below the fold.
- Budget: page JS under 120 KB gzipped, LCP under 2.5s on 4G.

**Sign-off**
- Each section is approved on localhost or the tunnel before the next one starts.

## 6. Still placeholder or post-build

- **Footer details:** the contact numbers, email, socials and business number are made up. They need the real ones.
- **Domain:** onaway.ca is **not bought yet**. The plan is to buy it after the local build. adeona.ca is owned. The placeholder email hello@onaway.ca is still fine in the mocks.
- **GT-09 map:** the mock becomes MapLibre GL with OpenStreetMap data, styled to the tokens.
- **Postcode mapping:** the postcode → area table needs checking against Canada Post.
- **OT-05 images:** grade all four to OV-01 and add grain.
- **Launch SEO:** LocalBusiness schema, Google Business Profile alignment, sitemap, meta and OG images.
- **French:** phase 2.

## 7. Prompt to start the build (paste into the new chat)

> We're building the ONAWAY website, starting with the homepage, one section at a time. Read the project docs first: **ONAWAY Build Context** (stack, tokens, conditions), **Homepage Locked Decisions** (section specs) and the **Brand Guide**. The Build Context wins where they disagree.
>
> Step 0, before any section: set up the foundation.
> 1. Scaffold the repo exactly as in Build Context §4: Vite multi-page, Tailwind v4 with the full design system in `@theme`, Alpine.js, GSAP + ScrollTrigger, Lenis synced to ScrollTrigger, Handlebars partials, and self-hosted Instrument Sans (width axis) and Overpass Mono.
> 2. Build a one-page **token test** that renders the colours, the type scale, the spacing scale and the 12/8/4 grid overlay (toggle with G), so I can check the system before any design.
> 3. Everything runs locally first: give me the commands to install, run on localhost and start a local git repo with a sensible `.gitignore` and first commit. Also give me the Cloudflare Quick Tunnel command for showing the client. Deploys go to Namecheap (onaway.ca) through GitHub Actions.
> 4. Use the decided 20px desktop margin (Build Context §2).
>
> Then build **Section 01, Hero (HF-01)** from the image and locked mock I attach. It must be responsive at 1512, 1280 and 390, use tokens only, honour reduced motion and be airy. Publish it as an artifact for review and give me the files to commit. Don't start section 02 until I sign off.
>
> Attached: [design-system assets, fonts, logo/icon SVGs, the hero image, the hf01 mock HTML].

## 8. What to gather before the new chat

1. **Section images:** one per section, 01–07, exported at 1512 wide. You're attaching one per section as you go.
2. **The locked mock HTML for each section:** hf01-flow, r2e-platform, ts02-ticket, ot05-gardiner, gt09-hybrid, qc02-sentence, ft02-window, plus shared.css (the mock frame and toggles) and r2.js (the R2-E helper that draws the dot-matrix sign facts and fits the stage). These are the reference for behaviour and timing.
3. **Logo SVGs:** the wordmark in its Text and Display cuts, and the symbol in its Light, Dark, Hero and Flat versions, plus a favicon.
4. **Icon SVGs:** the Cleaning bottle, Moving dolly and Delivery box, plus any arrow or route marks you want as vectors.
5. **Fonts:** Instrument Sans variable (with the width axis) and Overpass Mono, as WOFF2 files. Both are under the OFL and come from Google Fonts or their GitHub repos.
6. **Images at full resolution:**
   - OV-01, the hero aerial
   - ot5c, ot5g, ot5f and ot5g3, the four carousel slides
   - the R2-E backdrop
   - tb05 and any others used
7. **Design system export:** the Figma variables, styles or the token sheet, if they differ from §2 at all.
8. **Your machine:** Node 20 or newer, Git, and `cloudflared` for tunnels. A GitHub account for the repo and deploys.
9. **Copy:** the current section copy as it stands in the mocks. It will be used with minimal revisions.
10. **Decided:** the grid margin is 20px.

## 9. Locked mocks in the project

The seven locked mocks and their two helpers are stored as project docs under `claude/mocks/`. Images can't be stored as project docs, so the assets travel in **onaway-locked-mocks.zip**. Unzip it so the mocks sit next to an `assets/` folder; they open in a browser over a local server (`npx serve` or `python3 -m http.server`).

| File | Section | Assets it uses |
|---|---|---|
| hf01-flow.html | 01 Hero | ov01.jpg, wm-carbon.png |
| r2e-platform.html | 02 Services | ed03.jpg, el01.jpg, plus r2.js |
| ts02-ticket.html | 03 Steps | sym.png |
| ot05-gardiner.html | 04 Promises | ot5c.jpg, ot5g.jpg, ot5f.jpg, ot5g3.jpg |
| gt09-hybrid.html | 05 Across the GTA | none; the map is drawn in SVG |
| qc02-sentence.html | 06 Quote | none |
| ft02-window.html | 07 Footer | wm-carbon.png (the shader fill is generated in code; ov01 and tb05 are the alternative fills) |
| shared.css | all | The mock frame: top bar, option toggles, spec panel. Not part of the site design |
| r2.js | 02 | Fits the stage, toggles the grid overlay, draws the dot-matrix sign facts |

In the mocks, the top bar, spec panel and option toggles are review tools only. Build each section with the options already set as listed in Homepage Locked Decisions.
