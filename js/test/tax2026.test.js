/* Tests for js/calculators/tax2026.js (2026 monthly individual income tax).
 * Runs under `node --test`. Browser-global script loaded via vm sandbox. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../calculators/tax2026.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const { calculateTax } = ctx;

test('低于免征额：税额 0，afterTax = 工资 − 五险一金', () => {
  const r = calculateTax(4000, 500, 0);
  assert.strictEqual(r.taxableIncome, 0);
  assert.strictEqual(r.taxRate, 0);
  assert.strictEqual(r.taxPayable, 0);
  assert.strictEqual(r.afterTax, 3500);
});

test('3% 档（月应纳税 1500）：手算精确值', () => {
  // taxable = 10000 − 5000 − 2000 − 1500 = 1500；annual 18000 ≤ 36000
  // annualTax = 18000 × 0.03 = 540 → monthly 45
  const r = calculateTax(10000, 2000, 1500);
  assert.strictEqual(r.taxableIncome, 1500);
  assert.strictEqual(r.taxRate, 0.03);
  assert.strictEqual(r.taxPayable, 45);
  assert.strictEqual(r.afterTax, 7955);
});

test('10% 档：速算扣除 2520 生效', () => {
  // taxable = 10500 − 5000 = 5500；annual 66000 ∈ (36000, 144000]
  // annualTax = 66000 × 0.10 − 2520 = 4080 → monthly 340
  const r = calculateTax(10500, 0, 0);
  assert.strictEqual(r.taxRate, 0.10);
  assert.strictEqual(r.taxPayable, 340);
  assert.strictEqual(r.afterTax, 10160);
});

test('45% 档：速算扣除 181920 生效', () => {
  // taxable = 95000 − 5000 = 90000；annual 1,080,000 > 960000
  // annualTax = 1,080,000 × 0.45 − 181,920 = 304,080 → monthly 25,340
  const r = calculateTax(95000, 0, 0);
  assert.strictEqual(r.taxRate, 0.45);
  assert.strictEqual(r.taxPayable, 25340);
  assert.strictEqual(r.afterTax, 69660);
});

test('档位边界：月应纳税所得 3000 恰为 3% 档上限', () => {
  // taxable = 10500 − 5000 − 2500 = 3000 → annual 36000 ≤ 36000 → 3%
  const r = calculateTax(10500, 2500, 0);
  assert.strictEqual(r.taxRate, 0.03);
  assert.strictEqual(r.taxPayable, 90); // 36000×0.03/12
});

test('专项附加扣除提高到手收入', () => {
  const without = calculateTax(20000, 4000, 0);
  const withDed = calculateTax(20000, 4000, 3000);
  assert.ok(withDed.afterTax > without.afterTax, '有专项扣除应到手更多');
  assert.ok(withDed.taxPayable < without.taxPayable);
});

test('恒等式：afterTax = 工资 − 五险一金 − 税', () => {
  const r = calculateTax(30000, 5000, 2000);
  assert.strictEqual(r.afterTax, 30000 - 5000 - r.taxPayable);
});
