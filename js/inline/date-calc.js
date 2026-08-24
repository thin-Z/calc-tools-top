function toggleMode() {
            const mode = document.querySelector('input[name="calcMode"]:checked').value;
            const modeAFields = document.getElementById('modeAFields');
            const modeBFields = document.getElementById('modeBFields');
            const modeCFields = document.getElementById('modeCFields');
            const labelA = document.getElementById('modeALabel');
            const labelB = document.getElementById('modeBLabel');
            const labelC = document.getElementById('modeCLabel');
            const active = { borderColor: 'var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: '600' };
            const inactive = { borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontWeight: '500' };

            modeAFields.style.display = mode === 'A' ? 'block' : 'none';
            modeBFields.classList.toggle('hidden', mode !== 'B');
            modeCFields.classList.toggle('hidden', mode !== 'C');
            Object.assign(labelA.style, mode === 'A' ? active : inactive);
            Object.assign(labelB.style, mode === 'B' ? active : inactive);
            Object.assign(labelC.style, mode === 'C' ? active : inactive);
            document.getElementById('resultArea').classList.add('hidden');
        }

        function calcModeA() {
            const startDate = document.getElementById('startDateA').value;
            const days = parseInt(document.getElementById('daysInput').value);

            if (!startDate) {
                alert(getLang() === 'zh' ? '请选择开始日期' : 'Please select a start date');
                return;
            }
            if (isNaN(days)) {
                alert(getLang() === 'zh' ? '请输入有效天数' : 'Please enter a valid number of days');
                return;
            }

            const result = addDays(startDate, days);
            const dow = getDayOfWeek(result);
            const lang = getLang();
            const dowText = lang === 'zh' ? dow.zh : dow.en;

            document.getElementById('resultDate').textContent = result;
            document.getElementById('resultDayOfWeek').textContent = dowText;
            document.getElementById('resultA').style.display = 'block';
            document.getElementById('resultB').classList.add('hidden');
            document.getElementById('resultArea').classList.remove('hidden');
        }

        function calcModeB() {
            const startDate = document.getElementById('startDateB').value;
            const endDate = document.getElementById('endDate').value;

            if (!startDate || !endDate) {
                alert(getLang() === 'zh' ? '请选择开始和结束日期' : 'Please select both start and end dates');
                return;
            }

            const diff = daysBetween(startDate, endDate);
            document.getElementById('resultDaysDiff').textContent = diff + ' ' + (getLang() === 'zh' ? '天' : 'days');
            document.getElementById('resultA').style.display = 'none';
            document.getElementById('resultB').classList.remove('hidden');
            document.getElementById('resultC').classList.add('hidden');
            document.getElementById('resultArea').classList.remove('hidden');
        }

        function calcModeC() {
            const birthDate = document.getElementById('birthDate').value;
            if (!birthDate) {
                alert(getLang() === 'zh' ? '请选择出生日期' : 'Please select your date of birth');
                return;
            }
            const today = new Date();
            const birth = new Date(birthDate);
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
            const zodiacSign = zodiac[zodiacIndex < 0 ? zodiacIndex + 12 : zodiacIndex];

            const lang = getLang();
            const ageText = lang === 'zh'
                ? years + '岁' + months + '个月' + days + '天'
                : years + ' years ' + months + ' months ' + days + ' days';
            document.getElementById('ageDisplay').textContent = ageText;
            document.getElementById('totalDays').textContent = totalDays.toLocaleString();
            document.getElementById('zodiac').textContent = zodiacSign;
            document.getElementById('nextBirthday').textContent = daysToBirthday + ' ' + (lang === 'zh' ? '天' : 'days');
            document.getElementById('resultA').style.display = 'none';
            document.getElementById('resultB').classList.add('hidden');
            document.getElementById('resultC').classList.remove('hidden');
            document.getElementById('resultArea').classList.remove('hidden');
        }

        function resetForm() {
            const today = todayStr();
            document.getElementById('startDateA').value = today;
            document.getElementById('daysInput').value = 0;
            document.getElementById('startDateB').value = today;
            document.getElementById('endDate').value = today;
            document.getElementById('resultArea').classList.add('hidden');
        }

        // Auto-set today on page load
        document.addEventListener("DOMContentLoaded", function() {
            
            const today = todayStr();
            document.getElementById('startDateA').value = today;
            document.getElementById('startDateB').value = today;
            document.getElementById('endDate').value = today;
        });
