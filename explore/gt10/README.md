# GT-10 · 3D map exploration

Exploration pages for homepage section 05 (docs/gt10-3d-map-context.md). Never linked from the site and not part of `npm run build`.

## Run

- `npm run dev`, then http://localhost:5173/explore/gt10/a-maplibre.html
- On a phone: `cloudflared tunnel --url http://localhost:5173`, then open the printed `https://….trycloudflare.com` address with `/explore/gt10/a-maplibre.html` on the end. (Vite allows `*.trycloudflare.com`, see vite.config.js.)
- Options can go in the URL, e.g. `?layout=card&buildings=flat&pitch=65&speed=0.45`; the toolbar remembers them in this browser.
- **Tiles:** in dev the map loads its tiles through the dev server (`/__tiles`, `/__dem`, see `tile-cache.js`), which keeps each one on disk in `node_modules/.cache/gt10-tiles`. Run `node explore/gt10/seed-tiles.mjs` once (about 1,250 tiles, 10 MB, a few minutes) so the first flights are already smooth. Without seeding, the first visit to each place fills the cache.

## Files

| File | What it is |
|---|---|
| `a-maplibre.html`, `a-maplibre.js` | Option A: MapLibre GL v5 + OpenFreeMap tiles, its review toolbar |
| `maplibre-style.js` | Option A's map style (context §5) |
| `camera.js` | The camera moves of context §3 (intro, fly-to, orbit, tour, pull-back, reduced motion). Engine-neutral: option B reuses it |
| `places.js` | The live section's places as real coordinates, its tour and region centres, region label positions |
| `postcodes.js` | Re-exports the live postal table (one source of truth) |
| `regions.geojson` | The five areas |
| `gt10.css` | Toolbar, the section, the two panel layouts, the map labels |
| `tile-cache.js`, `seed-tiles.mjs` | Dev only: a disk cache for map and elevation tiles, standing in for self-hosted tiles, and the script that fills it |

Each option gets its own page (b-mapbox next), sharing only the data and the camera, so their settings can diverge freely.

## Data and licences

- **Map tiles:** [OpenFreeMap](https://openfreemap.org) (OpenMapTiles schema), from OpenStreetMap. Free, no key, no usage limits; donation-funded with no service guarantee, so production should self-host a GTA extract (Protomaps PMTiles on cPanel). Attribution: © OpenStreetMap contributors, OpenFreeMap, OpenMapTiles (shown by the map).
- **regions.geojson:** the five boundary relations from OpenStreetMap (Toronto 324211, Peel Region 4198907, York Region 324214, Halton Region 7034889, Durham Region 2408843), fetched through the Overpass API on 2026-11-06, converted with osmtogeojson and simplified to 18% with mapshaper (16 KB, 4 KB gzipped). © OpenStreetMap contributors, ODbL 1.0 (attribution shown on the map: "Regions © OpenStreetMap contributors"). The lake trims them to the shore because the region layers sit under the water layer. (Statistics Canada's census division file was the first choice; its download refuses non-browser clients.)
- **Postal table:** the live one, still a placeholder until checked against Canada Post.

## Round 2 (after review)

- **Angles:** pitch 45 · 55 · 60 (default) · 65 · 70. **Speeds:** Normal 1 · Calm .75 · Slow .6 (default) · Slower .45 · Slowest .35.
- **The flicker between places:** the camera outran the tiles. OpenFreeMap serves each tile in 0.6–1.4 s, six at a time, and a 60° close-up needs about a hundred; MapLibre also only keeps about 60 tiles out of view, so it threw away the ones fetched ahead. Fixes: tiles come from a local cache; each next stop is loaded into the map's memory while the current one is on screen (and the whole GTA after the intro); the map keeps up to 40 views' worth of tiles; flights rise to zoom 10.8 between places, where the whole GTA is already loaded. Measured on 26 s of tour flights: frames that are mostly empty went from **15.3% to 0%**.
- **Buildings only in Toronto:** they were drawn only from zoom 13.8, and other stops sat lower. Every stop now sits at about 13.9 and buildings stand at full height from 13.1. Low suburban houses are lifted a little (6 m reads as 11 m) so Oshawa and Brampton have relief.
- **Match:** the column and the region tint are gone. The camera frames the whole area and draws its outline in yellow on a soft Carbon casing, the highlighter writes the place, then the camera goes down to it and circles slowly.
- **Palette:** quiet land-use tones (homes, work, parks in camel-warmed steps), terrain shading from open elevation data (the Escarpment, the Oak Ridges Moraine), a camel shoreline, a wider building ramp to a deep warm grey, pencil footprints close up.
- **Production:** the preloading uses MapLibre internals (`_loadTile`, the out-of-view cache), so the version must be pinned. It also needs self-hosted tiles: a GTA extract as PMTiles (vector and elevation) beside the site, served from onaway.ca over HTTP/2.

## Scorecard · option A (context §8)

Measured 2026-11-06 on a production build of this page served gzipped. Desktop: Intel UHD 620 laptop GPU. Phone: Pixel 7 emulation on the same machine (real phone numbers: read the FPS meter through the tunnel).

| Criterion | Score | Notes |
|---|---|---|
| Brand fit | 88 | Paper land, quiet lake, camel rivers, Carbon highways, warm-grey buildings, no POIs. Place and region names in Instrument Sans (HTML labels). Road numbers are Noto Sans until Overpass Mono glyphs are self-hosted |
| Immersion | 90 | Round 2: 60° default, terrain shading and lifted suburban heights; every stop has buildings. Downtown is still the richest |
| Clarity | 92 | Round 2: frame the area → yellow outline → highlighter → down to the place → label; outside the area pulls back to the whole GTA |
| Motion | 92 | Round 2: flights stay drawn the whole way (0% empty frames, with the local cache and preloading); one move at a time, no bounce |
| Performance | 80 | MapLibre 273 KB gzipped (220 KB brotli), loaded only near the section, so outside the 120 KB page budget; page code 12.7 KB. First frame 0.40s desktop, 0.97s phone on 4G, 5.1s worst case (4× slower CPU on 1.6 Mbps). FPS median 60 desktop, 59 phone on 4G, 12 in the worst case while tiles stream |
| Cost and licensing | 95 | Free, no account, no key, no logo; OSM attribution only |
| Build effort | 85 | The behaviour is done here. For production: self-hosted tiles and glyphs, a poster image and no-WebGL fallback, wiring into section 05 |
| **Overall** | **89** | Round 1 was 87 |
