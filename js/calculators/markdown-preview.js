/**
 * Markdown 预览器 - 核心逻辑 + UI 交互（已合并）
 * 逻辑：把 Markdown 源码渲染为 HTML 字符串。支持语法子集：
 *   标题 / 粗体 / 斜体 / 行内代码 / 围栏代码块 / 有序无序列表 / 链接 / 引用 /
 *   分隔线 / 表格。不实现：任务列表、图片语法。
 * 安全：块级解析在原始文本上进行，但所有插入输出的文本均在渲染期转义，
 *       XSS 免疫；链接 URL 白名单化（仅 http/https/mailto/tel/#/站内绝对路径）。
 * UI：编辑器 + 实时预览（输入防抖 150ms）。预览 HTML 来自 parseMarkdown
 *     （先转义后渲染，可安全 innerHTML）。所有事件 addEventListener，
 *     隐藏元素仅用 classList.toggle('hidden')。
 * 合并说明：UI 部分用 typeof document !== 'undefined' 守卫包裹 init()，
 *     避免 node --test 下触发 ReferenceError: document is not defined（A1 回归教训）。
 * 用法：浏览器暴露 window.markdownPreview 命名空间及 window.escapeHtml /
 *       window.parseMarkdown；UI 处理器 window.fillMarkdownSample /
 *       window.clearMarkdownPreview 供主模板 form-actions 的 data-csp-click 调用。
 */
