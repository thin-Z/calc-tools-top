/* fuel-cost 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：耗油量/总油费/每公里成本常规值、油价缺失时归零、
 * 距离或油耗缺失报错、零值与非法字符报错、resetForm 清空。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

test('油费: 500km / 百公里 8L / 7.5 元每升 -> 40L、300 元、0.6 元每公里', () => {
  const c = loadCalculator('fuel-cost').run({
    distance: 500, fuelPer100: 8, pricePerLiter: 7.5,
  });
  // 手算: 500*8/100 = 40 L; 40*7.5 = 300 元; 300/500 = 0.6 元/km
  assert.strictEqual(c.text('fuelUsed'), '40.0');
  assert.strictEqual(c.text('totalCost'), '300.00');
  assert.strictEqual(c.text('costPerKm'), '0.60');
});

test('油费: 100km / 百公里 6.5L / 8.2 元每升 -> 6.5L、53.30 元、0.53 元每公里', () => {
  const c = loadCalculator('fuel-cost').run({
    distance: 100, fuelPer100: 6.5, pricePerLiter: 8.2,
  });
  // 手算: 100*6.5/100 = 6.5 L; 6.5*8.2 = 53.3 元; 53.3/100 = 0.533 -> 0.53
  assert.strictEqual(c.text('fuelUsed'), '6.5');
  assert.strictEqual(c.text('totalCost'), '53.30');
  assert.strictEqual(c.text('costPerKm'), '0.53');
});

test('油费: 油价留空 -> 耗油量照算，费用与每公里成本归零', () => {
  const c = loadCalculator('fuel-cost').run({
    distance: 500, fuelPer100: 8, pricePerLiter: '',
  });
  assert.strictEqual(c.text('fuelUsed'), '40.0');
  assert.strictEqual(c.text('totalCost'), '0.00');
  assert.strictEqual(c.text('costPerKm'), '0.00');
});

test('油费: 距离或百公里油耗缺失/为零/非法 -> showError', () => {
  const base = { distance: 500, fuelPer100: 8, pricePerLiter: 7.5 };
  const mk = () => loadCalculator('fuel-cost');
  assert.ok(mk().run(Object.assign({}, base, { distance: '' })).error(), '距离为空应报错');
  assert.ok(mk().run(Object.assign({}, base, { distance: 0 })).error(), '距离为 0 应报错');
  assert.ok(mk().run(Object.assign({}, base, { fuelPer100: '' })).error(), '油耗为空应报错');
  assert.ok(mk().run(Object.assign({}, base, { fuelPer100: 0 })).error(), '油耗为 0 应报错');
  assert.ok(mk().run(Object.assign({}, base, { distance: 'abc' })).error(), '距离非法字符应报错');
});

test('油费: resetForm 清空三个输入', () => {
  const c = loadCalculator('fuel-cost').run({ distance: 500, fuelPer100: 8, pricePerLiter: 7.5 });
  c.reset();
  assert.strictEqual(c.get('distance').value, '');
  assert.strictEqual(c.get('fuelPer100').value, '');
  assert.strictEqual(c.get('pricePerLiter').value, '');
});
