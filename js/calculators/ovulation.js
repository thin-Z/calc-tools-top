/**
 * 排卵期计算器
 * 功能：根据末次月经日期、月经周期与经期天数推算排卵日、易孕期与下次月经。
 */

/**
 * 读取表单并推算排卵期（UI 入口）。
 * @returns {void} 无返回值；末次月经日期缺失时弹出提示并中断。
 */
function doCalculate() {
    const cycle = parseInt(document.getElementById('cycleDays').value, 10) || 28;
    const period = parseInt(document.getElementById('periodDays').value, 10) || 5;
    const lastPeriod = document.getElementById('lastPeriod').value;
    if (!lastPeriod) { alert('请选择末次月经日期'); return; }
    
    const last = new Date(lastPeriod);
    const ovulationDay = new Date(last);
    ovulationDay.setDate(last.getDate() + (cycle - 14));
    
    const fertileStart = new Date(ovulationDay);
    fertileStart.setDate(ovulationDay.getDate() - 5);
    const fertileEnd = new Date(ovulationDay);
    fertileEnd.setDate(ovulationDay.getDate() + 1);
    
    const nextPeriod = new Date(last);
    nextPeriod.setDate(last.getDate() + cycle);
    
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    
    document.getElementById('ovulationDay').textContent = fmt(ovulationDay);
    document.getElementById('fertileStart').textContent = fmt(fertileStart);
    document.getElementById('fertileEnd').textContent = fmt(fertileEnd);
    document.getElementById('nextPeriod').textContent = fmt(nextPeriod);
    document.getElementById('cycleDisplay').textContent = cycle + '天';
    document.getElementById('resultArea').classList.remove('hidden');
}

/**
 * 重置排卵期表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('lastPeriod').value = '';
    document.getElementById('cycleDays').value = '28';
    document.getElementById('periodDays').value = '5';
    document.getElementById('resultArea').classList.add('hidden');
}
