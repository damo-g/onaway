// Usage: npm run shots -- [page] [--grid]   e.g. npm run shots -- tokens.html --grid
// Screenshots a page on the running dev server at the check widths into screenshots/.
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const page = args.find((a) => !a.startsWith('--')) ?? 'index.html';
const grid = args.includes('--grid');
const base = process.env.BASE_URL ?? 'http://localhost:5173';
const widths = [1512, 1280, 768, 390];

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();

for (const width of widths) {
  const tab = await browser.newPage({ viewport: { width, height: 860 }, reducedMotion: 'reduce' });
  await tab.goto(`${base}/${page}`, { waitUntil: 'networkidle' });
  await tab.evaluate(() => document.fonts.ready);
  if (grid) await tab.keyboard.press('g');
  const name = `screenshots/${page.replace(/\.html$/, '')}-${width}${grid ? '-grid' : ''}.png`;
  await tab.screenshot({ path: name, fullPage: true });
  console.log(name);
  await tab.close();
}

await browser.close();
