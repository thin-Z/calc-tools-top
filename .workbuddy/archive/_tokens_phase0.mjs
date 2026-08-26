import fs from 'node:fs';

const css = fs.readFileSync('css/style.css', 'utf8');
const lines = css.split('\n');
const rootStart = lines.findIndex((l) => l.trim() === ':root {');
let i = rootStart;
const rootLines = [];
for (; i < lines.length; i++) { rootLines.push(lines[i]); if (lines[i].trim() === '}') break; }
const rootBlock = rootLines.join('\n');

// parse existing tokens (name -> value)
const existing = {};
for (const l of rootLines) {
  const m = l.match(/^\s*(--[\w-]+)\s*:\s*([^;]+);/);
  if (m) existing[m[1]] = m[2].trim();
}
// reverse: value(lower) -> first token name
const valToToken = {};
for (const [name, val] of Object.entries(existing)) {
  const v = val.toLowerCase();
  if (!valToToken[v]) valToToken[v] = name;
}

// NEW tokens to add (hex -> chosen name). Values exact to avoid color shift.
const NEW = {
  '--white': '#fff',
  '--black': '#000',
  '--text-muted': '#6b7280',
  '--bg-subtle': '#f1f5f9',
  '--bg-soft': '#f8fafc',
  '--border-soft': '#e5e7eb',
  '--surface-dark': '#2c2c2e',
  '--surface-dark-2': '#3a3a3c',
  '--surface-dark-3': '#38383a',
  '--surface-darker': '#1c1c1e',
  '--surface-darkest': '#111113',
  '--red-100': '#fecaca',
  '--red-200': '#fca5a5',
  '--red-300': '#f87171',
  '--blue-100': '#bfdbfe',
  '--blue-600': '#2563eb',
  '--orange-100': '#fed7aa',
  '--orange-200': '#fdba74',
  '--orange-400': '#ff9f0a',
  '--orange-500': '#f97316',
  '--orange-900': '#713f12',
  '--brown-900': '#7c2d12',
  '--indigo-200': '#a5b4fc',
  '--indigo-500': '#6366f1',
  '--indigo-600': '#5e5ce6',
  '--indigo-900': '#312e81',
  '--indigo-50-2': '#f0f0ff',
  '--amber-100': '#fde68a',
  '--amber-400': '#fbbf24',
  '--pink-200': '#f9a8d4',
  '--pink-500': '#ec4899',
  '--pink-900': '#831843',
  '--sky-300': '#7dd3fc',
  '--sky-400': '#38bdf8',
  '--sky-900': '#0c4a6e',
  '--violet-200': '#c4b5fd',
  '--violet-500': '#8b5cf6',
  '--violet-900': '#4c1d95',
  '--emerald-200': '#6ee7b7',
  '--emerald-500': '#10b981',
  '--emerald-900': '#064e3b',
  '--green-400': '#34d399',
  '--green-500': '#22c55e',
  '--green-900': '#14532d',
  '--green-apple': '#30d158',
  '--cyan-50': '#ecfeff',
  '--cyan-300': '#67e8f9',
  '--cyan-600': '#0891b2',
  '--slate-800': '#1e293b',
  '--gray-800': '#1f2937',
  '--accent-blue': '#0a84ff',
  '--brand-purple-2': '#6856e8',
  '--danger-bg-deep': '#3a1a1a',
  '--green-100': '#86efac',
};
// force-map a few approximate grays / exact aliases (consolidation)
const OVERRIDE = {
  '#000000': '--black',
  '#eee': '--bg-subtle',
  '#f3f4f6': '--bg-subtle',
  '#ddd': '--border-soft',
  '#e2e8f0': '--border-soft',
  '#666': '--text-muted',
  '#eef2ff': '--cat-finance-bg',
};
// merge new into value map
const newValToToken = {};
for (const [name, val] of Object.entries(NEW)) {
  const v = val.toLowerCase();
  newValToToken[v] = name; // prefer new names for NEW hexes
}

const body = lines.slice(i + 1).join('\n');
// find all distinct hex in body
const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
const found = new Set();
let m;
const bodyForScan = body;
while ((m = hexRe.exec(bodyForScan))) found.add(m[0].toLowerCase());

// resolve each hex to a token name
const resolve = {};
const unresolved = [];
for (const h of found) {
  if (OVERRIDE[h]) resolve[h] = OVERRIDE[h];
  else if (newValToToken[h]) resolve[h] = newValToToken[h];
  else if (valToToken[h]) resolve[h] = valToToken[h];
  else unresolved.push(h);
}
if (unresolved.length) {
  console.log('UNRESOLVED hex (need manual token):', unresolved);
  process.exit(1);
}

// Build replacement in body: longest hex first to avoid partial match issues
const hexes = [...found].sort((a, b) => b.length - a.length);
let newBody = body;
for (const h of hexes) {
  const tok = resolve[h];
  // case-insensitive global replace; keep any leading # already matched by regex
  const re = new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  newBody = newBody.replace(re, `var(${tok})`);
}

// Build tokens.css (full :root = existing + new)
const allTokens = { ...existing, ...NEW };
// preserve ordering: existing first (as in original), then new
const tokenLines = [];
for (const [name, val] of Object.entries(existing)) tokenLines.push(`    ${name}: ${val};`);
for (const [name, val] of Object.entries(NEW)) tokenLines.push(`    ${name}: ${val};`);
const tokensCss = `:root {\n${tokenLines.join('\n')}\n}\n`;

fs.writeFileSync('css/tokens.css', tokensCss, 'utf8');

// Build new style.css: @import tokens + replaced body
const newStyle = `@import url('./tokens.css');\n\n${newBody}\n`;
fs.writeFileSync('css/style.css', newStyle, 'utf8');

// verify: count remaining hex in new style.css that are NOT token declarations
const finalCss = fs.readFileSync('css/style.css', 'utf8');
const finalLines = finalCss.split('\n');
let stray = 0;
for (const l of finalLines) {
  if (/^\s*--[\w-]+\s*:\s*#/.test(l)) continue; // token declaration, exempt
  if (/#[0-9a-fA-F]{3,8}\b/i.test(l)) stray++;
}
console.log('tokens.css written. new tokens added:', Object.keys(NEW).length);
console.log('style.css rebuilt. stray hex (non-declaration) lines:', stray);
console.log('body hex mapped:', found.size);
