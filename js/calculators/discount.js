/**
 * 折扣计算器
 * 功能：根据原价与折扣率计算折后价、节省金额与折扣百分比。
 */

/**
 * 读取表单并计算折扣结果（UI 入口）。
 * @returns {void} 无返回值；原价或折扣缺失时弹出提示并中断。
 */
function doCalculate() {
    const price = parseFloat(document.getElementById('originalPrice').value);
    const discount = parseFloat(document.getElementById('discountRate').value);
    if (!price || !discount) { alert('请输入价格和折扣'); return; }
    const finalPrice = price * (1 - discount / 100);
    const saved = price - finalPrice;
    document.getElementById('finalPrice').textContent = finalPrice.toFixed(2);
    document.getElementById('savedAmount').textContent = saved.toFixed(2);
    document.getElementById('discountPercent').textContent = discount + '%';
    document.getElementById('resultArea').classList.remove('hidden');
}

/**
 * 重置折扣表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('originalPrice').value = '';
    document.getElementById('discountRate').value = '';
    document.getElementById('resultArea').classList.add('hidden');
}
