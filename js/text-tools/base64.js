/* ===== Base64 Encoder / Decoder ===== */

/**
 * Encode text to Base64 (UTF-8 safe).
 * @param {string} text - Input text to encode.
 * @returns {string} Base64 encoded string.
 */
function encodeBase64(text) {
    var encoder = new TextEncoder();
    var bytes = encoder.encode(text);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Decode Base64 to text (UTF-8 safe).
 * @param {string} base64 - Base64 encoded string.
 * @returns {string} Decoded text.
 */
function decodeBase64(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

var currentBase64Mode = 'encode';

function switchBase64Mode(mode) {
    currentBase64Mode = mode;
    var chips = document.querySelectorAll('.mode-chip[data-mode]');
    for (var i = 0; i < chips.length; i++) {
        chips[i].classList.remove('active');
    }
    var target = document.querySelector('.mode-chip[data-mode="' + mode + '"]');
    if (target) target.classList.add('active');
    doConvert();
}

function doConvert() {
    var text = document.getElementById('textInput').value;
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
        if (currentBase64Mode === 'encode') {
            result = encodeBase64(text);
        } else {
            result = decodeBase64(text);
        }
        resultArea.textContent = result;
        resultSection.style.display = 'block';
    } catch (e) {
        document.getElementById('errorMsg').textContent = e.message || '解码失败：输入不是有效的 Base64 编码';
        errorSection.style.display = 'block';
    }
}

function copyBase64Result() {
    var content = document.getElementById('resultArea').textContent;
    if (!content) {
        alert('请先转换数据');
        return;
    }
    if (navigator.clipboard) {
        navigator.clipboard.writeText(content).then(function() {
            var btn = document.getElementById('copyBtn');
            btn.textContent = '\u2705 \u5DF2\u590D\u5236';
            btn.classList.add('copied');
            setTimeout(function() {
                btn.textContent = '\uD83D\uDCCB \u590D\u5236\u7ED3\u679C';
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
        btn.textContent = '\u2705 \u5DF2\u590D\u5236';
        btn.classList.add('copied');
        setTimeout(function() {
            btn.textContent = '\uD83D\uDCCB \u590D\u5236\u7ED3\u679C';
            btn.classList.remove('copied');
        }, 2000);
    }
}

function clearTool() {
    document.getElementById('textInput').value = '';
    document.getElementById('resultArea').textContent = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    doConvert();
});
