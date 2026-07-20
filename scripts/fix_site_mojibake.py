#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全站乱码修复脚本 v2 — calculator-site (calc-tools.top)
策略：
1. 从 i18n.js 获取干净中文/英文文本
2. 从 fix_toolcards.py 的 CANON 数据获取工具名称和描述
3. 修复 zh/ 工具页：重建整个 <head> + footer + data-i18n 文本
4. 修复 root 页：footer/header
5. 修复 en/ 工具页 + 旧博客的装饰 emoji
"""
import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 1. 加载 i18n ──
def load_i18n():
    i18n_path = os.path.join(ROOT, "js", "i18n.js")
    js = open(i18n_path, encoding='utf-8').read()
    result = {"zh": {}, "en": {}}
    zh_start = js.index("zh: {") + 5
    en_start = js.index("en: {", zh_start)
    en_end = js.index("};", en_start)
    for lang_key, start, end in [("zh", zh_start, en_start), ("en", en_start, en_end)]:
        block = js[start:end]
        for m in re.finditer(r'^\s+(\w+)\s*:\s*"((?:[^"\\]|\\.)*)"', block, re.M):
            result[lang_key][m.group(1)] = m.group(2)
    return result

I18N = load_i18n()
print(f"[i18n] loaded {len(I18N['zh'])} zh + {len(I18N['en'])} en keys")

# ── 2. CANON 数据 ──
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
    'compress': ('图片压缩', '压缩图片大小，保持清晰度'),
    'case-converter': ('大小写转换', '文本全大、全小写、首字母大写'),
    'json-formatter': ('JSON 格式化', '格式化/压缩 JSON 数据'),
    'base64-encode': ('Base64 编解码', '文本与 Base64 互转'),
    'url-encode': ('URL 编解码', 'URL 编码与解码'),
    'text-cleaner': ('文本清理', '清除多余空格、空行、特殊字符'),
    'html-stripper': ('HTML 剥离', '移除 HTML 标签，提取纯文本'),
    'text-diff': ('文本对比', '比较两段文本的差异'),
    'uuid-generator': ('UUID 生成', '生成 UUID v4 唯一标识符'),
    'reading-time': ('阅读时间', '估算文章阅读所需时间'),
    'keyword-density': ('关键词密度', '分析关键词出现频率与密度'),
}

KEBAB_CAMEL = {
    'age-calc': 'ageCalc', 'date-calc': 'dateCalc', 'fuel-cost': 'fuelCost',
    'housing-fund': 'housingFund', 'ideal-weight': 'idealWeight',
    'unit-converter': 'unitConverter', 'loan-compare': 'loanCompare',
    'compound-interest': 'compoundInterest', 'car-loan': 'carLoan',
    'qr-generator': 'qrGenerator', 'password-gen': 'passwordGen',
    'percentage-calc': 'percentageCalc', 'random-gen': 'randomGen',
    'color-picker': 'colorPicker', 'case-converter': 'caseConverter',
    'json-formatter': 'jsonFormatter', 'base64-encode': 'base64Encode',
    'url-encode': 'urlEncode', 'text-cleaner': 'textCleaner',
    'html-stripper': 'htmlStripper', 'text-diff': 'textDiff',
    'uuid-generator': 'uuidGenerator', 'reading-time': 'readingTime',
    'keyword-density': 'keywordDensity',
}

# ── 3. 模板 ──
CORRECT_FOOTER_ZH = '''    <footer>
        <div class="footer-links">
            <a href="/">首页</a>
            <a href="/about">关于</a>
            <a href="/privacy">隐私政策</a>
            <a href="/contact">联系</a>
            <a href="/blog/zh/">博客</a>
        </div>
        <p>© 2026 工具箱里 | 免费在线工具</p>
    </footer>'''

EMOJI_FIX = {
    '馃敡': '🔧', '馃挵': '💰', '馃彞': '🏥', '馃彔': '🏠',
    '馃洅': '🛒', '馃殫': '🚗', '馃嚚馃嚦': '🇨🇳',
    '馃嚞馃嚙': '🇬🇧', '馃嚭馃嚫': '🇺🇸',
    '馃巶': '🎂', '馃摪': '📰', '馃摉': '📖',
    '馃搮': '📅', '馃搶': '📎', '馃幆': '🎯',
    '馃敀': '🔒', '馃敚': '🔣', '馃敔': '🔠', '馃敆': '🔗',
    '馃攳': '🔍', '馃攽': '🔑', '馃攼': '🔐',
    '馃摫': '📱', '馃搴': '📊', '馃搵': '📋',
    '馃搹': '📏', '馃搻': '📐', '馃搳': '📊', '馃搱': '📈',
    '馃彅': '🏠', '馃挕': '💡', '馃М': '🧮',
    '馃幉': '🎲', '馃帹': '🎨', '馃敟': '🔥',
    '鉁忥笍': '✏️', '鈿栵笍': '⚖️',
    '馃尭': '🌸', '馃Ч': '🧹', '馃啍': '🆔',
    '馃彏': '🏥', '馃巹': '🎉', '馃敓': '📰',
}

def fix_emoji(text):
    for g, c in EMOJI_FIX.items():
        text = text.replace(g, c)
    return text

def get_tool_id(p):
    return os.path.splitext(os.path.basename(p))[0]

def get_zh_data(name):
    camel = KEBAB_CAMEL.get(name, name)
    t = I18N['zh'].get(f"{camel}Title") or CANON.get(name, (None,None))[0]
    d = I18N['zh'].get(f"{camel}DescFull") or I18N['zh'].get(f"{camel}Desc") or CANON.get(name, (None,None))[1]
    return t, d

HEAD_TEMPLATE = '''<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <meta name="description" content="{desc}">
    <meta property='og:title' content='{title}'/>
    <meta property='og:description' content='{desc}'/>
    <meta property='og:type' content='website'/>
    <meta property='og:url' content='{url}'/>
    <meta property='og:image' content='https://www.calc-tools.top/assets/logo.svg'/>
    <meta property='og:locale' content='zh_CN'/>
    <meta name='twitter:card' content='summary_large_image'/>
    <meta name='twitter:title' content='{title}'/>
    <meta name='twitter:description' content='{desc}'/>
    <link rel="canonical" href="{url}">
    <link rel="alternate" hreflang="zh-CN" href="{url}">
    <link rel="alternate" hreflang="en" href="{en_url}">
    <link rel="alternate" hreflang="x-default" href="{url}">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="stylesheet" href="../../css/cookie-consent.css">
    <link rel="stylesheet" href="../../css/site.css?v=9">
    <script src="../../js/i18n.js" defer></script>
    <script src="../../js/site.js" defer></script>
</head>'''

def fix_zh_tool_page(path):
    rel = os.path.relpath(path, ROOT).replace('\\', '/')
    name = get_tool_id(path)
    print(f"  zh: {rel}", end=' ')
    title, desc = get_zh_data(name)
    if not title or not desc:
        print(f"⚠️  no data")
        return False
    full_title = f"{title} - 工具箱里"
    # 提取 canonical URL
    text = open(path, encoding='utf-8').read()
    um = re.search(r'calc-tools\.top[^"\'<>\s]*', text)
    url_part = um.group(0) if um else f"www.calc-tools.top/{rel.replace('.html', '')}"
    if not url_part.startswith('http'):
        url_part = 'https://' + url_part
    en_url = url_part.replace('/zh/', '/en/')
    
    # 重建 head
    new_head = HEAD_TEMPLATE.format(title=full_title, desc=desc, url=url_part, en_url=en_url)
    hs = text.find('<head>')
    if hs < 0:
        print("⚠️  no <head>")
        return False
    he = text.find('</head>', hs)
    if he < 0:
        for t in ['<body>', '<body ']:
            p = text.find(t, hs + 10)
            if p > hs + 5:
                he = p; break
        if he < 0: he = hs + len('<head>') + 500
    text = text[:hs] + new_head + text[he:]
    
    # footer
    text = re.sub(r'<footer>.*?</footer>', CORRECT_FOOTER_ZH, text, count=1, flags=re.S)
    
    # data-i18n 文本内容
    for m in re.finditer(r'data-i18n="(\w+)"[^>]*>([^<]*)<', text):
        k = m.group(1)
        if k in I18N['zh'] and m.group(2) != I18N['zh'][k]:
            text = re.sub(
                f'data-i18n="{k}"[^>]*>{re.escape(m.group(2))}<',
                f'data-i18n="{k}">{I18N["zh"][k]}<', text, count=1)
    
    # JSON-LD
    text = re.sub(r'"headline"\s*:\s*"[^"]*"', f'"headline":"{full_title}"', text, count=1)
    text = re.sub(r'"description"\s*:\s*"[^"]*"', f'"description":"{desc}"', text, count=1)
    
    # copyright
    text = re.sub(r'©\s*\d{4}\s*[^<]*', '© 2026 工具箱里 | 免费在线工具', text)
    
    open(path, 'w', encoding='utf-8').write(text)
    print("✅")
    return True

def fix_root_page(path):
    print(f"  root: {os.path.basename(path)}", end=' ')
    text = open(path, encoding='utf-8').read()
    text = re.sub(r'<footer>.*?</footer>', CORRECT_FOOTER_ZH, text, count=1, flags=re.S)
    text = re.sub(r'alt="[^"]*"', 'alt="工具箱里"', text, count=1)
    text = re.sub(r'©\s*\d{4}\s*[^<]*', '© 2026 工具箱里 | 免费在线工具', text)
    open(path, 'w', encoding='utf-8').write(text)
    print("✅")

def fix_en_emoji(path):
    text = open(path, encoding='utf-8').read()
    fixed = fix_emoji(text)
    if fixed != text:
        open(path, 'w', encoding='utf-8').write(fixed)
        return True
    return False

# ── 主执行 ──
def main():
    tool_dirs = ["zh/calculators", "zh/image", "zh/text"]
    en_dirs = ["en/calculators", "en/image", "en/text"]
    root_pages = ["404.html", "about.html", "contact.html", "privacy.html"]
    
    print(f"\n{'='*60}\n📌 修复中文工具页\n{'='*60}")
    for d in tool_dirs:
        for fp in sorted(glob.glob(f"{d}/*.html")):
            fix_zh_tool_page(os.path.join(ROOT, fp))
    
    print(f"\n{'='*60}\n📌 修复根页面\n{'='*60}")
    for rp in root_pages:
        fp = os.path.join(ROOT, rp)
        if os.path.exists(fp): fix_root_page(fp)
    
    print(f"\n{'='*60}\n📌 修复 EN 工具页 emoji\n{'='*60}")
    ec = 0
    for d in en_dirs:
        for fp in sorted(glob.glob(f"{d}/*.html")):
            if fix_en_emoji(os.path.join(ROOT, fp)): ec += 1
    # en blog pages
    for fp in sorted(glob.glob("blog/en/*.html")):
        if fix_en_emoji(os.path.join(ROOT, fp)): ec += 1
    for fp in ["en/index.html"]:
        if fix_en_emoji(os.path.join(ROOT, fp)): ec += 1
    # old zh blog pages too
    for fp in sorted(glob.glob("blog/zh/*.html")):
        if os.path.basename(fp) != "index.html":
            if fix_en_emoji(os.path.join(ROOT, fp)): ec += 1
    print(f"  {ec} files with emoji fixed")
    
    print(f"\n{'='*60}\n✅ 全站修复完成！")
    print("⚠️  16 篇旧博客 zh 的正文中文无法自动恢复（生成器未覆盖），")
    print("   如需完整修复请在内容生产管道中重写这些博客。" )
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
