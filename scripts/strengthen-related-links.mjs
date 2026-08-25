#!/usr/bin/env node
/**
 * scripts/strengthen-related-links.mjs — 强化工具页横向关联链接（T-COMP 2026-08-25）
 * ---------------------------------------------------------------
 * 背景：竞品 Calculator.net / Omni 均有"相关计算器"卡片网；本站 related-tools 质量参差
 *       （部分缺失、部分混入博客链接）。本脚本按语义映射统一生成：
 *       - 3-5 个相关计算器链接（同分类/强相关）
 *       - 对应博客指南链接（复用 related-posts 已有的）
 * 覆盖：zh/en 两侧 calculators/*.html（23 工具）。
 * 用法：node scripts/strengthen-related-links.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const DRY = process.argv.includes('--dry-run');

/* 工具相关性映射：key = 工具 slug，value = [相关工具 slug...]（按相关度排序） */
const RELATED = {
  'mortgage': ['housing-fund', 'loan-compare', 'compound-interest', 'car-loan'],
  'housing-fund': ['mortgage', 'loan-compare', 'tax2026'],
  'tax2026': ['overtime', 'salary', 'mortgage'],
  'loan-compare': ['mortgage', 'housing-fund', 'compound-interest'],
  'compound-interest': ['investment', 'loan-compare', 'mortgage'],
  'car-loan': ['mortgage', 'loan-compare', 'compound-interest'],
  'overtime': ['tax2026', 'workday-calculator', 'date-calc'],
  'workday-calculator': ['date-calc', 'overtime', 'age-calc'],
  'date-calc': ['workday-calculator', 'age-calc', 'overtime'],
  'age-calc': ['date-calc', 'workday-calculator', 'bmi'],
  'bmi': ['ideal-weight', 'calorie-calculator', 'age-calc'],
  'ideal-weight': ['bmi', 'calorie-calculator'],
  'calorie-calculator': ['bmi', 'ideal-weight', 'compound-interest'],
  'ovulation': ['date-calc', 'workday-calculator', 'age-calc'],
  'percentage-calc': ['discount', 'compound-interest', 'loan-compare'],
  'discount': ['percentage-calc', 'compound-interest'],
  'unit-converter': ['percentage-calc', 'date-calc', 'electricity'],
  'electricity': ['fuel-cost', 'unit-converter', 'percentage-calc'],
  'fuel-cost': ['electricity', 'percentage-calc', 'unit-converter'],
  'password-gen': ['password-strength', 'qr-generator', 'random-gen'],
  'password-strength': ['password-gen', 'qr-generator'],
  'qr-generator': ['password-gen', 'random-gen', 'color-contrast'],
  'random-gen': ['password-gen', 'qr-generator', 'unit-converter'],
  'color-contrast': ['color-picker', 'qr-generator', 'regex-tester'],
  'regex-tester': ['json-formatter', 'markdown-preview', 'base64-encode'],
  'markdown-preview': ['regex-tester', 'json-formatter'],
  'json-formatter': ['regex-tester', 'base64-encode', 'text-diff'],
  'base64-encode': ['url-encode', 'json-formatter', 'text-cleaner'],
  'url-encode': ['base64-encode', 'text-cleaner', 'html-stripper'],
  'text-cleaner': ['html-stripper', 'text-diff', 'word-counter'],
  'text-diff': ['text-cleaner', 'word-counter', 'json-formatter'],
  'html-stripper': ['text-cleaner', 'url-encode', 'word-counter'],
  'word-counter': ['text-cleaner', 'reading-time', 'case-converter'],
  'reading-time': ['word-counter', 'case-converter'],
  'case-converter': ['word-counter', 'reading-time', 'text-cleaner'],
  'uuid-generator': ['random-gen', 'password-gen', 'regex-tester'],
  'keyword-density': ['word-counter', 'reading-time', 'case-converter'],
  'base64': ['color-picker', 'compress', 'resize'],
  'color-picker': ['base64', 'color-contrast', 'compress'],
  'compress': ['resize', 'convert', 'base64'],
  'convert': ['compress', 'resize', 'base64'],
  'resize': ['compress', 'convert', 'base64'],
  'image-crop': ['resize', 'compress', 'convert'],
};

/* 中文/英文工具名映射（显示用） */
const TOOL_NAMES_ZH = {
  'mortgage': '房贷计算器', 'housing-fund': '公积金计算器', 'tax2026': '个税计算器',
  'loan-compare': '贷款对比计算器', 'compound-interest': '复利计算器', 'car-loan': '车贷计算器',
  'overtime': '加班费计算器', 'workday-calculator': '工作日计算器', 'date-calc': '日期计算器',
  'age-calc': '年龄计算器', 'bmi': 'BMI 计算器', 'ideal-weight': '标准体重计算器',
  'calorie-calculator': '卡路里计算器', 'ovulation': '排卵期计算器', 'percentage-calc': '百分比计算器',
  'discount': '折扣计算器', 'unit-converter': '单位换算器', 'electricity': '电费计算器',
  'fuel-cost': '油耗计算器', 'password-gen': '密码生成器', 'password-strength': '密码强度检测器',
  'qr-generator': '二维码生成器', 'random-gen': '随机数生成器', 'color-contrast': '颜色对比度检查器',
  'regex-tester': '正则表达式测试器', 'markdown-preview': 'Markdown 预览器', 'json-formatter': 'JSON 格式化',
  'base64-encode': 'Base64 编解码', 'url-encode': 'URL 编解码', 'text-cleaner': '文本清理',
  'text-diff': '文本对比', 'html-stripper': 'HTML 剥离', 'word-counter': '字数统计',
  'reading-time': '阅读时间', 'case-converter': '大小写转换', 'uuid-generator': 'UUID 生成',
  'keyword-density': '关键词密度', 'base64': '图片转 Base64', 'color-picker': '图片取色器',
  'compress': '图片压缩', 'convert': '格式转换', 'resize': '裁剪缩放', 'image-crop': '图片裁剪',
};

