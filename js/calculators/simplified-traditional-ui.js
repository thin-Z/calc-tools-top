/**
 * 简繁转换 - UI 交互
 * 功能：绑定输入文本域与方向选择，实时转换并输出结果，支持一键复制。事件用 addEventListener
 *      （零内联事件，CSP 合规）。隐藏元素用 classList.toggle('hidden')，禁用 style.display。
 */
(function () {
    'use strict';

    var input = null;
    var dirSelect = null;
    var output = null;
    var resultArea = null;
    var copyBtn = null;

    function render() {
        var text = input.value;
        var dir = dirSelect.value;
        output.value = convertText(text, dir);
        if (text.trim()) resultArea.classList.remove('hidden');
        else resultArea.classList.add('hidden');
    }

    function copyOutput() {
        if (!output.value) return;
        var done = function () {
            if (copyBtn) copyBtn.textContent = '已复制 ✓';
            setTimeout(function () { if (copyBtn) copyBtn.textContent = '复制'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(output.value).then(done, function () { done(); });
        } else {
            output.select();
            document.execCommand('copy');
            done();
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        input = document.getElementById('tc-input');
        dirSelect = document.getElementById('tc-dir');
        output = document.getElementById('tc-output');
        resultArea = document.getElementById('result-area');
        copyBtn = document.getElementById('tc-copy');
        if (!input || !dirSelect || !output || !resultArea) return;

        input.addEventListener('input', render);
        dirSelect.addEventListener('change', render);
        if (copyBtn) copyBtn.addEventListener('click', copyOutput);
        render();
    });
})();
