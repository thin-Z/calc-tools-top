/* Tests for js/calculators/fraction-calculator.js (Window 2, B1 tool).
 * Runs under `node --test`. Sets global.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/fraction-calculator.js');

test('window API is exposed', () => {
  ['gcd', 'parseFraction', 'simplify', 'addFractions', 'subtractFractions', 'multiplyFractions', 'divideFractions'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.fractionCalculator, 'object');
});

test('gcd computes greatest common divisor', () => {
  assert.strictEqual(gcd(6, 4), 2);
  assert.strictEqual(gcd(12, 8), 4);
  assert.strictEqual(gcd(5, 3), 1);
  assert.strictEqual(gcd(0, 7), 7);
  assert.strictEqual(gcd(-6, 4), 2);
});

test('parseFraction normalizes and rejects invalid input', () => {
  assert.deepStrictEqual(parseFraction(1, 2), { n: 1, d: 2 });
  assert.deepStrictEqual(parseFraction('3', '4'), { n: 3, d: 4 });
  assert.deepStrictEqual(parseFraction(2, 4), { n: 2, d: 4 }); // parse 不做约分
  assert.deepStrictEqual(parseFraction(1, -2), { n: -1, d: 2 }); // 分母符号移到分子
  assert.deepStrictEqual(parseFraction(-3, -4), { n: 3, d: 4 });
  assert.strictEqual(parseFraction(1, 0), null); // 分母为 0
  assert.strictEqual(parseFraction('abc', 2), null); // 非数字
  assert.strictEqual(parseFraction(1), null); // 缺少分母
});

test('simplify reduces to lowest terms', () => {
  assert.deepStrictEqual(simplify({ n: 2, d: 4 }), { n: 1, d: 2 });
  assert.deepStrictEqual(simplify({ n: 4, d: 6 }), { n: 2, d: 3 });
  assert.deepStrictEqual(simplify({ n: 6, d: 3 }), { n: 2, d: 1 });
  assert.deepStrictEqual(simplify({ n: 0, d: 5 }), { n: 0, d: 1 });
  assert.deepStrictEqual(simplify({ n: 3, d: -2 }), { n: -3, d: 2 });
  assert.strictEqual(simplify({ n: 1, d: 0 }), null);
});

test('addFractions adds two fractions', () => {
  assert.deepStrictEqual(addFractions({ n: 1, d: 2 }, { n: 1, d: 3 }), { n: 5, d: 6 });
  assert.deepStrictEqual(addFractions({ n: 1, d: 2 }, { n: 1, d: 2 }), { n: 1, d: 1 });
  assert.deepStrictEqual(addFractions({ n: 1, d: 3 }, { n: 1, d: 6 }), { n: 1, d: 2 });
});

test('subtractFractions subtracts two fractions', () => {
  assert.deepStrictEqual(subtractFractions({ n: 1, d: 2 }, { n: 1, d: 3 }), { n: 1, d: 6 });
  assert.deepStrictEqual(subtractFractions({ n: 1, d: 2 }, { n: 1, d: 2 }), { n: 0, d: 1 });
});

test('multiplyFractions multiplies two fractions', () => {
  assert.deepStrictEqual(multiplyFractions({ n: 2, d: 3 }, { n: 3, d: 4 }), { n: 1, d: 2 });
  assert.deepStrictEqual(multiplyFractions({ n: 1, d: 2 }, { n: 2, d: 1 }), { n: 1, d: 1 });
});

test('divideFractions divides two fractions and rejects zero divisor', () => {
  assert.deepStrictEqual(divideFractions({ n: 1, d: 2 }, { n: 3, d: 4 }), { n: 2, d: 3 });
  assert.deepStrictEqual(divideFractions({ n: 1, d: 2 }, { n: 1, d: 2 }), { n: 1, d: 1 });
  assert.strictEqual(divideFractions({ n: 1, d: 2 }, { n: 0, d: 4 }), null); // 除数为 0
});
