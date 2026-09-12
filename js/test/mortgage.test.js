/* Tests for js/calculators/mortgage.js (equal-payment & equal-principal).
 * Runs under `node --test`. Browser-global script loaded via vm sandbox. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../calculators/mortgage.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const { calculateMortgage } = ctx;

test('equal-payment: 返回 method 标记与四个整数字段', () => {
  const r = calculateMortgage(1000000, 4.0, 30, 'equal-payment');
  assert.strictEqual(r.method, 'equal-payment');
  assert.deepStrictEqual(Object.keys(r).sort(),
    ['method', 'monthlyPayment', 'totalInterest', 'totalPayment']);
});

test('equal-payment: 100万/4%/30年 月供 ≈ 4775（等额本息公式手算核对）', () => {
  const r = calculateMortgage(1000000, 4.0, 30, 'equal-payment');
  // 精确值 4774.62…，Math.round 后 4775；区间断言防手算误差
  assert.ok(r.monthlyPayment >= 4770 && r.monthlyPayment <= 4780,
    '实际 ' + r.monthlyPayment);
});

test('equal-payment: 恒等式与利息为正', () => {
  const r = calculateMortgage(1000000, 4.0, 30, 'equal-payment');
  assert.ok(Math.abs(r.totalPayment - r.monthlyPayment * 360) <= 360);
  assert.strictEqual(r.totalPayment - 1000000, r.totalInterest);
});

test('equal-principal: 首末月供可手算精算（100万/4%/30年）', () => {
  const r = calculateMortgage(1000000, 4.0, 30, 'equal-principal');
  // 首月 = 1000000/360 + 1000000×0.04/12 = 2777.78 + 3333.33 = 6111.11 → 6111
  assert.strictEqual(r.firstPayment, 6111);
  // 末月 = 2777.78 × (1 + 0.04/12) = 2787.03 → 2787
  assert.strictEqual(r.lastPayment, 2787);
  assert.strictEqual(r.method, 'equal-principal');
});

test('equal-principal: 总利息 = 本金 × 月利率 × (期数+1) / 2', () => {
  const r = calculateMortgage(1000000, 4.0, 30, 'equal-principal');
  const expected = Math.round(1000000 * (0.04 / 12) * (360 + 1) / 2); // 601,667
  assert.strictEqual(r.totalInterest, expected);
  assert.strictEqual(r.totalPayment, 1000000 + r.totalInterest);
});

test('零利率边界：两种方式都不返回 NaN（无息均摊）', () => {
  const ei = calculateMortgage(120000, 0, 2, 'equal-payment');
  assert.strictEqual(ei.monthlyPayment, 5000);
  assert.strictEqual(ei.totalInterest, 0);
  assert.strictEqual(ei.totalPayment, 120000);
  const ep = calculateMortgage(120000, 0, 2, 'equal-principal');
  assert.strictEqual(ep.firstPayment, 5000);
  assert.strictEqual(ep.totalInterest, 0);
  assert.strictEqual(ep.totalPayment, 120000);
});

test('同参数下等额本金总利息 < 等额本息总利息', () => {
  const ep = calculateMortgage(1000000, 4.0, 30, 'equal-principal');
  const ei = calculateMortgage(1000000, 4.0, 30, 'equal-payment');
  assert.ok(ep.totalInterest < ei.totalInterest,
    `等额本金 ${ep.totalInterest} 应小于等额本息 ${ei.totalInterest}`);
});
