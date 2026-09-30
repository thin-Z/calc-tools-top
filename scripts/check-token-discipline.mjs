#!/usr/bin/env node
/**
 * scripts/check-token-discipline.mjs — 令牌纪律门禁
 *   V0（2026-09-23）：R1 —— box-shadow 值型令牌/length 混排
 *   批 0（2026-09-28）：新增 R3–R9 —— 令牌阶梯纪律七条
 * -----------------------------------------------------------------
 * 背景：09-23《深度视觉审查报告》P0-1 查明 style.css / critical.css 共 10 处
 *       `box-shadow` 把**值型阴影令牌**与字面 length 混排，浏览器按 CSS 规范整条声明
 *       丢弃（静默失效——既不报错也不生效，属最贵的「沉默逻辑错误」类失效）。
 *       既有门禁完全不覆盖「声明级语义」这一层，故新建本门禁补位。
 *
 * 令牌命名契约（**以此为准，务必不要混淆**）：
 *   --shadow-*        → 存**完整值**：如 `--shadow-sm: 0 1px 3px rgba(0,0,0,0.06);`
 *                        可参与长度运算 → 可被展开（值型）
 *   --shadow-color-*  → 存**颜色**：如 `--shadow-color-dark: rgba(0,0,0,0.3);`
 *                        只是阴影色 → **不得**当值型展开
 *
 * ── R1：box-shadow 值型令牌与字面 length 混排 ─────────────────────
 * 判定：把 `box-shadow:` 声明里的**值型** `var(--shadow-*)` 展开为其定义值后，按 CSS 语法
 *       逐层（逗号分隔的 <shadow> 层）统计 length 个数；任一层的 length 数 **> 4** 即违规。
 *       依据：`<shadow> = <color>? && [<length>{2,4}] && <color>?` —— 单层最多 4 个 length，
 *       超出后整条声明**语法无效、被浏览器静默丢弃**。
 *       逐层判定（而非全声明总长）是刻意的：`0 1px 2px rgba(), 0 2px 4px rgba()` 这类合法的
 *       多层阴影总长可达 4 以上，用总长判定会产生假阳性。
 *
 * 覆盖范围：与 check-p0-gate.mjs 的 CSS 裸色值检查**同作用域** —— css/ 下全部 *.css，
 *          仅豁免 tokens.css（定义源）。
 *
 * ── R3–R9：令牌阶梯纪律（批 0，2026-09-28）────────────────────────
 * 扫描范围（与 R1 刻意不同，R1 行为保持不变）：css/*.css，**排除** tokens.css（定义源）与
 *   badge-maker.css（自成体系，站级待决项 S10 未拍板）。
 *
 *   规则  检查对象                                              计数口径                        基线  目标
 *   R3    font-size                                             值非 var(--fs-*) 且非         237   ≤20
 *                                                               关键词的声明条数
 *   R4    line-height                                           去重后的值种类数                14    ≤5
 *   R5    padding/margin/gap（含方向后缀）                      值中含裸 px 的声明条数         320   ≤50
 *   R6    border-radius（含各角后缀）                           值中含裸 px 的声明条数          77     0
 *   R7    transition/animation(-duration)                       时长 token 去重种类数           13    ≤3
 *   R8    z-index                                               裸值数值 ≥999 的声明条数         4     0
 *   R9    font-weight                                           值等于 bold 或 800 的声明条数   13     0
 *
 * 计数为**原样拼写**口径（`.15s` 与 `0.15s` 算两种），与上述基线口径一致；
 * 白名单比对则按**规范化语义**（`.15s` ≡ `0.15s`），与规格「等价写法允许」一致。
 *
 * R3 基线口径修正（2026-09-28 复核实测）：原 238 是**错的口径** —— 它由 `grep -cvE 'var\(--fs'`
 *   得出，把 CSS-wide 关键词 `inherit` 一并当成「非令牌裸值」。
 *   正确口径 = 285 条 font-size 声明 − 47 条 var(--fs-*) − 1 条 inherit = **237**
 *   （与 countOf 实测值一致）。不修正会留下 1 条**静默余量**：新增 1 条裸 font-size 时计数为
 *   238，恰好等于旧基线 → 计数信号不红，门禁比规格松一格（只有白名单信号兜底）。
 *
 * ── 两条独立信号，任一红即阻断 ────────────────────────────────────
 * 1) 计数信号（只降不升）：实测计数 > BASELINES[id] → 红；实测 < 基线 → 仅提示
 *    「基线可下调至 N」，**不自动改**（基线的下调需人工确认）。
 *    计数报红时的**展示顺序**（V0.2 修正，2026-09-28）：明细优先列出「本次使计数越过基线的那
 *    N 条」（decl 规则取扫描序末尾、distinct/timing 取首次出现最晚者），存量明细仅后置、不丢弃。
 *    动机：原先按扫描序截断前 MAX_DETAIL 条，而新增声明通常落在**文件末尾**→ 恰好被截掉，
 *    终端上看不到真正该看的那行，只能去 --json 翻全量 —— 与「一次调用即给出可定位结论」相悖。
 * 2) 白名单信号（防等价交换）：把旧值换成另一个同样非法的新值时，计数可以纹丝不动
 *    （甚至更低），计数信号完全照不到。故除计数外，还收集「出现过的值集合」与阶梯
 *    白名单（LADDER）比对：
 *      · 白名单外且不在 LEGACY_UNKNOWN 冻结词表 → **新值** → 红（附 文件:L行 + 实际值）
 *      · 白名单外但在冻结词表内                 → 存量待迁移 → 放行，计入 unknownValues 供收敛追踪
 *      · 在冻结词表内但本次未出现               → 已收敛 → 提示可缩减词表
 *    白名单的**比对范围必须与计数口径一致**（见 RULES 的 `whitelistScope`）：计数若带条件
 *    （R5「含裸 px」/ R8「数值 ≥999」），白名单就只能收窄到同条件的值。否则白名单比计数**更严**，
 *    合法值（`z-index: 10` / `padding: 0.5rem`）会被当成「白名单外新值」误伤 —— 门禁成了噪声源，
 *    真违规反被淹没。
 *    LEGACY_UNKNOWN 的存在理由：迁移尚未发生，存量非法值必然「不全在白名单内」。若直接以
 *    「白名单外即红」判定，门禁在批 0 当场就红，等于把「存量待迁移」与「新增违规」混为一谈，
 *    失去定位能力。冻结词表把存量一次性登记在案，此后任何**新增**的非法值都被精确抓住。
 *    维护：node scripts/check-token-discipline.mjs --dump-legacy
 *
 * 防静默变绿：扫描目录缺失 / 读不到任何 CSS / 某条规则的候选声明数为 0（说明该规则的正则或
 *   属性口径已失效，会静默判 0 违规）→ 一律**显式硬失败** exit 1，绝不降级为「0 违规」通过。
 *   另有**规则表自检**（validateRules，模块加载即跑）：声明表写错一格（如 count='decl' 却缺
 *   violating()、whitelistScope 取值非法）同样硬失败 —— 否则白名单会静默退化成「全值比对」。
 *   还有**属性口径自检**（validatePropCoverage，模块加载即跑）：属性**族**规则的 prop 正则必须
 *   命中 fixture 清单的真实属性、且拒斥不存在的属性名。为什么必须有这条 —— 「候选声明数为 0」
 *   那条守卫**拦不住属性族的部分漏收**：R6 原正则漏收 8 个真实角形态、误收 26 个不存在属性时，
 *   候选数仍有 170，守卫毫无察觉，而 `border-top-left-radius: 9px` 这类全新裸 px 违规端到端
 *   **100% 看不见**（候选数、计数、newUnknown 三者全不变）。这类「正则覆盖漏洞」只能靠清单比对。
 *   该自检自身也曾有一条**可被同一笔改动一并改绿**的洞（2026-09-28 QA 实证）：它只校验「fixture
 *   里列了什么 → 正则必须与之相符」，**不校验「属性族规则必须有 fixture」**。于是把 fixture 条目
 *   整体置空、同时把 prop 换回坏正则 → 自检通过、门禁报全绿 —— 守卫与被守卫者同处一地。
 *   故补三条断言（判据**全部静态**，不取自被测正则）：
 *     **(a) 基数下限**（每组 fixture 声明 must / mustNot 条数下限，删任一条即红）；
 *     **(b) 属性族完整性**（`propFamily: true` 的规则必须持有**非空** fixture —— 静态声明，
 *       与 prop 正则当前形态无关）；
 *     **(c) 属性族 × 探针交叉校验**（`propFamily` 规则在 PROP_FAMILY_PROBE 上命中数须 ≥2；
 *       反向：未声明却在探针上命中 ≥2 → 报「疑似漏标」）。
 *   为什么 (b) 必须读静态字段：**判据取自被测对象 = 循环前提**。第一版用
 *   `PROBE.filter(p => rule.prop.test(p)).length > 1` 判「是不是属性族」，于是把 R6 的 prop 换成
 *   退化正则（探针只命中 1 个）→ 被判「单属性」→ (b) 跳过 R6；再整块删掉 fixture → (a) 也无条目
 *   可比 → **整块删除 + 退化正则 → exit 0 全绿**（QA 实证）。探针再完备也无效：这不是覆盖深度
 *   不足，而是「要验的对象同时充当验它的尺子」。现 (b) 与正则无关，正则退化由 (c) 的**静态期望
 *   ≥2** 抓 → 两条各治一面。
 *
 * 用法：
 *   node scripts/check-token-discipline.mjs               # 详细输出；任一条红 → exit 1
 *   node scripts/check-token-discipline.mjs --json        # JSON 输出 { r1, r3..r9, allOk }
 *   node scripts/check-token-discipline.mjs --dump-legacy  # 打印可粘贴的 LEGACY_UNKNOWN 常量块
 *
 * 退出码：0 = 全绿；1 = 存在违规（供 verify-site / CI 阻断）。
 *
 * 说明：R1 部分（V0）**只报不改** —— 门禁先红起来，10 处 CSS 由后续 V1–V6 批次修复。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSS_DIR = path.join(ROOT, 'css');
const TOKENS_FILE = 'tokens.css'; // 令牌定义源：裸色值检查豁免它，但它正是本门禁的解析输入
/** R3–R9 扫描豁免集：tokens.css = 定义源；badge-maker.css = 自成体系（站级待决项 S10） */
const LADDER_EXEMPT = new Set([TOKENS_FILE, 'badge-maker.css']);
const jsonMode = process.argv.includes('--json');
const dumpLegacy = process.argv.includes('--dump-legacy');

