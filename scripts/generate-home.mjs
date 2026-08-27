#!/usr/bin/env node
/**
 * generate-home.mjs — 单一数据源生成首页工具卡片 + JS 配置
 * ============================================================
 * 读取 tools.json，生成并注入：
 *   1. site-home.js: SITE_CONFIG.tools + TOOLS_DATA + TOOL_KEYWORDS_ZH（标记间替换）
 *   2. index.html: 工具卡片网格 HTML（标记间替换）
 *   3. en/index.html: 同上（英文版）
 *
 * 区块划分（一级，无二级 subgroup）：
 *   按工具的 categories 派生区块归属，多标签工具可同时出现在多个区块。
 *   区块顺序由 SECTION_ORDER 控制（调整一处即全站生效）。
 *
 * 用法: node scripts/generate-home.mjs [--dry-run]
 * 被 build.mjs 在构建前自动调用。
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

// ── 1. 读取数据源 ────────────────────────────────────────────
const tools = JSON.parse(readFileSync(resolve(root, 'tools.json'), 'utf8'));
if (!Array.isArray(tools) || tools.length === 0) {
  console.error('[generate-home] FATAL: tools.json 为空或格式错误');
  process.exit(1);
}
console.log(`[generate-home] 读取 tools.json: ${tools.length} 个工具`);

// ── 2. 区块定义（一级，无二级）──────────────────────────────
// categories → 区块归属映射（一个分类可映射到一个区块）
const CATEGORY_SECTION = {
  finance: 'finance',
  shopping: 'finance',
  health: 'health',
  life: 'life',
  travel: 'life',
  utility: 'utility',
  image: 'image',
  text: 'text',
};

// 区块显示顺序（3.1: 调整此数组即可改变全站区块顺序）
const SECTION_ORDER = ['finance', 'health', 'life', 'utility', 'image', 'text'];

const sectionHeaders = {
  finance: { zh: '财务计算', en: 'Finance', id: 'sec-finance' },
  health:  { zh: '健康计算', en: 'Health', id: 'sec-health' },
  life:    { zh: '生活 · 出行', en: 'Lifestyle', id: 'sec-life' },
  utility: { zh: '实用工具', en: 'Utility Tools', id: 'sec-utility' },
  image:   { zh: '图片工具', en: 'Image Tools', id: 'sec-image', privacy: true },
  text:    { zh: '文字工具', en: 'Text Tools', id: 'sec-text' },
};

// ── 3. 生成 JS 配置 ──────────────────────────────────────────
function generateSiteConfigTools() {
  const lines = tools.map(t => {
    const cats = JSON.stringify(t.categories);
    return `        { id: '${t.slug}', categories: ${cats} }`;
  });
  // 只输出数组元素（tools: [ 与 ] 保留在 site-home.js 标记之外，避免重复闭合）
  return lines.join(',\n');
}

function generateToolsData() {
  const lines = tools.map(t => {
    const key = t.slug.includes('-') ? `'${t.slug}'` : t.slug;
    return `    ${key}: { icon: '${t.icon}', name: { zh: '${t.zh.name}', en: '${t.en.name}' }, desc: { zh: '${t.zh.desc}', en: '${t.en.desc}' } }`;
  });
  return `const TOOLS_DATA = {\n${lines.join(',\n')}\n};`;
}

function generateToolKeywords() {
  const lines = tools.map(t => {
    const key = t.slug.includes('-') ? `'${t.slug}'` : t.slug;
    return `    ${key}: '${t.zh.kw}'`;
  });
  return `const TOOL_KEYWORDS_ZH = {\n${lines.join(',\n')}\n};`;
}

// ── 4. 生成首页卡片 HTML（按区块分组，多标签工具多区块显示）──
const TAG_LABELS = {
  finance: { zh: '财务', en: 'Finance' },
  health: { zh: '健康', en: 'Health' },
  life: { zh: '生活', en: 'Lifestyle' },
  shopping: { zh: '购物', en: 'Shopping' },
  travel: { zh: '出行', en: 'Travel' },
  utility: { zh: '工具', en: 'Utility' },
  image: { zh: '图片', en: 'Image' },
  text: { zh: '文字', en: 'Text' },
};

function generateCardHTML(t, lang) {
  const prefix = lang === 'zh' ? '/zh' : '/en';
  const text = t[lang];
  const cats = t.categories.join(',');
  const tagPrefix = lang === 'zh' ? '/tags/' : '/en/tags/';
  const tagsHTML = t.categories.map(c => {
    const label = (TAG_LABELS[c] && TAG_LABELS[c][lang]) || c;
    return `<a href="${tagPrefix}${c}.html" class="tag tag-${c}" data-tag="${c}">${label}</a>`;
  }).join('');

  return `            <div class="tool-card-wrap"><a href="${prefix}/${t.dir}/${t.slug}" class="tool-card" data-category="${cats}" data-keywords-zh="${t.zh.kw}" data-keywords-en="${t.en.kw || ''}"><div class="icon"><svg class="ic" aria-hidden="true"><use href="/assets/icons/icons.svg#icon-${t.icon}"></use></svg></div><h3>${text.name}</h3><p>${text.desc}</p></a><div class="tool-tags">${tagsHTML}</div><button class="like-btn" data-like-id="${t.slug}"><span class="heart"><svg class="ic" aria-hidden="true"><use href="/assets/icons/icons.svg#icon-heart"></use></svg><span class="count">0</span></button></div>`;
}

// ── P1-2：静态预渲染「热门工具」卡（消除 JS 填充缺口，降 CLS）──────────────
// 默认热门工具集（与 site-home.js 的 DEFAULT_HOT_TOOLS 保持一致）
const DEFAULT_HOT_TOOLS = ['mortgage', 'bmi', 'tax2026', 'color-picker', 'discount', 'unit-converter', 'word-counter', 'json-formatter'];

// 按 site-home.js initHotTools 的 hot 卡结构生成：.hot-tool-card > hot-badge + hot-score + a.tool-card(.icon/.h3/.p) + tool-tags
// score=0、无 trendBadge（新增用户默认态）；链接用 cleanUrl（与主卡片一致，initHotTools 重渲染时按用户数据覆盖）。
function generateHotCardHTML(t, idx, lang) {
  const prefix = lang === 'zh' ? '/zh' : '/en';
  const text = t[lang];
  const firstCat = (t.categories && t.categories[0]) || 'utility';
  const tagPrefix = lang === 'zh' ? '/tags/' : '/en/tags/';
  const tagsHTML = t.categories.map(c => {
    const label = (TAG_LABELS[c] && TAG_LABELS[c][lang]) || c;
    return `<a href="${tagPrefix}${c}.html" class="tag tag-${c}" data-tag="${c}">${label}</a>`;
  }).join('');
  return `<div class="hot-tool-card"><div class="hot-badge">#${idx + 1}</div><span class="hot-score">0</span><a href="${prefix}/${t.dir}/${t.slug}" class="tool-card" data-like-id="${t.slug}" data-category="${t.categories.join(',')}" data-keywords-zh="${t.zh.kw}"><div class="icon icon-${firstCat}"><svg class="ic" aria-hidden="true"><use href="/assets/icons/icons.svg#icon-${t.icon}"></use></svg></div><h3>${text.name}</h3><p>${text.desc}</p></a><div class="tool-tags">${tagsHTML}</div></div>`;
}

function generateHotCardsHTML(lang) {
  return DEFAULT_HOT_TOOLS.map((slug, i) => {
    const t = tools.find(x => x.slug === slug);
    return t ? generateHotCardHTML(t, i, lang) : '';
  }).filter(Boolean).join('\n');
}

function toolSections(t) {
  // 由 categories 派生区块归属（去重、保持 SECTION_ORDER 顺序）
  const sections = [];
  for (const sec of SECTION_ORDER) {
    const hit = t.categories.some(c => CATEGORY_SECTION[c] === sec);
    if (hit) sections.push(sec);
  }
  return sections;
}

function generateSectionHTML(section, lang) {
  const header = sectionHeaders[section];
  const sectionTools = tools.filter(t => toolSections(t).includes(section));
  if (sectionTools.length === 0) return '';

  const badge = header.privacy
    ? `<span class="privacy-badge-sm"><svg class="ic" aria-hidden="true"><use href="/assets/icons/icons.svg#icon-lock"></use></svg> ${lang === 'zh' ? '本地处理 · 不上传' : 'Local processing · No upload'}</span>`
    : '';
  const lines = [];
  lines.push(`        <div class="section-divider" id="${header.id}"><h2>${header[lang]}${badge}</h2></div><div class="tool-grid">`);
  for (const t of sectionTools) {
    lines.push(generateCardHTML(t, lang));
  }
  lines.push('        </div>');
  return lines.join('\n');
}

function generateHomeHTML(lang) {
  return SECTION_ORDER.map(s => generateSectionHTML(s, lang)).filter(Boolean).join('\n\n');
}

// ── 5. 标记替换 ──────────────────────────────────────────────
const MARKERS = {
  siteConfigTools: { start: '/* __GENERATED_SITE_CONFIG_TOOLS_START__ */', end: '/* __GENERATED_SITE_CONFIG_TOOLS_END__ */' },
  toolsData:       { start: '/* __GENERATED_TOOLS_DATA_START__ */',       end: '/* __GENERATED_TOOLS_DATA_END__ */' },
  toolKeywords:    { start: '/* __GENERATED_TOOL_KEYWORDS_START__ */',    end: '/* __GENERATED_TOOL_KEYWORDS_END__ */' },
  homeCards:       { start: '<!-- __GENERATED_TOOL_CARDS_START__ -->',     end: '<!-- __GENERATED_TOOL_CARDS_END__ -->' },
};

