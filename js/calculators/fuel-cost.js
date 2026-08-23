/**
 * 油耗计算器
 * 功能：根据行驶距离、百公里油耗与油价计算耗油量、总油费与每公里成本。
 */

/**
 * 读取表单并计算油耗结果（UI 入口）。
 * @returns {void} 无返回值；距离或油耗缺失时弹出提示并中断。
 */
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
    document.getElementById('resultArea').classList.remove('hidden');
}

/**
 * 重置油耗表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('distance').value = '';
    document.getElementById('fuelPer100').value = '';
    document.getElementById('pricePerLiter').value = '';
    document.getElementById('resultArea').classList.add('hidden');
}
