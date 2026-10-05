/**
 * 电费计算器
 * 功能：根据功率（W）、每日使用时长与电价计算日/月耗电量与电费。
 */

/**
 * 读取表单并计算电费结果（UI 入口）。
 * @returns {void} 无返回值；功率/时长缺失、为零或为负数，以及天数不为正数、电价为负数时弹出提示并中断。
 */
function doCalculate() {
    const power = parseFloat(document.getElementById('power').value);
    const hours = parseFloat(document.getElementById('hours').value);
    // 可选字段：仅「留空」才取默认值。禁用 `parseFloat(v) || 默认值` 短路写法——
    // 它会把用户输入的 0 静默改写成默认值（输入被无视且无任何提示）。
    const daysRaw = document.getElementById('days').value;
    const rateRaw = document.getElementById('rate').value;
    const days = daysRaw.trim() === '' ? 30 : parseFloat(daysRaw);
    const rate = rateRaw.trim() === '' ? 0.6 : parseFloat(rateRaw);
    if (!(power > 0) || !(hours > 0)) { window.showError('请输入大于 0 的功率和使用时间'); return; }
    // 天数须为正数（0 天无意义）；电价允许 0（免费用电），但负电价会算出负电费。
    if (!(days > 0)) { window.showError('使用天数需为大于 0 的数字 / Days must be a positive number'); return; }
    if (!(rate >= 0)) { window.showError('电价不能为负数 / Rate must not be negative'); return; }
    const dailyKwh = power * hours / 1000;
    const monthlyKwh = dailyKwh * days;
    const monthlyCost = monthlyKwh * rate;
    document.getElementById('dailyKwh').textContent = dailyKwh.toFixed(2);
    document.getElementById('monthlyKwh').textContent = monthlyKwh.toFixed(2);
    document.getElementById('monthlyCost').textContent = monthlyCost.toFixed(2);
    document.getElementById('resultArea').classList.remove('hidden');
}

/**
 * 重置电费表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('power').value = '';
    document.getElementById('hours').value = '';
    document.getElementById('days').value = '30';
    document.getElementById('rate').value = '0.6';
    document.getElementById('resultArea').classList.add('hidden');
}
