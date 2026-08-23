/* Tests for js/calculators/color-contrast.js (P1P2-03, P1P2-13).
 * Runs under `node --test`. Sets global.window so the IIFE exposes its functions. */
const test = require('node:test');
const assert = require('node:assert');

globalThis.window = globalThis;

require('../calculators/color-contrast.js');

test('window API is exposed', () => {
  ['hexToRgb', 'relativeLuminance', 'contrastRatio', 'evaluateContrast'].forEach((fn) => {
    assert.strictEqual(typeof window[fn], 'function', fn + ' should be a function');
  });
  assert.strictEqual(typeof window.colorContrast, 'object');
});

test('hexToRgb parses #RGB and #RRGGBB and rejects invalid', () => {
  assert.deepStrictEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
  assert.deepStrictEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
  assert.deepStrictEqual(hexToRgb('#1a2b3c'), { r: 0x1a, g: 0x2b, b: 0x3c });
  assert.deepStrictEqual(hexToRgb('1a2b3c'), { r: 0x1a, g: 0x2b, b: 0x3c });
  assert.strictEqual(hexToRgb('xyz'), null);
  assert.strictEqual(hexToRgb('#12'), null);
  assert.strictEqual(hexToRgb(''), null);
  assert.strictEqual(hexToRgb(null), null);
});

test('relativeLuminance: black = 0, white = 1', () => {
  assert.strictEqual(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
  assert.ok(Math.abs(relativeLuminance({ r: 255, g: 255, b: 255 }) - 1) < 1e-6);
});

test('contrastRatio black/white = 21, same colors = 1', () => {
  assert.ok(Math.abs(contrastRatio('#000000', '#ffffff') - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio('#ffffff', '#000000') - 21) < 0.01);
  assert.ok(Math.abs(contrastRatio('#888888', '#888888') - 1) < 0.01);
  assert.strictEqual(contrastRatio('invalid', '#ffffff'), 0);
});

test('evaluateContrast judges AA/AAA thresholds', () => {
  const blackOnWhite = evaluateContrast('#000000', '#ffffff');
  assert.strictEqual(blackOnWhite.ratio, 21);
  assert.strictEqual(blackOnWhite.passAA, true);
  assert.strictEqual(blackOnWhite.passAAA, true);

  // #777777 on #ffffff ≈ 4.48 → AA fail, AA-large pass
  const grayOnWhite = evaluateContrast('#777777', '#ffffff');
  assert.ok(grayOnWhite.ratio < 4.5, 'gray ratio should be < 4.5');
  assert.strictEqual(grayOnWhite.passAA, false);
  assert.strictEqual(grayOnWhite.passAALarge, true);

  // 3:1 boundary → AA-large pass, AA fail
  const threeToOne = evaluateContrast('#767676', '#ffffff');
  assert.strictEqual(threeToOne.passAALarge, true);

  // invalid input
  const invalid = evaluateContrast('nope', '#ffffff');
  assert.strictEqual(invalid.valid, false);
});
