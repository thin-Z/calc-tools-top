/**
 * 汇率换算 - 核心逻辑
 * 功能：基于内置参考汇率表（1 单位外币 = X 美元）进行任意两种货币的换算。
 * 用法：本文件为纯函数模块（IIFE），在浏览器中暴露 window.currency 命名空间
 *       以及 window.convertCurrency / window.getRate / window.CURRENCIES 等。
 * 依赖：无（零第三方库，CSP 白名单不扩张）。汇率为固定参考值，需周期性人工更新。
 */
(function () {
    'use strict';

    // 参考汇率：1 单位货币 = X 美元（约 2026-08 参考值，非实时，人工更新）
    var RATES = {
        USD: 1,
        CNY: 0.138,
        EUR: 1.09,
        GBP: 1.28,
        JPY: 0.0068,
        HKD: 0.128,
        AUD: 0.66,
        CAD: 0.73,
        CHF: 1.13,
        SGD: 0.75,
        KRW: 0.00073,
        INR: 0.0119,
        RUB: 0.011,
        THB: 0.027
    };

    var NAMES = {
        USD: '美元 USD', CNY: '人民币 CNY', EUR: '欧元 EUR', GBP: '英镑 GBP',
        JPY: '日元 JPY', HKD: '港币 HKD', AUD: '澳元 AUD', CAD: '加元 CAD',
        CHF: '瑞郎 CHF', SGD: '新加坡元 SGD', KRW: '韩元 KRW', INR: '印度卢比 INR',
        RUB: '卢布 RUB', THB: '泰铢 THB'
    };

    /**
     * 获取指定货币的代码列表（用于下拉框）。
     * @returns {string[]} 支持货币的 ISO 代码数组。
     */
    function currencies() {
        return Object.keys(RATES);
    }

    /**
     * 获取某货币相对美元的名义汇率（1 单位 = X 美元）。
     * @param {string} code - ISO 货币代码，如 'CNY'。
     * @returns {number} 汇率；未知货币返回 0。
     */
    function getRate(code) {
        var c = String(code || '').toUpperCase();
        return RATES[c] || 0;
    }

    /**
     * 在两种货币间换算金额（基于美元交叉汇率）。
     * @param {number} amount - 金额。
     * @param {string} from - 源货币代码。
     * @param {string} to - 目标货币代码。
     * @returns {number} 换算后的金额；非法输入或未知货币返回 0。
     */
    function convertCurrency(amount, from, to) {
        var a = parseFloat(amount);
        var rf = getRate(from);
        var rt = getRate(to);
        if (isNaN(a) || rf <= 0 || rt <= 0) return 0;
        var usd = a * rf;
        return usd / rt;
    }

    /**
     * 按两位小数格式化金额，并附加货币代码。
     * @param {number} value - 数值。
     * @param {string} code - ISO 货币代码。
     * @returns {string} 形如 "123.45 CNY"。
     */
    function formatMoney(value, code) {
        var v = isNaN(value) ? 0 : value;
        return (Math.round(v * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + String(code || '').toUpperCase();
    }

    window.currency = {
        RATES: RATES,
        NAMES: NAMES,
        currencies: currencies,
        getRate: getRate,
        convertCurrency: convertCurrency,
        formatMoney: formatMoney
    };
    window.currencies = currencies;
    window.CURRENCIES = currencies;
    window.getRate = getRate;
    window.convertCurrency = convertCurrency;
    window.formatMoney = formatMoney;
})();
