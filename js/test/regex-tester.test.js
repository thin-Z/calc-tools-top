/* Tests for js/calculators/regex-tester.js (P1P2-03, P1P2-13). */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/regex-tester.js');

test('window API is exposed', () => {
  ['buildRegex', 'findMatches', 'explainGroups', 'escapeRegex'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
});

test('buildRegex constructs valid regex and filters flags', () => {
  const ok = buildRegex('\\d+', 'gimxu');
  assert.strictEqual(ok.ok, true);
  assert.ok(ok.regex instanceof RegExp);
  // 'x' 非法标志被过滤，'u' 保留
  assert.strictEqual(ok.flags.includes('x'), false);
  assert.strictEqual(ok.flags.includes('u'), true);
  assert.ok(ok.regex.test('123'));
});

test('buildRegex reports invalid patterns with error message', () => {
  const bad = buildRegex('(', 'g');
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.error.length > 0);
  assert.strictEqual(bad.regex, null);
  const empty = buildRegex('', '');
  assert.strictEqual(empty.ok, false);
});

test('findMatches returns all matches with index and groups', () => {
  const b = buildRegex('(\\d{4})-(\\d{2})', 'g');
  const ms = findMatches('2026-08 and 2027-09', b.regex);
  assert.strictEqual(ms.length, 2);
  assert.strictEqual(ms[0].match, '2026-08');
  assert.strictEqual(ms[0].index, 0);
  assert.deepStrictEqual(ms[0].groups, ['2026', '08']);
  assert.strictEqual(ms[1].index, 12);
});

test('findMatches handles non-global regex and empty matches without infinite loop', () => {
  const noGlobal = buildRegex('a', '');
  const ms = findMatches('banana', noGlobal.regex);
  assert.strictEqual(ms.length, 3);
  const emptyOk = buildRegex('', ''); // invalid, no crash
  assert.strictEqual(findMatches('abc', emptyOk.regex).length, 0);
  // 空匹配模式应终止而非死循环
  const star = buildRegex('a*', 'g');
  assert.ok(Array.isArray(findMatches('bbb', star.regex)));
});

test('explainGroups parses capture groups, named groups and skips non-capturing', () => {
  assert.deepStrictEqual(explainGroups('(a)(b(c))(?:x)').map((g) => g.index), [1, 2, 3]);
  const named = explainGroups('(?<year>\\d{4})-(?<month>\\d{2})');
  assert.strictEqual(named.length, 2);
  assert.strictEqual(named[0].name, 'year');
  assert.strictEqual(named[1].name, 'month');
  assert.strictEqual(explainGroups('(?:abc)').length, 0);
  assert.strictEqual(explainGroups('a\\(b\\)').length, 0); // 转义括号不算
  assert.deepStrictEqual(explainGroups(''), []);
});

test('escapeRegex escapes special characters', () => {
  assert.strictEqual(escapeRegex('a.b*c'), 'a\\.b\\*c');
  assert.strictEqual(escapeRegex('(x)[y]'), '\\(x\\)\\[y\\]');
  assert.strictEqual(escapeRegex('plain'), 'plain');
});
