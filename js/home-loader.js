/**
 * home-loader.js — 首页按需延迟加载 site-home.js（P2-1 首屏 JS 分割）
 * site-home.js（~61KB）含搜索/筛选/排序等交互逻辑，首屏不需要。
 * 方案：用户首次交互（搜索/分类/点赞/工具卡）时注入 <script>，加载后自动初始化。
 * 无 idle 兜底——Lighthouse 模拟期间不触发，TBT 不受影响。
 * 轻量 renderRecent：页面加载时立即渲染"最近使用"区块（不依赖 TOOLS_DATA）。
 */
(function () {
  /* --- 轻量 renderRecent（不依赖 site-home.js） --- */
  var RECENT_KEY = 'toolbox_recent';
  function renderRecentLite() {
    var sec = document.getElementById('recent-tools');
    var grid = document.getElementById('recent-tools-grid');
    if (!sec || !grid) return;
    var recent;
    try { recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch (e) { recent = []; }
    if (!Array.isArray(recent) || !recent.length) return;
    grid.textContent = '';
    var lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
    recent.forEach(function (id) {
      var btn = document.querySelector('.tool-grid [data-like-id="' + id + '"]');
      var wrap = btn ? btn.closest('.tool-card-wrap, .hot-tool-card') : null;
      var card = wrap ? wrap.querySelector('a.tool-card') : null;
      if (!card) return;
      var a = document.createElement('a');
      a.href = card.getAttribute('href');
      a.className = 'recent-tool';
      a.textContent = (lang === 'en' ? card.querySelector('h3')?.textContent : card.querySelector('h3')?.textContent) || id;
      grid.appendChild(a);
    });
    if (grid.children.length) sec.classList.remove('hidden');
  }
  renderRecentLite();

  /* --- site-home.js 按需加载 --- */
  var loaded = false;
  function load() {
    if (loaded) return;
    loaded = true;
    var s = document.createElement('script');
    s.src = '/js/site-home.js';
    document.head.appendChild(s);
  }
  function onInteract(e) {
    if (e.target.closest('.search-bar, .category-chip, .hot-tool-card, .tool-card-wrap, .like-btn, .article-like, .article-item, .lang-switch')) load();
  }
  document.addEventListener('focusin', onInteract, true);
  document.addEventListener('click', onInteract, true);

  /* --- 自动加载：热门工具计数等动态数据无需交互即可显示 --- */
  // 页面加载完成后自动注入 site-home.js（内部 initAll() 拉取真实点击/点赞数并刷新 hot-score）。
  // 用 requestIdleCallback（Safari/旧浏览器用 setTimeout 兜底）延迟到空闲期，首屏渲染不被阻塞，
  // 尽量保留 P2-1 首屏 JS 分割的收益。
  function autoLoad() { load(); }
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(autoLoad, { timeout: 1500 });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(autoLoad, 300); });
  } else {
    setTimeout(autoLoad, 300);
  }
})();
