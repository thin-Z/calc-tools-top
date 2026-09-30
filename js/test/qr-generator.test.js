/* qr-generator 单测（fake-DOM harness，零源码改动）
 * 第三方库 QRCode 用桩替换后，可测的真实逻辑分支：空内容与纯空白内容报错、
 * 三档尺寸映射（small 200 / medium 300 / large 400 / 未知回退 300）、
 * 四档纠错级别映射（L/M/Q/H，未知回退 M）、容器清空、下载按钮绑定、
 * resetForm 清空。二维码位图本身由第三方库产出，不在本单测断言范围内。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

/** 构造 QRCode 桩：记录每次 new QRCode(el, opts) 的选项。 */
function qrStub() {
  const calls = [];
  function QRCode(el, opts) {
    calls.push({ el, opts });
  }
  // 取值与 qrcode.js 一致：L=1, M=0, Q=3, H=2
  QRCode.CorrectLevel = { L: 1, M: 0, Q: 3, H: 2 };
  return { QRCode, calls };
}

function build() {
  const stub = qrStub();
  const c = loadCalculator('qr-generator', { globals: { QRCode: stub.QRCode } });
  return { c, calls: stub.calls, QRCode: stub.QRCode };
}

test('二维码: 内容为空或纯空白 -> showError 且不调用 QRCode', () => {
  const a = build();
  a.c.run({ qrText: '', qrSize: 'medium', qrECLevel: 'M' });
  assert.ok(a.c.error());
  assert.match(a.c.error(), /请输入内容|enter content/);
  assert.strictEqual(a.calls.length, 0);

  const b = build();
  b.c.run({ qrText: '   ', qrSize: 'medium', qrECLevel: 'M' });
  assert.ok(b.c.error(), '纯空白应视为空内容');
  assert.strictEqual(b.calls.length, 0);
});

test('二维码: 尺寸映射 small/medium/large 与未知值回退', () => {
  const small = build();
  small.c.run({ qrText: 'hello', qrSize: 'small', qrECLevel: 'M' });
  assert.strictEqual(small.calls[0].opts.width, 200);
  assert.strictEqual(small.calls[0].opts.height, 200);

  const medium = build();
  medium.c.run({ qrText: 'hello', qrSize: 'medium', qrECLevel: 'M' });
  assert.strictEqual(medium.calls[0].opts.width, 300);

  const large = build();
  large.c.run({ qrText: 'hello', qrSize: 'large', qrECLevel: 'M' });
  assert.strictEqual(large.calls[0].opts.width, 400);

  const unknown = build();
  unknown.c.run({ qrText: 'hello', qrSize: 'huge', qrECLevel: 'M' });
  assert.strictEqual(unknown.calls[0].opts.width, 300);
});

test('二维码: 纠错级别映射 L/M/Q/H 与未知值回退 M', () => {
  const levels = { L: 1, M: 0, Q: 3, H: 2 };
  Object.keys(levels).forEach((key) => {
    const b = build();
    b.c.run({ qrText: 'hello', qrSize: 'medium', qrECLevel: key });
    assert.strictEqual(b.calls[0].opts.correctLevel, levels[key], '纠错级别 ' + key);
  });
  const unknown = build();
  unknown.c.run({ qrText: 'hello', qrSize: 'medium', qrECLevel: 'Z' });
  assert.strictEqual(unknown.calls[0].opts.correctLevel, 0);
});

test('二维码: 传入文本去空格、容器被清空、结果区显示、下载按钮已绑定', () => {
  const b = build();
  b.c.run({ qrText: '  https://calc-tools.top  ', qrSize: 'large', qrECLevel: 'H' });
  assert.strictEqual(b.calls[0].opts.text, 'https://calc-tools.top');
  assert.strictEqual(b.calls[0].opts.colorDark, '#000000');
  assert.strictEqual(b.calls[0].opts.colorLight, '#ffffff');
  assert.strictEqual(b.calls[0].el.id, 'qrcode');
  assert.strictEqual(b.c.html('qrcode'), '', '生成前容器应被清空');
  assert.strictEqual(b.c.hasClass('resultArea', 'hidden'), false, '结果区应显示');
  assert.strictEqual(typeof b.c.get('downloadQR').onclick, 'function');
  // 容器无 canvas 时点击下载应静默不抛错
  assert.doesNotThrow(() => b.c.get('downloadQR').onclick());
});

test('二维码: resetForm 清空输入与容器并隐藏结果区', () => {
  const b = build();
  b.c.run({ qrText: 'hello', qrSize: 'medium', qrECLevel: 'M' });
  b.c.reset();
  assert.strictEqual(b.c.get('qrText').value, '');
  assert.strictEqual(b.c.html('qrcode'), '');
  assert.strictEqual(b.c.hasClass('resultArea', 'hidden'), true);
});
