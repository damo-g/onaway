// GT-10 · map label glyphs in Overpass Mono, from the site's own self-hosted font (public/fonts).
// MapLibre and Mapbox draw map text from SDF glyph files ({fontstack}/{range}.pbf), not from web fonts, so the road
// numbers were in OpenFreeMap's Noto Sans. This renders the brand font into those files: each character is drawn
// with TinySDF in a real browser (Edge, through Playwright) and written in the glyphs protobuf format.
// Latin only (0–255), which covers every highway number and place name we show.
// Run once (output is committed): `node explore/gt10/build-glyphs.mjs`
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Pbf from 'pbf';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../..');
const out = resolve(import.meta.dirname, 'glyphs');
// fontstack name → weight (the variable font covers both)
const STACKS = { 'OverpassMono-SemiBold': 600, 'OverpassMono-Regular': 400 };

const font = (await readFile(resolve(root, 'public/fonts/OverpassMono-Variable.woff2'))).toString('base64');
const sdf = await readFile(resolve(root, 'node_modules/@mapbox/tiny-sdf/index.js'), 'utf8');

const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch());
const page = await browser.newPage();
await page.setContent(`<style>@font-face { font-family: "Overpass Mono"; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 100 900; }</style>`);
for (const [name, weight] of Object.entries(STACKS)) {
  const glyphs = await page.evaluate(async ({ sdf, weight }) => {
    await document.fonts.load(`${weight} 24px "Overpass Mono"`);
    const { default: TinySDF } = await import(URL.createObjectURL(new Blob([sdf], { type: 'text/javascript' })));
    // the same settings MapLibre uses for glyphs it draws itself (24 px, 3 px buffer, radius 8)
    const t = new TinySDF({ fontSize: 24, buffer: 3, radius: 8, cutoff: 0.25, fontFamily: '"Overpass Mono"', fontWeight: String(weight) });
    const list = [];
    for (let id = 32; id < 256; id++) {
      if (id >= 127 && id < 160) continue;
      const g = t.draw(String.fromCharCode(id));
      list.push({ id, bitmap: [...g.data], width: g.glyphWidth, height: g.glyphHeight, left: g.glyphLeft, top: g.glyphTop, advance: g.glyphAdvance });
    }
    return list;
  }, { sdf, weight });

  // glyphs.proto: glyphs { repeated fontstack stacks = 1 } · fontstack { name = 1, range = 2, repeated glyph glyphs = 3 }
  // glyph { id = 1, bitmap = 2, width = 3, height = 4, left = 5 (sint), top = 6 (sint), advance = 7 }
  // top: TinySDF measures from the baseline; glyph files measure from the 24 px em's top (MapLibre's own -27.5)
  const pbf = new Pbf();
  pbf.writeMessage(1, (_, p) => {
    p.writeStringField(1, name);
    p.writeStringField(2, '0-255');
    for (const g of glyphs) {
      p.writeMessage(3, (__, q) => {
        q.writeVarintField(1, g.id);
        if (g.width && g.height) q.writeBytesField(2, Uint8Array.from(g.bitmap));
        q.writeVarintField(3, g.width);
        q.writeVarintField(4, g.height);
        q.writeSVarintField(5, g.left);
        q.writeSVarintField(6, Math.round(g.top - 27.5));
        q.writeVarintField(7, Math.round(g.advance));
      });
    }
  });
  await mkdir(resolve(out, name), { recursive: true });
  const buf = pbf.finish();
  await writeFile(resolve(out, name, '0-255.pbf'), buf);
  console.log(`${name}: ${glyphs.length} glyphs, ${(buf.length / 1024).toFixed(1)} KB`);
}
await browser.close();
