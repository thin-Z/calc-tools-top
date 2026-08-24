/**
 * 应用 SEO title/description 优化映射
 * 读取 seo-map.json → 批量替换各 HTML 的 <title> 与 meta description
 * 用法: node scripts/apply-seo-map.mjs <map.json> [--dry-run]
 * 保持 LF 行尾与 BOM 状态,不动其他内容
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';

const ROOT = resolve('.');
const mapPath = process.argv[2];
if (!mapPath || !existsSync(mapPath)) { console.error('用法: node apply-seo-map.mjs <map.json> [--dry-run]'); process.exit(1); }
const DRY = process.argv.includes('--dry-run');

const map = JSON.parse(readFileSync(mapPath, 'utf8'));

// 递归收集 html
function collectHtml(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'dist' || e.name === '.git' || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) collectHtml(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const files = collectHtml(ROOT);
let tChanged = 0, dChanged = 0, total = 0;

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const entry = map[rel];
  if (!entry) continue;
  total++;

  const bytes = readFileSync(f);
  const hasBom = bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
  let html = bytes.toString('utf8');
  if (hasBom) html = html.replace(/^\uFEFF/, '');
  const orig = html;

  if (entry.title) {
    const reTitle = /<title>[\s\S]*?<\/title>/;
    if (reTitle.test(html)) { html = html.replace(reTitle, `<title>${entry.title}</title>`); tChanged++; }
  }
  if (entry.description) {
    const reDesc = /<meta name="description" content="[^"]*"\s*>/;
    if (reDesc.test(html)) { html = html.replace(reDesc, `<meta name="description" content="${entry.description}">`); dChanged++; }
  }

  if (html !== orig) {
    if (!DRY) {
      let out = html;
      if (hasBom) out = '\uFEFF' + out;
      writeFileSync(f, out, 'utf8');
    }
    console.log(`${DRY ? '[dry]' : '[ok]'} ${rel} ${entry.title ? 'title✓' : ''}${entry.description ? ' desc✓' : ''}`);
  }
}

console.log(`\n共 ${total} 页有映射; title 修改 ${tChanged} 页, description 修改 ${dChanged} 页${DRY ? ' (dry-run 未写盘)' : ''}`);
