/**
 * 颜色对比度检查器 - UI 交互
 * 功能：绑定前景/背景色输入（原生取色器 + 文本输入），实时计算对比度并渲染
 *       AA/AAA 判定结果。所有事件均通过 addEventListener 绑定（零内联事件，
 *       CSP 合规）。隐藏元素一律使用 classList.toggle('hidden')，禁用 style.display
 *       （.hidden 带 !important，style.display 会被覆盖导致结果区永不显示）。
 */
(function () {
    'use strict';

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
        // 用相对亮度粗略判断文字取色（深底用浅字、浅底用深字做展示样本）
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
        // 文本输入与取色器双向同步（仅在合法值变化时写回，避免光标抖动）
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
            badge.textContent = item.pass ? '✓ 通过' : '✗ 未通过';
            var label = document.createElement('span');
            label.textContent = item.label;
            row.appendChild(badge);
            row.appendChild(label);
            levelsEl.appendChild(row);
        });

        // 预览样本：前景文字 / 背景
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

    document.addEventListener('DOMContentLoaded', function () {
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
    });
})();
