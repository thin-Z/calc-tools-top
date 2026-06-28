/* ===== Reading Time Calculator ===== */

/**
 * Calculate reading time statistics for the given text.
 * @param {string} text - Input text
 * @returns {object} Reading time stats
 */
function readingTime(text) {
    if (!text || text.trim().length === 0) {
        return {
            totalChars: 0,
            totalWords: 0,
            readingTime: { slow: 0, normal: 0, fast: 0 },
            speakingTime: { slow: 0, normal: 0, fast: 0 },
            difficulty: ''
        };
    }

    var chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    var englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    var total = chineseChars + englishWords;

    return {
        totalChars: text.length,
        chineseChars: chineseChars,
        englishWords: englishWords,
        totalWords: total,
        readingTime: {
            slow: +(total / 200).toFixed(1),
            normal: +(total / 300).toFixed(1),
            fast: +(total / 400).toFixed(1)
        },
        speakingTime: {
            slow: +(total / 100).toFixed(1),
            normal: +(total / 150).toFixed(1),
            fast: +(total / 200).toFixed(1)
        },
        difficulty: total > 1000 ? '专业' : total > 500 ? '大学' : total > 200 ? '高中' : total > 50 ? '初中' : '小学'
    };
}

/**
 * Get reading speed description in Chinese.
 * @param {string} speed - Speed key ('slow'|'normal'|'fast')
 * @returns {string} Description
 */
function speedLabel(speed) {
    var labels = { slow: '慢速', normal: '正常', fast: '快速' };
    return labels[speed] || '正常';
}

/**
 * Get reading speed description in English.
 * @returns {object}
 */
function speedLabelEn(speed) {
    var labels = { slow: 'Slow', normal: 'Normal', fast: 'Fast' };
    return labels[speed] || 'Normal';
}

/* ===== UI Functions ===== */

var readingSpeed = 'normal';

function setReadingSpeed(speed) {
    readingSpeed = speed;
    document.querySelectorAll('.speed-chip').forEach(function(el) {
        el.classList.toggle('active', el.dataset.speed === speed);
    });
    doReadingTime();
}

function doReadingTime() {
    var text = document.getElementById('rtInput').value;
    var stats = readingTime(text);

    document.getElementById('rtTotalChars').textContent = stats.totalChars;
    document.getElementById('rtChineseChars').textContent = stats.chineseChars;
    document.getElementById('rtEnglishWords').textContent = stats.englishWords;
    document.getElementById('rtTotalWords').textContent = stats.totalWords;

    var rt = stats.readingTime[readingSpeed];
    var st = stats.speakingTime[readingSpeed];
    document.getElementById('rtReadingTime').textContent = rt + ' 分钟';
    document.getElementById('rtSpeakingTime').textContent = st + ' 分钟';
    document.getElementById('rtDifficulty').textContent = stats.difficulty || '-';

    // Show/hide no-data state
    document.querySelectorAll('.rt-stat-value').forEach(function(el) {
        el.style.opacity = stats.totalChars > 0 ? '1' : '0.3';
    });
}

function resetReadingTime() {
    document.getElementById('rtInput').value = '';
    doReadingTime();
}

function copyReadingTime() {
    var text = document.getElementById('rtInput').value;
    var stats = readingTime(text);
    var copyText = '阅读时间分析结果：\n' +
        '总字符数：' + stats.totalChars + '\n' +
        '中文字数：' + stats.chineseChars + '\n' +
        '英文词数：' + stats.englishWords + '\n' +
        '总字数（中文+英文）：' + stats.totalWords + '\n' +
        '阅读时间（' + speedLabel(readingSpeed) + '）：' + stats.readingTime[readingSpeed] + ' 分钟\n' +
        '说话时间（' + speedLabel(readingSpeed) + '）：' + stats.speakingTime[readingSpeed] + ' 分钟\n' +
        '难度等级：' + (stats.difficulty || '无') + '\n';
    if (navigator.clipboard) {
        navigator.clipboard.writeText(copyText).then(function() {
            var btn = document.getElementById('copyRtBtn');
            btn.textContent = '✅ 已复制';
            btn.classList.add('copied');
            setTimeout(function() { btn.textContent = '📋 复制结果'; btn.classList.remove('copied'); }, 2000);
        });
    }
}

// Auto-analyze on input with debounce
var rtTimer = null;
function scheduleReadingTime() {
    if (rtTimer) clearTimeout(rtTimer);
    rtTimer = setTimeout(doReadingTime, 300);
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
