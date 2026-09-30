/* Tests for js/calculators/discount.js — discount math via fake-DOM harness. */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

test('折扣: 100元打20% -> 折后80元、省20元、显示20%', () => {
  const c = loadCalculator('discount').run({ originalPrice: 100, discountRate: 20 });
  assert.strictEqual(c.text('finalPrice'), '80.00');
  assert.strictEqual(c.text('savedAmount'), '20.00');
  assert.strictEqual(c.text('discountPercent'), '20%');
});

test('折扣: 不同档位 200元打75% -> 150元省50元', () => {
  const c = loadCalculator('discount').run({ originalPrice: 200, discountRate: 75 });
  assert.strictEqual(c.text('finalPrice'), '50.00');
  assert.strictEqual(c.text('savedAmount'), '150.00');
});

test('折扣: 缺失价格 -> 触发 showError', () => {
  const c = loadCalculator('discount').run({ originalPrice: '', discountRate: 20 });
  assert.ok(c.error());
});
