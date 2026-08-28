#!/usr/bin/env node
/**
 * scripts/check-tool-template.mjs — 4.2 工具页模板一致性门禁
 * -----------------------------------------------------------------
 * 背景：calc-tools.top 早期 currency-converter 等页面使用与主模板并行的
 *       「第二套模板」（tool-container / calculator-form / tool-info /
 *       input-group / result-area 等零 CSS 类 + 缺 Inter 字体），导致
 *       视觉与交互与其他工具页不一致。本门禁强制 calculators 工具页统一使用主模板。
 *
 * 合法例外说明（勿误判为违约/回退）：站点工具页分两套明确规范——
 *       (a) calculators/* 计算器工具页：必须用主模板（page-header + tool-form +
 *           form-actions + result-card + st-* + tool-content + Inter 字体）。
 *       (b) text/*、image/* 输入输出型工具页：使用独立的"输入输出型"布局
 *           （tool-page / tool-header / tool-controls / btn / result-area /
 *           text-input / upload-zone 等），功能完整、非破损，故不要求主模板，
 *           其非合规状态属**预期合法例外**（当前由本门禁豁免，勿强制迁移）。
 *       二者之外出现的非合规（如 calculators/* 含 tool-container/calculator-form/
 *       tool-info/fx-* 等旧类或缺 page-header/Inter）才是必须修复的回归。
 *
 * 合规判定（全部满足才视为 compliant）：
 *   - 含 class="page-header"
 *   - 含 class="tool-form"
 *   - 含 class="result-card"
 *   - 含 Inter 字体 link（fonts.googleapis.com/css2?family=Inter）
 *   - 不含任何遗留类：tool-container / calculator-form / tool-info /
 *     input-group / result-area
 *
 * 门禁逻辑（基线豁免法，防未来回归 + 驱动 B 批次迁移）：
 *   - 枚举 6 个工具目录（zh/en × calculators/image/text）下所有 .html
 *     （排除 index.html）。
 *   - 非合规 且 不在基线     → 失败（新增违规 / 回归，必须修复）
 *   - 合规 且 在基线         → 失败（基线过期：该页已迁移，需从基线移除以收紧门禁）
 *   - 基线列出的路径在磁盘不存在 → 失败（基线路径过期，需清理）
 *   - 非合规 且 在基线       → 通过（豁免，计入统计，提示仍需迁移）
 *
 * 用法：
 *   node scripts/check-tool-template.mjs                # 校验模式（verify-site 调用）
 *   node scripts/check-tool-template.mjs --list         # 列出每页合规状态（调试）
 *   node scripts/check-tool-template.mjs --gen-baseline # 将当前非合规页写入基线 JSON
 * 环境变量：
 *   TOOL_TEMPLATE_BASELINE   覆盖基线文件路径（自测用，避免改动真实基线）
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = process.env.TOOL_TEMPLATE_BASELINE
  || path.join(ROOT, 'scripts', 'tool-template-baseline.json');

const TOOL_DIRS = [
  'zh/calculators', 'zh/image', 'zh/text',
  'en/calculators', 'en/image', 'en/text',
];
const LEGACY_CLASSES = ['tool-container', 'calculator-form', 'tool-info', 'input-group', 'result-area'];

// ---------- 枚举工具页 ----------
function listToolPages() {
  const out = [];
  for (const dir of TOOL_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!name.endsWith('.html')) continue;
      if (name === 'index.html') continue; // 分类索引页豁免
      out.push(`${dir}/${name}`);
    }
  }
  out.sort();
  return out;
}

// ---------- 合规判定 ----------
function analyze(rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const hasPageHeader = /\bclass\s*=\s*["'][^"']*\bpage-header\b[^"']*["']/i.test(html);
  const hasToolForm = /\bclass\s*=\s*["'][^"']*\btool-form\b[^"']*["']/i.test(html);
  const hasResultCard = /\bclass\s*=\s*["'][^"']*\bresult-card\b[^"']*["']/i.test(html);
  // 脚本注入的 JSON-LD 文本里也可能出现 "Inter" 字样，须限定在 <link ... googleapis ... Inter> 内
  const hasInter = /<link\b[^>]*fonts\.googleapis\.com\/css2\?family=Inter[^>]*>/i.test(html);
  const legacyHits = LEGACY_CLASSES.filter((c) =>
    new RegExp(`\\bclass\\s*=\\s*["'][^"']*\\b${c}\\b[^"']*["']`, 'i').test(html)
  );
  const compliant = hasPageHeader && hasToolForm && hasResultCard && hasInter && legacyHits.length === 0;
  return { hasPageHeader, hasToolForm, hasResultCard, hasInter, legacyHits, compliant };
}

// ---------- 基线读写 ----------
function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return { exempt: [] };
  try {
    const data = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    return Array.isArray(data.exempt) ? data : { exempt: [] };
  } catch {
    return { exempt: [] };
  }
}
function saveBaseline(exempt) {
  const data = {
    version: 1,
    generatedAt: new Date().toISOString().slice(0, 10),
    note: 'Known-noncompliant tool pages exempted from the 4.2 template-consistency gate. Remove an entry the moment its page is migrated to the main template (page-header + tool-form + result-card + Inter link + no legacy classes).',
    exempt: [...exempt].sort(),
  };
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// ---------- 模式分发 ----------
const mode = process.argv.slice(2).find((a) => a.startsWith('--')) || '--check';

if (mode === '--gen-baseline') {
  const pages = listToolPages();
  const exempt = [];
  for (const rel of pages) {
    if (!analyze(rel).compliant) exempt.push(rel);
  }
  saveBaseline(exempt);
  console.log(`[gen-baseline] 已写入 ${exempt.length} 个非合规页到 ${path.relative(ROOT, BASELINE_PATH)}`);
  process.exit(0);
}

if (mode === '--list') {
  const pages = listToolPages();
  let ok = 0, bad = 0;
  for (const rel of pages) {
    const a = analyze(rel);
    if (a.compliant) { ok++; console.log(`  ✓ ${rel}`); }
    else {
      bad++;
      const why = [];
      if (!a.hasPageHeader) why.push('no-page-header');
      if (!a.hasToolForm) why.push('no-tool-form');
      if (!a.hasResultCard) why.push('no-result-card');
      if (!a.hasInter) why.push('no-inter');
      if (a.legacyHits.length) why.push('legacy:' + a.legacyHits.join('/'));
      console.log(`  ✗ ${rel}  [${why.join(', ')}]`);
    }
  }
  console.log(`\n[list] 合规 ${ok} / 非合规 ${bad} / 共 ${pages.length}`);
  process.exit(0);
}

// ---------- 校验模式（默认） ----------
{
  const pages = listToolPages();
  const baseline = loadBaseline();
  const exemptSet = new Set(baseline.exempt);
  const failures = [];
  let compliantCount = 0;
  let exemptCount = 0;

  for (const rel of pages) {
    const a = analyze(rel);
    if (a.compliant) {
      compliantCount++;
      if (exemptSet.has(rel)) {
        failures.push(`[baseline-stale] ${rel}: 现已合规，但仍在基线豁免列表 → 请从 tool-template-baseline.json 移除该条目以收紧门禁`);
      }
    } else {
      if (exemptSet.has(rel)) {
        exemptCount++;
      } else {
        const why = [];
        if (!a.hasPageHeader) why.push('no-page-header');
        if (!a.hasToolForm) why.push('no-tool-form');
        if (!a.hasResultCard) why.push('no-result-card');
        if (!a.hasInter) why.push('no-inter');
        if (a.legacyHits.length) why.push('legacy:' + a.legacyHits.join('/'));
        failures.push(`[regression] ${rel}: 非合规（${why.join(', ')}）且不在基线豁免列表 → 新增违规，须迁移到主模板`);
      }
    }
  }

  // 基线中指向磁盘不存在的路径 → 过期，须清理
  const diskSet = new Set(pages);
  for (const rel of exemptSet) {
    if (!diskSet.has(rel)) {
      failures.push(`[baseline-path-stale] ${rel}: 基线列出但磁盘无此工具页 → 路径过期，须从 tool-template-baseline.json 移除`);
    }
  }

  const total = pages.length;
  if (failures.length) {
    console.error(`❌ 4.2 工具页模板一致性门禁失败 ${failures.length} 项（合规 ${compliantCount} / 豁免 ${exemptCount} / 共 ${total}）：`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log(`✅ 4.2 工具页模板一致性: 合规 ${compliantCount} / 豁免(已知非合规) ${exemptCount} / 共 ${total} — 无新增违规、无过期基线`);
  process.exit(0);
}
