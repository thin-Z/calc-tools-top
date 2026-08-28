/**
 * 颜色对比度检查器 - 核心逻辑 + UI 交互（已合并）
 * 逻辑：基于 WCAG 2.1 相对亮度公式计算前景/背景对比度，并判定 AA/AAA 通过状态。
 * UI：绑定前景/背景色输入（原生取色器 + 文本输入），实时计算对比度并渲染
 *     AA/AAA 判定结果。所有事件均通过 addEventListener 绑定（零内联事件，CSP 合规）。
 *     隐藏元素一律使用 classList.toggle('hidden')。
 * 合并说明：UI 部分用 typeof document !== 'undefined' 守卫包裹 init()，
 *     避免 node --test 下触发 ReferenceError: document is not defined（A1 回归教训）。
 * 用法：浏览器暴露 window.colorContrast 命名空间及 hexToRgb / relativeLuminance /
 *       contrastRatio / evaluateContrast；UI 处理器 window.clearColorContrast
 *       供主模板 form-actions 的 data-csp-click 调用。
 */
(function () {
    'use strict';

    /* ===================== 核心逻辑（原 color-contrast.js） ===================== */

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

    /* ===================== UI 交互（原 color-contrast-ui.js） ===================== */

    var fgColor = null;
    var fgHex = null;
    var bgColor = null;
    var bgHex = null;
    var resultArea = null;
    var ratioEl = null;
    var levelsEl = null;
    var sampleEl = null;
    var summaryEl = null;

    function normalizeHex(value) {
        var v = String(value || '').trim();
        if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)) return v;
        if (/^[0-9a-fA-F]{3}$/.test(v) || /^[0-9a-fA-F]{6}$/.test(v)) return '#' + v;
        return '';
    }

    function isDark(rgb) {
        return relativeLuminance(rgb) < 0.5;
    }

    function render() {
        var fgVal = normalizeHex(fgHex.value);
        var bgVal = normalizeHex(bgHex.value);
        var fgRgb = hexToRgb(fgVal);
        var bgRgb = hexToRgb(bgVal);

        if (!fgRgb || !bgRgb) {
            resultArea.classList.add('hidden');
            return;
        }
        if (normalizeHex(fgColor.value) !== fgVal) fgColor.value = fgVal;
        if (normalizeHex(bgColor.value) !== bgVal) bgColor.value = bgVal;

        var res = evaluateContrast(fgVal, bgVal);

        ratioEl.textContent = res.ratio + ':1';

        var items = [
            { label: 'AA（普通文本 ≥4.5）', pass: res.passAA },
            { label: 'AA 大号文本（≥3）', pass: res.passAALarge },
            { label: 'AAA（普通文本 ≥7）', pass: res.passAAA },
            { label: 'AAA 大号文本（≥4.5）', pass: res.passAAALarge }
        ];
        levelsEl.textContent = '';
        items.forEach(function (item) {
            var row = document.createElement('div');
            row.className = 'contrast-level ' + (item.pass ? 'pass' : 'fail');
            var badge = document.createElement('span');
            badge.className = 'contrast-badge';
            badge.textContent = item.pass ? '通过' : '未通过';
            var label = document.createElement('span');
            label.textContent = item.label;
            row.appendChild(badge);
            row.appendChild(label);
            levelsEl.appendChild(row);
        });

        sampleEl.style.color = fgVal;
        sampleEl.style.backgroundColor = bgVal;
        sampleEl.textContent = 'Aa 示例文字 Sample text';

        var tip = res.passAA
            ? (res.passAAA ? '对比度优秀，符合 AAA 级别，可放心用于正文。' : '对比度符合 AA 级别，适合正文与界面元素。')
            : '对比度不足 AA（4.5:1），建议加深前景或提亮背景后重试。';
        summaryEl.textContent = tip;

        resultArea.classList.remove('hidden');
    }

    function onTextInput(el) {
        el.addEventListener('input', function () {
            render();
        });
    }

    function onColorInput(el) {
        el.addEventListener('input', function () {
            render();
        });
    }

    function clearColorContrast() {
        if (fgColor) fgColor.value = '#333333';
        if (fgHex) fgHex.value = '#333333';
        if (bgColor) bgColor.value = '#ffffff';
        if (bgHex) bgHex.value = '#ffffff';
        if (resultArea) resultArea.classList.add('hidden');
    }

    function init() {
        fgColor = document.getElementById('fg-color');
        fgHex = document.getElementById('fg-hex');
        bgColor = document.getElementById('bg-color');
        bgHex = document.getElementById('bg-hex');
        resultArea = document.getElementById('result-area');
        ratioEl = document.getElementById('contrast-ratio');
        levelsEl = document.getElementById('contrast-levels');
        sampleEl = document.getElementById('contrast-sample');
        summaryEl = document.getElementById('contrast-summary');
        if (!fgColor || !fgHex || !bgColor || !bgHex || !resultArea) return;

        onTextInput(fgHex);
        onTextInput(bgHex);
        onColorInput(fgColor);
        onColorInput(bgColor);
        render();
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    window.clearColorContrast = clearColorContrast;
})();
