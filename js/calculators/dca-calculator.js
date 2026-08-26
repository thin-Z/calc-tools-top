/**
 * 定投计算器 - 核心逻辑
 * 功能：定期定投（定期定额投资）未来价值计算，按月复利。
 * 用法：本文件为纯函数模块（IIFE），在浏览器中暴露 window.dcaCalculator 命名空间
 *       以及 window.futureValueDCA / window.totalInvested / window.interestEarned
 *       / window.balance 等顶层函数（供 UI 层与单元测试直接调用）。
 * 依赖：无（零第三方库，CSP 白名单不扩张）。
 */
(function () {
    'use strict';

    /**
     * 将金额四舍五入到 2 位小数并规整为数字。
     * @param {number} value - 原始计算结果。
     * @returns {number} 规整后的金额值。
     */
    function roundMoney(value) {
        if (value === null || value === undefined || !isFinite(value)) return 0;
        return Math.round((value + Number.EPSILON) * 100) / 100;
    }

    /**
     * 计算月利率（年化收益率转为月利率）。
     * @param {number} annualRatePct - 年化收益率（%），例如 8 表示 8%。
     * @returns {number} 月利率（小数），例如 0.08/12。
     */
    function monthlyRate(annualRatePct) {
        var r = Number(annualRatePct);
        if (!isFinite(r)) return 0;
        return r / 100 / 12;
    }

    /**
     * 计算总期数（月数）。
     * @param {number} years - 定投年限。
     * @param {number} [months] - 可选：手动指定的月数；缺省为 years*12。
     * @returns {number} 投资总月数（向下取整为整正数）。
     */
    function totalMonths(years, months) {
        var y = Number(years);
        if (!isFinite(y)) return 0;
        var m = months === undefined || months === null ? NaN : Number(months);
        if (isFinite(m) && m > 0) return Math.floor(m);
        return Math.floor(y * 12);
    }

    /**
     * 计算定投未来价值（按月复利）。
     * 期末年金模型：FV = P*(1+r)^n + PMT*[((1+r)^n - 1)/r]
     * @param {number} monthly - 每月投入金额（PMT）。
     * @param {number} annualRatePct - 年化收益率（%），例如 8 表示 8%。
     * @param {number} years - 定投年限。
     * @param {number} [initial=0] - 起始本金（P）。
     * @param {number} [months] - 可选：手动指定的月数；缺省为 years*12。
     * @returns {number} 未来价值总额。
     */
    function futureValueDCA(monthly, annualRatePct, years, initial, months) {
        var pmt = Number(monthly) || 0;
        var p = Number(initial) || 0;
        var r = monthlyRate(annualRatePct);
        var n = totalMonths(years, months);
        if (n <= 0) return roundMoney(p);
        // r 为 0 时避免除零：只要本金与每期投入累加。
        if (r === 0) return roundMoney(p + pmt * n);
        var growth = Math.pow(1 + r, n);
        var fv = p * growth + pmt * ((growth - 1) / r);
        return roundMoney(fv);
    }

    /**
     * 计算累计投入本金。
     * @param {number} monthly - 每月投入金额（PMT）。
     * @param {number} years - 定投年限。
     * @param {number} [initial=0] - 起始本金（P）。
     * @param {number} [months] - 可选：手动指定的月数；缺省为 years*12。
     * @returns {number} 累计投入总额（起始本金 + 每月定投之和）。
     */
    function totalInvested(monthly, years, initial, months) {
        var pmt = Number(monthly) || 0;
        var p = Number(initial) || 0;
        var n = totalMonths(years, months);
        return roundMoney(p + pmt * n);
    }

    /**
     * 计算收益金额。
     * @param {number} fv - 未来价值总额。
     * @param {number} invested - 累计投入本金。
     * @returns {number} 收益金额（未来价值 - 累计投入）。
     */
    function interestEarned(fv, invested) {
        return roundMoney(Number(fv) - Number(invested));
    }

    /**
     * 计算最终账户余额（等价于未来价值）。
     * @param {number} monthly - 每月投入金额。
     * @param {number} annualRatePct - 年化收益率（%）。
     * @param {number} years - 定投年限。
     * @param {number} [initial=0] - 起始本金。
     * @param {number} [months] - 可选：手动指定的月数。
     * @returns {number} 最终账户余额。
     */
    function balance(monthly, annualRatePct, years, initial, months) {
        return futureValueDCA(monthly, annualRatePct, years, initial, months);
    }

    // 暴露命名空间 + 顶层函数（UI 与单测两用）
    window.dcaCalculator = {
        futureValueDCA: futureValueDCA,
        totalInvested: totalInvested,
        interestEarned: interestEarned,
        balance: balance,
        monthlyRate: monthlyRate,
        totalMonths: totalMonths,
        roundMoney: roundMoney
    };
    window.futureValueDCA = futureValueDCA;
    window.totalInvested = totalInvested;
    window.interestEarned = interestEarned;
    window.balance = balance;
    window.monthlyRate = monthlyRate;
    window.totalMonths = totalMonths;
    window.roundMoney = roundMoney;
})();
