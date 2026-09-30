/* ideal-weight 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：Broca / BMI(22) / Devine 三公式的男女两套常数、
 * 正常体重范围 18.5~24.9、年龄缺省回退 30、性别未选或身高缺失报错、
 * resetForm 回填 170/30 并勾回男性。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

/** 可切换的性别 radio 桩；doCalculate 与 resetForm 共用同一对象。 */
function genderStub(value) {
  return { value, checked: false };
}

function build(value) {
  const gender = genderStub(value);
  const c = loadCalculator('ideal-weight', { querySelector: () => gender });
  return { c, gender };
}

test('标准体重: 男性 180cm -> Broca 80.0 / BMI 71.3 / Devine 75.2', () => {
  const { c } = build('male');
  c.run({ height: 180, age: 30 });
  // 手算: Broca = 180-100 = 80; BMI = 22*1.8^2 = 71.28 -> 71.3; Devine = 50+0.9*(180-152) = 75.2
  assert.strictEqual(c.text('brocaWeight'), '80.0');
  assert.strictEqual(c.text('bmiIdealWeight'), '71.3');
  assert.strictEqual(c.text('devineWeight'), '75.2');
  // 正常范围: 18.5*3.24 = 59.94 -> 59.9; 24.9*3.24 = 80.676 -> 80.7
  assert.strictEqual(c.text('normalRange'), '59.9 - 80.7');
});

test('标准体重: 女性 160cm -> Broca 55.0 / BMI 56.3 / Devine 52.7', () => {
  const { c } = build('female');
  c.run({ height: 160, age: 28 });
  // 手算: Broca = 160-105 = 55; BMI = 22*1.6^2 = 56.32 -> 56.3; Devine = 45.5+0.9*(160-152) = 52.7
  assert.strictEqual(c.text('brocaWeight'), '55.0');
  assert.strictEqual(c.text('bmiIdealWeight'), '56.3');
  assert.strictEqual(c.text('devineWeight'), '52.7');
  // 18.5*2.56 = 47.36 -> 47.4; 24.9*2.56 = 63.744 -> 63.7
  assert.strictEqual(c.text('normalRange'), '47.4 - 63.7');
});

test('标准体重: 身高 152cm（Devine 基准点）-> Devine 男 50.0 / 女 45.5', () => {
  const male = build('male').c.run({ height: 152, age: 30 });
  assert.strictEqual(male.text('devineWeight'), '50.0');
  const female = build('female').c.run({ height: 152, age: 30 });
  assert.strictEqual(female.text('devineWeight'), '45.5');
  // 身高低于 152 时 Devine 应小于基准值
  const short = build('male').c.run({ height: 140, age: 30 });
  assert.strictEqual(Number(short.text('devineWeight')) < 50, true);
});

test('标准体重: 年龄留空 -> 回退 30（年龄不参与公式，结果不变）', () => {
  const a = build('male').c.run({ height: 175, age: '' });
  const b = build('male').c.run({ height: 175, age: 30 });
  assert.strictEqual(a.text('brocaWeight'), b.text('brocaWeight'));
  assert.strictEqual(a.text('devineWeight'), b.text('devineWeight'));
  assert.strictEqual(a.text('brocaWeight'), '75.0');
});

test('标准体重: 性别未选或身高缺失 -> showError', () => {
  // querySelector 恒返回 null => !gender
  const noGender = loadCalculator('ideal-weight').run({ height: 170, age: 30 });
  assert.ok(noGender.error());
  assert.match(noGender.error(), /性别/);

  const noHeight = build('male').c.run({ height: '', age: 30 });
  assert.ok(noHeight.error());

  const badHeight = build('male').c.run({ height: 'abc', age: 30 });
  assert.ok(badHeight.error());
});

test('标准体重: resetForm 回填 170/30 并勾回男性', () => {
  const { c, gender } = build('male');
  c.run({ height: 180, age: 40 });
  gender.checked = false;
  c.reset();
  assert.strictEqual(c.get('height').value, '170');
  assert.strictEqual(c.get('age').value, '30');
  assert.strictEqual(gender.checked, true);
});
