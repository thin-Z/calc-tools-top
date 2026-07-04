// random-gen.js - Random Number Generator

function doCalculate() {
    var min = parseInt(document.getElementById('randMin').value) || 0;
    var max = parseInt(document.getElementById('randMax').value) || 100;
    var count = parseInt(document.getElementById('randCount').value) || 1;
    var unique = document.getElementById('randUnique').checked;
    var sortResult = document.getElementById('randSort').checked;
    
    if (min >= max) {
        alert('最大值必须大于最小值 / Max must be greater than min');
        return;
    }
    
    if (unique && (max - min + 1) < count) {
        alert('不重复模式下，生成数量不能超过范围 / Count cannot exceed range in unique mode');
        return;
    }
    
    var results = [];
    
    if (unique) {
        // Generate unique numbers
        var pool = [];
        for (var i = min; i <= max; i++) pool.push(i);
        // Fisher-Yates shuffle
        for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp = pool[i]; pool[i] = pool[j]; pool[j] = temp;
        }
        results = pool.slice(0, count);
    } else {
        for (var i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
    }
    
    if (sortResult) results.sort(function(a, b) { return a - b; });
    
    var html = '<div class="random-numbers">';
    results.forEach(function(num) {
        html += '<span class="random-number-badge">' + num + '</span>';
    });
    html += '</div>';
    html += '<button class="btn btn-sm" onclick="copyRandomResults()">复制结果 / Copy Results</button>';
    
    document.getElementById('randomResult').innerHTML = html;
    document.getElementById('resultArea').style.display = 'block';
}

function copyRandomResults() {
    var badges = document.querySelectorAll('.random-number-badge');
    var text = Array.from(badges).map(function(b) { return b.textContent; }).join(', ');
    navigator.clipboard.writeText(text).then(function() {
        var btn = document.querySelector('#randomResult .btn');
        if (btn) { btn.textContent = '\u2713'; setTimeout(function() { btn.textContent = '复制结果 / Copy Results'; }, 1500); }
    });
}

function resetForm() {
    document.getElementById('randMin').value = '1';
    document.getElementById('randMax').value = '100';
    document.getElementById('randCount').value = '1';
    document.getElementById('randUnique').checked = false;
    document.getElementById('randSort').checked = false;
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('randomResult').innerHTML = '';
}
