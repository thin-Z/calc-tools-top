/**
 * 正则表达式测试器 - UI 交互
 * 功能：绑定模式/标志/测试文本输入，实时显示匹配数量、高亮匹配与捕获组说明。
 * 安全：匹配高亮通过 DOM 构建（textContent + <mark>），绝不使用 innerHTML 注入
 *       匹配文本，防 XSS。所有事件 addEventListener，隐藏元素仅用
 *       classList.toggle('hidden')（禁用 style.display，见 .hidden !important 陷阱）。
 */
(function () {
    'use strict';

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
     * 构建高亮 DOM：把文本按匹配区间切分，匹配片段用 <mark> 包裹，
     * 其余为文本节点。全程 textContent，杜绝 HTML 注入。
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

    document.addEventListener('DOMContentLoaded', function () {
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
    });
})();
