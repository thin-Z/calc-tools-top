#!/usr/bin/env node
/**
 * scripts/generate-category-pages.mjs — 栏目索引页卡片生成器
 * ============================================================
 * 背景（2026-09-15 修复）：
 *   /zh|en/{calculators,image,text}/index.html 三个栏目索引页历史上是手工维护的静态文件，
 *   已出现三类缺陷：
 *     1) 卡片缺 `.tool-card-wrap` 包裹层 → 无背景/边框/padding/圆角/hover（裸 .tool-card）；
 *     2) `.icon` 为空 div，无 SVG sprite 图标 → 44×44 空白占位；
 *     3) 工具清单与 tool-count 数字严重滞后于 tools.json
 *        （例：calculators 页实有 23 卡、标注 18，而 tools.json 有 32 个工具）。
 *
 * 本生成器把栏目页的「工具计数 + 卡片网格」纳入 tools.json 单一数据源，
 * 复用 lib/tool-card.mjs 的卡片模板（与首页完全同构），仅替换标记区间，
 * **不改动各页原创 SEO 正文**（category-header / 正文 section / footer 原样保留）。
 *
 * 接管规则：
 *   - 已有标记（__GENERATED_CATEGORY_CARDS_START/END__）→ 标记间整体替换（幂等）；
 *   - 无标记（首次接管）→ 定位 `<div class="tool-count">` 起到 `<div class="tool-grid">` 的
 *     同级闭合 `</div>`（行首 8 空格），替换并写入标记。
 *
 * 用法: node scripts/generate-category-pages.mjs [--dry-run]
 * 被 build.mjs 在构建前自动调用（须在 generate-home.mjs 之后，无强依赖但顺序一致）。
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { generateCardHTML, SECTION_ORDER, SECTION_TITLES, sectionTags, toolInSection } from './lib/tool-card.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const tools = JSON.parse(readFileSync(resolve(root, 'tools.json'), 'utf8'));
if (!Array.isArray(tools) || tools.length === 0) {
  console.error('[generate-category] FATAL: tools.json 为空或格式错误');
  process.exit(1);
}

const START = '<!-- __GENERATED_CATEGORY_CARDS_START__ -->';
const END = '<!-- __GENERATED_CATEGORY_CARDS_END__ -->';

/** 栏目页目录 → 计数文案名词（沿用各页既有措辞，仅数字改为实测值） */
const COUNT_NOUN = {
  zh: { calculators: '计算工具', image: '图片工具', text: '文字工具' },
  en: { calculators: 'calculators', image: 'image tools', text: 'text tools' },
};
const DIRS = ['calculators', 'image', 'text'];

