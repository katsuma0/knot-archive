// shot.mjs: render a raw scene (JSON file) or a knot module to PNG via headless Chromium.
// usage: node tools/shot.mjs scene scene.json out.png
//        node tools/shot.mjs knot src/knots/bowline.js out.png --step 2 | --t 3.5 [--size 800] [--theme dark] [--mirror]
import { chromium } from './pw.mjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args[0];
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);

export async function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    let file = resolve(root, '.' + url);
    try {
      if (statSync(file).isDirectory()) file = resolve(file, 'index.html');
      const ext = file.slice(file.lastIndexOf('.'));
      res.writeHead(200, { 'content-type': types[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
      createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end('nope'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

export async function withPage(fn) {
  const { server, base } = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('console:', m.text()); });
  try {
    await page.goto(base + '/tools/harness.html');
    await page.waitForFunction('window.__ready === true');
    return await fn(page, base);
  } finally {
    await browser.close();
    server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const size = parseInt(opt('size', '800'), 10);
  await withPage(async (page) => {
    const out = args[2];
    if (mode === 'scene') {
      const scene = JSON.parse(readFileSync(args[1], 'utf8'));
      const info = await page.evaluate(([scene, size]) => window.renderScene(scene, size), [scene, size]);
      console.log(JSON.stringify(info));
    } else {
      const modPath = '/' + args[1].replace(/^\.\//, '');
      const info = await page.evaluate(([p, o]) => window.renderKnot(p, o), [modPath, { step: opt('step', null) !== null ? parseInt(opt('step'), 10) : null, t: opt('t', null) !== null ? parseFloat(opt('t')) : null, size, theme: opt('theme', 'light'), mirror: flag('mirror') }]);
      console.log(JSON.stringify(info));
    }
    await page.locator('#c').screenshot({ path: out });
  });
}
