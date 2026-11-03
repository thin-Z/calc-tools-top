/* Tests for js/calc-history.js (C8 计算器历史记录 localStorage 模块).
 * Runs under `node --test`. The module is a browser global IIFE — loaded into
 * a vm sandbox with a fake localStorage + minimal fake DOM so render() can be
 * exercised too. Zero changes to the source file. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../calc-history.js'), 'utf8');

/* ---------- 极简 fake DOM（只覆盖模块用到的面） ---------- */

function makeFakeDom() {
    const elements = [];
    function makeEl(tag) {
        const el = {
            tagName: tag,
            children: [],
            attributes: {},
            className: '',
            _text: '',

            title: '',
            dateTime: '',
            type: '',
            parent: null,
            appendChild(child) { child.parent = el; el.children.push(child); return child; },
            setAttribute(name, value) { el.attributes[name] = String(value); },
            getAttribute(name) { return el.attributes[name] !== undefined ? el.attributes[name] : null; },
            closest(sel) {
                let node = el;
                while (node) {
                    if (node.matchesSelector && node.matchesSelector(sel)) return node;
                    node = node.parent;
                }
                return null;
            },
            matchesSelector(sel) {
                if (!el.attributes) return false;
                const id = sel.match(/^\[data-([a-z-]+)="(.+)"\]$/i);
                if (id) return el.attributes['data-' + id[1]] === id[2];
                const bare = sel.match(/^\[([a-z-]+)\]$/i);
                if (bare) return el.attributes[bare[1]] !== undefined;
                if (sel[0] === '.') return el.className.split(/\s+/).includes(sel.slice(1));
                return el.tagName === sel.toUpperCase();
            },
            classList: {
                _set: new Set(),
                add(c) { el.classList._set.add(c); },
                remove(c) { el.classList._set.delete(c); },
                contains(c) { return el.classList._set.has(c); }
            }
        };
        Object.defineProperty(el, 'textContent', {
            get() { return el._text; },
            set(v) { el._text = v; el.children.length = 0; }
        });
        elements.push(el);
        return el;
    }
    const doc = {
        readyState: 'complete',
        documentElement: makeEl('html'),
        listeners: {},
        addEventListener(type, fn) {
            (doc.listeners[type] = doc.listeners[type] || []).push(fn);
        },
        createElement(tag) { return makeEl(tag); },
        querySelector(sel) {
            const m = sel.match(/^\[data-calc-history="(.+)"\]$/);
            if (!m) return null;
            return doc._containers[m[1]] || null;
        },
        querySelectorAll(sel) {
            if (sel !== '[data-calc-history]') return [];
            return Object.values(doc._containers);
        },
        _containers: {},
        _els: elements,
        _makeEl: makeEl
    };
    return doc;
}

function makeSandbox(storeBacking) {
    const doc = makeFakeDom();
    const sandbox = {
        console,
        document: doc,
        window: {
            confirm: () => true,
            localStorage: {
                _store: storeBacking,
                getItem(k) { return k in this._store ? this._store[k] : null; },
                setItem(k, v) { this._store[k] = String(v); },
                removeItem(k) { delete this._store[k]; }
            }
        }
    };
    sandbox.window.getLang = () => 'zh';
    sandbox.window.document = doc;
    sandbox.document.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    return { sandbox, doc, CalcHistory: sandbox.window.CalcHistory };
}

/* ---------- 存储层 ---------- */

test('save/getAll: 追加记录，FIFO 上限 10 条', () => {
    const store = {};
    const { CalcHistory } = makeSandbox(store);
    for (let i = 1; i <= 12; i++) {
        CalcHistory.save('bmi', { label: 'BMI ' + i, inputs: { h: i } });
    }
    const all = CalcHistory.getAll('bmi');
    assert.strictEqual(all.length, CalcHistory.MAX_ENTRIES);
    assert.strictEqual(all[0].label, 'BMI 3');      // 最旧 2 条被挤出
    assert.strictEqual(all[all.length - 1].label, 'BMI 12'); // 最新在尾部
});

