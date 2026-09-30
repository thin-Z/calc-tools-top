/* workday-calculator 单测（fake-DOM harness，零源码改动）
 * 覆盖分支：区间含首尾的工作日统计、排除/不排除周末、2026 法定节假日额外排除、
 * 节假日落在周末时不重复扣减、非法日期格式被过滤、结束早于开始报错、
 * 日期缺失报错、同日区间、init 默认填充今天与今天+7、zh/en 说明文案。
 * 用例区间 2026-03-02(周一) ~ 2026-03-08(周日) 为完整一周，便于手算校验。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

/** 本地时间格式化 YYYY-MM-DD，用于复算今天与今天+7。 */
function fmt(dt) {
  return dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0');
}

function build(checked) {
  return loadCalculator('workday-calculator', { checked: checked || {} });
}

test('工作日: init 默认填充今天 ~ 今天+7', () => {
  const c = loadCalculator('workday-calculator');
  const today = new Date();
  const plus7 = new Date(today.getTime());
  plus7.setDate(plus7.getDate() + 7);
  assert.strictEqual(c.get('startDate').value, fmt(today));
  assert.strictEqual(c.get('endDate').value, fmt(plus7));
});

test('工作日: 整周 3/2(周一)~3/8(周日) 排除周末 -> 5 个工作日 / 7 天 / 2 个周末', () => {
  const c = build({ excludeWeekends: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '',
  });
  assert.strictEqual(c.error(), null);
  assert.strictEqual(Number(c.text('workdayCount')), 5);
  assert.strictEqual(Number(c.text('totalDays')), 7);
  assert.strictEqual(Number(c.text('weekendDays')), 2);
  assert.strictEqual(Number(c.text('holidayCount')), 0);
  assert.strictEqual(c.get('holidayDetail').style.display, 'none');
  assert.match(c.text('resultNote'), /已排除周六日/);
  assert.match(c.text('resultNote'), /未排除工作日节假日/);
});

test('工作日: 同一区间不排除周末 -> 7 个工作日 / weekendDays 记 0', () => {
  const c = build({ excludeWeekends: false }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '',
  });
  assert.strictEqual(Number(c.text('workdayCount')), 7);
  assert.strictEqual(Number(c.text('totalDays')), 7);
  assert.strictEqual(Number(c.text('weekendDays')), 0);
  assert.match(c.text('resultNote'), /未排除周末/);
});

test('工作日: 跨两周 3/2~3/13 排除周末 -> 10 个工作日 / 12 天', () => {
  const c = build({ excludeWeekends: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-13', holidayList: '',
  });
  // 手算: 3/2~3/6 五天 + 3/9~3/13 五天 = 10；周末 3/7、3/8 两天
  assert.strictEqual(Number(c.text('workdayCount')), 10);
  assert.strictEqual(Number(c.text('totalDays')), 12);
  assert.strictEqual(Number(c.text('weekendDays')), 2);
});

test('工作日: 勾选排除节假日 -> 工作日节假日被额外扣除并列出明细', () => {
  const c = build({ excludeWeekends: true, excludeHoliday: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '2026-03-04',
  });
  // 手算: 5 个工作日 - 3/4(周三) = 4
  assert.strictEqual(Number(c.text('workdayCount')), 4);
  assert.strictEqual(Number(c.text('holidayCount')), 1);
  assert.strictEqual(c.text('holidayDetailList'), '2026-03-04');
  assert.strictEqual(c.get('holidayDetail').style.display, 'block');
  assert.match(c.text('resultNote'), /额外排除了 1 个工作日节假日/);
});

test('工作日: 节假日落在周末不重复扣减；未勾选时不读文本框', () => {
  const withWeekendHoliday = build({ excludeWeekends: true, excludeHoliday: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '2026-03-04\n2026-03-07',
  });
  // 3/7 是周六，已按周末扣除，不再计入节假日明细
  assert.strictEqual(Number(withWeekendHoliday.text('workdayCount')), 4);
  assert.strictEqual(Number(withWeekendHoliday.text('holidayCount')), 1);
  assert.strictEqual(withWeekendHoliday.text('holidayDetailList'), '2026-03-04');

  const unchecked = build({ excludeWeekends: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '2026-03-04',
  });
  assert.strictEqual(Number(unchecked.text('workdayCount')), 5, '未勾选时应忽略文本框');
  assert.strictEqual(Number(unchecked.text('holidayCount')), 0);
});

test('工作日: 不排除周末时，落在周末的节假日仍扣减工作日但不列入明细', () => {
  const c = build({ excludeWeekends: false, excludeHoliday: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '2026-03-07',
  });
  // 3/7 周六：周末不排除时它本算工作日，命中节假日后扣除 -> 6
  assert.strictEqual(Number(c.text('workdayCount')), 6);
  assert.strictEqual(Number(c.text('holidayCount')), 0, '周末节假日不计入明细');
});

test('工作日: 非法节假日格式被过滤（不参与扣减）', () => {
  const c = build({ excludeWeekends: true, excludeHoliday: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-08', holidayList: 'abc\n2026/03/04\n2026-03-05',
  });
  // 仅 2026-03-05(周四) 合法 -> 5 - 1 = 4
  assert.strictEqual(Number(c.text('workdayCount')), 4);
  assert.strictEqual(Number(c.text('holidayCount')), 1);
  assert.strictEqual(c.text('holidayDetailList'), '2026-03-05');
});

test('工作日: 同日区间 -> 1 天 1 个工作日', () => {
  const c = build({ excludeWeekends: true }).run({
    startDate: '2026-03-02', endDate: '2026-03-02', holidayList: '',
  });
  assert.strictEqual(Number(c.text('totalDays')), 1);
  assert.strictEqual(Number(c.text('workdayCount')), 1);
});

test('工作日: 结束早于开始 / 日期缺失 -> showError', () => {
  const reversed = build({ excludeWeekends: true }).run({
    startDate: '2026-03-08', endDate: '2026-03-02', holidayList: '',
  });
  assert.ok(reversed.error());
  assert.match(reversed.error(), /不能早于|earlier/);

  const missing = build({ excludeWeekends: true }).run({
    startDate: '', endDate: '2026-03-08', holidayList: '',
  });
  assert.ok(missing.error());
  assert.match(missing.error(), /开始日期|start and end/);

  const badFormat = build({ excludeWeekends: true }).run({
    startDate: 'not-a-date', endDate: '2026-03-08', holidayList: '',
  });
  assert.ok(badFormat.error(), '非法日期格式应报错');
});

test('工作日: lang=en -> 英文说明文案', () => {
  const c = loadCalculator('workday-calculator', {
    lang: 'en', checked: { excludeWeekends: true, excludeHoliday: true },
  }).run({ startDate: '2026-03-02', endDate: '2026-03-08', holidayList: '2026-03-04' });
  assert.match(c.text('resultNote'), /inclusive of both the start and end dates/);
  assert.match(c.text('resultNote'), /Weekends \(Saturday & Sunday\) are excluded/);
  assert.match(c.text('resultNote'), /1 weekday\(s\) listed as holidays/);
});
