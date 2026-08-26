// Phase 0 / T0.2 — edit source files to remove functional emoji.
// Uses unicode-escape regexes (no literal-emoji matching) for reliability.
import fs from 'node:fs';

const SPRITE = '/assets/icons/icons.svg';
const svg = (name) => `<svg class="ic" aria-hidden="true"><use href="${SPRITE}#icon-${name}"></use></svg>`;

function apply(file, ops) {
  let s = fs.readFileSync(file, 'utf8');
  let n = 0;
  for (const op of ops) {
    const re = new RegExp(op.re, op.flags || '');
    if (re.test(s)) { s = s.replace(re, op.rep); n++; }
  }
  if (n > 0) fs.writeFileSync(file, s, 'utf8');
  console.log(`${file}: ${n} replacements`);
}

/* ---------- generate-home.mjs ---------- */
apply('scripts/generate-home.mjs', [
  { re: 'const sectionHeaders = \\{[\\s\\S]*?\\n\\};', rep:
`const sectionHeaders = {
  finance: { zh: '财务计算', en: 'Finance', id: 'sec-finance' },
  health:  { zh: '健康计算', en: 'Health', id: 'sec-health' },
  life:    { zh: '生活 · 出行', en: 'Lifestyle', id: 'sec-life' },
  utility: { zh: '实用工具', en: 'Utility Tools', id: 'sec-utility' },
  image:   { zh: '图片工具', en: 'Image Tools', id: 'sec-image', privacy: true },
  text:    { zh: '文字工具', en: 'Text Tools', id: 'sec-text' },
};`, flags: 'u' },
  { re: 'const TAG_LABELS = \\{[\\s\\S]*?\\n\\};', rep:
`const TAG_LABELS = {
  finance: { zh: '财务', en: 'Finance' },
  health: { zh: '健康', en: 'Health' },
  life: { zh: '生活', en: 'Lifestyle' },
  shopping: { zh: '购物', en: 'Shopping' },
  travel: { zh: '出行', en: 'Travel' },
  utility: { zh: '工具', en: 'Utility' },
  image: { zh: '图片', en: 'Image' },
  text: { zh: '文字', en: 'Text' },
};`, flags: 'u' },
  { re: '<div class="icon">\\$\\{t\\.icon\\}<\\/div>', rep: '<div class="icon"><svg class="ic" aria-hidden="true"><use href="' + SPRITE + '#icon-${t.icon}"></use></svg></div>' },
  { re: '<span class="heart">\\u2764<span class="count">0<\\/span><\\/button>', rep: `<span class="heart">${svg('heart')}<span class="count">0</span></button>` },
  { re: '<span class="privacy-badge-sm">\\u{1F512} ', rep: `<span class="privacy-badge-sm">${svg('lock')} ` },
  { re: '\\u26A0\\uFE0F?\\s*标记未找到', rep: '标记未找到' },
  { re: '\\u2705', rep: '', flags: 'g' },
]);

/* ---------- generate-tag-pages.mjs ---------- */
apply('scripts/generate-tag-pages.mjs', [
  { re: "const EMOJI = \\{[\\s\\S]*?\\};", rep: "const EMOJI = {}; // 图标已迁移至自托管 Lucide sprite (assets/icons/icons.svg)" },
  { re: "const lbl = \\(EMOJI\\[c\\] \\|\\| ''\\) \\+ ' ' \\+ \\(LABELS\\[lang\\]\\[c\\] \\|\\| c\\);", rep: "const lbl = (LABELS[lang][c] || c);" },
]);

