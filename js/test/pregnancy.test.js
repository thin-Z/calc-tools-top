/* Tests for js/calculators/pregnancy.js (Pregnancy calculator, health category).
 * Runs under `node --test`. Sets globalThis.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/pregnancy.js');

test('window API is exposed', () => {
  assert.strictEqual(typeof window.pregnancy, 'object');
  ['calcDueDate', 'gestationalWeek', 'daysPregnant', 'daysToDue', 'estimateLmp'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.pregnancy.calcDueDate, 'function');
  assert.strictEqual(typeof window.pregnancy.gestationalWeek, 'function');
});

test('calcDueDate returns LMP + 280 days', () => {
  assert.strictEqual(formatDate(calcDueDate('2026-01-01')), '2026-10-08');
  assert.strictEqual(formatDate(calcDueDate('2025-12-01')), '2026-09-07');
  // Accepts a Date object as well
  assert.strictEqual(formatDate(calcDueDate(new Date(2026, 0, 1))), '2026-10-08');
  // Invalid input -> null
  assert.strictEqual(calcDueDate('not-a-date'), null);
  assert.strictEqual(calcDueDate(null), null);
});

test('daysPregnant counts whole days from LMP to today', () => {
  assert.strictEqual(daysPregnant('2026-01-01', '2026-01-15'), 14);
  assert.strictEqual(daysPregnant('2026-01-01', '2026-01-01'), 0);
  // today before LMP -> 0
  assert.strictEqual(daysPregnant('2026-01-15', '2026-01-01'), 0);
  // invalid -> 0
  assert.strictEqual(daysPregnant('bad', '2026-01-01'), 0);
  assert.strictEqual(daysPregnant('2026-01-01', null), 0);
});

test('gestationalWeek returns {weeks, days} (7 days per week)', () => {
  assert.deepStrictEqual(gestationalWeek('2026-01-01', '2026-01-01'), { weeks: 0, days: 0 });
  // 65 days => 9 weeks + 2 days
  assert.deepStrictEqual(gestationalWeek('2026-01-01', '2026-03-07'), { weeks: 9, days: 2 });
  // 280 days => 40 weeks + 0 days
  assert.deepStrictEqual(gestationalWeek('2026-01-01', '2026-10-08'), { weeks: 40, days: 0 });
});

test('daysToDue computes days until due date', () => {
  const due = calcDueDate('2026-01-01'); // 2026-10-08
  assert.strictEqual(daysToDue(due, '2026-01-01'), 280);
  assert.strictEqual(daysToDue('2026-10-08', '2026-10-08'), 0);
  // Overdue -> negative
  assert.strictEqual(daysToDue('2026-01-01', '2026-01-15'), -14);
});

test('estimateLmp derives LMP from conception date and cycle length', () => {
  // 28-day cycle: conception is 14 days after LMP
  assert.strictEqual(formatDate(estimateLmp('2026-01-15', 28)), '2026-01-01');
  // 30-day cycle: conception is 16 days after LMP
  assert.strictEqual(formatDate(estimateLmp('2026-01-17', 30)), '2026-01-01');
  // Defaults to 28 when cycle length is missing/invalid
  assert.strictEqual(formatDate(estimateLmp('2026-01-15')), '2026-01-01');
  // Invalid conception -> null
  assert.strictEqual(estimateLmp('bad', 28), null);
});

test('formatDate renders YYYY-MM-DD and rejects invalid', () => {
  assert.strictEqual(formatDate(new Date(2026, 0, 1)), '2026-01-01');
  assert.strictEqual(formatDate(new Date('invalid')), '');
  assert.strictEqual(formatDate(null), '');
});
