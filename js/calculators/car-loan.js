/**
 * 车贷计算器
 * 功能：根据车价、首付比例、年利率与年限计算首付、贷款额、月供与总利息。
 */

/**
 * 读取表单并计算车贷明细（UI 入口）。
 * @returns {void} 无返回值；车价或首付缺失时弹出提示并中断。
 */
function doCalculate() {
    const price = parseFloat(document.getElementById("carPrice").value);
    const downPct = parseFloat(document.getElementById("downPayment").value);
    const rate = parseFloat(document.getElementById("carRate").value);
    const years = parseInt(document.getElementById("carYears").value, 10);
    if (!price || !downPct) { window.showError("请填写完整信息"); return; }
    const downAmt = price * downPct / 100 * 10000;
    const loanAmt = price * 10000 - downAmt;
    const mr = rate / 100 / 12;
    const months = years * 12;
    const monthly = loanAmt * mr * Math.pow(1 + mr, months) / (Math.pow(1 + mr, months) - 1);
    const totalInterest = monthly * months - loanAmt;
    document.getElementById("carMonthly").textContent = monthly.toFixed(2);
    document.getElementById("carDownAmount").textContent = downAmt.toFixed(0);
    document.getElementById("carLoanAmount").textContent = loanAmt.toFixed(0);
    document.getElementById("carTotalInterest").textContent = totalInterest.toFixed(2);
    document.getElementById('resultArea').classList.remove('hidden');

    // C8 历史记录：仅存浏览器本地，不上传
    if (window.CalcHistory) {
        CalcHistory.save('car-loan', {
            label: (typeof getLang === 'function' && getLang() === 'en')
                ? '¥' + monthly.toFixed(2) + '/mo · car ' + price + '×10k, down ' + downPct + '% @ ' + rate + '% × ' + years + 'y'
                : '¥' + monthly.toFixed(2) + '/月 · ' + price + '万 首付' + downPct + '% @ ' + rate + '% × ' + years + '年',
            inputs: { price: price, downPct: downPct, rate: rate, years: years }
        });
    }
}

// C8 历史记录回填：恢复输入并重算
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.CalcHistory) return;
        CalcHistory.setRestorer('car-loan', function (inputs) {
            if (!inputs) return;
            document.getElementById('carPrice').value = inputs.price;
            document.getElementById('downPayment').value = inputs.downPct;
            document.getElementById('carRate').value = inputs.rate;
            document.getElementById('carYears').value = inputs.years;
            doCalculate();
        });
    });
})();
/**
 * 重置车贷表单为默认值并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById("carPrice").value = "15";
    document.getElementById("downPayment").value = "30";
    document.getElementById("carRate").value = "4.5";
    document.getElementById("carYears").value = "3";
    document.getElementById('resultArea').classList.add('hidden');
}
