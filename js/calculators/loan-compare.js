// 贷款对比计算器
function doCalculate() {
    const amount = parseFloat(document.getElementById('loanAmount').value);
    const rate1 = parseFloat(document.getElementById('rate1').value);
    const rate2 = parseFloat(document.getElementById('rate2').value);
    const years = parseFloat(document.getElementById('loanYears').value);
    if (!amount || !rate1 || !rate2 || !years) { alert('请填写完整信息'); return; }
    
    const calc = (rate) => {
        const mr = rate / 100 / 12;
        const months = years * 12;
        const monthly = amount * mr * Math.pow(1 + mr, months) / (Math.pow(1 + mr, months) - 1);
        const total = monthly * months;
        const interest = total - amount;
        return { monthly, total, interest };
    };
    
    const r1 = calc(rate1);
    const r2 = calc(rate2);
    const diffMonthly = Math.abs(r1.monthly - r2.monthly);
    const diffInterest = Math.abs(r1.interest - r2.interest);
    
    document.getElementById('plan1Monthly').textContent = r1.monthly.toFixed(2);
    document.getElementById('plan1Total').textContent = r1.total.toFixed(2);
    document.getElementById('plan1Interest').textContent = r1.interest.toFixed(2);
    document.getElementById('plan2Monthly').textContent = r2.monthly.toFixed(2);
    document.getElementById('plan2Total').textContent = r2.total.toFixed(2);
    document.getElementById('plan2Interest').textContent = r2.interest.toFixed(2);
    document.getElementById('diffMonthly').textContent = diffMonthly.toFixed(2);
    document.getElementById('diffInterest').textContent = diffInterest.toFixed(2);
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('loanAmount').value = '100';
    document.getElementById('rate1').value = '3.85';
    document.getElementById('rate2').value = '4.2';
    document.getElementById('loanYears').value = '30';
    document.getElementById('resultArea').style.display = 'none';
}
