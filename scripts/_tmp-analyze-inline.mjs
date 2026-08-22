import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const SKIP = new Set(['.git', 'node_modules', 'dist', 'deliverables']);
function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else if (e.name.endsWith('.html')) cb(full);
  }
}
const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
let total = 0;
const bySig = new Map();
const files = [];
walk(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  const t = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = scriptRe.exec(t)) !== null) {
    const attrs = m[1];
    const body = m[2];
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/application\/ld\+json/i.test(attrs)) continue;
    if (/\btype\s*=/i.test(attrs) && !/text\/(javascript|template)|module/i.test(attrs)) continue;
    total++;
    const trimmed = body.trim();
    const first = trimmed.split('\n')[0].trim().slice(0, 120);
    let sig = 'OTHER';
    if (/var k="toolbox_likes"/.test(trimmed)) sig = 'LIKE_IIFE';
    else if (/document\.querySelectorAll\("\[data-i18n\]"\)/.test(trimmed)) sig = 'I18N_INIT';
    else if (/document\.querySelectorAll\("<data-i18n>"\)/.test(trimmed)) sig = 'I18N_MOJIBAKE';
    else if (/let chartInstance = null;/.test(trimmed) && /getCategoryLabel/.test(trimmed) && /ƫ/.test(trimmed)) sig = 'CHART_MOJIBAKE';
    else if (/let chartInstance = null;/.test(trimmed) && /getCategoryLabel/.test(trimmed)) sig = 'CHART_CATEGORY';
    else if (/let chartInstance = null;/.test(trimmed)) sig = 'CHART';
    else if (/function toggleMode\(\)/.test(trimmed)) sig = 'TOGGLE_MODE';
    else if (/updateUnits\(\);setTimeout\(doConvert, ?100\)/.test(trimmed)) sig = 'UNIT_CONVERTER';
    bySig.set(sig, (bySig.get(sig) || 0) + 1);
    files.push({ rel, sig, first });
  }
});
console.log('TOTAL:', total);
console.log('BY SIG:', [...bySig.entries()]);
console.log('\n--- FILES ---');
for (const f of files.sort((a, b) => a.rel.localeCompare(b.rel))) {
  const s = f.sig.padEnd(18);
  const r = f.rel.padEnd(48);
  console.log(s + ' ' + r + ' ' + f.first);
}
