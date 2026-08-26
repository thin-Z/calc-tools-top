/* Tests for js/calculators/dca-calculator.js (Window finance tool).
 * Runs under `node --test`. Sets global.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/dca-calculator.js');

test('window API is exposed', () => {
  ['futureValueDCA', 'totalInvested', 'interestEarned', 'balance'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.dcaCalculator, 'object');
});

test('futureValueDCA matches the FV annuity formula', () => {
  // P=10000, rate=12%/yr (1%/mo), n=12 months, PMT=500
  const fv = futureValueDCA(500, 12, 1, 10000);
  const r = 0.01;
  const expected = 10000 * Math.pow(1 + r, 12) + 500 * ((Math.pow(1 + r, 12) - 1) / r);
  assert.ok(Math.abs(fv - expected) < 0.01, `fv=${fv}, expected=${expected}`);
});

test('futureValueDCA rounds to 2 decimals', () => {
  const fv = futureValueDCA(1000, 8, 3, 0);
  assert.strictEqual(Math.round(fv * 100) / 100, fv, 'result should be a 2-decimal number');
});

test('futureValueDCA handles zero rate (no compounding)', () => {
  const fv = futureValueDCA(500, 0, 2, 1000);
  assert.strictEqual(fv, 1000 + 500 * 24); // principal + monthly * months
});

test('futureValueDCA handles custom months override', () => {
  // years=1 but override months=6
  const fv = futureValueDCA(1000, 0, 1, 0, 6);
  assert.strictEqual(fv, 6000);
});

test('futureValueDCA with zero months returns principal only', () => {
  const fv = futureValueDCA(1000, 8, 0, 2500);
  assert.strictEqual(fv, 2500);
});

test('totalInvested sums initial plus monthly contributions', () => {
  assert.strictEqual(totalInvested(500, 1, 10000), 10000 + 500 * 12);
  assert.strictEqual(totalInvested(0, 0, 123.45), 123.45);
  // custom months
  assert.strictEqual(totalInvested(1000, 1, 0, 6), 6000);
});

test('interestEarned = futureValue - invested', () => {
  assert.strictEqual(interestEarned(12000, 10000), 2000);
  assert.strictEqual(interestEarned(0, 0), 0);
  assert.strictEqual(interestEarned(5000, 6000), -1000);
});

test('balance is an alias for futureValueDCA', () => {
  const a = balance(1000, 6, 5, 2000);
  const b = futureValueDCA(1000, 6, 5, 2000);
  assert.strictEqual(a, b);
});

test('monthlyRate converts percent to monthly decimal', () => {
  assert.ok(Math.abs(monthlyRate(12) - 0.01) < 1e-12);
  assert.strictEqual(monthlyRate(0), 0);
});

test('totalMonths computes years*12 unless overridden', () => {
  assert.strictEqual(totalMonths(1), 12);
  assert.strictEqual(totalMonths(3, 18), 18);
  assert.strictEqual(totalMonths(5, 0), 60); // months=0 falls back to years*12
  assert.strictEqual(totalMonths(0), 0);
});
