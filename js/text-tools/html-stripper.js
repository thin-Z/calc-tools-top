/* ===== HTML Stripper ===== */

/**
 * Strip HTML tags from text, optionally keeping specified tags.
 * @param {string} html - HTML input string.
 * @param {string[]} keepTags - Array of tag names to keep (lowercase).
 * @returns {string} Plain text with HTML tags removed.
 */
function stripHTML(html, keepTags) {
    if (keepTags.length === 0) {
        return html.replace(/<[^>]*>/g, '');
    }
    var keepSet = {};
    for (var i = 0; i < keepTags.length; i++) {
        keepSet[keepTags[i].toLowerCase()] = true;
    }
    return html.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, function(match, tag) {
        return keepSet[tag.toLowerCase()] ? match : '';
    });
}

function executeStrip() {
    var html = document.getElementById('htmlInput').value;
    var resultArea = document.getElementById('resultArea');
    var resultSection = document.getElementById('resultSection');
    var charBefore = document.getElementById('charBefore');
    var charAfter = document.getElementById('charAfter');

    resultSection.style.display = 'none';

    if (!html) {
        return;
    }

    var keepTags = [];
    var checks = document.querySelectorAll('.keep-tag-option:checked');
    for (var i = 0; i < checks.length; i++) {
        keepTags.push(checks[i].value);
    }

    var result = stripHTML(html, keepTags);
    resultArea.textContent = result;
    charBefore.textContent = html.length;
    charAfter.textContent = result.length;
    resultSection.style.display = 'block';
}

function copyStripResult() {
    var content = document.getElementById('resultArea').textContent;
    if (!content) {
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(function() {
            var btn = document.getElementById('copyBtn');
            btn.textContent = '\u2705 已复制';
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = '\uD83D\uDCCB 复制结果';
                btn.classList.remove('copied');
            }, 2000);
        });
    } else {
        var ta = document.createElement('textarea');
        ta.value = content;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        var btn = document.getElementById('copyBtn');
        btn.textContent = '\u2705 已复制';
        btn.classList.add('copied');
        setTimeout(function() {
            btn.textContent = '\uD83D\uDCCB 复制结果';
            btn.classList.remove('copied');
        }, 2000);
    }
}

function resetStripper() {
    document.getElementById('htmlInput').value = '';
    document.getElementById('resultArea').textContent = '';
    document.getElementById('resultSection').style.display = 'none';
}

// Like button
(function(){
    var k = "toolbox_likes";
    function g() { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch(e) { return {}; } }
    function s(l) { localStorage.setItem(k, JSON.stringify(l)); }
    var b = document.querySelector('.detail-like');
    if (!b) return;
    var id = b.dataset.likeId;
    var ls = g();
    var c = ls[id] || 0;
    var ce = b.querySelector('.count');
    if (ce) ce.textContent = c;
    if (c > 0) b.classList.add('liked');
    b.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var ls = g();
        var cur = ls[id] || 0;
        ls[id] = cur > 0 ? 0 : 1;
        s(ls);
        var nc = ls[id];
        if (ce) ce.textContent = nc;
        if (nc > 0) b.classList.add('liked');
        else b.classList.remove('liked');
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    executeStrip();
});