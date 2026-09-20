#!/usr/bin/env node
// submit-indexnow.mjs — IndexNow 批量提交（必应 / Yandex / Naver / Seznam 等共用协议）
//
// 背景（Tier 1 · 2026-09-20）：本站自然搜索入口此前只做了 Google。
// IndexNow 是**无需注册账号**的提交通道：在站点根放一个 {key}.txt 证明归属后，
// 直接 POST 即可把 URL 推给所有参与的搜索引擎（其中必应是大陆 PC 端有份额的一家）。
//
// 归属验证文件：仓库根目录的 {32位hex}.txt（内容 = 文件名去掉 .txt），由 build 自动复制进 dist。
//
// 用法：
//   node scripts/submit-indexnow.mjs                # 提交 sitemap 中尚未提交过的 URL
//   node scripts/submit-indexnow.mjs --dry-run      # 只打印将提交的内容，不发请求
//   node scripts/submit-indexnow.mjs --force        # 忽略本地状态，全量重推
//   node scripts/submit-indexnow.mjs --limit 50     # 本次最多提交 N 条
//   node scripts/submit-indexnow.mjs --all          # 不按状态过滤（等价 --force，语义自述）
//
// 退出码：0 = 全部成功；1 = 存在失败批次；2 = 前置条件不满足（缺 key 文件 / 缺 sitemap）

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SITE_HOST = 'www.calc-tools.top';
const SITE_ORIGIN = `https://${SITE_HOST}`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
// 协议上限 10,000/次；此处取 200 以保持对端友好并让失败可局部重试
const BATCH_SIZE = 200;
const STATE_PATH = join(__dirname, '.indexnow-state.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force') || args.includes('--all');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;

// ── 1) 定位归属验证 key（根目录 {32位hex}.txt，内容须等于文件名去掉扩展名）──
function findKey() {
  const candidates = readdirSync(ROOT).filter(f => /^[a-f0-9]{32}\.txt$/i.test(f));
  for (const f of candidates) {
    const base = f.replace(/\.txt$/i, '');
    let content = '';
    try { content = readFileSync(join(ROOT, f), 'utf-8').trim(); } catch { continue; }
    if (content === base) return { key: base, file: f };
  }
  return null;
}

// ── 2) 读取 sitemap 中的 URL（优先 dist，回退仓库根）──
function readSitemapUrls() {
  const candidates = [join(ROOT, 'dist', 'sitemap.xml'), join(ROOT, 'sitemap.xml')];
  const path = candidates.find(p => existsSync(p));
  if (!path) return null;
  const xml = readFileSync(path, 'utf-8');
  const urls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1]);
  return { path, urls };
}

function loadState() {
  try { if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, 'utf-8')); } catch { /* 状态损坏则视为空 */ }
  return { submitted: [] };
}
function saveState(state) {
  state.submitted = [...new Set(state.submitted)];
  state.updatedAt = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

async function postBatch(batch, key, keyFile) {
  const body = {
    host: SITE_HOST,
    key,
    keyLocation: `${SITE_ORIGIN}/${keyFile}`,
    urlList: batch,
  };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text().catch(() => '') };
}

// 响应码语义（官方文档）：200 OK / 202 Accepted（key 校验待定）/ 400 格式错 / 403 key 无效 / 422 URL 不属于该 host / 429 过于频繁
const OK_STATUS = new Set([200, 202]);

async function main() {
  const found = findKey();
  if (!found) {
    console.error('❌ 未找到归属验证 key 文件。');
    console.error('   请在仓库根目录放置 {32位hex}.txt，文件内容须等于文件名（去掉 .txt）。');
    console.error('   生成方式：node -e "const c=require(\'crypto\');const k=c.randomBytes(16).toString(\'hex\');require(\'fs\').writeFileSync(k+\'.txt\',k)"');
    process.exit(2);
  }
  console.log(`🔑 IndexNow key: ${found.key}（归属文件 ${found.file}）`);

  const sm = readSitemapUrls();
  if (!sm) { console.error('❌ 未找到 sitemap.xml（dist/ 与仓库根均无）。请先运行 npm run build。'); process.exit(2); }
  console.log(`🗺️  sitemap: ${sm.path.replace(ROOT, '.').replace(/\\/g, '/')}（${sm.urls.length} 条 URL）`);

  // 只提交属于本站的 URL，避免 422
  const own = sm.urls.filter(u => u.startsWith(SITE_ORIGIN + '/') || u === SITE_ORIGIN);
  const foreign = sm.urls.length - own.length;
  if (foreign > 0) console.warn(`⚠️  跳过 ${foreign} 条不属于 ${SITE_HOST} 的 URL`);

  const state = loadState();
  const seen = new Set(state.submitted);
  let pending = FORCE ? own.slice() : own.filter(u => !seen.has(u));
  if (LIMIT > 0) pending = pending.slice(0, LIMIT);

  console.log(`📦 本次待提交：${pending.length} 条（已提交过 ${own.length - own.filter(u => !seen.has(u)).length} 条跳过）`);

  if (pending.length === 0) { console.log('✅ 无新增 URL，无需提交。'); return; }
  if (DRY_RUN) {
    console.log('\n[dry-run] 将提交以下 URL：');
    pending.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
    return;
  }

  let ok = 0, failed = 0;
  const succeeded = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const n = Math.floor(i / BATCH_SIZE) + 1;
    const total = Math.ceil(pending.length / BATCH_SIZE);
    try {
      const { status, text } = await postBatch(batch, found.key, found.file);
      if (OK_STATUS.has(status)) {
        ok += batch.length;
        succeeded.push(...batch);
        console.log(`  ✅ 批次 ${n}/${total}：${batch.length} 条 → HTTP ${status}${text ? ' ' + text.slice(0, 120) : ''}`);
      } else {
        failed += batch.length;
        console.error(`  ❌ 批次 ${n}/${total}：HTTP ${status} ${text.slice(0, 200)}`);
        if (status === 403) console.error('     ↳ 403＝key 无效：确认 dist/ 下能访问到 ' + found.file + '，且内容与文件名一致。');
        if (status === 429) console.error('     ↳ 429＝过于频繁：稍后重试，勿连续跑本脚本。');
      }
    } catch (e) {
      failed += batch.length;
      console.error(`  ❌ 批次 ${n}/${total}：请求异常 ${e.message}`);
    }
    // 批次间轻微间隔，避免触发 429
    if (i + BATCH_SIZE < pending.length) await new Promise(r => setTimeout(r, 1000));
  }

  if (succeeded.length) { state.submitted.push(...succeeded); saveState(state); }

  console.log(`\n📊 IndexNow 提交完成：成功 ${ok} 条 / 失败 ${failed} 条`);
  console.log(`   本地状态：${STATE_PATH.replace(ROOT, '.').replace(/\\/g, '/')}（累计已提交 ${new Set(state.submitted).size} 条）`);
  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error('❌ 未捕获异常：', e); process.exit(1); });
