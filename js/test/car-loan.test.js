/* Tests for js/calculators/car-loan.js — car-loan amortization via fake-DOM
 * harness. 注意: carPrice 单位为万元 (源码内 ×10000)。 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

test('车贷: 15万/首付30%/年化4.5%/3年 -> 首付、贷款额、月供、总利息', () => {
  const c = loadCalculator('car-loan').run({
    carPrice: 15, downPayment: 30, carRate: 4.5, carYears: 3,
  });
  const price = 15, downPct = 30, rate = 4.5, years = 3;
  const downAmt = price * downPct / 100 * 10000;
  const loanAmt = price * 10000 - downAmt;
  const mr = rate / 100 / 12;
  const months = years * 12;
  const monthly = loanAmt * mr * Math.pow(1 + mr, months) / (Math.pow(1 + mr, months) - 1);
  const totalInterest = monthly * months - loanAmt;

  assert.strictEqual(c.text('carDownAmount'), downAmt.toFixed(0));   // 45000
  assert.strictEqual(c.text('carLoanAmount'), loanAmt.toFixed(0));   // 105000
  assert.strictEqual(c.text('carMonthly'), monthly.toFixed(2));
  assert.strictEqual(c.text('carTotalInterest'), totalInterest.toFixed(2));
});

test('车贷: 缺失车价 -> 触发 showError', () => {
  const c = loadCalculator('car-loan').run({
    carPrice: '', downPayment: 30, carRate: 4.5, carYears: 3,
  });
  assert.ok(c.error());
});
