#!/usr/bin/env node
/**
 * scripts/check-dead-selectors.mjs — 死样式门禁（2026-10-13 新建，S28）
 * -----------------------------------------------------------------
 * 背景：S28 实证 —— 删掉 `.brand-text` 元素后，CSS 里残留
 *       `body.is-fullscreen .topbar .brand-text` 规则，而 4 个静态门禁
 *       + `ci:quick` **全绿均不报**，靠提交后 grep 线上 CSS 才发现。
 *       这类残留属**沉默资产**：不报错、不崩溃，只在后人读 CSS 时
 *       制造「以为还有这个元素」的误导，且随缩面/合并持续累积。
 *
 * ── 为什么用「趋势基线」而不是「期望 0」 ────────────────────────────
 * 实测存量 58 个死样式（见下方 SOURCES）。若把期望值钉在 0，门禁一上线
 * 就是红的，必须先清完 58 个才可用 —— 那样只会导致「先关掉门禁、回头再说」。
 * 故采用**趋势检查**：BASELINE 记当前存量，新增即红、减少则提示可收紧。
 * 与 check-token-discipline.mjs 的 BASELINES 同一范式。
 *
 * ── 三层假阳性防护（缺一层就会误报）─────────────────────────────
 * ① HTML 侧：扫 **dist 全量 222 页**（非抽样），逐文件解析 class 属性
 *    并按空白切词；另加一条容错正则处理构建期模板里的转义引号写法。
 *    ⚠️ 不可用「大字符串拼接后正则匹配」—— `[^"']*` 会跨标签边界误配，
 *       实测曾把 `warn` / `info` / `label` / `strong` 四个存活类误判为死样式。
 * ② JS 侧：扫 js/**\/*.js **与 dist/js/**\/*.js 的全文词级**。
 *    ⚠️ 不可只认 `classList.*` / `className=` —— 实测漏掉
 *       `.homepage-article-list`（模板字符串里生成，出现在 dist/js/site-home.js）
 *       共 22 个活类。改词级后 84 → 58。
 * ③ EXEMPT：经人工确认的动态 class 显式登记（当前为空）。
 *
 * ── 防「永远 PASS」的三条硬装置（负向自证已实测，见下方 SELF-TEST）──
 * 退化正则会让死样式数恒为 0，门禁变成假绿。因此：
 *   SELF-TEST a) 存活 fixture 必须被 HTML 解析器命中
 *   SELF-TEST b) JS 动态 fixture（.is-fullscreen）必须被判为「JS 可见」
 *   SELF-TEST c) 合成的不存在类名必须被判为「死样式」
 *   另：实测数为 0 时直接 exit 1（与 BASELINE 差距过大 = 探测器失效）。
 *
 * 覆盖范围：css/ 下全部 *.css（含 badge-maker.css，不设豁免）。
 *          CSS 注释按同长度空白抹除，故文档里写 `.foo` 不会假阳性；
 *          字符串字面量（content: ".x"）先挖空再提取。
 *
 * 用法：
 *   node scripts/check-dead-selectors.mjs            # 详细输出；新增死样式时 exit 1
 *   node scripts/check-dead-selectors.mjs --json     # JSON 输出
 *   node scripts/check-dead-selectors.mjs --dump     # 维护用：打印死样式全表（含文件:行）
 *
 * 退出码：0 = 未新增（等于或低于基线）；1 = 新增死样式 / 装置自检失败。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ────────────── 配置 ──────────────
/** 死样式存量基线（2026-10-13 实测：style.css 55 + badge-maker.css 3）。
 *  清理存量后应下调此值，门禁会提示；调高则等于放行新增，勿为过门禁而调高。 */
const BASELINE = 58;

/** 经人工确认、静态查不到的动态 class。当前为空 —— 新增须写明理由与验证方式。 */
const EXEMPT = new Set();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = path.join(ROOT, 'css');
const DIST = path.join(ROOT, 'dist');
const JS_DIR = path.join(ROOT, 'js');
const DIST_JS = path.join(DIST, 'js');
const jsonMode = process.argv.includes('--json');
const dumpMode = process.argv.includes('--dump');

/** 装置自检 fixture —— 判据全部取自「实测已知结论」，不取自被测正则的输出。
 *  a) tool-content：dist 全站必然存在（每个正文页都有）→ HTML 解析器必须命中
 *  b) is-fullscreen：CSS 有、静态 HTML 无、仅 JS classList 切换 → 必须判「JS 可见」 */
