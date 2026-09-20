// Phase 1.4 + 3.4: 首页多源同步校验（tools.json 为权威数据源）
// 断言：tools.json 集 == 首页卡片集(zh/en) == SITE_CONFIG.tools 集 == 磁盘页面集 == TOOLS_DATA 集 == TOOL_KEYWORDS_ZH 集
// 任一源漂移即报错并退出码 1。
import { readFileSync, readdirSync, existsSync } from 'fs';
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

// 2) 首页卡片 slug 集 + data-like-id（like-id 位于同卡内 <button class="like-btn">，按位置就近配对）
function homeCards(file) {
  const html = readFileSync(join(root, file), 'utf8');
  const anchorRe = /<a\b([^>]*)>/g;
  const likeRe = /data-like-id="([^"]*)"/g;
  const anchorMatches = [];
  let m;
  while ((m = anchorRe.exec(html)) !== null) {
    if (!/\bclass="tool-card"/.test(m[1])) continue;
    const hm = m[1].match(/\bhref="\/(?:zh|en)\/(?:calculators|text|image)\/([^"?]+)"/);
    if (hm) anchorMatches.push({ pos: m.index, slug: hm[1] });
  }
  const likeMatches = [];
  while ((m = likeRe.exec(html)) !== null) likeMatches.push({ pos: m.index, id: m[1] });
  const cards = [];
  for (const a of anchorMatches) {
    const next = likeMatches.find((l) => l.pos > a.pos);
    cards.push({ slug: a.slug, likeId: next ? next.id : null });
  }
  return cards;
}
function homeSlugs(file) {
  return new Set(homeCards(file).map((c) => c.slug));
}
const homeZh = homeSlugs('index.html');
const homeEn = homeSlugs('en/index.html');
const homeZhCards = homeCards('index.html');
const homeEnCards = homeCards('en/index.html');

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

// 5) tools.json 权威数据源
const toolsJson = JSON.parse(readFileSync(join(root, 'tools.json'), 'utf8'));
const toolsJsonSet = new Set(toolsJson.map((t) => t.slug));

// ---------- 断言 ----------
const errors = [];
function check(name, a, b) {
  if (!setEqual(a, b)) {
    const d = diff(a, b);
    errors.push(`${name}: 仅前者有 [${d.onlyA.join(', ')}] | 仅后者有 [${d.onlyB.join(', ')}]`);
  }
}

// 「展示集」= 全量集 − 已合并工具。已合并工具（tools.json 里带 mergedInto）落地页是
// noindex 跳转壳页：磁盘上存在、配置与数据层保留（旧 URL 重定向 + 「最近使用」按 id 取值），
// 但**不得出现在首页卡片等展示面**（2026-09-20：原 discount/age-calc/password-strength/
// keyword-density 4 条曾出现在首页热门位与分类网格中，导致内链权重导给 noindex 页）。
const mergedSet = new Set(toolsJson.filter((t) => t.mergedInto).map((t) => t.slug));
const visibleSet = new Set([...toolsJsonSet].filter((s) => !mergedSet.has(s)));

check(`tools.json(${toolsJsonSet.size}) vs 磁盘zh(${diskZh.size})`, toolsJsonSet, diskZh);
check(`tools.json(${toolsJsonSet.size}) vs 磁盘en(${diskEn.size})`, toolsJsonSet, diskEn);
check(`tools.json−已合并(${visibleSet.size}) vs 首页zh(${homeZh.size})`, visibleSet, homeZh);
check(`tools.json−已合并(${visibleSet.size}) vs 首页en(${homeEn.size})`, visibleSet, homeEn);
check(`tools.json(${toolsJsonSet.size}) vs 配置(${configSet.size})`, toolsJsonSet, configSet);
check(`tools.json(${toolsJsonSet.size}) vs TOOLS_DATA(${toolsDataKeys.size})`, toolsJsonSet, toolsDataKeys);
check(`tools.json(${toolsJsonSet.size}) vs TOOL_KEYWORDS_ZH(${kwKeys.size})`, toolsJsonSet, kwKeys);

// 6) 首页卡片 data-like-id 一致性：每张卡的 likeId 必须等于 slug 且属于配置集
//    —— 捕捉「href 正确但 like-id 漂移」（如 image-crop 卡片误写 data-like-id="crop"）
function checkLikeIds(label, cards) {
  for (const c of cards) {
    if (c.likeId === null) {
      errors.push(`${label}: 卡片 /${c.slug} 缺失 data-like-id`);
    } else if (c.likeId !== c.slug) {
      errors.push(`${label}: 卡片 /${c.slug} 的 data-like-id="${c.likeId}" 与 slug 不一致（应="${c.slug}"）`);
    } else if (!configSet.has(c.slug)) {
      errors.push(`${label}: 卡片 /${c.slug} 的 like-id 不在 SITE_CONFIG.tools 配置集`);
    }
  }
}
checkLikeIds('首页zh', homeZhCards);
checkLikeIds('首页en', homeEnCards);

// 7) 已合并工具的硬约束（2026-09-20 新增，防止修好又被回退）
//    ① 展示面绝不能出现——独立反向断言，报错文案明确指向「落地页是 noindex 壳页」
for (const s of mergedSet) {
  if (homeZh.has(s) || homeEn.has(s)) {
    errors.push(`已合并工具 "${s}" 出现在首页展示面（应过滤：其落地页为 noindex 跳转壳页）`);
  }
}
//    ② 其壳页必须仍在磁盘——展示面已排除，但旧 URL 仍需承接页（否则 404）
for (const s of mergedSet) {
  const t = toolsJson.find((x) => x.slug === s);
  for (const lang of ['zh', 'en']) {
    const rel = `${lang}/${t.dir}/${s}.html`;
    if (!existsSync(join(root, rel))) {
      errors.push(`已合并工具壳页缺失: ${rel}（旧 URL 将 404，须保留承接页）`);
    }
  }
}

if (errors.length) {
  console.error('❌ 首页三源不一致：');
  for (const e of errors) console.error('  ✗ ' + e);
  process.exit(1);
}
console.log(`✅ 首页同步: tools.json(${toolsJsonSet.size}，含已合并 ${mergedSet.size}) == 磁盘 == 配置 == TOOLS_DATA == TOOL_KEYWORDS_ZH 全一致 ｜ 展示面(${visibleSet.size}) == 首页zh/en ｜ 已合并壳页 ${mergedSet.size * 2} 个均在磁盘且不在展示面`);
