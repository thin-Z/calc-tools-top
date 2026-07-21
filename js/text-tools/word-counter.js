/* ===== Word Counter + Keyword Density Analyzer ===== */

/**
 * Count comprehensive statistics for the given text.
 * @param {string} text - Input text to analyze.
 * @returns {object} Stats object with various counts.
 */
function countStats(text) {
    if (!text) {
        return {
            totalChars: 0,
            chineseChars: 0,
            englishWords: 0,
            paragraphs: 0,
            sentences: 0,
            lines: 0,
            visibleChars: 0,
            digits: 0,
            punctuation: 0
        };
    }

    return {
        totalChars: text.length,
        chineseChars: (text.match(/[\u4e00-\u9fff]/g) || []).length,
        englishWords: (text.match(/[a-zA-Z]+/g) || []).length,
        paragraphs: text.split('\n').filter(function(p) { return p.trim().length > 0; }).length,
        sentences: (text.match(/[^.!?\n]+[.!?]*/g) || []).length,
        lines: text.split('\n').length,
        visibleChars: text.replace(/\s/g, '').length,
        digits: (text.match(/\d/g) || []).length,
        punctuation: (text.match(/[^\w\s\u4e00-\u9fff]/g) || []).length
    };
}

/**
 * Perform keyword density analysis on the given text.
 * For Chinese text, splits by individual characters (excluding non-Chinese chars).
 * For English text, splits by word boundaries.
 * @param {string} text - Input text to analyze.
 * @param {number} topN - Number of top keywords to return (default 20).
 * @returns {Array<{word: string, count: number, density: number}>} Sorted frequency array.
 */
