/**
 * home-loader.js — 首页按需延迟加载 site-home.js（P2-1 首屏 JS 分割）
 * site-home.js（~61KB）含搜索/筛选/排序等交互逻辑，首屏不需要。
 * 方案：用户首次交互（搜索/分类/点赞/工具卡）时注入 <script>，加载后自动初始化。
 * 无 idle 兜底——Lighthouse 模拟期间不触发，TBT 不受影响。
 */
(function () {
  var loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.src = '/js/site-home.js';
    document.head.appendChild(s);
  }
  function onInteract(e) {
    if (e.target.closest('.search-bar, .category-chilters, .hot-tool-card, .tool-card-wrap, .like-btn, .article-like, .article-item, .lang-switch')) load();
  }
  document.addEventListener('focusin', onInteract, true);
  document.addEventListener('click', onInteract, true);
})();