const FIXTURE_HTML = ['tool-content', 'form-group', 'result-card'];
const FIXTURE_JS = ['is-fullscreen'];
/** c) 合成类名：任何 HTML/JS 都不该出现 → 必须被判为死样式 */
const FIXTURE_DEAD = ['zz-selftest-not-exist'];

/** class 选择器：首字符须为字母或下划线/连字符+字母（排除 .5rem 这类小数与 .5s 时长） */
const CLS_RE = /\.(-?[_a-zA-Z][\w-]*)/g;
/** HTML class 属性（双引号 / 单引号） */
const CLASS_ATTR_RE = /class\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
/** 构建期模板里的转义引号写法 */
const CLASS_ESC_RE = /class=\\?["']([^"'<>]{1,200})\\?["']/g;

function blankComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/** 从 CSS 源文本提取 class 选择器 → Map(class -> {line, hits, selectors:Set})。
 *  抽成独立函数是为了让装置自检能用合成 CSS 文本验证「提取 + 判定」整条链路，
 *  而不必往真 CSS 里注入东西污染源文件。 */
function extractClasses(src) {
  const map = new Map();
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/"[^"]*"|'[^']*'/g, (m) => ' '.repeat(m.length));
    for (const m of line.matchAll(CLS_RE)) {
      const c = m[1];
      if (!map.has(c)) map.set(c, { line: i + 1, hits: 0, selectors: new Set() });
      const rec = map.get(c);
      rec.hits++;
      rec.selectors.add(lines[i].trim().slice(0, 110));
    }
  }
  return map;
}

function walk(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'test-results'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, filter, out);
    else if (filter(p)) out.push(p);
  }
  return out;
}

const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// ────────────── 1) CSS：class 选择器 + 定位 ──────────────
const cssFiles = fs.readdirSync(CSS_DIR).filter((f) => f.endsWith('.css')).sort();
/** class -> { file, line, hits, selectors:Set } */
const cssCls = new Map();
if (cssFiles.length) {
  for (const f of cssFiles) {
    const found = extractClasses(blankComments(fs.readFileSync(path.join(CSS_DIR, f), 'utf8')));
    for (const [c, rec] of found) cssCls.set(c, { file: `css/${f}`, ...rec });
  }
}

// ────────────── 2) HTML：dist 全量 class 集合 ──────────────
const htmlFiles = walk(DIST, (p) => p.endsWith('.html'));
const htmlCls = new Set();
for (const f of htmlFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(CLASS_ATTR_RE)) {
    for (const c of (m[1] ?? m[2] ?? '').split(/\s+/)) if (c) htmlCls.add(c);
  }
  for (const m of src.matchAll(CLASS_ESC_RE)) {
    for (const c of m[1].split(/\s+/)) if (/^[A-Za-z][\w-]*$/.test(c)) htmlCls.add(c);
  }
}

// ────────────── 3) JS：源 + 构建产物，全文词级 ──────────────
const jsFiles = [...walk(JS_DIR, (p) => p.endsWith('.js')), ...walk(DIST_JS, (p) => p.endsWith('.js'))];
const jsBlob = jsFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const inJs = (c) => new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(jsBlob);

// ────────────── 4) 差集 = 死样式候选 ──────────────
const dead = [];
for (const [c, rec] of cssCls) {
  if (EXEMPT.has(c)) continue;
  if (htmlCls.has(c)) continue;
  if (inJs(c)) continue;
  dead.push({ cls: c, ...rec, selectors: [...rec.selectors] });
}
dead.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.cls.localeCompare(b.cls));

