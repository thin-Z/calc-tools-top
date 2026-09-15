// js/image-tools/badge-track.js
// 在线吧唧制作工具「访问点击」上报（CSP 合规：纯外部脚本，零内联）
// 每次工具页加载上报 1 次访问点击到 /api/clicks（toolId=badge-maker）。
// 与首页 hot 卡 / 工具卡使用同一 toolId，点击与点赞在后端聚合同一 KV key，
// 中英文两版共用该 id，合并统计。不影响任何制作/导出/分享流程。
(function () {
  'use strict';

  var TOOL_ID = 'badge-maker';

  function reportClick() {
    var payload = JSON.stringify({ toolId: TOOL_ID });
    // 优先复用站点统一 API 客户端（与 like.js 同款降级策略）
    if (typeof window.ApiClient !== 'undefined' && window.ApiClient.post) {
      window.ApiClient.post('/api/clicks', { toolId: TOOL_ID });
      return;
    }
    // 降级：直接 fetch（CSP 允许，无内联）。keepalive 保证卸载前也能送达。
    try {
      fetch('/api/clicks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      });
    } catch (e) {
      /* 静默失败：点击统计是增强项，绝不阻塞工具使用 */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reportClick);
  } else {
    reportClick();
  }
})();
