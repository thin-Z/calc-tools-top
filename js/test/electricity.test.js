/* electricity 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：常规日/月耗电与电费、days/rate 缺省回退（30 天 / 0.6 元）、
 * 功率或时长缺失报错、零值与非法字符报错、负数报错（10-01 修 S19 ①）、resetForm 回填。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

test('电费: 1500W 每天 8 小时 / 30 天 / 0.6 元 -> 日 12 度、月 360 度、216 元', () => {
  const c = loadCalculator('electricity').run({
    power: 1500, hours: 8, days: 30, rate: 0.6,
  });
  // 手算: 1500*8/1000 = 12 kWh/日; 12*30 = 360 kWh/月; 360*0.6 = 216 元
  assert.strictEqual(c.text('dailyKwh'), '12.00');
  assert.strictEqual(c.text('monthlyKwh'), '360.00');
  assert.strictEqual(c.text('monthlyCost'), '216.00');
});

test('电费: 2000W 半小时 / 31 天 / 0.55 元 -> 日 1 度、月 31 度、17.05 元', () => {
  const c = loadCalculator('electricity').run({
    power: 2000, hours: 0.5, days: 31, rate: 0.55,
  });
  // 手算: 2000*0.5/1000 = 1 kWh; 1*31 = 31 kWh; 31*0.55 = 17.05 元
  assert.strictEqual(c.text('dailyKwh'), '1.00');
  assert.strictEqual(c.text('monthlyKwh'), '31.00');
  assert.strictEqual(c.text('monthlyCost'), '17.05');
});

test('电费: days 与 rate 留空 -> 回退 30 天 / 0.6 元每度', () => {
  const c = loadCalculator('electricity').run({
    power: 100, hours: 10, days: '', rate: '',
  });
  // 手算: 1 kWh/日; 1*30 = 30 kWh; 30*0.6 = 18 元
  assert.strictEqual(c.text('dailyKwh'), '1.00');
  assert.strictEqual(c.text('monthlyKwh'), '30.00');
  assert.strictEqual(c.text('monthlyCost'), '18.00');
});

test('电费: 功率或时长缺失/为零/非法 -> showError', () => {
  const base = { power: 1000, hours: 5, days: 30, rate: 0.6 };
  const mk = () => loadCalculator('electricity');
  assert.ok(mk().run(Object.assign({}, base, { power: '' })).error(), '功率为空应报错');
  assert.ok(mk().run(Object.assign({}, base, { power: 0 })).error(), '功率为 0 应报错');
  assert.ok(mk().run(Object.assign({}, base, { hours: '' })).error(), '时长为空应报错');
  assert.ok(mk().run(Object.assign({}, base, { hours: 0 })).error(), '时长为 0 应报错');
  assert.ok(mk().run(Object.assign({}, base, { power: 'abc' })).error(), '功率非法字符应报错');
});

test('电费: 负数功率或时长为非法输入 -> showError（10-01 修 S19 ①）', () => {
  const base = { power: 1000, hours: 5, days: 30, rate: 0.6 };
  const mk = () => loadCalculator('electricity');
  // 修复前 `!power` 只对 0/NaN 生效，负数照算 -1 度/日、-18 元 —— 用户可见的错误账目
  const negPower = mk().run(Object.assign({}, base, { power: -100 }));
  assert.ok(negPower.error(), '负功率应报错');
  assert.match(negPower.error(), /大于 0/, '错误文案应说明须大于 0');
  assert.strictEqual(negPower.error(), '请输入大于 0 的功率和使用时间');
  assert.ok(mk().run(Object.assign({}, base, { hours: -10 })).error(), '负时长应报错');
  // 正数边界不受影响：极小正值仍应正常出结果
  const tiny = mk().run(Object.assign({}, base, { power: 1, hours: 1 }));
  assert.strictEqual(tiny.error(), null);
  assert.strictEqual(tiny.text('dailyKwh'), '0.00');
});

test('电费: resetForm 清空功率/时长并回填默认 30 天 / 0.6 元', () => {
  const c = loadCalculator('electricity').run({ power: 1500, hours: 8, days: 30, rate: 0.6 });
  c.reset();
  assert.strictEqual(c.get('power').value, '');
  assert.strictEqual(c.get('hours').value, '');
  assert.strictEqual(c.get('days').value, '30');
  assert.strictEqual(c.get('rate').value, '0.6');
});
