#!/usr/bin/env node
/**
 * scripts/check-dist-hygiene.mjs — dist 卫生门禁（迭代一 S 系列收尾 / 防 P0-3 复发）
 * -----------------------------------------------------------------
 * 断言 dist/ 中不得含以下「不应进入生产产物的文件/目录」：
 *   1. 目录 `.workbuddy/`        —— 本地智能体工作区（含一次性脚本/快照）
 *   2. 目录 `e2e/`               —— E2E 测试源码（tools.spec.mjs 等）
 *   3. 目录 `test-results/`      —— 测试产物与探针输出
 *   4. 任何以 `__` 命名的文件/目录 —— 临时/探针（__a11y_probe.mjs / __perf-results.json）
 *   5. dist 根级 `*.mjs`         —— 疑似配置/脚本泄漏（如 playwright.config.mjs）
 *   6. dist 根级 `*.json`        —— 疑似源码配置泄漏（如 package.json / tsconfig.json）
 *
 * ⚠️ 白名单（运行时必需，必须保留在 dist 根）：
 *   - `manifest.json`  —— PWA 清单，HTML 经 <link rel="manifest" href="/manifest.json"> 引用
 *   - `tools.json`     —— js/embed.js:38 运行时 fetch('/tools.json') 解析工具目录（embed widget 依赖）
 *   二者为迭代计划 line 97 原「禁 root *.json / 禁 tools.json」之**修正**：原写法会让 verify
 *   永久失败或破坏线上 embed/PWA，故以白名单放行（实测为准，见 iter-plan 修正记录）。
 *
 * 用法：node scripts/check-dist-hygiene.mjs
 * 退出码：0 = dist 卫生；非 0 = 存在泄漏文件
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// 任意层级禁止出现的目录名
const FORBIDDEN_DIRS = new Set(['.workbuddy', 'e2e', 'test-results']);
// dist 根级允许保留的 .json（运行时必需，详见文件头注释）
const ROOT_JSON_ALLOW = new Set(['manifest.json', 'tools.json']);

const violations = [];

function walk(dir, rel) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const name = entry.name;
    const full = path.join(dir, name);
    const relPath = rel ? `${rel}/${name}` : name;
    const depth = relPath.split('/').length;

    // 4. 临时/探针（__*）任意层级禁止
    if (name.startsWith('__')) {
      violations.push(`临时/探针文件泄漏 (__*): ${relPath}`);
      continue; // 文件或目录均不再下钻，避免噪声叠加
    }

    // 1/2/3. 禁止目录（任意层级）—— 命中即记录并不再下钻
    if (entry.isDirectory() && FORBIDDEN_DIRS.has(name)) {
      violations.push(`禁止目录泄漏: ${relPath}/`);
      continue;
    }

    if (entry.isDirectory()) {
      walk(full, relPath);
      continue;
    }

    // 5/6. 仅检查 dist 根级（depth===1）的文件
    if (depth === 1) {
      if (name.endsWith('.mjs')) {
        violations.push(`根级 .mjs 泄漏(疑似配置/脚本): ${relPath}`);
      } else if (name.endsWith('.json')) {
        if (!ROOT_JSON_ALLOW.has(name)) {
          violations.push(`根级 .json 泄漏(疑似源码配置，非 PWA/embed 必需): ${relPath}`);
        }
      }
    }
  }
}

if (!fs.existsSync(DIST)) {
  console.log('[dist-hygiene] dist/ 不存在，跳过（构建后运行 verify 才会有产物可校验）');
  process.exit(0);
}

walk(DIST, '');

console.log('[dist-hygiene] 禁止目录集:', [...FORBIDDEN_DIRS].join(', '), '| 根级 .json 白名单:', [...ROOT_JSON_ALLOW].join(', '));

if (violations.length) {
  console.error(`\n❌ dist 卫生门禁失败 ${violations.length} 项（疑似 P0-3 构建产物泄漏复发）：`);
  for (const v of violations) console.error(`  ✗ ${v}`);
  process.exit(1);
}

console.log('✅ dist 卫生门禁: 无 .workbuddy/ e2e/ test-results/ __* / 根级配置 .mjs/.json 泄漏 ✓');
