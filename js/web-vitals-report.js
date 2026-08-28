// web-vitals -> GA4 上报（CSP 合规：库从 cdn.jsdelivr.net 加载，已在 vercel.json script-src 白名单）
// 库全局为 window.webVitals（web-vitals v4 UMD 构建）。指标经 gtag 推到 GA4（G-B61D908J5F），non_interaction 避免影响跳出率。
(function () {
  function report(metric) {
    try {
      if (typeof gtag === 'function') {
        gtag('event', metric.name, {
          value: Math.round(metric.value),
          metric_id: metric.id,
          metric_delta: Math.round(metric.delta),
          metric_rating: metric.rating,
          non_interaction: true
        });
      }
    } catch (e) { /* no-op */ }
  }
  function bind() {
    if (window.webVitals) {
      window.webVitals.onLCP(report);
      window.webVitals.onCLS(report);
      window.webVitals.onINP(report);
      window.webVitals.onFID(report);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
