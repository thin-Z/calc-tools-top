/* ===== UUID & Password Generator ===== */

/**
 * Generate a single UUID v4 using crypto.randomUUID().
 * @returns {string} UUID string
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * Generate multiple UUIDs.
 * @param {number} count - Number of UUIDs to generate (1-10)
 * @returns {string[]} Array of UUID strings
 */
function generateUUIDs(count) {
    if (count === undefined) count = 1;
    count = Math.max(1, Math.min(10, count));
    var result = [];
    for (var i = 0; i < count; i++) {
        result.push(generateUUID());
    }
    return result;
}

/**
 * Shuffle an array using Fisher-Yates algorithm.
 * @param {any[]} arr
 * @returns {any[]}
 */
function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

/**
 * Generate a random password with specified options.
 * @param {number} length - Password length (8-64)
 * @param {object} options - Character set options
 * @param {boolean} options.upper - Include uppercase letters
 * @param {boolean} options.lower - Include lowercase letters
 * @param {boolean} options.digits - Include digits
 * @param {boolean} options.symbols - Include symbols
 * @returns {string} Generated password
 */
function generatePassword(length, options) {
    if (options === undefined) options = { upper: true, lower: true, digits: true, symbols: true };
    length = Math.max(8, Math.min(64, length || 16));

    var upperChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var lowerChars = 'abcdefghijklmnopqrstuvwxyz';
    var digitChars = '0123456789';
    var symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    var pool = '';
    var mandatory = [];

    if (options.upper) { pool += upperChars; mandatory.push(upperChars[Math.floor(Math.random() * upperChars.length)]); }
    if (options.lower) { pool += lowerChars; mandatory.push(lowerChars[Math.floor(Math.random() * lowerChars.length)]); }
    if (options.digits) { pool += digitChars; mandatory.push(digitChars[Math.floor(Math.random() * digitChars.length)]); }
    if (options.symbols) { pool += symbolChars; mandatory.push(symbolChars[Math.floor(Math.random() * symbolChars.length)]); }

    if (pool.length === 0) return '';

    // Fill remaining length
    var remaining = length - mandatory.length;
    for (var i = 0; i < remaining; i++) {
        mandatory.push(pool[Math.floor(Math.random() * pool.length)]);
    }

    return shuffle(mandatory).join('');
}

/**
 * Evaluate password strength.
 * @param {string} password
 * @returns {{ level: number, label: string, labelCn: string, color: string }}
 */
function evaluateStrength(password) {
    if (!password) return { level: 0, label: 'Empty', labelCn: '空', color: '#94a3b8' };

    var hasUpper = /[A-Z]/.test(password);
    var hasLower = /[a-z]/.test(password);
    var hasDigit = /\d/.test(password);
    var hasSymbol = /[^A-Za-z0-9]/.test(password);
    var categories = (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSymbol ? 1 : 0);
    var len = password.length;

    if (len >= 16 && categories >= 4) return { level: 4, label: 'Very Strong', labelCn: '非常强', color: '#16a34a' };
    if (len >= 12 && categories >= 3) return { level: 3, label: 'Strong', labelCn: '强', color: '#eab308' };
    if (len >= 8 && categories >= 2) return { level: 2, label: 'Fair', labelCn: '中等', color: '#f59e0b' };
    return { level: 1, label: 'Weak', labelCn: '弱', color: '#ef4444' };
}

/* ===== UI Functions ===== */

var generatorTab = 'uuid';

function switchGeneratorTab(tab) {
    generatorTab = tab;
    document.querySelectorAll('.gen-tab').forEach(function(el) {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.getElementById('uuidPanel').style.display = tab === 'uuid' ? 'block' : 'none';
    document.getElementById('passwordPanel').style.display = tab === 'password' ? 'block' : 'none';
}

function doGenerateUUIDs() {
    var count = parseInt(document.getElementById('uuidCount').value) || 1;
    var uuids = generateUUIDs(count);
    var html = '';
    for (var i = 0; i < uuids.length; i++) {
        html += '<div class="uuid-row"><code class="uuid-text">' + uuids[i] + '</code><button class="copy-btn" onclick="copyRowText(this)">复制</button></div>';
    }
    document.getElementById('uuidResult').innerHTML = html;
}

function doGeneratePassword() {
    var length = parseInt(document.getElementById('pwLength').value) || 16;
    var upper = document.getElementById('pwUpper').checked;
    var lower = document.getElementById('pwLower').checked;
    var digits = document.getElementById('pwDigits').checked;
    var symbols = document.getElementById('pwSymbols').checked;
    var count = parseInt(document.getElementById('pwCount').value) || 1;

    if (!upper && !lower && !digits && !symbols) {
        document.getElementById('pwResult').innerHTML = '<p style="color:#dc2626;">请至少选择一种字符类型</p>';
        document.getElementById('pwStrength').innerHTML = '';
        return;
    }

    var passHtml = '';
    var firstPw = '';
    for (var i = 0; i < count; i++) {
        var pw = generatePassword(length, { upper: upper, lower: lower, digits: digits, symbols: symbols });
        if (i === 0) firstPw = pw;
        passHtml += '<div class="uuid-row"><code class="uuid-text">' + escapeHtml(pw) + '</code><button class="copy-btn" onclick="copyRowText(this)">复制</button></div>';
    }
    document.getElementById('pwResult').innerHTML = passHtml;

    // Show strength for first password
    var strength = evaluateStrength(firstPw);
    var segmentsHtml = '';
    for (var s = 0; s < 4; s++) {
        var segClass = '';
        if (s < strength.level) {
            var segNames = ['', 'weak', 'fair', 'strong', 'very-strong'];
            segClass = 'strength-segment ' + segNames[strength.level];
        } else {
            segClass = 'strength-segment';
        }
        segmentsHtml += '<div class="' + segClass + '"></div>';
    }
    var labelNames = ['', 'weak', 'fair', 'strong', 'very-strong'];
    document.getElementById('pwStrength').innerHTML = segmentsHtml + '<div class="strength-label ' + labelNames[strength.level] + '">' + strength.labelCn + ' (' + strength.label + ')</div>';
}

function copyRowText(btn) {
    var code = btn.parentNode.querySelector('.uuid-text');
    if (!code) return;
    var text = code.textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            btn.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(function() { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
        });
    }
}

function updatePwLength(val) {
    document.getElementById('pwLengthVal').textContent = val;
}

function copyGeneratorAll() {
    var container = generatorTab === 'uuid' ? document.getElementById('uuidResult') : document.getElementById('pwResult');
    if (!container) return;
    var texts = [];
    container.querySelectorAll('.uuid-text').forEach(function(el) { texts.push(el.textContent); });
    if (texts.length === 0) return;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(texts.join('\n')).then(function() {
            var btn = document.getElementById('copyGenAllBtn');
            btn.textContent = '✅ 已复制';
            btn.classList.add('copied');
            setTimeout(function() { btn.textContent = '📋 复制全部'; btn.classList.remove('copied'); }, 2000);
        });
    }
}

function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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
