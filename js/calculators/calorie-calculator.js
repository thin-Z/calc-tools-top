/* ===== Calorie Calculator (卡路里计算器) =====
 * 纯前端实现，无第三方依赖。
 * 功能：根据性别、年龄、身高、体重计算 BMR（基础代谢率）与每日维持热量（TDEE），
 *       并给出减重 / 增肌建议区间。
 * 公式：
 *   - Mifflin-St Jeor（1990，主推）：
 *       男：BMR = 10×体重(kg) + 6.25×身高(cm) − 5×年龄 + 5
 *       女：BMR = 10×体重(kg) + 6.25×身高(cm) − 5×年龄 − 161
 *   - Harris-Benedict（1984 修订版，对照参考）：
 *       男：BMR = 13.397×体重 + 4.799×身高 − 5.677×年龄 + 88.362
 *       女：BMR = 9.247×体重 + 3.098×身高 − 4.330×年龄 + 447.593
 *   - 活动水平系数（乘 BMR 得到 TDEE）：
 *       久坐 1.2 / 轻度 1.375 / 中度 1.55 / 高度 1.725 / 极高 1.9
 */
(function () {
    'use strict';

    var ACTIVITY_LEVELS = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9
    };

    /* ---------- 公式 ---------- */
    function mifflinStJeor(gender, weightKg, heightCm, age) {
        var base = 10 * weightKg + 6.25 * heightCm - 5 * age;
        return gender === 'male' ? base + 5 : base - 161;
    }

    function harrisBenedict(gender, weightKg, heightCm, age) {
        if (gender === 'male') {
            return 13.397 * weightKg + 4.799 * heightCm - 5.677 * age + 88.362;
        }
        return 9.247 * weightKg + 3.098 * heightCm - 4.330 * age + 447.593;
    }

    /**
     * 综合计算。
     * @param {string} gender 'male' | 'female'
     * @param {number} age    年龄（岁）
     * @param {number} height 身高（cm）
     * @param {number} weight 体重（kg）
     * @param {string} activity ACTIVITY_LEVELS 的键
     */
    function calculate(gender, age, height, weight, activity) {
        var bmrMifflin = mifflinStJeor(gender, weight, height, age);
        var bmrHarris = harrisBenedict(gender, weight, height, age);
        var multiplier = ACTIVITY_LEVELS[activity] || 1.2;
        var tdee = bmrMifflin * multiplier;

        return {
            bmrMifflin: Math.round(bmrMifflin),
            bmrHarris: Math.round(bmrHarris),
            tdee: Math.round(tdee),
            loseLow: Math.round(tdee - 500),
            loseHigh: Math.round(tdee - 250),
            gainLow: Math.round(tdee + 250),
            gainHigh: Math.round(tdee + 500),
            multiplier: multiplier
        };
    }

    /* ---------- UI 绑定 ---------- */
    function init() {
        var calcBtn = document.getElementById('calcBtn');
        var resetBtn = document.getElementById('resetBtn');
        if (!calcBtn) return;

        calcBtn.addEventListener('click', doCalculate);
        resetBtn.addEventListener('click', function () {
            document.getElementById('genderMale').checked = true;
            document.getElementById('age').value = 30;
            document.getElementById('height').value = 170;
            document.getElementById('weight').value = 70;
            document.getElementById('activity').value = 'moderate';
            document.getElementById('resultArea').classList.add('hidden');
        });

        // 输入变化时即时刷新（结果已显示时）
        ['age', 'height', 'weight'].forEach(function (id) {
            document.getElementById(id).addEventListener('input', doCalculateIfVisible);
        });
        document.querySelectorAll('input[name="gender"]').forEach(function (el) {
            el.addEventListener('change', doCalculateIfVisible);
        });
        document.getElementById('activity').addEventListener('change', doCalculateIfVisible);
    }

    function doCalculateIfVisible() {
        var area = document.getElementById('resultArea');
        if (area && area.style.display !== 'none') {
            doCalculate();
        }
    }

    function doCalculate() {
        var gender = document.querySelector('input[name="gender"]:checked');
        var age = parseInt(document.getElementById('age').value, 10);
        var height = parseFloat(document.getElementById('height').value);
        var weight = parseFloat(document.getElementById('weight').value);
        var activity = document.getElementById('activity').value;

        if (!gender) {
            alert(getLang() === 'zh' ? '请选择性别。' : 'Please select a gender.');
            return;
        }
        if (isNaN(age) || age < 1 || age > 120) {
            alert(getLang() === 'zh' ? '请输入有效的年龄（1-120 岁）。' : 'Please enter a valid age (1-120).');
            return;
        }
        if (isNaN(height) || height < 50 || height > 250) {
            alert(getLang() === 'zh' ? '请输入有效的身高（50-250 cm）。' : 'Please enter a valid height (50-250 cm).');
            return;
        }
        if (isNaN(weight) || weight < 10 || weight > 300) {
            alert(getLang() === 'zh' ? '请输入有效的体重（10-300 kg）。' : 'Please enter a valid weight (10-300 kg).');
            return;
        }

        var result = calculate(gender.value, age, height, weight, activity);
        var lang = getLang();
        var area = document.getElementById('resultArea');
        area.classList.remove('hidden');

        document.getElementById('bmrMifflin').textContent = result.bmrMifflin;
        document.getElementById('bmrHarris').textContent = result.bmrHarris;
        document.getElementById('tdeeValue').textContent = result.tdee;
        document.getElementById('loseRange').textContent = result.loseLow + ' – ' + result.loseHigh;
        document.getElementById('gainRange').textContent = result.gainLow + ' – ' + result.gainHigh;

        var activityName;
        if (lang === 'en') {
            var names = {
                sedentary: 'Sedentary (little or no exercise) ×1.2',
                light: 'Lightly active (1-3 days/week) ×1.375',
                moderate: 'Moderately active (3-5 days/week) ×1.55',
                active: 'Very active (6-7 days/week) ×1.725',
                veryActive: 'Extremely active (physical job / twice daily) ×1.9'
            };
            activityName = names[activity] || '';
        } else {
            var namesZh = {
                sedentary: '久坐（几乎不运动）×1.2',
                light: '轻度活动（每周运动 1-3 天）×1.375',
                moderate: '中度活动（每周运动 3-5 天）×1.55',
                active: '高度活动（每周运动 6-7 天）×1.725',
                veryActive: '极高强度（体力劳动 / 每天两次训练）×1.9'
            };
            activityName = namesZh[activity] || '';
        }
        document.getElementById('activityName').textContent = activityName;
    }

    /* ---------- 启动 ---------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
