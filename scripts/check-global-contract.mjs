#!/usr/bin/env node
/**
 * check-global-contract.mjs — 迭代六 T-3：全局契约门禁
 *
 * 显式固化站点级全局契约（迭代四已把 copyText/showError 固化到 runtime-head 注入）：
 *   - window.copyText(text)  —— 统一复制（csp-events 委托层，全局唯一实现）
 *   - window.showError(msg) —— 统一错误条（csp-events 委托层，替代阻塞 alert）
 *
 * 二者必须在 js/csp-events.js 中**同时定义**，且通过 includes/runtime-head.html
 * 注入全页（已由 verify [30] 守护"每页必含 csp-events"）。本门禁校验源契约文件
 * 本身未被破坏（有人误删其一 → 阻断）。
 *
 * 用法：node scripts/check-global-contract.mjs   （退出 0=通过，1=契约破坏）
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CSP_EVENTS = join(ROOT, 'js', 'csp-events.js');
const RUNTIME_HEAD = join(ROOT, 'includes', 'runtime-head.html');

const failures = [];
let cspSrc = '';
if (!existsSync(CSP_EVENTS)) {
    failures.push(`缺失契约源文件: ${CSP_EVENTS}`);
} else {
    cspSrc = readFileSync(CSP_EVENTS, 'utf8');
}

function assertDef(re, name) {
    if (cspSrc && !re.test(cspSrc)) {
        failures.push(`js/csp-events.js 未定义全局契约: ${name}`);
    }
}

// 1) 核心契约：copyText + showError 必须同时存在
assertDef(/window\.copyText\s*=/, 'window.copyText');
assertDef(/window\.showError\s*=/, 'window.showError');

// 2) runtime-head 必须注入 csp-events（与迭代二解耦一致）
if (existsSync(RUNTIME_HEAD)) {
    const rh = readFileSync(RUNTIME_HEAD, 'utf8');
    if (!/csp-events\.js/.test(rh)) {
        failures.push('includes/runtime-head.html 未注入 csp-events.js');
    }
} else {
    failures.push(`缺失: ${RUNTIME_HEAD}`);
}

if (failures.length) {
    console.error('[T-3 全局契约] ❌ 未通过:');
    failures.forEach(f => console.error('  - ' + f));
    process.exit(1);
}
console.log('[T-3 全局契约] ✅ 通过：window.copyText + window.showError 契约完整，runtime-head 注入 csp-events');
process.exit(0);
