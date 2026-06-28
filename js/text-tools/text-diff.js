/* ===== Text Diff (LCS-based Line Diff) ===== */

/**
 * Compute LCS (Longest Common Subsequence) of two arrays.
 * @param {string[]} a
 * @param {string[]} b
 * @returns {number[][]} DP table
 */
function lcsLength(a, b) {
    var m = a.length, n = b.length;
    var dp = [];
    for (var i = 0; i <= m; i++) {
        dp[i] = [];
        for (var j = 0; j <= n; j++) {
            dp[i][j] = 0;
        }
    }
    for (var i = 1; i <= m; i++) {
        for (var j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }
    return dp;
}

/**
 * Backtrack through LCS DP table to produce diff result.
 * @param {string[]} a - Original lines
 * @param {string[]} b - New lines
 * @param {number[][]} dp - LCS DP table
 * @param {number} i
 * @param {number} j
 * @returns {Array<{type: string, text: string}>}
 */
function backtrack(a, b, dp, i, j) {
    var result = [];
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            result.unshift({ type: 'same', text: a[i - 1] });
            i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'add', text: b[j - 1] });
            j--;
        } else {
            result.unshift({ type: 'del', text: a[i - 1] });
            i--;
        }
    }
    return result;
}

/**
 * Compute diff between two texts (line-based).
 * @param {string} text1 - Original text
 * @param {string} text2 - New text
 * @returns {Array<{type: string, text: string}>} Diff result array
 */
function diffLines(text1, text2) {
    var lines1 = text1 === '' ? [] : text1.split('\n');
    var lines2 = text2 === '' ? [] : text2.split('\n');
    var dp = lcsLength(lines1, lines2);
    return backtrack(lines1, lines2, dp, lines1.length, lines2.length);
}

/**
 * Render diff result into side-by-side HTML.
 * @param {Array<{type: string, text: string}>} diff - Diff result
 * @returns {{ left: string, right: string }} HTML strings
 */
function renderDiffSideBySide(diff) {
    var leftLines = [], rightLines = [];
    for (var i = 0; i < diff.length; i++) {
        var item = diff[i];
        var escaped = escapeHtml(item.text);
        if (item.type === 'same') {
            leftLines.push('<div class="diff-line diff-same">' + escaped + '</div>');
            rightLines.push('<div class="diff-line diff-same">' + escaped + '</div>');
        } else if (item.type === 'del') {
            leftLines.push('<div class="diff-line diff-del">' + escaped + '</div>');
            rightLines.push('<div class="diff-line diff-empty"></div>');
        } else if (item.type === 'add') {
            leftLines.push('<div class="diff-line diff-empty"></div>');
            rightLines.push('<div class="diff-line diff-add">' + escaped + '</div>');
        }
    }
    return {
        left: leftLines.join(''),
        right: rightLines.join('')
    };
}

/**
 * Count diff statistics.
 * @param {Array<{type: string, text: string}>} diff
 * @returns {{ same: number, add: number, del: number, changes: number }}
 */
function diffStats(diff) {
    var same = 0, add = 0, del = 0;
    for (var i = 0; i < diff.length; i++) {
        if (diff[i].type === 'same') same++;
        else if (diff[i].type === 'add') add++;
        else if (diff[i].type === 'del') del++;
    }
    return { same: same, add: add, del: del, changes: add + del };
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/* ===== UI Functions ===== */

function doDiff() {
    var text1 = document.getElementById('textInput1').value;
    var text2 = document.getElementById('textInput2').value;
    var diff = diffLines(text1, text2);
    var rendered = renderDiffSideBySide(diff);
    document.getElementById('diffLeft').innerHTML = rendered.left;
    document.getElementById('diffRight').innerHTML = rendered.right;

    var stats = diffStats(diff);
    document.getElementById('diffStats').innerHTML = '相同行: ' + stats.same + ' | 新增: <span style="color:#16a34a;font-weight:600;">+' + stats.add + '</span> | 删除: <span style="color:#dc2626;font-weight:600;">-' + stats.del + '</span> | 总变更: ' + stats.changes;
}

function clearDiff() {
    document.getElementById('textInput1').value = '';
    document.getElementById('textInput2').value = '';
    document.getElementById('diffLeft').innerHTML = '';
    document.getElementById('diffRight').innerHTML = '';
    document.getElementById('diffStats').innerHTML = '';
}

// Auto-diff on input with debounce
var diffTimer = null;
function scheduleDiff() {
    if (diffTimer) clearTimeout(diffTimer);
    diffTimer = setTimeout(doDiff, 500);
}

// Like button
(function(){
    var k = "toolbox_likes";
    function g(){ try { return JSON.parse(localStorage.getItem(k)) || {}; } catch(e) { return {}; } }
    function s(l){ localStorage.setItem(k, JSON.stringify(l)); }
    var b = document.querySelector(".detail-like");
    if (!b) return;
    var id = b.dataset.likeId, ls = g(), c = ls[id] || 0, ce = b.querySelector(".count");
    if (ce) ce.textContent = c;
    if (c > 0) b.classList.add("liked");
    b.onclick = function(e) {
        e.preventDefault(); e.stopPropagation();
        var ls = g(), cur = ls[id] || 0;
        ls[id] = cur > 0 ? 0 : 1;
        s(ls);
        var nc = ls[id];
        if (ce) ce.textContent = nc;
        if (nc > 0) b.classList.add("liked"); else b.classList.remove("liked");
    };
})();