#!/usr/bin/env node
/**
 * scripts/sync-includes.mjs — header / footer 死副本同步（T-7）
 * ============================================================
 * 背景（2026-09-16 立，2026-09-19 实现）：
 *   本站是纯静态站，`includes/header-{zh,en}.html` 与 `includes/footer-{zh,en}.html`
 *   是**权威版本**，但每个页面内嵌的是**死副本** —— 改一次导航要动 200+ 个文件
 *   （上次改 header 动了 233 个文件），手工同步极易漏页。
 *
 * 本脚本把权威版本同步进所有页面，并提供 `--check` 供改完自检 / 门禁使用。
 *
 * 同步规则（与页面既有形态严格一致，避免制造无意义 diff）：
 *   页面里区块形态 = 权威版本 **首行加页面原有行首缩进**、其余行原样。
 *   例：页面为 `    <header>` + 后续行与 includes 一致 + 末行 `</header>`。
 *
 * 行尾：`includes/*.html` 历史为 CRLF，页面约定 LF（项目铁律：以 Node 为最终写入者
 *   保持 LF）。本脚本读取时归一化为 LF，比较与写入均按 LF —— 避免把 CRLF 灌进源码。
 *
 * 用法：
 *   node scripts/sync-includes.mjs              # 同步全部页面（写入）
 *   node scripts/sync-includes.mjs --check      # 只检查，有不同步则 exit 1（不改文件）
 *   node scripts/sync-includes.mjs --dry-run    # 列出将要修改的文件，不写入
 *   node scripts/sync-includes.mjs --lang zh    # 只处理中文页（en 同理）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INCLUDES = path.join(ROOT, 'includes');

// 目录排除集：与 scripts/generate-sitemap.ps1 / check-sitemap-coverage.mjs 严格对齐
const EXCLUDE_DIRS = new Set([
  '.git', '.githooks', '.workbuddy', 'dist', 'node_modules', 'includes', 'docs',
  'deliverables', 'api', 'scripts', 'css', 'js', 'assets', 'snapshots',
  'e2e', 'test-results', 'playwright-report',
]);

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const DRY = args.includes('--dry-run');
const LANG_FILTER = (() => {
  const i = args.indexOf('--lang');
  return i >= 0 ? args[i + 1] : null;
})();

function walkHtml(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || EXCLUDE_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(full, out);
    else if (e.name.endsWith('.html')) out.push(path.relative(ROOT, full).split(path.sep).join('/'));
  }
  return out;
}

/**
 * 页面语言判定。
 * ⚠️ 必须同时匹配「开头 en/」与「路径含 /en/」：
 *   源码路径是仓库相对路径（`en/calculators/bmi.html`、`blog/en/x.html`），
 *   开头没有前导斜杠 —— 若只判 `includes('/en/')`，则根级 en/ 下**全部页面会被误判为 zh**
 *   （实测：69 个 en 页面被拿去与中文 header 比对，全部误报「不同步」）。
 *   measure-content.mjs 用 dist 前缀路径时才含 `/en/`，两处路径形态不同，不可照抄。
 */
function langOf(rel) {
  return rel.startsWith('en/') || rel.includes('/en/') ? 'en' : 'zh';
}

function loadBlock(name) {
  const p = path.join(INCLUDES, name);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
}

/**
 * 用权威版本替换页面里的 <tag ...>…</tag> 区块。
 * 返回 { html, found, changed }。
 */
function syncBlock(html, tag, block) {
  const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'i');
  const m = html.match(re);
  if (!m) return { html, found: false, changed: false };

  const current = m[0].replace(/\r\n/g, '\n').trim();
  // 内容一致即视为同步完成 —— 注意 m[0] 的起点是 `<tag`，不含该行的前置缩进，
  // 所以这里只能与 block 比内容，不能与「带缩进的 replacement」比（否则必然误报 changed）。
  // 缩进由页面上下文决定，不作为同步目标。
  if (current === block) return { html, found: true, changed: false };

  // m.index 指向 `<tag`，其所在行的前置缩进**已包含在 html.slice(0, m.index) 中**，
  // 故此处直接插入 block、绝不能再加缩进（否则缩进会翻倍 —— 实测踩过）。
  const next = html.slice(0, m.index) + block + html.slice(m.index + m[0].length);
  return { html: next, found: true, changed: next !== html };
}

const rels = walkHtml(ROOT).sort();
const blocks = {};
for (const lang of ['zh', 'en']) {
  blocks[lang] = {
    header: loadBlock(`header-${lang}.html`),
    footer: loadBlock(`footer-${lang}.html`),
  };
}

const changed = [];
const skipped = [];
let scanned = 0;

for (const rel of rels) {
  const lang = langOf(rel);
  if (LANG_FILTER && lang !== LANG_FILTER) continue;
  const b = blocks[lang];
  if (!b.header && !b.footer) continue;

  const abs = path.join(ROOT, rel);
  const orig = fs.readFileSync(abs, 'utf8');
  let html = orig;
  const hits = [];

  for (const tag of ['header', 'footer']) {
    if (!b[tag]) continue;
    const r = syncBlock(html, tag, b[tag]);
    if (!r.found) continue;
    if (r.changed) hits.push(tag);
    html = r.html;
  }

  scanned++;
  if (hits.length) {
    changed.push({ rel, lang, tags: hits });
    if (!CHECK && !DRY) fs.writeFileSync(abs, html, 'utf8');
  } else {
    skipped.push(rel);
  }
}

const total = scanned;
console.log(`[sync-includes] 扫描 ${total} 个页面（${LANG_FILTER ? '仅 ' + LANG_FILTER : 'zh+en'}）`);
for (const lang of ['zh', 'en']) {
  const h = blocks[lang].header ? '有' : '缺';
  const f = blocks[lang].footer ? '有' : '缺';
  console.log(`  权威版本 ${lang}: header ${h} / footer ${f}`);
}

if (changed.length === 0) {
  console.log(`\n✅ 全部 ${total} 个页面的 header/footer 与 includes/ 一致，无需同步`);
  process.exit(0);
}

console.log(`\n${CHECK ? '[!] 发现' : DRY ? '[dry-run] 将修改' : '已同步'} ${changed.length} 个页面：`);
for (const c of changed) console.log(`  ${c.rel}  (${c.tags.join(' + ')})`);

if (CHECK) {
  console.log('\n❌ 存在与 includes/ 不同步的页面 —— 请运行 `node scripts/sync-includes.mjs` 修复');
  process.exit(1);
}
if (DRY) {
  console.log('\n[dry-run] 未写入任何文件');
  process.exit(0);
}
console.log(`\n✅ 已同步 ${changed.length} 个页面（未变更 ${skipped.length} 个）`);
