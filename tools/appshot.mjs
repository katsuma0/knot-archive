// appshot.mjs: screenshot the app. usage: node tools/appshot.mjs out.png [--route '#/knot/bowline'] [--width 390] [--height 844] [--dark] [--full] [--t 3.2]
import { startServer } from './shot.mjs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const args = process.argv.slice(2);
const out = args[0];
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const { server, base } = await startServer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +opt('width', 390), height: +opt('height', 844) }, deviceScaleFactor: 2, colorScheme: args.includes('--dark') ? 'dark' : 'light' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(base + '/' + opt('route', '#/'));
await page.waitForTimeout(600);
if (opt('t', null) !== null) {
  await page.evaluate((t) => { const r = document.querySelector('input[type=range]'); if (r) { r.value = String(t); r.dispatchEvent(new Event('input')); } }, +opt('t'));
  await page.waitForTimeout(150);
}
await page.screenshot({ path: out, fullPage: args.includes('--full') });
console.log(JSON.stringify({ errors, title: await page.title() }));
await browser.close(); server.close();
