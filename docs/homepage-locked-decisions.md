# ONAWAY Homepage — Locked Decisions

Desktop 1512 × 860 · 12 columns · mocks drawn on a 20 margin (Brand Guide says 64/24 — settle per ONAWAY Build Context §2) · Instrument Sans SemiCondensed + Overpass Mono only (Glasgow dropped). Build stack, tokens and conditions: see **ONAWAY Build Context**.

| # | Section | Locked version | Key settings | Fallback |
|---|---|---|---|---|
| 01 | Hero | HF-01 Hero Flow (pinned) | Plate 20,20,1472×630; navbar docks clear; wordmark 110→36 at 80%; zoom 1.00→1.25; overcast OV-01 | Scroll-past mode |
| 02 | Services | R2-E Station Signs to Board | Light environment, dark signs, chained, icon left, straight arrows; facts 2 HR QUOTE / WE WRAP IT / GTA-WIDE; pinned scroll scrub (signs → board); generous bottom padding (≥ 89 below the signs) | — |
| 03 | Three steps. No surprises. | TS-02 Journey Ticket | Stamp · subtle edge (3px bites every 10px), W symbol centred in 56px stub, Write-in animation, real tear-off CTA | Unroll + write |
| 04 | On time & in writing | OT-05 On the Way | Promise ledger + 4-image carousel C1 → G2 → F2 → G3 (crew, no tag); starts after write-in, 6s/slide, plays once | OT-03 Marked Statements (highlighter) |
| 05 | Across the GTA | GT-09 We'll Be There | Overlay layout, Light tone, Map mock, Tour idle, Place zoom; postal check flies map to place | GT-01 Grid |
| 06 | Get a free quote | QC-02 Say It in a Sentence | Centre poster layout, Dark, Route background with X and O marks (subtle drift + travelling square); 45% yellow highlight; button 76 tall, 70% yellow while waiting, label states the missing step; postcode picker tags the area. **Inset Carbon panel with a 20px paper (floral white) margin each side** because the content is centred | — |
| 07 | Footer | FT-02 Window (round 4) | **Full width, full height Carbon, no margin.** Hanging columns · Windows shader fill in the wordmark · Plain background · "We'll take it from here." · Arrive signal · Signal hover; live Toronto time; mono contact. Generous paper gap (144) between 06 and 07 | FT-02 with Overcast fill · FT-01 Colophon |

## Rules confirmed along the way
- Numbers for step markers; no eyebrows; CTA wording "Get a free quote".
- Dot matrix kept for numbers/times only; avoid overuse.
- Image style: high-detail digital painting matching OV-01 (near-photoreal at distance, painterly up close), bright overcast late October, no text/logos, plain white trucks.
- People allowed only seen from behind / faces turned away (G3).
- Motion: one thing at a time, left to right, ease-out; reduced motion shows end states. Smooth scroll with Lenis.
- Whitespace: airy is a requirement; spacing only from 8 · 13 · 21 · 34 · 55 · 89 · 144; nothing closer than 34 to a section edge.
- The yellow square is the brand's signal: the wordmark's full stop in the footer and the hover marker on footer rows.
- The journey ticket (perforated, stamped) is reserved for the quote page's confirmation state (QC-01 parked). Future idea: preview the confirmation ticket, with a final "reserve" action that turns it into a receipt.
- Quote-page form takes its pattern from QC-05: one question per screen, an editable answer trail, skip links, homepage answers carried over.
- Retired: QC-03, QC-04 (its poster hierarchy lives on in QC-02), FT-03, FT-04; GT-02, GT-03, GT-05.

