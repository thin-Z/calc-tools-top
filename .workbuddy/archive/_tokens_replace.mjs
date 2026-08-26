import fs from 'node:fs';

const FILE = 'css/style.css';
let s = fs.readFileSync(FILE, 'utf8');
const before = s;

// ── Exact-match replacement map: literal CSS color → var() ──
// Order matters: longer/more specific patterns first to avoid partial matches
const MAP = [
  // Shadow scale
  ['rgba(0,0,0,0.04)', 'var(--shadow-2xs)'],
  ['rgba(0,0,0,0.06)', 'var(--shadow-xs)'],
  ['rgba(0,0,0,0.12)', 'var(--shadow-md-dark)'],
  ['rgba(0,0,0,0.18)', 'var(--shadow-lg-dark)'],
  ['rgba(0,0,0,0.2)',  'var(--shadow-lg-dark)'],
  ['rgba(0,0,0,0.1)',  'var(--shadow-base)'],

  // Brand blue alpha
  ['rgba(0,122,255,0.05)', 'var(--blue-05)'],
  ['rgba(0,122,255,0.06)', 'var(--blue-06)'],
  ['rgba(0,122,255,0.08)', 'var(--blue-08)'],
  ['rgba(0,122,255,0.1)',  'var(--blue-10)'],
  ['rgba(0,122,255,0.12)', 'var(--blue-12)'],
  ['rgba(0,122,255,0.14)', 'var(--blue-14)'],
  ['rgba(0,122,255,0.15)', 'var(--blue-15)'],
  ['rgba(0,122,255,0.16)', 'var(--blue-16)'],
  ['rgba(0,122,255,0.2)',  'var(--blue-20)'],
  ['rgba(0,122,255,0.25)', 'var(--blue-25)'],
  ['rgba(0,122,255,0.3)',  'var(--blue-30)'],
  ['rgba(0,122,255,0.35)', 'var(--blue-35)'],
  ['rgba(0,122,255,0.4)',  'var(--primary-glow)'],

  // Accent blue alpha
  ['rgba(10,132,255,0.08)', 'var(--accent-08)'],
  ['rgba(10,132,255,0.1)',  'var(--accent-10)'],
  ['rgba(10,132,255,0.12)', 'var(--accent-12)'],
  ['rgba(10,132,255,0.14)', 'var(--accent-14)'],
  ['rgba(10,132,255,0.15)', 'var(--accent-15)'],
  ['rgba(10,132,255,0.25)', 'var(--accent-25)'],
  ['rgba(10,132,255,0.4)',  'var(--accent-40)'],

  // Category alpha tints
  ['rgba(79,70,229,0.2)',   'var(--cat-finance-bg)'],
  ['rgba(22,163,74,0.2)',   'var(--cat-health-bg)'],
  ['rgba(202,138,4,0.2)',   'var(--cat-life-bg)'],
  ['rgba(219,39,119,0.2)',  'var(--cat-shopping-bg)'],
  ['rgba(2,132,199,0.2)',   'var(--cat-travel-bg)'],
  ['rgba(124,58,237,0.2)',  'var(--cat-utility-bg)'],
  ['rgba(5,150,105,0.2)',   'var(--cat-image-bg)'],
  ['rgba(234,88,12,0.2)',   'var(--cat-text-bg)'],
  ['rgba(8,145,178,0.2)',   'var(--cat-tools-bg)'],

  // UI state
  ['rgba(244,63,94,0.15)',  'var(--like-alpha)'],
  ['rgba(239,68,68,0.2)',   'var(--hot-score-bg)'],
  ['rgba(239,68,68,0.1)',   'var(--danger-alpha)'],
  ['rgba(220,38,38,0.2)',   'var(--danger-alpha-2)'],
  ['rgba(220,38,38,0.3)',   'var(--danger-alpha-3)'],
  ['rgba(234,88,12,0.3)',   'var(--cat-text-bg)'],  // close enough
  ['rgba(34,197,94,0.15)',  'var(--success-alpha)'],
  ['rgba(245,158,11,0.1)',  'var(--warning-alpha)'],
  ['rgba(251,191,36,0.3)',  'var(--hot-likes-border)'],
  ['rgba(251,191,36,0.15)', 'var(--hot-likes-bg)'],
  ['rgba(79,70,229,0.1)',   'var(--cat-finance-bg)'], // same pattern
  ['rgba(139,92,246,0.1)',  'var(--cat-utility-bg)'],

  // Purple / orange / green
  ['rgba(88,86,214,0.08)',  'var(--purple-08)'],
  ['rgba(104,86,232,0.08)', 'var(--purple-08b)'],
  ['rgba(104,86,232,0.06)', 'var(--purple-06)'],
  ['rgba(255,149,0,0.08)',  'var(--orange-08)'],
  ['rgba(52,199,89,0.08)',  'var(--green-08)'],
  ['rgba(48,209,88,0.1)',   'var(--green-10a)'],
  ['rgba(255,159,10,0.1)',  'var(--amber-10)'],
  ['rgba(250,204,21,0.45)', 'var(--yellow-45)'],

  // Glass / surface
  ['rgba(255,255,255,0.9)',  'var(--glass-white-90)'],
  ['rgba(255,255,255,0.8)',  'var(--glass-white-80)'],
  ['rgba(255,255,255,0.15)', 'var(--glass-white-15)'],
  ['rgba(255,255,255,0.08)', 'var(--glass-white-08)'],
  ['rgba(255,255,255,0.06)', 'var(--glass-white-06)'],
  ['rgba(28,28,30,0.6)',     'var(--surface-alpha-60)'],
  ['rgba(44,44,46,0.7)',     'var(--surface-alpha-70)'],
  ['rgba(28,28,30,0.72)',    'var(--surface-alpha-72)'],
  ['rgba(28,28,30,0.8)',     'var(--surface-alpha-80)'],
  ['rgba(128,128,128,0.4)',  'var(--glass-border-light)'],

  // Misc
  ['rgba(37,99,235,0.8)',    'var(--link-bg)'],
  ['rgba(124,58,237,0.8)',   'var(--violet-badge-bg)'],
  ['rgba(0,0,0,0.3)',        'var(--shadow-2xl)'],
  ['rgba(0,0,0,0.4)',        'var(--shadow-3xl)'],
  ['rgba(0,0,0,0.45)',       'var(--overlay-bg)'],
  ['rgba(0,0,0,0.5)',        'var(--shadow-overlay)'],
];

