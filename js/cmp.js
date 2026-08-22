/* ===== CMP 轻量 Cookie 同意横幅逻辑（CSP T03 外链化，原 build.mjs 内联注入） =====
 * 由 build.mjs 以 <script src="/js/cmp.js" defer></script> 注入到每页 </body> 前。
 * defer 在 DOM 解析完成后执行 → #cmp-banner 已就绪，与原内联位置等价。
 * 仅必要/同意按钮使用 addEventListener，无内联处理器，符合严格 CSP。
 */
(function () {
    'use strict';
    try {
        if (localStorage.getItem('cookie-consent')) { return; }
        var b = document.getElementById('cmp-banner');
        if (b) b.hidden = false;
        function done(v) {
            try { localStorage.setItem('cookie-consent', v); } catch (e) {}
            var x = document.getElementById('cmp-banner');
            if (x) x.hidden = true;
            if (v === 'granted' && typeof gtag !== 'undefined') {
                try { gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted' }); } catch (e) {}
            }
        }
        var a = document.getElementById('cmp-accept');
        if (a) a.addEventListener('click', function () { done('granted'); });
        var d = document.getElementById('cmp-decline');
        if (d) d.addEventListener('click', function () { done('necessary'); });
    } catch (e) {}
})();
