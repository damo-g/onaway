# GT-10 · option B · Mapbox Standard

Option B of the GT-10 exploration (docs/gt10-3d-map-context.md): the same section, page and behaviour as option A, on Mapbox GL JS v3 with the Standard style: real lighting, 3D buildings, landmarks and trees. Never linked from the site and not part of `npm run build`. Branch `explore/gt10-b`.

## Run

- The token: `VITE_MAPBOX_TOKEN=pk.…` in `.env.local` at the project root (git-ignored). Restart `npm run dev` after creating or changing it.
- `npm run dev`, then http://localhost:5173/explore/gt10/b/b-mapbox.html
- **Options:** the site's dev review panel (round button, bottom right) under `gt10b` while the section is in view; the first value of each is the pick. In the URL too, e.g. `?gt10b.palette=overcast&gt10b.light=dusk`.
- **Map editor** (bottom left, dev only): colour pickers for land, water, green space, roads, motorways, buildings and labels; the texture opacity (0–40%); the live light status; **Copy config** (the chosen colours as JSON) and Reset colours.

## Options (dev panel → gt10b)

| Option | Values (pick first) | What it changes |
|---|---|---|
| palette | **kraft** · overcast · ticket · carbon · brandlut · faded · monochrome · standard | Kraft: camel-warm land, paper parks and lake (like option A). Overcast: after OV-01, the hero's painted Toronto: grey-green ground, slate water, autumn grade, haze. Ticket paper: paper land, quiet lake, carbon roads. Carbon night: carbon land, paper lines (the section turns dark). Brand LUT: Standard's colours re-drawn through a grade made from the five brand colours. Faded, Monochrome, default: Mapbox's own themes, for reference |
| light | **palette** · live · day · dawn · dusk · night | The light preset. palette: the one that suits the palette (night for Carbon, day for the rest). live: from the current Toronto time (sunrise and sunset worked out for the date; dawn and dusk are the 45 minutes either side), re-checked on the hour. Dusk and night turn the section dark |
| objects | **all** · facades · no-trees · flat | 3D buildings, landmarks and trees; facades adds Standard's detailed building facades; flat turns 3D off |
| labels | **places** · none · all | Standard's place labels; all adds road labels and footpaths. Transit labels are always off |
| poi | **off** · landmarks · on | Points of interest: landmark icons only (CN Tower, Union Station…), or every POI |
| names | **ours** · off | Our area names (City of Toronto, Peel, York, Halton, Durham) in Overpass Mono on the wide views |
| font | **din** · mono | Standard's label font: DIN Pro, or Roboto Mono (Overpass Mono isn't one Standard offers) |
| texture | **airbrush** · grain · none · (each logo texture) | Airbrush: broad, soft clouds of paper, camel and warm camel with film grain. Grain: the paper grain from option A. Logo textures appear here once added to `textures/` |
| placement | **screen** · ground · both | Screen: over the map (multiply, then soft-light, each made neutral so the map isn't washed out). Ground: laid on the map through Standard's bottom slot, so it moves with the map |
| opacity | **20** · 10 · 30 · 40 · 0 | Texture strength (%); the map editor's slider sets it finely |
| highlight | **spotlight** · tint · outline | As option A: two-way spotlight (outside dims, the area glows evenly), a yellow wash, or the bold border |
| match | **area** · close | As option A |
| closeness | **15** · 14.5 · 16 | How close the tour's stops sit. Standard raises its 3D buildings from z14.5 and fully at z15 |
| layout | **veil** · card | As option A |
| pitch | **50** · 60 · 45 | Camera tilt at the stops; the biggest single cost on frame rate |
| orbit, speed | on · off · 0.75 · 1 · 0.6 | As option A |

## Files (in this folder)

| File | What it is |
|---|---|
| `b-mapbox.html`, `b-mapbox.js` | The page and the Mapbox side: the basemap config, our layers in Standard's slots, textures, the map editor, the adapter for the shared controller |
| `presets.js` | The eight palettes (Standard colour config mixed from the brand tokens), the colour grades and how they're turned into LUT images, and live Toronto light |
| `b.css` | Screen textures, Mapbox's attribution and logo, the map editor |
| `textures/` | Drop the logo-work textures here (PNG, JPG, WebP); each becomes a texture option, made seamless |

Shared with option A (one level up, imported, never copied): `section.js` (behaviour), `camera.js` (the continuous tour camera), `areas.js`, `overlays.js` (the highlight fade, labels and pin, panel padding), `texture.js`, `meter.js`, `colors.js`, `places.js`, `regions.geojson`, `gt10.css`, and from the site: the panel partial, the places and tour, the postal and town lookup.

## Findings

- **3D starts at z15.** Standard raises its 3D buildings from about z14.5 and fully at z15, so B's stops sit at z15 (A's sit just under z14).
- **The colour grade doesn't reach the 3D landmark models:** the CN Tower and the glass towers keep their own light blue-grey in every palette, the brand LUT included. That suits Overcast (OV-01's towers are blue-grey glass); it's the main limit on brand control in the warm palettes.
- **Trees are sparse:** Standard draws trees mostly where they're mapped individually, so the suburbs show few. OV-01's autumn canopy can't be reproduced.
- **Tiles:** Mapbox's CDN is fast, and `jumpTo({ preloadOnly: true })` (public) loads the next stop's tiles ahead, so no internals are needed for preloading. Empty landmark tiles come back as 404s (normal, ignored by the map).
- **Frame rate** (Intel UHD 630, on mains power, the shared tour measurement): 37 fps at z15 with 60° tilt, about 45 fps at 45° (z14: 47–53 fps, but the 3D city is gone there). The tilt and the 3D detail in view are the costs; turning trees off changes nothing.
