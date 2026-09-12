/* Tests for js/calculators/date-calc.js (date calculator, time category).
 * Runs under `node --test`. Browser-global script loaded via vm sandbox. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../calculators/date-calc.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const { addDays, daysBetween, getDayOfWeek, todayStr } = ctx;

test('addDays: 同月加 / 跨月 / 跨年 / 负数', () => {
  assert.strictEqual(addDays('2026-01-01', 31), '2026-02-01');
  assert.strictEqual(addDays('2026-01-15', 17), '2026-02-01');
  assert.strictEqual(addDays('2026-12-15', 20), '2027-01-04');
  assert.strictEqual(addDays('2026-01-01', -1), '2025-12-31');
});

test('addDays: 闰年与平年二月', () => {
  assert.strictEqual(addDays('2024-02-28', 1), '2024-02-29'); // 闰年
  assert.strictEqual(addDays('2024-02-29', 1), '2024-03-01');
  assert.strictEqual(addDays('2026-02-28', 1), '2026-03-01'); // 平年
});

test('addDays: 加 0 天返回原日期', () => {
  assert.strictEqual(addDays('2026-09-12', 0), '2026-09-12');
});

test('daysBetween: 顺序 / 零差 / 逆序（负数）/ 跨月', () => {
  assert.strictEqual(daysBetween('2026-01-01', '2026-01-31'), 30);
  assert.strictEqual(daysBetween('2026-01-01', '2026-01-01'), 0);
  assert.strictEqual(daysBetween('2026-03-01', '2026-02-28'), -1);
  assert.strictEqual(daysBetween('2026-01-15', '2026-02-15'), 31);
});

test('daysBetween: 闰年 366 天', () => {
  assert.strictEqual(daysBetween('2024-01-01', '2025-01-01'), 366);
});

test('getDayOfWeek: 已知日期的星期（zh + en 一致）', () => {
  // vm 沙箱返回的对象与测试文件不同 realm，逐字段断言（不用 deepStrictEqual）
  const d1 = getDayOfWeek('2026-01-01');
  assert.strictEqual(d1.zh, '星期四');
  assert.strictEqual(d1.en, 'Thursday');
  const d2 = getDayOfWeek('2026-09-12');
  assert.strictEqual(d2.zh, '星期六');
  assert.strictEqual(d2.en, 'Saturday');
  const d3 = getDayOfWeek('2024-02-29');
  assert.strictEqual(d3.zh, '星期四');
  assert.strictEqual(d3.en, 'Thursday');
});

test('todayStr: 返回本地今天 YYYY-MM-DD', () => {
  const d = new Date();
  const expected = d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
  assert.strictEqual(todayStr(), expected);
  assert.match(todayStr(), /^\d{4}-\d{2}-\d{2}$/);
});
