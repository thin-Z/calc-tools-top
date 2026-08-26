/**
 * 分数计算器 - UI 交互
 * 功能：绑定两个分数（分子/分母）输入与运算符下拉，实时计算并显示结果与完整算式。
 *      所有事件均通过 addEventListener 绑定（零内联事件，CSP 合规）。隐藏元素一律使用
 *      classList.add/remove('hidden')（.hidden 带 !important，覆盖 style.display 的显隐）。
 */
(function () {
    'use strict';

    var num1El = null;
    var den1El = null;
    var opEl = null;
    var num2El = null;
    var den2El = null;
    var resultArea = null;
    var resultEl = null;

    var OP_SYMBOL = { add: '+', subtract: '−', multiply: '×', divide: '÷' };

    /**
     * 读取输入并渲染计算结果。任一输入为空或不合法时隐藏结果区或显示错误提示。
     */
    function render() {
        var n1 = num1El.value.trim();
        var d1 = den1El.value.trim();
        var n2 = num2El.value.trim();
        var d2 = den2El.value.trim();
        if (!n1 || !d1 || !n2 || !d2) {
            resultArea.classList.add('hidden');
            return;
        }

        var a = parseFraction(n1, d1);
        var b = parseFraction(n2, d2);
        if (!a || !b) {
            showError('分子或分母不合法（分母不能为 0）');
            return;
        }

        var op = opEl.value;
        var r = null;
        if (op === 'add') r = addFractions(a, b);
        else if (op === 'subtract') r = subtractFractions(a, b);
        else if (op === 'multiply') r = multiplyFractions(a, b);
        else if (op === 'divide') r = divideFractions(a, b);
        if (!r) {
            showError('除数不能为 0');
            return;
        }

        resultEl.textContent = formatFraction(a) + ' ' + OP_SYMBOL[op] + ' ' + formatFraction(b) + ' = ' + formatFraction(r);
        resultArea.classList.remove('hidden');
    }

    /**
     * 在结果区显示错误提示并展示结果区。
     * @param {string} msg - 错误信息文本。
     */
    function showError(msg) {
        resultEl.textContent = msg;
        resultArea.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', function () {
        num1El = document.getElementById('num1');
        den1El = document.getElementById('den1');
        opEl = document.getElementById('f-op');
        num2El = document.getElementById('num2');
        den2El = document.getElementById('den2');
        resultArea = document.getElementById('result-area');
        resultEl = document.getElementById('fr-result');
        if (!num1El || !den1El || !num2El || !den2El || !resultArea || !resultEl) return;

        num1El.addEventListener('input', render);
        den1El.addEventListener('input', render);
        num2El.addEventListener('input', render);
        den2El.addEventListener('input', render);
        opEl.addEventListener('change', render);
        render();
    });
})();
