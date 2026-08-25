/**
 * 提交前修复: 将变更 HTML 的行尾转回 LF、BOM 对齐 HEAD
 * 用法: node scripts/fix-eol-bom.mjs
 */
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = process.cwd();
const files = execSync('git diff --name-only', { encoding: 'utf8', cwd: ROOT })
  .split('\n').map(s => s.trim()).filter(s => s.endsWith('.html'));
let fixed = 0;
for (const f of files) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  const gf = f.replace(/\\/g, '/');
  let headBom = false;
  try {
    const blob = execSync(`git rev-parse "HEAD:${gf}"`, { encoding: 'utf8', cwd: ROOT }).trim();
    const buf = execSync(`git cat-file blob ${blob}`, { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024, cwd: ROOT });
    headBom = buf.length >= 3 && buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
  } catch (e) { continue; }
  const wb = fs.readFileSync(p);
  const wBom = wb.length >= 3 && wb[0] === 0xEF && wb[1] === 0xBB && wb[2] === 0xBF;
  let content = wb.toString('utf8');
  if (content.startsWith('\uFEFF')) content = content.slice(1);
  const hasCrlf = content.includes('\r\n');
  if (!hasCrlf && headBom === wBom) continue;
  content = content.replace(/\r\n/g, '\n');
  const out = headBom ? '\uFEFF' + content : content;
  fs.writeFileSync(p, out, 'utf8');
  fixed++;
  console.log('fixed:', f, '(CRLF=' + hasCrlf + ', BOM HEAD=' + headBom + ' WORK=' + wBom + ')');
}
console.log('共修复', fixed, '个文件');
