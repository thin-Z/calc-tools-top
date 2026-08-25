// Phase 1.4: 首页三源同步校验
// 断言：首页卡片集(zh/en) == SITE_CONFIG.tools 集 == 磁盘页面集 == TOOLS_DATA 集 == TOOL_KEYWORDS_ZH 集
// 任一源漂移即报错并退出码 1。
import { readFileSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function setEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
function diff(a, b) {
  return {
    onlyA: [...a].filter((x) => !b.has(x)),
    onlyB: [...b].filter((x) => !a.has(x)),
  };
}

// 1) 磁盘页面 slug 集
function diskSlugs(lang) {
  const dirs = ['calculators', 'text', 'image'];
  const s = new Set();
  for (const d of dirs) {
    const p = join(root, lang, d);
    let files = [];
    try { files = readdirSync(p); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.html')) continue;
      if (f === 'index.html') continue;
      s.add(f.replace(/\.html$/, ''));
    }
  }
  return s;
}
const diskZh = diskSlugs('zh');
const diskEn = diskSlugs('en');

// 2) 首页卡片 slug 集（解析 class="tool-card" 的 href，属性顺序无关）
function homeSlugs(file) {
  const html = readFileSync(join(root, file), 'utf8');
  const re = /<a\b([^>]*)>/g;
  const s = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1];
    if (!/\bclass="tool-card"/.test(tag)) continue;
    const hm = tag.match(/\bhref="\/(?:zh|en)\/(?:calculators|text|image)\/([^"?]+)"/);
    if (hm) s.add(hm[1]);
  }
  return s;
}
const homeZh = homeSlugs('index.html');
const homeEn = homeSlugs('en/index.html');

// 3) SITE_CONFIG.tools id 集
const js = readFileSync(join(root, 'js', 'site-home.js'), 'utf8');
const toolsBlock = (js.match(/tools:\s*\[([\s\S]*?)\n    \]/) || [])[1] || '';
const configSet = new Set([...toolsBlock.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]));

// 4) TOOLS_DATA / TOOL_KEYWORDS_ZH key 集（兼容带引号/不带引号顶层键，4 空格缩进）
function constKeys(name) {
  const block = (js.match(new RegExp('const ' + name + '\\s*=\\s*\\{([\\s\\S]*?)\\n\\};')) || [])[1] || '';
  const keys = new Set();
  for (const line of block.split('\n')) {
    const m = line.match(/^    ('?[\w-]+'?)\s*:/);
    if (m) keys.add(m[1].replace(/^'|'$/g, ''));
  }
  return keys;
}
const toolsDataKeys = constKeys('TOOLS_DATA');
const kwKeys = constKeys('TOOL_KEYWORDS_ZH');

// ---------- 断言 ----------
const errors = [];
function check(name, a, b) {
  if (!setEqual(a, b)) {
    const d = diff(a, b);
    errors.push(`${name}: 仅前者有 [${d.onlyA.join(', ')}] | 仅后者有 [${d.onlyB.join(', ')}]`);
  }
}

check(`磁盘zh(${diskZh.size}) vs 首页zh(${homeZh.size})`, diskZh, homeZh);
check(`磁盘en(${diskEn.size}) vs 首页en(${homeEn.size})`, diskEn, homeEn);
check(`磁盘zh(${diskZh.size}) vs 配置(${configSet.size})`, diskZh, configSet);
check(`磁盘zh(${diskZh.size}) vs TOOLS_DATA(${toolsDataKeys.size})`, diskZh, toolsDataKeys);
check(`磁盘zh(${diskZh.size}) vs TOOL_KEYWORDS_ZH(${kwKeys.size})`, diskZh, kwKeys);

if (errors.length) {
  console.error('❌ 首页三源不一致：');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`✅ 首页同步: 磁盘(${diskZh.size}) == 首页zh/en == 配置 == TOOLS_DATA == TOOL_KEYWORDS_ZH 全一致`);
