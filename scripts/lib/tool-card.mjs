#!/usr/bin/env node
/**
 * scripts/lib/tool-card.mjs — 工具卡 HTML 单一模板
 * ============================================================
 * 抽出原因（2026-09-15 修复）：
 *   首页卡片由 generate-home.mjs 生成，结构为
 *     .tool-card-wrap > a.tool-card > (.icon>svg + h3 + p) + .tool-tags + .like-btn
 *   而栏目索引页（zh|en/{image,text,calculators}/index.html）历史上由手工维护，
 *   写成 `.tool-grid > a.tool-card`（**缺 .tool-card-wrap 包裹层**）且 `.icon` 为空 div。
 *   由于卡片外观（背景/边框/padding/圆角/hover/入场动画/点赞位）全部定义在
 *   `.tool-card-wrap` 上（css/style.css:377-396），裸 `.tool-card` 只剩 `flex:1`
 *   → 栏目页卡片退化为透明裸块、图标区域空白，视觉与首页严重不一致。
 *
 * 因此把卡片模板收敛到本模块，generate-home.mjs 与 generate-category-pages.mjs
 * 共用同一份实现，杜绝再次漂移。
 */

/**
 * 分类（tag）→ 首页区块 归属映射（一个分类映射到一个区块）。
 * 2026-09-15 收敛到本模块：首页（generate-home）与栏目页（generate-category-pages）
 * 必须共用同一份映射，否则「首页某区块的工具集合」与「该区块『查看全部』落点页筛选出的
 * 工具集合」会漂移（已发生：四个子区块按钮统一跳 calculators 全量页，展示全部 32 个工具）。
 */
export const CATEGORY_SECTION = {
  finance: 'finance',
  shopping: 'finance',
  health: 'health',
  life: 'life',
  travel: 'life',
  utility: 'utility',
  image: 'image',
  text: 'text',
};

/** 区块显示顺序（调整此数组即可改变全站区块顺序） */
export const SECTION_ORDER = ['finance', 'health', 'life', 'utility', 'image', 'text'];

/** 区块标题（栏目页筛选 chip 与首页共用措辞） */
export const SECTION_TITLES = {
  finance: { zh: '财务计算', en: 'Finance' },
  health: { zh: '健康计算', en: 'Health' },
  life: { zh: '生活 · 出行', en: 'Lifestyle' },
  utility: { zh: '实用工具', en: 'Utility Tools' },
  image: { zh: '图片工具', en: 'Image Tools' },
  text: { zh: '文字工具', en: 'Text Tools' },
};

/**
 * 区块 → 该区块涵盖的【原始分类 tag 集合】。
 * 注意多对一：finance 区块 = finance + shopping；life 区块 = life + travel。
 * 「查看全部」落点页必须按此集合筛选，才能与首页区块展示的工具集合完全一致
 * （只按单 tag 筛会漏：life 只筛 life 会得到 5 个，而首页区块实为 7 个）。
 */
export function sectionTags(section) {
  return Object.keys(CATEGORY_SECTION).filter((c) => CATEGORY_SECTION[c] === section);
}

/** 工具是否属于某区块（用于首页分区与落点页筛选，判定逻辑同源） */
export function toolInSection(tool, section) {
  return tool.categories.some((c) => CATEGORY_SECTION[c] === section);
}

/** 分类中文/英文显示名（tag 徽章用） */
export const TAG_LABELS = {
  finance: { zh: '财务', en: 'Finance' },
  health: { zh: '健康', en: 'Health' },
  life: { zh: '生活', en: 'Lifestyle' },
  shopping: { zh: '购物', en: 'Shopping' },
  travel: { zh: '出行', en: 'Travel' },
  utility: { zh: '工具', en: 'Utility' },
  image: { zh: '图片', en: 'Image' },
  text: { zh: '文字', en: 'Text' },
};

/**
 * 生成单个工具卡（与首页完全同构）。
 * @param {object} t tools.json 中的工具对象
 * @param {'zh'|'en'} lang 语言
 * @returns {string} 卡片 HTML
 */
export function generateCardHTML(t, lang) {
  const prefix = lang === 'zh' ? '/zh' : '/en';
  const text = t[lang];
  const cats = t.categories.join(',');
  const tagPrefix = lang === 'zh' ? '/tags/' : '/en/tags/';
  const tagsHTML = t.categories.map((c) => {
    const label = (TAG_LABELS[c] && TAG_LABELS[c][lang]) || c;
    return `<a href="${tagPrefix}${c}.html" class="tag tag-${c}" data-tag="${c}">${label}</a>`;
  }).join('');

  return `            <div class="tool-card-wrap"><a href="${prefix}/${t.dir}/${t.slug}" class="tool-card" data-category="${cats}" data-keywords-zh="${t.zh.kw}" data-keywords-en="${t.en.kw || ''}"><div class="icon"><svg class="ic" aria-hidden="true"><use href="/assets/icons/icons.svg#icon-${t.icon}"></use></svg></div><h3>${text.name}</h3><p>${text.desc}</p></a><div class="tool-tags">${tagsHTML}</div><button class="like-btn" data-like-id="${t.slug}"><span class="heart"><svg class="ic" aria-hidden="true"><use href="/assets/icons/icons.svg#icon-heart"></use></svg></span><span class="count">0</span></button></div>`;
}
