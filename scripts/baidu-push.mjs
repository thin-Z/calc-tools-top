#!/usr/bin/env node
// baidu-push.mjs — 百度搜索资源平台「主动推送」批量提交
//
// 背景（Tier 1 · 2026-09-20）：百度是大陆最大的搜索入口，本站此前完全未提交。
// 主动推送 API 可把新页/改版页**即时**告知百度，比等待自然抓取快得多。
//
// ⚠️ 百度主动推送**有每日配额**（`remain` 字段由接口返回）。本脚本因此：
//   ① 默认只推 10 条，且按「优先级」排序（首页 → 高频工具 → 博客 → 其余）
//   ② 把接口返回的 `remain` 打印出来，据此再决定是否用 --limit 放大
//   ③ 记录本地已推送状态，避免重复消耗配额
//
// 前置：在百度搜索资源平台（ziyuan.baidu.com）验证站点 → 普通收录 → 主动推送，复制 token。
//       token 通过环境变量 BAIDU_PUSH_TOKEN 或 scripts/.baidu-push-token 文件提供（均已 gitignore）。
//
// 用法：
//   node scripts/baidu-push.mjs --dry-run          # 只打印将推送的内容（不需要 token）
//   node scripts/baidu-push.mjs                    # 推送 10 条（默认配额友好值）
//   node scripts/baidu-push.mjs --limit 50         # 推送 50 条
//   node scripts/baidu-push.mjs --priority-only    # 只推优先级白名单内的 URL
//
// 退出码：0 = 成功；1 = 接口返回失败；2 = 前置条件不满足

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE = 'https://www.calc-tools.top';
// ⚠️ site 参数**不能**做 URL 编码（2026-09-20 实测）：
//    用 encodeURIComponent(SITE) 时接口固定返回 400 {"error":400,"message":"site init fail"}；
//    改为明文 site=https://www.calc-tools.top 后立即成功（remain/success 正常返回）。
//    官方文档示例同样是明文写法。token 为纯字母数字，编码与否等价，保持不编码以求一致。
const ENDPOINT = `http://data.zz.baidu.com/urls?site=${SITE}`;
const STATE_PATH = join(__dirname, '.baidu-push-state.json');
const TOKEN_PATH = join(__dirname, '.baidu-push-token');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PRIORITY_ONLY = args.includes('--priority-only');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 10;

// 优先级白名单：首页 + 站内「热门工具」+ 首篇博客（与首页热门区一致）
// ⚠️ 只用 sitemap 内真实存在的页面：`/zh/calculators/discount` 等 8 个「已合并」壳页是 noindex 跳转页，
//    已正确排除在 sitemap 外，故此处用其合并目标 `percentage-calc` 替代（推 noindex 页会浪费配额）。
const PRIORITY_PATHS = [
  '/',
  '/zh/calculators/mortgage',
  '/zh/calculators/bmi',
  '/zh/calculators/tax2026',
  '/zh/image/color-picker',
  '/zh/calculators/percentage-calc',
  '/zh/calculators/unit-converter',
  '/zh/text/word-counter',
  '/zh/text/json-formatter',
  '/blog/zh/tax2026-guide',
];

function readToken() {
  const env = process.env.BAIDU_PUSH_TOKEN;
  if (env && env.trim()) return { token: env.trim(), from: '环境变量 BAIDU_PUSH_TOKEN' };
  if (existsSync(TOKEN_PATH)) {
    const t = readFileSync(TOKEN_PATH, 'utf-8').trim();
    if (t) return { token: t, from: `文件 ${TOKEN_PATH.replace(ROOT, '.').replace(/\\/g, '/')}` };
  }
  return null;
}

function readSitemapUrls() {
  const candidates = [join(ROOT, 'dist', 'sitemap.xml'), join(ROOT, 'sitemap.xml')];
  const path = candidates.find(p => existsSync(p));
  if (!path) return null;
  const xml = readFileSync(path, 'utf-8');
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
}

function loadState() {
  try { if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, 'utf-8')); } catch { /* 状态损坏视为空 */ }
  return { pushed: [] };
}

