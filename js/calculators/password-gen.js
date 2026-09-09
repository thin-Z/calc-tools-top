/**
 * 密码生成器
 * 功能：按用户选择的字符类型与长度生成随机密码，并估算强度。
 * 注意：字符集常量 UPPER/LOWER/DIGITS/SYMBOLS 为模块级变量。
 */

var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var LOWER = 'abcdefghijklmnopqrstuvwxyz';
var DIGITS = '0123456789';
var SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

/**
 * HTML 转义：防止生成的密码（SYMBOLS 含 <>&"）注入 DOM。
 * @param {string} s - 原始字符串。
 * @returns {string} 转义后的 HTML 安全字符串。
 */
function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 同步长度滑块的数值显示与填充进度（csp-events.js data-csp-input 委托调用，约定 value 在前）。
 * @param {string|number} value - 滑块当前值（csp-events 传入 el.value）。
 * @param {HTMLInputElement} [el] - 滑块元素（用于读取 min/max 计算填充比例）。
 * @returns {void}
 */
function updatePwdLength(value, el) {
    var val = parseInt(value) || 0;
    var display = document.getElementById('pwdLengthVal');
    if (display) display.textContent = val;
    var slider = el || document.getElementById('pwdLength');
    if (slider && slider.min !== undefined) {
        var min = parseInt(slider.min) || 0;
        var max = parseInt(slider.max) || 100;
        var pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
        slider.style.setProperty('--pg-fill', pct + '%');
    }
}

/**
 * 读取表单并生成指定数量的密码（UI 入口）。
 * @returns {void} 无返回值；未选择任何字符类型时弹出提示并中断。
 */
function doCalculate() {
    var length = parseInt(document.getElementById('pwdLength').value) || 12;
    var includeUpper = document.getElementById('pwdUpper').checked;
    var includeLower = document.getElementById('pwdLower').checked;
    var includeDigits = document.getElementById('pwdDigits').checked;
    var includeSymbols = document.getElementById('pwdSymbols').checked;
    var countRadio = document.querySelector('input[name="pwdCount"]:checked');
    var count = countRadio ? parseInt(countRadio.value) : 1;

    var pool = '';
    if (includeUpper) pool += UPPER;
    if (includeLower) pool += LOWER;
    if (includeDigits) pool += DIGITS;
    if (includeSymbols) pool += SYMBOLS;

    if (!pool) {
        alert('请至少选择一个字符类型 / Please select at least one character type');
        return;
    }

    var result = '';
    for (var n = 0; n < count; n++) {
        var pwd = '';
        for (var i = 0; i < length; i++) {
            pwd += pool.charAt(Math.floor(Math.random() * pool.length));
        }
        result += '<div class="password-result-line"><code>' + escapeHtml(pwd) + '</code><button type="button" class="btn btn-sm" data-csp-click="copyPassword">复制</button></div>';
    }

    document.getElementById('passwordResult').innerHTML = result;
    document.getElementById('resultArea').classList.remove('hidden');

    var strength = getStrength(length, pool);
    var strengthEl = document.getElementById('passwordStrength');
    var colors = { weak: '#ef4444', medium: '#f59e0b', strong: '#22c55e' };
    strengthEl.textContent = '强度: ' + strength.label;
    strengthEl.style.color = colors[strength.level];
}

/**
 * 根据密码长度与字符集大小估算强度等级。
 * @param {number} length - 密码长度。
 * @param {string} pool - 使用的字符集。
 * @returns {{level: string, label: string}} 强度等级（weak/medium/strong）与文案。
 */
function getStrength(length, pool) {
    var charsetSize = pool.length;
    var entropy = length * Math.log2(charsetSize);
    if (entropy < 40) return { level: 'weak', label: '弱 / Weak' };
    if (entropy < 60) return { level: 'medium', label: '中 / Medium' };
    return { level: 'strong', label: '强 / Strong' };
}

/**
 * 复制指定按钮对应的密码到剪贴板。
 * @param {HTMLElement} btn - 复制按钮元素（其前一个兄弟节点为密码 code）。
 * @returns {void} 无返回值。
 */
function copyPassword(btn) {
    var code = btn.previousElementSibling;
    if (!code) return;
    window.copyText(code.textContent).then(function() {
        btn.textContent = '\u2713';
        setTimeout(function() { btn.textContent = '\u590D\u5236 / Copy'; }, 1500);
    }).catch(function() {
        btn.textContent = '\u5931\u8D25 / Failed';
        setTimeout(function() { btn.textContent = '\u590D\u5236 / Copy'; }, 1500);
    });
}

/**
 * 重置密码生成表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    var lenEl = document.getElementById('pwdLength');
    lenEl.value = 12;
    updatePwdLength(lenEl.value, lenEl);
    document.getElementById('pwdUpper').checked = true;
    document.getElementById('pwdLower').checked = true;
    document.getElementById('pwdDigits').checked = true;
    document.getElementById('pwdSymbols').checked = false;
    var defaultCount = document.getElementById('pwdCount1');
    if (defaultCount) defaultCount.checked = true;
    document.getElementById('resultArea').classList.add('hidden');
    document.getElementById('passwordResult').innerHTML = '';
    document.getElementById('passwordStrength').textContent = '';
}