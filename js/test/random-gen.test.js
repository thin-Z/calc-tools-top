/* random-gen 单测（fake-DOM harness，零源码改动）
 * 随机结果本身不可断言，故只测可确定部分：范围校验（min >= max 报错）、
 * 不重复模式下数量超过可选范围报错、不重复模式取满整个范围时集合确定、
 * 排序开关结果单调不减、三项输入留空时的缺省回退（0 / 100 / 1）、
 * 生成个数与取值范围边界、resetForm 回填。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

const BADGE = /<span class="random-number-badge">(-?\d+)<\/span>/g;

/** 从结果 innerHTML 中解析出所有数字徽章。 */
function badges(html) {
  const out = [];
  let m;
  BADGE.lastIndex = 0;
  while ((m = BADGE.exec(html)) !== null) out.push(Number(m[1]));
  return out;
}

test('随机数: 常规范围 1~10 取 5 个 -> 个数正确且都落在范围内', () => {
  const c = loadCalculator('random-gen').run({ randMin: 1, randMax: 10, randCount: 5 });
  assert.strictEqual(c.error(), null);
  const nums = badges(c.html('randomResult'));
  assert.strictEqual(nums.length, 5);
  nums.forEach((n) => {
    assert.ok(Number.isInteger(n), '应为整数');
    assert.ok(n >= 1 && n <= 10, n + ' 应落在 1~10');
  });
});

test('随机数: 不重复模式取满整个范围 -> 集合确定（1~5 全取）', () => {
  const c = loadCalculator('random-gen', { checked: { randUnique: true } })
    .run({ randMin: 1, randMax: 5, randCount: 5 });
  assert.strictEqual(c.error(), null);
  const nums = badges(c.html('randomResult'));
  assert.deepStrictEqual(nums.slice().sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test('随机数: 不重复 + 排序 -> 严格递增且无重复', () => {
  const c = loadCalculator('random-gen', { checked: { randUnique: true, randSort: true } })
    .run({ randMin: 10, randMax: 30, randCount: 8 });
  assert.strictEqual(c.error(), null);
  const nums = badges(c.html('randomResult'));
  assert.strictEqual(nums.length, 8);
  assert.strictEqual(new Set(nums).size, 8, '不应重复');
  for (let i = 1; i < nums.length; i++) {
    assert.ok(nums[i] > nums[i - 1], '应严格递增: ' + nums.join(','));
  }
});

test('随机数: 排序开关 -> 20 个结果单调不减', () => {
  const c = loadCalculator('random-gen', { checked: { randSort: true } })
    .run({ randMin: 1, randMax: 1000, randCount: 20 });
  const nums = badges(c.html('randomResult'));
  assert.strictEqual(nums.length, 20);
  for (let i = 1; i < nums.length; i++) {
    assert.ok(nums[i] >= nums[i - 1], '应单调不减: ' + nums.join(','));
  }
});

test('随机数: 非法范围 -> min >= max 报错', () => {
  const equal = loadCalculator('random-gen').run({ randMin: 10, randMax: 10, randCount: 3 });
  assert.ok(equal.error());
  assert.match(equal.error(), /Max must be greater|最大值必须大于/);
  const reversed = loadCalculator('random-gen').run({ randMin: 100, randMax: 1, randCount: 3 });
  assert.ok(reversed.error());
});

test('随机数: 不重复模式下数量超过可选范围 -> 报错；等于范围 -> 放行', () => {
  const tooMany = loadCalculator('random-gen', { checked: { randUnique: true } })
    .run({ randMin: 1, randMax: 3, randCount: 4 });
  assert.ok(tooMany.error(), '范围 3 个却要 4 个不重复值');

  const exact = loadCalculator('random-gen', { checked: { randUnique: true } })
    .run({ randMin: 1, randMax: 3, randCount: 3 });
  assert.strictEqual(exact.error(), null);
  assert.deepStrictEqual(badges(exact.html('randomResult')).sort((a, b) => a - b), [1, 2, 3]);
});

test('随机数: 三项输入留空 -> 回退 0 / 100 / 1（单个结果落在 0~100）', () => {
  const c = loadCalculator('random-gen').run({ randMin: '', randMax: '', randCount: '' });
  assert.strictEqual(c.error(), null);
  const nums = badges(c.html('randomResult'));
  assert.strictEqual(nums.length, 1);
  assert.ok(nums[0] >= 0 && nums[0] <= 100);
});

test('随机数: 非不重复模式允许重复且不限数量 -> 50 个仍全部落在 1~3', () => {
  const c = loadCalculator('random-gen').run({ randMin: 1, randMax: 3, randCount: 50 });
  assert.strictEqual(c.error(), null);
  const nums = badges(c.html('randomResult'));
  assert.strictEqual(nums.length, 50);
  nums.forEach((n) => assert.ok(n >= 1 && n <= 3));
});

test('随机数: resetForm 回填 1 / 100 / 1 并取消勾选与清空结果', () => {
  const c = loadCalculator('random-gen', { checked: { randUnique: true, randSort: true } })
    .run({ randMin: 5, randMax: 9, randCount: 3 });
  c.reset();
  assert.strictEqual(c.get('randMin').value, '1');
  assert.strictEqual(c.get('randMax').value, '100');
  assert.strictEqual(c.get('randCount').value, '1');
  assert.strictEqual(c.get('randUnique').checked, false);
  assert.strictEqual(c.get('randSort').checked, false);
  assert.strictEqual(c.html('randomResult'), '');
});
