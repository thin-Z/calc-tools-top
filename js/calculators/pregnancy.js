/**
 * 孕期计算器 - 核心逻辑 + UI 交互（合并自 pregnancy.js + pregnancy-ui.js）
 * 功能：根据末次月经日期（LMP）推算预产期、当前孕周、已怀孕天数与距离预产期的剩余天数，
 *       并支持按受孕日反推末次月经（可选）。
 * 用法：本文件在浏览器中暴露 window.pregnancy 命名空间以及 window.calcDueDate /
 *       window.gestationalWeek / window.daysPregnant / window.daysToDue /
 *       window.estimateLmp 等顶层函数（供 UI 层与单元测试直接调用）。
 * 依赖：无（零第三方库，CSP 白名单不扩张）。所有日期均按本地午夜归一化处理。
 * DOM 守卫：UI 层在纯 Node（node --test）环境下不触碰 document，避免回归
 *         （参考 timestamp 合并回归教训）。
 */
(function () {
    'use strict';

    // ===== 核心逻辑（原 pregnancy.js，未改动） =====

    // 平均妊娠时长：末次月经（LMP）起 280 天 ≈ 40 周（Naegele 法则）
    var DUE_OFFSET_DAYS = 280;
    var DAY_MS = 86400000;

    /**
     * 解析日期输入为「本地午夜」的 Date 对象。
     * 兼容 Date 实例与 "YYYY-MM-DD" 字符串。
     * @param {Date|string} input - 目标日期（Date 或 "YYYY-MM-DD" 字符串）。
     * @returns {Date|null} 归一化后的 Date；非法输入返回 null。
     */
    function parseDate(input) {
        if (input instanceof Date && !isNaN(input.getTime())) {
            return new Date(input.getFullYear(), input.getMonth(), input.getDate());
        }
        if (typeof input === 'string' && input.trim()) {
            var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
            if (!m) return null;
            var y = +m[1], mo = +m[2], d = +m[3];
            var date = new Date(y, mo - 1, d);
            if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
            return date;
        }
        return null;
    }

    /**
     * 在给定日期上增加（或减少）天数，返回新的 Date。
     * @param {Date} date - 基准日期。
     * @param {number} n - 增加的天数（可为负数）。
     * @returns {Date} 新日期（本地午夜）。
     */
    function addDays(date, n) {
        var result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        result.setDate(result.getDate() + n);
        return result;
    }

    /**
     * 计算两个日期之间相差的整天天数（b - a），基于日历日期，不受时区/DST 影响。
     * @param {Date} a - 起始日期。
     * @param {Date} b - 结束日期。
     * @returns {number} b 比 a 晚多少天（可为负数）。
     */
    function daysBetween(a, b) {
        var dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) / DAY_MS;
        var dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) / DAY_MS;
        return Math.round(dayB - dayA);
    }

    /**
     * 格式化 Date 为 "YYYY-MM-DD" 字符串。
     * @param {Date} date - 目标日期。
     * @returns {string} 形如 "2026-10-08"；非法输入返回空字符串。
     */
    function formatDate(date) {
        if (!date || typeof date.getTime !== 'function' || isNaN(date.getTime())) return '';
        var pad = function (x) { return String(x).padStart(2, '0'); };
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    }

    /**
     * 计算预产期（末次月经日期 + 280 天，约 40 周）。
     * @param {Date|string} lmpDate - 末次月经日期（Date 或 "YYYY-MM-DD"）。
     * @returns {Date|null} 预产期 Date；非法输入返回 null。
     */
    function calcDueDate(lmpDate) {
        var lmp = parseDate(lmpDate);
        if (!lmp) return null;
        return addDays(lmp, DUE_OFFSET_DAYS);
    }

    /**
     * 计算已怀孕天数（从末次月经第一天到今天的整天天数）。若今天早于末次月经，返回 0。
     * @param {Date|string} lmpDate - 末次月经日期（Date 或 "YYYY-MM-DD"）。
     * @param {Date|string} today - 当前日期（Date 或 "YYYY-MM-DD"）。
     * @returns {number} 已怀孕天数（>= 0）。
     */
    function daysPregnant(lmpDate, today) {
        var lmp = parseDate(lmpDate);
        var t = parseDate(today);
        if (!lmp || !t) return 0;
        var diff = daysBetween(lmp, t);
        return diff > 0 ? diff : 0;
    }

    /**
     * 计算当前孕周（周 + 天），7 天为一周。
     * @param {Date|string} lmpDate - 末次月经日期（Date 或 "YYYY-MM-DD"）。
     * @param {Date|string} today - 当前日期（Date 或 "YYYY-MM-DD"）。
     * @returns {{weeks:number, days:number}} 孕周与剩余天数，如 { weeks: 9, days: 2 }。
     */
    function gestationalWeek(lmpDate, today) {
        var days = daysPregnant(lmpDate, today);
        return { weeks: Math.floor(days / 7), days: days % 7 };
    }

    /**
     * 计算距离预产期的剩余天数（预产期 - 今天）。若已超过预产期则为负数。
     * @param {Date|string} dueDate - 预产期日期（Date 或 "YYYY-MM-DD"）。
     * @param {Date|string} today - 当前日期（Date 或 "YYYY-MM-DD"）。
     * @returns {number} 剩余天数（可为负数表示已过预产期）。
     */
    function daysToDue(dueDate, today) {
        var due = parseDate(dueDate);
        var t = parseDate(today);
        if (!due || !t) return 0;
        return daysBetween(t, due);
    }

    /**
     * 按受孕日反推末次月经日期（末次月经 = 受孕日 - (月经周期天数 - 14)）。
     * 默认月经周期为 28 天，即排卵/受孕约在周期第 14 天。
     * @param {Date|string} conceptionDate - 受孕日期（Date 或 "YYYY-MM-DD"）。
     * @param {number|string} [cycleDays] - 月经周期天数，默认 28。
     * @returns {Date|null} 估算的末次月经日期；非法输入返回 null。
     */
    function estimateLmp(conceptionDate, cycleDays) {
        var c = parseDate(conceptionDate);
        if (!c) return null;
        var cycle = parseInt(cycleDays, 10);
        if (isNaN(cycle) || cycle < 1) cycle = 28;
        var ovulationOffset = Math.max(0, cycle - 14); // LMP 到排卵/受孕的天数
        return addDays(c, -ovulationOffset);
    }

    // 暴露命名空间 + 顶层函数（UI 与单测两用）
    window.pregnancy = {
        calcDueDate: calcDueDate,
        gestationalWeek: gestationalWeek,
        daysPregnant: daysPregnant,
        daysToDue: daysToDue,
        estimateLmp: estimateLmp,
        parseDate: parseDate,
        addDays: addDays,
        daysBetween: daysBetween,
        formatDate: formatDate
    };
    window.calcDueDate = calcDueDate;
    window.gestationalWeek = gestationalWeek;
    window.daysPregnant = daysPregnant;
    window.daysToDue = daysToDue;
    window.estimateLmp = estimateLmp;
    // 辅助函数同样暴露为顶层全局（与 timestamp 一致，便于 UI 与单测调用）
    window.parseDate = parseDate;
    window.addDays = addDays;
    window.daysBetween = daysBetween;
    window.formatDate = formatDate;

    // ===== UI 交互（原 pregnancy-ui.js，合并并加 DOM 守卫） =====
    // 所有事件均通过 addEventListener 绑定（零内联事件，CSP 合规）。隐藏元素一律使用
    // classList.toggle('hidden')，禁用 style.display（.hidden 带 !important，会覆盖导致结果区不显示）。

    var lmpInput = null;
    var cycleInput = null;
    var conceptionToggle = null;
    var conceptionRow = null;
    var conceptionInput = null;
    var resultArea = null;
    var dueEl = null;
    var gestWeeksEl = null;
    var gestDaysEl = null;
    var daysPregnantEl = null;
    var daysDueEl = null;

    function refreshConceptionVisibility() {
        if (conceptionRow) {
            conceptionRow.classList.toggle('hidden', !conceptionToggle.checked);
        }
    }

    function render() {
        var rawLmp = lmpInput.value.trim();
        var rawConception = conceptionInput.value.trim();
        var useConception = conceptionToggle.checked && rawConception !== '';

        if (!rawLmp && !useConception) {
            resultArea.classList.add('hidden');
            return;
        }

        var cycle = parseInt(cycleInput.value, 10);
        var lmp;
        if (useConception) {
            lmp = estimateLmp(rawConception, isNaN(cycle) ? 28 : cycle);
        } else {
            lmp = parseDate(rawLmp);
        }
        if (!lmp) {
            resultArea.classList.add('hidden');
            return;
        }

        var today = new Date();
        var due = calcDueDate(lmp);
        if (!due) {
            resultArea.classList.add('hidden');
            return;
        }
        var gw = gestationalWeek(lmp, today);
        var dp = daysPregnant(lmp, today);
        var dd = daysToDue(due, today);

        dueEl.textContent = formatDate(due);
        gestWeeksEl.textContent = String(gw.weeks);
        gestDaysEl.textContent = String(gw.days);
        daysPregnantEl.textContent = String(dp);
        daysDueEl.textContent = String(dd);
        resultArea.classList.remove('hidden');
    }

    function clearPregnancy() {
        if (lmpInput) lmpInput.value = '';
        if (conceptionInput) conceptionInput.value = '';
        if (cycleInput) cycleInput.value = '28';
        if (conceptionToggle) conceptionToggle.checked = false;
        if (conceptionRow) conceptionRow.classList.add('hidden');
        if (resultArea) resultArea.classList.add('hidden');
    }

    function init() {
        lmpInput = document.getElementById('lmp-date');
        cycleInput = document.getElementById('cycle-days');
        conceptionToggle = document.getElementById('conception-toggle');
        conceptionRow = document.getElementById('conception-row');
        conceptionInput = document.getElementById('conception-date');
        resultArea = document.getElementById('result-area');
        dueEl = document.getElementById('due-date');
        gestWeeksEl = document.getElementById('gest-weeks');
        gestDaysEl = document.getElementById('gest-days');
        daysPregnantEl = document.getElementById('days-pregnant');
        daysDueEl = document.getElementById('days-due');
        if (!lmpInput || !cycleInput || !resultArea) return;

        lmpInput.addEventListener('input', render);
        lmpInput.addEventListener('change', render);
        cycleInput.addEventListener('input', render);
        cycleInput.addEventListener('change', render);
        conceptionToggle.addEventListener('change', function () {
            refreshConceptionVisibility();
            render();
        });
        if (conceptionInput) {
            conceptionInput.addEventListener('input', render);
            conceptionInput.addEventListener('change', render);
        }

        refreshConceptionVisibility();
        render();
    }

    // DOM 守卫：纯 Node（node --test）环境下 document 未定义，跳过绑定，避免回归崩溃。
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    window.clearPregnancy = clearPregnancy;
})();
