// pw.mjs: find Playwright. The container has it installed globally; CI installs it locally.
let mod;
try { mod = await import('playwright'); }
catch { mod = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); }
export const chromium = mod.chromium;