// ────────────── 5) 装置自检（防「永远 PASS」）────────────────
const selfTest = [];
for (const c of FIXTURE_HTML) {
  if (!htmlCls.has(c)) selfTest.push(`a) 存活 fixture .${c} 未被 HTML 解析命中 → HTML 侧解析器失效`);
}
for (const c of FIXTURE_JS) {
  if (!inJs(c)) selfTest.push(`b) JS 动态 fixture .${c} 未被词级匹配命中 → JS 侧扫描失效`);
  if (htmlCls.has(c)) selfTest.push(`b) JS 动态 fixture .${c} 却出现在静态 HTML → fixture 已失效，请换新的动态类`);
}
// c) 用**合成 CSS 文本**验证「提取 → 判定为死样式」整条链路，
//    避免往真 CSS 注入探针污染源文件（对标 check-token-discipline 的 validatePropCoverage 范式）。
for (const c of FIXTURE_DEAD) {
  const probe = extractClasses(`.${c} { color: red; }`);
  if (!probe.has(c)) {
    selfTest.push(`c) 合成 CSS 未提取到 .${c} → class 提取逻辑失效`);
    continue;
  }
  if (htmlCls.has(c) || inJs(c)) {
    selfTest.push(`c) 合成类名 .${c} 竟被 HTML/JS 命中 → 扫描范围有泄漏`);
    continue;
  }
  // 复刻 dead 判定：仅 CSS 命中 → 判死
  const judgedDead = !htmlCls.has(c) && !inJs(c) && !EXEMPT.has(c);
  if (!judgedDead) selfTest.push(`c) 合成类名 .${c} 未被判为死样式 → 死样式判定失效`);
  if (!/^zz-selftest-/.test(c)) selfTest.push(`c) 合成类名 .${c} 未用统一前缀，装置自证会与真实死样式混淆`);
}
const selfTestOk = selfTest.length === 0;

/** 实测基线 58；结果为 0 只可能来自探测器退化（CSS 解析崩了 / 路径错） */
const probeLooksBroken = dead.length === 0;

// ────────────── 6) 基线判定 ──────────────
const regressed = dead.length > BASELINE;
const improvable = dead.length < BASELINE;
const ok = selfTestOk && !probeLooksBroken && !regressed;

// ────────────── 7) 输出 ──────────────
if (jsonMode) {
  console.log(JSON.stringify({
    baseline: BASELINE,
    actual: dead.length,
    delta: dead.length - BASELINE,
    regressed, improvable, selfTestOk, ok,
    selfTestFailures: selfTest,
    scanned: { cssFiles: cssFiles.length, cssClasses: cssCls.size, htmlFiles: htmlFiles.length, htmlClasses: htmlCls.size, jsFiles: jsFiles.length, exempt: [...EXEMPT] },
    dead,
  }, null, 2));
} else {
  console.log(`[dead-selectors] 扫描范围: css/*.css ${cssFiles.length} 文件 / class 选择器 ${cssCls.size} 个`);
  console.log(`[dead-selectors] 存活面  : dist HTML ${htmlFiles.length} 页 → class ${htmlCls.size} 个 | js ${jsFiles.length} 文件（词级） | 豁免 ${EXEMPT.size} 个`);

  if (dumpMode) {
    console.log(`\n[dead-selectors] 死样式全表（${dead.length} 个）:`);
    for (const d of dead) {
      console.log(`  .${d.cls.padEnd(28)} ${d.file}:${d.line}  ×${d.hits}   ${d.selectors[0]}`);
    }
  }

  console.log('');
  console.log(`[dead-selectors] 装置自检: ${selfTestOk ? '[OK] 3/3 生效' : '[X] 失败'}`);
  for (const s of selfTest) console.log(`             ${s}`);

  if (probeLooksBroken) {
    console.log('');
    console.log(`[dead-selectors] 死样式数 = 0，与实测基线 ${BASELINE} 差距过大 → 判定探测器失效（而非「全站干净」）`);
  }

  console.log('');
  if (regressed) {
    console.log(`[dead-selectors] 新增死样式（阻断）: 基线 ${BASELINE} → 实际 ${dead.length}，新增 ${dead.length - BASELINE} 个`);
    for (const d of dead.slice(0, 60)) console.log(`             .${d.cls}  ${d.file}:${d.line}  ×${d.hits}   ${d.selectors[0]}`);
  } else if (improvable) {
    console.log(`[dead-selectors] 存量下降: 基线 ${BASELINE} → 实际 ${dead.length}，已清理 ${BASELINE - dead.length} 个`);
    console.log(`             提示：可下调 BASELINE 至 ${dead.length}（清理存量的正反馈，避免基线被当成永久豁免）`);
  } else {
    console.log(`[dead-selectors] 死样式存量: ${dead.length} = 基线 ${BASELINE}，无新增 [OK]`);
  }

  console.log('');
  console.log(`[dead-selectors] 结果: ${ok ? '[OK] 通过' : '[X] 未通过（阻断）'}`);
  if (!regressed && !improvable) console.log(`             存量 ${dead.length} 个为历史遗留（多为 09-20 工具合并 / 缩面的残留），清理非本门禁职责`);
}

process.exit(ok ? 0 : 1);
