/* Tests for js/calculators/age-calc.js — pure calculateAge() + doCalculate
 * via fake-DOM harness. calculateAge uses `new Date()` for "today", so only
 * year-derived / structural assertions are deterministic. */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

const { calculateAge, doCalculate } = loadCalculator('age-calc').sandbox;

test('生肖由出生年份决定: 1990 -> 马', () => {
  assert.strictEqual(calculateAge('1990-01-15').zodiac, '马');
  assert.strictEqual(calculateAge('2000-05-01').zodiac, '龙');
});

test('年龄结构与时序合理', () => {
  const r = calculateAge('1990-01-15');
  assert.ok(r.totalDays > 0, 'totalDays 应为正');
  assert.ok(r.daysToBirthday >= 0 && r.daysToBirthday <= 366, '距下次生日应在年内');
  assert.ok(r.years >= 0 && r.months >= 0 && r.months < 12 && r.days >= 0);
  const now = new Date();
  const expectedYears = now.getFullYear() - 1990;
  assert.ok(r.years === expectedYears || r.years === expectedYears - 1, '周岁接近出生年至今年数');
});

test('doCalculate 经 fake DOM 产出 ageDisplay 与生肖', () => {
  const c = loadCalculator('age-calc').run({ birthDate: '1990-01-15' });
  assert.ok(c.text('ageDisplay') && c.text('ageDisplay').includes('岁'), '应渲染周岁文案');
  assert.strictEqual(c.text('zodiac'), '马');
});

test('doCalculate 缺失出生日期 -> 触发 showError', () => {
  const c = loadCalculator('age-calc').run({ birthDate: '' });
  assert.ok(c.error());
});
