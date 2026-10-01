/* unit-converter 单测（fake-DOM harness，零源码改动）
 * 入口函数是 doConvert（非 doCalculate）。覆盖分支：七类倍率表换算
 * （长度/重量/面积/体积/速度/数据量/时间）、温度带偏移公式（C/F/K 六向）、
 * 结果文案 resultLabel、空值与非法字符报错（零值为合法输入）、updateUnits 刷新单位选项
 * 并把「到」单位落到第二项后重新换算。
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadCalculator } = require('./calc-dom-harness.cjs');

/** 单位换算入口是 doConvert。 */
function convert(values) {
  return loadCalculator('unit-converter', { entry: 'doConvert' }).run(values);
}

test('单位换算: 长度 1 m -> cm = 100；1 mile -> km = 1.6093', () => {
  const a = convert({ inputValue: 1, category: 'length', fromUnit: 'm', toUnit: 'cm' });
  assert.strictEqual(a.text('resultValue'), '100.0000');
  assert.strictEqual(a.text('resultLabel'), '1 m = 100.0000 cm');

  const b = convert({ inputValue: 1, category: 'length', fromUnit: 'mile', toUnit: 'km' });
  // 手算: 1609344 / 1000000 = 1.609344 -> 1.6093
  assert.strictEqual(b.text('resultValue'), '1.6093');
});

test('单位换算: 重量 1 lb -> kg = 0.4536；1 kg -> lb = 2.2046', () => {
  const a = convert({ inputValue: 1, category: 'weight', fromUnit: 'lb', toUnit: 'kg' });
  // 手算: 453592 / 1000000 = 0.453592 -> 0.4536
  assert.strictEqual(a.text('resultValue'), '0.4536');
  const b = convert({ inputValue: 1, category: 'weight', fromUnit: 'kg', toUnit: 'lb' });
  // 手算: 1000000 / 453592 = 2.2046226 -> 2.2046
  assert.strictEqual(b.text('resultValue'), '2.2046');
});

test('单位换算: 温度 C/F/K 六向换算（带偏移，非倍率）', () => {
  // 100°C -> °F = 100*9/5+32 = 212
  assert.strictEqual(
    convert({ inputValue: 100, category: 'temp', fromUnit: 'c', toUnit: 'f' }).text('resultValue'),
    '212.0000'
  );
  // 100°F -> °C = (100-32)*5/9 = 37.7778
  assert.strictEqual(
    convert({ inputValue: 100, category: 'temp', fromUnit: 'f', toUnit: 'c' }).text('resultValue'),
    '37.7778'
  );
  // 25°C -> K = 298.15
  assert.strictEqual(
    convert({ inputValue: 25, category: 'temp', fromUnit: 'c', toUnit: 'k' }).text('resultValue'),
    '298.1500'
  );
  // 300 K -> °C = 26.85
  assert.strictEqual(
    convert({ inputValue: 300, category: 'temp', fromUnit: 'k', toUnit: 'c' }).text('resultValue'),
    '26.8500'
  );
  // 32°F -> K: 先转 C = 0，再加 273.15 = 273.15
  assert.strictEqual(
    convert({ inputValue: 32, category: 'temp', fromUnit: 'f', toUnit: 'k' }).text('resultValue'),
    '273.1500'
  );
  // 同单位换算应保持原值
  assert.strictEqual(
    convert({ inputValue: 36.6, category: 'temp', fromUnit: 'c', toUnit: 'c' }).text('resultValue'),
    '36.6000'
  );
});

