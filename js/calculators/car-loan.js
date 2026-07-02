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
    document.getElementById("resultArea").style.display = "block";
}
function resetForm() {
    document.getElementById("carPrice").value = "15";
    document.getElementById("downPayment").value = "30";
    document.getElementById("carRate").value = "4.5";
    document.getElementById("carYears").value = "3";
    document.getElementById("resultArea").style.display = "none";
}
