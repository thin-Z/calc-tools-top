// 油耗计算器
function doCalculate() {
    const distance = parseFloat(document.getElementById('distance').value);
    const fuelPer100 = parseFloat(document.getElementById('fuelPer100').value);
    const pricePerLiter = parseFloat(document.getElementById('pricePerLiter').value);
    if (!distance || !fuelPer100) { alert('请输入行驶距离和油耗'); return; }
    const fuelUsed = distance * fuelPer100 / 100;
    const totalCost = pricePerLiter ? fuelUsed * pricePerLiter : 0;
    const costPerKm = pricePerLiter ? totalCost / distance : 0;
    document.getElementById('fuelUsed').textContent = fuelUsed.toFixed(1);
    document.getElementById('totalCost').textContent = totalCost.toFixed(2);
    document.getElementById('costPerKm').textContent = costPerKm.toFixed(2);
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('distance').value = '';
    document.getElementById('fuelPer100').value = '';
    document.getElementById('pricePerLiter').value = '';
    document.getElementById('resultArea').style.display = 'none';
}
