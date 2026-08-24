/**
 * 百分比计算器
 * 功能：支持求百分比、百分比数值、加/减百分比与百分比变化等五种模式。
 */

/**
 * 读取表单并按所选模式计算百分比结果（UI 入口）。
 * @returns {void} 无返回值；除零或起始值为零等非法输入时弹出提示并中断。
 */
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
        case 'discount':
            // 折扣计算：A=原价, B=折扣率(%) → 折后价 + 节省金额
            if (val2 < 0 || val2 > 100) { alert('折扣率需在 0-100 之间 / Discount rate must be 0-100'); return; }
            var finalPrice = val1 * (1 - val2 / 100);
            var savedAmount = val1 - finalPrice;
            result = '原价 ' + val1 + '，折扣 ' + val2 + '%：折后价 <strong>' + finalPrice.toFixed(2) + '</strong>，节省 <strong>' + savedAmount.toFixed(2) + '</strong>';
            break;
    }
    
    document.getElementById('percentResult').innerHTML = result;
    document.getElementById('resultArea').classList.remove('hidden');
}

/**
 * 重置百分比表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('percentVal1').value = '';
    document.getElementById('percentVal2').value = '';
    document.getElementById('resultArea').classList.add('hidden');
    document.getElementById('percentResult').innerHTML = '';
}
