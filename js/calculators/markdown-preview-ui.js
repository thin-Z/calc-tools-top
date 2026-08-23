/**
 * Markdown 预览器 - UI 交互
 * 功能：编辑器 + 实时预览（输入防抖 150ms）。预览 HTML 来自 parseMarkdown
 *       （先转义后渲染，可安全 innerHTML）。所有事件 addEventListener，
 *       隐藏元素仅用 classList.toggle('hidden')。
 */
(function () {
    'use strict';

    var editor = null;
    var preview = null;
    var previewSection = null;
    var wordCountEl = null;
    var debounceTimer = null;

    function countWords(text) {
        var cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
        var en = (text.match(/[A-Za-z]+/g) || []).length;
        return cjk + en;
    }

    function render() {
        var src = editor.value;
        if (!src.trim()) {
            preview.textContent = '';
            previewSection.classList.add('hidden');
            wordCountEl.textContent = '0 字';
            return;
        }
        preview.innerHTML = parseMarkdown(src);
        previewSection.classList.remove('hidden');
        wordCountEl.textContent = countWords(src) + ' 字';
    }

    function scheduleRender() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(render, 150);
    }

    function fillSample() {
        if (editor.value.trim() !== '') return;
        editor.value = [
            '# Markdown 示例',
            '',
            '支持 **粗体**、*斜体* 和 `行内代码`。',
            '',
            '> 引用：预览器在浏览器本地渲染，内容不会上传。',
            '',
            '## 列表',
            '',
            '- 无序列表项一',
            '- 无序列表项二',
            '',
            '1. 有序列表项一',
            '2. 有序列表项二',
            '',
            '## 代码块',
            '',
            '```js',
            'function hello() {',
            '  return "world";',
            '}',
            '```',
            '',
            '## 表格',
            '',
            '| 工具 | 用途 |',
            '| --- | --- |',
            '| 颜色对比度 | WCAG 对比度检测 |',
            '| 正则测试 | 匹配与分组 |',
            '',
            '---',
            '',
            '更多链接：[工具箱里](https://www.calc-tools.top/)'
        ].join('\n');
        render();
    }

    document.addEventListener('DOMContentLoaded', function () {
        editor = document.getElementById('md-editor');
        preview = document.getElementById('md-preview');
        previewSection = document.getElementById('md-preview-section');
        wordCountEl = document.getElementById('md-word-count');
        if (!editor || !preview || !previewSection) return;

        editor.addEventListener('input', scheduleRender);
        var sampleBtn = document.getElementById('md-sample-btn');
        if (sampleBtn) sampleBtn.addEventListener('click', fillSample);
        var clearBtn = document.getElementById('md-clear-btn');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            editor.value = '';
            render();
            editor.focus();
        });
        render();
    });
})();
