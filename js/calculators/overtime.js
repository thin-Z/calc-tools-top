// 加班费计算器
function doCalculate() {
    const salary = parseFloat(document.getElementById('monthlySalary').value);
    const weekday = parseFloat(document.getElementById('weekdayOvertime').value) || 0;
    const weekend = parseFloat(document.getElementById('weekendOvertime').value) || 0;
    const holiday = parseFloat(document.getElementById('holidayOvertime').value) || 0;
    if (!salary) { alert('请输入月薪'); return; }
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
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('monthlySalary').value = '8000';
    document.getElementById('weekdayOvertime').value = '0';
    document.getElementById('weekendOvertime').value = '0';
    document.getElementById('holidayOvertime').value = '0';
    document.getElementById('resultArea').style.display = 'none';
}
