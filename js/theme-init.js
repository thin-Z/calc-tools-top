/* theme-init.js — 首屏主题初始化（head 同步加载，防 FOUC）
   读取优先级：theme-preference（新）> theme（旧兼容）> 系统偏好 > light */
(function () {
  var STORAGE_KEY = 'theme-preference';
  var LEGACY_KEY = 'theme';
  var theme = null;
  try {
    theme = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
  } catch (e) { /* storage 不可用时忽略 */ }
  if (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  }
  theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
