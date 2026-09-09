/* ===== CSP T03 统一事件委托层 =====
 * 通过 document 级委托处理 data-csp-* 数据属性，替代全部内联事件处理器（onxxx=）。
 * 语义映射：
 *   onclick="fn()"              → data-csp-click="fn"
 *   onclick="fn('arg')"         → data-csp-click="fn" data-csp-arg="arg"
 *   onchange="switchLang(this.value)" → data-csp-change="switchLang"（change 委托自动传 el.value）
 *   onchange="fn()"             → data-csp-change="fn"
 *   oninput="fn()"              → data-csp-input="fn"
 *   onsubmit="return false;"    → data-csp-submit="prevent"
 *
 * 调用约定：window[fn] 必须为全局函数（顶层 function 声明即可）。
 * 参数约定：click/input → fn(el, e)；带 data-csp-arg 时 → fn(arg, el, e)；
 *           change → fn(el.value, el, e)。
 * 缺失兜底：console.warn 提示，避免静默失效。
 * 绑定时机：DOMContentLoaded（业务脚本均为 defer，此时已就绪）。
 */
(function () {
    'use strict';

    function invoke(fnName, args) {
        if (typeof window[fnName] === 'function') {
            try { window[fnName].apply(null, args); }
            catch (err) { console.warn('[csp-events] handler error:', fnName, err); }
        } else {
            console.warn('[csp-events] missing handler:', fnName);
        }
    }

    function init() {
        document.addEventListener('click', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-csp-click]') : null;
            if (!el) return;
            var fn = el.getAttribute('data-csp-click');
            var arg = el.getAttribute('data-csp-arg');
            if (arg !== null) invoke(fn, [arg, el, e]);
            else invoke(fn, [el, e]);
        });

        document.addEventListener('change', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-csp-change]') : null;
            if (!el) return;
            var fn = el.getAttribute('data-csp-change');
            invoke(fn, [el.value, el, e]);
        });

        document.addEventListener('input', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-csp-input]') : null;
            if (!el) return;
            var fn = el.getAttribute('data-csp-input');
            invoke(fn, [el.value, el, e]);
        });

        document.addEventListener('submit', function (e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-csp-submit]') : null;
            if (el) e.preventDefault();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /**
     * 全局剪贴板工具：优先使用 navigator.clipboard（安全上下文 / 用户手势），
     * 失败或非安全上下文回退到 textarea + execCommand('copy')。
     * 返回 Promise，供各页面 copy* 函数统一调用，规避 CSP 对动态内联 onclick 的拦截。
     * @param {string} text - 待复制文本。
     * @returns {Promise<void>}
     */
    window.copyText = function (text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.top = '-1000px';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                ta.setSelectionRange(0, ta.value.length);
                var ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) resolve(); else reject(new Error('execCommand copy failed'));
            } catch (err) { reject(err); }
        });
    };
})();
