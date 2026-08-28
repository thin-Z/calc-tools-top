/**
 * 汇率换算器 - 核心逻辑 + UI（合并单文件，主模板约定）
 * 逻辑层保持 window.currency 命名空间；UI 交互改为全局函数 + data-csp-* 委托（见 js/csp-events.js）。
 * 汇率为固定参考值（约 2026-08），需周期性人工更新。
 */

// ---------- 逻辑层（零第三方库，CSP 白名单不扩张） ----------

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
 * 获取支持货币的 ISO 代码列表（用于下拉框）。
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

// 暴露逻辑层（供其它脚本/调试使用）
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
window.NAMES = NAMES;

// ---------- UI 层（全局函数，供 data-csp-* 委托调用） ----------

/**
 * 填充货币下拉框选项。
 * @param {HTMLSelectElement} sel - 目标 select。
 * @param {string} selected - 默认选中的货币代码。
 */
function fillSelect(sel, selected) {
    currencies().forEach(function (code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = NAMES[code] || code;
        if (code === selected) opt.selected = true;
        sel.appendChild(opt);
    });
}

/**
 * 读取输入并实时渲染换算结果（金额/下拉变化入口）。
 */
function renderCurrency() {
    var amountInput = document.getElementById('fx-amount');
    var fromSelect = document.getElementById('fx-from');
    var toSelect = document.getElementById('fx-to');
    var resultArea = document.getElementById('result-area');
    var resultEl = document.getElementById('fx-result');
    var rateEl = document.getElementById('fx-rate');
    if (!amountInput || !fromSelect || !toSelect || !resultArea) return;

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

/**
 * 交换源/目标货币并重新渲染（data-csp-click="swapCurrencies"）。
 */
function swapCurrencies() {
    var fromSelect = document.getElementById('fx-from');
    var toSelect = document.getElementById('fx-to');
    if (!fromSelect || !toSelect) return;
    var f = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = f;
    renderCurrency();
}

/**
 * 重置表单并隐藏结果区（data-csp-click="resetCurrency"）。
 */
function resetCurrency() {
    var amountInput = document.getElementById('fx-amount');
    var fromSelect = document.getElementById('fx-from');
    var toSelect = document.getElementById('fx-to');
    var resultArea = document.getElementById('result-area');
    if (amountInput) amountInput.value = '';
    if (fromSelect) fromSelect.value = 'USD';
    if (toSelect) toSelect.value = 'CNY';
    if (resultArea) resultArea.classList.add('hidden');
}

// ---------- 初始化 ----------
function initCurrencyConverter() {
    var amountInput = document.getElementById('fx-amount');
    var fromSelect = document.getElementById('fx-from');
    var toSelect = document.getElementById('fx-to');
    if (!amountInput || !fromSelect || !toSelect) return;
    amountInput.value = '100';
    fillSelect(fromSelect, 'USD');
    fillSelect(toSelect, 'CNY');
    renderCurrency();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCurrencyConverter);
} else {
    initCurrencyConverter();
}
