// 年龄计算器
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
    area.style.display = 'block';
}

function resetForm() {
    document.getElementById('birthDate').value = '';
    document.getElementById('name').value = '';
    document.getElementById('resultArea').style.display = 'none';
}