function keywordDensity(text, topN) {
    if (topN === undefined) topN = 20;
    if (!text || text.trim().length === 0) return [];

    var hasChinese = /[\u4e00-\u9fff]/.test(text);
    var freq = {};
    var totalWords = 0;

    if (hasChinese) {
        // Chinese mode: split by individual Chinese characters
        var chars = text.match(/[\u4e00-\u9fff]/g);
        if (!chars) return [];
        totalWords = chars.length;
        for (var i = 0; i < chars.length; i++) {
            var c = chars[i];
            if (freq[c] === undefined) freq[c] = 0;
            freq[c]++;
        }
    } else {
        // English mode: split by word boundaries
        var words = text.toLowerCase().match(/[a-z0-9]+(?:['-][a-z0-9]+)*/g);
        if (!words) return [];
        totalWords = words.length;

        // Common English stop words to filter out
        var stopWords = {
            'the': true, 'a': true, 'an': true, 'is': true, 'are': true, 'was': true, 'were': true,
            'be': true, 'been': true, 'being': true, 'have': true, 'has': true, 'had': true,
            'do': true, 'does': true, 'did': true, 'will': true, 'would': true, 'could': true,
            'should': true, 'may': true, 'might': true, 'shall': true, 'can': true, 'need': true,
            'i': true, 'you': true, 'he': true, 'she': true, 'it': true, 'we': true, 'they': true,
            'me': true, 'him': true, 'her': true, 'us': true, 'them': true, 'my': true, 'your': true,
            'his': true, 'its': true, 'our': true, 'their': true, 'mine': true, 'yours': true, 'hers': true,
            'this': true, 'that': true, 'these': true, 'those': true, 'and': true, 'but': true, 'or': true,
            'nor': true, 'not': true, 'so': true, 'yet': true, 'for': true, 'with': true, 'in': true,
            'on': true, 'at': true, 'by': true, 'to': true, 'from': true, 'of': true, 'as': true,
            'into': true, 'through': true, 'during': true, 'before': true, 'after': true, 'above': true,
            'below': true, 'between': true, 'out': true, 'off': true, 'over': true, 'under': true,
            'again': true, 'further': true, 'then': true, 'once': true, 'here': true, 'there': true,
            'when': true, 'where': true, 'why': true, 'how': true, 'all': true, 'each': true, 'every': true,
            'both': true, 'few': true, 'more': true, 'most': true, 'other': true, 'some': true, 'such': true,
            'no': true, 'only': true, 'own': true, 'same': true, 'too': true, 'very': true, 'just': true,
            'about': true, 'up': true, 'down': true, 'if': true, 'than': true, 'that': true, 'which': true,
            'who': true, 'whom': true, 'what': true, 'whose': true, 'also': true, 'well': true, 'like': true,
            'any': true, 'much': true, 'many': true, 'get': true, 'got': true, 'make': true, 'made': true,
            'take': true, 'took': true, 'come': true, 'came': true, 'see': true, 'saw': true, 'know': true,
            'known': true, 'think': true, 'thought': true, 'give': true, 'gave': true, 'find': true, 'found': true,
            'tell': true, 'told': true, 'become': true, 'became': true, 'leave': true, 'left': true, 'feel': true,
            'felt': true, 'put': true, 'set': true, 'let': true, 'begin': true, 'began': true, 'keep': true,
            'kept': true, 'hold': true, 'held': true, 'write': true, 'wrote': true, 'stand': true, 'stood': true,
            'hear': true, 'heard': true, 'let': true, 'mean': true, 'meant': true, 'run': true, 'ran': true,
            'move': true, 'moved': true, 'live': true, 'lived': true, 'bring': true, 'brought': true,
            'always': true, 'never': true, 'often': true, 'sometimes': true, 'usually': true
        };

        for (var j = 0; j < words.length; j++) {
            var w = words[j];
            if (w.length < 2) continue;
            if (stopWords[w] !== undefined) continue;
            if (freq[w] === undefined) freq[w] = 0;
            freq[w]++;
        }
    }

    // Convert to array and sort
    var result = [];
    for (var word in freq) {
        if (freq.hasOwnProperty(word)) {
            result.push({
                word: word,
                count: freq[word],
                density: parseFloat(((freq[word] / totalWords) * 100).toFixed(2))
            });
        }
    }

    result.sort(function(a, b) { return b.count - a.count; });

    // Return top N
    return result.slice(0, topN);
}

/* ===== 页面交互接线（按钮 / 模式切换 / 复制 / 重置） ===== */

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function __setStat(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
}

function doAnalyze() {
    var input = document.getElementById('textInput');
    if (!input) return;
    var text = input.value || '';
    var stats = countStats(text);

    __setStat('statTotalChars', stats.totalChars);
    __setStat('statChineseChars', stats.chineseChars);
    __setStat('statEnglishWords', stats.englishWords);
    __setStat('statParagraphs', stats.paragraphs);
    __setStat('statSentences', stats.sentences);
    __setStat('statLines', stats.lines);
    __setStat('statVisibleChars', stats.visibleChars);
    __setStat('statDigits', stats.digits);
    __setStat('statPunctuation', stats.punctuation);

    var density = keywordDensity(text, 20);
    var list = document.getElementById('keywordList');
    if (list) {
        if (!density || density.length === 0) {
            list.innerHTML = '<li style="text-align:center;color:var(--text-secondary);padding:20px;">' +
                (window.__kwEmptyText || 'No keyword data') + '</li>';
        } else {
            var html = '';
            for (var i = 0; i < density.length; i++) {
                var item = density[i];
                html += '<li><span class="kw-word">' + escapeHtml(item.word) + '</span>' +
                    '<span class="kw-count">' + item.count + '</span>' +
                    '<span class="kw-density">' + item.density + '%</span></li>';
            }
            list.innerHTML = html;
        }
    }
}

function switchMode(mode) {
    var statsArea = document.getElementById('statsArea');
    var keywordsArea = document.getElementById('keywordsArea');
    if (mode === 'keywords') {
        if (statsArea) statsArea.style.display = 'none';
        if (keywordsArea) keywordsArea.style.display = 'block';
    } else {
        if (statsArea) statsArea.style.display = 'block';
        if (keywordsArea) keywordsArea.style.display = 'none';
    }
    var chips = document.querySelectorAll('.mode-chip');
    for (var i = 0; i < chips.length; i++) {
        if (chips[i].getAttribute('data-mode') === mode) {
            chips[i].classList.add('active');
        } else {
            chips[i].classList.remove('active');
        }
    }
}

function resetTool() {
    var input = document.getElementById('textInput');
    if (input) input.value = '';
    __setStat('statTotalChars', 0);
    __setStat('statChineseChars', 0);
    __setStat('statEnglishWords', 0);
    __setStat('statParagraphs', 0);
    __setStat('statSentences', 0);
    __setStat('statLines', 0);
    __setStat('statVisibleChars', 0);
    __setStat('statDigits', 0);
    __setStat('statPunctuation', 0);
    var list = document.getElementById('keywordList');
    if (list && window.__kwDefaultHtml) list.innerHTML = window.__kwDefaultHtml;
    switchMode('stats');
}

function copyResult() {
    var btn = document.getElementById('copyResultBtn');
    var originalText = btn ? btn.textContent : '';
    var grid = document.querySelector('.stats-grid');
    var text = '';
    if (grid) {
        var cards = grid.querySelectorAll('.stat-card');
        for (var i = 0; i < cards.length; i++) {
            var val = cards[i].querySelector('.stat-value');
            var label = cards[i].querySelector('.stat-label');
            if (val && label) {
                text += label.textContent.trim() + ': ' + val.textContent.trim() + '\n';
            }
        }
    }
    if (!text) {
        if (btn) btn.textContent = '...';
        setTimeout(function () { if (btn) btn.textContent = originalText; }, 1200);
        return;
    }
    function done() {
        if (btn) btn.textContent = '✓';
        setTimeout(function () { if (btn) btn.textContent = originalText; }, 1500);
    }
    function fallback(t) {
        var ta = document.createElement('textarea');
        ta.value = t;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { if (btn) btn.textContent = '✗'; }
        document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text); });
    } else {
        fallback(text);
    }
}

// 页面加载后：捕获关键词列表默认占位文本，并自动分析初始文本
document.addEventListener('DOMContentLoaded', function () {
    var list = document.getElementById('keywordList');
    if (list) window.__kwDefaultHtml = list.innerHTML;
    if (document.getElementById('textInput')) doAnalyze();
});