const TOOL_NAMES_EN = {
  'mortgage': 'Mortgage Calculator', 'housing-fund': 'Housing Fund Calculator', 'tax2026': 'Tax Calculator 2026',
  'loan-compare': 'Loan Comparison', 'compound-interest': 'Compound Interest', 'car-loan': 'Car Loan Calculator',
  'overtime': 'Overtime Calculator', 'workday-calculator': 'Workday Calculator', 'date-calc': 'Date Calculator',
  'age-calc': 'Age Calculator', 'bmi': 'BMI Calculator', 'ideal-weight': 'Ideal Weight Calculator',
  'calorie-calculator': 'Calorie Calculator', 'ovulation': 'Ovulation Calculator', 'percentage-calc': 'Percentage Calculator',
  'discount': 'Discount Calculator', 'unit-converter': 'Unit Converter', 'electricity': 'Electricity Calculator',
  'fuel-cost': 'Fuel Cost Calculator', 'password-gen': 'Password Generator', 'password-strength': 'Password Strength',
  'qr-generator': 'QR Code Generator', 'random-gen': 'Random Number Generator', 'color-contrast': 'Color Contrast Checker',
  'regex-tester': 'Regex Tester', 'markdown-preview': 'Markdown Preview', 'json-formatter': 'JSON Formatter',
  'base64-encode': 'Base64 Encode/Decode', 'url-encode': 'URL Encode/Decode', 'text-cleaner': 'Text Cleaner',
  'text-diff': 'Text Diff', 'html-stripper': 'HTML Stripper', 'word-counter': 'Word Counter',
  'reading-time': 'Reading Time', 'case-converter': 'Case Converter', 'uuid-generator': 'UUID Generator',
  'keyword-density': 'Keyword Density', 'base64': 'Image to Base64', 'color-picker': 'Color Picker',
  'compress': 'Image Compressor', 'convert': 'Format Converter', 'resize': 'Resize & Crop', 'image-crop': 'Image Crop',
};

/* 工具 → 目录（calculators/text/image） */
function toolDir(slug) {
  if (RELATED[slug] === undefined) return null;
  if (['base64', 'color-picker', 'compress', 'convert', 'resize', 'image-crop'].includes(slug)) return 'image';
  if (['base64-encode', 'url-encode', 'text-cleaner', 'text-diff', 'html-stripper', 'word-counter', 'reading-time', 'case-converter', 'uuid-generator', 'keyword-density', 'json-formatter'].includes(slug)) return 'text';
  return 'calculators';
}

function buildRelatedBlock(lang, slug, dir) {
  const names = lang === 'zh' ? TOOL_NAMES_ZH : TOOL_NAMES_EN;
  const rel = (RELATED[slug] || []).filter((r) => TOOL_NAMES_ZH[r] !== undefined).slice(0, 4);
  const items = rel.map((r) => {
    const rd = toolDir(r);
    const name = names[r] || r;
    return `        <li><a href="/${lang}/${rd}/${r}">${name}</a></li>`;
  }).join('\n');
  const header = lang === 'zh' ? '相关工具' : 'Related Tools';
  return `<div class="related-tools">\n    <h3>${header}</h3>\n    <ul>\n${items}\n    </ul>\n</div>`;
}

function fixFile(lang, slug, dir) {
  const abs = join(ROOT, lang, dir, slug + '.html');
  let html;
  try { html = readFileSync(abs, 'utf8'); } catch (e) { return false; }
  // 跳过 noindex stub（合并跳转页，无需强化内链）
  if (html.includes('noindex')) return false;

  const newBlock = buildRelatedBlock(lang, slug, dir);
  const oldRe = /<div\s+class=['"]related-tools['"][\s\S]*?<\/div>\s*(?=<section class="related-posts"|<div class="tool-content"|<\/main>)/;
  let changed = false;

  if (oldRe.test(html)) {
    html = html.replace(oldRe, newBlock + '\n');
    changed = true;
  } else if (html.includes('</main>')) {
    // 无 related-tools 块：插到 </main> 前（在 related-posts 前）
    html = html.replace('</main>', newBlock + '\n    </main>');
    changed = true;
  }

  if (changed) {
    if (!DRY) writeFileSync(abs, html, 'utf8');
    console.log(`${DRY ? '[dry-run] ' : ''}${lang}/${dir}/${slug}: related-tools updated`);
    return true;
  }
  return false;
}

let fixed = 0;
for (const slug of Object.keys(RELATED)) {
  const dir = toolDir(slug);
  if (!dir) continue;
  if (fixFile('zh', slug, dir)) fixed++;
  if (fixFile('en', slug, dir)) fixed++;
}
console.log(`\n${DRY ? '[dry-run] ' : ''}done: ${fixed} files updated`);
