/**
 * js/category-filter.js — 栏目索引页分类筛选（calculators 页专用）
 * =================================================================
 * 背景（2026-09-15）：
 *   calculators 栏目页一页装 32 个工具，横跨财务 / 健康 / 生活·出行 / 实用 四个区块。
 *   首页各区块的「查看全部」原先都直接跳 /zh/calculators，落点页展示**全部 32 个工具**
 *   ——点了「财务计算 · 查看全部」却看到健康、实用等其它分类，与用户预期不符。
 *
 * 修法：首页链接携带 ?cat=<区块>（如 /zh/calculators?cat=finance），本脚本消费该参数，
 *   按 chip 上 data-category 声明的【原始 tag 集合】过滤卡片，只保留属于该区块的工具。
 *   ⚠️ 必须用「tag 集合」而非单 tag：life 区块 = life + travel（首页实为 7 个工具），
 *      只按 life 单 tag 筛会得到 5 个、漏掉出行类。
 *
 * 约定：
 *   - chip 由 scripts/generate-category-pages.mjs 生成（单一数据源 tools.json 派生）；
 *   - 参数值白名单取自页面已有 chip 的 data-cat-key，非法值一律忽略（防注入/脏参数）；
 *   - 无痕：筛选态通过 history.replaceState 同步到 URL，可分享/刷新保持；
 *   - CSP：无任何内联脚本/事件处理器，全部 addEventListener（R25）。
 */
(function () {
  'use strict';

  var filters = document.getElementById('categoryFilters');
  if (!filters) return;

  var chips = Array.prototype.slice.call(filters.querySelectorAll('.category-chip'));
  if (!chips.length) return;

  var grids = Array.prototype.slice.call(document.querySelectorAll('.tool-grid'));
  var countEl = document.querySelector('.tool-count');
  if (!grids.length) return;

  var lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
  var countSuffix = '';
  if (countEl) {
    // 从初始文案推导后缀（"共 32 款计算工具" → " 款计算工具"；"32 calculators" → " calculators"）
    // ⚠️ 空白必须一并捕获：否则会拼成「共 13款计算工具」（缺空格）
    var m = countEl.textContent.match(/(\d+)(\s*.*)$/);
    countSuffix = m ? m[2] : '';
  }

  function wrapOf(card) {
    return card.closest('.tool-card-wrap');
  }

  /** 应用筛选：catKey 为 chip 的 data-cat-key（'all' 或区块名） */
  function applyFilter(catKey, syncUrl) {
    var chip = chips.filter(function (c) { return c.getAttribute('data-cat-key') === catKey; })[0] || chips[0];
    var wanted = (chip.getAttribute('data-category') || 'all').split(',');

    chips.forEach(function (c) {
      var on = c === chip;
      c.classList.toggle('active', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    var visible = 0;
    grids.forEach(function (grid) {
      Array.prototype.slice.call(grid.querySelectorAll('.tool-card-wrap')).forEach(function (wrap) {
        var card = wrap.querySelector('.tool-card');
        if (!card) return;
        var cats = (card.getAttribute('data-category') || '').split(',');
        var show = catKey === 'all' || wanted.indexOf('all') !== -1
          || cats.some(function (c) { return wanted.indexOf(c) !== -1; });
        wrap.classList.toggle('filtered-out', !show);
        if (show) visible++;
      });
    });

    if (countEl && countSuffix) {
      countEl.textContent = (lang === 'zh' ? '共 ' : '') + visible + countSuffix;
    }

    if (syncUrl) {
      try {
        var params = new URLSearchParams(window.location.search);
        if (catKey === 'all') params.delete('cat');
        else params.set('cat', catKey);
        var qs = params.toString();
        history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash);
      } catch (e) { /* 忽略：URL 同步失败不影响筛选结果 */ }
    }
  }

  chips.forEach(function (chip) {
    chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
    chip.addEventListener('click', function () {
      applyFilter(chip.getAttribute('data-cat-key') || 'all', true);
    });
  });

  // 首屏：消费 ?cat= 参数（白名单校验，非法值回落到 all）
  var params = new URLSearchParams(window.location.search);
  var urlCat = params.get('cat');
  var validKeys = chips.map(function (c) { return c.getAttribute('data-cat-key'); });
  applyFilter(urlCat && validKeys.indexOf(urlCat) !== -1 ? urlCat : 'all', false);
})();
