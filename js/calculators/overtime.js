/**
 * 加班费计算器
 * 功能：按劳动法标准（工作日 1.5 倍 / 休息日 2 倍 / 法定节假日 3 倍）计算加班工资。
 */

/**
 * 读取表单并计算加班费（UI 入口）。
 * @returns {void} 无返回值；月薪缺失时弹出提示并中断。
 */
function doCalculate() {
    const salary = parseFloat(document.getElementById('monthlySalary').value);
    const weekday = parseFloat(document.getElementById('weekdayOvertime').value) || 0;
    const weekend = parseFloat(document.getElementById('weekendOvertime').value) || 0;
    const holiday = parseFloat(document.getElementById('holidayOvertime').value) || 0;
    if (!salary) { window.showError('请输入月薪'); return; }
    const hourlyRate = salary / 21.75 / 8;
    const weekdayPay = hourlyRate * 1.5 * weekday;
    const weekendPay = hourlyRate * 2 * weekend;
    const holidayPay = hourlyRate * 3 * holiday;
    const total = weekdayPay + weekendPay + holidayPay;
    document.getElementById('hourlyRate').textContent = hourlyRate.toFixed(2);
    document.getElementById('weekdayPay').textContent = weekdayPay.toFixed(2);
    document.getElementById('weekendPay').textContent = weekendPay.toFixed(2);
    document.getElementById('holidayPay').textContent = holidayPay.toFixed(2);
    document.getElementById('totalOvertimePay').textContent = total.toFixed(2);
    document.getElementById('resultArea').classList.remove('hidden');

    // C8 历史记录：仅存浏览器本地，不上传
    if (window.CalcHistory) {
        CalcHistory.save('overtime', {
            label: '¥' + total.toFixed(2) + ' · 月薪' + salary + '（' + weekday + '/' + weekend + '/' + holiday + 'h）',
            inputs: { salary: salary, weekday: weekday, weekend: weekend, holiday: holiday }
        });
    }
}

// C8 历史记录回填：恢复输入并重算
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.CalcHistory) return;
        CalcHistory.setRestorer('overtime', function (inputs) {
            if (!inputs) return;
            document.getElementById('monthlySalary').value = inputs.salary;
            document.getElementById('weekdayOvertime').value = inputs.weekday;
            document.getElementById('weekendOvertime').value = inputs.weekend;
            document.getElementById('holidayOvertime').value = inputs.holiday;
            doCalculate();
        });
    });
})();

/**
 * 重置加班费表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('monthlySalary').value = '8000';
    document.getElementById('weekdayOvertime').value = '0';
    document.getElementById('weekendOvertime').value = '0';
    document.getElementById('holidayOvertime').value = '0';
    document.getElementById('resultArea').classList.add('hidden');
}
