# ONAWAY: GT-10 3D Map Exploration Context

The brief for exploring a real 3D map for homepage section 05, **Across the GTA**, to replace GT-09's hand-drawn SVG map. Attach this to every GT-10 prompt. Read it with **ONAWAY Build Context**, **Homepage Locked Decisions** and the live GT-09 section code.

This is an **exploration**, not a production build. Work on one option at a time, compare, then lock one.

---

## 1. What we're exploring

GT-09 "We'll Be There" works: a sentence ("We'll be in ___ on your date.") over a map, an idle tour of places, and a postal check that flies the map to your place. The map itself is a drawn SVG mock. GT-10 asks: **what if the map were a real, immersive 3D city you fly over**, while staying ONAWAY's city (drawn, warm, paper and carbon) rather than generic satellite imagery.

**Start free of the current plate.** Don't keep GT-09's framed plate, sizes or panel position just because they exist. Find the best composition for a 3D map first. Constraints from the old plate come back only if they earn it.

---

## 2. What carries over from GT-09 (the foundation)

The behaviour and copy stay; the map layer and the composition are open.

- **Sentence:** "We'll be in ___ on your date." The place is written in, with a highlighter under it on a match.
- **Idle tour:** cycles through the same ten places as the live section. Reuse its list.
- **Postal check:** type a postal code or town; the first three characters decide the area. Reuse the live section's mapping table.
- **Areas:** City of Toronto, Peel, York, Halton, Durham.
- **On a match:** fly to the place, drop the yellow pin, tint the region, write the place into the sentence.
- **Outside the area:** pull back to the whole GTA; "your area, soon".
- **Carry-over:** the matched place pre-fills "where" in QC-02 below.
- **Check button:** Carbon, not yellow.
- **Reduced motion:** no flying; cut straight to the end state.

---

## 3. Camera language (note this; it's the heart of GT-10)

| Move | What it does | Starting values to tune |
|---|---|---|
| **Intro** | First view of the section: from high over Lake Ontario, descend and tilt into the GTA | 2.5s, ease-out, ending pitch 45–55° |
| **Fly-to** | Travel to a place along a curved path (zoom out, across, zoom in) | 1.6–2.2s, curve ~1.4, ease-in-out |
| **Orbit** | Slowly circle the place after arriving, so the buildings reveal their depth | Tour: +8° bearing over each 3.4s hold. Match: one 90° orbit over 6s, then still |
| **Tour drift** | Idle state: fly-to → short orbit → next place | 3.4s per stop, 1.6s fly |
| **Pull-back** | Outside the area, or reset: rise to the whole GTA, north up | 1.6s |
| **Reduced motion** | Jump straight to each end state; no orbit, no drift | — |

**Rules:** one move at a time; never orbit and fly together. On a match the camera frames the whole area first, the area lights up, and the highlighter writes 0.5s later; then the camera goes down to the place and the pin drops only after arrival (agreed in round 2). A region-only answer stays on the area. No bounce, no shake.

**Page scroll comes first.** The site uses Lenis smooth scroll, so the map must never capture the scroll wheel. Scroll-zoom is off; on touch, use two-finger (cooperative) gestures or no gestures. Dragging to look around is optional, never required.

---

## 4. Options

| | Option | Engine and data | Why explore it |
|---|---|---|---|
| **A** | Styled 3D vector map (**first**) | MapLibre GL JS v5 (open source) with OpenStreetMap tiles from OpenFreeMap (free, no key). Self-hosting a GTA Protomaps file on cPanel is the later production path | Full control of every colour; no usage bills; GT-09's drawn look in 3D |
| **B** | Mapbox Standard (**second**) | Mapbox GL JS v3, Standard style, configured to the brand | Polished 3D landmarks (CN Tower and others), realistic lighting, dawn/day/dusk/night presets. **Light the map by live Toronto time**, matching the footer's live clock |
| **C** | Paper diorama (**later**) | Three.js, custom model from OpenStreetMap footprints | Most original; an architectural paper model of the GTA |

**Retired for now:** Google photorealistic 3D, and pre-rendered video flights.

---

## 5. Brand rules for the map

- **Colours:** Paper #F7F2E7 (land) · Carbon #202521 (highways, labels, building edges) · Station Yellow #E4BB3F (pin and region tint only; the section's one yellow moment) · Rust #A9503E (not used here) · Camel #B49A78 (rivers, never text).
- **Lake:** a quiet tone near Paper-2 #EFE7D6, never blue.
- **Buildings:** warm greys between Paper and Carbon, lit by a low sun, with height emphasised downtown.
- **Type on the map:** Overpass Mono for road and highway labels, Instrument Sans SemiCondensed for places and regions. Few labels.
- **Feel:** drawn, quiet, editorial. Not a navigation app: no POI icons, no transit icons, no traffic.

---

## 6. Data

- **Ten tour places:** reuse the live GT-09 list (name plus coordinates).
- **Area boundaries:** GeoJSON for the five regions, from Statistics Canada census division boundaries or Ontario open data, simplified so the file stays small. Note the source and licence.
- **Postcode table:** reuse the live table. It still needs checking against Canada Post before launch.

---

## 7. Where the exploration lives

- `explore/gt10/` in the repo: a separate Vite page per option, never linked from the live site.
  - `a-maplibre.html`, then `b-mapbox.html`
  - shared: `section.js` (the behaviour, engine-neutral, through a small adapter per option), `camera.js` (the §3 moves), `places.js` (map-only label positions), `regions.geojson`, and the Overpass Mono map glyphs (`glyphs/`)
  - imported from the live site, never copied: the panel partial (`src/partials/gta-panel.hbs`), the places, coordinates and tour (`src/js/data/places.js`), the postal table and the town lookup (`src/js/data/area.js`)
- Each page is the real homepage around the section (navbar, sections 04 and 06, footer, `main.js`). Options live in the site's dev review panel (with its replay and reduced-motion switch), plus an FPS readout; never shipped.
- **Keys:** the Mapbox public token lives in `.env.local` (git-ignored), restricted to localhost, the tunnel and onaway.ca in the Mapbox account.

---

## 8. How we compare (score each out of 100)

| Criterion | Question |
|---|---|
| Brand fit | Does it look like ONAWAY's city, or like any map? |
| Immersion | Does fly-to plus orbit make the GTA feel real and near? |
| Clarity | Is "yes, we cover you" instantly clear after a match? |
| Motion | Smooth, calm, one move at a time? |
| Performance | Library size (gzip), time to first frame, FPS on a mid-range phone |
| Cost and licensing | Free usage, logos and attribution required, terms |
| Build effort | Effort to take it to production |

---

## 9. Noted for production (not limits on the exploration)

- A poster image shows first and is the fallback without WebGL. It doesn't have to be GT-09's plate.
- Load the map library only when the section nears the viewport; it can't count against the page's 120 KB script budget.
- Pause rendering off-screen; cap device pixel ratio on phones.
- **Attribution:** "© OpenStreetMap contributors" (and OpenFreeMap) for A; the Mapbox logo and attribution for B.