// ── 图标有效性校验：tools.json 的 icon 必须存在于自托管 sprite，避免再现空图标 ──
const ICON_SPRITE = resolve(root, 'assets/icons/icons.svg');
if (existsSync(ICON_SPRITE)) {
  const sprite = readFileSync(ICON_SPRITE, 'utf8');
  const ids = new Set([...sprite.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  const missing = tools.filter((t) => !ids.has(`icon-${t.icon}`)).map((t) => `${t.slug}→icon-${t.icon}`);
  if (missing.length) {
    console.error(`[generate-category] FATAL: ${missing.length} 个图标在 sprite 中缺失: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log(`[generate-category] 图标校验通过: ${tools.length} 个工具图标均在 icons.svg 中`);
}

/**
 * 栏目页分类筛选 chip（数据驱动：按该栏目页【实际涉及的区块】派生）。
 * ------------------------------------------------------------------
 * 背景（2026-09-15）：calculators 目录一页装 32 个工具，横跨财务/健康/生活·出行/实用
 * 四个区块；首页「财务计算 · 查看全部」跳过来时展示的是全部 32 个，与用户预期不符。
 * 此处生成 chip 行，每个 chip 的 data-category 写【区块涵盖的原始 tag 集合】
 * （如 life 区块 = "life,travel"），由 js/category-filter.js 按 ?cat=<区块> 消费。
 *
 * ⚠️ 必须【按页面实际工具派生】而不是硬编码区块名单：
 *    calculators 目录里还有被打成 image / text 标签的工具（color-contrast 属 image；
 *    regex-tester / markdown-preview / simplified-traditional 属 text）——tools.json 的
 *    `dir` 与 `categories` 并非严格对齐。若只列 calculators 专属的四个区块，这几个工具
 *    在任何子分类下都筛不出来（只有「全部」可见），等于制造了死角。
 *    因此：区块数 ≤ 1 的栏目页（image / text 各自独占一个分类）不生成 chip。
 */
function renderFilters(dir, lang, list) {
  const present = [];
  for (const sec of SECTION_ORDER) {
    if (list.some((t) => toolInSection(t, sec))) present.push(sec);
  }
  if (present.length <= 1) return ''; // 整页即单一分类，无需筛选器

  const allLabel = lang === 'zh' ? '全部' : 'All';
  const chips = [
    `            <button type="button" class="category-chip active" data-cat-key="all" data-category="all">${allLabel}</button>`,
    ...present.map((sec) => {
      const label = SECTION_TITLES[sec][lang];
      return `            <button type="button" class="category-chip" data-cat-key="${sec}" data-category="${sectionTags(sec).join(',')}">${label}</button>`;
    }),
  ];
  return `\n        <div class="category-filters" id="categoryFilters" role="group" aria-label="${lang === 'zh' ? '按分类筛选' : 'Filter by category'}">
${chips.join('\n')}
        </div>\n`;
}

function renderBlock(dir, lang, list) {
  const cards = list.map((t) => generateCardHTML(t, lang)).join('\n');
  const count = lang === 'zh'
    ? `共 ${list.length} 款${COUNT_NOUN.zh[dir]}`
    : `${list.length} ${COUNT_NOUN.en[dir]}`;
  return `${START}
        <div class="tool-count">${count}</div>
${renderFilters(dir, lang, list)}
        <div class="tool-grid">
${cards}
        </div>
${END}`;
}

/**
 * 首次接管定位：以 `<section`（正文）为锚，向前回溯到 tool-grid 的同级闭合 </div>。
 * 不能用「行首 8 空格 </div>」定位——实测 calculators 页的网格闭合与最后一个卡片
 * 同行（`...</button></div></div>`），靠缩进会漏匹配。
 */
function locateLegacy(content) {
  const gridRe = /\n[ \t]*<div class="tool-grid">/;
  const gm = gridRe.exec(content);
  if (!gm) return null;
  const gridOpen = gm.index + 1;
  const secIdx = content.indexOf('<section', gridOpen);
  if (secIdx === -1) return null;
  const closeIdx = content.lastIndexOf('</div>', secIdx);
  if (closeIdx === -1 || closeIdx < gridOpen) return null;
  const countRe = /[ \t]*<div class="tool-count">[^\n]*?<\/div>/;
  const cm2 = countRe.exec(content.slice(0, gridOpen));
  if (!cm2) return null;
  return { start: cm2.index, end: closeIdx + '</div>'.length };
}

let changed = 0;
for (const dir of DIRS) {
  for (const lang of ['zh', 'en']) {
    const rel = `${lang}/${dir}/index.html`;
    const file = resolve(root, rel);
    if (!existsSync(file)) {
      console.warn(`[generate-category] 跳过（文件不存在）: ${rel}`);
      continue;
    }
    const list = tools.filter((t) => t.dir === dir);
    if (!list.length) {
      console.warn(`[generate-category] 跳过（无工具）: ${rel}`);
      continue;
    }
    const block = renderBlock(dir, lang, list);
    // 归一化为 LF：仓库 .gitattributes 规定 `* text=auto eol=lf`（git 内存储即 LF），
    // 工作区出现的 CRLF 是百度同步盘间歇注入的污染。用 Node 作为最终写入者回归 LF，
    // 避免「CRLF 文件被塞入 LF 区块」形成混合行尾。
    let content = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const before = content;

    if (content.includes(START) && content.includes(END)) {
      const si = content.indexOf(START);
      const ei = content.indexOf(END);
      content = content.slice(0, si) + block + content.slice(ei + END.length);
    } else {
      const loc = locateLegacy(content);
      if (!loc) {
        console.error(`[generate-category] FATAL: 无法定位 tool-grid 区块: ${rel}`);
        process.exit(1);
      }
      content = content.slice(0, loc.start) + block + content.slice(loc.end);
    }

    if (content === before) {
      console.log(`[generate-category] 无变化: ${rel} (${list.length} 工具)`);
      continue;
    }
    if (!dryRun) writeFileSync(file, content, 'utf8');
    changed++;
    console.log(`[generate-category] 生成 ${rel}: ${list.length} 张卡片${dryRun ? ' (dry-run 未写入)' : ''}`);
  }
}

console.log(`[generate-category] 完成: ${DIRS.length} 目录 × 2 语言, 更新 ${changed} 个文件${dryRun ? ' (dry-run)' : ''}`);
