/* ovulation 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：排卵日 = 末次月经 + (周期 - 14)、易孕期 = 排卵日前 5 天至后 1 天、
 * 下次月经 = 末次月经 + 周期、周期/经期留空回退 28/5、跨月跨年进位、
 * 末次月经缺失报错、resetForm 清空。
 * 期望日期用「本地时间构造 + setDate 进位」独立复算，不照抄源码的解析方式。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

/** 独立复算：给 YYYY-M-D 加上 n 天后格式化（本地时间构造，不复用源码解析）。 */
function plusDays(y, m, d, n) {
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0');
}

test('排卵期: 末次 2026-03-01，周期 28 天 -> 排卵 03-15、易孕 03-10~03-16、下次 03-29', () => {
  const c = loadCalculator('ovulation').run({
    lastPeriod: '2026-03-01', cycleDays: 28, periodDays: 5,
  });
  // 手算: 排卵 = 3/1 + (28-14) = 3/15; 易孕 = 3/10 ~ 3/16; 下次 = 3/1 + 28 = 3/29
  assert.strictEqual(c.text('ovulationDay'), plusDays(2026, 3, 1, 14));
  assert.strictEqual(c.text('ovulationDay'), '2026-03-15');
  assert.strictEqual(c.text('fertileStart'), '2026-03-10');
  assert.strictEqual(c.text('fertileEnd'), '2026-03-16');
  assert.strictEqual(c.text('nextPeriod'), plusDays(2026, 3, 1, 28));
  assert.strictEqual(c.text('cycleDisplay'), '28天');
});

test('排卵期: 周期 30 天 -> 排卵日随之后移（3/1+16）', () => {
  const c = loadCalculator('ovulation').run({
    lastPeriod: '2026-05-10', cycleDays: 30, periodDays: 7,
  });
  // 手算: 排卵 = 5/10 + 16 = 5/26; 易孕 5/21 ~ 5/27; 下次 = 5/10 + 30 = 6/9
  assert.strictEqual(c.text('ovulationDay'), plusDays(2026, 5, 10, 16));
  assert.strictEqual(c.text('ovulationDay'), '2026-05-26');
  assert.strictEqual(c.text('fertileStart'), '2026-05-21');
  assert.strictEqual(c.text('fertileEnd'), '2026-05-27');
  assert.strictEqual(c.text('nextPeriod'), '2026-06-09');
});

test('排卵期: 周期/经期留空 -> 回退 28 / 5（结果与显式 28 一致）', () => {
  const a = loadCalculator('ovulation').run({ lastPeriod: '2026-03-01', cycleDays: '', periodDays: '' });
  const b = loadCalculator('ovulation').run({ lastPeriod: '2026-03-01', cycleDays: 28, periodDays: 5 });
  assert.strictEqual(a.text('ovulationDay'), b.text('ovulationDay'));
  assert.strictEqual(a.text('cycleDisplay'), '28天');
});

test('排卵期: 跨年进位（2026-12-20 + 28 天 -> 2027 年）', () => {
  const c = loadCalculator('ovulation').run({
    lastPeriod: '2026-12-20', cycleDays: 28, periodDays: 5,
  });
  // 手算: 排卵 = 12/20 + 14 = 2027-01-03; 下次 = 12/20 + 28 = 2027-01-17
  assert.strictEqual(c.text('ovulationDay'), plusDays(2026, 12, 20, 14));
  assert.strictEqual(c.text('ovulationDay'), '2027-01-03');
  assert.strictEqual(c.text('nextPeriod'), '2027-01-17');
});

test('排卵期: 非法周期值回退 28；末次月经缺失 -> showError', () => {
  const bad = loadCalculator('ovulation').run({
    lastPeriod: '2026-03-01', cycleDays: 'abc', periodDays: 5,
  });
  assert.strictEqual(bad.text('cycleDisplay'), '28天');
  assert.strictEqual(bad.text('ovulationDay'), '2026-03-15');

  const missing = loadCalculator('ovulation').run({ lastPeriod: '', cycleDays: 28, periodDays: 5 });
  assert.ok(missing.error());
  assert.match(missing.error(), /末次月经/);
});

test('排卵期: resetForm 清空日期并回填 28 / 5', () => {
  const c = loadCalculator('ovulation').run({ lastPeriod: '2026-03-01', cycleDays: 30, periodDays: 7 });
  c.reset();
  assert.strictEqual(c.get('lastPeriod').value, '');
  assert.strictEqual(c.get('cycleDays').value, '28');
  assert.strictEqual(c.get('periodDays').value, '5');
});
