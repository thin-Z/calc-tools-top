/**
 * 年龄计算器
 * 功能：根据出生日期计算周岁（年/月/天）、总天数、距下次生日天数与生肖。
 */

/**
 * 根据出生日期计算年龄信息。
 * @param {string} birthDate - 出生日期字符串（可被 Date 解析，如 '1990-01-15'）。
 * @returns {{years: number, months: number, days: number, totalDays: number,
 *            daysToBirthday: number, zodiac: string}} 年龄明细对象：
 *   years/months/days 为周岁拆分；totalDays 为出生至今总天数；
 *   daysToBirthday 为距下次生日天数；zodiac 为农历生肖。
 */
function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(today.getFullYear(), today.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    const totalDays = Math.floor((today - birth) / (1000 * 60 * 60 * 24));
    const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (nextBirthday < today) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    const daysToBirthday = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
    const zodiac = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const zodiacIndex = (birth.getFullYear() - 4) % 12;
    return { years, months, days, totalDays, daysToBirthday, zodiac: zodiac[zodiacIndex < 0 ? zodiacIndex + 12 : zodiacIndex] };
}

/**
 * 读取表单并展示年龄计算结果（UI 入口）。
 * @returns {void} 无返回值；出生日期为空时弹出提示并中断。
 */
function doCalculate() {
    const birthDate = document.getElementById('birthDate').value;
    const name = document.getElementById('name').value || '';
    if (!birthDate) { alert('请选择出生日期'); return; }
    const r = calculateAge(birthDate);
    const area = document.getElementById('resultArea');
    document.getElementById('ageDisplay').textContent = `${r.years}岁${r.months}个月${r.days}天`;
    document.getElementById('totalDays').textContent = r.totalDays.toLocaleString();
    document.getElementById('zodiac').textContent = r.zodiac;
    document.getElementById('nextBirthday').textContent = r.daysToBirthday;
    area.classList.remove('hidden');
}

/**
 * 重置表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('birthDate').value = '';
    document.getElementById('name').value = '';
    document.getElementById('resultArea').classList.add('hidden');
}
