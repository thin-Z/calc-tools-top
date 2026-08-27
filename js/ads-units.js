/* ads-units.js — CSP 合规的手动广告单元触发（M1：锚定 ad unit，替换空 .ad-slot 占位）
 * -----------------------------------------------------------------
 * 站点 style-src / script-src 无 'unsafe-inline'（verify [7]/[8]/[9] 强制 0 内联），
 * 故 AdSense 官方代码里的内联 (adsbygoogle=window.adsbygoogle||[]).push({}) 不能直接用。
 * 本外链(defer)脚本在 DOM 解析后为页面上的 <ins class="adsbygoogle"> 触发 push：
 * 空对象 {} 让 AdSense 填充本页全部未填充的广告单元（官方行为）。
 * 若 adsbygoogle.js 尚未加载，push 会进入 window.adsbygoogle 队列，加载后统一处理。
 */
(function () {
  function activateAds() {
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