function orderByPriority(urls) {
  const rank = new Map(PRIORITY_PATHS.map((p, i) => [SITE + p, i]));
  return [...urls].sort((a, b) => {
    const ra = rank.has(a) ? rank.get(a) : 9999;
    const rb = rank.has(b) ? rank.get(b) : 9999;
    return ra - rb; // 同优先级保持 sitemap 原顺序（sort 稳定）
  });
}

async function main() {
  const all = readSitemapUrls();
  if (!all) { console.error('❌ 未找到 sitemap.xml（dist/ 与仓库根均无）。请先运行 npm run build。'); process.exit(2); }

  const own = all.filter(u => u.startsWith(SITE + '/') || u === SITE);
  let candidates = orderByPriority(own);
  if (PRIORITY_ONLY) candidates = candidates.filter(u => PRIORITY_PATHS.includes(u.slice(SITE.length)));

  const state = loadState();
  const seen = new Set(state.pushed);
  const pending = candidates.filter(u => !seen.has(u)).slice(0, LIMIT > 0 ? LIMIT : undefined);

  console.log(`🗺️  sitemap 共 ${own.length} 条；本地已推送 ${seen.size} 条；本次候选 ${pending.length} 条（limit=${LIMIT}）`);

  if (pending.length === 0) { console.log('✅ 无新增 URL，无需推送。'); return; }
  if (DRY_RUN) {
    console.log('\n[dry-run] 将推送以下 URL（优先级已排序）：');
    pending.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    console.log('\nℹ️  dry-run 不需要 token。正式运行前请配置 BAIDU_PUSH_TOKEN。');
    return;
  }

  const auth = readToken();
  if (!auth) {
    console.error('❌ 未找到百度推送 token。');
    console.error('   方式一：设置环境变量 BAIDU_PUSH_TOKEN');
    console.error(`   方式二：把 token 写入 ${TOKEN_PATH.replace(ROOT, '.').replace(/\\/g, '/')}（该文件已 gitignore）`);
    console.error('   获取路径：百度搜索资源平台 → 普通收录 → 主动推送');
    process.exit(2);
  }
  console.log(`🔑 token 来源：${auth.from}`);

  const res = await fetch(`${ENDPOINT}&token=${encodeURIComponent(auth.token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: pending.join('\n'),
  });
  const text = await res.text();
  console.log(`\n📡 HTTP ${res.status} 响应：${text}`);

  if (!res.ok) { console.error('❌ 推送失败（见上方响应体）。'); process.exit(1); }

  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON 视为异常 */ }
  if (!json) { console.error('❌ 响应不是 JSON，无法判定结果。'); process.exit(1); }

  if (typeof json.error !== 'undefined') {
    console.error(`❌ 接口报错：code=${json.error} message=${json.message || ''}`);
    process.exit(1);
  }

  const success = Number(json.success || 0);
  // 以「接口确认成功的条数」为准写入状态，而非发出条数
  const confirmed = pending.slice(0, success);
  if (confirmed.length) {
    state.pushed.push(...confirmed);
    state.pushed = [...new Set(state.pushed)];
    state.updatedAt = new Date().toISOString();
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  }

  console.log(`✅ 百度已接收 ${success} 条 / 本次提交 ${pending.length} 条`);
  if (typeof json.remain !== 'undefined') {
    console.log(`📉 今日剩余配额 remain = ${json.remain}（据此可决定下次 --limit 取值）`);
  }
  if (Array.isArray(json.not_same_site) && json.not_same_site.length) console.warn(`⚠️ 非本站 URL：${json.not_same_site.length} 条`);
  if (Array.isArray(json.not_valid) && json.not_valid.length) console.warn(`⚠️ 无效 URL：${json.not_valid.length} 条`);
  if (success < pending.length) console.warn('⚠️ 部分未接收（通常为配额不足或 URL 无效），本地状态只记录已确认成功者。');
}

main().catch(e => { console.error('❌ 未捕获异常：', e); process.exit(1); });
