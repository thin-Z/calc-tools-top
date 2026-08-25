/* ===== URL 参数预填与同步（Calculator.net 模式，T-COMP 2026-08-25）=====
 * 功能：
 *   1. 页面加载时，从 URL query 恢复表单输入值（如 /zh/calculators/mortgage?loanAmount=100&annualRate=3.85）。
 *   2. 输入变化时，将表单值同步回 URL（history.replaceState，不刷新页面）。
 *   3. 预填后若页面存在 doCalculate 全局函数则自动触发一次计算（带参链接直达结果）。
 * 设计约束：
 *   - 外部 JS 文件（CSP 无内联脚本）；事件用 addEventListener（CSP 无内联处理器）。
 *   - 仅作用于含 .calculator-form / .tool-form 表单的页面；表单字段需有 id。
 *   - checkbox/radio 用 ?id=1 / ?id=0（或 true/false）；其余字段用值字符串。
 *   - 风格：const/let（与 site-home.js 一致，通过 check-no-var）。
 */
(function () {
    'use strict';

    const FORM_SELECTOR = '.calculator-form, .tool-form';

    function getForm() {
        return document.querySelector(FORM_SELECTOR);
    }

    function collectFields(form) {
        const fields = [];
        if (!form) return fields;
        const els = form.querySelectorAll('input[id], select[id], textarea[id]');
        for (let i = 0; i < els.length; i++) {
            fields.push(els[i]);
        }
        return fields;
    }

    function readUrlParams() {
        try { return new URLSearchParams(window.location.search); }
        catch (e) { return null; }
    }

    function setFieldValue(field, raw) {
        if (!field || raw === null || raw === undefined) return;
        const type = (field.type || '').toLowerCase();
        if (type === 'checkbox') {
            field.checked = (raw === '1' || raw === 'true' || raw === 'on');
        } else if (type === 'radio') {
            if (field.value === raw) field.checked = true;
        } else {
            field.value = raw;
        }
    }

    function getFieldValue(field) {
        const type = (field.type || '').toLowerCase();
        if (type === 'checkbox') return field.checked ? '1' : '0';
        if (type === 'radio') return field.checked ? field.value : '';
        return (field.value || '').toString();
    }

    /* 预填：URL → 表单 */
    function restoreFromUrl() {
        const params = readUrlParams();
        if (!params) return false;
        const form = getForm();
        const fields = collectFields(form);
        let restored = false;
        for (let i = 0; i < fields.length; i++) {
            const id = fields[i].id;
            if (!id) continue;
            if (params.has(id)) {
                setFieldValue(fields[i], params.get(id));
                restored = true;
            }
        }
        return restored;
    }

    /* 同步：表单 → URL */
    function syncToUrl() {
        const params = readUrlParams();
        if (!params) return;
        const form = getForm();
        const fields = collectFields(form);
        let changed = false;
        for (let i = 0; i < fields.length; i++) {
            const id = fields[i].id;
            if (!id) continue;
            const val = getFieldValue(fields[i]);
            if (val === '' || (val === '0' && fields[i].type === 'checkbox')) {
                if (params.has(id)) { params.delete(id); changed = true; }
            } else {
                if (params.get(id) !== val) { params.set(id, val); changed = true; }
            }
        }
        if (changed) {
            const qs = params.toString();
            const url = window.location.pathname + (qs ? '?' + qs : '');
            try { window.history.replaceState(null, '', url); } catch (e) { /* ignore */ }
        }
    }

    /* 自动计算：预填后触发 doCalculate（若存在） */
    function autoCalculate() {
        if (typeof window.doCalculate === 'function') {
            try { window.doCalculate(); } catch (e) { /* 部分工具无此函数或需用户交互 */ }
        }
    }

    function init() {
        const form = getForm();
        if (!form) return;

        const restored = restoreFromUrl();
        if (restored) {
            // 等待业务脚本就绪后触发计算（defer 脚本顺序执行，本脚本置于最后）
            setTimeout(autoCalculate, 0);
        }

        const fields = collectFields(form);
        for (let i = 0; i < fields.length; i++) {
            const el = fields[i];
            el.addEventListener('input', syncToUrl);
            el.addEventListener('change', syncToUrl);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
