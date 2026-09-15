// js/admin/badge-stats.js
// 吧唧制作运营统计仪表盘（CSP 合规：纯外部脚本，零内联）
// 调用公开聚合接口拉取总访问点击与总点赞，渲染到 admin/badge-stats.html。
// 中英文两版共用 toolId=badge-maker，后端已合并计数。
(function () {
  'use strict';

  var TOOL_ID = 'badge-maker';
  var els = {};

  function fmt(n) {
    return (typeof n === 'number' && !isNaN(n)) ? n.toLocaleString('zh-CN') : '—';
  }

  function getJSON(url) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 5000);
    return fetch(url, {
      signal: ctrl.signal,
      headers: { 'Accept': 'application/json' }
    }).then(function (r) {
      clearTimeout(timer);
      return r.ok ? r.json() : null;
    }).catch(function () {
      clearTimeout(timer);
      return null;
    });
  }

  function load() {
    if (els.error) els.error.textContent = '';
    var pClicks = getJSON('/api/clicks?tools=' + encodeURIComponent(TOOL_ID));
    var pLikes = getJSON('/api/likes?tools=' + encodeURIComponent(TOOL_ID));
    Promise.all([pClicks, pLikes]).then(function (res) {
      var c = res[0], l = res[1];
      var clicks = (c && c.tools && typeof c.tools[TOOL_ID] === 'number') ? c.tools[TOOL_ID] : null;
      var likes = (l && l.tools && typeof l.tools[TOOL_ID] === 'number') ? l.tools[TOOL_ID] : null;
      if (els.clicks) els.clicks.textContent = fmt(clicks);
      if (els.likes) els.likes.textContent = fmt(likes);
      if (els.updated) els.updated.textContent = '更新于 ' + new Date().toLocaleString('zh-CN');
      if ((!c || !l) && els.error) {
        els.error.textContent = '数据获取失败，请稍后重试（接口可能限流或网络异常）。';
      }
    });
  }

  function init() {
    els.clicks = document.getElementById('stat-clicks');
    els.likes = document.getElementById('stat-likes');
    els.updated = document.getElementById('stat-updated');
    els.error = document.getElementById('stat-error');
    var btn = document.getElementById('btn-refresh');
    if (btn) btn.addEventListener('click', load);
    load();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
