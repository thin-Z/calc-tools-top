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
  // ── AdSense 噪声过滤（第二道防线，非唯一防线）────────────────────────────
  // 背景实测（10-05 chromium 受控复现）：adsbygoogle.js 会自行抛出
  //   TagError，message 为单字符 "W"、stack 完全为空（非本站 JS 错误形态）。
  //   来源已用负向自证定性：同页面 route() 阻断 googlesyndication/adsbygoogle
  //   后 TagError 由 3 条归零（成功拦到 8 个 AdSense 请求）→ 属外部脚本噪声，
  //   非本站代码缺陷、不可由本站修复，对页面无影响。
  //
  // [局限] 如实说明本过滤的不足（勿再把它当成「该噪声已被处理」的依据）：
  //   1) TagError 的 message 只有 "W"，不含任何品牌词 → 本正则拦不住它；
  //      唯一指望 e.filename 填上 AdSense 脚本 URL，浏览器是否填不确定。
  //   2) 本脚本只监听 window 'error' 与 'unhandledrejection'；而
  //      audit-visual 复现到的 pageerror 走 Playwright 的 pageerror 通道，
  //      两边 6 轮 72 次加载复现次数严重不匹配（pageerror 稳定 3~5 条，
  //      window 'error' 监听器 0 条）→ TagError 是否会进入本上报路径
  //      尚未验证，可能从未到达（那样就是无害空转）。
  //   3) 结论只能表述为「疑似从未进入上报路径」，不得声称「过滤有效」。
  //
  // 定位：保留本正则作为兜底（防 AdSense 显式报错被上报），真正的噪声治理在
  //   audit-visual 侧 —— 该噪声已定性为外部脚本 flake，降为告警不阻断。
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
