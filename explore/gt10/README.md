# GT-10 · 3D map exploration

Exploration pages for homepage section 05 (docs/gt10-3d-map-context.md). Never linked from the site and not part of `npm run build`.

## Run

- `npm run dev`, then http://localhost:5173/explore/gt10/a-maplibre.html
- The page is the real homepage around the section: the site's navbar, Promises (04) above, the Quote (06) below with its real pre-fill, the footer and `main.js` (Lenis, page transitions).
- **Options** are in the site's dev review panel (round button, bottom right) under `gt10` while the section is in view. The first value of each is the pick. They go in the URL too, e.g. `?gt10.palette=carbon&gt10.highlight=spotlight`. "Replay section" in the panel replays the intro; "Reduced motion" there simulates the setting.
- **Tiles:** in dev the map loads its tiles through the dev server (`/__tiles`, `/__dem`, see `tile-cache.js`), which keeps each one on disk in `node_modules/.cache/gt10-tiles`. Run `node explore/gt10/seed-tiles.mjs` once so the first flights are already smooth.
- Why here and not in `docs/mocks`: the page needs Vite (npm imports such as MapLibre, the site's partials and JS, the tile cache), and `docs/mocks` is served as plain static files.

## Options (dev panel → gt10)

| Option | Values (pick first) | What it changes |
|---|---|---|
| palette | **kraft** · tonal · carbon · quiet | Kraft: camel-led kraft ground, paper-light parks, lake and houses, rust-warm employment land, towers warming through rust. Tonal: the whole range of each brand colour. Carbon: the city at night (the section and panel turn dark). Quiet: round 2 |
| depth | **on** · off | Cast shadows by building height, engraved contour lines off the shore, park edges, a paper casing on highways |
| grain | **on** · off | A paper grain (fine tooth, a few fibres) over the whole section, words included, so it reads as one printed sheet |
| highlight | **spotlight** · tint · glow · hatch · outline · dim | How the matched area lights up. Spotlight: two-way, the outside dims and the area glows evenly. Tint: a yellow wash. Glow: light along the inside of the border. Hatch: drawn yellow lines. Outline: round 2's border. Dim: the outside dims only. Every fill fades close up so buildings keep their colours |
| match | **area** · close | After framing the area: a calm pan towards the place that stays at area level (about z11, tilt 50°, slow 20° drift), or down among the buildings with a 90° circle like the tour |
| layout | **veil** · card | The panel on a fade of the ground, or a floating card |
| pitch | **60** · 45 · 55 · 65 · 70 | Camera tilt at tour stops (area views cap it at 45–50) |
| speed | **0.75** · 0.6 · 1 · 0.45 · 0.35 | Divides every camera duration. 0.75: a tour stop is about 6.7s, a match about 8s to the pin |
| orbit | **on** · off | The slow circle at each place |
| buildings | **shaded** · flat | Height-graded colours and light, or one colour |
| relief | **on** · off | Terrain shading (strong on the wide views, faded close up) |

## Files

| File | What it is |
|---|---|
| `a-maplibre.html`, `a-maplibre.js` | Option A: MapLibre GL v5 + OpenFreeMap. The page, its options, the map, the area highlight, labels, tile preloading |
| `maplibre-style.js` | Option A's style: four palettes, every colour mixed from the five brand tokens; the highlight layers |
| `section.js` | **Shared**: the section's behaviour, engine-neutral (intro, tour, "Do we cover you?", hand-off to the quote, pausing, replay). Each option gives it a small adapter |
| `camera.js` | **Shared**: the camera moves of context §3, engine-neutral, with region framing that accounts for the tilt |
| `areas.js`, `overlays.js`, `texture.js`, `meter.js`, `colors.js` | **Shared**: the five areas as GeoJSON (with spotlight masks); the highlight fade, labels and pin, panel padding; the paper grain, airbrush and tileable textures; the dev meter; the five brand colours and mixing |
| `b/` | **Option B** (Mapbox Standard), in its own folder: see `b/README.md` |
| `places.js` | **Shared**: map-only label positions. The places, coordinates, tour and region centres are the site's own (`src/js/data/places.js`) |
| `regions.geojson` | **Shared**: the five areas |
| `glyphs/`, `build-glyphs.mjs` | Map text glyphs in Overpass Mono, built from the self-hosted font (`node explore/gt10/build-glyphs.mjs`) |
| `gt10.css` | The section, the two layouts, the palettes' panel colours, the map labels and pin, the dev meter |
| `tile-cache.js`, `seed-tiles.mjs` | Dev only: a disk cache for map and elevation tiles, standing in for self-hosted tiles |

Imported from the live site (one source of truth, nothing copied): the panel markup (`src/partials/gta-panel.hbs`, also used by the live section 05), its styles (`main.css .gta__*`), the places and tour (`src/js/data/places.js`), the postal table (`src/js/data/postcodes.js`) and the town lookup (`src/js/data/area.js`).

## "Do we cover you?": postal code or town

`src/js/data/area.js`. Postal codes go through the FSA table. Towns match the 28 places we serve, their communities (Georgetown, Bolton, Woodbridge, Port Credit, Bowmanville…), the region names ("York" means York Region; "York, Toronto" is the old city) and about 35 nearby towns we don't serve yet (Hamilton, Barrie, Guelph…). It forgives case, accents, "City of", a short start ("missis") and one slipped letter ("oakvile"). A region-only answer (a region name, or a postal code that only knows its region) frames the area and stays there. Unknown input gets a nudge, and the camera doesn't move.

## Data and licences

- **Map tiles:** [OpenFreeMap](https://openfreemap.org) (OpenMapTiles schema), from OpenStreetMap. Free, no key, no usage limits; donation-funded with no service guarantee, so production should self-host a GTA extract (PMTiles). Shown: © OpenStreetMap contributors · OpenFreeMap · © OpenMapTiles.
- **Terrain:** Mapzen terrarium tiles (AWS Open Data); in Canada built from NRCan's CDEM (Open Government Licence – Canada), NASA SRTM elsewhere. Shown on the map.
- **regions.geojson:** the five OpenStreetMap boundary relations (Toronto 324211, Peel 4198907, York 324214, Halton 7034889, Durham 2408843), fetched through Overpass on 2026-11-06, simplified with mapshaper (16 KB). © OpenStreetMap contributors, ODbL 1.0. (Toronto Islands are dropped by the simplification.)
- **Overpass Mono glyphs:** from the site's own font file, under its OFL licence (`public/fonts/OverpassMono-OFL.txt`).
- **Postal table:** still a placeholder until checked against Canada Post.

## Round 6 · a continuous tour

- **One motion, never stop-and-go.** The tour's camera is driven frame by frame (`camera.spin`, `camera.leg`): a slow turn runs the whole way through stops and flights and only eases to a halt when the tour pauses; each flight is laid over it. Before, every stop was orbit → dead stop → flight from rest → dead stop → orbit.
- **The flight path is flyTo's own** (van Wijk & Nuij), computed in `camera.js` (engine-neutral), with smootherstep easing (no jolt at take-off or landing), a shallower arc (peaks at z11.6 instead of 10.8, with z11 preloaded for the middle of every flight), and a duration matched to each leg's length, so long and short legs move at the same calm speed on screen. The camera lifts 15° more upright at the top of the arc and settles as it lands.
- **Hitches absorbed:** the animation's clock trims a frame that's much slower than recent ones, so a slow frame is a moment's slow-down, not a jump. A steadily slow machine keeps its normal pace.
- **Lighter per-frame updates** on MapLibre (straight on the transform, as its own animations do; internals, `jumpTo` is the fallback for other engines).
- **Measured** over the same 40s of tour, Intel UHD 630, on mains power:

| | Round 5 | Round 6 |
|---|---|---|
| Frames where the turn stops dead | 413 | 0 |
| Peak zoom speed | 24 zoom/s | 5.8 zoom/s |
| Biggest frame-to-frame jump in turn speed | 3.8°/s | 1.5°/s |
| FPS in flight | 31 | 41–43 |
| FPS overall | 47 | 47–48 |

- Cold, at 1874 px with the CPU slowed 2×: every stop still arrives fully drawn, a stop every 8–9s.

## Round 5

- **No more half-drawn arrivals.** MapLibre 5 parses every tile on one worker unless told otherwise (more only on Safari): the city came in a tile at a time, worst on battery. It now uses half the cores (2–6). The first two tour stops load while the visitor is still on the section above, and the tour never leaves a stop until the next one is loaded (up to 6s longer if it must). Tested at 1874 px, cold, CPU slowed 2×: five stops in a row, all 21–25 close-up tiles loaded at the moment each pin drops, an even 6.8s a stop.
- **Shadows** in two height bands instead of four (each band re-processes every building).
- **Paper grain** (`grain`).
- **Cost, on mains power, Downtown orbit (the densest view), Intel UHD 630:** 53 fps with everything on; depth costs about 3.5 fps, grain about 1.3 (58 with both off). First frame 0.4s.

## Round 4

- **Kraft is the pick, with depth.** Richer contrast (homes, rust-warm employment land, paper parks), cast shadows in four height bands, engraved lake contours, park edges and highway casings (`depth` toggles them all).
- **Two-way spotlight** (the pick): the outside dims (warmed with rust on Kraft) and the area glows evenly. The old one-way version is `dim`.
- **Area-level matches** (the pick): after framing and lighting the area, the camera pans calmly towards the place at about z11 and drifts; it no longer dives to street level (`match: close` keeps that).
- **Speed 0.75** is the new pick: calm without the 10s orbits of 0.6.
- Measuring note: on battery, Edge caps every page at 30 fps (a blank page included), so this round's frame rates read 30. Re-measure on mains power; round 3 ran at 58–60.

## Round 3 (polish before option B)

- **Real page:** the section runs inside the homepage (navbar, 04, 06, footer, `main.js`); options in the site's dev panel; the matched place pre-fills the real Quote ("Where"), by event and sessionStorage.
- **One source of truth:** places, coordinates, tour and region centres moved into `src/js/data/places.js` (the live section imports them too); the panel is a partial shared with the live section, which renders byte-identical.
- **Postal code or town,** as above.
- **Palettes** from the brand tokens, with Tonal the new pick. **Labels** all in Overpass Mono (HTML labels in the label style, highway numbers through our own glyphs).
- **Area highlight** in five styles, drawn from feature-state: the right area lights at once and fades in. The round-2 bug, where the previous area flashed yellow for up to 1.4s, is gone.
- **Camera:** areas are framed by their outline at the real tilt (centred in the open map); the intro waits for its first view to be drawn; the first stop waits (3s at most) for its tiles.
- **Tiles:** a priority pool (close-up tiles first, newest place first, the first two stops during the intro): stops arrive fully drawn and the pin drops within about 0.4s, no more 2.5s still holds. The pause after arrival is capped at 1.2s.
- **Pausing:** the tour pauses over the panel or the form, not the whole full-bleed section (it used to never start with the cursor over the map).
- **Pin:** a mono label on a stem, dropped onto a yellow stop.
- **Attribution:** shown in full on one line, with the terrain sources credited.
- **Site build:** `vite.config.js` loads the tile cache only for the dev server, so the build no longer depends on this folder.
