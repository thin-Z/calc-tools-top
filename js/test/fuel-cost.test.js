/* fuel-cost 单测（fake-DOM harness，零结构改动）
 * 覆盖分支：耗油量/总油费/每公里成本常规值、油价缺失时归零、
 * 距离或油耗缺失报错、零值与非法字符报错、负数报错（10-01 修 S19 ①）、
 * 可选字段 pricePerLiter 的 0 值与负数语义（10-05 修 S21 ②）、resetForm 清空。
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

test('油费: 负数距离或百公里油耗为非法输入 -> showError（10-01 修 S19 ①）', () => {
  const base = { distance: 500, fuelPer100: 8, pricePerLiter: 7.5 };
  const mk = () => loadCalculator('fuel-cost');
  // 修复前 `!distance` 放过负数 → 算出 -40L / -300 元 的负账
  const negDist = mk().run(Object.assign({}, base, { distance: -500 }));
  assert.ok(negDist.error(), '负距离应报错');
  assert.strictEqual(negDist.error(), '请输入大于 0 的行驶距离和油耗');
  assert.ok(mk().run(Object.assign({}, base, { fuelPer100: -8 })).error(), '负油耗应报错');
  // 正数边界不受影响
  const tiny = mk().run(Object.assign({}, base, { distance: 1, fuelPer100: 1 }));
  assert.strictEqual(tiny.error(), null);
});

test('油费: resetForm 清空三个输入', () => {
  const c = loadCalculator('fuel-cost').run({ distance: 500, fuelPer100: 8, pricePerLiter: 7.5 });
  c.reset();
  assert.strictEqual(c.get('distance').value, '');
  assert.strictEqual(c.get('fuelPer100').value, '');
  assert.strictEqual(c.get('pricePerLiter').value, '');
});

test('油费: 油价填 0 输出 0 元；填负数必须报错（10-05 修 S21 ②）', () => {
  const base = { distance: 500, fuelPer100: 8 };
  const mk = () => loadCalculator('fuel-cost');
  // 修复前 `pricePerLiter ? … : 0` 短路：负油价 -7.5 是 truthy -> 直接算出 -300 元 / -0.60 元每公里
  // 的负账，用户无从察觉。油价填 0 与留空结果等价（0 元成本），属合法输入，不得拦。
  const free = mk().run(Object.assign({}, base, { pricePerLiter: 0 }));
  assert.strictEqual(free.error(), null, '油价填 0 是合法输入（不算钱）');
  assert.strictEqual(free.text('fuelUsed'), '40.0');
  assert.strictEqual(free.text('totalCost'), '0.00');
  assert.strictEqual(free.text('costPerKm'), '0.00');
  const neg = mk().run(Object.assign({}, base, { pricePerLiter: -7.5 }));
  assert.ok(neg.error(), '负油价应报错');
  assert.ok(!neg.text('totalCost'), '报错时不得写出结果');
});