test('save: 相邻重复（label+inputs 相同）去重，不重复入列', () => {
    const store = {};
    const { CalcHistory } = makeSandbox(store);
    CalcHistory.save('bmi', { label: 'BMI 22.5 · 170cm / 65kg', inputs: { height: 170, weight: 65 } });
    CalcHistory.save('bmi', { label: 'BMI 22.5 · 170cm / 65kg', inputs: { height: 170, weight: 65 } });
    assert.strictEqual(CalcHistory.getAll('bmi').length, 1);
    // 内容不同 → 正常入列
    CalcHistory.save('bmi', { label: 'BMI 25.0 · 170cm / 72kg', inputs: { height: 170, weight: 72 } });
    assert.strictEqual(CalcHistory.getAll('bmi').length, 2);
});

test('save: 时间戳碰撞兜底（同毫秒连续保存不互相覆盖）', () => {
    const store = {};
    const { CalcHistory } = makeSandbox(store);
    const t0 = Date.now();
    // 直接注入两条同 ts 的记录，再 save 一条 → 新 ts 不与现有冲突
    store['calc-hist:bmi'] = JSON.stringify([
        { ts: t0, label: 'A', inputs: {} },
        { ts: t0, label: 'B', inputs: {} } // 现实不该出现，但模拟碰撞
    ]);
    const list = Array.from(CalcHistory.save('bmi', { label: 'C', inputs: {} }));
    const existingTs = [t0, t0]; // 注入的历史重复不归模块管
    const newTs = list[list.length - 1].ts;
    assert.strictEqual(list.length, 3);
    assert.ok(!existingTs.includes(newTs), '新增记录 ts 不得与现有冲突');
    assert.strictEqual(new Set(list.map(it => it.ts)).size >= 2, true);
});

test('remove: 按时间戳删除指定条目；未知 ts 返回 false', () => {
    const store = {};
    const { CalcHistory } = makeSandbox(store);
    CalcHistory.save('bmi', { label: 'A', inputs: {} });
    CalcHistory.save('bmi', { label: 'B', inputs: {} });
    const all = CalcHistory.getAll('bmi');
    const target = all[0].ts;
    assert.strictEqual(CalcHistory.remove('bmi', target), true);
    assert.deepStrictEqual(Array.from(CalcHistory.getAll('bmi'), it => it.label), ['B']);
    assert.strictEqual(CalcHistory.remove('bmi', 9999999999999), false);
});

test('clear: 清空该工具且不影响其他工具', () => {
    const store = {};
    const { CalcHistory } = makeSandbox(store);
    CalcHistory.save('bmi', { label: 'A', inputs: {} });
    CalcHistory.save('date', { label: 'B', inputs: {} });
    CalcHistory.clear('bmi');
    assert.deepStrictEqual(Array.from(CalcHistory.getAll('bmi')), []);
    assert.strictEqual(CalcHistory.getAll('date').length, 1);
});

test('localStorage 抛异常时静默降级不崩溃', () => {
    const doc = makeFakeDom();
    const brokenStorage = {
        getItem() { throw new Error('blocked'); },
        setItem() { throw new Error('blocked'); },
        removeItem() { throw new Error('blocked'); }
    };
    const sandbox = {
        console, document: doc,
        window: { confirm: () => true, localStorage: brokenStorage, getLang: () => 'zh' }
    };
    sandbox.window.document = doc;
    sandbox.document.window = sandbox.window;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox);
    const CH = sandbox.window.CalcHistory;
    assert.deepStrictEqual(Array.from(CH.getAll('bmi')), []);
    const list = CH.save('bmi', { label: 'X', inputs: {} }); // set 失败 → 返回内存列表，不抛
    assert.strictEqual(list.length, 1);
});

