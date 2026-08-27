window.dataLayer = window.dataLayer || [];
function gtag(){ window.dataLayer.push(arguments); }

// P2-1：GA4 脚本改到 window.load 后延迟注入（首屏主线程不被 gtag.js 占用，降 TBT）。
// dataLayer 队列会在 gtag.js 加载后统一处理，因此不会丢事件（仅初始 pageview 稍晚）。
(function () {
  function loadGtag() {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-B61D908J5F';
    s.onload = function () {
      gtag('js', new Date());
      gtag('config', 'G-B61D908J5F');
    };
    document.head.appendChild(s);
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('load', loadGtag, { once: true });
  } else {
    window.onload = loadGtag;
  }
})();
