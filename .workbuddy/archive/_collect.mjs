import fs from 'node:fs';
import path from 'node:path';

// Pictorial emoji ranges only (exclude arrows 2190-21FF, FE0F, regional flags)
const pat = '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2B00}-\\u{2BFF}]';
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
const htmlSet = new Map(); // char -> count
const jsSet = new Map();
function add(map, ch) { map.set(ch, (map.get(ch) || 0) + 1); }
walk('.', (p) => {
  const np = norm(p);
  if (/(?:^|\/)(node_modules|dist\.bak[^\/]*|\.git|dist)(?:$|\/)/.test(np)) return;
  const isBlog = /(^|\/)blog(\/|$)/.test(np);
  if (p.endsWith('.html') && !isBlog) {
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(E)) add(htmlSet, m[0]);
  } else if (p.endsWith('.js')) {
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(E)) add(jsSet, m[0]);
  }
});
console.log('=== Non-blog HTML unique emoji ===');
console.log([...htmlSet.entries()].map(([c, n]) => c + ':' + n).join('  '));
console.log('\n=== JS unique emoji (pictorial) ===');
console.log([...jsSet.entries()].map(([c, n]) => c + ':' + n).join('  '));
