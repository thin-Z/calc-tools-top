#!/usr/bin/env python3
# Targeted fix for tool-card mojibake + broken closing tags in index.html.
# NOT the forbidden batch script (scripts/fix_index_mojibake.py).
# Strategy: rebuild each <div class="tool-card-wrap"> using verified-correct
# (h3, p) text per card, and repair broken icon </div> (keeping emoji chars).
import re

SRC = 'index.html'

# Verified correct (h3, description) for every tool card.
# For each field we picked the clean version from index.html / index.final2.html,
# or hardcoded the correct Chinese where both reference files were garbled.
CANON = {
    'mortgage': ('房贷计算器', '等额本息 & 等额本金，支持商业贷款、公积金贷款、组合贷款'),
    'tax2026': ('个税计算器', '2026年最新个税税率，一键计算应缴税款与税后收入'),
    'bmi': ('BMI 计算器', '根据身高体重计算身体质量指数，了解体重健康状况'),
    'date-calc': ('日期计算器', '计算日期差、推算目标日期、工作日计算'),
    'housing-fund': ('公积金计算器', '公积金贷款额度与利率计算，支持最新政策'),
    'age-calc': ('年龄计算器', '精确计算周岁年龄、出生天数和生肖'),
    'discount': ('折扣计算器', '快速计算打折价格和节省金额'),
    'fuel-cost': ('油费计算器', '计算油费支出和每公里成本'),
    'electricity': ('电费计算器', '计算电器耗电量和电费'),
    'ideal-weight': ('标准体重计算器', '基于多种公式计算健康体重范围'),
    'overtime': ('加班费计算器', '按劳动法计算加班工资'),
    'unit-converter': ('单位换算器', '长度/重量/温度/面积换算'),
    'ovulation': ('排卵期计算器', '推算排卵日和易孕期'),
    'loan-compare': ('贷款对比计算器', '比较不同利率的月供差异'),
    'compound-interest': ('复利计算器', '计算复利终值和投资收益'),
    'car-loan': ('车贷计算器', '计算汽车贷款月供和利息'),
    'qr-generator': ('二维码生成器', '文字或链接快速生成二维码，下载PNG'),
    'password-gen': ('密码生成器', '自定义字符类型生成高强度密码'),
    'percentage-calc': ('百分比计算器', '百分比增减、变化多种模式计算'),
    'random-gen': ('随机数生成器', '自定义范围生成随机整数'),
    'convert': ('格式转换', '转换 JPG/PNG/WebP 格式'),
    'resize': ('裁剪缩放', '调整尺寸，保持宽高比'),
    'base64': ('图片转Base64', '转为 Base64 嵌入代码'),
    'color-picker': ('图片取色器', '提取图片中的颜色值'),
    'case-converter': ('大小写转换', '文本全大、全小写、首字母大写'),
    'json-formatter': ('JSON 格式化', '格式化/压缩 JSON 数据'),
    'base64-encode': ('Base64 编解码', '文本与 Base64 互转'),
    'url-encode': ('URL 编解码', 'URL 编码与解码'),
    'text-cleaner': ('文本清理', '清除多余空格、空行、特殊字符'),
    'html-stripper': ('HTML 剥离', '移除 HTML 标签，提取纯文本'),
    'text-diff': ('文本对比', '比较两段文本的差异'),
    'uuid-generator': ('UUID 生成', '生成 UUID v4 唯一标识符'),
    'reading-time': ('阅读时间', '估算文章阅读所需时间'),
}


def fix_card(m):
    b = m.group(0)
    aid_m = re.search(r'data-like-id="([^"]+)"', b)
    if not aid_m:
        return b
    aid = aid_m.group(1)
    if aid not in CANON:
        return b
    title, desc = CANON[aid]

    # --- h3: handle proper, corrupted (/h3>), or missing close (before <p) ---
    # 1) proper or corrupted close: consume the whole close tag
    b = re.sub(
        r'<h3([^>]*)>[\s\S]*?(?:</h3>|/h3>)',
        lambda mm: f'<h3{mm.group(1)}>{title}</h3>',
        b, count=1)
    # 2) missing close right before <p: insert </h3> via lookahead (keep <p)
    #    guard: only when no </h3> already present between open and <p
    b = re.sub(
        r'<h3([^>]*)>((?:(?!</h3>)[\s\S])*?)(?=<p)',
        lambda mm: f'<h3{mm.group(1)}>{mm.group(2)}</h3>',
        b, count=1)

    # --- p: handle proper, corrupted (/p>), or missing close (before </a>) ---
    # 1) proper or corrupted close: consume the whole close tag
    b = re.sub(
        r'<p([^>]*)>[\s\S]*?(?:</p>|/p>)',
        lambda mm: f'<p{mm.group(1)}>{desc}</p>',
        b, count=1)
    # 2) missing close right before </a>: insert </p> via lookahead (keep </a>)
    #    guard: only when no </p> already present between open and </a>
    b = re.sub(
        r'<p([^>]*)>((?:(?!</p>)[\s\S])*?)(?=</a>)',
        lambda mm: f'<p{mm.group(1)}>{mm.group(2)}</p>',
        b, count=1)
    return b


def main():
    with open(SRC, encoding='utf-8') as f:
        s = f.read()

    # Rebuild all tool cards (h3 + p) with verified text and correct tags.
    s = re.sub(
        r'<div class="tool-card-wrap">.*?</div>\s*(?=<div class="tool-card-wrap">|</div>\s*</div>)',
        fix_card, s, flags=re.S)

    # Repair broken icon </div>: keep the (possibly mojibake) emoji char, add '<'.
    s = re.sub(
        r'<div class="icon">([\s\S]*?)(?:</div>|/div>)',
        lambda mm: f'<div class="icon">{mm.group(1)}</div>',
        s)

    with open(SRC, 'w', encoding='utf-8') as f:
        f.write(s)
    print('tool-card fix applied')


if __name__ == '__main__':
    main()
