/**
 * 复利计算器
 * 功能：根据本金、年利率、年限与计息频率计算复利终值、利息与收益率。
 */

/**
 * 读取表单并计算复利结果（UI 入口）。
 * @returns {void} 无返回值；本金/利率/年限缺失时弹出提示并中断。
 */
function doCalculate() {
    const principal = parseFloat(document.getElementById('principal').value);
    const rate = parseFloat(document.getElementById('annualRate').value);
    const years = parseInt(document.getElementById('years').value, 10);
    const freq = parseInt(document.getElementById('compoundFreq').value, 10);
    if (!principal || !rate || !years) { window.showError((typeof getLang === 'function' && getLang() === 'en') ? 'Please fill in all fields' : '请填写完整信息'); return; }
    
    const r = rate / 100 / freq;
    const n = years * freq;
    const final = principal * Math.pow(1 + r, n);
    const interest = final - principal;
    
    document.getElementById('finalAmount').textContent = final.toFixed(2);
    document.getElementById('totalInterest').textContent = interest.toFixed(2);
    document.getElementById('interestRate').textContent = (interest / principal * 100).toFixed(1);
    document.getElementById('resultArea').classList.remove('hidden');

    // C8 历史记录：仅存浏览器本地，不上传
    if (window.CalcHistory) {
        CalcHistory.save('compound-interest', {
            // label 双语化（同 11-04 car-loan 模式）：en 页 Principal ($) 为美元语义，历史 label 用 $；zh 分支文本零变化
            label: (typeof getLang === 'function' && getLang() === 'en')
                ? '$' + final.toFixed(2) + ' · ' + principal + ' @ ' + rate + '% × ' + years + 'y'
                : '¥' + final.toFixed(2) + ' · ' + principal + ' @ ' + rate + '% × ' + years + 'y',
            inputs: { principal: principal, rate: rate, years: years, freq: freq }
        });
    }
}

/**
 * 重置复利表单为默认值并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('principal').value = '100000';
    document.getElementById('annualRate').value = '5';
    document.getElementById('years').value = '10';
    document.getElementById('compoundFreq').value = '12';
    document.getElementById('resultArea').classList.add('hidden');
}

// C8 历史记录回填：恢复输入并重算
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        if (!window.CalcHistory) return;
        CalcHistory.setRestorer('compound-interest', function (inputs) {
            if (!inputs) return;
            document.getElementById('principal').value = inputs.principal;
            document.getElementById('annualRate').value = inputs.rate;
            document.getElementById('years').value = inputs.years;
            document.getElementById('compoundFreq').value = inputs.freq;
            doCalculate();
        });
    });
})();
