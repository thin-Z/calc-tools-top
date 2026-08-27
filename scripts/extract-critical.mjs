/**
 * scripts/extract-critical.mjs — 构建期按页抽取关键 CSS（M2 修复）
 * -----------------------------------------------------------------
 * 从 css/style.css 按「关键选择器清单」抽取工具页首屏（calculator form + 结果卡 +
 * 内容区块带）所需的规则，生成阻塞的 critical-tool.css，供 build 在工具页注入。
 *
 * 收益：style.css 仍异步/非阻塞；工具页首帧由 critical.css(基础) + critical-tool.css(工具)
 * 稳定渲染，消除 DOMContentLoaded 后 style.css 应用导致的 FOUC + CLS。
 *
 * 设计：抽取器是惰性/新增式 —— 命中清单的规则才进入 critical-tool.css，
 * 且每次构建从当前 style.css 实时抽取（无静态拷贝 → 不会与 style.css 漂移）。
 * critical.css(:root token 定义) 先于 critical-tool.css 加载，故 var() 可直接使用。
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 工具页首屏（above-the-fold）关键选择器清单
const TOOL_MANIFEST = [
  '.calculator-form', '.form-group', '.form-row',
  '.btn', '.btn-primary', '.btn-secondary', '.btn-group',
  '.result-card', '.result-value', '.tool-content', '.detail-like-wrap',
  '.chart-container', '.input-group', '.tool-form',
];

// 一个选择器是否命中清单：与清单项相等，或以清单项为起点接复合后缀（.a:hover / .a b / .a>b / .a.x / .a[x]）
function matchesManifest(sel, manifest) {
  const s = sel.trim();
  if (!s) return false;
  for (const m of manifest) {
    if (s === m) return true;
    if (s.startsWith(m + ' ') || s.startsWith(m + ':') || s.startsWith(m + '[') || s.startsWith(m + '>') || s.startsWith(m + '.')) return true;
  }
  return false;
}

// 顶层规则/@media 分块（尊重花括号深度），命中清单的内层规则保留外部 @media 包裹
function extractRules(css, manifest) {
  const out = [];
  let i = 0, n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    if (css[i] === '@') {
      let j = i;
      while (j < n && css[j] !== '{' && css[j] !== ';') j++;
      if (css[j] === '{') {
        const atHeader = css.slice(i, j).trim();
        let depth = 0, k = j;
        while (k < n) { if (css[k] === '{') depth++; else if (css[k] === '}') { depth--; if (depth === 0) break; } k++; }
        const inner = css.slice(j + 1, k);
        const innerRules = extractRules(inner, manifest);
        if (innerRules.length) out.push(atHeader + ' {\n' + innerRules.join('\n') + '\n}');
        i = k + 1;
      } else {
        i = (css[j] === ';') ? j + 1 : j + 1;
      }
      continue;
    }
    let j = i;
    while (j < n && css[j] !== '{') j++;
    if (j >= n) break;
    const selector = css.slice(i, j).trim();
    let depth = 0, k = j;
    while (k < n) { if (css[k] === '{') depth++; else if (css[k] === '}') { depth--; if (depth === 0) break; } k++; }
    const body = css.slice(j + 1, k);
    const selectors = selector.split(',').map(x => x.trim()).filter(Boolean);
    if (selectors.some(s => matchesManifest(s, manifest))) out.push(selector + ' {\n' + body.trim() + '\n}');
    i = k + 1;
  }
  return out;
}

/** 判定一个 dist HTML 相对路径是否为工具页（zh|en 下的 calculators/image/text 目录） */
export function isToolPagePath(rel) {
  const norm = rel.split('\\').join('/');
  return /^\/(?:zh|en)\/(?:calculators|image|text)\/[^/]+\.html$/.test(norm) || /^(?:zh|en)\/(?:calculators|image|text)\/[^/]+\.html$/.test(norm);
}

/** 从 style.css 抽取出工具页关键 CSS 文本 */
export function buildToolCriticalCss(stylePath) {
  const css = readFileSync(stylePath, 'utf8');
  const rules = extractRules(css, TOOL_MANIFEST);
  const banner = '/* critical-tool.css — build-time extracted from css/style.css (M2) */\n';
  return banner + rules.join('\n\n') + '\n';
}