/* ---------- js/site-home.js ---------- */
apply('js/site-home.js', [
  // SITE_CONFIG.categories icon -> lucide names
  { re: "icon: '\\u{1F4B0}'", rep: "icon: 'wallet'", flags: 'u' },
  { re: "icon: '\\u{1F3ED}'", rep: "icon: 'activity'", flags: 'u' },
  { re: "icon: '\\u{1F3E0}'", rep: "icon: 'home'", flags: 'u' },
  { re: "icon: '\\u{1F6D2}'", rep: "icon: 'shopping-cart'", flags: 'u' },
  { re: "icon: '\\u{1F697}'", rep: "icon: 'plane'", flags: 'u' },
  { re: "icon: '\\u{1F527}'", rep: "icon: 'wrench'", flags: 'u' },
  { re: "icon: '\\u{1F5BC}\\uFE0F?'", rep: "icon: 'image'", flags: 'u' },
  { re: "icon: '\\u{270F}\\uFE0F?'", rep: "icon: 'file-text'", flags: 'u' },
  // catTexts labels -> strip emoji
  { re: '\\u{1F4B0}\\uFE0F?\\s*财务', rep: '财务', flags: 'u' },
  { re: '\\u{1F3ED}\\uFE0F?\\s*健康', rep: '健康', flags: 'u' },
  { re: '\\u{1F3E0}\\uFE0F?\\s*生活', rep: '生活', flags: 'u' },
  { re: '\\u{1F6D2}\\uFE0F?\\s*购物', rep: '购物', flags: 'u' },
  { re: '\\u{1F697}\\uFE0F?\\s*出行', rep: '出行', flags: 'u' },
  { re: '\\u{1F527}\\uFE0F?\\s*工具', rep: '工具', flags: 'u' },
  { re: '\\u{1F5BC}\\uFE0F?\\s*图片', rep: '图片', flags: 'u' },
  { re: '\\u{270F}\\uFE0F?\\s*文字', rep: '文字', flags: 'u' },
  { re: '\\u{1F4B0}\\uFE0F?\\s*Finance', rep: 'Finance', flags: 'u' },
  { re: '\\u{1F3ED}\\uFE0F?\\s*Health', rep: 'Health', flags: 'u' },
  { re: '\\u{1F3E0}\\uFE0F?\\s*Lifestyle', rep: 'Lifestyle', flags: 'u' },
  { re: '\\u{1F6D2}\\uFE0F?\\s*Shopping', rep: 'Shopping', flags: 'u' },
  { re: '\\u{1F697}\\uFE0F?\\s*Travel', rep: 'Travel', flags: 'u' },
  { re: '\\u{1F527}\\uFE0F?\\s*Utility', rep: 'Utility', flags: 'u' },
  { re: '\\u{1F5BC}\\uFE0F?\\s*Image', rep: 'Image', flags: 'u' },
  { re: '\\u{270F}\\uFE0F?\\s*Text', rep: 'Text', flags: 'u' },
  // trend badges
  { re: '\\u{1F525} 今日热门', rep: '今日热门', flags: 'u' },
  { re: '\\u2B06 今日使用', rep: '今日使用', flags: 'u' },
  { re: "'\\u{1F525} ' \\+ entry\\.score", rep: 'entry.score', flags: 'u' },
  // usage-count sparkle
  { re: "'\\u2728 ' \\+ total", rep: 'total', flags: 'gu' },
  // hot-tool card icon render -> SVG
  { re: "' \\+ tool\\.icon \\+ '<\\/div>'", rep: `><svg class="ic" aria-hidden="true"><use href="${SPRITE}#icon-' + tool.icon + '"></use></svg></div>` },
]);

/* ---------- js/theme-toggle.js ---------- */
apply('js/theme-toggle.js', [
  { re: 'function renderIcons\\(\\) \\{[\\s\\S]*?\\n  \\}', rep:
`function renderIcons() {
    var sun = '${svg('sun')}';
    var moon = '${svg('moon')}';
    var icon = currentTheme() === 'dark' ? moon : sun;
    document.querySelectorAll('#theme-toggle, #gw-theme').forEach(function (btn) {
      if (!btn) return;
      var inner = btn.querySelector('.theme-icon');
      if (inner) inner.innerHTML = icon;
      else btn.innerHTML = icon;
    });
  }` },
  { re: "btn\\.textContent = currentTheme\\(\\) === 'dark'[^;]*;", rep:
`    btn.innerHTML = currentTheme() === 'dark'
      ? '${svg('moon')}'
      : '${svg('sun')}';` },
]);

/* ---------- js/embed.js ---------- */
apply('js/embed.js', [
  { re: '<span class="embed-brand">\\u26A1 ', rep: '<span class="embed-brand">', flags: 'u' },
]);

/* ---------- checkmark symbols in calculator UI JS ---------- */
apply('js/image-tools/base64.js', [
  { re: "'\\u2705 ' \\+", rep: "'", flags: 'u' },
]);
apply('js/calculators/simplified-traditional-ui.js', [
  { re: " '\\u2713'", rep: " ''", flags: 'u' },
]);
apply('js/calculators/color-contrast-ui.js', [
  { re: "'\\u2713 通过'", rep: "'通过'", flags: 'u' },
  { re: "'\\u2717 未通过'", rep: "'未通过'", flags: 'u' },
]);

console.log('SOURCE EDIT DONE');