// ═══════════════════════════════════════════════════════════════
// 常量区（唯一真源，集中一处便于演进）
// ═══════════════════════════════════════════════════════════════

// 单层 <shadow> 的 length 上限（CSS 规范：2–4 个 <length>）
const MAX_LENGTHS_PER_LAYER = 4;

/** R1：值型阴影令牌：名字以 `--shadow-` 开头，但**排除**颜色型 `--shadow-color-*` */
const VALUE_SHADOW_NAME_RE = /^--shadow-(?!color-)/;
/** R1：「疑似阴影令牌」引用（含未定义/裸 `--shadow`）——仅用于信息性提示，不阻断 */
const SHADOW_REF_RE = /var\(\s*(--shadow[a-zA-Z0-9_-]*)/g;
/** R1：长度 token（CSS length / 无单位 0）：用逐 token 测试而非全文正则，避免 `0.5` 被 `\b0\b` 误切 */
const LENGTH_TOKEN_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|q|%)?$/i;
/** R1：颜色函数（含嵌套），在统计 length 前需按平衡括号整体剔除 */
const COLOR_FN_HEAD_RE = /^(?:-webkit-|-moz-)?(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color|light-dark|device-cmyk)\s*\(/i;

/**
 * 阶梯纪律基线（**只降不升**）。
 * 来源：项目总监 2026-09-28 实测，口径 = style.css + critical.css + admin.css（不含 badge-maker）。
 * 实测低于基线时**只提示、不自动改**：基线下调属人工决策（见文件头「计数信号」）。
 * R3 修正 238 → 237：原 238 由 `grep -cvE 'var\(--fs'` 得出，把关键词 `inherit` 误算为「非令牌
 *   裸值」。正确口径 285(总) − 47(var(--fs-*)) − 1(inherit) = 237，详见文件头「R3 基线口径修正」。
 */
const BASELINES = { R3: 237, R4: 14, R5: 320, R6: 77, R7: 13, R8: 4, R9: 13 };

/** 阶梯终点：迁移完成后应达到的值（供输出展示与后续批次验收，不参与判定） */
const TARGETS = { R3: 20, R4: 5, R5: 50, R6: 0, R7: 3, R8: 0, R9: 0 };

/**
 * 阶梯白名单（**唯一允许值集合**）：var 前缀 + 关键词 + 阶梯字面量。
 * 出现在此集合之外的值 → 计入 unknownValues；若同时不在 LEGACY_UNKNOWN 冻结词表内 → 阻断。
 */
const LADDER = {
  R3: { varPrefix: '--fs-', keywords: [], literals: [] },
  R4: { varPrefix: '--lh-', keywords: ['normal'], literals: ['1.2', '1.4', '1.7', '1.9'] },
  R5: { varPrefix: '--space-', keywords: [], literals: ['0', '4px', '8px', '12px', '16px', '24px', '32px', '48px', '64px'] },
  R6: { varPrefix: '--radius-', keywords: [], literals: ['0', '50%', '8px', '12px', '16px', '999px'] },
  R7: { varPrefix: '--dur-', keywords: [], literals: ['0s', '0.01ms', '150ms', '200ms', '300ms', '0.15s', '0.2s', '0.3s'] },
  R8: { varPrefix: '--z-', keywords: ['auto'], literals: [] },
  R9: { varPrefix: '--fw-', keywords: ['normal'], literals: ['400', '500', '600', '700'] },
};

/** CSS-wide 关键词：非「阶梯值」范畴，任何属性下都成立，一律放行 */
const CSS_WIDE = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

// [告警] 维护提示（重新生成冻结词表前必读）：`--dump-legacy` 的输出只含**纯值列表**，不含本常量块
//   内为 R5 / R8 写下的**因果注释**（「rem / em / auto / % 已移出 —— 不在 R5 含裸 px 口径内」
//   「<999 的裸整数按 R8 口径本就合法」）。直接整块粘贴覆盖会把这两条因果说明丢掉，
//   后续维护者便无从得知那些值**为何被移出**，极易「顺手」把它们再收回冻结词表 —— 那正是本轮
//   修掉的假红根因（合法值被当成白名单外新值误伤）。**重新生成后必须手工补回 R5 / R8 注释。**
/**
 * 冻结词表（**只减不增**）：当前资产中「不在白名单内」的既有值 —— 白名单外但**非新增**。
 * 每条以 `|` 连接（规范化拼写）。作用：区分「等价交换（旧值→新值）」与「存量待迁移」，
 * 使批 0 可先绿起来再逐批收敛；新增的非法值仍会被精确阻断。
 * 重新生成：node scripts/check-token-discipline.mjs --dump-legacy
 */
const LEGACY_UNKNOWN = {
  // R3 font-size 裸值（非 --fs-* 令牌）：白名单外存量 41 个
  R3:
    '0.72rem|0.74rem|0.78rem|0.7rem|0.8125rem|0.82rem|0.85rem|0.875rem|0.88em|0.88rem|0.8rem|0.92rem|0.9375rem|' +
    '0.95rem|0.98rem|0.9rem|1.05rem|1.15rem|1.1rem|1.2rem|1.35rem|1.3rem|1.4rem|1.5rem|1.6rem|1.8rem|1.9rem|12px|' +
    '13px|15px|2.2rem|2.5rem|2.6rem|20px|22px|24px|28px|2rem|32px|clamp(3.5rem, 24vw, 5rem)|' +
    'clamp(4.5rem, 16vw, 7rem)',
  // R4 line-height 值种类：白名单外存量 10 个
  R4: '1|1.05|1.1|1.3|1.35|1.5|1.55|1.6|1.75|1.85',
  // R5 padding/margin/gap 裸 px：白名单外存量 21 个
  //   （rem / em / auto / % 已移出 —— 它们不在 R5「含裸 px」口径内，既不阻断也不冻结，见 RULES.R5）
  R5: '-1px|-2px|-8px|10px|11px|13px|14px|18px|1px|20px|22px|28px|2px|30px|36px|3px|40px|44px|5px|6px|7px',
  // R6 border-radius：白名单外存量 8 个（含 var(--radius) 单数形式 —— 规格白名单只收 var(--radius-*)）
  R6: '0.6rem|10px|20px|2px|3px|4px|6px|var(--radius)',
  // R7 动效时长：白名单外存量 8 个
  R7: '0.12s|0.1s|0.25s|0.45s|0.4s|0.5s|0.6s|2s',
  // R8 z-index 魔法大数：白名单外存量 1 个
  //   （1 / 2 / 50 / 90 / 99 / 100 等 <999 的裸整数已移出 —— 按 R8「裸值 ≥999」口径本就合法，见 RULES.R8）
  R8: '9999',
  // R9 font-weight：白名单外存量 2 个
  R9: '800|bold',
};

// ═══════════════════════════════════════════════════════════════
// 通用工具
// ═══════════════════════════════════════════════════════════════

/** 把 CSS 注释替换为同长度空白（保留换行）——保持字符偏移与行号不变 */
function blankComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

/**
 * 抽取「属性: 值」声明，逐字符扫描（**花括号 / 括号 / 引号感知**）。
 * 为什么不用 `/prop\s*:\s*([^;}]*)/g`：选择器里的伪类（`.btn:hover`）会被当成声明，
 * 并**吞掉**紧随其后的真实声明（`font-size` 会静默消失 → 计数偏少 → 假绿）。
 * 这里以「块内语句」为粒度：`{` 进入块并丢弃前导选择器文本，`;` / `}` 结束一条语句。
 * 返回 [{ prop, value, line }]，line 取语句**首字符**所在行。
 *
 * 行号取值（2026-09-28 修复「明细 file:L 行系统性少 1 行」，QA 复核发现）：
 *   原实现只在 `flush()` 里 `startLine = line` —— 而 flush 是在读到**终结符**（`;` / `}`）那一刻
 *   执行的，此时 `line` 是**上一条语句结束**的行，本条语句的行号从未被记录。
 *   后果：凡是「声明不在前一个 `;` / `{` / `}` 的同一物理行」的多行写法（本仓库绝大多数），
 *   明细里的 `file:L行` 一律 **−1**，指向上一条语句 → 工程师按行号打开看到无关代码，
 *   直接废掉「一次调用即给出可定位结论」这一设计目标（也废掉 verify-site [35] 的自述承诺）。
 *   单行紧凑规则（`.st-22 { … font-weight: bold; }`）恰好报对 —— 故**只在单行紧凑规则上自测
 *   会漏掉本缺陷**（作者首轮即因此误判为通过）。
 *   修法：在循环体末尾读到**首个非空白字符**时把 startLine 钉到当前行（见下方守卫）。
 *   [告警] 守卫条件只能写 `buf.trim() === ''`：`buf` 会累积换行与缩进空白，写 `buf === ''`
 *     **永不成立**（等于没改，现象完全一样）—— 切勿"简化"。
 */
function extractDeclarations(src) {
  const out = [];
  let paren = 0;
  let quote = null;
  let buf = '';
  let line = 1;
  let startLine = 1;
  const flush = () => {
    if (buf.trim()) {
      const m = /^\s*([-a-zA-Z_][-a-zA-Z0-9_]*)\s*:\s*([\s\S]*)$/.exec(buf);
      // 值里出现 `{` 说明这不是声明（选择器/at 规则前导文本），丢弃
      if (m && !m[2].includes('{')) out.push({ prop: m[1], value: m[2], line: startLine });
    }
    buf = '';
    startLine = line;
  };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === '\\') { buf += c + (src[i + 1] ?? ''); i++; continue; }
      if (c === quote) quote = null;
      buf += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '\n') line++;
    if (c === '(') { paren++; buf += c; continue; }
    if (c === ')') { if (paren > 0) paren--; buf += c; continue; }
    if (paren === 0 && c === '{') { flush(); buf = ''; continue; }
    if (paren === 0 && (c === '}' || c === ';')) { flush(); continue; }
    // 本条语句的首个非空白字符 → 把 startLine 钉到它所在行（`line` 已在上面 `\n` 处自增，
    // 故此处取到的就是本字符的真实行号）。守卫用 trim() 判空，见上方「切勿简化」告警。
    if (buf.trim() === '' && c !== '\n' && c !== ' ' && c !== '\t') startLine = line;
    buf += c;
  }
  return out;
}

