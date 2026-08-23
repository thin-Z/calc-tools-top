#!/usr/bin/env node
/**
 * scripts/check-no-var.mjs — js/site.js 中 var 声明计数（P1P2-11 / 断言 [15]）
 * -----------------------------------------------------------------
 * 口径：统计 \bvar\s（var 后跟空白）的出现次数，覆盖声明与 for(var ...) 形式。
 * 目的：site.js 从 144 处 var 逐步重构为 const/let 后，本脚本作为机械性兜底
 * 断言（verify-site [15] 与 T03 每批验证均调用）。
 *
 * 用法：
 *   node scripts/check-no-var.mjs            # 打印计数；>0 时退出码 1
 *   node scripts/check-no-var.mjs --json     # 输出 JSON { count, file }
 *
 * 退出码：0 = 无 var；1 = 仍存在 var（供 verify-site / CI 使用）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(ROOT, 'js', 'site.js');
const jsonMode = process.argv.includes('--json');

if (!fs.existsSync(TARGET)) {
  console.error(`[check-no-var] 未找到 ${path.relative(ROOT, TARGET)}`);
  process.exit(1);
}

const src = fs.readFileSync(TARGET, 'utf8');
const matches = src.match(/\bvar\s+/g) || [];
const count = matches.length;

if (jsonMode) {
  process.stdout.write(JSON.stringify({ count, file: 'js/site.js' }, null, 2) + '\n');
} else {
  console.log(`[check-no-var] js/site.js var 计数 = ${count}${count === 0 ? ' ✓' : ''}`);
}

process.exit(count > 0 ? 1 : 0);
