import fs from 'node:fs';
const css = fs.readFileSync('css/style.css', 'utf8');
const lines = css.split('\n');
const start = lines.findIndex((l) => l.trim() === ':root {');
let i = start;
const block = [];
for (; i < lines.length; i++) {
  block.push(lines[i]);
  if (lines[i].trim() === '}') break;
}
console.log('=== :root block ===');
console.log(block.join('\n'));
console.log('\n=== body hex occurrences (after :root) ===');
const body = lines.slice(i + 1).join('\n');
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
console.log('body hex occurrences:', (body.match(hexRe) || []).length);
console.log('total css lines:', lines.length);
