/* Tests for js/text-tools/json-formatter.js formatJSON (P1P2-03, P1P2-13). */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;
// 避免加载文件时 document 引用报错（DOMContentLoaded 监听在 node 环境安全跳过）
globalThis.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: () => null,
  querySelectorAll: () => [],
  querySelector: () => null,
};

require('../text-tools/json-formatter.js');

test('window.formatJSON is exposed', () => {
  assert.strictEqual(typeof window.formatJSON, 'function');
});

test('format mode pretty-prints with 2-space indent', () => {
  const res = formatJSON('{"a":1,"b":[1,2]}', 'format');
  assert.strictEqual(res.success, true);
  assert.ok(res.result.includes('\n  "a": 1'));
  assert.strictEqual(typeof res.size, 'number');
  assert.strictEqual(typeof res.originalSize, 'number');
  assert.strictEqual(res.error, undefined);
});

test('minify mode strips whitespace', () => {
  const res = formatJSON('{\n  "a": 1\n}', 'minify');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.result, '{"a":1}');
});

test('invalid JSON returns error with line/col', () => {
  const res = formatJSON('{\n  "a": 1,\n}', 'format');
  assert.strictEqual(res.success, false);
  assert.strictEqual(typeof res.line, 'number');
  assert.strictEqual(typeof res.col, 'number');
  assert.ok(res.line > 0);
  assert.ok(res.error.length > 0);
});

test('invalid JSON includes context snippet around error position', () => {
  const res = formatJSON('{"a": 1, "b": "unterminated}', 'format');
  assert.strictEqual(res.success, false);
  assert.ok(typeof res.context === 'string', 'context should be a string');
  assert.ok(res.context.length > 0);
  assert.ok(res.context.length <= 161, 'context should be within ±80 chars');
});

test('empty string returns error not crash', () => {
  const res = formatJSON('', 'format');
  assert.strictEqual(res.success, false);
});

test('backwards compatibility: success shape unchanged', () => {
  const res = formatJSON('{"x":true}', 'format');
  assert.deepStrictEqual(
    Object.keys(res).sort(),
    ['originalSize', 'result', 'size', 'success'].sort()
  );
});
