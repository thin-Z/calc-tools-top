/* ===== JSON Formatter & Minifier ===== */

/**
 * Format or minify JSON text.
 * @param {string} text - Input JSON string.
 * @param {string} mode - 'format' or 'minify'.
 * @returns {object} Result with success/error state.
 *   success=true: { success, result, size, originalSize }
 *   success=false: { success, error, line, col, context }
 *   context 为错误位置前后 ~80 字符的片段（P1P2-03 新增可选字段）。
 * @throws {never} 非字符串输入（null/undefined/数字/布尔等）不抛异常，
 *   返回 {success:false} 并说明原因（P2-2 修复：JSON.parse(null) 返回 null 不报错，
 *   随后访问 text.length 会崩，故入口先做类型校验）。
 */
function formatJSON(text, mode) {
    if (typeof text !== 'string') {
        var typeName = text === null ? 'null' : Array.isArray(text) ? 'array' : typeof text;
        return {
            success: false,
            error: '输入必须是 JSON 字符串（received ' + typeName + '）',
            line: 0,
            col: 0,
            context: ''
        };
    }
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
        var line = 1, col = 1, pos = 0;
        if (match) {
            pos = parseInt(match[1], 10);
            var before = text.substring(0, pos);
            line = before.split('\n').length;
            col = pos - before.lastIndexOf('\n');
        }
        // 错误位置上下文（±80 字符），帮助用户快速定位（P1P2-03）
        var ctxStart = Math.max(0, pos - 80);
        var ctxEnd = Math.min(text.length, pos + 80);
        var context = text.substring(ctxStart, ctxEnd);
        return {
            success: false,
            error: e.message,
            line: line,
            col: col,
            context: context
        };
    }
}

function doFormat() {
    var text = document.getElementById('jsonInput').value;
    if (!text.trim()) {
        document.getElementById('resultArea').textContent = '';
        document.getElementById('resultSection').classList.add('hidden');
        return;
    }
    var mode = currentJSONMode || 'format';
    var res = formatJSON(text, mode);
    var resultArea = document.getElementById('resultArea');
    var resultSection = document.getElementById('resultSection');
    var errorSection = document.getElementById('errorSection');
    var statsSection = document.getElementById('statsSection');

    resultSection.classList.add('hidden');
    errorSection.style.display = 'none';
    statsSection.style.display = 'none';

    if (res.success) {
        resultArea.textContent = res.result;
        resultSection.classList.remove('hidden');
        document.getElementById('originalSize').textContent = res.originalSize;
        document.getElementById('formattedSize').textContent = res.size;
        statsSection.style.display = 'flex';
    } else {
        document.getElementById('errorLine').textContent = res.line;
        document.getElementById('errorCol').textContent = res.col;
        document.getElementById('errorMsg').textContent = res.error;
        var ctxEl = document.getElementById('errorContext');
        if (ctxEl) {
            ctxEl.textContent = res.context ? res.context : '';
            ctxEl.classList.toggle('hidden', !res.context);
        }
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
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
}

// 暴露纯函数供单元测试与浏览器控制台使用（P1P2-03）
window.formatJSON = formatJSON;

document.addEventListener('DOMContentLoaded', function() {
    doFormat();
});
