// 电费计算器
function doCalculate() {
    const power = parseFloat(document.getElementById('power').value);
    const hours = parseFloat(document.getElementById('hours').value);
    const days = parseFloat(document.getElementById('days').value) || 30;
    const rate = parseFloat(document.getElementById('rate').value) || 0.6;
    if (!power || !hours) { alert('请输入功率和使用时间'); return; }
    const dailyKwh = power * hours / 1000;
    const monthlyKwh = dailyKwh * days;
    const monthlyCost = monthlyKwh * rate;
    document.getElementById('dailyKwh').textContent = dailyKwh.toFixed(2);
    document.getElementById('monthlyKwh').textContent = monthlyKwh.toFixed(2);
    document.getElementById('monthlyCost').textContent = monthlyCost.toFixed(2);
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('power').value = '';
    document.getElementById('hours').value = '';
    document.getElementById('days').value = '30';
    document.getElementById('rate').value = '0.6';
    document.getElementById('resultArea').style.display = 'none';
}
