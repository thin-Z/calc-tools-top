#!/usr/bin/env node
/**
 * 标签聚合落地页生成器 (P1)
 * ---------------------------------------------------------------
 * 解析首页工具卡 (index.html / en/index.html) 与博客归档 (blog/zh/index.html / blog/en/index.html)，
 * 为每个达到阈值的分类生成 /tags/<cat>.html (zh) 与 /en/tags/<cat>.html (en)，
 * 聚合该分类下的「相关工具」与「相关文章」，并附带：
 *   - canonical(www) + hreflang(zh-CN/en/x-default) 互链
 *   - JSON-LD (BreadcrumbList + CollectionPage)
 *   - 复用 includes/ 头尾与现有 CSS 类 (.tool-grid / .article-list)
 *
 * 阈值：任一语言 toolCount + articleCount >= 1 即生成，确保全站标签链接零死链（薄分类也生成落地页）。
 * 生成的源文件由 build.mjs 复制进 dist 并统一注入 AdSense/CMP/版本号。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.calc-tools.top';
// 任一语言聚合项数 >=1 即生成落地页，确保被链接的分类都有页面，杜绝 404 死链。
const THRESHOLD = 1;

const LABELS = {
  zh: { finance: '财务', health: '健康', life: '生活', shopping: '购物', travel: '出行', utility: '工具', image: '图片', text: '文字' },
  en: { finance: 'Finance', health: 'Health', life: 'Lifestyle', shopping: 'Shopping', travel: 'Travel', utility: 'Utility', image: 'Image', text: 'Text' },
};
const EMOJI = { finance: '💰', health: '🏥', life: '🏠', shopping: '🛒', travel: '🚗', utility: '🔧', image: '🖼️', text: '✏️' };

function stripTags(s) { return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

// 解析首页工具卡（index.html / en/index.html）：返回 [{url, cats:[], title, desc}]
// 注：首页仅展示 26 个精选工具，标签页据此聚合（与站方主发现面一致）。
// 完整 43 工具目录需解析 site-home.js 的 SITE_CONFIG.tools（含 categories），因依赖 eval 暂未纳入，列为后续增强。
function parseTools(html) {
  const out = [];
  const re = /<div class="tool-card-wrap">\s*<a href="([^"]+)" class="tool-card" data-category="([^"]*)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({
      url: m[1],
      cats: m[2].split(',').map((c) => c.trim()).filter(Boolean),
      title: stripTags(m[3]),
      desc: stripTags(m[4]),
    });
  }
  return out;
}

// 解析博客归档文章项：返回 [{url, cat, title, summary}]
function parseArticles(html) {
  const out = [];
  const re = /<article class="article-item" data-category="([^"]+)">\s*<h2><a href="([^"]+)">([\s\S]*?)<\/a><\/h2>\s*<p class="article-meta">[\s\S]*?<\/p>(?:<button[^>]*>[\s\S]*?<\/button>)?\s*<p class="article-summary">([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) {
    out.push({ cat: m[1], url: m[2], title: stripTags(m[3]), summary: stripTags(m[4]) });
  }
  return out;
}

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

function toolCardHtml(t, lang, cat) {
  const tagLinks = t.cats.map((c) => {
    const lbl = (EMOJI[c] || '') + ' ' + (LABELS[lang][c] || c);
    const href = lang === 'zh' ? `/tags/${c}.html` : `/en/tags/${c}.html`;
    return `<a href="${href}" class="tag tag-${c}" data-tag="${c}">${esc(lbl)}</a>`;
  }).join('');
  return `        <div class="tool-card-wrap">
          <a href="${escAttr(t.url)}" class="tool-card" data-category="${escAttr(t.cats.join(','))}">
            <h3>${esc(t.title)}</h3>
            <p>${esc(t.desc)}</p>
          </a>
          <div class="tool-tags">${tagLinks}</div>
        </div>`;
}

function articleItemHtml(a, lang, cat) {
  const lbl = (EMOJI[cat] || '') + ' ' + (LABELS[lang][cat] || cat);
  const href = lang === 'zh' ? `/tags/${cat}.html` : `/en/tags/${cat}.html`;
  return `          <article class="article-item" data-category="${escAttr(cat)}">
            <h2><a href="${escAttr(a.url)}">${esc(a.title)}</a></h2>
            <p class="article-summary">${esc(a.summary)}</p>
            <div class="article-tags"><a href="${href}" class="tag tag-${cat}" data-tag="${cat}">${esc(lbl)}</a></div>
          </article>`;
}

function buildPage({ lang, cat, tools, articles, header, footer }) {
  const dispLabel = (EMOJI[cat] || '') + ' ' + LABELS[lang][cat];
  const plain = LABELS[lang][cat];
  const zhUrl = `${SITE}/tags/${cat}`;
  const enUrl = `${SITE}/en/tags/${cat}`;
  const canonical = lang === 'zh' ? zhUrl : enUrl;
  const titleLang = lang === 'zh' ? 'zh-CN' : 'en';

  const title = lang === 'zh'
    ? `${plain}相关工具与文章 - 工具箱里`
    : `${plain} Tools & Articles - ToolBox`;
  const description = lang === 'zh'
    ? `汇集${plain}分类下的免费在线工具与相关教程文章，${plain}工具即开即用，浏览器本地处理，数据不上传。`
    : `Curated free online tools and guides in the ${plain} category. ${plain} tools run locally in your browser — no upload, no sign-up.`;

  const toolSection = tools.length
    ? `    <section class="tag-section">
      <h2>${esc(dispLabel)}相关工具</h2>
      <div class="tool-grid">
${tools.map((t) => toolCardHtml(t, lang, cat)).join('\n')}
      </div>
    </section>`
    : '';

  const articleSection = articles.length
    ? `    <section class="tag-section">
      <h2>${esc(dispLabel)}相关文章</h2>
      <div class="article-list">
${articles.map((a) => articleItemHtml(a, lang, cat)).join('\n')}
      </div>
    </section>`
    : '';

  // 其他分类交叉导航：把标签枢纽连成网络，提升内链与发现性（P3）
  const otherCats = Object.keys(LABELS[lang]).filter((c) => c !== cat);
  const navHeading = lang === 'zh' ? '浏览其他分类' : 'Browse other categories';
  const catLinks = otherCats.map((c) => {
    const href = lang === 'zh' ? `/tags/${c}.html` : `/en/tags/${c}.html`;
    const lbl = (EMOJI[c] || '') + ' ' + LABELS[lang][c];
    return `          <li><a href="${href}" class="tag tag-${c}" data-tag="${c}">${esc(lbl)}</a></li>`;
  }).join('\n');
  const categoriesNav = `    <nav class="tag-categories" aria-label="${escAttr(navHeading)}">
      <h2>${esc(navHeading)}</h2>
      <ul class="tag-cat-list">
${catLinks}
      </ul>
    </nav>`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: lang === 'zh' ? '首页' : 'Home', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: dispLabel, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      url: canonical,
      description,
      inLanguage: titleLang,
      isPartOf: { '@type': 'WebSite', name: lang === 'zh' ? '工具箱里' : 'ToolBox', url: `${SITE}/` },
    },
  ];

  // JSON-LD：与全站一致，每个 schema 独立 script 块（check-jsonld 要求每块顶层含 @context）
  const jsonLdBlocks = jsonLd
    .map((block) => `    <script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${titleLang}">
<head>
    <meta charset="UTF-8">
<script src="/js/theme-init.js"></script>
<script src="/js/theme-toggle.js" defer></script>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(title)}</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <meta name="description" content="${escAttr(description)}">
    <meta property="og:title" content="${escAttr(title)}">
    <meta property="og:description" content="${escAttr(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escAttr(canonical)}">
    <meta property="og:image" content="${SITE}/assets/logo.svg">
    <meta property="og:locale" content="${titleLang === 'zh-CN' ? 'zh_CN' : 'en'}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(title)}">
    <meta name="twitter:description" content="${escAttr(description)}">
    <link rel="canonical" href="${escAttr(canonical)}">
    <link rel="alternate" hreflang="zh-CN" href="${zhUrl}">
    <link rel="alternate" hreflang="en" href="${enUrl}">
    <link rel="alternate" hreflang="x-default" href="${zhUrl}">
    <link rel="stylesheet" href="/css/style.css">
    <script src="/js/i18n.js" defer></script>
    <script src="/js/like.js" defer></script><script src="/js/site-core.js" defer></script>
</head>
<body>
${header}
    <main id="main" class="tag-page">
      <nav class="breadcrumb" aria-label="breadcrumb">
        <a href="/">${lang === 'zh' ? '首页' : 'Home'}</a><span>/</span><span>${esc(dispLabel)}</span>
      </nav>
      <div class="page-header">
        <h1>${esc(dispLabel)}</h1>
        <p>${esc(description)}</p>
      </div>
${toolSection}
${articleSection}
${categoriesNav}
    </main>
${footer}
${jsonLdBlocks}
</body>
</html>
`;
}

function generate() {
  const indexZh = readFileSync(join(root, 'index.html'), 'utf8');
  const indexEn = readFileSync(join(root, 'en/index.html'), 'utf8');
  const blogZh = readFileSync(join(root, 'blog/zh/index.html'), 'utf8');
  const blogEn = readFileSync(join(root, 'blog/en/index.html'), 'utf8');

  const headerZh = readFileSync(join(root, 'includes/header-zh.html'), 'utf8').trim();
  const headerEn = readFileSync(join(root, 'includes/header-en.html'), 'utf8').trim();
  const footerZh = readFileSync(join(root, 'includes/footer-zh.html'), 'utf8').trim();
  const footerEn = readFileSync(join(root, 'includes/footer-en.html'), 'utf8').trim();

  const toolsZh = parseTools(indexZh);
  const toolsEn = parseTools(indexEn);
  const artsZh = parseArticles(blogZh);
  const artsEn = parseArticles(blogEn);

  const cats = Object.keys(LABELS.zh);
  let count = 0;
  for (const cat of cats) {
    const tZh = toolsZh.filter((t) => t.cats.includes(cat));
    const aZh = artsZh.filter((a) => a.cat === cat);
    const tEn = toolsEn.filter((t) => t.cats.includes(cat));
    const aEn = artsEn.filter((a) => a.cat === cat);
    // 阈值改为「任一语言 ≥1 项即生成」，避免被链接的分类（如 shopping/travel）出现 404。
    // 旧逻辑用 THRESHOLD=3 跳过了薄分类，但全站标签链接已指向这些分类，会制造死链。
    const totalItems = tZh.length + aZh.length + tEn.length + aEn.length;
    if (totalItems < 1) {
      console.log(`[tag] 跳过 ${cat}: 无任何工具或文章`);
      continue;
    }

    const zhHtml = buildPage({ lang: 'zh', cat, tools: tZh, articles: aZh, header: headerZh, footer: footerZh });
    const enHtml = buildPage({ lang: 'en', cat, tools: tEn, articles: aEn, header: headerEn, footer: footerEn });

    const zhDir = join(root, 'tags');
    const enDir = join(root, 'en/tags');
    mkdirSync(zhDir, { recursive: true });
    mkdirSync(enDir, { recursive: true });
    writeFileSync(join(zhDir, `${cat}.html`), zhHtml, 'utf8');
    writeFileSync(join(enDir, `${cat}.html`), enHtml, 'utf8');
    count++;
    console.log(`[tag] 生成 ${cat}: zh(工具${tZh.length}+文章${aZh.length}) en(工具${tEn.length}+文章${aEn.length})`);
  }
  console.log(`[tag] 共生成 ${count} 个分类 × 2 语言 = ${count * 2} 个落地页`);
}

generate();
