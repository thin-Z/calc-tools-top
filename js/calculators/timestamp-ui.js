/**
 * 时间戳转换 - UI 交互
 * 功能：绑定 Unix 时间戳输入与日期时间输入，实时双向转换，显示本地/UTC 时间及秒/毫秒值。
 *      所有事件均通过 addEventListener 绑定（零内联事件，CSP 合规）。隐藏元素一律使用
 *      classList.toggle('hidden')，禁用 style.display（.hidden 带 !important，会覆盖导致结果区不显示）。
 */
(function () {
    'use strict';

    var tsValue = null;
    var tsUnit = null;
    var dtValue = null;
    var resultArea = null;
    var localEl = null;
    var utcEl = null;
    var secEl = null;
    var msEl = null;

    function renderFromTs() {
        var raw = tsValue.value.trim();
        if (!raw) {
            resultArea.classList.add('hidden');
            return;
        }
        var unit = tsUnit.value;
        var effective = unit === 'auto' ? detectUnit(raw) : unit;
        if (!effective) {
            resultArea.classList.add('hidden');
            return;
        }
        // 按选择的单位解析（非 auto 时强制按该单位转换，便于查看不同精度）
        var n = parseInt(raw, 10);
        var ms = effective === 'ms' ? n : n * 1000;
        var d = new Date(ms);
        if (isNaN(d.getTime())) {
            resultArea.classList.add('hidden');
            return;
        }
        var sec = effective === 'ms' ? Math.floor(n / 1000) : n;
        localEl.textContent = formatDate(d, false);
        utcEl.textContent = formatDate(d, true);
        secEl.textContent = String(sec);
        msEl.textContent = effective === 'ms' ? String(n) : String(ms);
        resultArea.classList.remove('hidden');
    }

    function renderFromDt() {
        var raw = dtValue.value;
        if (!raw) {
            resultArea.classList.add('hidden');
            return;
        }
        var d = new Date(raw);
        if (isNaN(d.getTime())) {
            resultArea.classList.add('hidden');
            return;
        }
        var t = dateToTs(d);
        tsValue.value = String(t.sec);
        tsUnit.value = 's';
        localEl.textContent = formatDate(d, false);
        utcEl.textContent = formatDate(d, true);
        secEl.textContent = String(t.sec);
        msEl.textContent = String(t.ms);
        resultArea.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', function () {
        tsValue = document.getElementById('ts-value');
        tsUnit = document.getElementById('ts-unit');
        dtValue = document.getElementById('dt-value');
        resultArea = document.getElementById('result-area');
        localEl = document.getElementById('ts-local');
        utcEl = document.getElementById('ts-utc');
        secEl = document.getElementById('ts-sec');
        msEl = document.getElementById('ts-ms');
        if (!tsValue || !dtValue || !resultArea) return;

        tsValue.addEventListener('input', renderFromTs);
        tsUnit.addEventListener('change', renderFromTs);
        dtValue.addEventListener('input', renderFromDt);
        renderFromTs();
    });
})();
