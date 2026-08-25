// 临时验证：模拟 toolSearchBlob 匹配逻辑，确认拼音/首字母命中正确工具
const fs = require('fs');
const ROOT = 'D:/_Careate.Program/calculator-site';

// 载入生成的拼音索引
const pinSrc = fs.readFileSync(ROOT + '/js/tool-pinyin.js', 'utf8');
const pinJson = pinSrc.slice(pinSrc.indexOf('{'), pinSrc.lastIndexOf('}') + 1);
const PIN = JSON.parse(pinJson);

const tools = JSON.parse(fs.readFileSync(ROOT + '/tools.json', 'utf8'));

// 模拟卡片：取 tools.json 的 zh name/desc/kw + pinyin
function buildBlob(t) {
  const zh = t.zh || {};
  const name = (zh.name || '').toLowerCase();
  const desc = (zh.desc || '').toLowerCase();
  const kw = (zh.kw || '').toLowerCase();
  const pin = PIN[t.slug] || { py: '', ini: '' };
  return (name + ' ' + desc + ' ' + kw + ' ' + pin.py + ' ' + pin.ini).toLowerCase();
}
const blobs = tools.map(t => ({ slug: t.slug, blob: buildBlob(t) }));

const cases = ['fd', 'daikuan', 'bmi', 'geren', 'shui', 'gongjijin', 'nianling', 'jiage', 'qr', 'base64', 'rongli', 'jisuan'];
let pass = 0, fail = 0;
for (const q of cases) {
  const hits = blobs.filter(b => b.blob.includes(q.toLowerCase())).map(b => b.slug);
  const ok = hits.length > 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  "${q}" -> [${hits.join(', ')}]`);
  ok ? pass++ : fail++;
}
console.log(`\n总计: ${pass} 通过, ${fail} 失败`);
process.exit(fail ? 1 : 0);
