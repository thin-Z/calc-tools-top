#!/usr/bin/env node
/**
 * 清理已弃用的自定义 cookie-consent 引用
 * ---------------------------------------------------------------
 * 欧洲 CMP 合规改用 Google 认证 CMP（AdSense Privacy & messaging），
 * 自定义横幅已停用。本脚本从所有 HTML 中移除指向
 * css/cookie-consent.css 与 js/cookie-consent.js 的 <link>/<script> 标签。
 *
 * 幂等：无引用则跳过；只删除完整标签，不改动其它内容。
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const EXCLUDE = new Set(['node_modules', '.git', 'docs', 'snapshots', 'deliverables', 'api', 'includes', 'scripts']);
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!EXCLUDE.has(name)) walk(full);
    } else if (name.endsWith('.html')) {
      files.push(full);
    }
  }
}
walk(root);

const linkRe = /<link\b[^>]*\bcookie-consent\.css[^>]*>\s*/gi;
const scriptRe = /<script\b[^>]*\bcookie-consent\.js[^>]*>\s*<\/script>\s*/gi;

let updated = 0;
let skipped = 0;

for (const f of files) {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  if (!linkRe.test(text) && !scriptRe.test(text)) {
    skipped++;
    continue;
  }

  // reset lastIndex because of global flag
  linkRe.lastIndex = 0;
  scriptRe.lastIndex = 0;

  const newText = text.replace(linkRe, '').replace(scriptRe, '');
  if (newText === text) {
    skipped++;
    continue;
  }

  writeFileSync(f, (hadBom ? '\uFEFF' : '') + newText, 'utf8');
  updated++;
}

console.log(`[cleanup] 完成 | 扫描 ${files.length} 个 HTML | 清理 ${updated} | 跳过 ${skipped}`);
process.exit(0);
