/**
 * 汇率换算 - UI 交互
 * 功能：绑定金额、源货币、目标货币输入，实时换算并显示汇率。所有事件用 addEventListener
 *      （零内联事件，CSP 合规）。隐藏元素用 classList.toggle('hidden')，禁用 style.display。
 */
(function () {
    'use strict';

    var amountInput = null;
    var fromSelect = null;
    var toSelect = null;
    var resultArea = null;
    var resultEl = null;
    var rateEl = null;
    var swapBtn = null;

    function render() {
        var amount = parseFloat(amountInput.value);
        var from = fromSelect.value;
        var to = toSelect.value;
        if (isNaN(amount)) {
            resultArea.classList.add('hidden');
            return;
        }
        var out = convertCurrency(amount, from, to);
        resultEl.textContent = formatMoney(out, to);
        var rf = getRate(from);
        var rt = getRate(to);
        rateEl.textContent = '1 ' + from + ' ≈ ' + (Math.round((rf / rt) * 10000) / 10000) + ' ' + to;
        resultArea.classList.remove('hidden');
    }

    function fillSelect(sel, selected) {
        currencies().forEach(function (code) {
            var opt = document.createElement('option');
            opt.value = code;
            opt.textContent = NAMES[code] || code;
            if (code === selected) opt.selected = true;
            sel.appendChild(opt);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        amountInput = document.getElementById('fx-amount');
        fromSelect = document.getElementById('fx-from');
        toSelect = document.getElementById('fx-to');
        resultArea = document.getElementById('result-area');
        resultEl = document.getElementById('fx-result');
        rateEl = document.getElementById('fx-rate');
        swapBtn = document.getElementById('fx-swap');
        if (!amountInput || !fromSelect || !toSelect || !resultArea) return;

        amountInput.value = '100';
        fillSelect(fromSelect, 'USD');
        fillSelect(toSelect, 'CNY');

        amountInput.addEventListener('input', render);
        fromSelect.addEventListener('change', render);
        toSelect.addEventListener('change', render);
        if (swapBtn) {
            swapBtn.addEventListener('click', function () {
                var f = fromSelect.value;
                fromSelect.value = toSelect.value;
                toSelect.value = f;
                render();
            });
        }
        render();
    });
})();
