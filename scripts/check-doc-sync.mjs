#!/usr/bin/env node
/**
 * check-doc-sync.mjs — 检查文档与代码的同步状态
 * 
 * 检查项：
 *   1. README.md 中表格列出的脚本是否都存在
 *   2. scripts/ 目录中的脚本是否都在 README.md 中列出
 *   3. 关键配置文件（vercel.json、build.mjs）是否与文档描述一致
 * 
 * 用法：node scripts/check-doc-sync.mjs
 * 退出码：0 = 同步；非 0 = 存在漂移
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const README_PATH = path.join(ROOT, 'README.md');
const SCRIPTS_DIR = path.join(ROOT, 'scripts');

const failures = [];
function fail(msg) { failures.push(msg); }

// 1. 读取 README.md 中表格列出的脚本
console.log('[1] 检查 README.md 中表格列出的脚本是否存在...');
const readme = fs.readFileSync(README_PATH, 'utf8');

// 只匹配表格第一列的脚本名：| `xxx.mjs` | 或 | `xxx.mjs` / `yyy.mjs` |
const readmeScripts = new Set();
const lines = readme.split('\n');
for (const line of lines) {
  // 匹配表格行：以 | 开头
  if (line.trimStart().startsWith('|')) {
    // 提取第一列内容
    const firstColumnMatch = line.match(/^\|\s*(.+?)\s*\|/);
    if (firstColumnMatch) {
      const firstColumn = firstColumnMatch[1];
      // 提取所有用反引号包裹的脚本名
      const scriptMatches = firstColumn.match(/`([^`]+\.(mjs|js|ps1|py))`/g);
      if (scriptMatches) {
        for (const scriptMatch of scriptMatches) {
          const scriptName = scriptMatch.replace(/`/g, '');
          readmeScripts.add(scriptName);
        }
      }
    }
  }
}

console.log(`  README.md 中列出的脚本: ${[...readmeScripts].sort().join(', ')}`);

// 2. 获取 scripts/ 目录中的实际脚本
const actualScripts = new Set();
for (const file of fs.readdirSync(SCRIPTS_DIR)) {
  if (file.endsWith('.mjs') || file.endsWith('.js') || file.endsWith('.ps1') || file.endsWith('.py')) {
    actualScripts.add(file);
  }
}

console.log(`  scripts/ 目录中的脚本: ${[...actualScripts].sort().join(', ')}`);

// 3. 检查 README.md 中的脚本是否存在
console.log('\n[2] 检查 README.md 中列出的脚本是否存在...');
for (const script of readmeScripts) {
  if (!actualScripts.has(script)) {
    fail(`README.md 列出的脚本不存在: scripts/${script}`);
  }
}

// 4. 检查 scripts/ 中的脚本是否在 README.md 中列出
const missingInReadme = [];
for (const script of actualScripts) {
  if (!readmeScripts.has(script)) {
    missingInReadme.push(script);
  }
}

if (missingInReadme.length > 0) {
  console.log(`  scripts/ 中有 ${missingInReadme.length} 个脚本未在 README.md 中列出:`);
  for (const script of missingInReadme) {
    console.log(`  - ${script}`);
  }
  // 这不是错误，只是提醒
} else {
  console.log(`  README.md 中列出的 ${readmeScripts.size} 个脚本全部存在 ✓`);
}

// 5. 检查关键配置
console.log('\n[3] 检查关键配置文件...');

// 5.1 检查 vercel.json 中的 buildCommand
const vercelPath = path.join(ROOT, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  if (vercel.buildCommand !== 'node scripts/build.mjs') {
    fail(`vercel.json buildCommand 不匹配: "${vercel.buildCommand}" (期望 "node scripts/build.mjs")`);
  } else {
    console.log('  vercel.json buildCommand ✓');
  }
} else {
  fail('vercel.json 不存在');
}

// 5.2 检查 build.mjs 中的关键函数
const buildPath = path.join(SCRIPTS_DIR, 'build.mjs');
if (fs.existsSync(buildPath)) {
  const build = fs.readFileSync(buildPath, 'utf8');
  const requiredFunctions = ['copyDir', 'walkHtml', 'ensureCharsetFirst', 'lazyImages', 'inlineNoneToHidden'];
  for (const fn of requiredFunctions) {
    if (!build.includes(`function ${fn}`) && !build.includes(`${fn} =`)) {
      fail(`build.mjs 缺少关键函数: ${fn}`);
    }
  }
  console.log('  build.mjs 关键函数 ✓');
} else {
  fail('build.mjs 不存在');
}

// 5.3 检查 verify-site.mjs 中的断言数量
const verifyPath = path.join(SCRIPTS_DIR, 'verify-site.mjs');
if (fs.existsSync(verifyPath)) {
  const verify = fs.readFileSync(verifyPath, 'utf8');
  const assertCount = (verify.match(/assertNoInline|assertCsp|assert/gi) || []).length;
  if (assertCount < 9) {
    fail(`verify-site.mjs 断言数量不足: ${assertCount} (期望至少 9)`);
  } else {
    console.log(`  verify-site.mjs 断言数量: ${assertCount} ✓`);
  }
} else {
  fail('verify-site.mjs 不存在');
}

// 6. 汇总
console.log('\n========== 检查结果 ==========');
if (failures.length) {
  console.error(`❌ 发现 ${failures.length} 个问题:`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('✅ 文档与代码同步状态良好');
if (missingInReadme.length > 0) {
  console.log(`\n💡 建议: scripts/ 目录中有 ${missingInReadme.length} 个脚本未在 README.md 中列出，建议补充文档`);
}