(function () {
    'use strict';

    /* ===================== 核心逻辑（原 markdown-preview.js） ===================== */

    /**
     * HTML 转义（防止用户内容注入标签/脚本）。
     * @param {string} str - 原始字符串。
     * @returns {string} 转义后的 HTML 安全字符串。
     */
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * 链接 URL 协议白名单：仅允许 http/https/mailto/tel/#/站内绝对路径，
     * 拒绝 javascript:、data:、vbscript: 等危险协议。
     * @param {string} url - 链接 URL。
     * @returns {string} 白名单内的 URL（原样返回，不做转义）；不合法返回 ''。
     */
    function sanitizeUrl(url) {
        var u = String(url || '').trim();
        if (/^(https?:|mailto:|tel:|#|\/)/i.test(u)) return u;
        return '';
    }

    // 行内渲染：先整体转义，再用占位符保护行内代码，依次处理粗体/斜体/链接
    function renderInline(text) {
        var esc = escapeHtml(text);
        var codeSpans = [];
        var step1 = esc.replace(/`([^`]+)`/g, function (m, inner) {
            codeSpans.push('<code>' + inner + '</code>');
            return '\u0000CODE' + (codeSpans.length - 1) + '\u0000';
        });
        var step2 = step1
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/__([^_]+)__/g, '<strong>$1</strong>');
        var step3 = step2
            .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
            .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
        var step4 = step3.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
            var safe = sanitizeUrl(url);
            if (!safe) return label;
            return '<a href="' + safe + '">' + label + '</a>';
        });
        return step4.replace(/\u0000CODE(\d+)\u0000/g, function (m, idx) {
            return codeSpans[parseInt(idx, 10)] || '';
        });
    }

    /**
     * 把 Markdown 源码渲染为 HTML 字符串。
     * @param {string} src - Markdown 源码。
     * @returns {string} 渲染后的 HTML（全部文本已转义，可安全 innerHTML）。
     */
    function parseMarkdown(src) {
        if (typeof src !== 'string') return '';
        var lines = src.replace(/\r\n/g, '\n').split('\n');
        var html = [];
        var i = 0;
        var n = lines.length;
        var inCode = false;
        var codeLang = '';
        var codeLines = [];
        var listType = '';
        var listItems = [];
        var table = null;

        function flushList() {
            if (!listType) return;
            html.push('<' + listType + '>');
            for (var li = 0; li < listItems.length; li++) {
                html.push('<li>' + renderInline(listItems[li]) + '</li>');
            }
            html.push('</' + listType + '>');
            listType = '';
            listItems = [];
        }

        function flushTable() {
            if (!table) return;
            html.push('<table>');
            html.push('<thead><tr>');
            for (var h = 0; h < table.header.length; h++) {
                html.push('<th>' + renderInline(table.header[h]) + '</th>');
            }
            html.push('</tr></thead>');
            if (table.rows.length) {
                html.push('<tbody>');
                for (var r = 0; r < table.rows.length; r++) {
                    html.push('<tr>');
                    for (var c = 0; c < table.rows[r].length; c++) {
                        html.push('<td>' + renderInline(table.rows[r][c]) + '</td>');
                    }
                    html.push('</tr>');
                }
                html.push('</tbody>');
            }
            html.push('</table>');
            table = null;
        }

        function splitCells(line) {
            var s = line.trim();
            if (s.charAt(0) === '|') s = s.slice(1);
            if (s.charAt(s.length - 1) === '|') s = s.slice(0, -1);
            return s.split('|').map(function (cell) { return cell.trim(); });
        }

        function isSepRow(line) {
            return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && /-/.test(line);
        }

        while (i < n) {
            var line = lines[i];

            // 围栏代码块
            var fence = line.match(/^```([\w+-]*)\s*$/);
            if (fence) {
                flushList();
                flushTable();
                if (!inCode) {
                    inCode = true;
                    codeLang = fence[1];
                    codeLines = [];
                } else {
                    var langAttr = codeLang ? ' class="language-' + escapeHtml(codeLang) + '"' : '';
                    html.push('<pre><code' + langAttr + '>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
                    inCode = false;
                    codeLang = '';
                }
                i++;
                continue;
            }
            if (inCode) { codeLines.push(line); i++; continue; }

            // 空行
            if (/^\s*$/.test(line)) {
                flushList();
                flushTable();
                i++;
                continue;
            }

            // 标题
            var heading = line.match(/^(#{1,6})\s+(.*)$/);
            if (heading) {
                flushList();
                flushTable();
                var level = heading[1].length;
                html.push('<h' + level + '>' + renderInline(heading[2].trim()) + '</h' + level + '>');
                i++;
                continue;
            }

            // 分隔线
            if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
                flushList();
                flushTable();
                html.push('<hr>');
                i++;
                continue;
            }

            // 引用
            if (/^\s*>\s?/.test(line)) {
                flushList();
                flushTable();
                var quote = [];
                while (i < n && /^\s*>\s?/.test(lines[i])) {
                    quote.push(lines[i].replace(/^\s*>\s?/, ''));
                    i++;
                }
                html.push('<blockquote>' + renderInline(quote.join('\n')) + '</blockquote>');
                continue;
            }

            // 表格（首行含 |，次行为分隔行）
            if (/^\s*\|/.test(line) && i + 1 < n && isSepRow(lines[i + 1])) {
                flushList();
                var headerCells = splitCells(line);
                var rows = [];
                var j = i + 2;
                while (j < n && /^\s*\|/.test(lines[j])) {
                    rows.push(splitCells(lines[j]));
                    j++;
                }
                table = { header: headerCells, rows: rows };
                i = j;
                continue;
            }

            // 无序/有序列表
            var ulMatch = line.match(/^\s*[-*+]\s+(.*)$/);
            var olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
            if (ulMatch || olMatch) {
                var newType = ulMatch ? 'ul' : 'ol';
                if (listType !== newType) {
                    flushList();
                    listType = newType;
                }
                listItems.push((ulMatch ? ulMatch[1] : olMatch[1]).trim());
                i++;
                continue;
            }

            // 段落：收集到空行或块级起始
            flushList();
            flushTable();
            var para = [];
            while (i < n) {
                var pl = lines[i];
                if (/^\s*$/.test(pl)) break;
                if (/^(#{1,6})\s+/.test(pl)) break;
                if (/^```/.test(pl)) break;
                if (/^\s*[-*+]\s+/.test(pl) || /^\s*\d+\.\s+/.test(pl)) break;
                if (/^\s*>\s?/.test(pl)) break;
                if (/^\s*\|/.test(pl) && i + 1 < n && isSepRow(lines[i + 1])) break;
                para.push(pl);
                i++;
            }
            if (para.length) {
                html.push('<p>' + renderInline(para.join(' ').trim()) + '</p>');
            }
        }

        flushList();
        flushTable();
        if (inCode) {
            html.push('<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>');
        }
        return html.join('\n');
    }

    window.markdownPreview = {
        escapeHtml: escapeHtml,
        sanitizeUrl: sanitizeUrl,
        parseMarkdown: parseMarkdown
    };
    window.escapeHtml = escapeHtml;
    window.parseMarkdown = parseMarkdown;

    /* ===================== UI 交互（原 markdown-preview-ui.js） ===================== */

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

    function fillMarkdownSample() {
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

    function clearMarkdownPreview() {
        editor.value = '';
        render();
        editor.focus();
    }

    function init() {
        editor = document.getElementById('md-editor');
        preview = document.getElementById('md-preview');
        previewSection = document.getElementById('result-area');
        wordCountEl = document.getElementById('md-word-count');
        if (!editor || !preview || !previewSection) return;

        editor.addEventListener('input', scheduleRender);
        render();
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    window.fillMarkdownSample = fillMarkdownSample;
    window.clearMarkdownPreview = clearMarkdownPreview;
})();
