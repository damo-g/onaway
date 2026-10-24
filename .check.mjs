import { chromium } from 'playwright';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1512, height: 860 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto('http://localhost:5173/404.html?motion=reduce', { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(800);
await p.screenshot({ path: join(tmpdir(), 'onaway-shots', '404.png') });
console.log(errs.join('|') || 'no errors');
await b.close();
