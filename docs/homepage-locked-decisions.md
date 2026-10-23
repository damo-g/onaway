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

## Post-build
- GT-09 map: replace hand-drawn mock with OpenStreetMap vector data in MapLibre GL, styled to tokens, flyTo on match, credit © OpenStreetMap contributors.
- Postal-code → area mapping must be verified against Canada Post before launch.
- OT-05 images: grade all four to OV-01 and add matching grain before export.
- FT-02 Windows shader: WebGL fragment shader (see ft02-window mock); still frame for reduced motion; fall back to the flat wordmark if WebGL is unavailable.
- Placeholder contact details, socials and business number in the footer must be replaced with real ones.
