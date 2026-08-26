/* theme-toggle.js — 主题切换（自包含，兼容所有页面）
   职责：
   1. header 中无 #theme-toggle 时自动注入
   2. 统一接管 #theme-toggle 与 #gw-theme（清除 gw-theme 内联 onclick，避免双触发）
   3. 写入 theme-preference（并同步旧 theme key 兼容）
   4. 更新所有主题按钮图标（跟随主题） */
(function () {
  var STORAGE_KEY = 'theme-preference';
  var LEGACY_KEY = 'theme';

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function renderIcons() {
    var sun = '<svg class="ic" aria-hidden="true"><use href="#icon-sun"></use></svg>';
    var moon = '<svg class="ic" aria-hidden="true"><use href="#icon-moon"></use></svg>';
    var icon = currentTheme() === 'dark' ? moon : sun;
    document.querySelectorAll('#theme-toggle, #gw-theme').forEach(function (btn) {
      if (!btn) return;
      var inner = btn.querySelector('.theme-icon');
      if (inner) inner.innerHTML = icon;
      else btn.innerHTML = icon;
    });
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      localStorage.setItem(LEGACY_KEY, theme); // 兼容旧 key
    } catch (e) { /* storage 不可用时忽略 */ }
    renderIcons();
  }

  window.__toggleTheme = function () {
    setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  };

  function ensureHeaderButton() {
    if (document.getElementById('theme-toggle')) return;
    var nav = document.querySelector('header nav') || document.querySelector('header');
    if (!nav) return;
    var btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', '\u5207\u6362\u4E3B\u9898');
        btn.innerHTML = currentTheme() === 'dark'
      ? '<svg class="ic" aria-hidden="true"><use href="#icon-moon"></use></svg>'
      : '<svg class="ic" aria-hidden="true"><use href="#icon-sun"></use></svg>';
    nav.appendChild(btn);
  }

  function bind() {
    ensureHeaderButton();
    // 清除 gw-theme 内联 onclick，统一走事件委托（防双触发）
    document.querySelectorAll('#gw-theme').forEach(function (btn) {
      btn.onclick = null;
    });
    document.addEventListener('click', function (e) {
      var t = e.target.closest('#theme-toggle, #gw-theme');
      if (!t) return;
      window.__toggleTheme();
    });
    renderIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
