/* Tests for js/calculators/compound-interest.js — pure compound-interest math,
 * exercised through the fake-DOM harness (zero source change). */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

test('复利: 10万/年化5%/10年/月复利 -> 终值、利息、收益率', () => {
  const c = loadCalculator('compound-interest').run({
    principal: 100000, annualRate: 5, years: 10, compoundFreq: 12,
  });
  const r = 5 / 100 / 12;
  const n = 10 * 12;
  const expectedFinal = 100000 * Math.pow(1 + r, n);
  const expectedInterest = expectedFinal - 100000;
  assert.strictEqual(c.text('finalAmount'), expectedFinal.toFixed(2));
  assert.strictEqual(c.text('totalInterest'), expectedInterest.toFixed(2));
  assert.strictEqual(c.text('interestRate'), (expectedInterest / 100000 * 100).toFixed(1));
});

test('复利: 缺失本金 -> 触发 showError 且不产出', () => {
  const c = loadCalculator('compound-interest').run({
    principal: '', annualRate: 5, years: 10, compoundFreq: 12,
  });
  assert.ok(c.error(), '应调用 window.showError');
  assert.strictEqual(c.get('finalAmount'), undefined, '缺失输入不应创建/写入结果元素');
});
