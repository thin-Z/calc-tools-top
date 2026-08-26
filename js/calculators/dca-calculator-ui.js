/**
 * 定投计算器 - UI 交互
 * 功能：绑定每月投入金额、年化收益率、定投年限、起始本金与月数输入，实时计算
 *      定期定投的未来价值、累计投入本金与收益金额。
 *      所有事件均通过 addEventListener 绑定（零内联事件，CSP 合规）。隐藏元素一律使用
 *      classList.toggle('hidden')，禁用 style.display（.hidden 带 !important，会覆盖导致结果区不显示）。
 */
(function () {
    'use strict';

    var monthlyEl = null;
    var rateEl = null;
    var yearsEl = null;
    var initialEl = null;
    var monthsEl = null;
    var resultArea = null;
    var fvEl = null;
    var investedEl = null;
    var interestEl = null;

    /**
     * 从各输入框读取数值，转换为安全数字。
     * @param {HTMLInputElement} el - 目标输入框。
     * @returns {number} 解析后的数字（非法/空返回 0）。
     */
    function readNumber(el) {
        var v = parseFloat(el.value);
        return isFinite(v) ? v : 0;
    }

    /**
     * 将金额格式化为千分位字符串。
     * @param {number} value - 金额。
     * @returns {string} 格式化结果，如 "1,234.56"。
     */
    function formatMoney(value) {
        var v = Number(value);
        if (!isFinite(v)) return '--';
        return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function render() {
        var monthly = readNumber(monthlyEl);
        var rate = readNumber(rateEl);
        var years = readNumber(yearsEl);
        var initial = readNumber(initialEl);
        var months = readNumber(monthsEl);

        // 输入校验：每月投入与年限必须为正，否则隐藏结果区。
        if (monthly <= 0 || years <= 0) {
            resultArea.classList.add('hidden');
            return;
        }

        var fv = futureValueDCA(monthly, rate, years, initial, months);
        var invested = totalInvested(monthly, years, initial, months);
        var interest = interestEarned(fv, invested);

        fvEl.textContent = formatMoney(fv);
        investedEl.textContent = formatMoney(invested);
        interestEl.textContent = formatMoney(interest);
        resultArea.classList.remove('hidden');
    }

    /**
     * 当年限变化时，自动将月数同步为 years*12（除非用户已手动覆盖月数）。
     */
    function syncMonthsFromYears() {
        var years = readNumber(yearsEl);
        if (years > 0) monthsEl.value = String(Math.round(years * 12));
    }

    document.addEventListener('DOMContentLoaded', function () {
        monthlyEl = document.getElementById('dca-monthly');
        rateEl = document.getElementById('dca-annualRate');
        yearsEl = document.getElementById('dca-years');
        initialEl = document.getElementById('dca-initial');
        monthsEl = document.getElementById('dca-months');
        resultArea = document.getElementById('result-area');
        fvEl = document.getElementById('dca-fv');
        investedEl = document.getElementById('dca-invested');
        interestEl = document.getElementById('dca-interest');
        if (!monthlyEl || !yearsEl || !resultArea) return;

        monthlyEl.addEventListener('input', render);
        rateEl.addEventListener('input', render);
        yearsEl.addEventListener('input', function () { syncMonthsFromYears(); render(); });
        initialEl.addEventListener('input', render);
        monthsEl.addEventListener('input', render);
        render();
    });
})();