// Handle spaced variants: "rgba(0, 0, 0, 0.18)" etc.
// Normalize: strip spaces after commas in rgba()
s = s.replace(/rgba\(\s*/g, 'rgba(');
s = s.replace(/,\s*/g, ',');
s = s.replace(/\)\s*/g, ')');

let count = 0;
for (const [from, to] of MAP) {
  // Normalize the search pattern too
  const normFrom = from.replace(/,\s*/g, ',').replace(/\)\s*/g, ')');
  const re = new RegExp(normFrom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const before_c = count;
  s = s.replace(re, to);
  count += (s.match(re) || []).length;
}

// Hex replacements: only target lines that are CSS property declarations
// (not :root/--xxx definitions). Process line-by-line.
const HEX_MAP = [
  ['#e8e8ed', 'var(--border)'],
  ['#F5F5F7', 'var(--bg)'],
  ['#f8f8fa', 'var(--bg-surface)'],
  ['#1D1D1F', 'var(--text-primary)'],
  ['#86868B', 'var(--text-secondary)'],
  ['#98989D', 'var(--text-tertiary)'],
  ['#007AFF', 'var(--primary)'],
  ['#0056CC', 'var(--primary-hover)'],
  ['#f43f5e', 'var(--like)'],
  ['#fff1f2', 'var(--like-bg)'],
  ['#ef4444', 'var(--danger)'],
  ['#dc2626', 'var(--danger-strong)'],
  ['#16a34a', 'var(--success)'],
  ['#f0fdf4', 'var(--success-bg)'],
  ['#f59e0b', 'var(--hot-badge-from)'],
  ['#d97706', 'var(--hot-likes)'],
  ['#fef2f2', 'var(--trend-hot-bg)'],
  ['#fff7ed', 'var(--trend-up-bg)'],
  ['#ea580c', 'var(--trend-up-text)'],
  ['#f0f0f0', 'var(--tag-bg)'],
  ['#555',    'var(--tag-text)'],
  ['#1d1d1f', 'var(--tooltip-bg)'],
  ['#fef3c7', 'var(--hot-tool-border)'],
];

const lines = s.split('\n');
let hexCount = 0;
for (let i = 0; i < lines.length; i++) {
  const ln = lines[i];
  // Skip :root / variable definitions and @import
  if (/^\s*--/.test(ln) || ln.trim().startsWith('@import') || ln.trim().startsWith('//')) continue;
  // Only replace in property declarations (contains ':' and is inside a rule)
  if (!ln.includes(':')) continue;
  let modified = ln;
  for (const [hex, token] of HEX_MAP) {
    const re = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(modified)) {
      modified = modified.replace(re, token);
      hexCount++;
    }
  }
  lines[i] = modified;
}
s = lines.join('\n');

fs.writeFileSync(FILE, s, 'utf8');

// Count remaining hardcoded (exclude :root defs and var() contexts)
const linesFinal = s.split('\n');
let remainRgba = 0, remainHex = 0;
const rgbaRe2 = /rgba?\(/g;
const hexRe2 = /#[0-9a-fA-F]{3,8}\b/g;
for (const ln of linesFinal) {
  if (/^\s*--/.test(ln) || ln.trim().startsWith('@import')) continue;
  // Find rgba not inside var()
  const stripped = ln.replace(/var\([^)]+\)/g, '');
  if (rgbaRe2.test(stripped)) { remainRgba++; console.log('  RGBA remain:', ln.trim().slice(0, 100)); }
  if (hexRe2.test(stripped)) { remainHex++; console.log('  HEX remain:', ln.trim().slice(0, 100)); }
}
console.log(`\nReplaced: ${count} rgba + ${hexCount} hex`);
console.log(`Remaining hardcoded: ${remainRgba} rgba lines, ${remainHex} hex lines`);
