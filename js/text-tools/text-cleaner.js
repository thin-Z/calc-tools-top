/* ===== Text Cleaner ===== */

/**
 * Clean text based on selected options.
 * @param {string} text - Input text to clean.
 * @param {Object} options - Cleaning options.
 * @returns {string} Cleaned text.
 */
function cleanText(text, options) {
    var result = text;
    if (options.removeExtraSpaces) result = result.replace(/  +/g, ' ').replace(/^\s+|\s+$/gm, '');
    if (options.removeLineBreaks) result = result.replace(/[\r\n]+/g, '');
    if (options.removeEmptyLines) result = result.replace(/^\s*[\r\n]/gm, '');
    if (options.trim) result = result.trim();
    if (options.removePunctuation) result = result.replace(/[^\w\s\u4e00-\u9fff]/g, '');
    return result;
}

function executeClean() {
    var text = document.getElementById('textInput').value;
    var resultArea = document.getElementById('resultArea');
    var resultSection = document.getElementById('resultSection');
    var charBefore = document.getElementById('charBefore');
    var charAfter = document.getElementById('charAfter');

    resultSection.style.display = 'none';

    if (!text) {
        return;
    }

    var options = {
        removeExtraSpaces: document.getElementById('optExtraSpaces').checked,
        removeLineBreaks: document.getElementById('optLineBreaks').checked,
        removeEmptyLines: document.getElementById('optEmptyLines').checked,
        trim: document.getElementById('optTrim').checked,
        removePunctuation: document.getElementById('optPunctuation').checked
    };

    var result = cleanText(text, options);
    resultArea.textContent = result;
    charBefore.textContent = text.length;
    charAfter.textContent = result.length;
    resultSection.style.display = 'block';
}

function copyTextCleanerResult() {
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

function resetTextCleaner() {
    document.getElementById('textInput').value = '';
    document.getElementById('resultArea').textContent = '';
    document.getElementById('resultSection').style.display = 'none';
    var checks = document.querySelectorAll('.cleaner-option input[type="checkbox"]');
    for (var i = 0; i < checks.length; i++) {
        checks[i].checked = true;
    }
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
    executeClean();
});