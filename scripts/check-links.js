#!/usr/bin/env node
// scripts/check-links.js
// 静态站断链扫描（零依赖）：遍历 zh/、en/、根级 html 与 js/css，
// 解析所有 src=/href= 属性，对相对路径按页面所在目录解析到文件系统做存在性检查。
// 报告：../ 越界、目标文件不存在、目录缺 index.html、无扩展名但 cleanUrls 无对应 .html。
// 跳过：# 锚点、http(s)/// 外部链接、mailto:/tel:/data:/javascript:、JS 动态模板串。
// 用法：node scripts/check-links.js

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 重定向感知：命中 vercel.json 重定向（非条件 has）的链接视为可达，
// 避免把 legacy .html 等合法重定向误报为断链（P2-4）。
let REDIRECT_RES = [];
try {
  const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  REDIRECT_RES = (vj.redirects || [])
    .filter((r) => !r.has)
    .map((r) => sourceToRegex(r.source));
} catch (e) {
  REDIRECT_RES = [];
}

function sourceToRegex(src) {
  const groups = [];
  let s = src.replace(/:[a-zA-Z]+(\*)?/g, function (_, star) {
    groups.push(star ? '(.*)' : '([^/]+)');
    return '@@' + (groups.length - 1) + '@@';
  });
  s = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/@@(\d+)@@/g, function (_, i) { return groups[+i]; });
  return new RegExp('^' + s + '$');
}

function matchesRedirect(href) {
  for (const re of REDIRECT_RES) {
    if (re.test(href)) return true;
  }
  return false;
}

// ---------- 收集待扫描文件 ----------
function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function collectFiles() {
  const files = [];
  // 根级 html（不递归，避免把 blog/deliverables/docs 纳入扫描）
  for (const name of fs.readdirSync(ROOT)) {
    if (name.endsWith('.html')) files.push(path.join(ROOT, name));
  }
  // zh/、en/ 递归 html
  for (const sub of ['zh', 'en']) {
    walk(path.join(ROOT, sub), (f) => {
      if (f.endsWith('.html')) files.push(f);
    });
  }
  // js/、css/ 递归（仅解析字面量 src=/href=）；跳过 js/test（测试文件不进生产产物，
  // 其字符串字面量（正则等）不应被当作链接引用解析，避免误报断链，P3）
  for (const sub of ['js', 'css']) {
    walk(path.join(ROOT, sub), (f) => {
      if (f.endsWith('.js') || f.endsWith('.css')) {
        const rel = path.relative(ROOT, f);
        if (rel.startsWith('js' + path.sep + 'test' + path.sep)) return;
        files.push(f);
      }
    });
  }
  return files;
}

// ---------- 链接解析与检查 ----------
const ATTR_RE = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;

function isExternal(href) {
  return /^(?:https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i.test(href);
}

function stripSuffix(href) {
  let h = href;
  const q = h.indexOf('?');
  if (q !== -1) h = h.slice(0, q);
  const frag = h.indexOf('#');
  if (frag !== -1) h = h.slice(0, frag);
  return h;
}

// JS/CSS 模板串中的动态片段无法静态解析，跳过
function looksDynamic(value) {
  return /\s|['"`]|\$\{/.test(value);
}

function isInsideRoot(target) {
  const rel = path.relative(ROOT, target);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// 目标存在性：目录需有 index.html；无扩展名按 cleanUrls 补 .html
function targetExists(target) {
  if (fs.existsSync(target)) {
    if (fs.statSync(target).isDirectory()) {
      return fs.existsSync(path.join(target, 'index.html'));
    }
    return true;
  }
  if (path.extname(target) === '') {
    return fs.existsSync(target + '.html');
  }
  return false;
}

function main() {
  const files = collectFiles();
  const errors = [];
  let total = 0;

  for (const file of files) {
    let content;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch (e) {
      errors.push(`${path.relative(ROOT, file)}: 无法读取 (${e.message})`);
      continue;
    }
    const relFile = path.relative(ROOT, file);
    const isScript = file.endsWith('.js') || file.endsWith('.css');
    const baseDir = path.dirname(file);

    let m;
    ATTR_RE.lastIndex = 0;
    while ((m = ATTR_RE.exec(content)) !== null) {
      const raw = m[1];
      if (!raw) continue;
      if (isExternal(raw)) continue;
      if (isScript && looksDynamic(raw)) continue;

      const href = stripSuffix(raw);
      if (!href) continue;
      // 命中 vercel.json 重定向 → 视为可达，跳过存在性检查（P2-4）
      if (matchesRedirect(href)) continue;
      total++;

      // 解析目标（相对 → 页面目录；绝对 → 仓库根）
      const target = href.startsWith('/')
        ? path.join(ROOT, href.replace(/^\//, ''))
        : path.resolve(baseDir, href);

      if (!isInsideRoot(target)) {
        errors.push(`${relFile}: "${raw}" → ../ 越界（解析到 ${path.relative(ROOT, target) || target}）`);
        continue;
      }
      if (!targetExists(target)) {
        const rel = path.relative(ROOT, target);
        errors.push(`${relFile}: "${raw}" → 目标不存在（${rel || target}）`);
      }
    }
  }

  if (errors.length === 0) {
    console.log(`OK，检查 ${total} 个引用 0 断链`);
    return;
  }
  console.error(`发现 ${errors.length} 个断链（共检查 ${total} 个引用）：`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}

main();
