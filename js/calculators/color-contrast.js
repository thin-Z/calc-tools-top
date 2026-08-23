/**
 * 颜色对比度检查器 - 核心逻辑
 * 功能：基于 WCAG 2.1 相对亮度公式计算前景/背景对比度，并判定 AA/AAA 通过状态。
 * 用法：本文件为纯函数模块（IIFE），在浏览器中暴露 window.colorContrast 命名空间
 *      以及 window.hexToRgb / window.relativeLuminance / window.contrastRatio /
 *      window.evaluateContrast 四个顶层函数（供 UI 层与单元测试直接调用）。
 * 依赖：无（零第三方库，CSP 白名单不扩张）。
 */
(function () {
    'use strict';

    /**
     * 将 #RGB / #RRGGBB / RGB 颜色字符串解析为 {r, g, b}（0-255）。
     * @param {string} hex - 颜色值，如 '#fff'、'#ffffff'、'ffffff'。
     * @returns {{r: number, g: number, b: number}|null} RGB 对象；非法输入返回 null。
     */
    function hexToRgb(hex) {
        if (typeof hex !== 'string') return null;
        var h = hex.trim().replace(/^#/, '');
        if (/^[0-9a-fA-F]{3}$/.test(h)) {
            h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        }
        if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
        var intVal = parseInt(h, 16);
        return {
            r: (intVal >> 16) & 255,
            g: (intVal >> 8) & 255,
            b: intVal & 255
        };
    }

    /**
     * 计算 sRGB 颜色的相对亮度（WCAG 2.1 定义，0-1）。
     * @param {{r: number, g: number, b: number}} rgb - RGB 对象。
     * @returns {number} 相对亮度（0-1）；非法输入返回 0。
     */
    function relativeLuminance(rgb) {
        if (!rgb || typeof rgb.r !== 'number') return 0;
        var channel = function (c) {
            var s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
    }

    /**
     * 计算两个颜色的对比度（WCAG 2.1 公式，1-21）。
     * @param {string} fg - 前景色（文字）hex。
     * @param {string} bg - 背景色 hex。
     * @returns {number} 对比度；任一颜色非法返回 0。
     */
    function contrastRatio(fg, bg) {
        var f = hexToRgb(fg);
        var b = hexToRgb(bg);
        if (!f || !b) return 0;
        var l1 = relativeLuminance(f);
        var l2 = relativeLuminance(b);
        var lighter = Math.max(l1, l2);
        var darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    /**
     * 评估前景/背景对比度是否满足 WCAG AA/AAA（普通文本与大号文本）。
     * @param {string} fg - 前景色（文字）hex。
     * @param {string} bg - 背景色 hex。
     * @returns {{ratio: number, valid: boolean, passAA: boolean, passAALarge: boolean,
     *            passAAA: boolean, passAAALarge: boolean}} 评估结果。
     *    ratio: 对比度（保留两位小数）；valid: 输入是否合法；pass*: 各级别是否通过。
     */
    function evaluateContrast(fg, bg) {
        var ratio = contrastRatio(fg, bg);
        var valid = ratio > 0;
        return {
            ratio: Math.round(ratio * 100) / 100,
            valid: valid,
            passAA: ratio >= 4.5,
            passAALarge: ratio >= 3,
            passAAA: ratio >= 7,
            passAAALarge: ratio >= 4.5
        };
    }

    // 暴露命名空间 + 顶层函数（UI 与单测两用）
    window.colorContrast = {
        hexToRgb: hexToRgb,
        relativeLuminance: relativeLuminance,
        contrastRatio: contrastRatio,
        evaluateContrast: evaluateContrast
    };
    window.hexToRgb = hexToRgb;
    window.relativeLuminance = relativeLuminance;
    window.contrastRatio = contrastRatio;
    window.evaluateContrast = evaluateContrast;
})();
