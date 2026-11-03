/**
 * 计算器历史记录（localStorage）—— C8 通用模块
 *
 * 设计约束：
 * - CSP 严格：无内联脚本、无内联事件；事件用 addEventListener 委托。
 * - 零依赖、零构建：浏览器全局脚本，<script defer> 直接加载。
 * - 数据仅存浏览器 localStorage，不上传（与各工具页「数据不上传」口径一致）。
 * - 每个工具独立键 `calc-hist:<toolId>`，最多保留 MAX_ENTRIES 条（FIFO）。
 *
 * 页面接入（工具页模板三件套）：
 *   1. 引入：<script src="/js/calc-history.js" defer></script>
 *      （须先于 js/inline/<tool>.js 加载，保证 CalcHistory 全局先就位）
 *   2. 容器：<div class="calc-history hidden" data-calc-history="bmi"></div>
 *      （放在 tool-form 内、结果区之后；无记录时保持隐藏）
 *   3. 保存：计算成功后调用
 *        CalcHistory.save('bmi', { label: 'BMI 22.5 · 170cm / 65kg',
 *                                  inputs: { height: 170, weight: 65 } });
 *      label 用于列表展示（调用方负责 i18n），inputs 用于回填（原样存取）。
 *   4. 回填：注册恢复回调
 *        CalcHistory.setRestorer('bmi', function (inputs) { ... });
 *      未注册 restorer 时列表不显示「重算」按钮，仅展示与删除。
 */
