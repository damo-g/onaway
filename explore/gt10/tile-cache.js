// GT-10 exploration · a dev-server tile cache that stands in for self-hosted tiles.
// OpenFreeMap answers each tile in 0.6–1.4 s over HTTP/1.1 (six at a time), and a 60° close-up needs about a
// hundred tiles, so flights outran the tiles and went blank. The elevation tiles on AWS are just as slow.
// Production would self-host a GTA extract beside the site. Here, /__tiles/{z}/{x}/{y}.pbf (OpenFreeMap) and
// /__dem/{z}/{x}/{y}.png (elevation) fetch each tile once, keep it on disk (node_modules/.cache/gt10-tiles,
// never committed) and serve it locally after that. `node explore/gt10/seed-tiles.mjs` fills the cache.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export const TILEJSON = 'https://tiles.openfreemap.org/planet';
const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const cacheDir = (root) => resolve(root, 'node_modules/.cache/gt10-tiles');

let template = null;
export async function upstream(z, x, y, kind = 'omt') {
  if (kind === 'omt') template ??= (await (await fetch(TILEJSON)).json()).tiles[0];
  const url = (kind === 'dem' ? DEM : template).replace('{z}', z).replace('{x}', x).replace('{y}', y);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${kind} tile ${z}/${x}/${y}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

export async function getTile(root, z, x, y, kind = 'omt') {
  const file = resolve(cacheDir(root), kind === 'dem' ? `dem/${z}/${x}/${y}.png` : `${z}/${x}/${y}.pbf`);
  try {
    return await readFile(file);
  } catch {
    const data = await upstream(z, x, y, kind);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, data);
    return data;
  }
}

// Vite plugin (dev only)
export function gt10TileCache(root) {
  const serve = (kind, ext, type) => async (req, res) => {
    const m = req.url.match(new RegExp(`^/(\\d+)/(\\d+)/(\\d+)\\.${ext}`));
    if (!m) { res.statusCode = 404; return res.end(); }
    try {
      const data = await getTile(root, +m[1], +m[2], +m[3], kind);
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(data);
    } catch (err) {
      res.statusCode = 502;
      res.end(String(err));
    }
  };
  return {
    name: 'gt10-tile-cache',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__tiles', serve('omt', 'pbf', 'application/x-protobuf'));
      server.middlewares.use('/__dem', serve('dem', 'png', 'image/png'));
    },
  };
}
