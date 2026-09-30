/* overtime 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：工作日 1.5 倍 / 休息日 2 倍 / 法定节假日 3 倍三档倍率、
 * 时薪按 21.75 天 * 8 小时折算（月计薪天数 174 小时）、
 * 加班时长留空归零、月薪缺失或为零报错、resetForm 回填。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

test('加班费: 月薪 8000，工作日 10h / 休息日 8h / 节假日 4h', () => {
  const c = loadCalculator('overtime').run({
    monthlySalary: 8000, weekdayOvertime: 10, weekendOvertime: 8, holidayOvertime: 4,
  });
  // 手算: 时薪 = 8000 / 21.75 / 8 = 8000/174 = 45.977...  -> 45.98
  //       工作日 = 45.9770 * 1.5 * 10 = 689.6552  -> 689.66
  //       休息日 = 45.9770 * 2   * 8  = 735.6322  -> 735.63
  //       节假日 = 45.9770 * 3   * 4  = 551.7241  -> 551.72
  //       合计   = 1977.0115                      -> 1977.01
  assert.strictEqual(c.text('hourlyRate'), '45.98');
  assert.strictEqual(c.text('weekdayPay'), '689.66');
  assert.strictEqual(c.text('weekendPay'), '735.63');
  assert.strictEqual(c.text('holidayPay'), '551.72');
  assert.strictEqual(c.text('totalOvertimePay'), '1977.01');
});

test('加班费: 三档倍率比例校验（同为 10 小时，1.5 : 2 : 3）', () => {
  const weekday = loadCalculator('overtime').run({
    monthlySalary: 8000, weekdayOvertime: 10, weekendOvertime: '', holidayOvertime: '',
  });
  const weekend = loadCalculator('overtime').run({
    monthlySalary: 8000, weekdayOvertime: '', weekendOvertime: 10, holidayOvertime: '',
  });
  const holiday = loadCalculator('overtime').run({
    monthlySalary: 8000, weekdayOvertime: '', weekendOvertime: '', holidayOvertime: 10,
  });
  const wd = Number(weekday.text('totalOvertimePay'));
  const we = Number(weekend.text('totalOvertimePay'));
  const ho = Number(holiday.text('totalOvertimePay'));
  // 1.5 : 2 : 3 => 休息日 = 工作日 * 4/3，节假日 = 工作日 * 2
  assert.ok(Math.abs(we - wd * 4 / 3) < 0.02, '休息日应为工作日的 4/3');
  assert.ok(Math.abs(ho - wd * 2) < 0.02, '节假日应为工作日的 2 倍');
  assert.strictEqual(wd, 689.66);
});

test('加班费: 只填工作日 20h，月薪 5000 -> 时薪 28.74、合计 862.07', () => {
  const c = loadCalculator('overtime').run({
    monthlySalary: 5000, weekdayOvertime: 20, weekendOvertime: '', holidayOvertime: '',
  });
  // 手算: 5000/174 = 28.7356 -> 28.74; 28.7356*1.5*20 = 862.0690 -> 862.07
  assert.strictEqual(c.text('hourlyRate'), '28.74');
  assert.strictEqual(c.text('weekdayPay'), '862.07');
  assert.strictEqual(c.text('weekendPay'), '0.00');
  assert.strictEqual(c.text('holidayPay'), '0.00');
  assert.strictEqual(c.text('totalOvertimePay'), '862.07');
});

test('加班费: 加班时长全部留空 -> 各项归零，时薪照算', () => {
  const c = loadCalculator('overtime').run({
    monthlySalary: 17400, weekdayOvertime: '', weekendOvertime: '', holidayOvertime: '',
  });
  // 17400 / 174 = 100 元/小时（刻意取能整除的值做交叉验证）
  assert.strictEqual(c.text('hourlyRate'), '100.00');
  assert.strictEqual(c.text('totalOvertimePay'), '0.00');
});

test('加班费: 月薪缺失或为零 -> showError', () => {
  const base = { monthlySalary: 8000, weekdayOvertime: 10, weekendOvertime: 0, holidayOvertime: 0 };
  const mk = () => loadCalculator('overtime');
  assert.ok(mk().run(Object.assign({}, base, { monthlySalary: '' })).error(), '月薪为空应报错');
  assert.ok(mk().run(Object.assign({}, base, { monthlySalary: 0 })).error(), '月薪为 0 应报错');
  assert.ok(mk().run(Object.assign({}, base, { monthlySalary: 'abc' })).error(), '月薪非法字符应报错');
  assert.match(mk().run(Object.assign({}, base, { monthlySalary: '' })).error(), /月薪/);
});

test('加班费: resetForm 回填月薪 8000 与三个 0', () => {
  const c = loadCalculator('overtime').run({ monthlySalary: 20000, weekdayOvertime: 5 });
  c.reset();
  assert.strictEqual(c.get('monthlySalary').value, '8000');
  assert.strictEqual(c.get('weekdayOvertime').value, '0');
  assert.strictEqual(c.get('weekendOvertime').value, '0');
  assert.strictEqual(c.get('holidayOvertime').value, '0');
});
