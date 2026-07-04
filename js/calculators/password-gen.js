// password-gen.js - Password Generator

var UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
var LOWER = 'abcdefghijklmnopqrstuvwxyz';
var DIGITS = '0123456789';
var SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

function doCalculate() {
    var length = parseInt(document.getElementById('pwdLength').value) || 12;
    var includeUpper = document.getElementById('pwdUpper').checked;
    var includeLower = document.getElementById('pwdLower').checked;
    var includeDigits = document.getElementById('pwdDigits').checked;
    var includeSymbols = document.getElementById('pwdSymbols').checked;
    var count = parseInt(document.getElementById('pwdCount').value) || 1;
    
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
        result += '<div class="password-result-line"><code>' + pwd + '</code><button class="btn btn-sm" onclick="copyPassword(this)">复制</button></div>';
    }
    
    document.getElementById('passwordResult').innerHTML = result;
    document.getElementById('resultArea').style.display = 'block';
    
    var strength = getStrength(length, pool);
    var strengthEl = document.getElementById('passwordStrength');
    var colors = { weak: '#ef4444', medium: '#f59e0b', strong: '#22c55e' };
    strengthEl.textContent = '强度: ' + strength.label;
    strengthEl.style.color = colors[strength.level];
}

function getStrength(length, pool) {
    var charsetSize = pool.length;
    var entropy = length * Math.log2(charsetSize);
    if (entropy < 40) return { level: 'weak', label: '弱 / Weak' };
    if (entropy < 60) return { level: 'medium', label: '中 / Medium' };
    return { level: 'strong', label: '强 / Strong' };
}

function copyPassword(btn) {
    var code = btn.previousElementSibling;
    if (code) {
        navigator.clipboard.writeText(code.textContent).then(function() {
            btn.textContent = '\u2713';
            setTimeout(function() { btn.textContent = '\u590D\u5236 / Copy'; }, 1500);
        });
    }
}

function resetForm() {
    document.getElementById('pwdLength').value = 12;
    document.getElementById('pwdUpper').checked = true;
    document.getElementById('pwdLower').checked = true;
    document.getElementById('pwdDigits').checked = true;
    document.getElementById('pwdSymbols').checked = false;
    document.getElementById('pwdCount').value = 1;
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('passwordResult').innerHTML = '';
    document.getElementById('passwordStrength').textContent = '';
}
