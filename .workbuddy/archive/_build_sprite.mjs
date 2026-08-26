import fs from 'node:fs';
import path from 'node:path';

const LUCIDE = 'C:/Users/zhaoxin/.workbuddy/binaries/node/workspace/node_modules/lucide-static/icons';
const OUT = 'D:/_Careate.Program/calculator-site/assets/icons/icons.svg';

// slug -> lucide icon name
const TOOL_ICON = {
  mortgage: 'home',
  tax2026: 'receipt-text',
  'housing-fund': 'piggy-bank',
  'car-loan': 'car',
  'loan-compare': 'scale',
  'compound-interest': 'trending-up',
  overtime: 'clock',
  'percentage-calc': 'percent',
  discount: 'tag',
  'fuel-cost': 'fuel',
  'dca-calculator': 'line-chart',
  'currency-converter': 'coins',
  bmi: 'scale',
  'ideal-weight': 'target',
  ovulation: 'flower',
  'calorie-calculator': 'flame',
  pregnancy: 'baby',
  'date-calc': 'calendar',
  'workday-calculator': 'briefcase',
  'age-calc': 'cake',
  electricity: 'lightbulb',
  'unit-converter': 'ruler',
  'password-strength': 'shield',
  'qr-generator': 'qr-code',
  'password-gen': 'key-round',
  'random-gen': 'dice-5',
  timestamp: 'history',
  'fraction-calculator': 'divide',
  compress: 'minimize-2',
  convert: 'repeat',
  resize: 'scaling',
  base64: 'binary',
  'color-picker': 'palette',
  'image-crop': 'crop',
  'color-contrast': 'contrast',
  'case-converter': 'type',
  'json-formatter': 'braces',
  'base64-encode': 'lock',
  'url-encode': 'link',
  'text-cleaner': 'broom',
  'html-stripper': 'scissors',
  'text-diff': 'file-diff',
  'uuid-generator': 'id-card',
  'reading-time': 'book-open',
  'keyword-density': 'hash',
  'word-counter': 'align-left',
  'regex-tester': 'regex',
  'markdown-preview': 'file-text',
  'simplified-traditional': 'languages',
};

// category -> lucide icon name
const CAT_ICON = {
  finance: 'wallet',
  health: 'activity',
  life: 'home',
  shopping: 'shopping-cart',
  travel: 'plane',
  utility: 'wrench',
  image: 'image',
  text: 'file-text',
};

// UI / misc icons used across site
const UI_ICONS = [
  'sun','moon','heart','search','clock','globe','check','arrow-right','arrow-left-right',
  'x','refresh-cw','list','tag','link','book-open','sparkles','info','alert-triangle',
  'chevron-right','plus','minus','copy','download','upload','eye','lock','key','mail',
  'bug','handshake','shield','database','code','type','align-left','file-text','file',
  'image','pencil','wrench','car','activity','dollar-sign','shopping-cart','calendar',
  'zap','scale','droplet','flame','hash','ruler','scissors','thermometer','pie-chart',
  'trending-up','users','percent','repeat','star','map-pin','id-card','calculator',
  'folder','newspaper','graduation-cap','gift','lightbulb','gamepad','briefcase','plane',
  'train','building','stethoscope','heart-pulse','target','palette','crop','contrast',
  'braces','broom','file-diff','languages','binary','minimize-2','scaling','dice-5','divide',
  'regex','history','fuel','piggy-bank','coins','receipt-text','line-chart','cake','baby',
  'flower','key-round','wallet','home','type','clock',
  // Phase 0 emoji→Lucide replacements (UI / misc)
  'unlock','clipboard','case-sensitive','snail','footprints','gauge',
  'bar-chart','plug','shuffle','bookmark','check','circle-x','x-circle',
];

const needed = new Set([
  ...Object.values(TOOL_ICON),
  ...Object.values(CAT_ICON),
  ...UI_ICONS,
]);

const symbols = [];
const missing = [];
for (const name of [...needed].sort()) {
  const f = path.join(LUCIDE, `${name}.svg`);
  if (!fs.existsSync(f)) { missing.push(name); continue; }
  let svg = fs.readFileSync(f, 'utf8').trim();
  // extract inner content between first > and last </
  const open = svg.indexOf('>');
  const close = svg.lastIndexOf('</');
  let inner = svg.slice(open + 1, close);
  symbols.push(`  <symbol id="icon-${name}" viewBox="0 0 24 24">${inner}</symbol>`);
}

let out = `<!-- calc-tools.top self-hosted Lucide icon sprite (zero runtime dependency) -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
${symbols.join('\n')}
</svg>
`;
fs.writeFileSync(OUT, out, 'utf8');
console.log('WROTE', OUT, 'symbols:', symbols.length);
if (missing.length) console.log('MISSING ICONS:', missing.join(', '));
else console.log('ALL ICONS RESOLVED');

// also emit mapping for tools.json patch
fs.writeFileSync('D:/_Careate.Program/calculator-site/_tool_icon_map.json',
  JSON.stringify({ tool: TOOL_ICON, category: CAT_ICON }, null, 2), 'utf8');
console.log('wrote _tool_icon_map.json');
