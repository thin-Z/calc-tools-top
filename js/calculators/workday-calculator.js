/* ===== Workday Calculator (工作日计算器) =====
 * 纯前端实现，无第三方依赖。
 * 功能：计算两个日期之间的工作日天数（默认排除周六日，可选排除法定节假日）。
 * 语义：统计区间包含开始日期与结束日期（inclusive）。
 */
(function () {
    'use strict';

    /* ---------- 2026 年法定节假日（国务院办公厅公布，仅供参考，可在页面内编辑） ---------- */
    var PRESET_HOLIDAYS_2026 = [
        '2026-01-01', // 元旦
        '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', // 春节
        '2026-04-04', '2026-04-05', '2026-04-06', // 清明节
        '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', // 劳动节
        '2026-06-19', '2026-06-20', '2026-06-21', // 端午节
        '2026-09-25', '2026-09-26', '2026-09-27', // 中秋节
        '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07' // 国庆节
    ];

    /* ---------- 日期工具 ---------- */
    function parseDate(str) {
        if (!str) return null;
        var parts = str.split('-');
        if (parts.length !== 3) return null;
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        return new Date(y, m - 1, d);
    }

    function fmtDate(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }

    function todayStr() {
        return fmtDate(new Date());
    }

    function addDays(date, days) {
        var d = new Date(date.getTime());
        d.setDate(d.getDate() + days);
        return d;
    }

    function isWeekend(date) {
        var day = date.getDay();
        return day === 0 || day === 6;
    }

    /* ---------- 核心计算 ---------- */
    /**
     * 计算两个日期之间的工作日天数。
     * @param {string} startStr 开始日期 YYYY-MM-DD
     * @param {string} endStr   结束日期 YYYY-MM-DD
     * @param {Array<string>} holidays 额外排除的节假日（YYYY-MM-DD，已去重）
     * @param {boolean} excludeWeekends 是否排除周六日
     * @returns {{workdays:number,totalDays:number,weekendDays:number,excludedHolidays:Array<string>,excludedHolidayWorkdays:number}}
     */
    function countWorkdays(startStr, endStr, holidays, excludeWeekends) {
        var start = parseDate(startStr);
        var end = parseDate(endStr);
        if (!start || !end || end < start) {
            return null;
        }

        var holidaySet = {};
        var i;
        for (i = 0; i < holidays.length; i++) {
            var h = holidays[i].trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(h)) {
                holidaySet[h] = true;
            }
        }

        // 总日历天数（含首尾）
        var totalDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

        var workdays = 0;
        var weekendDays = 0;
        var excludedHolidays = [];

        var cur = new Date(start.getTime());
        for (i = 0; i < totalDays; i++) {
            var isHoliday = holidaySet[fmtDate(cur)] === true;
            if (excludeWeekends && isWeekend(cur)) {
                weekendDays++;
            } else if (isHoliday) {
                // 仅当该日不是周末时才额外减少一个工作日
                if (!isWeekend(cur)) {
                    excludedHolidays.push(fmtDate(cur));
                }
            } else {
                workdays++;
            }
            cur = addDays(cur, 1);
        }

        return {
            workdays: workdays,
            totalDays: totalDays,
            weekendDays: excludeWeekends ? weekendDays : 0,
            excludedHolidayWorkdays: excludedHolidays.length,
            excludedHolidays: excludedHolidays
        };
    }

    /* ---------- UI 绑定 ---------- */
    function init() {
        var startInput = document.getElementById('startDate');
        var endInput = document.getElementById('endDate');
        var calcBtn = document.getElementById('calcBtn');
        var resetBtn = document.getElementById('resetBtn');
        var excludeHolidayCb = document.getElementById('excludeHoliday');
        var holidayTextarea = document.getElementById('holidayList');

        if (!startInput || !endInput || !calcBtn) return;

        // 默认填充：今天 ~ 7 天后
        var today = parseDate(todayStr());
        startInput.value = fmtDate(today);
        endInput.value = fmtDate(addDays(today, 7));

        // 勾选"排除 2026 年法定节假日"时，将预设日期填入文本框（可编辑）
        excludeHolidayCb.addEventListener('change', function () {
            if (excludeHolidayCb.checked) {
                var existing = holidayTextarea.value.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
                var merged = PRESET_HOLIDAYS_2026.slice();
                for (var i = 0; i < existing.length; i++) {
                    if (merged.indexOf(existing[i]) === -1) {
                        merged.push(existing[i]);
                    }
                }
                merged.sort();
                holidayTextarea.value = merged.join('\n');
            }
        });

        calcBtn.addEventListener('click', doCalculate);
        resetBtn.addEventListener('click', function () {
            startInput.value = fmtDate(today);
            endInput.value = fmtDate(addDays(today, 7));
            excludeHolidayCb.checked = false;
            holidayTextarea.value = '';
            document.getElementById('resultArea').style.display = 'none';
        });

        // 输入变化时即时刷新结果（若结果已显示）
        startInput.addEventListener('change', doCalculateIfVisible);
        endInput.addEventListener('change', doCalculateIfVisible);
        holidayTextarea.addEventListener('input', doCalculateIfVisible);
        excludeHolidayCb.addEventListener('change', doCalculateIfVisible);
    }

    function doCalculateIfVisible() {
        var area = document.getElementById('resultArea');
        if (area && area.style.display !== 'none') {
            doCalculate();
        }
    }

    function doCalculate() {
        var startStr = document.getElementById('startDate').value;
        var endStr = document.getElementById('endDate').value;
        var excludeWeekends = document.getElementById('excludeWeekends').checked;
        var excludeHolidayCb = document.getElementById('excludeHoliday');
        var holidayTextarea = document.getElementById('holidayList');

        var holidays = [];
        if (excludeHolidayCb.checked) {
            holidays = holidayTextarea.value.split(/\r?\n/);
        }

        if (!startStr || !endStr) {
            alert(getLang() === 'zh' ? '请选择开始日期和结束日期。' : 'Please select both start and end dates.');
            return;
        }

        var result = countWorkdays(startStr, endStr, holidays, excludeWeekends);
        if (!result) {
            alert(getLang() === 'zh' ? '结束日期不能早于开始日期。' : 'The end date cannot be earlier than the start date.');
            return;
        }

        var lang = getLang();
        var area = document.getElementById('resultArea');
        area.style.display = 'block';

        document.getElementById('workdayCount').textContent = result.workdays;
        document.getElementById('totalDays').textContent = result.totalDays;
        document.getElementById('weekendDays').textContent = result.weekendDays;
        document.getElementById('holidayCount').textContent = result.excludedHolidayWorkdays;

        var detailEl = document.getElementById('holidayDetail');
        if (result.excludedHolidays.length > 0) {
            detailEl.style.display = 'block';
            document.getElementById('holidayDetailList').textContent = result.excludedHolidays.join('、');
        } else {
            detailEl.style.display = 'none';
        }

        // 说明文案
        var noteEl = document.getElementById('resultNote');
        var note;
        if (lang === 'en') {
            note = 'Counting is inclusive of both the start and end dates. ';
            note += excludeWeekends ? 'Weekends (Saturday & Sunday) are excluded. ' : 'Weekends are included. ';
            note += result.excludedHolidayWorkdays > 0
                ? result.excludedHolidayWorkdays + ' weekday(s) listed as holidays were also excluded. '
                : 'No weekday holidays were excluded. ';
            note += 'Statutory make-up workdays (调休) are not adjusted automatically.';
        } else {
            note = '统计区间包含开始日期和结束日期。';
            note += excludeWeekends ? '已排除周六日。' : '未排除周末。';
            note += result.excludedHolidayWorkdays > 0
                ? '额外排除了 ' + result.excludedHolidayWorkdays + ' 个工作日节假日。'
                : '未排除工作日节假日。';
            note += '不自动处理调休上班日，请结合实际情况核对。';
        }
        noteEl.textContent = note;
    }

    /* ---------- 启动 ---------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
