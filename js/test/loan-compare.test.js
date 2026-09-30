/* Tests for js/calculators/loan-compare.js — two-plan loan comparison via
 * fake-DOM harness. 注意: loanAmount 为贷款本金原值(源码未 ×10000)。 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

const annuity = (amount, rate, years) => {
  const mr = rate / 100 / 12;
  const months = years * 12;
  const monthly = amount * mr * Math.pow(1 + mr, months) / (Math.pow(1 + mr, months) - 1);
  const total = monthly * months;
  return { monthly, total, interest: total - amount };
};

test('贷款对比: 100万/3.85% vs 4.2%/30年 -> 两方案与差额', () => {
  const c = loadCalculator('loan-compare').run({
    loanAmount: 1000000, rate1: 3.85, rate2: 4.2, loanYears: 30,
  });
  const a = annuity(1000000, 3.85, 30);
  const b = annuity(1000000, 4.2, 30);
  assert.strictEqual(c.text('plan1Monthly'), a.monthly.toFixed(2));
  assert.strictEqual(c.text('plan1Total'), a.total.toFixed(2));
  assert.strictEqual(c.text('plan1Interest'), a.interest.toFixed(2));
  assert.strictEqual(c.text('plan2Monthly'), b.monthly.toFixed(2));
  assert.strictEqual(c.text('plan2Total'), b.total.toFixed(2));
  assert.strictEqual(c.text('plan2Interest'), b.interest.toFixed(2));
  assert.strictEqual(c.text('diffMonthly'), Math.abs(a.monthly - b.monthly).toFixed(2));
  assert.strictEqual(c.text('diffInterest'), Math.abs(a.interest - b.interest).toFixed(2));
});

test('贷款对比: 缺失必填 -> 触发 showError', () => {
  const c = loadCalculator('loan-compare').run({
    loanAmount: 1000000, rate1: '', rate2: 4.2, loanYears: 30,
  });
  assert.ok(c.error());
});
