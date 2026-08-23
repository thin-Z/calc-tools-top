/**
 * 电费计算器
 * 功能：根据功率（W）、每日使用时长与电价计算日/月耗电量与电费。
 */

/**
 * 读取表单并计算电费结果（UI 入口）。
 * @returns {void} 无返回值；功率或时长缺失时弹出提示并中断。
 */
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