/** 声明值规范化：去 `!important`、折叠空白、去首尾空白 */
function stripValue(raw) {
  return raw.replace(/!important/gi, '').trim().replace(/\s+/g, ' ');
}

/** 语义规范化：把数字的等价拼写统一（`.15s` → `0.15s`），小写化。仅用于白名单比对与冻结词表 */
function normSpelling(v) {
  return v
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|[\s(,/+*])(\.\d)/g, '$10$2')
    .trim();
}

/** 判断值是否为「整体即一个令牌引用」：`var(--name)` 或 `var(--name, fallback)` */
function tokenRefName(v) {
  const m = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,[\s\S]*)?\)$/.exec(v.trim());
  return m ? m[1] : null;
}

/** 值是否引用了指定前缀的令牌（整体引用形态） */
function isTokenVar(v, prefix) {
  const name = tokenRefName(v);
  return name !== null && name.startsWith(prefix);
}

/** 按平衡括号整体剔除 `var(...)` 调用（用于「裸 px」判定：var 内含的 px 不算裸值） */
function stripVarRefs(v) {
  let out = '';
  let i = 0;
  while (i < v.length) {
    const m = /^var\s*\(/i.exec(v.slice(i));
    if (m) {
      let depth = 0;
      let j = i + m[0].length - 1;
      for (; j < v.length; j++) {
        if (v[j] === '(') depth++;
        else if (v[j] === ')') { depth--; if (depth === 0) break; }
      }
      out += ' ';
      i = j + 1;
    } else {
      out += v[i];
      i++;
    }
  }
  return out;
}

/** 值中是否含「裸 px」长度（含负值 `-1px`；`var()` 内部已剔除） */
function hasBarePx(v) {
  return /[+-]?\d*\.?\d+px/i.test(stripVarRefs(v));
}

/**
 * 把多值声明拆成顶层原子（用于 padding/margin/gap 与 border-radius）。
 * 关闭括号后补空格，使 `var(--a)var(--b)` 这类黏连写法也能拆开；
 * 括号内（如 `calc(1rem + 2px)`）整体保留为一个原子。
 */
function splitAtoms(v) {
  const out = [];
  const s = v.replace(/\)/g, ') ').replace(/,/g, ' ');
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth === 0 && (ch === ' ' || ch === '\t' || ch === '/')) {
      if (cur) out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** 提取动效时长 token（原样拼写，供计数） */
function rawDurations(v) {
  return [...v.matchAll(/[+-]?\d*\.?\d+(?:ms|s)(?![\w%])/gi)].map((m) => m[0]);
}

/** 阶梯白名单判定：该「比对主体」是否被允许 */
function isAllowed(id, subject, rule) {
  const s = subject.trim();
  if (isTokenVar(s, LADDER[id].varPrefix)) return true;
  if (CSS_WIDE.has(s.toLowerCase())) return true;
  if (LADDER[id].keywords.includes(normSpelling(s))) return true;
  return rule.literalSet.has(normSpelling(s));
}

/** 收集一条规则下的「比对主体」→ 首次出现位置 的映射
 *  白名单范围与计数口径同源：`whitelistScope: 'violating'` 的规则只收「被本口径判为违规」的主体，
 *  使白名单不会比计数更严（见 RULES 上方说明）。该字段与 `violating()` 的配套完整性由
 *  `validateRules()` 在模块加载时统一校验 —— 单点校验，不在这里重复判定。
 *  `seq` = 该主体**首次出现**的声明在扫描序中的下标（全序、唯一）—— 供计数报红时把
 *  「首次出现最晚」的主体判定为肇事候选（见 displayOrder）。
 *  `prop` = 该主体**首次出现所在声明自己的属性名**。定位输出必须用它、**不能**用规则级
 *  「代表属性」（`matched[0].prop`）：R7 一条规则同时覆盖 `transition` / `animation` /
 *  `animation-duration`，其 `matched[0].prop` 恒为扫描序里最先出现的那个（通常是 `transition`），
 *  于是来自 `animation` 声明的时长值会被标成 `transition: 白名单外值 0.45s` —— 行号虽对，
 *  但属性名指错，工程师按标签去该行找 `transition` 会扑空（2026-09-28 全量核对 669 条明细时
 *  发现，5 条命中此类标签错位，全部出自 R7 的 `animation` 声明）。 */
function collectSubjects(rule, decls) {
  const map = new Map();
  const violatingOnly = rule.whitelistScope === 'violating';
  const add = (subject, d) => {
    const key = normSpelling(subject);
    if (!key || map.has(key)) return;
    if (violatingOnly && !rule.violating(key)) return;
    map.set(key, { file: d.file, line: d.line, value: key, detail: d.norm, seq: d.seq, prop: d.prop });
  };
  for (const d of decls) {
    if (rule.subject === 'atoms') for (const a of splitAtoms(d.norm)) add(a, d);
    else if (rule.subject === 'timing') {
      for (const t of rawDurations(d.norm)) add(t, d);
      for (const a of splitAtoms(d.norm)) if (/^var\(/i.test(a)) add(a, d);
    } else add(d.norm, d);
  }
  return map;
}

// ═══════════════════════════════════════════════════════════════
// R1：box-shadow 值型令牌与字面 length 混排
// ═══════════════════════════════════════════════════════════════

/** 解析 CSS 中的自定义属性定义 `--name: value;`，返回 Map */
function parseTokenDefs(src) {
  const defs = new Map();
  const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]*);/g;
  for (const m of src.matchAll(re)) defs.set(m[1], m[2].trim());
  return defs;
}

/** 从一批定义中筛出值型阴影令牌 */
function pickValueShadowTokens(defs) {
  const out = new Map();
  for (const [name, value] of defs) if (VALUE_SHADOW_NAME_RE.test(name)) out.set(name, value);
  return out;
}

