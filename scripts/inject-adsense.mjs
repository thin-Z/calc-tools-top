#!/usr/bin/env node
/**
 * AdSense 公共模板同步器（Plan A）
 * ---------------------------------------------------------------
 * 单一来源：includes/adsense-head.html
 * 每轮 Vercel 构建（buildCommand）自动运行，把 include 内容
 * 注入到全站每个 .html 的 <head> 首行，使 167 页永远与单一来源一致。
 *
 * 幂等：文件已含正确脚本则跳过；脚本缺失/旧 client 则替换。
 * 不破坏其它内容，仅处理 <head> 内的 adsbygoogle 脚本标签。
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 1) 读取唯一来源
const includePath = join(root, 'includes', 'adsense-head.html');
if (!existsSync(includePath)) {
  console.error('[adsense] FATAL: 找不到单一来源 includes/adsense-head.html');
  process.exit(1);
}
const snippet = readFileSync(includePath, 'utf8').trim();
if (!snippet.includes('adsbygoogle.js')) {
  console.error('[adsense] FATAL: includes/adsense-head.html 内容不含 adsbygoogle.js');
  process.exit(1);
}

// 1.5) 从唯一来源解析 client ID，幂等同步 js/cookie-consent.js 的 ADSENSE_SRC
//      使 client ID 在「HTML head 静态标签」与「JS 动态加载器」两处永远一致，
//      且只有 includes/adsense-head.html 一处需要维护。
const clientMatch = snippet.match(/ca-pub-\d+/);
if (!clientMatch) {
  console.error('[adsense] FATAL: 无法从 include 解析 ca-pub-* client ID');
  process.exit(1);
}
const adsenseUrl = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientMatch[0]}`;
const jsPath = join(root, 'js', 'cookie-consent.js');
let jsUpdated = 0;
if (existsSync(jsPath)) {
  let js = readFileSync(jsPath, 'utf8');
  const adsRe = /(const\s+ADSENSE_SRC\s*=\s*["'])([^"']*)(["'])/;
  if (adsRe.test(js)) {
    const next = js.replace(adsRe, `$1${adsenseUrl}$3`);
    if (next !== js) {
      writeFileSync(jsPath, next, 'utf8');
      jsUpdated++;
    }
  } else {
    console.warn('[adsense] 警告: js/cookie-consent.js 未匹配到 ADSENSE_SRC，跳过同步');
  }
} else {
  console.warn('[adsense] 警告: 找不到 js/cookie-consent.js，跳过同步');
}

// 2) 收集站点 HTML（排除非站点目录）
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

const scriptRe = /<script\b[^>]*\badsbygoogle\.js\b[^>]*>\s*<\/script>/gi;
const headRe = /<head\b[^>]*>/i;

let updated = 0;
let skipped = 0;
let noHead = 0;

for (const f of files) {
  const raw = readFileSync(f);
  const hadBom = raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf;
  let text = raw.toString('utf8');
  if (hadBom) text = text.slice(1);

  // 已正确包含且无需移动 => 跳过
  if (text.includes(snippet)) {
    skipped++;
    continue;
  }

  if (!headRe.test(text)) {
    noHead++;
    console.warn('[adsense] 跳过(无 <head>):', f.replace(root, ''));
    continue;
  }

  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const stripped = text.replace(scriptRe, '');          // 移除任何旧的 adsense 脚本
  const newText = stripped.replace(headRe, `<head>${eol}    ${snippet}`);

  if (newText === text) {
    skipped++;
    continue;
  }

  writeFileSync(f, (hadBom ? '\uFEFF' : '') + newText, 'utf8');
  updated++;
}

console.log(`[adsense] 完成 | 扫描 ${files.length} 个 HTML | 更新 ${updated} | 跳过 ${skipped}` + (noHead ? ` | 无head ${noHead}` : '') + ` | JS(cookie-consent) 更新 ${jsUpdated}`);
process.exit(0);
