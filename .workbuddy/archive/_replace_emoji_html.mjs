// Phase 0 / T0.2 — remove functional emoji from static HTML.
// - UI-header patterns (lang switch, theme icon, heart) applied to ALL html (incl blog article headers).
// - Content patterns (category labels, icon containers) applied to non-blog-article files only.
// Blog article bodies (UGC emoji) are preserved.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SPRITE = '/assets/icons/icons.svg';

const tools = JSON.parse(fs.readFileSync('tools.json', 'utf8'));
const toolMap = JSON.parse(fs.readFileSync('_tool_icon_map.json', 'utf8')).tool;
const TOOLS_REVERSE = {};
for (const t of tools) { const l = toolMap[t.slug]; if (l) TOOLS_REVERSE[t.icon] = l; }

const UI_MAP = { '🔒':'lock','⚡':'zap','🌐':'globe','💰':'wallet','📧':'mail','💡':'lightbulb','🐛':'bug','🤝':'handshake','🔍':'search' };
const ERROR_MAP = { '🔍':'search' };

// UI-header replacements: safe everywhere (only match header UI, not body prose)
const UI_HEADER = [
  ['🇨🇳 中文', '中文'],
  ['🇬🇧 English', 'English'],
  ['<span class="theme-icon">☀️</span>', '<span class="theme-icon"><svg class="ic" aria-hidden="true"><use href="' + SPRITE + '#icon-sun"></use></svg></span>'],
  ['<span class="heart">❤', '<span class="heart"><svg class="ic" aria-hidden="true"><use href="' + SPRITE + '#icon-heart"></use></svg>'],
];

// Content (label) strips — applied to non-blog-article files only
const STRIP = [
  ['💰 财务', '财务'], ['🏥 健康', '健康'], ['🏠 生活', '生活'], ['🛒 购物', '购物'],
  ['🚗 出行', '出行'], ['🔧 工具', '工具'], ['🖼️ 图片', '图片'], ['✏️ 文字', '文字'],
  ['💰 Finance', 'Finance'], ['🏥 Health', 'Health'], ['🏠 Lifestyle', 'Lifestyle'],
  ['🛒 Shopping', 'Shopping'], ['🚗 Travel', 'Travel'], ['🔧 Utility', 'Utility'],
  ['🖼️ Image', 'Image'], ['✏️ Text', 'Text'],
  ['💰 财务计算', '财务计算'], ['🏥 健康计算', '健康计算'],
  ['🏠 生活 · 出行', '生活 · 出行'], ['🔧 实用工具', '实用工具'],
  ['🖼️ 图片工具', '图片工具'], ['✏️ 文字工具', '文字工具'],
  ['💰 Utility Tools', 'Utility Tools'], ['🖼️ Image Tools', 'Image Tools'], ['✏️ Text Tools', 'Text Tools'],
  ['🏠 生活·出行', '生活·出行'], ['🔧 实用', '实用'],
  ['📐 计算工具', '计算工具'], ['📐 计算工具（16个）', '计算工具（16个）'],
  ['🔥 热门工具', '热门工具'], ['🕘 最近使用', '最近使用'],
  ['🏠 返回首页', '返回首页'], ['📝 浏览博客', '浏览博客'],
];

const ICON_RE = /<(div|span) class="([^"]*)">([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]+)<\/\1>/gu;

function replaceIconContainers(html) {
  return html.replace(ICON_RE, (m, tag, cls, emoji) => {
    let luc = null;
    if (cls === 'error-icon') luc = ERROR_MAP[emoji];
    else if (tag === 'span' && cls === 'icon') luc = UI_MAP[emoji];
    else if (tag === 'div' && cls.startsWith('icon')) luc = TOOLS_REVERSE[emoji];
    if (luc) {
      return `<${tag} class="${cls}"><svg class="ic" aria-hidden="true"><use href="${SPRITE}#icon-${luc}"></use></svg></${tag}>`;
    }
    return `<${tag} class="${cls}"></${tag}>`;
  });
}

function isBlogArticle(rel) {
  return /blog[\\/](zh|en)[\\/][^\\/]+\.html$/.test(rel) && !/index\.html$/.test(rel);
}

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    if (['.git', '.githooks', 'dist', 'node_modules', 'scripts', 'css', 'js', 'assets', 'api', 'docs', 'deliverables', 'snapshots'].includes(e.name)) continue;
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, cb);
    else if (/\.html$/.test(e.name)) cb(f);
  }
}

let changed = 0, blogSkipped = 0;
walk(ROOT, (f) => {
  const rel = path.relative(ROOT, f).split(path.sep).join('/');
  let html = fs.readFileSync(f, 'utf8');
  const orig = html;
  for (const [a, b] of UI_HEADER) html = html.split(a).join(b);
  if (isBlogArticle(rel)) {
    blogSkipped++;
  } else {
    for (const [a, b] of STRIP) html = html.split(a).join(b);
    html = replaceIconContainers(html);
  }
  if (html !== orig) { fs.writeFileSync(f, html, 'utf8'); changed++; }
});

console.log(`HTML emoji pass: ${changed} files changed, ${blogSkipped} blog-article files left for UGC preservation.`);
