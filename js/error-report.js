// js/error-report.js — 前端 JS 错误上报（Phase 5 T5.1，CSP 合规）
// 捕获 window.onerror / unhandledrejection，上报到 /api/error-report（POST，fetch）。
// 仅上报生产（非 localhost/localhost）；采样避免噪声；try/catch 容错不阻断页面。
(function () {
  'use strict';
  function isLocal() {
    return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(location.origin) || location.protocol === 'file:';
  }
  // 采样：最多上报前 N 条/会话（避免刷屏误伤限速）
  var MAX_REPORTS = 5;
  var reported = 0;
  function report(payload) {
    if (reported >= MAX_REPORTS) return;
    if (isLocal()) return;       // 本地不报
    reported++;
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/error-report', JSON.stringify(payload));
      } else {
        fetch('/api/error-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fetch' },
          body: JSON.stringify(payload),
          keepalive: true
        });
      }
    } catch (e) { /* no-op */ }
  }
  function fill(extra) {
    var o = {};
    o.pageUrl = location.href.slice(0, 200);
    o.userAgent = navigator.userAgent || '';
    o.t = Date.now();
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return o;
  }
  // window.onerror
  window.addEventListener('error', function (e) {
    report(fill({
      type: 'error',
      message: (e && e.message) || 'unknown',
      source: (e && e.filename) || '',
      lineno: (e && e.lineno) || 0,
      colno: (e && e.colno) || 0
    }));
  });
  // unhandledrejection
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    report(fill({ type: 'unhandledrejection', message: (r && (r.message || String(r))) || 'unknown' }));
  });
})();