test('单位换算: 数据量 / 时间 / 体积 / 面积 / 速度 倍率表', () => {
  // 1 GB = 1024 MB（1024 进制）
  assert.strictEqual(
    convert({ inputValue: 1, category: 'data', fromUnit: 'GB', toUnit: 'MB' }).text('resultValue'),
    '1024.0000'
  );
  // 1 小时 = 60 分钟
  assert.strictEqual(
    convert({ inputValue: 1, category: 'time', fromUnit: 'hr', toUnit: 'min' }).text('resultValue'),
    '60.0000'
  );
  // 1 天 = 86400 秒
  assert.strictEqual(
    convert({ inputValue: 1, category: 'time', fromUnit: 'day', toUnit: 's' }).text('resultValue'),
    '86400.0000'
  );
  // 1 美制加仑 = 3.7854 升
  assert.strictEqual(
    convert({ inputValue: 1, category: 'volume', fromUnit: 'gallon', toUnit: 'l' }).text('resultValue'),
    '3.7854'
  );
  // 1 公顷 = 10000 平方米；1 亩 = 666.67 平方米
  assert.strictEqual(
    convert({ inputValue: 1, category: 'area', fromUnit: 'ha', toUnit: 'm2' }).text('resultValue'),
    '10000.0000'
  );
  assert.strictEqual(
    convert({ inputValue: 1, category: 'area', fromUnit: 'mu', toUnit: 'm2' }).text('resultValue'),
    '666.6700'
  );
  // 1 mph = 1.6093 km/h
  assert.strictEqual(
    convert({ inputValue: 1, category: 'speed', fromUnit: 'mph', toUnit: 'kmh' }).text('resultValue'),
    '1.6093'
  );
});

test('单位换算: 空值 / 非法字符 -> showError；零值正常换算（10-01 修 S19 ②）', () => {
  const base = { category: 'length', fromUnit: 'm', toUnit: 'cm' };
  assert.ok(convert(Object.assign({}, base, { inputValue: '' })).error(), '空值应报错');
  assert.ok(convert(Object.assign({}, base, { inputValue: 'abc' })).error(), '非法字符应报错');
  assert.match(convert(Object.assign({}, base, { inputValue: '' })).error(), /请输入数值/);
  // 修复前 `if (!val)` 把 0 当空值 → 输入 0 误报「请输入数值」
  const zero = convert(Object.assign({}, base, { inputValue: 0 }));
  assert.strictEqual(zero.error(), null, '零值不应报错');
  assert.strictEqual(zero.text('resultValue'), '0.0000');
  // 0°C -> °F = 32（温度偏移分支同样必须接受 0）
  const zf = convert({ inputValue: 0, category: 'temp', fromUnit: 'c', toUnit: 'f' });
  assert.strictEqual(zf.error(), null);
  assert.strictEqual(zf.text('resultValue'), '32.0000');
  // 负值本就应可换算（-40°C -> °F = -40）
  const nf = convert({ inputValue: -40, category: 'temp', fromUnit: 'c', toUnit: 'f' });
  assert.strictEqual(nf.text('resultValue'), '-40.0000');
});

test('单位换算: updateUnits 刷新单位选项并把「到」单位落到第二项', () => {
  const c = loadCalculator('unit-converter').call('updateUnits', {
    category: 'temp', inputValue: 100, fromUnit: 'c',
  });
  assert.strictEqual(c.get('toUnit').value, 'f');
  assert.match(c.html('fromUnit'), /摄氏度/);
  assert.match(c.html('fromUnit'), /开尔文/);
  assert.strictEqual((c.html('fromUnit').match(/<option/g) || []).length, 3);
  // 100°C -> °F = 212
  assert.strictEqual(c.text('resultValue'), '212.0000');

  const len = loadCalculator('unit-converter').call('updateUnits', {
    category: 'length', inputValue: 1, fromUnit: 'm',
  });
  assert.strictEqual(len.get('toUnit').value, 'cm');
  assert.strictEqual((len.html('toUnit').match(/<option/g) || []).length, 8);
  assert.strictEqual(len.text('resultValue'), '100.0000');
});

test('单位换算: resetForm 清空输入', () => {
  const c = convert({ inputValue: 1, category: 'length', fromUnit: 'm', toUnit: 'cm' });
  c.reset();
  assert.strictEqual(c.get('inputValue').value, '');
});
