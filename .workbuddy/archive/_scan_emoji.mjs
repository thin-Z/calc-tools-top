import fs from 'node:fs';
import path from 'node:path';

const pat = '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{2190}-\\u{21FF}\\u{2B00}-\\u{2BFF}\\u{FE0F}\\u{1F1E6}-\\u{1F1FF}]';
const E = new RegExp(pat, 'u');
function walk(d, cb) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, cb);
    else cb(p);
  }
}
function norm(p) { return p.split('\\').join('/'); }
const jsHits = [], htmlHits = [];
walk('.', (p) => {
  const np = norm(p);
  if (/(?:^|\/)(node_modules|dist\.bak[^\/]*|\.git)(?:$|\/)/.test(np)) return;
  const isBlog = /\/blog\//.test(np);
  if (p.endsWith('.js')) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((ln, i) => { if (E.test(ln)) jsHits.push(p + ':' + (i + 1) + ': ' + ln.trim().slice(0, 110)); });
  } else if (p.endsWith('.html') && !isBlog) {
    const lines = fs.readFileSync(p, 'utf8').split('\n');
    lines.forEach((ln, i) => { if (E.test(ln)) htmlHits.push(p + ':' + (i + 1) + ': ' + ln.trim().slice(0, 110)); });
  }
});
console.log('=== JS emoji lines (must be 0) ===');
console.log(jsHits.length ? jsHits.join('\n') : 'NONE');
console.log('\n=== Non-blog HTML emoji lines (must be 0) ===');
console.log(htmlHits.length ? htmlHits.join('\n') : 'NONE');
