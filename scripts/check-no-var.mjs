#!/usr/bin/env node
/**
 * scripts/check-no-var.mjs — 站点脚本中 var 声明计数（P1P2-11 / 断言 [15]）
 * -----------------------------------------------------------------
 * 口径：统计 \bvar\s（var 后跟空白）的出现次数，覆盖声明与 for(var ...) 形式。
 * 目标文件：js/site.js（已删除则跳过）、js/site-core.js、js/site-home.js。
 * 目的：站点脚本 var 全部重构为 const/let 后，本脚本作为机械性兜底断言
 * （verify-site [15] 与 T03 每批验证均调用）。
 *
 * 用法：
 *   node scripts/check-no-var.mjs            # 打印计数；>0 时退出码 1
 *   node scripts/check-no-var.mjs --json     # 输出 JSON { count, files }
 *
 * 退出码：0 = 全部无 var；1 = 仍存在 var（供 verify-site / CI 使用）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = ['js/site.js', 'js/site-core.js', 'js/site-home.js'].map((p) => path.join(ROOT, p));
const jsonMode = process.argv.includes('--json');

let total = 0;
const perFile = [];
for (const target of TARGETS) {
  if (!fs.existsSync(target)) continue; // site.js 在 T05 拆分后已删除，合法跳过
  const src = fs.readFileSync(target, 'utf8');
  const count = (src.match(/\bvar\s+/g) || []).length;
  perFile.push({ file: path.relative(ROOT, target).split(path.sep).join('/'), count });
  total += count;
}

if (jsonMode) {
  process.stdout.write(JSON.stringify({ count: total, files: perFile }, null, 2) + '\n');
} else {
  const detail = perFile.map((f) => `${f.file}=${f.count}`).join(', ') || '(site.js 已删除 / 无目标文件)';
  console.log(`[check-no-var] var 计数 = ${total}（${detail}）${total === 0 ? ' ✓' : ''}`);
}

process.exit(total > 0 ? 1 : 0);
