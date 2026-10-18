// check.mjs: lint every registered knot (or the ones given) and fail on errors.
// usage: node tools/check.mjs [id ...]
import { withPage } from './shot.mjs';
import { readFileSync } from 'node:fs';

const only = process.argv.slice(2);
const index = readFileSync(new URL('../src/knots/index.js', import.meta.url), 'utf8');
const files = [...index.matchAll(/from '\.\/([\w-]+)\.js'/g)].map((m) => m[1]).filter((id) => !id.startsWith('_') && (!only.length || only.includes(id)));
let failed = 0;
await withPage(async (page) => {
  for (const id of files) {
    const lint = await page.evaluate(([p]) => window.lintKnot(p), [`/src/knots/${id}.js`]);
    const status = lint.errors.length ? 'ERROR' : lint.warnings.length ? 'warn ' : 'ok   ';
    console.log(`${status} ${id}: ${lint.stepCount} steps, ${lint.total.toFixed(0)}s, ${lint.errors.length} errors, ${lint.warnings.length} warnings`);
    for (const e of lint.errors) console.log('      ERROR ' + e);
    for (const w of lint.warnings) console.log('      warn  ' + w);
    if (lint.errors.length) failed++;
  }
});
console.log(`${files.length} knots checked, ${failed} with errors`);
process.exit(failed ? 1 : 0);
