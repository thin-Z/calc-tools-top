/* ads-units.js — CSP 合规的手动广告单元触发（M1：锚定 ad unit，替换空 .ad-slot 占位）
 * -----------------------------------------------------------------
 * 站点 style-src / script-src 无 'unsafe-inline'（verify [7]/[8]/[9] 强制 0 内联），
 * 故 AdSense 官方代码里的内联 (adsbygoogle=window.adsbygoogle||[]).push({}) 不能直接用。
 * 本外链(defer)脚本在 DOM 解析后为页面上的 <ins class="adsbygoogle"> 触发 push：
 * 空对象 {} 让 AdSense 填充本页全部未填充的广告单元（官方行为）。
 * 若 adsbygoogle.js 尚未加载，push 会进入 window.adsbygoogle 队列，加载后统一处理。
 */
(function () {
  // 被 iframe 嵌入时（如 /embed 或第三方站点嵌入工具页）不触发广告填充：
  // Google 政策禁止在第三方 iframe 内展示广告，且空广告位无收益却占版面。
  // 判定必须在 push 之前，故放在 activateAds 入口。
  function isEmbedded() {
    try {
      return window.self !== window.top;
    } catch (e) {
      // 跨域访问 window.top 抛错 = 一定被嵌套
      return true;
    }
  }

  function activateAds() {
    if (isEmbedded()) {
      document.documentElement.classList.add('is-embedded');
      return;
    }
    if (document.querySelector('ins.adsbygoogle')) {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateAds);
  } else {
    activateAds();
  }
})();
