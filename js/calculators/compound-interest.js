// 复利计算器
function doCalculate() {
    const principal = parseFloat(document.getElementById('principal').value);
    const rate = parseFloat(document.getElementById('annualRate').value);
    const years = parseInt(document.getElementById('years').value, 10);
    const freq = parseInt(document.getElementById('compoundFreq').value, 10);
    if (!principal || !rate || !years) { alert('请填写完整信息'); return; }
    
    const r = rate / 100 / freq;
    const n = years * freq;
    const final = principal * Math.pow(1 + r, n);
    const interest = final - principal;
    
    document.getElementById('finalAmount').textContent = final.toFixed(2);
    document.getElementById('totalInterest').textContent = interest.toFixed(2);
    document.getElementById('interestRate').textContent = (interest / principal * 100).toFixed(1);
    document.getElementById('resultArea').style.display = 'block';
}

function resetForm() {
    document.getElementById('principal').value = '100000';
    document.getElementById('annualRate').value = '5';
    document.getElementById('years').value = '10';
    document.getElementById('compoundFreq').value = '12';
    document.getElementById('resultArea').style.display = 'none';
}
