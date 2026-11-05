// Serves the built site (dist/) the way the live .htaccess does: /moving/ and /moving → moving.html, the 404 page
// for anything else. `npm run build && npm run site` → localhost:4173. Use it to review the page transitions:
// in `npm run dev` they only show the default crossfade (Vite adds the CSS after the first frame), and
// `vite preview` sends every clean URL to the homepage.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.avif': 'image/avif', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.txt': 'text/plain', '.ico': 'image/x-icon' };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/') path = '/index.html';
  else if (!extname(path)) path = `${path.replace(/\/$/, '')}.html`;
  const file = join(root, path);
  try {
    if (!file.startsWith(root)) throw new Error('outside');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': TYPES['.html'] });
    res.end(await readFile(join(root, '404.html')).catch(() => 'Not found'));
  }
}).listen(4173, () => console.log('The built site: http://localhost:4173'));
