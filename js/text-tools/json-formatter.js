/* ===== JSON Formatter & Minifier ===== */

/**
 * Format or minify JSON text.
 * @param {string} text - Input JSON string.
 * @param {string} mode - 'format' or 'minify'.
 * @returns {object} Result with success/error state.
 */
function formatJSON(text, mode) {
    try {
        var parsed = JSON.parse(text);
        var result = mode === 'format' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
        return {
            success: true,
            result: result,
            size: result.length,
            originalSize: text.length
        };
    } catch (e) {
        var match = e.message.match(/position\s+(\d+)/);
        var line = 1, col = 1;
        if (match) {
            var pos = parseInt(match[1]);
            var before = text.substring(0, pos);
            line = before.split('\n').length;
            col = pos - before.lastIndexOf('\n');
        }
        return {
            success: false,
            error: e.message,
            line: line,
            col: col
        };
    }
}

function doFormat() {
    var text = document.getElementById('jsonInput').value;
    if (!text.trim()) {
        document.getElementById('resultArea').textContent = '';
        document.getElementById('resultSection').style.display = 'none';
        return;
    }
    var mode = currentJSONMode || 'format';
    var res = formatJSON(text, mode);
    var resultArea = document.getElementById('resultArea');
    var resultSection = document.getElementById('resultSection');
    var errorSection = document.getElementById('errorSection');
    var statsSection = document.getElementById('statsSection');

    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    statsSection.style.display = 'none';

    if (res.success) {
        resultArea.textContent = res.result;
        resultSection.style.display = 'block';
        document.getElementById('originalSize').textContent = res.originalSize;
        document.getElementById('formattedSize').textContent = res.size;
        statsSection.style.display = 'flex';
    } else {
        document.getElementById('errorLine').textContent = res.line;
        document.getElementById('errorCol').textContent = res.col;
        document.getElementById('errorMsg').textContent = res.error;
        errorSection.style.display = 'block';
    }
}

var currentJSONMode = 'format';

function switchJSONMode(mode) {
    currentJSONMode = mode;
    var btns = document.querySelectorAll('.mode-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.remove('active');
    }
    var target = document.querySelector('.mode-btn[data-mode="' + mode + '"]');
    if (target) target.classList.add('active');
    doFormat();
}

function copyJSONResult() {
    var content = document.getElementById('resultArea').textContent;
    if (!content) {
        alert('\u8BF7\u5148\u683C\u5F0F\u5316JSON\u6570\u636E');
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(function() {
            var btn = document.getElementById('copyJSONBtn');
            btn.textContent = '\u2705 Copied!';
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = '\uD83D\uDCCB Copy JSON';
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
    }
}

function clearJSON() {
    document.getElementById('jsonInput').value = '';
    document.getElementById('resultArea').textContent = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
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
    doFormat();
});