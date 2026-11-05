/**
 * 油耗计算器
 * 功能：根据行驶距离、百公里油耗与油价计算耗油量、总油费与每公里成本。
 */

/**
 * 读取表单并计算油耗结果（UI 入口）。
 * @returns {void} 无返回值；距离或油耗缺失/为零/为负数，以及油价为负数时弹出提示并中断。
 */
function doCalculate() {
    const distance = parseFloat(document.getElementById('distance').value);
    const fuelPer100 = parseFloat(document.getElementById('fuelPer100').value);
    // 可选字段：留空按「不计油费」处理。禁用 `parseFloat(v) ? … : 0` 短路写法——
    // 负油价是 truthy，会一路算出负账（负总油费 / 负每公里成本），用户无从察觉。
    const priceRaw = document.getElementById('pricePerLiter').value;
    const pricePerLiter = priceRaw.trim() === '' ? 0 : parseFloat(priceRaw);
    if (!(distance > 0) || !(fuelPer100 > 0)) { window.showError((typeof getLang === 'function' && getLang() === 'en') ? 'Distance and fuel consumption must be greater than 0' : '请输入大于 0 的行驶距离和油耗'); return; }
    // 油价允许 0（不算钱），但负数一律拦。
    if (!(pricePerLiter >= 0)) { window.showError('油价不能为负数 / Price per liter must not be negative'); return; }
    const fuelUsed = distance * fuelPer100 / 100;
    const totalCost = fuelUsed * pricePerLiter;
    const costPerKm = pricePerLiter > 0 ? totalCost / distance : 0;
    document.getElementById('fuelUsed').textContent = fuelUsed.toFixed(1);
    document.getElementById('totalCost').textContent = totalCost.toFixed(2);
    document.getElementById('costPerKm').textContent = costPerKm.toFixed(2);
    document.getElementById('resultArea').classList.remove('hidden');

    // C8 历史记录：仅存浏览器本地，不上传
    if (window.CalcHistory) {
        CalcHistory.save('fuel-cost', {
            label: (typeof getLang === 'function' && getLang() === 'en')
                ? '¥' + totalCost.toFixed(2) + ' · ' + distance + 'km, ' + fuelPer100 + 'L/100km, ¥' + pricePerLiter + '/L'
                : '¥' + totalCost.toFixed(2) + ' · ' + distance + 'km 油耗' + fuelPer100 + ' 油价' + pricePerLiter,
            inputs: { distance: distance, fuelPer100: fuelPer100, pricePerLiter: pricePerLiter }
        });
    }
}

// C8 历史记录回填：恢复输入并重算
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.CalcHistory) return;
        CalcHistory.setRestorer('fuel-cost', function (inputs) {
            if (!inputs) return;
            document.getElementById('distance').value = inputs.distance;
            document.getElementById('fuelPer100').value = inputs.fuelPer100;
            document.getElementById('pricePerLiter').value = inputs.pricePerLiter;
            doCalculate();
        });
    });
})();

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
