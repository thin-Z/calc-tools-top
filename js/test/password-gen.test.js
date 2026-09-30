/* Tests for js/calculators/password-gen.js — pure helpers escapeHtml() and
 * getStrength() (zero source change). doCalculate is DOM-heavy and intentionally
 * out of scope for this batch. */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

const { escapeHtml, getStrength } = loadCalculator('password-gen').sandbox;

const FULL_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';

test('escapeHtml: 转义 & < > " 与单引号', () => {
  assert.strictEqual(escapeHtml('a<b>&"\'`x'), 'a&lt;b&gt;&amp;&quot;&#39;`x');
  assert.strictEqual(escapeHtml('plain'), 'plain');
});

test('getStrength: 弱 / 中 / 强 三档', () => {
  assert.strictEqual(getStrength(6, 'abcdef').level, 'weak');                 // 6*log2(6)≈15.5 <40
  assert.strictEqual(getStrength(8, FULL_POOL.slice(0, 62)).level, 'medium'); // 8*log2(62)≈47.6 40~60
  assert.strictEqual(getStrength(12, FULL_POOL).level, 'strong');             // 12*log2(85)≈76.9 ≥60
});

test('getStrength: 标签文案与等级一致', () => {
  assert.strictEqual(getStrength(12, FULL_POOL).label, '强 / Strong');
  assert.strictEqual(getStrength(6, 'abcdef').label, '弱 / Weak');
});
