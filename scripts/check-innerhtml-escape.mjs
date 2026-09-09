#!/usr/bin/env node
/**
 * check-innerhtml-escape.mjs — 迭代六 T-4：innerHTML 动态内容转义趋势指标
 *
 * 背景：全站约 50+ 处 innerHTML 赋值，部分拼接用户输入。
 *   但多数（如 percentage-calc 拼接数字、password-gen 已 escapeHtml 拼接）是
 *   安全且合理的富文本渲染。硬阻断「innerHTML 必须伴随 escapeHtml」会大量误伤
 *   合理用法，且启发式脆弱（难判定"拼接的是否是已转义结果"）。
 *
 * 做法：【非阻断趋势指标】
 *   1. 扫描所有源 .js（排除 dist/test/vendor/archive）的 innerHTML 赋值；
 *   2. 标记「右侧含 + 拼接」的用法；
 *   3. 标记「拼接用法所在文件无 escapeHtml 定义/调用」的可疑项；
 *   4. 打印趋势清单 + 计数，退出码 0（不阻断 verify / 构建）。
 *
 * 作用：固化规范（CONTRIBUTING.md 已写明「innerHTML 动态内容须 escapeHtml」），
 *   每次新增未转义拼接会进清单被 review，防新增自 XSS。
 *
 * 用法：node scripts/check-innerhtml-escape.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['dist', 'node_modules', 'archive', 'test-results', 'scripts', '.git', '__tests__', 'vendor']);
const SKIP_FILES = new Set(['check-innerhtml-escape.mjs']);

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (SKIP_DIRS.has(name)) continue;
            walk(full, out);
        } else if (st.isFile() && extname(name) === '.js') {
            if (SKIP_FILES.has(name)) continue;
            out.push(full);
        }
    }
    return out;
}

function hasEscapeHelper(src) {
    return /function\s+escapeHtml|escapeHtml\s*=|window\.escapeHtml|escapeHtml\(/.test(src);
}

// 匹配 innerHTML 赋值：任何 .innerHTML = 或 .innerHTML +=（前缀不限）
const ASSIGN_RE = /\.innerHTML\s*(\+=|=)/g;
// 判断赋值右侧是否含字符串拼接 +
const CONCAT_RE = /\+\s*['"`]|['"`]\s*\+/;

const files = walk(ROOT);
let totalAssign = 0;
let concatAssign = 0;
let suspicious = 0;
const suspectList = [];

for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const rel = f.replace(ROOT + '/', '');
    // 文件级：是否有转义工具
    const fileHasEscape = hasEscapeHelper(src);
    // 行级扫描 innerHTML 赋值
    const lines = src.split('\n');
    lines.forEach((line, idx) => {
        const m = line.match(ASSIGN_RE);
        if (!m) return;
        totalAssign++;
        const isConcat = CONCAT_RE.test(line);
        if (isConcat) {
            concatAssign++;
            // 可疑：拼接但文件无 escapeHtml 工具且非纯常量模板
            if (!fileHasEscape && !/innerHTML\s*=\s*['"`][^'"`]*['"`]\s*;/.test(line)) {
                suspicious++;
                suspectList.push(`${rel}:${idx + 1}`);
            }
        }
    });
}

console.log(`[T-4 innerHTML] 总 innerHTML 赋值: ${totalAssign}`);
console.log(`[T-4 innerHTML] 其中含 + 拼接: ${concatAssign}`);
console.log(`[T-4 innerHTML] 疑似未转义拼接(文件无 escapeHtml 工具): ${suspicious}`);
if (suspectList.length) {
    console.log(`[T-4 innerHTML] 疑似清单(供 review，非阻断):`);
    suspectList.slice(0, 30).forEach(s => console.log(`  - ${s}`));
    if (suspectList.length > 30) console.log(`  ... and ${suspectList.length - 30} more`);
}
console.log(`[T-4 innerHTML] 结论: 趋势指标，非阻断（规范见 CONTRIBUTING.md）`);

process.exit(0);
