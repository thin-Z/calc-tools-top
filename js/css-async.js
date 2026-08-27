/* css-async.js — 非阻塞应用预载样式表（T2.1/T2.3 性能硬指标）
 * CSP 安全：external deferred script，无内联 onload（严格 CSP 禁止，verify [8] 强制 0 内联）。
 * 将 <link rel="preload" as="style" data-async-style> 转为 rel="stylesheet"，
 * 使 114KB 全量 style.css 与 Google Fonts 不阻塞首屏渲染（preload 先行抓取，此处再应用）。
 * 与 <noscript> 回退共存：无 JS 时 noscript 内的 <link rel="stylesheet"> 直接生效。 */
(function () {
  function applyAsyncCss() {
    var links = document.querySelectorAll('link[rel="preload"][as="style"][data-async-style]');
    for (var i = 0; i < links.length; i++) {
      links[i].rel = 'stylesheet';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAsyncCss);
  } else {
    applyAsyncCss();
  }
})();
