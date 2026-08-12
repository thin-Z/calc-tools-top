/* theme-init.js — 首屏主题初始化（head 同步加载，防 FOUC）
   优先级：URL 参数 (?theme=dark|light) > theme-preference > theme（兼容旧）> 系统偏好 > light */
(function () {
  var STORAGE_KEY = 'theme-preference';
  var LEGACY_KEY = 'theme';
  var theme = null;
  // URL 参数（调试/截图用，最高优先）
  var urlMatch = location.search.match(/[?&]theme=(dark|light)/);
  if (urlMatch) theme = urlMatch[1];
  if (!theme) {
    try {
      theme = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
    } catch (e) { /* storage 不可用时忽略 */ }
  }
  if (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark';
  }
  theme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
