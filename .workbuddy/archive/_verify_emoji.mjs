import fs from 'node:fs';
import path from 'node:path';

// GATE regex: true functional emoji only (excludes arrow range 2190-21FF and FE0F variation selector)
const pat = '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}\\u{1F1E6}-\\u{1F1FF}]';
const E = new RegExp(pat, 'gu');

function walk(d, cb) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, cb);
    else cb(p);
  }
}
function norm(p) { return p.split('\\').join('/'); }

const jsHits = [], htmlHits = [], blogFiles = new Set();
walk('.', (p) => {
  const np = norm(p);
  if (/(?:^|\/)(node_modules|dist\.bak[^\/]*|\.git)(?:$|\/)/.test(np)) return;
  const isBlog = /(^|\/)blog(\/|$)/.test(np);
  if (isBlog) { if (p.endsWith('.html')) blogFiles.add(np); return; }
  if (p.endsWith('.js')) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((l, i) => { if (E.test(l)) jsHits.push(np + ':' + (i + 1) + ': ' + l.trim().slice(0, 90)); });
  } else if (p.endsWith('.html')) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((l, i) => { if (E.test(l)) htmlHits.push(np + ':' + (i + 1) + ': ' + l.trim().slice(0, 90)); });
  }
});

console.log('=== GATE: non-blog HTML emoji (MUST be 0) ===');
console.log(htmlHits.length ? htmlHits.join('\n') : 'PASS ✅ (0 hits)');
console.log('\n=== GATE: JS emoji (MUST be 0) ===');
console.log(jsHits.length ? jsHits.join('\n') : 'PASS ✅ (0 hits)');
console.log('\nBlog HTML files (UGC emoji preserved, expected >0): ' + blogFiles.size);
process.exit(htmlHits.length || jsHits.length ? 1 : 0);
