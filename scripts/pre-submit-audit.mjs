#!/usr/bin/env node
/**
 * scripts/pre-submit-audit.mjs — 提交前深度审查（2026-09-27 立，强制流程）
 * -----------------------------------------------------------------
 * 背景：批 D 交付后补做的「提交后深度审查」发现了 4 项登记问题与 2 条审查陷阱。
 *       为把「先审查再提交」变成不可绕过的习惯，把**可机械验证**的部分固化为本脚本；
 *       无法机械化的部分（视觉抽查、负向测试自证）在输出末尾作为**必做清单**提示。
 *
 * 定位：**不是门禁**（不接入 verify-site、不改变断言数），是提交前的自检清单执行器。
 *       门禁回答「代码是否合规」，本脚本回答「这次提交是否干净、是否漏了专项核查」。
 *
 * 用法：
 *   npm run audit:pre            # 人读输出；FAIL 时 exit 1
 *   node scripts/pre-submit-audit.mjs --json
 *
 * 覆盖：
 *   1) 改动面分类（含非预期文件类型告警）
 *   2) 未跟踪文件清单（防夹带 / 防漏 add）
 *   3) 安全扫描（敏感文件名、超大文件、二进制新增）
 *   4) 行尾一致性（相对 HEAD 的 EOL 降级检测 —— 防「静默规范化」）
 *   5) 专项核查提示（按改动类型映射到对应必查项）
 *   6) 必做清单（门禁 + 视觉抽查 + 负向测试自证）
 *
 * 退出码：0 = 无 FAIL；1 = 存在 FAIL（请修完再提交）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonMode = process.argv.includes('--json');

const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
};
const lines = (s) => (s ? s.split('\n').filter(Boolean) : []);

const findings = [];
const warns = [];
const fails = [];
const addFail = (m) => { fails.push(m); findings.push('FAIL  ' + m); };
const addWarn = (m) => { warns.push(m); findings.push('WARN  ' + m); };
const info = (m) => findings.push('      ' + m);

// ────────────── 1) 改动面 ──────────────
const changed = lines(git(['diff', '--name-only', 'HEAD']));
const untracked = lines(git(['ls-files', '--others', '--exclude-standard']));
const allTouched = [...changed, ...untracked];

const EXPECTED_EXT = new Set(['html', 'css', 'js', 'mjs', 'cjs', 'ts', 'py', 'json', 'md', 'png', 'jpg', 'jpeg', 'svg', 'webp', 'ico', 'txt', 'xml', 'yml', 'yaml', 'ps1', 'sh', 'map', 'woff', 'woff2', 'avif', 'gif']);
const extOf = (p) => (p.includes('.') ? p.split('.').pop().toLowerCase() : '(none)');

const byExt = new Map();
for (const f of allTouched) byExt.set(extOf(f), (byExt.get(extOf(f)) || 0) + 1);
const oddExt = [...byExt.keys()].filter((e) => !EXPECTED_EXT.has(e));

findings.push('[1] 改动面');
info('已改动(含暂存/未暂存): ' + changed.length + ' 个');
info('未跟踪(新增未 add): ' + untracked.length + ' 个');
if (byExt.size) info('类型分布: ' + [...byExt.entries()].map(([e, n]) => n + ' ' + e).join(' / '));
if (oddExt.length) addWarn('非预期文件类型: ' + oddExt.join(', ') + '（请确认是否应提交）');
if (untracked.length) info('未跟踪清单: ' + untracked.slice(0, 10).join(', ') + (untracked.length > 10 ? ' 等 ' + untracked.length + ' 个' : ''));

// ────────────── 2) 安全扫描 ──────────────
findings.push('[2] 安全扫描');
const SENSITIVE = /(^|\/)(\.env|\.env\..*|id_rsa|.*\.pem|.*\.key|.*\.p12|.*credential.*|.*secret.*|\.npmrc|\.netrc)$/i;
const secHits = allTouched.filter((f) => SENSITIVE.test(f));
if (secHits.length) addFail('疑似敏感文件: ' + secHits.join(', '));

const big = allTouched.filter((f) => {
  try {
    return fs.statSync(path.join(ROOT, f)).size > 1024 * 1024;
  } catch {
    return false;
  }
});
if (big.length) addWarn('超大文件(>1MB): ' + big.join(', ') + '（确认是否应入库）');

// 二进制新增（不可 diff，需人工确认）
const BIN = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'ico', 'woff', 'woff2', 'pdf', 'zip', 'gz']);
const newBin = untracked.filter((f) => BIN.has(extOf(f)));
if (newBin.length) info('新增二进制(不可 diff，需目视确认): ' + newBin.join(', '));
if (!secHits.length && !big.length) info('未发现敏感文件 / 超大文件');

// ────────────── 3) 行尾一致性 ──────────────
// 注意（2026-09-27 自证后修正）：**EOL-only 变化不产生 git diff**，故「本次是否引入行尾改动」
// 在 git 归一化前提下**无法判定**。旧实现遍历 `git diff` 列表 → 恒为 0 命中 → 是**假绿**。
// 现改为两项可判定的检查：① 新增文件是否违反 eol=lf；② 只报工作区 EOL 现状（info，不假装是检测）。
findings.push('[3] 行尾一致性');
const newCrlf = [];
for (const f of untracked) {
  try {
    const b = fs.readFileSync(path.join(ROOT, f));
    if (b.includes(0x0d) && b.includes(0x0a)) newCrlf.push(f);
  } catch { /* ignore */ }
}
if (newCrlf.length) addWarn('新增文件含 CRLF（项目 .gitattributes 规定 eol=lf）: ' + newCrlf.join(', '));
else info('新增文件行尾合规（无 CRLF）');

