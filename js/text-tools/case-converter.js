/* ===== Case Converter ===== */

var currentMode = 'upper';

/**
 * Convert text to the specified case.
 * @param {string} text - Input text to convert.
 * @param {string} mode - Conversion mode: upper, lower, title, sentence, camel, snake, kebab, alternating.
 * @returns {string} Converted text.
 */
function convertCase(text, mode) {
    if (!text) return '';

    switch (mode) {
        case 'upper':
            return text.toUpperCase();

        case 'lower':
            return text.toLowerCase();

        case 'title':
            return text.replace(/\b\w/g, function(c) {
                return c.toUpperCase();
            });

        case 'sentence':
            return text.replace(/(^\s*\w|[.!?]\s*\w)/g, function(c) {
                return c.toUpperCase();
            });

        case 'camel':
            // Remove non-alphanumeric characters (except spaces used as word separators)
            var cleaned = text.replace(/[^a-zA-Z0-9\s]/g, ' ');
            var words = cleaned.split(/\s+/).filter(function(w) { return w.length > 0; });
            if (words.length === 0) return '';
            var result = words[0].toLowerCase();
            for (var i = 1; i < words.length; i++) {
                result += words[i].charAt(0).toUpperCase() + words[i].slice(1).toLowerCase();
            }
            return result;

        case 'snake':
            return text.replace(/[^a-zA-Z0-9\s]/g, ' ')
                       .trim()
                       .replace(/\s+/g, '_')
                       .toLowerCase();

        case 'kebab':
            return text.replace(/[^a-zA-Z0-9\s]/g, ' ')
                       .trim()
                       .replace(/\s+/g, '-')
                       .toLowerCase();

        case 'alternating':
            var altResult = '';
            for (var j = 0; j < text.length; j++) {
                if (j % 2 === 0) {
                    altResult += text[j].toUpperCase();
                } else {
                    altResult += text[j].toLowerCase();
                }
            }
            return altResult;

        default:
            return text;
    }
}

function doConvert() {
    var text = document.getElementById('textInput').value;
    var result = convertCase(text, currentMode);
    document.getElementById('resultArea').value = result;
    document.getElementById('charCount').textContent = result.length;
    document.getElementById('wordCount').textContent = result.trim() ? result.trim().split(/\s+/).length : 0;
}

function switchMode(mode) {
    currentMode = mode;
    var chips = document.querySelectorAll('.mode-chip');
    for (var i = 0; i < chips.length; i++) {
        chips[i].classList.remove('active');
    }
    var target = document.querySelector('.mode-chip[data-mode="' + mode + '"]');
    if (target) target.classList.add('active');
    doConvert();
}

function copyResult() {
    var resultArea = document.getElementById('resultArea');
    var text = resultArea.value;
    if (!text) {
        alert('请先生成转换结果');
        return;
    }

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            var btn = document.getElementById('copyResultBtn');
            btn.textContent = '✅ ' + (btn.textContent.indexOf('📋') !== -1 ? 'Copied' : '已复制');
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = btn.textContent.indexOf('Copied') !== -1 ? '📋 Copy Result' : '📋 复制结果';
                btn.classList.remove('copied');
            }, 2000);
        });
    } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

function resetTool() {
    document.getElementById('textInput').value = '';
    document.getElementById('resultArea').value = '';
    document.getElementById('charCount').textContent = '0';
    document.getElementById('wordCount').textContent = '0';
    switchMode('upper');
}

// Auto-convert initial placeholder text on page load
document.addEventListener('DOMContentLoaded', function() {
    doConvert();
});

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