/** 按平衡括号整体剔除颜色函数调用 */
function stripColorFunctions(s) {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const m = COLOR_FN_HEAD_RE.exec(s.slice(i));
    if (m) {
      let depth = 0;
      let j = i + m[0].length - 1;
      for (; j < s.length; j++) {
        if (s[j] === '(') depth++;
        else if (s[j] === ')') { depth--; if (depth === 0) break; }
      }
      out += ' ';
      i = j + 1;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

/**
 * 展开值型阴影令牌。
 * - 值型 `var(--shadow-*)` → 递归替换为其定义值（最多 8 轮，防定义自引用死循环）
 * - 颜色型 `var(--shadow-color-*)` → 不展开（它只是颜色，不含 length），按 `var()` 剔除
 * - 其他 `var(...)` → 取 fallback（若有），否则剔除
 */
function expandShadowTokens(value, valueShadowTokens) {
  let out = value;
  for (let round = 0; round < 8; round++) {
    let substituted = false;
    out = out.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g, (_full, name, fallback) => {
      if (valueShadowTokens.has(name)) {
        substituted = true;
        return ` ${valueShadowTokens.get(name)} `;
      }
      return fallback === undefined ? ' ' : ` ${fallback} `;
    });
    if (!substituted) break;
  }
  return out;
}

/** 统计一条 box-shadow 声明各层的 length 数 */
function countLengthsPerLayer(expanded) {
  const cleaned = stripColorFunctions(expanded).replace(/#[0-9a-fA-F]{3,8}\b/g, ' ');
  return cleaned
    .split(',')
    .map((layer) => layer.trim().split(/\s+/).filter((t) => t && LENGTH_TOKEN_RE.test(t)).length);
}

function listScannableCss() {
  if (!fs.existsSync(CSS_DIR)) return [];
  return fs.readdirSync(CSS_DIR)
    .filter((f) => f.endsWith('.css') && f !== TOKENS_FILE)
    .sort();
}

function checkR1() {
  // 防「静默变绿」：tokens.css 是本门禁唯一的令牌定义来源。若它缺失/被改名，
  // 值型令牌将无法展开、每条声明都算作 0 个 length → 门禁会**无声通过**（假阴性）。
  // 这正属本门禁要治的「沉默逻辑错误」，故此处必须显式硬失败，绝不降级为 0 违规。
  const tokensPath = path.join(CSS_DIR, TOKENS_FILE);
  if (!fs.existsSync(tokensPath)) {
    console.error(`[token-discipline] ✗ 令牌定义源缺失: css/${TOKENS_FILE}（无法展开值型阴影令牌，判定将失真；拒绝以「0 违规」静默通过）`);
    process.exit(1);
  }
  const globalDefs = parseTokenDefs(blankComments(fs.readFileSync(tokensPath, 'utf8')));
  const globalShadowTokens = pickValueShadowTokens(globalDefs);
  // 已知阴影令牌全集（值型 + 颜色型），用于区分「颜色型（合法）」与「真的未定义」
  const globalShadowNames = new Set([...globalDefs.keys()].filter((n) => /^--shadow/.test(n)));

  const files = listScannableCss();
  const violations = [];
  const unresolved = [];
  let declarations = 0;

  for (const cssFile of files) {
    const raw = fs.readFileSync(path.join(CSS_DIR, cssFile), 'utf8');
    const src = blankComments(raw);

    // 该文件的**局部**阴影令牌定义同样参与解析：如 css/badge-maker.css 在 .badge-maker-root
    // 内定义了 `--shadow` / `--shadow-sm`（局部作用域），若只用 tokens.css 展开会误判为未定义。
    const localDefs = parseTokenDefs(src);
    const valueShadowTokens = new Map([...globalShadowTokens, ...pickValueShadowTokens(localDefs)]);
    // 已知的阴影令牌名（值型 + 颜色型），用于区分「未定义」与「颜色型」
    const knownShadowNames = new Set([
      ...globalShadowNames,
      ...[...localDefs.keys()].filter((n) => /^--shadow/.test(n)),
    ]);

    const declRe = /box-shadow\s*:/g;
    for (const m of src.matchAll(declRe)) {
      const start = m.index + m[0].length;
      let end = start;
      while (end < src.length && src[end] !== ';' && src[end] !== '}') end++;
      const rawValue = src.slice(start, end);
      declarations++;

      // 信息性：引用了无法解析的阴影令牌（如拼写错误 / 未定义）——同样会导致整条声明失效
      for (const ref of rawValue.matchAll(SHADOW_REF_RE)) {
        if (!knownShadowNames.has(ref[1])) {
          unresolved.push({ file: `css/${cssFile}`, line: src.slice(0, start).split('\n').length, token: ref[1] });
        }
      }

      const expanded = expandShadowTokens(rawValue, valueShadowTokens);
      const normExpanded = expanded.trim().toLowerCase().replace(/!important/g, '').trim();
      // S8(2026-09-30)：<shadow> 规范要求的 length 数为 2–4；单层 <2（如 `box-shadow: 5px`
      //   仅 1 个 length）或 >4 均被浏览器**静默丢弃**（同属最贵的「沉默逻辑错误」失效类）。
      //   排除 none/initial/unset/inherit 这类合法非 length 值（`box-shadow: none`）；
      //   同时 skip 仍含未展开 `var()` 的声明（如 `var(--toast-shadow)` / `var(--shadow)`
      //   等非 --shadow-* 令牌，门禁无法静态解析其 length，不在此判定，交由 R1 既有的
      //   unresolved 信息性提示覆盖），避免假阳性。
      const isNoneLike = /^(?:none|initial|unset|inherit)$/.test(normExpanded);
      // 含无法静态解析的自定义属性引用（非 --shadow-* 值型令牌，如 `var(--toast-shadow)` /
      //   `var(--shadow)` / `var(--primary-light)` / `var(--shadow-color-*)` 等）——长度无法静态
      //   判定，skip 以避免假阳性（unresolved 信息性提示已覆盖）。
      const hasUnresolvableVar = /var\(\s*--(?!shadow-(?!color-))/.test(rawValue);
      if (!isNoneLike && !hasUnresolvableVar) {
        const perLayer = countLengthsPerLayer(expanded);
        const maxLayer = perLayer.length ? Math.max(...perLayer) : 0;
        const minLayer = perLayer.length ? Math.min(...perLayer) : 0;
        if (maxLayer > MAX_LENGTHS_PER_LAYER || minLayer < 2) {
          violations.push({
            file: `css/${cssFile}`,
            line: src.slice(0, start).split('\n').length,
            layers: perLayer,
            maxLayer,
            minLayer,
            limit: MAX_LENGTHS_PER_LAYER,
            minLimit: 2,
            expanded: expanded.trim().replace(/\s+/g, ' ').slice(0, 140),
            context: rawValue.trim().replace(/\s+/g, ' ').slice(0, 140),
          });
        }
      }
    }
  }

  return {
    ok: violations.length === 0,
    scannedFiles: files.length,
    declarations,
    violations: violations.length,
    detail: violations,
    unresolvedShadowTokens: unresolved,
  };
}

// ═══════════════════════════════════════════════════════════════
// R3–R9：令牌阶梯纪律
// ═══════════════════════════════════════════════════════════════

/** 位置后缀：padding / margin 的方向变体（**仅 R5 使用**；R6 的角后缀是双 token 形态，见 RULES.R6 的属性覆盖注释） */
const SIDE = '(?:top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end)';

/**
 * 阶梯规则声明表（唯一真源：口径 / 白名单 / 定位全部由这里描述，故无 7 份复制的判定代码）。
 *
 * `whitelistScope` —— 白名单的**比对范围**，必须与计数口径一致：
 *   · 缺省（'matched'）：该属性下**全部**比对主体。适用于无 `violating()` 的规则（R4 / R7：
 *     口径本就是「值的种类数」，每个出现过的值都是比对对象）。
 *   · 'violating'：只比对**被本规则口径判为违规**的主体。计数若带条件（R5「含裸 px」、
 *     R8「数值 ≥999」）就必须声明它 —— 否则白名单比计数更严：`z-index: 10`、`padding: 0.5rem`
 *     这类**按口径完全合法**的值会被当成「白名单外新值」而阻断（假红），同时它们还会占满
 *     LEGACY_UNKNOWN 冻结词表，把真正的存量违规淹掉。
 */
const RULES = [
  {
    id: 'R3',
    label: 'font-size 裸值（非 --fs-* 令牌）',
    criterion: '值非 var(--fs-*) 且非关键词的声明条数',
    prop: /^font-size$/i,
    count: 'decl',
    subject: 'whole',
    violating: (v) => !isTokenVar(v, '--fs-') && !CSS_WIDE.has(v.toLowerCase()),
  },
  {
    id: 'R4',
    label: 'line-height 值种类',
    criterion: '去重后的值种类数',
    prop: /^line-height$/i,
    count: 'distinct',
    subject: 'whole',
  },
  {
    id: 'R5',
    propFamily: true, // 属性族静态声明（判据不取自被测正则，见 validatePropCoverage 的「循环前提」说明）
    label: 'padding/margin/gap 裸 px',
    criterion: '值中含裸 px 的声明条数（声明级，0 与 var 不计）',
    prop: new RegExp(`^(?:(?:padding|margin)(?:-${SIDE})?|gap|row-gap|column-gap|grid-gap|grid-row-gap|grid-column-gap)$`, 'i'),
    count: 'decl',
    subject: 'atoms',
    // 属性覆盖（2026-09-28 QA 复核发现漏收，已修）：`gap` 是**简写**，其方向变体是独立的属性
    //   `row-gap` / `column-gap`（旧写法 `grid-gap` / `grid-row-gap` / `grid-column-gap` 是其别名）。
    //   原正则只写 `gap`，于是 `row-gap: 7px` / `column-gap: 7px` 这类声明**根本不进候选集**
    //   （候选数不变、计数不变、newUnknown 为空 → 全新裸 px 违规 100% 看不见）。
    //   注意 `(?:-SIDE)?` 只挂在 padding/margin 上：gap 族**没有**方向后缀，
    //   `row-gap-top` 之类不存在的属性不应被收（见 validatePropCoverage 的 fixture）。
    // 白名单与计数同口径：只校验**含裸 px 的原子**。间距里的 rem / em / auto / % 值不在本规则
    // 口径内 —— 既不阻断也不冻结（曾把 32 个 rem/em/auto 值错收进冻结词表，使 `padding: 0.5rem`
    // 这类合法间距被当成「白名单外新值」误伤）。
    // 已知边界：间距 rem/em/auto 值不在 R5 口径内，另立规则处理（与本方案待决项同源）。
    whitelistScope: 'violating',
    violating: (v) => hasBarePx(v),
  },
  {
    id: 'R6',
    propFamily: true, // 属性族静态声明（判据不取自被测正则，见 validatePropCoverage 的「循环前提」说明）
    label: 'border-radius 裸 px',
    criterion: '值中含裸 px 的声明条数（0 / 50% / var 不计）',
    // 属性覆盖（2026-09-28 QA 复核发现漏收 + 误收，已修）：圆角属性共 **9 个**真实形态 ——
    //   简写 `border-radius` + 物理 4 角 `border-{top|bottom}-{left|right}-radius` +
    //   逻辑 4 角 `border-{start|end}-{start|end}-radius`（块向在前、行向在后）。
    //   原正则 `^border(?:-(?:SIDE)(?:-start|-end)?)?-radius$`（`SIDE` = 上方 L533 常量，
    //   **不含** `start` / `end`）只允许**一个** side token，而物理角与逻辑角各需要**两个**
    //   token → 后果双向出错：
    //     · 漏收 **8** 个真实形态（4 物理角 + 4 逻辑角）：`border-top-left-radius: 9px` 这类
    //       **全新裸 px 违规 100% 看不见**（候选数都不变，属静默变绿）；
    //     · 误收 **26** 个**不存在**的属性（`border-top-radius` / `border-block-start-radius` /
    //       `border-inline-end-end-radius` 等）→ 无意义的属性名被计入，模糊口径。
    //   复算方法（后人一步复核，勿再用「举例清单」当计数）：候选名 = 简写 1 + 单 token 8 +
    //     双 token 8² + 三 token 8³（token 取 `top|right|bottom|left|start|end|block|inline`）
    //     = **585 个**，已覆盖旧正则语言的句法上界（≤3 token）；把 `SIDE` 按 L533 展开后逐名求值
    //     → 旧正则共接受 **27** 个，其中真实仅 **1** 个（简写）→ 误收 **26** / 漏收 **8**
    //     （当前正则：接受 9 / 误收 0 / 漏收 0）。
    //     [告警] 若把 `(?:SIDE)` 误读作 `top|right|bottom|left|start|end|block|inline`（含 start/end，
    //       与 L533 的 SIDE 不符），同一口径下得误收 20 / 漏收 4 —— 该读法与「漏收 8 个（4 物理角
    //       + 4 逻辑角）」自相矛盾（逻辑角在那种读法下**不会**被漏收），故不可采用。
    //   实测当前资产 0 条角形态声明（149 条 radius 全是简写），故此修复**不动任何计数与基线**。
    prop: /^border(?:-(?:(?:top|bottom)-(?:left|right)|(?:start|end)-(?:start|end)))?-radius$/i,
    count: 'decl',
    subject: 'atoms',
    // [告警] 口径**有意**与 R5 不同（评审裁决 2026-09-28，勿「顺手统一」成 R5 的 narrow 口径）：
    //   R6 保持**全值口径**白名单（不声明 whitelistScope: 'violating'），即 border-radius 下
    //   **全部**比对主体都进白名单比对与冻结词表。这里冻结了 2 个**不含裸 px** 的项，其中
    //   `var(--radius)`（**单数形式**，非 `--radius-*`）是应迁移到阶梯令牌的**真实欠债** ——
    //   而它不含裸 px → **计数信号（77）照不到它**，全值口径的白名单 + 冻结词表是它唯一的
    //   可见面。若照 R5 收窄成「只收含裸 px 的值」，这 2 项会**同时**退出白名单比对与冻结词表，
    //   该欠债即刻从门禁视野彻底消失（后续批次再也无从追踪）。
    //   R5 之所以必须收窄，是因为它的非 px 值（rem / em / auto / %）**本来就合法**，不该进
    //   冻结词表；R6 恰好相反 —— 这正是两者口径差异的判据，不是疏漏。
    violating: (v) => hasBarePx(v),
  },
  {
    id: 'R7',
    propFamily: true, // 属性族静态声明（判据不取自被测正则，见 validatePropCoverage 的「循环前提」说明）
    label: '动效时长 token 种类',
    criterion: '时长 token 的去重种类数',
    prop: /^(?:transition|animation|transition-duration|animation-duration)$/i,
    count: 'timing',
    subject: 'timing',
    // [告警] 口径边界**有意**收窄，勿「顺手」把 `-delay` 族并进来（实测差异见下）。
    //   本行 prop 只收 `transition` / `animation` / `transition-duration` / `animation-duration`；
    //   **不含** `animation-delay` / `transition-delay`，也**不含**厂商前缀写法。
    //   实测本资产：`animation-delay` 共 **40 处**（css/style.css:337-356 与 css/critical.css 各 20 处，
    //   值 0.05s…1.00s 共 **20 种**拼写），`transition-delay` **0 处**，`-webkit-/-moz-/-ms-/-o-`
    //   前缀 **0 处** —— 即这批时长声明**完全不在 R7 视野内**（既不计入种类数，也不进冻结词表）。
    //   宽窄口径实测对照：本行口径 **13 种**（= BASELINES.R7，自洽）；若把两个 `-delay` 属性并入
    //   prop，种类数跳到 **30 种** —— 基线必须同步重设，故**不在本轮**动。
    //   结论：`-delay` 族与厂商前缀**归后续批次**；纳入只需改本行 `prop`，但**必须同时**复核
    //   BASELINES.R7 与 LEGACY_UNKNOWN.R7，否则新旧口径混算会让冻结词表对不上 → 误报「白名单外新值」。
  },
  {
    id: 'R8',
    label: 'z-index 魔法大数',
    criterion: '裸值数值 >= 999 的声明条数',
    prop: /^z-index$/i,
    count: 'decl',
    subject: 'whole',
    // 白名单与计数同口径：只有**裸值 ≥999** 才算「魔法大数」，才参与白名单比对。
    // <999 的裸整数（1 / 2 / 50 / 90 / 99 / 100）按本规则口径**本来就合法**，既不阻断也不冻结
    // （曾错收进冻结词表，导致新增 `z-index: 10` 被当成「白名单外新值」误伤）。
    whitelistScope: 'violating',
    violating: (v) => {
      if (isTokenVar(v, '--z-') || /^auto$/i.test(v)) return false;
      const n = Number.parseFloat(v);
      return Number.isFinite(n) && n >= 999;
    },
  },
  {
    id: 'R9',
    label: 'font-weight bold/800',
    criterion: '值等于 bold 或数值 800 的声明条数',
    prop: /^font-weight$/i,
    count: 'decl',
    subject: 'whole',
    // [告警] 白名单**有意严格于**计数口径（方向 = fail-closed：宁可多红，不可错绿）。
    //   与 R6 同源（理由与判据见上方 R6 注释，此处只记 R9 自身的表现），**勿「顺手统一」**成
    //   `whitelistScope: 'violating'` 的窄口径：本规则不声明该字段 → 走**全值口径**白名单，
    //   即 font-weight 下**全部**比对主体都进白名单比对与冻结词表，而计数只认 `bold` 与 `800`。
    //   于是形如 `font-weight: 900` 这类值：**计数信号（13）照不到它**（不计入违规条数），
    //   但会被白名单拦下并逐条定位 —— 这是**有意的**，不是口径错配。
    //   该严格性可接受：白名单比计数**更严**最多产生**假红**（人工复核即消解，不影响资产正确性）；
    //   反向收窄成窄口径则会让真实欠债从门禁视野**彻底消失**（假绿，不可接受）。
    violating: (v) => /^bold$/i.test(v) || Number.parseFloat(v) === 800,
  },
];

/**
 * 规则表自检（**模块加载即跑，先于任何扫描**）—— 防静默变绿 / 防错因不可读。
 * 为什么需要：声明表是唯一真源，写错一格（如 count='decl' 却漏了 violating()、whitelistScope
 * 收窄却没给判定函数）在运行时有两种坏下场：① 被 countOf / collectSubjects 调用时抛
 * `TypeError: rule.violating is not a function` —— 崩溃点指向调用处读不出根因；
 * ② 若恰好没被调到，白名单会静默退化成「全值比对」（回到本轮修掉的错配态）而**照样报绿**。
 * 故此处一次性校验，任何一格写错都给出可定位的硬失败。
 */
function validateRules() {
  const bad = [];
  for (const rule of RULES) {
    const id = rule.id || '(缺 id)';
    if (!Number.isFinite(BASELINES[id])) bad.push(`${id} 缺 BASELINES 基线`);
    if (!Number.isFinite(TARGETS[id])) bad.push(`${id} 缺 TARGETS 目标`);
    if (!LADDER[id]) bad.push(`${id} 缺 LADDER 白名单`);
    if (rule.count === 'decl' && typeof rule.violating !== 'function') bad.push(`${id} count='decl' 但缺 violating() 判定函数`);
    if (rule.whitelistScope === 'violating' && typeof rule.violating !== 'function') bad.push(`${id} whitelistScope='violating' 但缺 violating() 判定函数`);
    if (rule.whitelistScope && rule.whitelistScope !== 'violating' && rule.whitelistScope !== 'matched') bad.push(`${id} whitelistScope 取值非法: ${rule.whitelistScope}`);
  }
  if (bad.length) {
    console.error(`[token-discipline] ✗ 规则表自检未通过（白名单/计数口径将失真，拒绝继续）:\n  - ${bad.join('\n  - ')}`);
    process.exit(1);
  }
}
validateRules();

/**
 * 属性口径 fixture（**唯一真源**）：属性族规则的 `prop` 正则必须命中 / 必须拒斥的属性名清单。
 * 与 `propFamily` 字段的对应关系：**凡 `propFamily: true` 的规则必须在此处有非空 fixture**
 *   （由 validatePropCoverage 的 (b) 断言强制）；「是不是属性族」由该**静态字段**声明，
 *   **不得**由 `prop` 正则反推（循环前提，见 PROP_FAMILY_PROBE 与 validatePropCoverage 的说明）。
 * 动机（2026-09-28 QA 复核发现的实际缺陷）：R6 原正则只允许**一个** side token，于是 4 个标准
 *   物理角 `border-top-left-radius` 等**全部漏收**，同时把 `border-top-radius` 等**不存在的属性**
 *   误收；R5 漏 `row-gap` / `column-gap`。端到端后果极严重：`border-top-left-radius: 9px`、
 *   `row-gap: 7px` 这类**全新裸 px 违规 100% 看不见** —— 候选数不变、计数不变、newUnknown 为空、
 *   门禁照样报绿。注意这**不是**「候选声明数为 0」那条守卫能拦住的：属性族正则**部分**漏收时
 *   候选数往往远大于 0，守卫毫无察觉。
 *   手写属性名枚举迟早还会漏（本轮就是），故把清单固化为模块加载即跑的自检：改动 prop 正则后
 *   若清单任一格不满足 → 当场硬失败并指出是**哪条属性**、**期望匹配还是拒斥**，不必等端到端探针。
 * 只覆盖**属性族**规则（R5 / R6 / R7 —— 一条正则覆盖多个属性，才存在覆盖漏洞）；
 *   单属性规则（R3 font-size / R4 line-height / R8 z-index / R9 font-weight）写错一眼可见，不列。
 *
 * `mustMin` / `mustNotMin`（**基数下限**）：`must` / `mustNot` 的条数下限，取值 = 当前实际条数
 *   → **删掉任何一条即报红**。为什么必须有：只校验「清单里列了什么 → 正则必须相符」的话，把条目
 *   **逐条删**到只剩 1 条也照样通过，被删掉的那类属性便悄悄失去覆盖保护（与「整体置空」是同一个
 *   洞的不同深度：整体置空由完整性断言 (b) 拦，逐条删由本下限拦）。下限缺失（非有限数）同样硬失败
 *   —— 否则 `n < undefined` 恒为 false，基数断言会**静默失效**。凡有意增删清单，须同步改这两个字段
 *   （改动因此可见、可复核），这是唯一允许下调处，且需人工确认。
 */
const PROP_SPEC_FIXTURES = {
  R5: {
    must: [
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'padding-block', 'padding-inline', 'padding-block-start', 'padding-inline-end',
      'margin', 'margin-top', 'margin-block-end', 'margin-inline-start',
      'gap', 'row-gap', 'column-gap', 'grid-gap', 'grid-row-gap', 'grid-column-gap',
    ],
    mustNot: ['gaps', 'gap-x', 'row-gap-top', 'padding-top-left', 'paddingx', 'margin-auto', 'border-top'],
    mustMin: 19, // = 当前 must 条数（删 1 条即红；下调须同步本字段并人工确认）
    mustNotMin: 7, // = 当前 mustNot 条数（同上）
  },
  R6: {
    must: [
      'border-radius',
      'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
      'border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius',
    ],
    mustNot: [
      'border-top-radius', 'border-left-radius', 'border-top-start-radius', 'border-bottom-end-radius',
      'border-block-start-radius', 'border-inline-end-radius', 'border-block-radius', 'border-radius-x',
    ],
    mustMin: 9, // = 当前 must 条数（删 1 条即红；下调须同步本字段并人工确认）
    mustNotMin: 8, // = 当前 mustNot 条数（同上）
  },
  R7: {
    must: ['transition', 'animation', 'transition-duration', 'animation-duration'],
    mustNot: ['transition-property', 'transition-timing-function', 'animation-name', 'animation-iteration-count', 'transitionx'],
    mustMin: 4, // = 当前 must 条数（删 1 条即红；下调须同步本字段并人工确认）
    mustNotMin: 5, // = 当前 mustNot 条数（同上）
    // **已知开放边界（有意不锁进 must / mustNot，待裁决）**：`animation-delay` / `transition-delay`
    //   同为「时长值」属性，但当前不在 R7 口径内。实测资产中 `animation-delay` 有 **40 条声明 /
    //   20 个去重时长 token**（0.05s…1.00s 步进 0.05s 的错峰系列），`transition-delay` 0 条。
    //   若把 delay 族纳入 R7，计数会从 13 直接跳到 30+ 且新增 19 个白名单外值 → 门禁**当场变红**，
    //   属**基线级**决策（需配套冻结词表与批次），故此处两个清单都不收，留给维护者按裁决填。
    //   这也是同一类「属性族漏收」信号的第 3 例（前两例 R5 / R6 已修），一并登记。
  },
};

/**
 * 「属性族」**交叉校验探针**：逐条真实存在的 CSS 属性名（25 个），与 fixture 相互独立。
 *
 * [告警] 语义（2026-09-28 收口轮修正，**勿"简化"回去**）：探针**不再**用来"反推某规则是不是
 *   属性族"。**属性族由 RULES 里的静态字段 `propFamily: true` 声明**（R5 / R6 / R7），
 *   探针只做**交叉校验**：断言 `propFamily` 规则在本探针上**命中数 ≥ 2**。
 *   要点：**判据（≥2）是静态期望，不是从被测正则反推出来的**。
 *
 *   为什么必须这样切（QA 2026-09-28 实证的「循环前提」fail-open）：
 *     上一版写的是 `covered = PROBE.filter(p => rule.prop.test(p))`，再以 `covered.length > 1`
 *     决定"该规则是不是属性族、要不要查 fixture"。即**判据取自被测对象** —— 于是把 R6 的
 *     prop 换回退化正则后，坏正则在 25 名探针上只命中 1 个（`border-radius`）→ 被判为"单属性"
 *     → 完整性断言**跳过 R6**；fixture 块再一并删除，(a) 也无条目可比 → 自检整体放行、
 *     门禁报全绿（整块删除 fixture + 退化正则 → exit 0，实证）。探针本身再完备也救不了：
 *     这不是"覆盖深度不足"，而是**前提循环**（要验的对象同时充当验它的尺子）。
 *     改为静态声明后：退化正则 → 探针命中 1 < 2 → **报红**；正常正则 → 命中 9 / 8 / 4 ≥ 2 → 通过。
 *
 * 反向一致性检查（同一循环前提的另一面）：若某规则**未**声明 `propFamily` 却在探针上命中 ≥2，
 *   说明它其实覆盖多个属性（漏标）→ 同样报红，避免"删掉声明即可豁免"这条新缝。
 */
const PROP_FAMILY_PROBE = [
  // 圆角 9（CSS 规范属性表）
  'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius',
  'border-bottom-left-radius', 'border-start-start-radius', 'border-start-end-radius',
  'border-end-start-radius', 'border-end-end-radius',
  // 间距族
  'padding', 'padding-top', 'padding-block-start', 'margin', 'margin-block-end', 'gap', 'row-gap', 'column-gap',
  // 动效时长族
  'transition', 'animation', 'transition-duration', 'animation-duration',
  // 单属性规则（确认它们**不会**被误判为属性族：各命中 1 个，故不触发「漏标」告警）
  'font-size', 'line-height', 'z-index', 'font-weight',
];
/** 属性族规则的探针命中数下限（**静态期望值**，不取自被测正则 —— 见 PROP_FAMILY_PROBE 说明） */
const FAMILY_PROBE_MIN_HITS = 2;

/**
 * 属性口径自检（**模块加载即跑**）：逐条比对 fixture，并校验 fixture 自身的**保护强度**。
 * 失败即 exit 1 —— 属性族正则漏收会让真实违规静默消失（假绿，最贵的一类失效），
 * 宁可拦住提交，也不允许带着覆盖漏洞的门禁上线。
 *
 * 三条断言（判据**全部静态**，不取自被测正则）：
 *   (a) 基数下限：`must` / `mustNot` 条数 ≥ `mustMin` / `mustNotMin`（下限字段必须存在且为有限数）。
 *       拦「逐条删」—— 删到只剩 1 条时，被删那类属性已失去保护却照旧通过。
 *   (b) 属性族完整性：**凡 `propFamily: true` 的规则**（静态声明，R5 / R6 / R7）必须有 fixture、
 *       且 must / mustNot 不得同时为空。拦「整体置空」与「整块删除 fixture」。
 *   (c) 属性族 × 探针交叉校验：`propFamily` 规则在 PROP_FAMILY_PROBE 上命中数须 ≥ FAMILY_PROBE_MIN_HITS；
 *       反向：未声明 `propFamily` 却命中 ≥2 → 报「疑似漏标」。
 *
 * [告警] 为什么 (b) 必须读**静态字段**而不是 `PROBE.filter(p => rule.prop.test(p)).length`（勿改回去）：
 *   后者是**循环前提** —— 判据取自被测对象。QA 2026-09-28 实证的绕过路径：
 *   把 R6 的 prop 换回退化正则（在探针上只命中 1 个）→ 被判为「单属性」→ (b) 跳过 R6；
 *   同时整块删除 R6 fixture → (a) 也无条目可比 → 自检放行、**门禁报全绿 exit 0**。
 *   探针再完备也无效（不是深度不足，是前提循环）。改为静态声明后，(b) 与正则无关，
 *   而正则退化由 (c) 的**静态期望 ≥2** 抓住 —— 两条各治一面，缺口互补。
 *   (c) 仍会调用被测正则求值，但**期望值（≥2）是静态常量**，正则退化只会让命中数变小 → 必然报红。
 */
function validatePropCoverage() {
  const bad = [];
  // ── (b)(c) 属性族声明 → fixture 完整性 + 探针交叉校验 ──────────────
  for (const rule of RULES) {
    const hit = PROP_FAMILY_PROBE.filter((p) => rule.prop.test(p)).length;
    if (rule.propFamily !== true) {
      // 反向一致性：没声明属性族，却在探针上覆盖多个真实属性 → 疑似漏标（防「删掉声明即可豁免」）
      if (hit >= FAMILY_PROBE_MIN_HITS) {
        bad.push(`${rule.id} 未声明 propFamily，但 prop 正则在 ${PROP_FAMILY_PROBE.length} 名探针上命中 ${hit} 个真实属性（≥${FAMILY_PROBE_MIN_HITS}）→ 疑似漏标，须补 propFamily: true 并配非空 fixture`);
      }
      continue; // 单属性规则：写错一眼可见，不要求 fixture
    }
    // 此处是「属性族」——判据来自静态声明，与 prop 正则当前形态**无关**
    if (hit < FAMILY_PROBE_MIN_HITS) {
      bad.push(`${rule.id} 声明 propFamily 但在 ${PROP_FAMILY_PROBE.length} 名探针上只命中 ${hit} 个属性（静态期望 ≥${FAMILY_PROBE_MIN_HITS}）→ prop 正则已退化/漏收，属性族无覆盖保护`);
    }
    const spec = PROP_SPEC_FIXTURES[rule.id];
    if (!spec) {
      bad.push(`${rule.id} 声明 propFamily 但 PROP_SPEC_FIXTURES 中无 fixture → 属性族无覆盖保护`);
      continue;
    }
    if (spec.must.length === 0 && spec.mustNot.length === 0) {
      bad.push(`${rule.id} 声明 propFamily 但 fixture 缺失/为空 → 属性族无覆盖保护`);
    }
  }
  // ── (a) 基数下限 + 逐条比对 ─────────────────────────────────────
  for (const [id, spec] of Object.entries(PROP_SPEC_FIXTURES)) {
    const rule = RULES.find((r) => r.id === id);
    if (!rule) { bad.push(`${id} fixture 存在但 RULES 中无此规则`); continue; }
    // 下限字段必须存在且为有限数：字段缺失时 `n < undefined` 恒为 false → 基数断言会**静默失效**
    if (!Number.isFinite(spec.mustMin)) bad.push(`${id} fixture 缺 mustMin 基数下限（缺此字段则删条目不会报红，覆盖保护形同虚设）`);
    else if (spec.must.length < spec.mustMin) bad.push(`${id} fixture must 条目 ${spec.must.length} 条 < 下限 ${spec.mustMin}（删除条目会使对应属性失去覆盖保护；如系有意调整，须同步下调 ${id}.mustMin 并人工确认）`);
    if (!Number.isFinite(spec.mustNotMin)) bad.push(`${id} fixture 缺 mustNotMin 基数下限（同上）`);
    else if (spec.mustNot.length < spec.mustNotMin) bad.push(`${id} fixture mustNot 条目 ${spec.mustNot.length} 条 < 下限 ${spec.mustNotMin}（同上）`);
    for (const p of spec.must) if (!rule.prop.test(p)) bad.push(`${id} 属性口径漏收真实属性: ${p}（应匹配却未匹配）`);
    for (const p of spec.mustNot) if (rule.prop.test(p)) bad.push(`${id} 属性口径误收不存在属性: ${p}（应拒斥却匹配）`);
  }
  if (bad.length) {
    console.error(`[token-discipline] ✗ 属性口径自检未通过（属性族正则与 fixture 不符 → 真实违规会静默消失，拒绝继续）:\n  - ${bad.join('\n  - ')}`);
    process.exit(1);
  }
}
validatePropCoverage();

const MAX_DETAIL = 40;

/** 扫描 R3–R9 的作用域（css/*.css 排除豁免集），并做防静默变绿守卫 */
function scanLadderScope() {
  if (!fs.existsSync(CSS_DIR)) {
    console.error(`[token-discipline] ✗ 扫描目录缺失: ${CSS_DIR}（拒绝以「0 违规」静默通过）`);
    process.exit(1);
  }
  const files = fs.readdirSync(CSS_DIR)
    .filter((f) => f.endsWith('.css') && !LADDER_EXEMPT.has(f))
    .sort();
  if (files.length === 0) {
    console.error(`[token-discipline] ✗ css/ 下除 ${[...LADDER_EXEMPT].join(' / ')} 外无任何可扫描 CSS（拒绝以「0 违规」静默通过）`);
    process.exit(1);
  }
  const decls = [];
  for (const f of files) {
    const src = blankComments(fs.readFileSync(path.join(CSS_DIR, f), 'utf8'));
    // seq = 全局扫描序下标（文件排序 + 行序），唯一且确定 —— 供「新增落点」判定使用。
    // 新增声明通常写在**文件末尾**（或新块的末尾）→ 扫描序下标最大者即最新那一批。
    for (const d of extractDeclarations(src)) decls.push({ ...d, file: `css/${f}`, norm: stripValue(d.value), seq: decls.length });
  }
  if (decls.length === 0) {
    console.error(`[token-discipline] ✗ 扫描到 0 条声明（解析器或资产异常；拒绝以「0 违规」静默通过）`);
    process.exit(1);
  }
  return { files, decls };
}

/** 计算一条规则的计数（口径见文件头表格） */
function countOf(rule, matched) {
  if (rule.count === 'distinct') return new Set(matched.map((d) => d.norm)).size;
  if (rule.count === 'timing') {
    const set = new Set();
    for (const d of matched) for (const t of rawDurations(d.norm)) set.add(t);
    return set.size;
  }
  return matched.filter((d) => rule.violating(d.norm)).length;
}

/** 白名单外的比对主体（含首次出现位置）；
 *  接收已算好的 subjects 映射，避免每条规则重复扫描一遍声明 */
function unknownSubjects(rule, subjects) {
  const literalSet = new Set(LADDER[rule.id].literals.map(normSpelling));
  return [...subjects.values()].filter((s) => !isAllowed(rule.id, s.value, { literalSet }));
}

/** 违规定位明细（用于红时输出 文件:L行 + 实际值） */
function offendersOf(rule, matched, unknownList) {
  if (rule.count === 'decl') {
    return matched
      .filter((d) => rule.violating(d.norm))
      .map((d) => ({ file: d.file, line: d.line, detail: `${d.prop}: ${d.norm}` }));
  }
  // distinct / timing：给出白名单外的值 + 首次出现位置（这才是「超出」的真实成分）
  return unknownList.map((u) => ({ file: u.file, line: u.line, detail: `${u.owner}: 白名单外值 ${u.value}（声明值 ${u.detail}）` }));
}

/**
 * 「使计数越过基线的那部分」明细 —— **仅供人类可读输出排序**（内部字段 `_ordered`，不进 JSON）。
 *
 * 动机：明细原先按**扫描序**截断前 MAX_DETAIL 条输出。新增声明通常写在**文件末尾**，排在扫描序
 *   最后 → 恰好被截掉，用户在终端看不到那条真正该看的，只能去 `--json` 里翻全量 detail ——
 *   与「一次调用即给出可定位结论」的设计目标相悖。
 *
 * 口径（两种，均取「新增落点」的语义）：
 *   · count='decl'（R3/R5/R6/R8/R9）→ 扫描序**末尾**的 overflow 条（detail 即扫描序，新增在尾）。
 *   · distinct / timing（R4/R7）：计数的「超出」有两个来源，必须分开归因，否则会把无辜的
 *     白名单内老值顶到最前、给出**误导性**定位：
 *       ① 新增的**白名单外**值 → 已由下方「白名单外新值」块逐条给出行号，**不重复列出**；
 *       ② 新增的**白名单内**值（如 `line-height: 1.2`）→ **根本不进** detail（detail 只收
 *          白名单外值），只能按「首次出现位置最晚」补在前面。
 *     故候选数 = `overflow − newUnknown.length`（超出量中未被①解释掉的部分）：
 *       · ≤0 → 溢出已被①完全解释，不加头部（避免误指无关老值），定位由①的 file:L行给出；
 *       · >0 → 取「首次出现最晚」的 `need` 个白名单内主体补在 detail 之前。
 *
 * 幂等：decl 为确定切片；distinct 按 `seq` 降序（seq 全局唯一，无并列）→ 同一输入输出一致。
 * 存量明细**不丢弃**，只是后置（见 printRule）。返回 { ordered, headCount }，
 * headCount = 头部（「越过基线者」）实际条数 —— 不能由 overflow 反推，因为 distinct 分支可能更少。
 */
function displayOrder(rule, overflow, detail, subjects, unknownValues, newUnknownCount) {
  if (overflow <= 0) return { ordered: detail, headCount: 0 };
  if (rule.count === 'decl') {
    const cut = Math.max(0, detail.length - overflow);
    return { ordered: [...detail.slice(cut), ...detail.slice(0, cut)], headCount: Math.min(overflow, detail.length) };
  }
  const need = overflow - newUnknownCount;
  if (need <= 0) return { ordered: detail, headCount: 0 };
  const head = [...subjects.values()]
    .filter((s) => !unknownValues.has(s.value))
    .sort((a, b) => (b.seq ?? -1) - (a.seq ?? -1))
    .slice(0, need)
    .map((s) => ({ file: s.file, line: s.line, detail: `${s.prop ?? rule.label}：值 ${s.value}（白名单内新值，首次出现于此）` }));
  return { ordered: [...head, ...detail], headCount: head.length };
}

/** 跑一条规则：计数信号 + 白名单信号，任一红即该规则红 */
function runRule(rule, decls) {
  const matched = decls.filter((d) => rule.prop.test(d.prop));
  if (matched.length === 0) {
    // 防静默变绿：候选声明为 0 说明属性正则/口径已失效，会静默判 0 违规
    console.error(`[token-discipline] ✗ ${rule.id} 候选声明数为 0（属性口径 ${String(rule.prop)} 未匹配任何声明，判定将失真；拒绝以「0 违规」静默通过）`);
    process.exit(1);
  }
  const count = countOf(rule, matched);
  const baseline = BASELINES[rule.id];
  const fallbackOwner = matched[0].prop; // 仅在主体未记录自身属性名时的兜底（见 collectSubjects 的 prop 说明）
  const subjects = collectSubjects(rule, matched);
  // owner 取**该主体首次出现所在声明自己的属性名**（R7 覆盖 transition/animation(-duration)，
  // 用规则级代表属性会把 animation 的时长值标成 transition）；老数据无 prop 时退回兜底值。
  const unknown = unknownSubjects(rule, subjects)
    .map((u) => ({ ...u, owner: u.prop ?? fallbackOwner }))
    .sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
  const legacy = new Set(LEGACY_UNKNOWN[rule.id].split('|').map(normSpelling).filter(Boolean));
  const newUnknown = unknown.filter((u) => !legacy.has(u.value));
  const resolved = [...legacy].filter((v) => !subjects.has(v)).sort();
  const ok = count <= baseline && newUnknown.length === 0;
  const detail = ok ? [] : offendersOf(rule, matched, unknown);
  // 展示序：计数报红时把「使计数越过基线的那部分」提到最前（detail 字段本身保持全量 + 扫描序）
  const view = displayOrder(rule, count - baseline, detail, subjects, new Set(unknown.map((u) => u.value)), newUnknown.length);
  return {
    id: rule.id,
    ok,
    label: rule.label,
    criterion: rule.criterion,
    count,
    baseline,
    target: TARGETS[rule.id],
    candidates: matched.length,
    unknownValues: unknown.map((u) => u.value),
    newUnknownValues: newUnknown.map((u) => u.value),
    resolvedValues: resolved,
    detail,
    _ordered: view.ordered,
    _headCount: view.headCount,
    _unknown: unknown,
    _newUnknown: newUnknown,
  };
}

/** 按 id 取规则规格 */
function byId(id) {
  return RULES.find((r) => r.id === id);
}

// ── 每条规则的独立入口 ────────────────────────────────────────────
// 判定逻辑（计数 / 白名单 / 冻结词表 / 定位）全部复用 runRule —— 口径与白名单由 RULES 声明式
// 描述，故这里**不存在** 7 份复制的判定代码，也没有巨型 if-else 堆叠；函数名保留 R3–R9
// 与规则的显式对应，便于按规则定位与单测。
function checkR3(decls) { return runRule(byId('R3'), decls); }
function checkR4(decls) { return runRule(byId('R4'), decls); }
function checkR5(decls) { return runRule(byId('R5'), decls); }
function checkR6(decls) { return runRule(byId('R6'), decls); }
function checkR7(decls) { return runRule(byId('R7'), decls); }
function checkR8(decls) { return runRule(byId('R8'), decls); }
function checkR9(decls) { return runRule(byId('R9'), decls); }

/** R3–R9 全部规则入口（顺序即输出顺序） */
const LADDER_CHECKS = [checkR3, checkR4, checkR5, checkR6, checkR7, checkR8, checkR9];

// ═══════════════════════════════════════════════════════════════
// 输出
// ═══════════════════════════════════════════════════════════════

function printLadderScope(scope) {
  console.log(`[token-discipline] R3–R9 阶梯纪律 (扫描 css/*.css 共 ${scope.files.length} 文件: ${scope.files.join(', ')}; 豁免 ${[...LADDER_EXEMPT].join(' / ')}; 声明 ${scope.decls.length} 条)`);
}

function printRule(r) {
  const mark = r.ok ? '✓' : '✗';
  console.log(`[token-discipline] ${r.id} ${r.label} (${r.criterion}, 实测 ${r.count} / 基线 ${r.baseline}, 目标 ≤${r.target}): ${mark}`);
  if (r.count > r.baseline) {
    const overflow = r.count - r.baseline;
    console.log(`  ✗ 计数超基线：实测 ${r.count} > 基线 ${r.baseline}（超出 ${overflow}）`);
    // 展示序 = 「使计数越过基线的那部分」在前、存量在后（见 displayOrder 的动机说明）。
    // 关键：新增声明通常落在文件末尾，按扫描序截断前 MAX_DETAIL 条会**正好漏掉它** ——
    // 故此处必须把尾部/最新者提到最前，保证终端一眼可见肇事行（存量不丢弃，只是后置）。
    const ordered = r._ordered;
    const head = r._headCount; // 头部实际条数（不能由 overflow 反推：distinct 分支可能更少）
    const shown = ordered.slice(0, MAX_DETAIL);
    if (head > 0) console.log(`      ── 以下 ${head} 条为本次使计数越过基线者（新增落点优先）──`);
    else if (r._newUnknown.length) console.log('      ── 越基线者已在下方「白名单外新值」逐条定位，故此处不再另列 ──');
    shown.forEach((o, i) => {
      if (i === head && head > 0 && head < ordered.length) console.log('      ── 以下为存量（早于本次改动，仅后置展示）──');
      console.log(`      ${o.file}:L${o.line}  ${o.detail}`);
    });
    if (ordered.length > MAX_DETAIL) console.log(`      ... 另有 ${ordered.length - MAX_DETAIL} 处（已截断；全量见 --json）`);
  }
  if (r._newUnknown.length) {
    console.log(`  ✗ 白名单外新值 ${r._newUnknown.length} 个（等价交换检测：旧值换新值可能使计数纹丝不动，故独立阻断）:`);
    r._newUnknown.forEach((u) => console.log(`      ${u.file}:L${u.line}  ${r.id} 白名单外新值 ${u.value}（声明值 ${u.detail}）`));
  }
  if (r._unknown.length && !r._newUnknown.length) {
    console.log(`  [info] 白名单外存量值 ${r._unknown.length} 个（已冻结放行，待后续批次收敛；全量见 --json / --dump-legacy）`);
  }
  if (r.resolvedValues.length) {
    console.log(`  [info] 冻结词表中 ${r.resolvedValues.length} 个值本次未出现（已收敛，可缩减 LEGACY_UNKNOWN.${r.id}）: ${r.resolvedValues.slice(0, 16).join(' ')}`);
  }
  if (r.count < r.baseline) {
    console.log(`  [info] 基线可下调至 ${r.count}（实测低于基线 ${r.baseline - r.count}；本门禁不自动改，需人工确认后更新 BASELINES.${r.id}）`);
  }
}

/** 打印可粘贴的 LEGACY_UNKNOWN 常量块（维护用；把输出粘回常量区即可） */
function dumpLegacyBlock(scope) {
  // 贴回前的手工补注释提示：本输出只含纯值列表，不含常量块内的 R5 / R8 因果注释 ——
  // 若不提示，维护者整块粘贴覆盖后便无从得知那些值「为何被移出」，极易把它们错收回冻结词表。
  console.log('// [告警] 粘回常量区后**必须手工补回**两条因果注释（本输出不含它们，整块覆盖会丢掉）：');
  console.log('//   · R5：rem / em / auto / % 已移出 —— 不在「含裸 px」口径内，既不阻断也不冻结');
  console.log('//   · R8：<999 的裸整数已移出 —— 按「裸值 ≥999」口径本来就合法');
  console.log('/** 冻结词表（只减不增）：白名单外的存量值 —— 由 --dump-legacy 生成，粘回常量区。 */');
  console.log('const LEGACY_UNKNOWN = {');
  for (const rule of RULES) {
    const matched = scope.decls.filter((d) => rule.prop.test(d.prop));
    const unknown = unknownSubjects(rule, collectSubjects(rule, matched)).map((u) => u.value).sort();
    // 每行不超过 ~110 字符，用 `|` 连接
    const lines = [];
    let cur = '';
    for (const v of unknown) {
      const piece = cur ? `|${v}` : v;
      if (piece.length + cur.length > 110) { lines.push(cur); cur = v; } else cur += piece;
    }
    if (cur) lines.push(cur);
    console.log(`  // ${rule.id} ${rule.label}：白名单外存量 ${unknown.length} 个`);
    if (lines.length === 0) {
      console.log(`  ${rule.id}: '',`);
    } else if (lines.length === 1) {
      console.log(`  ${rule.id}: '${lines[0]}',`);
    } else {
      console.log(`  ${rule.id}:`);
      lines.forEach((l, i) => console.log(`    '${l}${i === lines.length - 1 ? "'," : "|' +"}`));
    }
  }
  console.log('};');
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
const scope = scanLadderScope();

if (dumpLegacy) {
  dumpLegacyBlock(scope);
  process.exit(0);
}

const r1 = checkR1();
const ladder = LADDER_CHECKS.map((check) => check(scope.decls));
const allOk = r1.ok && ladder.every((r) => r.ok);

if (jsonMode) {
  const out = { r1 };
  for (const r of ladder) {
    // `_` 前缀字段是内部字段（供人类可读输出定位 / 排序），按**前缀**整体排除，不进 JSON。
    // 为什么按前缀过滤而**不**逐个解构列举（2026-09-28 QA 复核后改）：本文件第一版用
    // `const { _unknown, _newUnknown, _ordered, ...rest } = r` 手工列举，随后为修定位能力
    // 又新增了 `_headCount` —— 列举忘了同步，`_headCount` 就**静默**漏进 7 条规则的 JSON，
    // 与文件头「`_` 前缀字段不进 JSON」的自述直接矛盾（且作者的自测断言恰好没覆盖它）。
    // 该缺陷类型（新增内部字段 → 忘记同步摘除清单）靠列举永远治不干净，故改为按前缀过滤：
    // 此后任何新 `_` 字段自动不进 JSON，无需再维护清单。
    out[r.id.toLowerCase()] = Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')));
  }
  out.allOk = allOk;
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
} else {
  console.log(`[token-discipline] R1 box-shadow 值型令牌/length 混排 (扫描 css/*.css 共 ${r1.scannedFiles} 文件, ${r1.declarations} 条 box-shadow 声明, 豁免 ${TOKENS_FILE}): ${r1.ok ? '✓ 0' : '✗ ' + r1.violations} 违规`);
  r1.detail.forEach((v) => {
    const tag = v.maxLayer > v.limit
      ? `单层 length ${v.maxLayer} > ${v.limit}`
      : `单层 length ${v.minLayer} < ${v.minLimit}`;
    console.log(`  ${v.file}:L${v.line} ${tag}（各层 ${v.layers.join('/')}）`);
    console.log(`      源码: ${v.context}`);
    console.log(`      展开: ${v.expanded}`);
  });
  if (r1.unresolvedShadowTokens.length) {
    console.log(`  [info] 另有 ${r1.unresolvedShadowTokens.length} 处引用了无法解析的阴影令牌（信息性，不阻断）:`);
    r1.unresolvedShadowTokens.forEach((u) => console.log(`      ${u.file}:L${u.line} var(${u.token})`));
  }
  printLadderScope(scope);
  ladder.forEach(printRule);
  console.log(`\n[token-discipline] 结果: ${allOk ? '✓ 全绿' : '✗ 未通过（阻断）'}`);
}

process.exit(allOk ? 0 : 1);
