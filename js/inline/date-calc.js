function toggleMode() {
            const mode = document.querySelector('input[name="calcMode"]:checked').value;
            const modeAFields = document.getElementById('modeAFields');
            const modeBFields = document.getElementById('modeBFields');
            const labelA = document.getElementById('modeALabel');
            const labelB = document.getElementById('modeBLabel');

            if (mode === 'A') {
                modeAFields.style.display = 'block';
                modeBFields.classList.add('hidden');
                labelA.style.borderColor = 'var(--primary)';
                labelA.style.background = 'var(--primary-light)';
                labelA.style.color = 'var(--primary)';
                labelA.style.fontWeight = '600';
                labelB.style.borderColor = 'var(--border)';
                labelB.style.background = 'var(--bg-card)';
                labelB.style.color = 'var(--text-secondary)';
                labelB.style.fontWeight = '500';
            } else {
                modeAFields.style.display = 'none';
                modeBFields.classList.remove('hidden');
                labelB.style.borderColor = 'var(--primary)';
                labelB.style.background = 'var(--primary-light)';
                labelB.style.color = 'var(--primary)';
                labelB.style.fontWeight = '600';
                labelA.style.borderColor = 'var(--border)';
                labelA.style.background = 'var(--bg-card)';
                labelA.style.color = 'var(--text-secondary)';
                labelA.style.fontWeight = '500';
            }
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
