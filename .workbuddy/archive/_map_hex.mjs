import fs from 'node:fs';
const css = fs.readFileSync('css/style.css', 'utf8');
const lines = css.split('\n');
const start = lines.findIndex((l) => l.trim() === ':root {');
let i = start;
const root = [];
for (; i < lines.length; i++) { root.push(lines[i]); if (lines[i].trim() === '}') break; }
// parse tokens: --name: value;
const tokenVal = {}; // value(lower) -> [names]
for (const l of root) {
  const m = l.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
  if (m) {
    const v = m[2].trim().toLowerCase();
    (tokenVal[v] = tokenVal[v] || []).push(m[1]);
  }
}
const body = lines.slice(i + 1).join('\n');
// distinct hex in body
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
const counts = {};
let m;
while ((m = hexRe.exec(body))) { const h = m[0].toLowerCase(); counts[h] = (counts[h] || 0) + 1; }
const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
console.log('=== body distinct hex:', sorted.length, '===');
for (const [h, n] of sorted) {
  const tok = tokenVal[h] ? tokenVal[h].join(',') : '*** NEED TOKEN ***';
  console.log(h.padEnd(10), String(n).padStart(3), '  ', tok);
}
