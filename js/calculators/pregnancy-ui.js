/**
 * 孕期计算器 - UI 交互
 * 功能：绑定末次月经日期、月经周期天数与可选受孕日，实时计算并显示预产期、
 *      当前孕周、已怀孕天数与距离预产期的剩余天数。
 *      所有事件均通过 addEventListener 绑定（零内联事件，CSP 合规）。隐藏元素一律使用
 *      classList.toggle('hidden')，禁用 style.display（.hidden 带 !important，会覆盖导致结果区不显示）。
 */
(function () {
    'use strict';

    var lmpInput = null;
    var cycleInput = null;
    var conceptionToggle = null;
    var conceptionRow = null;
    var conceptionInput = null;
    var resultArea = null;
    var dueEl = null;
    var gestWeeksEl = null;
    var gestDaysEl = null;
    var daysPregnantEl = null;
    var daysDueEl = null;

    function refreshConceptionVisibility() {
        if (conceptionRow) {
            conceptionRow.classList.toggle('hidden', !conceptionToggle.checked);
        }
    }

    function render() {
        var rawLmp = lmpInput.value.trim();
        var rawConception = conceptionInput.value.trim();
        var useConception = conceptionToggle.checked && rawConception !== '';

        if (!rawLmp && !useConception) {
            resultArea.classList.add('hidden');
            return;
        }

        var cycle = parseInt(cycleInput.value, 10);
        var lmp;
        if (useConception) {
            lmp = estimateLmp(rawConception, isNaN(cycle) ? 28 : cycle);
        } else {
            lmp = parseDate(rawLmp);
        }
        if (!lmp) {
            resultArea.classList.add('hidden');
            return;
        }

        var today = new Date();
        var due = calcDueDate(lmp);
        if (!due) {
            resultArea.classList.add('hidden');
            return;
        }
        var gw = gestationalWeek(lmp, today);
        var dp = daysPregnant(lmp, today);
        var dd = daysToDue(due, today);

        dueEl.textContent = formatDate(due);
        gestWeeksEl.textContent = String(gw.weeks);
        gestDaysEl.textContent = String(gw.days);
        daysPregnantEl.textContent = String(dp);
        daysDueEl.textContent = String(dd);
        resultArea.classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', function () {
        lmpInput = document.getElementById('lmp-date');
        cycleInput = document.getElementById('cycle-days');
        conceptionToggle = document.getElementById('conception-toggle');
        conceptionRow = document.getElementById('conception-row');
        conceptionInput = document.getElementById('conception-date');
        resultArea = document.getElementById('result-area');
        dueEl = document.getElementById('due-date');
        gestWeeksEl = document.getElementById('gest-weeks');
        gestDaysEl = document.getElementById('gest-days');
        daysPregnantEl = document.getElementById('days-pregnant');
        daysDueEl = document.getElementById('days-due');
        if (!lmpInput || !cycleInput || !resultArea) return;

        lmpInput.addEventListener('input', render);
        lmpInput.addEventListener('change', render);
        cycleInput.addEventListener('input', render);
        cycleInput.addEventListener('change', render);
        conceptionToggle.addEventListener('change', function () {
            refreshConceptionVisibility();
            render();
        });
        if (conceptionInput) {
            conceptionInput.addEventListener('input', render);
            conceptionInput.addEventListener('change', render);
        }

        refreshConceptionVisibility();
        render();
    });
})();