function patchBetween(content, startMarker, endMarker, replacement) {
  const si = content.indexOf(startMarker);
  const ei = content.indexOf(endMarker);
  if (si === -1 || ei === -1) {
    console.warn(`  标记未找到: ${startMarker.slice(0, 40)}...`);
    return null;
  }
  return content.slice(0, si + startMarker.length) + '\n' + replacement + '\n' + content.slice(ei);
}

// 把 hot 卡静态填入 <div class="hot-tools-grid" id="hotToolsGrid">…</div>
function patchHotGrid(content, cards) {
  const re = /(<div class="hot-tools-grid"[^>]*id="hotToolsGrid"[^>]*>)([\s\S]*?)(<\/div>)/;
  if (!re.test(content)) return content;
  return content.replace(re, (all, open, inner, close) => `${open}${cards}${close}`);
}

// ── 6. 执行生成 ──────────────────────────────────────────────
const configTools = generateSiteConfigTools();
const toolsData = generateToolsData();
const toolKeywords = generateToolKeywords();
const homeCardsZh = generateHomeHTML('zh');
const homeCardsEn = generateHomeHTML('en');

let patched = 0;

// 6a. site-home.js
const jsPath = resolve(root, 'js', 'site-home.js');
let js = readFileSync(jsPath, 'utf8');

