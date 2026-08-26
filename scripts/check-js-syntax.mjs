#!/usr/bin/env node
/**
 * scripts/check-js-syntax.mjs — JS 语法门禁（复核缺陷 1 防御）
 * -----------------------------------------------------------------
 * 对 dist/js/ 下所有 JS 文件执行 node --check 语法校验。
 * 防止 emoji→SVG 替换等操作破坏 JS 语法后静默逃逸。
 *
 * 用法：node scripts/check-js-syntax.mjs [--json]
 * 退出码：0 = 全绿；1 = 存在语法错误。
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const jsonMode = process.argv.includes('--json');

const failures = [];
let checked = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) {
      checked++;
      try {
        execFileSync(process.execPath, ['--check', full], { stdio: 'pipe', cwd: ROOT });
      } catch (e) {
        const rel = path.relative(ROOT, full).split(path.sep).join('/');
        const stderr = e.stderr ? e.stderr.toString().split('\n').slice(0, 3).join(' | ') : '';
        failures.push({ file: rel, error: stderr });
      }
    }
  }
}

walk(DIST);

if (jsonMode) {
  process.stdout.write(JSON.stringify({ checked, failures: failures.length, details: failures }, null, 2) + '\n');
} else {
  console.log(`[js-syntax] 检查 ${checked} 个 JS 文件`);
  if (failures.length) {
    failures.forEach(f => console.log(`  ✗ ${f.file}: ${f.error}`));
    console.log(`\n[js-syntax] ❌ ${failures.length} 个文件语法错误`);
  } else {
    console.log(`[js-syntax] ✅ 全部通过`);
  }
}

process.exit(failures.length > 0 ? 1 : 0);
