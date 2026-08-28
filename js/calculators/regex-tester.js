/**
 * 正则表达式测试器 - 核心逻辑 + UI 交互（已合并）
 * 逻辑：本地构建正则、查找匹配、解析捕获组、转义特殊字符。零第三方库（CSP 白名单
 *      不扩张），纯函数模块（IIFE）。
 * UI：绑定模式/标志/测试文本输入，实时显示匹配数量、高亮匹配与捕获组说明。
 *      匹配高亮通过 DOM 构建（textContent + <mark>），绝不使用 innerHTML 注入
 *      匹配文本，防 XSS。所有事件 addEventListener，隐藏元素仅用
 *      classList.toggle('hidden')。
 * 合并说明：UI 部分用 typeof document !== 'undefined' 守卫包裹 init()，
 *     避免 node --test 下触发 ReferenceError: document is not defined（A1 回归教训）。
 * 用法：浏览器暴露 window.regexTester 命名空间及 buildRegex / findMatches /
 *       explainGroups / escapeRegex；UI 处理器 window.clearRegexTester
 *       供主模板 form-actions 的 data-csp-click 调用。
 */
(function () {
    'use strict';

    /* ===================== 核心逻辑（原 regex-tester.js） ===================== */

    var FLAG_CHARS = 'gimsuy';

    /**
     * 从用户输入构建 RegExp 对象。
     * @param {string} pattern - 正则表达式模式串。
     * @param {string} [flags] - 标志位字符串（g/i/m/s/u/y，非法字符自动过滤）。
     * @returns {{ok: boolean, regex: (RegExp|null), flags: string, error: string}}
     */
    function buildRegex(pattern, flags) {
        if (typeof pattern !== 'string' || pattern.trim() === '') {
            return { ok: false, regex: null, flags: '', error: '正则表达式不能为空' };
        }
        var flagStr = typeof flags === 'string'
            ? flags.split('').filter(function (f) { return FLAG_CHARS.indexOf(f) !== -1; }).join('')
            : '';
        try {
            var re = new RegExp(pattern, flagStr);
            return { ok: true, regex: re, flags: flagStr, error: '' };
        } catch (e) {
            return { ok: false, regex: null, flags: flagStr, error: e.message };
        }
    }

    /**
     * 在文本中查找所有匹配项。
     * @param {string} text - 被搜索文本。
     * @param {RegExp} regex - 正则对象（无 g 标志时自动补 g 以便全量查找）。
     * @returns {Array<{match: string, index: number, groups: string[]}>} 匹配列表。
     */
    function findMatches(text, regex) {
        if (typeof text !== 'string' || !regex) return [];
        var re = regex.global ? regex : new RegExp(regex.source, regex.flags + 'g');
        var results = [];
        var m;
        var guard = 0;
        while ((m = re.exec(text)) !== null && guard < 100000) {
            results.push({
                match: m[0],
                index: m.index,
                groups: m.slice(1)
            });
            guard++;
            if (m[0] === '') re.lastIndex++;
        }
        return results;
    }

    /**
     * 解析模式串中的捕获组信息（跳过转义括号、字符类内括号、非捕获组与前后断言）。
     * @param {string} pattern - 正则表达式模式串。
     * @returns {Array<{index: number, name: (string|null)}>} 捕获组列表。
     */
    function explainGroups(pattern) {
        var groups = [];
        if (typeof pattern !== 'string' || pattern === '') return groups;
        var i = 0;
        var n = pattern.length;
        var inClass = false;
        var count = 0;
        while (i < n) {
            var ch = pattern[i];
            if (ch === '\\') { i += 2; continue; }
            if (ch === '[') { inClass = true; i++; continue; }
            if (ch === ']') { inClass = false; i++; continue; }
            if (ch === '(' && !inClass) {
                if (pattern[i + 1] === '?' && pattern[i + 2] === '<'
                    && pattern[i + 3] !== '=' && pattern[i + 3] !== '!') {
                    var nameEnd = pattern.indexOf('>', i + 3);
                    if (nameEnd === -1) { i++; continue; }
                    count++;
                    groups.push({ index: count, name: pattern.slice(i + 3, nameEnd) });
                    i = nameEnd + 1;
                    continue;
                }
                if (pattern[i + 1] === '?') { i += 2; continue; }
                count++;
                groups.push({ index: count, name: null });
            }
            i++;
        }
        return groups;
    }

    /**
     * 转义正则表达式特殊字符（用于把用户文本当作字面量匹配）。
     * @param {string} str - 待转义字符串。
     * @returns {string} 转义后的字符串。
     */
    function escapeRegex(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    window.regexTester = {
        buildRegex: buildRegex,
        findMatches: findMatches,
        explainGroups: explainGroups,
        escapeRegex: escapeRegex
    };
    window.buildRegex = buildRegex;
    window.findMatches = findMatches;
    window.explainGroups = explainGroups;
    window.escapeRegex = escapeRegex;

    /* ===================== UI 交互（原 regex-tester-ui.js） ===================== */

    var patternInput = null;
    var flagCheckboxes = [];
    var testText = null;
    var resultArea = null;
    var matchCountEl = null;
    var highlightEl = null;
    var matchListEl = null;
    var groupInfoEl = null;
    var errorEl = null;

    function getFlags() {
        return flagCheckboxes.filter(function (cb) { return cb.checked; })
            .map(function (cb) { return cb.value; }).join('');
    }

    /**
     * 构建高亮 DOM：把文本按匹配区间切分，匹配片段用 <mark> 包裹。
     */
    function buildHighlight(text, matches) {
        var frag = document.createDocumentFragment();
        var cursor = 0;
        matches.forEach(function (item) {
            if (item.index < cursor) return;
            if (item.index > cursor) {
                frag.appendChild(document.createTextNode(text.slice(cursor, item.index)));
            }
            var mark = document.createElement('mark');
            mark.className = 'regex-mark';
            mark.textContent = item.match;
            frag.appendChild(mark);
            cursor = item.index + item.match.length;
        });
        if (cursor < text.length) {
            frag.appendChild(document.createTextNode(text.slice(cursor)));
        }
        return frag;
    }

    function render() {
        var pattern = patternInput.value;
        var flags = getFlags();
        var text = testText.value;

        var built = buildRegex(pattern, flags);
        errorEl.classList.add('hidden');
        resultArea.classList.add('hidden');
        if (!built.ok) {
            errorEl.textContent = '正则错误：' + built.error;
            errorEl.classList.remove('hidden');
            return;
        }

        var matches = findMatches(text, built.regex);
        matchCountEl.textContent = matches.length + ' 处匹配';

        highlightEl.textContent = '';
        if (text) highlightEl.appendChild(buildHighlight(text, matches));

        matchListEl.textContent = '';
        if (matches.length) {
            var ul = document.createElement('ul');
            ul.className = 'regex-match-list';
            matches.forEach(function (item, idx) {
                var li = document.createElement('li');
                var preview = item.match.length > 40 ? item.match.slice(0, 40) + '…' : item.match;
                li.textContent = '#' + (idx + 1) + ' @' + item.index + '  ' + JSON.stringify(preview);
                ul.appendChild(li);
            });
            matchListEl.appendChild(ul);
        }

        var groups = explainGroups(pattern);
        groupInfoEl.textContent = '';
        if (groups.length) {
            var gUl = document.createElement('ul');
            gUl.className = 'regex-group-list';
            groups.forEach(function (g) {
                var li = document.createElement('li');
                li.textContent = '捕获组 ' + g.index + (g.name ? '（' + g.name + '）' : '');
                gUl.appendChild(li);
            });
            groupInfoEl.appendChild(gUl);
        }

        resultArea.classList.remove('hidden');
    }

    function clearRegexTester() {
        if (patternInput) patternInput.value = '';
        if (testText) testText.value = '';
        if (resultArea) resultArea.classList.add('hidden');
        if (errorEl) errorEl.classList.add('hidden');
    }

    function init() {
        patternInput = document.getElementById('regex-pattern');
        testText = document.getElementById('regex-text');
        resultArea = document.getElementById('regex-result');
        matchCountEl = document.getElementById('regex-count');
        highlightEl = document.getElementById('regex-highlight');
        matchListEl = document.getElementById('regex-match-list');
        groupInfoEl = document.getElementById('regex-groups');
        errorEl = document.getElementById('regex-error');
        if (!patternInput || !testText || !resultArea) return;

        flagCheckboxes = Array.prototype.slice.call(document.querySelectorAll('input[name="regex-flags"]'));

        patternInput.addEventListener('input', render);
        testText.addEventListener('input', render);
        flagCheckboxes.forEach(function (cb) { cb.addEventListener('change', render); });
        render();
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    window.clearRegexTester = clearRegexTester;
})();