## Decided in the build (October 23)
- Navbar is fixed. Docked, it is as tall as its buttons: **88px** on xl (1280+), **80px** on tablet, **72px** on mobile. The **Carbon call button** (+1 347 777 2380, placeholder) and the yellow quote button sit in their own container, full bar height and flush right with no margin. In hero state A the buttons keep that size (88 / 80 / 72), centred in the tall bar and inset by the page margin, never the logo's height. Nav links are centred in the space between the wordmark and FR.
- After the hero the navbar sits on paper (locked); the clear alternative switches its text colour over dark sections. Buttons keep their fills.
- Hero at rest uses the section image's copy and layout: centred "Steady hands / at your door", description "Cleaning, Moving & Delivery for homes and businesses across the GTA" (h3 size), three service cards on the 4/4/4 split.
- Hero mobile: same pinned scrub with a shorter bar (89 → 72), headline at h1, cards stacked.
- Services (R2-E) backdrops: **EL-01** (light, locked) plus review alternatives EL-02 (light, two windows), ED-03 and ED-04 (dark). Sources are the 2304 × 1856 plates; the beam sits at the same height in all four.
- Services header sits nav height + 55 below whatever is above it (the hero as it scrolls in, the navbar once pinned; + 34 on phones). The section pins at the top, the beam sits 55 under the header (34 on phones), the plate always reaches the bottom of the screen, and the hanging signs shrink if needed so the bottom sign clears the fold by 34. End-state rows are 144 tall with an 89 tile (110 on phones, no dot-matrix fact).
- Favicon: the W symbol on a transparent background, Carbon, switching to Ticket Paper in dark browser themes.
- Hero state A follows the HF-01 inspiration: the plate ends 144 above the bar on desktop (89 tablet, 55 phone), and the descriptor "Cleaning, Moving & Delivery across the GTA" sits at the foot of that gap, just above the wordmark.
- Steps (TS-02, round 4): intro on the left 4 columns, ticket on columns 6–12 with a breathing column between (body + 152 tear-off, 500 tall). About 233 of paper between the R2-E board and the heading (steps counts the paper the board leaves under itself; at least 55 of its own). Stamp · subtle edge, the symbol (W knocked out of a circle, 60% Carbon) centred in the stub, Write-in once on entry. The tear-off pulls away on hover and links to the quote page. On phones the ticket stands upright: stub on top, steps stacked, tear-off along the bottom seam.
- Promises (OT-05): carousel first, on columns 1–4 at the 602 × 820 proportion (about 477 × 650 at 1512), never taller than the screen; copy and ledger fill columns 6–12 on the right, credentials at their foot. Carousel plays once after the write-in (starts at 2.6s, 6s a slide), pauses on hover, keyboard focus and when under 40% visible; bars jump to a slide; the crew slide has no tag.
- Across the GTA (GT-09): built on the hand-drawn SVG map from the mock (MapLibre stays post-build). Full-width map (bleed) 560 tall with the overlay panel inset by the page margin (400 minimum on short screens); the sentence is h1 (68) so the title block fits; region tint 12%. The idle tour runs once through the ten places at 3.4s a stop, then rests wide on "the GTA"; it pauses on hover, focus and when off screen. A successful postal check stores { fsa, region, place } in sessionStorage (onaway:where) for the quote section. The postcode → area table lives in src/js/data/postcodes.js and is a placeholder until verified against Canada Post.
- Quote (QC-02, round 4): centre poster on the dark inset panel, tight and editorial (89 padding top and bottom, about 600 tall at 1512); "Get a free quote." (display), the sentence "I need [a hand] in [your area] [sometime soon]." at 60 (h3 on phones), route background with X and O marks. Area pre-fills from the GTA check. The button is 76 tall, 70% yellow until a service and an area are chosen, and its label names the missing step. "By" time is Toronto time + 2 hours (10 AM outside 8–6). Sending shows "Got it. One more page." and saves the answers (sessionStorage onaway:quote) for the quote page, which will take over once built.
- Footer (FT-02 round 4): full width, one screen tall, Carbon. "We'll take it from here." as an editorial line (h2 42, weight 500), live Toronto time, hanging columns on the grid (Follow 1–3, Explore 7–9, Contact 10–12), legal line, and the wordmark (the supplied SVG as a mask) filled with the Windows WebGL shader, the yellow square arriving beside it. Signal hover on rows. The shader animates only while visible, draws a still frame under reduced motion and falls back to flat Paper without WebGL. Footer CALL uses the nav's number; all contact details remain placeholders.
- Navbar Services: a Paper drop styled like the footer columns (hairline rows with arrows, Signal hover), opening on hover or click; it opens upward while the bar sits on the fold (hero state A) and downward once docked. Escape and clicking away close it.

## Post-build
- GT-09 map: replace hand-drawn mock with OpenStreetMap vector data in MapLibre GL, styled to tokens, flyTo on match, credit © OpenStreetMap contributors.
- Postal-code → area mapping must be verified against Canada Post before launch.
- OT-05 images: grade all four to OV-01 and add matching grain before export.
- Placeholder contact details, socials and business number in the footer must be replaced with real ones.
