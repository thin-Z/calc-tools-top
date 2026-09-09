/* ===== UUID Generator ===== */

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

/* ===== UI Functions ===== */

function doGenerateUUIDs() {
    var count = parseInt(document.getElementById('uuidCount').value) || 1;
    var uuids = generateUUIDs(count);
    var html = '';
    for (var i = 0; i < uuids.length; i++) {
        html += '<div class="uuid-row"><code class="uuid-text">' + uuids[i] + '</code><button type="button" class="copy-btn" data-csp-click="copyRowText">复制</button></div>';
    }
    document.getElementById('uuidResult').innerHTML = html;
}

function copyRowText(btn) {
    var code = btn.parentNode.querySelector('.uuid-text');
    if (!code) return;
    var text = code.textContent;
    window.copyText(text).then(function() {
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
    }).catch(function() {
        btn.textContent = '复制失败';
        setTimeout(function() { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
    });
}

function copyGeneratorAll() {
    var container = document.getElementById('uuidResult');
    if (!container) return;
    var texts = [];
    container.querySelectorAll('.uuid-text').forEach(function(el) { texts.push(el.textContent); });
    if (texts.length === 0) return;
    window.copyText(texts.join('\n')).then(function() {
        var btn = document.getElementById('copyGenAllBtn');
        if (btn) {
            btn.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(function() { btn.textContent = '复制全部'; btn.classList.remove('copied'); }, 2000);
        }
    }).catch(function() {
        var btn = document.getElementById('copyGenAllBtn');
        if (btn) {
            btn.textContent = '复制失败';
            setTimeout(function() { btn.textContent = '复制全部'; btn.classList.remove('copied'); }, 2000);
        }
    });
}
