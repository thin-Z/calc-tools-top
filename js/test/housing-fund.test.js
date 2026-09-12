/* Tests for js/calculators/housing-fund.js (housing fund loan, equal installment).
 * Runs under `node --test`. Browser-global script loaded via vm sandbox. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../calculators/housing-fund.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const { calculateHousingFund } = ctx;

test('calculateHousingFund: 返回三个整数字段', () => {
  const r = calculateHousingFund(1000000, 3.1, 30);
  assert.deepStrictEqual(Object.keys(r).sort(), ['monthlyPayment', 'totalInterest', 'totalPayment']);
  assert.strictEqual(typeof r.monthlyPayment, 'number');
  assert.strictEqual(Number.isInteger(r.monthlyPayment), true);
});

test('calculateHousingFund: 月供落在合理区间', () => {
  // 100 万 / 3.1% / 30 年：月供必然介于「纯本金均摊」与「本金均摊 × 2」之间
  // （上界含义：总利息不超过本金；实际 30 年 3.1% 约 1.54 倍）
  const r = calculateHousingFund(1000000, 3.1, 30);
  const principalOnly = 1000000 / 360;
  assert.ok(r.monthlyPayment > principalOnly, '月供应高于纯本金均摊');
  assert.ok(r.monthlyPayment < principalOnly * 2, '月供应低于本金均摊的 2 倍（总利息<本金）');
});

test('calculateHousingFund: 恒等式 totalPayment = monthlyPayment × 期数（±期数）', () => {
  const r = calculateHousingFund(1000000, 3.1, 30);
  assert.ok(Math.abs(r.totalPayment - r.monthlyPayment * 360) <= 360,
    'totalPayment 与 月供×360 偏差应不超过取整累积');
});

test('calculateHousingFund: totalInterest = totalPayment − 本金', () => {
  const r = calculateHousingFund(800000, 2.85, 20);
  assert.strictEqual(r.totalPayment - 800000, r.totalInterest);
  assert.ok(r.totalInterest > 0);
});

test('calculateHousingFund: 零利率边界不返回 NaN（无息均摊）', () => {
  const r = calculateHousingFund(120000, 0, 2);
  assert.strictEqual(r.monthlyPayment, 5000); // 120000/24
  assert.strictEqual(r.totalPayment, 120000);
  assert.strictEqual(r.totalInterest, 0);
});

test('calculateHousingFund: 极低利率（0.01）仍为正常数值', () => {
  const r = calculateHousingFund(120000, 0.01, 2);
  assert.ok(Number.isFinite(r.monthlyPayment) && r.monthlyPayment >= 5000,
    '月供应 ≥ 无息均摊值，实际 ' + r.monthlyPayment);
});

test('calculateHousingFund: 与 mortgage 等额本息互为同一公式（交叉验证）', () => {
  const mctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../calculators/mortgage.js'), 'utf8'), mctx);
  const a = calculateHousingFund(500000, 2.85, 20).monthlyPayment;
  const b = mctx.calculateMortgage(500000, 2.85, 20, 'equal-payment').monthlyPayment;
  assert.strictEqual(a, b, '同参数下公积金等额本息月供应与房贷等额本息完全一致');
});
