// render.mjs: contact sheet + per-step PNGs + lint report for one knot.
// usage: node tools/render.mjs src/knots/bowline.js [--out DIR] [--size 420] [--mids 2] [--theme light] [--mirror]
// Writes DIR/sheet.png (all steps and mid-tween frames), DIR/step-N.png (end of each step at 800px) and DIR/lint.json.
import { withPage } from './shot.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const file = args[0];
if (!file) { console.error('usage: node tools/render.mjs src/knots/<id>.js [--out DIR]'); process.exit(1); }
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes('--' + name);
const id = file.replace(/.*\//, '').replace(/\.js$/, '');
const out = resolve(opt('out', `renders/${id}`));
mkdirSync(out, { recursive: true });
const size = parseInt(opt('size', '400'), 10);
const mids = parseInt(opt('mids', '2'), 10);
const theme = opt('theme', 'light');
const mirror = flag('mirror');
const modPath = '/' + file.replace(/^\.\//, '');

await withPage(async (page) => {
  const lint = await page.evaluate(([p]) => window.lintKnot(p), [modPath]);
  writeFileSync(resolve(out, 'lint.json'), JSON.stringify(lint, null, 2));
  const sheet = await page.evaluate(([p, o]) => window.renderSheet(p, o), [modPath, { size, mids, theme, mirror }]);
  await page.locator('#c').screenshot({ path: resolve(out, 'sheet.png') });
  for (let s = 0; s < lint.stepCount; s++) {
    await page.evaluate(([p, o]) => window.renderKnot(p, o), [modPath, { step: s, size: 800, theme, mirror }]);
    await page.locator('#c').screenshot({ path: resolve(out, `step-${s}.png`) });
  }
  const lines = [];
  lines.push(`knot ${lint.id}: ${lint.stepCount} steps, ${lint.total.toFixed(1)}s, ${lint.errors.length} errors, ${lint.warnings.length} warnings`);
  for (const e of lint.errors) lines.push('  ERROR ' + e);
  for (const w of lint.warnings) lines.push('  warn  ' + w);
  for (const s of lint.steps) {
    lines.push(`  step ${s.index} "${s.title}": ${s.crossings} crossings${s.conflicts ? ', ' + s.conflicts + ' CONFLICT' : ''}${s.cycles ? ', ' + s.cycles + ' CYCLE' : ''}, length ${Object.entries(s.lengths).map(([k, v]) => k + '=' + v.toFixed(0)).join(' ')}${s.tangential ? ', ' + s.tangential + ' shallow crossings' : ''}${s.ambiguous ? ', ' + s.ambiguous + ' ambiguous z' : ''}`);
    if (args.includes('--verbose')) {
      for (const c of s.crossings_list) lines.push('      ' + c);
      for (const [id, seq] of Object.entries(s.sequence)) if (seq) lines.push(`      along ${id}: ${seq}`);
    }
  }
  console.log(lines.join('\n'));
  console.log(`sheet: ${resolve(out, 'sheet.png')} (${sheet.tiles} tiles)`);
});