(function () {
    'use strict';

    var MAX_ENTRIES = 10;
    var KEY_PREFIX = 'calc-hist:';

    /* ---------- 存储层（localStorage 容错：隐私模式 / 已禁用时静默降级） ---------- */

    function storageGet(key) {
        try {
            var raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function storageSet(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    /* ---------- 公开 API ---------- */

    /**
     * 保存一条记录。与最近一条完全相同（label + inputs 深比较）则去重不重复入列。
     * @param {string} toolId 工具标识
     * @param {{label: string, inputs: *}} entry 记录内容
     * @returns {Array} 保存后的完整记录列表（失败返回现有列表）
     */
    function save(toolId, entry) {
        if (!toolId || !entry || typeof entry.label !== 'string') return getAll(toolId);
        var list = storageGet(KEY_PREFIX + toolId);
        var ts = Date.now();
        // 时间戳碰撞兜底：同毫秒连续保存时递增，保证 remove(ts) 可唯一定位
        while (list.length && list.some(function (it) { return it.ts === ts; })) ts += 1;
        var record = { ts: ts, label: entry.label, inputs: entry.inputs };
        var last = list[list.length - 1];
        if (last && last.label === record.label &&
            JSON.stringify(last.inputs) === JSON.stringify(record.inputs)) {
            return list;
        }
        list.push(record);
        if (list.length > MAX_ENTRIES) list = list.slice(list.length - MAX_ENTRIES);
        storageSet(KEY_PREFIX + toolId, list);
        render(toolId);
        return list;
    }

    /** 读取某工具全部记录（时间升序，旧→新）。 */
    function getAll(toolId) {
        return storageGet(KEY_PREFIX + toolId);
    }

    /** 删除单条（按时间戳）。返回是否删除成功。 */
    function remove(toolId, ts) {
        var list = storageGet(KEY_PREFIX + toolId);
        var next = list.filter(function (it) { return it.ts !== ts; });
        if (next.length === list.length) return false;
        storageSet(KEY_PREFIX + toolId, next);
        render(toolId);
        return true;
    }

    /** 清空某工具全部记录。 */
    function clear(toolId) {
        try { window.localStorage.removeItem(KEY_PREFIX + toolId); } catch (e) { /* 忽略 */ }
        render(toolId);
    }

    /** 注册回填回调：setRestorer(toolId, fn)。fn 收到保存时的 inputs。 */
    function setRestorer(toolId, fn) {
        restorers[toolId] = typeof fn === 'function' ? fn : null;
        render(toolId);
    }

    /* ---------- 渲染层 ---------- */

    var restorers = {};
    var I18N = {
        zh: { title: '历史记录', empty: '暂无记录', restore: '重算', del: '删除',
              clear: '清空历史', clearConfirm: '确定清空该工具的全部历史记录？',
              ariaTitle: '历史记录列表' },
        en: { title: 'History', empty: 'No records yet', restore: 'Recalculate', del: 'Delete',
              clear: 'Clear history', clearConfirm: 'Clear all history for this tool?',
              ariaTitle: 'History list' }
    };

    function lang() {
        try {
            if (typeof window.getLang === 'function') return window.getLang();
        } catch (e) { /* i18n.js 未就绪时回落 */ }
        return (document.documentElement.getAttribute('lang') || 'zh').slice(0, 2) === 'en' ? 'en' : 'zh';
    }

    function fmtTime(ts) {
        var d = new Date(ts);
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        var now = new Date();
        var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
        return (d.getFullYear() === now.getFullYear())
            ? (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm
            : d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    }

    /** 找到某工具的容器（data-calc-history 属性匹配）。 */
    function container(toolId) {
        return document.querySelector('[data-calc-history="' + toolId + '"]');
    }

    /**
     * 渲染某工具的历史卡。无记录时容器隐藏；有记录时渲染列表。
     * 幂等：可重复调用（每次全量重建子节点）。
     */
    function render(toolId) {
        var box = container(toolId);
        if (!box) return;
        var list = getAll(toolId);
        var t = I18N[lang()] || I18N.zh;
        box.textContent = '';
        if (!list.length) {
            box.classList.add('hidden');
            return;
        }
        box.classList.remove('hidden');

        var head = document.createElement('div');
        head.className = 'calc-history-head';
        var title = document.createElement('h3');
        title.textContent = t.title;
        title.setAttribute('aria-label', t.ariaTitle);
        head.appendChild(title);
        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'calc-history-clear';
        clearBtn.textContent = t.clear;
        clearBtn.setAttribute('data-ch-action', 'clear');
        clearBtn.setAttribute('data-ch-tool', toolId);
        head.appendChild(clearBtn);
        box.appendChild(head);

        var ul = document.createElement('ul');
        ul.className = 'calc-history-list';
        // 新记录在上（时间降序展示）
        for (var i = list.length - 1; i >= 0; i--) {
            ul.appendChild(buildItem(toolId, list[i], t));
        }
        box.appendChild(ul);
    }

    function buildItem(toolId, record, t) {
        var li = document.createElement('li');
        li.className = 'calc-history-item';

        var label = document.createElement('span');
        label.className = 'calc-history-label';
        label.textContent = record.label;
        label.title = record.label;
        li.appendChild(label);

        var time = document.createElement('time');
        time.className = 'calc-history-time';
        time.dateTime = new Date(record.ts).toISOString();
        time.textContent = fmtTime(record.ts);
        li.appendChild(time);

        if (typeof restorers[toolId] === 'function') {
            var restoreBtn = document.createElement('button');
            restoreBtn.type = 'button';
            restoreBtn.className = 'calc-history-restore';
            restoreBtn.textContent = t.restore;
            restoreBtn.setAttribute('aria-label', t.restore + ': ' + record.label);
            restoreBtn.setAttribute('data-ch-action', 'restore');
            restoreBtn.setAttribute('data-ch-tool', toolId);
            restoreBtn.setAttribute('data-ch-ts', String(record.ts));
            li.appendChild(restoreBtn);
        }

        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'calc-history-del';
        delBtn.textContent = t.del;
        delBtn.setAttribute('aria-label', t.del + ': ' + record.label);
        delBtn.setAttribute('data-ch-action', 'remove');
        delBtn.setAttribute('data-ch-tool', toolId);
        delBtn.setAttribute('data-ch-ts', String(record.ts));
        li.appendChild(delBtn);
        return li;
    }

    /* ---------- 事件委托（一次绑定，覆盖全部容器） ---------- */

    document.addEventListener('click', function (e) {
        var el = e.target && e.target.closest ? e.target.closest('[data-ch-action]') : null;
        if (!el) return;
        var toolId = el.getAttribute('data-ch-tool');
        var action = el.getAttribute('data-ch-action');
        var ts = Number(el.getAttribute('data-ch-ts'));
        if (!toolId || !action) return;
        if (action === 'restore') {
            var record = getAll(toolId).filter(function (it) { return it.ts === ts; })[0];
            if (record && typeof restorers[toolId] === 'function') {
                restorers[toolId](record.inputs, record);
            }
        } else if (action === 'remove') {
            remove(toolId, ts);
        } else if (action === 'clear') {
            var t = I18N[lang()] || I18N.zh;
            if (window.confirm(t.clearConfirm)) clear(toolId);
        }
    });

    /* 页面就绪后按容器 data 属性渲染已有记录（defer 脚本，DOM 已可查询） */
    function init() {
        var boxes = document.querySelectorAll('[data-calc-history]');
        for (var i = 0; i < boxes.length; i++) {
            render(boxes[i].getAttribute('data-calc-history'));
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* ---------- 导出全局 ---------- */
    window.CalcHistory = {
        save: save,
        getAll: getAll,
        remove: remove,
        clear: clear,
        render: render,
        setRestorer: setRestorer,
        MAX_ENTRIES: MAX_ENTRIES
    };
})();
