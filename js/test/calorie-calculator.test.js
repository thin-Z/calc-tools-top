/* calorie-calculator 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：男/女两套 BMR 公式（Mifflin-St Jeor + Harris-Benedict）、
 * 五档活动系数 TDEE、未知活动键回退 1.2、减重/增肌区间、
 * 年龄/身高/体重越界校验、性别未选校验、zh/en 双语文案分支。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

/** 独立复算 Mifflin-St Jeor BMR（与源码实现分离，用于交叉验证）。 */
function bmrRef(gender, w, h, a) {
  const base = 10 * w + 6.25 * h - 5 * a;
  return gender === 'male' ? base + 5 : base - 161;
}

/** 构造一个可切换的性别 radio 桩（doCalculate 走 querySelector 读取）。 */
function genderStub(value) {
  return { value, checked: false };
}

test('卡路里: 男性 30岁/180cm/75kg/中度活动 -> BMR、TDEE、减脂增肌区间', () => {
  const gender = genderStub('male');
  const c = loadCalculator('calorie-calculator', { querySelector: () => gender }).run({
    age: 30, height: 180, weight: 75, activity: 'moderate',
  });

  // 手算: Mifflin = 10*75 + 6.25*180 - 5*30 + 5 = 1730
  //       Harris  = 13.397*75 + 4.799*180 - 5.677*30 + 88.362 = 1786.647 -> 1787
  //       TDEE    = 1730 * 1.55 = 2681.5 -> 2682
  assert.strictEqual(Number(c.text('bmrMifflin')), 1730);
  assert.strictEqual(Number(c.text('bmrHarris')), 1787);
  assert.strictEqual(Number(c.text('tdeeValue')), 2682);
  assert.strictEqual(c.text('loseRange'), '2182 \u2013 2432');
  assert.strictEqual(c.text('gainRange'), '2932 \u2013 3182');
  assert.strictEqual(Number(c.text('bmrMifflin')), Math.round(bmrRef('male', 75, 180, 30)));
  assert.match(c.text('activityName'), /1\.55/);
});

test('卡路里: 女性 25岁/160cm/50kg/久坐 -> 女性常数 -161 生效', () => {
  const gender = genderStub('female');
  const c = loadCalculator('calorie-calculator', { querySelector: () => gender }).run({
    age: 25, height: 160, weight: 50, activity: 'sedentary',
  });

  // 手算: Mifflin = 500 + 1000 - 125 - 161 = 1214
  //       Harris  = 462.35 + 495.68 - 108.25 + 447.593 = 1297.373 -> 1297
  //       TDEE    = 1214 * 1.2 = 1456.8 -> 1457
  assert.strictEqual(Number(c.text('bmrMifflin')), 1214);
  assert.strictEqual(Number(c.text('bmrHarris')), 1297);
  assert.strictEqual(Number(c.text('tdeeValue')), 1457);
  assert.strictEqual(Number(c.text('bmrMifflin')), Math.round(bmrRef('female', 50, 160, 25)));
});

test('卡路里: 未知活动键 -> 回退系数 1.2（TDEE 不等于 1.55 档）', () => {
  const gender = genderStub('male');
  const c = loadCalculator('calorie-calculator', { querySelector: () => gender }).run({
    age: 30, height: 180, weight: 75, activity: 'not-a-level',
  });
  // 1730 * 1.2 = 2076 -> 2076
  assert.strictEqual(Number(c.text('tdeeValue')), Math.round(1730 * 1.2));
  assert.strictEqual(Number(c.text('tdeeValue')), 2076);
  assert.strictEqual(c.text('activityName'), '');
});

test('卡路里: 极高活动 1.9 档 -> TDEE = BMR * 1.9', () => {
  const gender = genderStub('male');
  const c = loadCalculator('calorie-calculator', { querySelector: () => gender }).run({
    age: 40, height: 170, weight: 65, activity: 'veryActive',
  });
  // Mifflin = 650 + 1062.5 - 200 + 5 = 1517.5 -> 1518; TDEE = 1517.5*1.9 = 2883.25 -> 2883
  assert.strictEqual(Number(c.text('bmrMifflin')), 1518);
  assert.strictEqual(Number(c.text('tdeeValue')), 2883);
  assert.match(c.text('activityName'), /1\.9/);
});

test('卡路里: 边界越界输入 -> 年龄/身高/体重各自触发 showError', () => {
  const gender = genderStub('male');
  const base = { age: 30, height: 180, weight: 75, activity: 'moderate' };
  const mk = () => loadCalculator('calorie-calculator', { querySelector: () => gender });

  assert.ok(mk().run(Object.assign({}, base, { age: 0 })).error(), '年龄 0 应报错');
  assert.ok(mk().run(Object.assign({}, base, { age: 121 })).error(), '年龄 121 应报错');
  assert.ok(mk().run(Object.assign({}, base, { height: 49 })).error(), '身高 49cm 应报错');
  assert.ok(mk().run(Object.assign({}, base, { weight: 9 })).error(), '体重 9kg 应报错');
  assert.ok(mk().run(Object.assign({}, base, { age: 'abc' })).error(), '非数字年龄应报错');
  // 合法边界值不应报错
  const okCase = mk().run({ age: 1, height: 50, weight: 10, activity: 'light' });
  assert.strictEqual(okCase.error(), null);
  assert.ok(Number(okCase.text('tdeeValue')) > 0);
});

test('卡路里: 未选性别 / 英文文案分支', () => {
  // querySelector 返回 null -> 中文错误
  const zh = loadCalculator('calorie-calculator').run({
    age: 30, height: 180, weight: 75, activity: 'moderate',
  });
  assert.ok(zh.error());
  assert.match(zh.error(), /性别/);

  // lang=en -> 英文错误
  const en = loadCalculator('calorie-calculator', { lang: 'en' }).run({
    age: 30, height: 180, weight: 75, activity: 'moderate',
  });
  assert.match(en.error(), /gender/i);

  // lang=en 且正常输入 -> 英文活动名
  const gender = genderStub('male');
  const en2 = loadCalculator('calorie-calculator', {
    lang: 'en', querySelector: () => gender,
  }).run({ age: 30, height: 180, weight: 75, activity: 'moderate' });
  assert.match(en2.text('activityName'), /Moderately active/);
});
