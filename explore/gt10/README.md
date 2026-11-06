# GT-10 · 3D map exploration

Exploration pages for homepage section 05 (docs/gt10-3d-map-context.md). Never linked from the site and not part of `npm run build`.

## Run

- `npm run dev`, then http://localhost:5173/explore/gt10/a-maplibre.html
- On a phone: `cloudflared tunnel --url http://localhost:5173`, then open the printed `https://….trycloudflare.com` address with `/explore/gt10/a-maplibre.html` on the end. (Vite allows `*.trycloudflare.com`, see vite.config.js.)
- Options can go in the URL, e.g. `?layout=card&buildings=flat&pitch=60`; the toolbar remembers them in this browser.

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

Each option gets its own page (b-mapbox next), sharing only the data and the camera, so their settings can diverge freely.

## Data and licences

- **Map tiles:** [OpenFreeMap](https://openfreemap.org) (OpenMapTiles schema), from OpenStreetMap. Free, no key, no usage limits; donation-funded with no service guarantee, so production should self-host a GTA extract (Protomaps PMTiles on cPanel). Attribution: © OpenStreetMap contributors, OpenFreeMap, OpenMapTiles (shown by the map).
- **regions.geojson:** the five boundary relations from OpenStreetMap (Toronto 324211, Peel Region 4198907, York Region 324214, Halton Region 7034889, Durham Region 2408843), fetched through the Overpass API on 2026-11-06, converted with osmtogeojson and simplified to 18% with mapshaper (16 KB, 4 KB gzipped). © OpenStreetMap contributors, ODbL 1.0 (attribution shown on the map: "Regions © OpenStreetMap contributors"). The lake trims them to the shore because the region layers sit under the water layer. (Statistics Canada's census division file was the first choice; its download refuses non-browser clients.)
- **Postal table:** the live one, still a placeholder until checked against Canada Post.

## Scorecard · option A (context §8)

Measured 2026-11-06 on a production build of this page served gzipped. Desktop: Intel UHD 620 laptop GPU. Phone: Pixel 7 emulation on the same machine (real phone numbers: read the FPS meter through the tunnel).

| Criterion | Score | Notes |
|---|---|---|
| Brand fit | 88 | Paper land, quiet lake, camel rivers, Carbon highways, warm-grey buildings, no POIs. Place and region names in Instrument Sans (HTML labels). Road numbers are Noto Sans until Overpass Mono glyphs are self-hosted |
| Immersion | 86 | Downtown towers read beautifully under the low sun; OpenStreetMap heights are thinner in the suburbs (Oshawa, Pickering are mostly low boxes) |
| Clarity | 90 | Arrive → yellow column rises → region tint → highlighter writes → place label; outside the area pulls back to the whole GTA |
| Motion | 88 | One move at a time, no bounce; tiles of a first-visited place can pop in during the fly (production: preload the ten tour places) |
| Performance | 80 | MapLibre 273 KB gzipped (220 KB brotli), loaded only near the section, so outside the 120 KB page budget; page code 12.7 KB. First frame 0.40s desktop, 0.97s phone on 4G, 5.1s worst case (4× slower CPU on 1.6 Mbps). FPS median 60 desktop, 59 phone on 4G, 12 in the worst case while tiles stream |
| Cost and licensing | 95 | Free, no account, no key, no logo; OSM attribution only |
| Build effort | 85 | The behaviour is done here. For production: self-hosted tiles and glyphs, a poster image and no-WebGL fallback, wiring into section 05 |
| **Overall** | **87** | |
