import fs from 'node:fs';
import path from 'node:path';

const SPRITE = '/assets/icons/icons.svg';
const svg = (name) => `<svg class="ic" aria-hidden="true"><use href="${SPRITE}#icon-${name}"></use></svg>`;

// emoji -> lucide name (string) OR '' to remove
const MAP = {
  '📐': 'ruler',
  '🏠': 'home',
  '🔒': 'lock',
  '📁': 'folder',
  '✕': 'x',
  '🔥': 'flame',
  '🕘': 'clock',
  '📖': 'book-open',
  '📅': '',
  '🔧': 'wrench',
  '📰': '',
  '🔐': 'lock',
  '🔓': 'unlock',
  '❌': 'x',
  '📋': 'clipboard',
  '🔤': 'type',
  '🔠': 'type',
  '🔡': 'type',
  '📗': 'check',
  '📕': 'x',
  '🐪': 'case-sensitive',
  '🐍': 'braces',
  '🥟': 'type',
  '🎭': 'type',
  '🎨': 'palette',
  '⚡': 'zap',
  '🐢': 'snail',
  '🚶': 'footprints',
  '🏃': 'gauge',
  '📊': 'bar-chart',
  '🔍': 'search',
  '🔄': 'refresh-cw',
  '🔌': 'plug',
  '🔀': 'shuffle',
  '🔁': 'repeat',
  '🎲': 'dice-5',
  '🔖': 'bookmark',
  '🔑': 'key',
  '📝': 'pencil',
};

function walk(d, cb) {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, cb);
    else cb(p);
  }
}
function norm(p) { return p.split('\\').join('/'); }

let total = 0, files = 0;
walk('.', (p) => {
  const np = norm(p);
  if (/(?:^|\/)(node_modules|dist\.bak[^\/]*|\.git|dist)(?:$|\/)/.test(np)) return;
  if (!np.endsWith('.html')) return;
  if (/(^|\/)blog(\/|$)/.test(np)) return; // blog UGC preserved
  let s = fs.readFileSync(p, 'utf8');
  const before = s;
  for (const [emoji, name] of Object.entries(MAP)) {
    if (s.indexOf(emoji) === -1) continue;
    s = name ? s.split(emoji).join(svg(name)) : s.split(emoji).join('');
  }
  if (s !== before) { fs.writeFileSync(p, s, 'utf8'); total++; files++; }
});
console.log(`HTML emoji replaced: ${total} files modified`);
