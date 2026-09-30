/* percentage-calc 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：六种模式 whatPercent / percentOf / addPercent / subtractPercent /
 * percentChange（增长与下降）/ discount；除零与折扣率越界报错；未知模式输出空串。
 * 结果写在 percentResult.innerHTML 上，断言读取 innerHTML。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

function run(mode, val1, val2) {
  return loadCalculator('percentage-calc').run({
    percentMode: mode, percentVal1: val1, percentVal2: val2,
  });
}

test('百分比: whatPercent -> 25 是 200 的 12.50%', () => {
  const c = run('whatPercent', 25, 200);
  assert.strictEqual(c.html('percentResult'), '25 是 200 的 <strong>12.50%</strong>');
});

test('百分比: percentOf -> 15% 的 300 = 45.00', () => {
  const c = run('percentOf', 15, 300);
  assert.strictEqual(c.html('percentResult'), '15% 的 300 = <strong>45.00</strong>');
});

test('百分比: addPercent / subtractPercent -> 200±10% = 220.00 / 180.00', () => {
  assert.strictEqual(
    run('addPercent', 200, 10).html('percentResult'),
    '200 + 200×10% = <strong>220.00</strong>'
  );
  assert.strictEqual(
    run('subtractPercent', 200, 10).html('percentResult'),
    '200 - 200×10% = <strong>180.00</strong>'
  );
  // 100% 减少归零
  assert.strictEqual(
    run('subtractPercent', 88, 100).html('percentResult'),
    '88 - 88×100% = <strong>0.00</strong>'
  );
});

test('百分比: percentChange -> 增长 50% 与下降 20%', () => {
  // 100 -> 150: (150-100)/100*100 = 50%
  assert.strictEqual(
    run('percentChange', 100, 150).html('percentResult'),
    '从 100 到 150：<strong>增长 50.00%</strong>'
  );
  // 200 -> 160: (160-200)/200*100 = -20% -> 取绝对值并标"下降"
  assert.strictEqual(
    run('percentChange', 200, 160).html('percentResult'),
    '从 200 到 160：<strong>下降 20.00%</strong>'
  );
});

test('百分比: discount -> 原价 500 打 8 折，折后 400.00，节省 100.00', () => {
  const c = run('discount', 500, 20);
  assert.strictEqual(
    c.html('percentResult'),
    '原价 500，折扣 20%：折后价 <strong>400.00</strong>，节省 <strong>100.00</strong>'
  );
  // 0% 折扣：折后价 = 原价，节省 0
  const zero = run('discount', 500, 0);
  assert.match(zero.html('percentResult'), /折后价 <strong>500\.00<\/strong>，节省 <strong>0\.00<\/strong>/);
  // 100% 折扣：折后价 0
  const full = run('discount', 500, 100);
  assert.match(full.html('percentResult'), /折后价 <strong>0\.00<\/strong>，节省 <strong>500\.00<\/strong>/);
});

test('百分比: 非法输入 -> 除零、起始值为零、折扣率越界均报错', () => {
  assert.ok(run('whatPercent', 25, 0).error(), '第二值为 0 应报错');
  assert.ok(run('percentChange', 0, 50).error(), '起始值为 0 应报错');
  assert.ok(run('discount', 500, 101).error(), '折扣率 101 应报错');
  assert.ok(run('discount', 500, -1).error(), '折扣率 -1 应报错');
  assert.match(run('whatPercent', 25, 0).error(), /不能为0|zero/);
});

test('百分比: 未知模式 -> 结果区清空（switch 无 default）', () => {
  const c = run('noSuchMode', 1, 2);
  assert.strictEqual(c.html('percentResult'), '');
  assert.strictEqual(c.error(), null);
});

test('百分比: resetForm 清空两个输入与结果', () => {
  const c = run('percentOf', 15, 300);
  c.reset();
  assert.strictEqual(c.get('percentVal1').value, '');
  assert.strictEqual(c.get('percentVal2').value, '');
  assert.strictEqual(c.html('percentResult'), '');
});
