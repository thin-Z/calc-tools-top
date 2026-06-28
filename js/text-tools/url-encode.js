/* ===== URL Encode / Decode ===== */

/**
 * Encode text to URL-encoded format (UTF-8 safe).
 * @param {string} text - Input text to encode.
 * @returns {string} URL-encoded string.
 */
function encodeURL(text) {
    return encodeURIComponent(text);
}

/**
 * Decode URL-encoded string back to text (UTF-8 safe).
 * @param {string} encoded - URL-encoded string.
 * @returns {string} Decoded text.
 */
function decodeURL(encoded) {
    return decodeURIComponent(encoded);
}

var currentURLMode = 'encode';

function switchURLMode(mode) {
    currentURLMode = mode;
    var chips = document.querySelectorAll('.mode-chip[data-mode]');
    for (var i = 0; i < chips.length; i++) {
        chips[i].classList.remove('active');
    }
    var target = document.querySelector('.mode-chip[data-mode="' + mode + '"]');
    if (target) target.classList.add('active');
    doURLConvert();
}

function doURLConvert() {
    var text = document.getElementById('urlInput').value;
    var resultArea = document.getElementById('resultArea');
    var resultSection = document.getElementById('resultSection');
    var errorSection = document.getElementById('errorSection');

    resultSection.style.display = 'none';
    errorSection.style.display = 'none';

    if (!text.trim()) {
        return;
    }

    try {
        var result = '';
        if (currentURLMode === 'encode') {
            result = encodeURL(text);
        } else {
            result = decodeURL(text);
        }
        resultArea.textContent = result;
        resultSection.style.display = 'block';
    } catch (e) {
        document.getElementById('errorMsg').textContent = e.message || 'Decode failed: Input is not a valid URL-encoded string';
        errorSection.style.display = 'block';
    }
}

function copyURLResult() {
    var content = document.getElementById('resultArea').textContent;
    if (!content) {
        alert('Please convert data first');
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(function() {
            var btn = document.getElementById('copyBtn');
            btn.textContent = '\u2705 Copied';
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = '\uD83D\uDCCB Copy Result';
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
        btn.textContent = '\u2705 Copied';
        btn.classList.add('copied');
        setTimeout(function() {
            btn.textContent = '\uD83D\uDCCB Copy Result';
            btn.classList.remove('copied');
        }, 2000);
    }
}

function clearURLTool() {
    document.getElementById('urlInput').value = '';
    document.getElementById('resultArea').textContent = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
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
    doURLConvert();
});