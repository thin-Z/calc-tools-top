#!/usr/bin/env node
/**
 * generate-home.mjs — 单一数据源生成首页工具卡片 + JS 配置
 * ============================================================
 * 读取 tools.json，生成并注入：
 *   1. site-home.js: SITE_CONFIG.tools + TOOLS_DATA + TOOL_KEYWORDS_ZH（标记间替换）
 *   2. index.html: 工具卡片网格 HTML（标记间替换）
 *   3. en/index.html: 同上（英文版）
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

// ── 2. 辅助函数 ──────────────────────────────────────────────
const slugToDir = (slug) => {
  // 根据 section 字段决定目录（不依赖磁盘扫描）
  // 但为了精确，直接从 tools.json 的 section 映射
  return null; // 下面用 section 字段直接拼
};

const sectionDir = { calc: 'calculators', utility: 'calculators', image: 'image', text: 'text' };
const sectionPrivacyBadge = { image: true };

const subgroupLabels = {
  finance:    { zh: '💰 财务计算',  en: '💰 Finance' },
  health:     { zh: '🏥 健康计算',  en: '🏥 Health' },
  lifestyle:  { zh: '🏠 生活 · 出行', en: '🏠 Lifestyle & Travel' },
  general:    { zh: '🔧 通用计算',  en: '🔧 General' },
  utility:    { zh: null, en: null },  // 单组无子标题
  image:      { zh: null, en: null },
  text:       { zh: null, en: null },
};

const sectionHeaders = {
  calc:    { zh: '🧮 计算工具', en: '🧮 Calculator Tools', id: 'sec-calc' },
  utility: { zh: '🔧 实用工具', en: '🔧 Utility Tools', id: 'sec-utility' },
  image:   { zh: '🖼️ 图片工具', en: '🖼️ Image Tools', id: 'sec-image', privacy: true },
  text:    { zh: '✏️ 文字工具', en: '✏️ Text Tools', id: 'sec-text' },
};

// section 显示顺序（3.1: 可通过调整此数组改变区块顺序）
const SECTION_ORDER = ['calc', 'utility', 'image', 'text'];

// ── 3. 生成 JS 配置 ──────────────────────────────────────────
function generateSiteConfigTools() {
  const lines = tools.map(t => {
    const cats = JSON.stringify(t.categories);
    return `        { id: '${t.slug}', categories: ${cats} }`;
  });
  return `    tools: [\n${lines.join(',\n')}\n    ]`;
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

// ── 4. 生成首页卡片 HTML ─────────────────────────────────────
function generateCardHTML(t, lang) {
  const dir = sectionDir[t.section] || 'calculators';
  const prefix = lang === 'zh' ? '/zh' : '/en';
  const text = t[lang];
  const cats = t.categories.join(',');
  const tagsHTML = t.categories.map(c => {
    const tagPrefix = lang === 'zh' ? '/tags/' : '/en/tags/';
    const labels = {
      finance: { zh: '💰 财务', en: '💰 Finance' },
      health: { zh: '🏥 健康', en: '🏥 Health' },
      life: { zh: '🏠 生活', en: '🏠 Lifestyle' },
      shopping: { zh: '🛒 购物', en: '🛒 Shopping' },
      travel: { zh: '🚗 出行', en: '🚗 Travel' },
      utility: { zh: '🔧 工具', en: '🔧 Utility' },
      image: { zh: '🖼️ 图片', en: '🖼️ Image' },
      text: { zh: '✏️ 文字', en: '✏️ Text' },
    };
    const label = (labels[c] && labels[c][lang]) || c;
    return `<a href="${tagPrefix}${c}.html" class="tag tag-${c}" data-tag="${c}">${label}</a>`;
  }).join('');

  return `            <div class="tool-card-wrap"><a href="${prefix}/${dir}/${t.slug}" class="tool-card" data-category="${cats}" data-keywords-zh="${t.zh.kw}"><div class="icon">${t.icon}</div><h3>${text.name}</h3><p>${text.desc}</p></a><div class="tool-tags">${tagsHTML}</div><button class="like-btn" data-like-id="${t.slug}"><span class="heart">❤<span class="count">0</span></button></div>`;
}

function generateSectionHTML(section, lang) {
  const header = sectionHeaders[section];
  const sectionTools = tools.filter(t => t.section === section);
  if (sectionTools.length === 0) return '';

  const lines = [];
  // 区块分隔符
  const badge = header.privacy
    ? `<span class="privacy-badge-sm">🔒 ${lang === 'zh' ? '本地处理 · 不上传' : 'Local processing · No upload'}</span>`
    : '';
  lines.push(`        <div class="section-divider" id="${header.id}"><h2>${header[lang]}${badge}</h2></div><div class="tool-grid">`);

  // 按 subgroup 分组
  const subgroups = [...new Set(sectionTools.map(t => t.subgroup))];
  for (const sg of subgroups) {
    const sgTools = sectionTools.filter(t => t.subgroup === sg);
    const label = subgroupLabels[sg];
    if (label && label[lang]) {
      lines.push(`            <h3 class="tool-subgroup-title">${label[lang]}</h3>`);
    }
    for (const t of sgTools) {
      lines.push(generateCardHTML(t, lang));
    }
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
    console.warn(`  ⚠ 标记未找到: ${startMarker.slice(0, 40)}...`);
    return null;
  }
  return content.slice(0, si + startMarker.length) + '\n' + replacement + '\n' + content.slice(ei);
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
    console.log(`  ✅ site-home.js: ${key} 已替换`);
  }
}
if (patched > 0 && !dryRun) writeFileSync(jsPath, js, 'utf8');

// 6b. index.html (zh)
const zhPath = resolve(root, 'index.html');
let zhHtml = readFileSync(zhPath, 'utf8');
const zhResult = patchBetween(zhHtml, MARKERS.homeCards.start, MARKERS.homeCards.end, homeCardsZh);
if (zhResult !== null) {
  zhHtml = zhResult;
  patched++;
  console.log(`  ✅ index.html: 工具卡片已替换`);
  if (!dryRun) writeFileSync(zhPath, zhHtml, 'utf8');
}

// 6c. en/index.html
const enPath = resolve(root, 'en', 'index.html');
let enHtml = readFileSync(enPath, 'utf8');
const enResult = patchBetween(enHtml, MARKERS.homeCards.start, MARKERS.homeCards.end, homeCardsEn);
if (enResult !== null) {
  enHtml = enResult;
  patched++;
  console.log(`  ✅ en/index.html: 工具卡片已替换`);
  if (!dryRun) writeFileSync(enPath, enHtml, 'utf8');
}

console.log(`\n[generate-home] 完成: ${tools.length} 工具, ${patched} 处替换${dryRun ? ' (dry-run)' : ''}`);
