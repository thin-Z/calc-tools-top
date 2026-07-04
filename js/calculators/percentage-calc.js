// percentage-calc.js - Percentage Calculator

function doCalculate() {
    var mode = document.getElementById('percentMode').value;
    var val1 = parseFloat(document.getElementById('percentVal1').value) || 0;
    var val2 = parseFloat(document.getElementById('percentVal2').value) || 0;
    var result = '';
    
    switch(mode) {
        case 'whatPercent':
            // X is what % of Y?
            if (val2 === 0) { alert('第二个值不能为0 / Value cannot be zero'); return; }
            var pct = (val1 / val2 * 100);
            result = val1 + ' 是 ' + val2 + ' 的 <strong>' + pct.toFixed(2) + '%</strong>';
            break;
        case 'percentOf':
            // X% of Y = ?
            result = val1 + '% 的 ' + val2 + ' = <strong>' + (val1 / 100 * val2).toFixed(2) + '</strong>';
            break;
        case 'addPercent':
            // X + X% = ?
            result = val1 + ' + ' + val1 + '×' + val2 + '% = <strong>' + (val1 + val1 * val2 / 100).toFixed(2) + '</strong>';
            break;
        case 'subtractPercent':
            // X - X% = ?
            result = val1 + ' - ' + val1 + '×' + val2 + '% = <strong>' + (val1 - val1 * val2 / 100).toFixed(2) + '</strong>';
            break;
        case 'percentChange':
            // From X to Y = ?% change
            if (val1 === 0) { alert('起始值不能为0 / Starting value cannot be zero'); return; }
            var change = ((val2 - val1) / val1 * 100);
            var direction = change >= 0 ? '增长' : '下降';
            result = '从 ' + val1 + ' 到 ' + val2 + '：<strong>' + direction + ' ' + Math.abs(change).toFixed(2) + '%</strong>';
            break;
    }
    
    document.getElementById('percentResult').innerHTML = result;
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('percentVal1').value = '';
    document.getElementById('percentVal2').value = '';
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('percentResult').innerHTML = '';
}
