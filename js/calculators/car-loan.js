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
    if (!price || !downPct) { alert("请填写完整信息"); return; }
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
}
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
