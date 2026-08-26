/* Tests for js/calculators/timestamp.js (Window 2, B1 tool).
 * Runs under `node --test`. Sets global.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/timestamp.js');

test('window API is exposed', () => {
  ['detectUnit', 'tsToDate', 'dateToTs', 'formatDate'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.timestamp, 'object');
});

test('detectUnit distinguishes seconds vs milliseconds', () => {
  assert.strictEqual(detectUnit('1600000000'), 's');
  assert.strictEqual(detectUnit('1600000000000'), 'ms');
  assert.strictEqual(detectUnit(1600000000), 's');
  assert.strictEqual(detectUnit('abc'), null);
  assert.strictEqual(detectUnit(''), null);
  assert.strictEqual(detectUnit(null), null);
});

test('tsToDate converts epoch to Date (seconds and ms)', () => {
  const d1 = tsToDate(0);
  assert.ok(d1 instanceof Date);
  assert.strictEqual(d1.getTime(), 0); // 1970-01-01T00:00:00Z

  const d2 = tsToDate('1600000000');
  assert.strictEqual(d2.getTime(), 1600000000 * 1000);

  const d3 = tsToDate('1600000000000');
  assert.strictEqual(d3.getTime(), 1600000000 * 1000);

  assert.strictEqual(tsToDate('invalid'), null);
  assert.strictEqual(tsToDate(null), null);
});

test('dateToTs returns seconds and ms and rejects invalid', () => {
  const d = new Date(1600000000 * 1000);
  const t = dateToTs(d);
  assert.strictEqual(t.sec, 1600000000);
  assert.strictEqual(t.ms, 1600000000 * 1000);
  assert.strictEqual(dateToTs(new Date('invalid')), null);
  assert.strictEqual(dateToTs(null), null);
});

test('formatDate renders local and UTC strings', () => {
  const d = new Date(Date.UTC(2026, 7, 26, 10, 30, 0)); // 2026-08-26T10:30:00Z
  const utc = formatDate(d, true);
  assert.ok(utc.startsWith('2026-08-26 10:30:00'), 'UTC string should start with epoch time, got ' + utc);
  const local = formatDate(d, false);
  assert.ok(typeof local === 'string' && local.length > 0, 'local string should be non-empty');
  assert.strictEqual(formatDate(new Date('invalid'), false), '');
  assert.strictEqual(formatDate(null, false), '');
});
