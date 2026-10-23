// Usage: npm run shots -- [page] [--grid] [--panel] [--widths=1512,390]
// Screenshots a page on the running dev server into the OS temp folder (never the repo).
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const page = args.find((a) => !a.startsWith('--')) ?? 'index.html';
const grid = args.includes('--grid');
const panel = args.includes('--panel');
const widthsArg = args.find((a) => a.startsWith('--widths='));
const widths = widthsArg ? widthsArg.slice(9).split(',').map(Number) : [1920, 1512, 1280, 768, 390];
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const outDir = process.env.SHOTS_DIR ?? join(tmpdir(), 'onaway-shots');

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();

for (const width of widths) {
  const tab = await browser.newPage({ viewport: { width, height: 860 }, reducedMotion: 'reduce' });
  await tab.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await tab.goto(`${base}/${page}`, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  if (grid) await tab.keyboard.press('g');
  if (panel) await tab.locator('#onaway-dev .fab').click();
  const suffix = `${grid ? '-grid' : ''}${panel ? '-panel' : ''}`;
  const name = join(outDir, `${page.replace(/\.html$/, '').replace(/\W+/g, '-')}-${width}${suffix}.png`);
  await tab.screenshot({ path: name, fullPage: !panel });
  console.log(name);
  await tab.close();
}

await browser.close();
