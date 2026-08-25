#!/usr/bin/env node
/**
 * scripts/inject-url-state.mjs — 为全部计算器工具页注入 URL 参数预填脚本
 * ---------------------------------------------------------------
 * 功能：在 zh/en 两侧的 calculators/*.html（非 index）中，于 </body> 前注入
 *       <script src="/js/url-state.js" defer></script>（幂等：已含则跳过）。
 * 背景：Calculator.net 模式 — 表单值序列化到 URL，刷新保留、可分享带参链接。
 * 用法：node scripts/inject-url-state.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');
const SCRIPT_TAG = '<script src="/js/url-state.js" defer></script>';

function walkHtml(dir, callback) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'dist' || name === '.git' || name === 'node_modules' || name === 'includes' || name === 'scripts' || name === 'deliverables' || name === 'docs') continue;
      walkHtml(full, callback);
    } else if (name.endsWith('.html')) {
      callback(full);
    }
  }
}

let injected = 0;
let skipped = 0;

for (const lang of ['zh', 'en']) {
  walkHtml(join(ROOT, lang), (f) => {
    if (!f.includes('calculators') || f.endsWith('index.html')) return;
    const html = readFileSync(f, 'utf8');
    if (html.includes('/js/url-state.js')) { skipped++; return; }
    // 仅注入含计算表单的页面（calculator-form / tool-form），stub/索引页跳过
    if (!html.includes('calculator-form') && !html.includes('tool-form')) { skipped++; return; }
    if (!html.includes('</body>')) return;
    const newHtml = html.replace('</body>', `    ${SCRIPT_TAG}\n</body>`);
    if (newHtml !== html) {
      if (!DRY) writeFileSync(f, newHtml, 'utf8');
      console.log(`${DRY ? '[dry-run] ' : ''}inject: ${f.replace(ROOT, '')}`);
      injected++;
    }
  });
}

console.log(`\n${DRY ? '[dry-run] ' : ''}done: injected ${injected}, skipped ${skipped}`);
