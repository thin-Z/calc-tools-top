#!/usr/bin/env node
/**
 * check-doc-sync.mjs — 检查文档与代码的同步状态
 *
 * 检查项：
 *   1. README.md 脚本表中的**活跃**脚本（无删除线）必须存在于 scripts/
 *   2. README.md 脚本表中的**归档**脚本（`~~名字~~` 删除线）必须存在于 scripts/archive/
 *   3. scripts/ 下的每个脚本必须在 README.md 脚本表中作为活跃项列出（防"新脚本不进文档"漂移）
 *   4. 关键配置一致性（vercel.json buildCommand / build.mjs 关键函数 / verify-site 断言块数量）
 *
 * 归档约定：脚本移入 scripts/archive/ 后，README 对应行须写成
 *   | ~~`xxx.py`~~ | ~~说明~~（归档） | `python scripts/archive/xxx.py` |
 * 这样文档保留历史线索，同时门禁能区分"已归档"与"文档漂移"。
 * （2026-08-30 修：旧版解析器不识别删除线，把 4 个已正确标注归档的条目误报为
 *   "README 列出的脚本不存在"，导致 exit=1 长期为假阳性。）
 *
 * 用法：node scripts/check-doc-sync.mjs
 * 退出码：0 = 同步；1 = 存在漂移
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = path.join(ROOT, 'README.md');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');
const ARCHIVE_DIR = path.join(SCRIPTS_DIR, 'archive');
const SCRIPT_EXT = /\.(mjs|js|ps1|py|sh)$/;
const MIN_VERIFY_ASSERTIONS = 25;

const failures = [];
function fail(msg) { failures.push(msg); }

// ---------- 1. 解析 README 脚本表（区分活跃 / 归档） ----------
console.log('[1] 解析 README.md 脚本表...');
const readme = fs.readFileSync(README_PATH, 'utf8');
const activeScripts = new Set();
const archivedScripts = new Set();

for (const line of readme.split('\n')) {
  const t = line.trimStart();
  if (!t.startsWith('|')) continue;
  const firstColumn = t.match(/^\|\s*(.+?)\s*\|/);
  if (!firstColumn) continue;
  const col = firstColumn[1];
  // 归档标记：整段被 ~~...~~ 包裹（可能有多个 ~~`a.py`~~ / ~~`b.py`~~）
  const strikeSegments = col.match(/~~[^~]*~~/g) || [];
  const strikeNames = new Set();
  for (const seg of strikeSegments) {
    for (const m of seg.match(/`([^`]+)`/g) || []) {
      const name = m.replace(/`/g, '');
      if (SCRIPT_EXT.test(name)) strikeNames.add(name);
    }
  }
  for (const m of col.match(/`([^`]+)`/g) || []) {
    const name = m.replace(/`/g, '');
    if (!SCRIPT_EXT.test(name)) continue;
    if (strikeNames.has(name)) archivedScripts.add(name);
    else activeScripts.add(name);
  }
}
console.log(`  活跃 ${activeScripts.size} 个 / 归档 ${archivedScripts.size} 个`);

// ---------- 2. 实际磁盘脚本 ----------
const actual = new Set(fs.readdirSync(SCRIPTS_DIR).filter((f) => SCRIPT_EXT.test(f)));
const archived = fs.existsSync(ARCHIVE_DIR)
  ? new Set(fs.readdirSync(ARCHIVE_DIR).filter((f) => SCRIPT_EXT.test(f)))
  : new Set();
console.log(`  scripts/ ${actual.size} 个 / scripts/archive/ ${archived.size} 个`);

// ---------- 3. 三向比对 ----------
console.log('\n[2] 比对 README ↔ scripts/ ↔ scripts/archive/ ...');
for (const s of [...activeScripts].sort()) {
  if (actual.has(s)) continue;
  if (archived.has(s)) {
    fail(`README 把已归档脚本当作活跃项列出: ${s}（实际在 scripts/archive/，应改为 ~~\`${s}\`~~ 并标注归档）`);
  } else {
    fail(`README 列出的脚本不存在: scripts/${s}`);
  }
}
for (const s of [...archivedScripts].sort()) {
  if (archived.has(s)) continue;
  if (actual.has(s)) fail(`README 把仍在使用的脚本标为归档: ${s}（实际在 scripts/，应去掉删除线）`);
  else fail(`README 标为归档的脚本在 scripts/archive/ 中不存在: ${s}`);
}
const missingInReadme = [...actual].filter((s) => !activeScripts.has(s)).sort();
for (const s of missingInReadme) {
  fail(`scripts/${s} 未在 README.md 脚本表中列出（新增脚本须同步文档）`);
}
if (!failures.length) console.log('  ✓ 三向一致');

const undocArchive = [...archived].filter((s) => !archivedScripts.has(s) && s !== 'README.md').sort();
if (undocArchive.length) {
  console.log(`  ℹ scripts/archive/ 中 ${undocArchive.length} 个脚本未在 README 留归档条目（不阻断）: ${undocArchive.join(', ')}`);
}

// ---------- 4. 关键配置 ----------
console.log('\n[3] 检查关键配置文件...');
const vercelPath = path.join(ROOT, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  if (vercel.buildCommand !== 'node scripts/build.mjs') {
    fail(`vercel.json buildCommand 不匹配: "${vercel.buildCommand}"（期望 "node scripts/build.mjs"）`);
  } else {
    console.log('  vercel.json buildCommand ✓');
  }
} else {
  fail('vercel.json 不存在');
}

const buildPath = path.join(SCRIPTS_DIR, 'build.mjs');
if (fs.existsSync(buildPath)) {
  const build = fs.readFileSync(buildPath, 'utf8');
  for (const fn of ['copyDir', 'walkHtml', 'ensureCharsetFirst', 'lazyImages', 'inlineNoneToHidden']) {
    if (!build.includes(`function ${fn}`) && !build.includes(`${fn} =`)) {
      fail(`build.mjs 缺少关键函数: ${fn}`);
    }
  }
  console.log('  build.mjs 关键函数 ✓');
} else {
  fail('build.mjs 不存在');
}

// verify-site 断言数量：统计编号块 `// ---------- N. xxx ----------`
// （旧版用 /assert/gi 词频统计，与真实断言数无关，长期显示 "9"）
const verifyPath = path.join(SCRIPTS_DIR, 'verify-site.mjs');
if (fs.existsSync(verifyPath)) {
  const verify = fs.readFileSync(verifyPath, 'utf8');
  const blocks = verify.match(/^\/\/ -{2,} *(\d+)\./gm) || [];
  const count = new Set(blocks.map((b) => b.match(/(\d+)\./)[1])).size;
  if (count < MIN_VERIFY_ASSERTIONS) {
    fail(`verify-site.mjs 断言块数量回退: ${count}（期望至少 ${MIN_VERIFY_ASSERTIONS}，门禁不得被删）`);
  } else {
    console.log(`  verify-site.mjs 断言块数量: ${count} ✓`);
  }
  // README 声称的断言数须与实际一致
  const claimed = readme.match(/verify-site\.mjs['`]?[^|\n]{0,40}?(\d+)\s*项断言/);
  const claimed2 = readme.match(/集成校验\s*\*\*(\d+)\s*项断言\*\*/);
  const nums = [claimed && claimed[1], claimed2 && claimed2[1]].filter(Boolean).map(Number);
  for (const n of nums) {
    if (n !== count) fail(`README 声称 verify-site "${n} 项断言"，实际 ${count} 项（文档漂移）`);
  }
  if (nums.length) console.log(`  README 断言数声明与实际一致 (${count}) ✓`);
} else {
  fail('verify-site.mjs 不存在');
}

// ---------- 5. 汇总 ----------
console.log('\n========== 检查结果 ==========');
if (failures.length) {
  console.error(`❌ 发现 ${failures.length} 个问题:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✅ check-doc-sync: 文档与代码同步（README ↔ scripts ↔ archive ↔ 配置）');
