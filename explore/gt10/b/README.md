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
| palette | **brandlut** · kraft · overcast · ticket · carbon · faded · monochrome · standard | Brand LUT: Standard's colours re-drawn through a grade made from the five brand colours (the pick). Kraft: camel-warm land, paper parks and lake. Overcast: after OV-01, the hero's painted Toronto. Ticket paper. Carbon night. Mapbox's own Faded, Monochrome and default, for reference |
| light | **live** · palette · day · dawn · dusk · night | live: from the current Toronto time (sunrise and sunset worked out for the date; dawn and dusk are the 45 minutes either side), re-checked on the hour |
| objects | **all** · facades · no-trees · flat | 3D buildings, landmarks and trees. facades adds Standard's detailed facades (about 10 fps at z16 for little visible gain); flat turns 3D off |
| labels | **places** · none · all | Standard's place labels; all adds road labels and footpaths. Transit labels are always off |
| poi | **on** · landmarks · off | Points of interest: the icons and names of shops, restaurants, parks, schools and landmarks on the map (on, as in the Mapbox reference), landmark icons only, or none |
| names | **off** · ours | Our area names (City of Toronto, Peel…) in Overpass Mono on the wide views |
| font | **din** · mono | Standard's label font: DIN Pro, or Roboto Mono |
| texture | **soft-grain** · grain · airbrush · none · (each logo texture) | Soft gradient grain (the pick), after airbrushed illustration: broad soft tones built from a fine spray of grain that gathers where the tone deepens. Grain: option A's paper grain. Airbrush: broad soft clouds |
| placement | **screen** · ground · both | Over the map (multiply, then soft-light, each made neutral) or laid on the ground in Standard's bottom slot |
| opacity | **10** · 20 · 30 · 40 · 0 | Texture strength (%); the map editor's slider sets it finely |
| mark | **lit** · glow · label · sign · pin · none | How the place is marked once the camera is there. lit: the buildings around it light up, nearest first, over a soft pool of light. glow: a pool of light on the ground. label: Standard's own label for the town turns rust. sign: the name floating. pin: the name on a stem (option A's). none |
| highlight | **spotlight** · tint · outline | The matched area, as option A |
| match | **close** · area | After framing the area: down into the city (close, the pick here: the 3D is the point of B), or option A's calm area-level pan |
| closeness | **16** · 16.5 · 15.5 · 15 | How close the stops sit. Standard draws its everyday buildings from z15 and stands them fully, with trees, from about z16 |
| stop | **drift** · orbit | At each stop the camera glides slowly forward over the city as it turns (drift), or only turns |
| layout | **card** · veil | The panel as a card (the pick here) or option A's veil |
| card | **light** · auto | light: the card stays on paper whatever the map does. auto: it turns dark with Carbon, dusk or night |
| pitch | **60** · 50 · 45 | Camera tilt; the biggest single cost on frame rate |
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

- **3D needs z16.** Below z15 Standard draws only the tallest towers (why Vaughan showed a few and Burlington and Oshawa none); its everyday buildings stand from z15 and fully from about z16. B's stops sit at z16 and its flights rise only to about z12.4. Every tour stop now shows a 3D city.
- **The colour grade doesn't reach the 3D landmark models:** the CN Tower and the glass towers keep their own light blue-grey in every palette, the brand LUT included. That suits Overcast (OV-01's towers are blue-grey glass); it's the main limit on brand control in the warm palettes.
- **Trees are a data gap:** Standard draws trees where they're mapped (Paris is mapped densely); across the GTA almost none are, so even Mapbox's own default style shows no trees in central Oakville at z16.5. Not a setting.
- **Tiles:** Mapbox's CDN is fast, and `jumpTo({ preloadOnly: true })` (public) loads the next stop's tiles ahead, so no internals are needed for preloading. Empty landmark tiles come back as 404s (normal, ignored by the map).
- **Frame rate** (Intel UHD 630, on mains power, the shared tour measurement), at z16 and 60°: 39 fps without facades, 29 with. Earlier, at z15: 37 fps at 60°, about 45 at 45°. The tilt and the 3D detail in view are the costs; turning trees off changes nothing.
