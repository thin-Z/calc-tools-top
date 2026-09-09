/* DOM-driven tests for js/text-tools/json-formatter.js (迭代六 T-9).
 * 用完整 DOM mock 覆盖 doFormat / switchJSONMode / copyJSONResult / clearJSON，
 * 把 json-formatter.js 行覆盖率从 45.64% 推到 ≥70%。 */
const test = require('node:test');
const assert = require('node:assert');

// ---- 轻量 DOM mock：同一 id 返回同一持久 stub ----
function makeEl(init) {
    const el = Object.assign({
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        classList: {
            _s: new Set(),
            add(c) { this._s.add(c); },
            remove(c) { this._s.delete(c); },
            toggle(c, on) { if (on) this._s.add(c); else this._s.delete(c); },
            contains(c) { return this._s.has(c); }
        },
        addEventListener() {}
    }, init || {});
    return el;
}

function makeDocumentMock() {
    const registry = {};
    const ids = ['jsonInput', 'resultArea', 'resultSection', 'errorSection', 'statsSection',
        'errorLine', 'errorCol', 'errorMsg', 'errorContext', 'originalSize', 'formattedSize',
        'copyJSONBtn'];
    ids.forEach(id => { registry[id] = makeEl(); });
    const modeBtns = [makeEl(), makeEl()];
    return {
        readyState: 'complete',
        addEventListener: () => {},
        getElementById: (id) => registry[id] || null,
        querySelectorAll: (sel) => sel === '.mode-btn' ? modeBtns : [],
        querySelector: () => null,
        createElement: () => makeEl({ select() {}, setSelectionRange() {} }),
        execCommand: () => true,
        body: { appendChild() {}, removeChild() {} }
    };
}

// 在 require 前装好 mock
const docMock = makeDocumentMock();
globalThis.window = globalThis;
globalThis.document = docMock;
globalThis.navigator = globalThis.navigator || {};
globalThis.showErrorCalls = [];
globalThis.showError = (msg) => { globalThis.showErrorCalls.push(msg); };
// node 22 的 navigator.clipboard 可能只读；让 writeText 抛/未定义以走 fallback 分支
if (globalThis.navigator && !globalThis.navigator.clipboard) {
    // 保持未定义，copyJSONResult 走 textarea fallback
}

require('../text-tools/json-formatter.js');
const jf = globalThis.jsonFormatter;

test('jsonFormatter 命名空间暴露 DOM 函数', () => {
    assert.strictEqual(typeof jf.doFormat, 'function');
    assert.strictEqual(typeof jf.switchJSONMode, 'function');
    assert.strictEqual(typeof jf.copyJSONResult, 'function');
    assert.strictEqual(typeof jf.clearJSON, 'function');
});

test('doFormat: 有效 JSON → resultArea 展示 + stats 显示', () => {
    docMock.getElementById('jsonInput').value = '{"a":1,"b":[1,2]}';
    jf.doFormat();
    const resultArea = docMock.getElementById('resultArea');
    const resultSection = docMock.getElementById('resultSection');
    const statsSection = docMock.getElementById('statsSection');
    assert.ok(resultArea.textContent.includes('"a": 1'));
    assert.strictEqual(resultSection.classList.contains('hidden'), false);
    assert.strictEqual(statsSection.style.display, 'flex');
    assert.strictEqual(docMock.getElementById('originalSize').textContent, 17);
    assert.strictEqual(docMock.getElementById('formattedSize').textContent, 39);
});

test('doFormat: 空输入 → 清空且不报错', () => {
    docMock.getElementById('jsonInput').value = '   ';
    jf.doFormat();
    assert.strictEqual(docMock.getElementById('resultArea').textContent, '');
    assert.strictEqual(docMock.getElementById('resultSection').classList.contains('hidden'), true);
});

test('doFormat: 非法 JSON → errorSection 显示 + 错误文本', () => {
    docMock.getElementById('jsonInput').value = '{"a": 1,';
    jf.doFormat();
    const errorSection = docMock.getElementById('errorSection');
    assert.strictEqual(errorSection.style.display, 'block');
    assert.ok(docMock.getElementById('errorMsg').textContent.length > 0);
    assert.strictEqual(typeof docMock.getElementById('errorLine').textContent, 'number');
});

test('switchJSONMode: 更新 currentJSONMode 并触发 doFormat 不抛错', () => {
    docMock.getElementById('jsonInput').value = '{"x":true}';
    assert.doesNotThrow(() => jf.switchJSONMode('minify'));
    // doFormat 已用 minify 重新渲染
    assert.ok(docMock.getElementById('resultArea').textContent.includes('"x":true'));
});

test('copyJSONResult: 有内容 → 走 clipboard/textarea fallback 不抛错', () => {
    docMock.getElementById('resultArea').textContent = '{"copied":1}';
    const btn = docMock.getElementById('copyJSONBtn');
    assert.doesNotThrow(() => jf.copyJSONResult());
    // fallback 分支会创建 textarea 并 execCommand（node 环境 execCommand 未定义 → try/catch 静默）
});

test('copyJSONResult: 空内容 → 调 showError 并返回', () => {
    docMock.getElementById('resultArea').textContent = '';
    globalThis.showErrorCalls = [];
    jf.copyJSONResult();
    assert.strictEqual(globalThis.showErrorCalls.length, 1);
    assert.ok(globalThis.showErrorCalls[0].includes('格式化'));
});

test('clearJSON: 清空输入与结果区', () => {
    docMock.getElementById('jsonInput').value = '{"keep":1}';
    docMock.getElementById('resultArea').textContent = '{"keep":1}';
    jf.clearJSON();
    assert.strictEqual(docMock.getElementById('jsonInput').value, '');
    assert.strictEqual(docMock.getElementById('resultArea').textContent, '');
    assert.strictEqual(docMock.getElementById('resultSection').classList.contains('hidden'), true);
});
