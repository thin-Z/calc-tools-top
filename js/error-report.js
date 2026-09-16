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
  // 过滤外部广告脚本（AdSense）自身抛出的 TagError：
  // 这些不是本站代码 bug，adsbygoogle.js 会在多种正常场景下（bfcache 前进/后退、
  // 广告位宽度为 0 的瞬时态等）自行抛出，对页面无影响、不可由本站修复。
  // 上报只会污染错误日志、徒增函数调用。广告填充率请在 AdSense 后台监控。
  var AD_NOISE_RE = /adsbygoogle|googlesyndication\.com|pagead2/i;
  function isExternalAdError(payload) {
    return AD_NOISE_RE.test(payload.source || '') || AD_NOISE_RE.test(payload.message || '');
  }
  function report(payload) {
    if (reported >= MAX_REPORTS) return;
    if (isLocal()) return;       // 本地不报
    if (isExternalAdError(payload)) return; // 丢弃 AdSense 噪声，不计入配额
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
