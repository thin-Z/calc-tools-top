/**
 * 时间戳转换 - 核心逻辑
 * 功能：Unix 时间戳（秒/毫秒）与人类可读日期时间互转，支持本地与 UTC 显示。
 * 用法：本文件为纯函数模块（IIFE），在浏览器中暴露 window.timestamp 命名空间
 *       以及 window.detectUnit / window.tsToDate / window.dateToTs / window.formatDate
 *       四个顶层函数（供 UI 层与单元测试直接调用）。
 * 依赖：无（零第三方库，CSP 白名单不扩张）。
 */
(function () {
    'use strict';

    /**
     * 判断数字是秒级还是毫秒级时间戳。
     * @param {number|string} value - 输入的时间戳数字。
     * @returns {'s'|'ms'|null} 秒 / 毫秒；非法或无法判断返回 null。
     */
    function detectUnit(value) {
        var n = parseInt(value, 10);
        if (isNaN(n)) return null;
        var abs = Math.abs(n);
        // 秒级时间戳范围约 10^9（约 2001 年起）；毫秒级约 10^12。用 1e11 作为分界。
        if (abs >= 1e11) return 'ms';
        if (abs < 1e11) return 's';
        return null;
    }

    /**
     * 将时间戳（秒/毫秒）转换为 Date 对象。
     * @param {number|string} ts - 秒级或毫秒级时间戳。
     * @returns {Date|null} 对应 Date；非法输入返回 null。
     */
    function tsToDate(ts) {
        var unit = detectUnit(ts);
        if (!unit) return null;
        var n = parseInt(ts, 10);
        var ms = unit === 'ms' ? n : n * 1000;
        var d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }

    /**
     * 将 Date 对象转换为秒级与毫秒级时间戳。
     * @param {Date} date - 目标日期。
     * @returns {{sec: number, ms: number}|null} 秒/毫秒时间戳；非法输入返回 null。
     */
    function dateToTs(date) {
        if (!date || typeof date.getTime !== 'function') return null;
        var ms = date.getTime();
        if (isNaN(ms)) return null;
        return { sec: Math.floor(ms / 1000), ms: ms };
    }

    /**
     * 格式化 Date 为可读字符串（本地时区或 UTC）。
     * @param {Date} date - 目标日期。
     * @param {boolean} utc - 为 true 时按 UTC 显示。
     * @returns {string} 形如 "2026-08-26 10:30:00"（UTC 时追加 "+00:00"）。
     */
    function formatDate(date, utc) {
        if (!date || typeof date.getTime !== 'function' || isNaN(date.getTime())) return '';
        var pad = function (x) { return String(x).padStart(2, '0'); };
        if (utc) {
            return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate()) +
                ' ' + pad(date.getUTCHours()) + ':' + pad(date.getUTCMinutes()) + ':' + pad(date.getUTCSeconds()) + ' UTC';
        }
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
            ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    }

    // 暴露命名空间 + 顶层函数（UI 与单测两用）
    window.timestamp = {
        detectUnit: detectUnit,
        tsToDate: tsToDate,
        dateToTs: dateToTs,
        formatDate: formatDate
    };
    window.detectUnit = detectUnit;
    window.tsToDate = tsToDate;
    window.dateToTs = dateToTs;
    window.formatDate = formatDate;
})();
