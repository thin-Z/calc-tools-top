/* Tests for js/calculators/bmi.js (BMI calculator, health category).
 * Runs under `node --test`. The module is a browser global script (top-level
 * function declarations, no exports) — loaded into a vm sandbox so the
 * declarations land on the context object. Zero changes to the source file. */
const test = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '../calculators/bmi.js'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(src, ctx);
const { calculateBMI } = ctx;

test('calculateBMI: normal weight (标准体重)', () => {
  const r = calculateBMI(170, 65);
  assert.strictEqual(r.bmi, '22.5');
  assert.strictEqual(r.category, '正常');
  assert.strictEqual(r.color, '#22c55e');
});

test('calculateBMI: 偏瘦 / 超重 / 肥胖 分类与颜色', () => {
  assert.deepStrictEqual(
    [calculateBMI(175, 55).category, calculateBMI(175, 55).color], ['偏瘦', '#f59e0b']);
  assert.deepStrictEqual(
    [calculateBMI(170, 75).category, calculateBMI(170, 75).color], ['超重', '#f97316']);
  assert.deepStrictEqual(
    [calculateBMI(170, 90).category, calculateBMI(170, 90).color], ['肥胖', '#ef4444']);
});

test('calculateBMI: 分类边界 18.5 / 24 / 28（h=1m 消除浮点噪声）', () => {
  assert.strictEqual(calculateBMI(100, 18).category, '偏瘦');   // 18.0
  assert.strictEqual(calculateBMI(100, 18.5).category, '正常'); // 边界含 18.5
  assert.strictEqual(calculateBMI(100, 23.9).category, '正常'); // 23.9
  assert.strictEqual(calculateBMI(100, 24).category, '超重');   // 边界含 24
  assert.strictEqual(calculateBMI(100, 27.9).category, '超重'); // 27.9
  assert.strictEqual(calculateBMI(100, 28).category, '肥胖');   // 边界含 28
});

test('calculateBMI: bmi 字符串保留一位小数', () => {
  assert.strictEqual(calculateBMI(170, 65).bmi, '22.5');
  assert.strictEqual(calculateBMI(160, 50).bmi, '19.5'); // 50/2.56=19.53125
});
