/**
 * 标准体重计算器
 * 功能：根据性别、身高与年龄，用 Broca / BMI / Devine 三种公式计算标准体重与正常范围。
 */

/**
 * 读取表单并计算标准体重结果（UI 入口）。
 * @returns {void} 无返回值；性别或身高缺失时弹出提示并中断。
 */
function doCalculate() {
    const gender = document.querySelector('input[name="gender"]:checked')?.value;
    const height = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value, 10) || 30;
    if (!gender || !height) { alert('请选择性别并输入身高'); return; }
    // Broca formula: (height - 100) for male, (height - 105) for female
    const broca = gender === 'male' ? (height - 100) : (height - 105);
    // BMI-based ideal weight: 22 * height(m)^2
    const bmiIdeal = 22 * (height / 100) * (height / 100);
    // Devine formula
    const devine = gender === 'male' 
        ? 50 + 0.9 * (height - 152)
        : 45.5 + 0.9 * (height - 152);
    const minNormal = 18.5 * (height / 100) * (height / 100);
    const maxNormal = 24.9 * (height / 100) * (height / 100);
    document.getElementById('brocaWeight').textContent = broca.toFixed(1);
    document.getElementById('bmiIdealWeight').textContent = bmiIdeal.toFixed(1);
    document.getElementById('devineWeight').textContent = devine.toFixed(1);
    document.getElementById('normalRange').textContent = `${minNormal.toFixed(1)} - ${maxNormal.toFixed(1)}`;
    document.getElementById('resultArea').classList.remove('hidden');
}

/**
 * 重置标准体重表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('height').value = '';
    document.getElementById('age').value = '30';
    document.querySelector('input[name="gender"][value="male"]').checked = true;
    document.getElementById('resultArea').classList.add('hidden');
}
