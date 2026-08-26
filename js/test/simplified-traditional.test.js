/* Tests for js/calculators/simplified-traditional.js (Window 2, B1 tool).
 * Runs under `node --test`. Sets global.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/simplified-traditional.js');

test('window API is exposed', () => {
  ['toTraditional', 'toSimplified', 'convertText'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.tradConverter, 'object');
});

test('toTraditional converts common simplified chars', () => {
  assert.strictEqual(toTraditional('语言'), '語言');
  assert.strictEqual(toTraditional('汉字'), '漢字');
  assert.strictEqual(toTraditional('这本书'), '這本書');
  assert.strictEqual(toTraditional('学习'), '學習');
});

test('toSimplified converts common traditional chars back', () => {
  assert.strictEqual(toSimplified('語言'), '语言');
  assert.strictEqual(toSimplified('這本書'), '这本书');
  assert.strictEqual(toSimplified('學習'), '学习');
});

test('convertText honors direction and preserves unknown chars', () => {
  assert.strictEqual(convertText('网络', 's2t'), '網絡');
  assert.strictEqual(convertText('網絡', 't2s'), '网络');
  // 未收录字符原样保留
  assert.strictEqual(convertText('abc', 's2t'), 'abc');
  assert.strictEqual(convertText('', 's2t'), '');
});

test('round-trip common text', () => {
  const s = '简体中文转繁体';
  assert.strictEqual(toSimplified(toTraditional(s)), s);
});