const eolStat = { lf: 0, crlf: 0, mixed: 0, none: 0 };
for (const l of lines(git(['ls-files', '--eol']))) {
  const m = l.match(/\s(w\/\S+)/);
  if (!m) continue;
  const k = m[1].replace('w/', '');
  if (k in eolStat) eolStat[k]++;
}
info('工作区 EOL 现状（仅可见性，非判定）: ' + Object.entries(eolStat).map(([k, v]) => k + ' ' + v).join(' / '));
info('说明: EOL-only 变化不产生 git diff（.gitattributes 归一化），故无法判定"本次是否引入"；');
info('      若需回滚请按文件指定，禁用 `git checkout -- $(git diff --name-only)` 全量回滚。');

// ────────────── 4) 专项核查提示（按改动类型映射）──────────────
findings.push('[4] 专项核查提示（按本次改动类型）');
const touched = (p) => allTouched.some((f) => f.startsWith(p));
const hints = [];
if (touched('css/')) hints.push('CSS 改动 -> 双源一致性（style.css 与 critical.css 同名规则）+ `node scripts/check-var-refs.mjs` + 令牌是否有定义');
if (touched('scripts/')) hints.push('新增/改 scripts -> 必须在 README.md + scripts/README.md 登记（否则 check-doc-sync 挂 verify-site）；若接入 verify-site 需同步「N 项断言」声明');
if (touched('assets/')) hints.push('assets 改动 -> 新资产需可访问（线上 200）+ 尺寸/字节数元数据与声明一致');
if (touched('includes/')) hints.push('includes 改动 -> 全站 header/footer 字节一致断言会校验，需重跑 build 后再 verify');
if (allTouched.some((f) => f.endsWith('.html'))) hints.push('HTML 改动 -> 检查 meta/SEO 一致性（og:image 等是否全站指向同一资产）+ verify-site 断言');
if (allTouched.some((f) => f.endsWith('.js') || f.endsWith('.mjs'))) hints.push('JS 改动 -> 相关单测是否覆盖；是否有运行时注入的 CSS 令牌需要 R2 白名单自推导');
if (allTouched.some((f) => /tests?|spec/i.test(f))) hints.push('测试文件改动 -> 确认断言确实覆盖新行为（不为过测而测）');
if (hints.length) hints.forEach((h) => info('* ' + h));
else info('（无改动，或改动类型无专项提示）');

// ────────────── 5) 必做清单 ──────────────
findings.push('[5] 必做清单（本脚本无法代跑，提交前逐项确认）');
info('a. 门禁全绿: npm run ci:quick  (build + verify-site + test:cov + a11y + 窄屏)');
info('b. a11y 必须按 CI 通道跑: E2E_CHANNEL=chromium node scripts/audit-a11y.mjs（默认 msedge 会假绿）');
info('c. 视觉/行为改动: 浏览器实测（HTTP 起服务 + 等样式就绪 + 鼠标移开）');
info('d. 新增门禁/负向用例: 必须先证明装置有效（注入生效 + 改动前报得出）再断言「期望 0」');
info('e. 文档同步: 报告就地校正 / todo-list / 日志 / MEMORY（结论被推翻的要删或改写，不加更正块）');

// ────────────── 输出 ──────────────
const ok = fails.length === 0;
if (jsonMode) {
  console.log(JSON.stringify({ changed: changed.length, untracked: untracked.length, byExt: Object.fromEntries(byExt), oddExt, secHits, big, newCrlf, eolStat, hints, fails, warns, ok }, null, 2));
} else {
  for (const l of findings) console.log('[pre-submit] ' + l);
  console.log('');
  console.log('[pre-submit] 结果: ' + (ok ? (warns.length ? 'PASS（含 ' + warns.length + ' 项 WARN，请逐条确认）' : 'PASS') : 'FAIL（' + fails.length + ' 项，修完再提交）'));
}
process.exit(ok ? 0 : 1);
