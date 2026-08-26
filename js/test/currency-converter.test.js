/* Tests for js/calculators/currency-converter.js (Window 2, B1 tool).
 * Runs under `node --test`. Sets global.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/currency-converter.js');

test('window API is exposed', () => {
  ['currencies', 'getRate', 'convertCurrency', 'formatMoney'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.currency, 'object');
});

test('CURRENCIES returns supported codes and getRate returns known values', () => {
  const codes = window.CURRENCIES();
  assert.ok(codes.includes('USD'));
  assert.ok(codes.includes('CNY'));
  assert.ok(codes.includes('EUR'));
  assert.strictEqual(getRate('USD'), 1);
  assert.ok(getRate('CNY') > 0);
  assert.strictEqual(getRate('ZZZ'), 0);
});

test('convertCurrency converts via USD cross rate', () => {
  // 100 USD → CNY = 100 / 0.138 ≈ 724.64
  const toCny = convertCurrency(100, 'USD', 'CNY');
  assert.ok(Math.abs(toCny - 100 / 0.138) < 0.01, 'USD->CNY');
  // amount in one currency to itself = same
  assert.ok(Math.abs(convertCurrency(50, 'EUR', 'EUR') - 50) < 1e-9);
  // invalid inputs
  assert.strictEqual(convertCurrency('abc', 'USD', 'CNY'), 0);
  assert.strictEqual(convertCurrency(10, 'XYZ', 'USD'), 0);
});

test('formatMoney rounds to two decimals with code', () => {
  assert.strictEqual(formatMoney(123.456, 'USD'), '123.46 USD');
  assert.strictEqual(formatMoney(0, 'CNY'), '0.00 CNY');
});