for (const [key, gen] of [['siteConfigTools', configTools], ['toolsData', toolsData], ['toolKeywords', toolKeywords]]) {
  const m = MARKERS[key];
  const result = patchBetween(js, m.start, m.end, gen);
  if (result !== null) {
    js = result;
    patched++;
    console.log(`   site-home.js: ${key} 已替换`);
  }
}
if (patched > 0 && !dryRun) writeFileSync(jsPath, js, 'utf8');

// 6b. index.html (zh) — 工具卡片 + 静态预渲染热门工具卡（P1-2）
const zhPath = resolve(root, 'index.html');
let zhHtml = readFileSync(zhPath, 'utf8');
const zhResult = patchBetween(zhHtml, MARKERS.homeCards.start, MARKERS.homeCards.end, homeCardsZh);
if (zhResult !== null) {
  zhHtml = zhResult;
  patched++;
  console.log(`   index.html: 工具卡片已替换`);
}
const zhHot = patchHotGrid(zhHtml, generateHotCardsHTML('zh'));
if (zhHot !== zhHtml) {
  zhHtml = zhHot;
  patched++;
  console.log(`   index.html: 热门工具卡已静态预渲染`);
}
if (patched > 0 && !dryRun) writeFileSync(zhPath, zhHtml, 'utf8');

// 6c. en/index.html — 工具卡片 + 静态预渲染热门工具卡（P1-2）
const enPath = resolve(root, 'en', 'index.html');
let enHtml = readFileSync(enPath, 'utf8');
const enResult = patchBetween(enHtml, MARKERS.homeCards.start, MARKERS.homeCards.end, homeCardsEn);
if (enResult !== null) {
  enHtml = enResult;
  patched++;
  console.log(`   en/index.html: 工具卡片已替换`);
}
const enHot = patchHotGrid(enHtml, generateHotCardsHTML('en'));
if (enHot !== enHtml) {
  enHtml = enHot;
  patched++;
  console.log(`   en/index.html: 热门工具卡已静态预渲染`);
}
if (patched > 0 && !dryRun) writeFileSync(enPath, enHtml, 'utf8');

console.log(`\n[generate-home] 完成: ${tools.length} 工具, ${patched} 处替换${dryRun ? ' (dry-run)' : ''}`);