test('save: 缺参 / label 非字符串直接返回现有列表（不写脏数据）', () => {
    const store = {};
    const { CalcHistory } = makeSandbox(store);
    CalcHistory.save('bmi', { label: 'A', inputs: {} });
    assert.strictEqual(CalcHistory.save(null, { label: 'B' }).length, 0); // 无效 toolId → 空列表
    assert.strictEqual(CalcHistory.save('bmi', null).length, 1);
    assert.strictEqual(CalcHistory.save('bmi', { inputs: {} }).length, 1);
    assert.deepStrictEqual(Array.from(CalcHistory.getAll('bmi'), it => it.label), ['A'], '脏数据未写入');
});

/* ---------- 渲染层 ---------- */

test('render: 无记录时容器隐藏；有记录时显示且新记录在上', () => {
    const store = {};
    const { CalcHistory, doc } = makeSandbox(store);
    const box = doc._makeEl('div');
    box.setAttribute('data-calc-history', 'bmi');
    box.classList.add('hidden');
    doc._containers['bmi'] = box;

    CalcHistory.save('bmi', { label: 'A', inputs: {} });
    CalcHistory.save('bmi', { label: 'B', inputs: {} });
    assert.strictEqual(box.classList.contains('hidden'), false);
    const labels = box.querySelectorAll ? null : null;
    // 从 fake DOM 树抓取所有 item label（按文档顺序）
    const items = [];
    (function walk(node) {
        (node.children || []).forEach(child => {
            if (child.attributes && child.attributes['data-ch-action'] === undefined &&
                child.className === 'calc-history-label') items.push(child.textContent);
            walk(child);
        });
    })(box);
    assert.deepStrictEqual(items, ['B', 'A'], '新记录在上（时间降序）');
});

test('render: 未注册 restorer 时不出现「重算」按钮；注册后出现且点击回填', () => {
    const store = {};
    const { CalcHistory, doc } = makeSandbox(store);
    const box = doc._makeEl('div');
    box.setAttribute('data-calc-history', 'bmi');
    doc._containers['bmi'] = box;

    CalcHistory.save('bmi', { label: 'A', inputs: { height: 170, weight: 65 } });
    let btns = [];
    (function walk(node) {
        (node.children || []).forEach(child => {
            if (child.attributes && child.attributes['data-ch-action'] === 'restore') btns.push(child);
            walk(child);
        });
    })(box);
    assert.strictEqual(btns.length, 0, '未注册 restorer → 无重算按钮');

    let got = null;
    CalcHistory.setRestorer('bmi', inputs => { got = inputs; });
    btns = [];
    (function walk(node) {
        (node.children || []).forEach(child => {
            if (child.attributes && child.attributes['data-ch-action'] === 'restore') btns.push(child);
            walk(child);
        });
    })(box);
    assert.strictEqual(btns.length, 1, '注册后出现 1 个重算按钮');
    assert.strictEqual(btns[0].attributes['data-ch-tool'], 'bmi');

    // 通过 document click 委托触发 restore
    const clickListeners = doc.listeners['click'] || [];
    const fakeEvent = { target: btns[0] };
    clickListeners.forEach(fn => fn(fakeEvent));
    assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), { height: 170, weight: 65 });
});

test('事件委托: remove 动作删除对应条目', () => {
    const store = {};
    const { CalcHistory, doc } = makeSandbox(store);
    const box = doc._makeEl('div');
    box.setAttribute('data-calc-history', 'bmi');
    doc._containers['bmi'] = box;
    CalcHistory.save('bmi', { label: 'A', inputs: {} });
    CalcHistory.save('bmi', { label: 'B', inputs: {} });
    // 找到 A 的删除按钮（列表降序，A 在前）
    let delA = null;
    (function walk(node) {
        (node.children || []).forEach(child => {
            if (child.attributes && child.attributes['data-ch-action'] === 'remove' &&
                child.attributes['data-ch-ts'] === String(CalcHistory.getAll('bmi')[0].ts)) delA = child;
            walk(child);
        });
    })(box);
    assert.ok(delA, '应存在 A 的删除按钮');
    (doc.listeners['click'] || []).forEach(fn => fn({ target: delA }));
    assert.deepStrictEqual(Array.from(CalcHistory.getAll('bmi'), it => it.label), ['B']);
});
