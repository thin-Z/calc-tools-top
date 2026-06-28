// 折扣计算器
function doCalculate() {
    const price = parseFloat(document.getElementById('originalPrice').value);
    const discount = parseFloat(document.getElementById('discountRate').value);
    if (!price || !discount) { alert('请输入价格和折扣'); return; }
    const finalPrice = price * (1 - discount / 100);
    const saved = price - finalPrice;
    document.getElementById('finalPrice').textContent = finalPrice.toFixed(2);
    document.getElementById('savedAmount').textContent = saved.toFixed(2);
    document.getElementById('discountPercent').textContent = discount + '%';
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('originalPrice').value = '';
    document.getElementById('discountRate').value = '';
    document.getElementById('resultArea').style.display = 'none';
}
