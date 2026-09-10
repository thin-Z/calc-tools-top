#!/usr/bin/env node
/**
 * check-design-system.mjs — 设计系统门禁（迭代四 T-2）
 *
 * 目标：把「裸 checkbox / radio 数量」设为只降不升的阈值，防止新增页面绕开
 *       设计系统控件（.check-card / .seg-group / .gender-seg / .mode-pills）。
 *
 * 判定「裸」：<input type="checkbox|radio"> 向前 500 字符内最近的
 *       开标签（div/label/fieldset/li/span）其 class 不包含上述任一设计系统类。
 *       （近似解析，覆盖本站所有实际结构；如需更严可后续接 HTML 解析器。）
 *
 * 基线：scripts/design-baseline.json 提交的固定基线（bareControls）。
 *       - 首次运行（基线不存在）：写入当前值并退出 0（建立基线）。
 *       - 当前 > 基线：退化，退出 1（门禁失败）。
 *       - 当前 ≤ 基线：通过；若当前 < 基线，提示「已优化，请更新基线」仍退出 0。
 *
 * 退出码：0 通过 / 1 失败。
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname } from 'path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const BASELINE = join(ROOT, 'scripts', 'design-baseline.json');
const WRAP_CLASSES = ['check-card', 'seg-group', 'gender-seg', 'mode-pills'];
const INPUT_RE = /<input\b[^>]*\btype="(checkbox|radio)"[^>]*>/g;

function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    let s;
    try { s = statSync(p); } catch { continue; }
    if (s.isDirectory()) out.push(...walk(p));
    else if (extname(p) === '.html') out.push(p);
  }
  return out;
}

// 单遍标签栈解析：对每个 checkbox/radio 取真实父容器（及上方 3 层祖先），
// 任一含设计系统类即算包裹。修复旧版 500 字符窗口对长 radio 组（.seg-group/.gender-seg/
// .mode-pills 容器在窗口外）后段项误判为裸的问题。
const VOID_TAGS = new Set(['input', 'br', 'hr', 'img', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr']);
const TOK_RE = /<(\/?)([a-zA-Z][\w-]*)\b([^>]*)>/g;

function countBare(files) {
  let bare = 0;
  let total = 0;
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const stack = [];
    let m;
    TOK_RE.lastIndex = 0;
    while ((m = TOK_RE.exec(html))) {
      const closing = m[1] === '/';
      const name = m[2].toLowerCase();
      const attrs = m[3] || '';
      if (name === 'input') {
        const type = (attrs.match(/\btype="([^"]*)"/) || [])[1] || 'text';
        if (type === 'checkbox' || type === 'radio') {
          total++;
          let wrapped = false;
          for (let i = stack.length - 1; i >= Math.max(0, stack.length - 4); i--) {
            const cls = (stack[i].attrs.match(/class="([^"]*)"/) || [])[1] || '';
            if (WRAP_CLASSES.some((c) => cls.split(/\s+/).includes(c))) { wrapped = true; break; }
          }
          if (!wrapped) bare++;
        }
        continue; // input 为 void，不入栈
      }
      if (closing) {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].name === name) { stack.length = i; break; }
        }
      } else {
        const selfClosed = /\/\s*>$/.test(attrs) || VOID_TAGS.has(name);
        if (!selfClosed) stack.push({ name, attrs });
      }
    }
  }
  return { bare, total };
}

function main() {
  if (!existsSync(DIST)) {
    console.error('[design-system] 未找到 dist/，请先运行 node scripts/build.mjs');
    process.exit(1);
  }
  const files = walk(DIST);
  const { bare, total } = countBare(files);
  console.log(`[design-system] 扫描 ${files.length} 个 HTML，checkbox/radio 共 ${total} 个，裸控件 ${bare} 个`);

  let baseline = null;
  try {
    baseline = JSON.parse(readFileSync(BASELINE, 'utf8')).bareControls;
  } catch {
    baseline = null;
  }

  if (baseline === null) {
    writeFileSync(
      BASELINE,
      JSON.stringify({ bareControls: bare, totalControls: total, updated: new Date().toISOString() }, null, 2) + '\n'
    );
    console.log(`[design-system] ✓ 基线已建立: 裸控件 = ${bare}（已写入 ${BASELINE}）`);
    process.exit(0);
  }

  if (bare > baseline) {
    console.error(`[design-system] ✗ 退化：裸控件 ${bare} > 基线 ${baseline}（设计系统覆盖率下降，新增页面请改用 .check-card / .seg-group / .gender-seg / .mode-pills）`);
    process.exit(1);
  }

  if (bare < baseline) {
    console.log(`[design-system] ✓ 通过：${bare} ≤ 基线 ${baseline}（已优化 ${baseline - bare} 个，请更新 scripts/design-baseline.json 基线）`);
  } else {
    console.log(`[design-system] ✓ 通过：${bare} ≤ 基线 ${baseline}`);
  }
  process.exit(0);
}

main();
