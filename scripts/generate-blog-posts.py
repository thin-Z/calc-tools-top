#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate 21 missing blog posts × 2 languages (zh/en) = 42 HTML files.
Each blog post follows the existing template structure with OG tags, Schema.org, and CTA.
"""
import os
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG_ZH = os.path.join(ROOT, "blog", "zh")
BLOG_EN = os.path.join(ROOT, "blog", "en")
DATE = "2026-07-02"

# ── Blog content data ─────────────────────────────────────────────
# (slug, category_zh, category_en, zh_title, zh_desc, zh_body, zh_cta_text,
#  en_title, en_desc, en_body, en_cta_text, tool_path_zh, tool_path_en, tool_name_zh, tool_name_en)

BLOGS = [
    # ── Calculators ──
    ("age-calc-guide", "health", "health",
     "年龄计算器怎么用？精确计算年龄的几种方法",
     "年龄计算器支持精确到天、月、年的年龄计算，本文介绍实岁、虚岁、精确年龄的计算方法和使用场景。",
     "<p>年龄计算是我们日常生活中常见的需求，无论是填写表格、办理证件，还是计算退休时间，都需要准确的年龄信息。</p>\n<h2>实岁与虚岁的区别</h2>\n<p><strong>实岁（周岁）</strong>：按公历生日计算，过完生日才增加一岁。这是官方证件和正式场合通用的计算方式。</p>\n<p><strong>虚岁</strong>：按农历年份计算，出生即算一岁，每逢春节增加一岁。在中国传统文化中仍广泛使用。</p>\n<h2>精确年龄计算场景</h2>\n<p><strong>精确到天</strong>：计算两个日期之间的完整年、月、日，适用于合同期限、服务年限等场景。</p>\n<p><strong>精确到月</strong>：不满整年的情况按剩余月数计算，常见于子女抚养费、赡养费等计算。</p>\n<p><strong>精确到年</strong>：只计算整年数，适用于学龄计算、退休年龄判断等。</p>\n<h2>年龄计算注意事项</h2>\n<p>使用年龄计算器时，请确认出生日期准确无误。不同的计算方式（实岁/虚岁、是否包含起始日）会影响结果，选择适合你场景的计算模式即可。</p>",
     "用年龄计算器算算你的精确年龄",
     "Age Calculator Guide: How to Calculate Exact Age",
     "Calculate precise age in years, months, and days. Learn the difference between nominal age and actual age in Chinese and international contexts.",
     "<p>Age calculation is a common daily need, from filling forms and applying for documents to calculating retirement dates.</p>\n<h2>Nominal Age vs Actual Age</h2>\n<p><strong>Actual Age (Sui)</strong>: Calculated by calendar birthday, increased only after the birthday passes. This is the standard for official documents.</p>\n<p><strong>Nominal Age (Xu Sui)</strong>: Calculated by lunar year, counted as 1 at birth and increases at each Spring Festival. Still widely used in Chinese tradition.</p>\n<h2>Precise Age Calculation</h2>\n<p><strong>To the day</strong>: Count complete years, months, and days between two dates. Useful for contract terms and service years.</p>\n<p><strong>To the month</strong>: Count remaining months when not a full year. Common in alimony calculations.</p>\n<p><strong>To the year</strong>: Count whole years only. Used for school enrollment age and retirement checks.</p>",
     "Use the Age Calculator to find your exact age",
     "/zh/calculators/age-calc.html", "/en/calculators/age-calc.html",
     "🧮 年龄计算器", "🧮 Age Calculator"),

    ("electricity-cost-guide", "life", "life",
     "电费计算器：家电耗电量与电费计算方法",
     "电费计算公式、家电耗电量参考表，帮你估算每月电费支出，合理规划家庭用电。",
     "<p>电费是每个家庭每月的固定支出之一。了解电费计算方法和家电耗电量，可以帮助你更好地控制用电成本。</p>\n<h2>电费计算公式</h2>\n<p><strong>电费 = 用电量（千瓦时）× 电价（元/度）</strong></p>\n<p>其中：1千瓦时（kWh）= 1度电。电价因地区和阶梯不同而异，通常在0.5-0.9元/度之间。</p>\n<h2>常见家电耗电量参考</h2>\n<p><strong>空调</strong>：1.5匹空调制冷约1.2度/小时，制热约1.5度/小时</p>\n<p><strong>冰箱</strong>：三级能效约0.8度/天，一级能效约0.5度/天</p>\n<p><strong>洗衣机</strong>：一次标准洗涤约0.5-1度</p>\n<p><strong>热水器</strong>：加热一次约1.5-2度（60L容量）</p>\n<p><strong>电视机</strong>：55寸LED约0.1-0.15度/小时</p>\n<h2>省电小贴士</h2>\n<p>1. 空调温度设置在26℃最省电；2. 冰箱不要塞太满，保证冷气流通；3. 使用一级能效电器长期更划算；4. 待机电器也会耗电，不使用时拔掉插头。</p>",
     "用电费计算器估算你的月度电费",
     "Electricity Cost Calculator: Appliance Power Consumption Guide",
     "Electricity bill formula, appliance power consumption reference, and energy saving tips to help estimate monthly costs.",
     "<p>Electricity bills are a regular household expense. Understanding how electricity costs are calculated helps you manage energy usage.</p>\n<h2>Electricity Bill Formula</h2>\n<p><strong>Cost = Consumption (kWh) × Rate (per kWh)</strong></p>\n<p>Rates vary by region and tier, typically between $0.08-0.15 per kWh.</p>\n<h2>Common Appliance Consumption</h2>\n<p><strong>AC</strong>: 1.5-ton cooling ~1.2 kWh/h, heating ~1.5 kWh/h</p>\n<p><strong>Refrigerator</strong>: Standard ~0.8 kWh/day, Energy Star ~0.5 kWh/day</p>\n<p><strong>Washing Machine</strong>: One cycle ~0.5-1 kWh</p>\n<p><strong>Water Heater</strong>: One heating ~1.5-2 kWh (60L tank)</p>\n<p><strong>TV</strong>: 55-inch LED ~0.1-0.15 kWh/h</p>",
     "Calculate your electricity cost",
     "/zh/calculators/electricity.html", "/en/calculators/electricity.html",
     "🧮 电费计算器", "🧮 Electricity Cost Calculator"),

    ("fuel-cost-guide", "life", "life",
     "油耗计算器：汽车油耗怎么算？每公里油费多少",
     "汽车油耗计算公式、每公里油费估算方法，帮你了解爱车的真实油耗水平。",
     "<p>油耗是车主最关心的话题之一。了解你的车真实油耗，可以帮助你更好地规划出行预算。</p>\n<h2>油耗计算公式</h2>\n<p><strong>百公里油耗（L/100km）= 加油量（升）÷ 行驶里程（公里）× 100</strong></p>\n<p>这是最常用的油耗计算方式，数值越低越省油。</p>\n<h2>每公里油费计算</h2>\n<p><strong>每公里油费（元/公里）= 百公里油耗 × 油价 ÷ 100</strong></p>\n<p>例如：百公里油耗8L，油价8元/升，则每公里油费 = 8 × 8 ÷ 100 = 0.64元/公里</p>\n<h2>影响油耗的因素</h2>\n<p>1. 驾驶习惯：急加速急刹车会显著增加油耗；2. 路况：市区拥堵比高速多耗油30%-50%；3. 车辆负载：每增加100kg约增加5%油耗；4. 胎压：胎压不足会增加滚动阻力；5. 空调使用：开空调约增加10%-20%油耗。</p>\n<h2>如何降低油耗</h2>\n<p>保持匀速行驶（60-90km/h最省油）、定期保养发动机、减轻不必要的负载、使用合适的机油，都可以帮助降低油耗。</p>",
     "用油耗计算器算算你的用车成本",
     "Fuel Cost Calculator: How to Calculate Car Fuel Consumption",
     "Fuel consumption formula, cost per kilometer estimation, and fuel-saving tips for car owners.",
     "<p>Fuel economy is one of the top concerns for car owners. Knowing your car's real fuel consumption helps you plan driving budgets better.</p>\n<h2>Fuel Consumption Formula</h2>\n<p><strong>Fuel Consumption (L/100km) = Fuel Used (L) ÷ Distance (km) × 100</strong></p>\n<h2>Cost Per Kilometer</h2>\n<p><strong>Cost/km = Fuel Consumption × Fuel Price ÷ 100</strong></p>\n<p>Example: 8L/100km at $1.2/L = $0.096/km</p>\n<h2>Factors Affecting Fuel Economy</h2>\n<p>1. Driving habits: rapid acceleration increases consumption; 2. Traffic: city driving uses 30%-50% more; 3. Load: every 100kg adds ~5%; 4. Tire pressure: under-inflated tires increase rolling resistance; 5. AC use: adds 10%-20%.</p>",
     "Calculate your fuel cost",
     "/zh/calculators/fuel-cost.html", "/en/calculators/fuel-cost.html",
     "🧮 油耗计算器", "🧮 Fuel Cost Calculator"),

    ("unit-converter-guide", "life", "life",
     "单位换算器使用指南：常见单位换算速查",
     "长度、重量、温度、面积、体积等单位换算速查表，日常工作和生活中最常用的单位换算公式。",
     "<p>单位换算是日常生活和工作中非常常见的需求。无论是做菜时的克与毫升换算，还是装修时的平方米与平方英尺换算，一个好用的单位换算器能省去很多麻烦。</p>\n<h2>长度单位换算</h2>\n<p>1米 = 100厘米 = 1000毫米 = 3.28英尺 = 39.37英寸</p>\n<p>1公里 = 0.621英里 &nbsp;&nbsp; 1英里 = 1.609公里</p>\n<h2>重量单位换算</h2>\n<p>1千克 = 1000克 = 2.204磅 &nbsp;&nbsp; 1磅 = 0.453千克</p>\n<p>1斤 = 500克 = 0.5千克 &nbsp;&nbsp; 1盎司 = 28.35克</p>\n<h2>温度单位换算</h2>\n<p>摄氏度（℃）= （华氏度 - 32）÷ 1.8</p>\n<p>华氏度（℉）= 摄氏度 × 1.8 + 32</p>\n<h2>面积单位换算</h2>\n<p>1平方米 = 10.76平方英尺 &nbsp;&nbsp; 1亩 = 666.67平方米</p>\n<p>1公顷 = 15亩 = 10000平方米</p>\n<h2>体积单位换算</h2>\n<p>1升 = 1000毫升 &nbsp;&nbsp; 1加仑（美制）= 3.785升</p>\n<p>1立方米 = 1000升 &nbsp;&nbsp; 1杯（美制）= 236.6毫升</p>",
     "用单位换算器快速换算",
     "Unit Converter Guide: Common Unit Conversion Reference",
     "Length, weight, temperature, area, and volume conversion formulas for daily life and work.",
     "<p>Unit conversion is a common need in daily life and work. Whether converting grams to milliliters for cooking or square feet to square meters for renovation, a good unit converter saves time.</p>\n<h2>Length Conversion</h2>\n<p>1 m = 100 cm = 1000 mm = 3.28 ft = 39.37 in</p>\n<p>1 km = 0.621 mi &nbsp;&nbsp; 1 mi = 1.609 km</p>\n<h2>Weight Conversion</h2>\n<p>1 kg = 1000 g = 2.204 lb &nbsp;&nbsp; 1 lb = 0.453 kg</p>\n<p>1 oz = 28.35 g</p>\n<h2>Temperature Conversion</h2>\n<p>°C = (°F - 32) ÷ 1.8</p>\n<p>°F = °C × 1.8 + 32</p>\n<h2>Area Conversion</h2>\n<p>1 m² = 10.76 ft² &nbsp;&nbsp; 1 acre = 4046.86 m²</p>\n<p>1 hectare = 2.471 acres = 10000 m²</p>",
     "Use the Unit Converter",
     "/zh/calculators/unit-converter.html", "/en/calculators/unit-converter.html",
     "🧮 单位换算器", "🧮 Unit Converter"),

    ("ovulation-calculator-guide", "health", "health",
     "排卵期计算器：准确预测排卵期和安全期",
     "排卵期计算方法、安全期推算、备孕最佳时机，帮助女性了解自己的生理周期。",
     "<p>排卵期计算是备孕和避孕的重要参考。了解自己的排卵周期，可以更好地规划生育计划。</p>\n<h2>什么是排卵期？</h2>\n<p>排卵期是指卵子从卵巢排出的时间段，通常发生在下次月经来潮前的14天左右。排卵期一般持续2-3天，是最容易受孕的时期。</p>\n<h2>排卵期计算方法</h2>\n<p><strong>日历法</strong>：记录最近6-12个月的月经周期，推算下次月经日，再往回推14天即为排卵日。</p>\n<p><strong>体温法</strong>：排卵后基础体温会上升0.3-0.5℃，坚持每天早上测量体温可以帮助确认排卵。</p>\n<p><strong>宫颈粘液法</strong>：排卵期宫颈粘液会变得清亮、拉丝状，类似蛋清。</p>\n<h2>安全期计算</h2>\n<p>安全期并不是绝对安全，特别是对于月经周期不规律的女性。排卵期计算器的结果仅供参考，不能作为唯一的避孕依据。</p>",
     "用排卵期计算器了解你的生理周期",
     "Ovulation Calculator: Predict Ovulation and Safe Periods",
     "Ovulation calculation methods, safe period estimation, and best timing for conception.",
     "<p>Ovulation tracking is important for both conception and contraception planning.</p>\n<h2>What is Ovulation?</h2>\n<p>Ovulation is when an egg is released from the ovary, typically occurring about 14 days before the next period starts. The fertile window lasts 2-3 days.</p>\n<h2>How to Calculate Ovulation</h2>\n<p><strong>Calendar Method</strong>: Track 6-12 months of cycles, predict next period, then count back 14 days.</p>\n<p><strong>Temperature Method</strong>: Basal body temperature rises 0.3-0.5°C after ovulation.</p>\n<p><strong>Cervical Mucus Method</strong>: Mucus becomes clear and stretchy during ovulation.</p>",
     "Track your ovulation cycle",
     "/zh/calculators/ovulation.html", "/en/calculators/ovulation.html",
     "🧮 排卵期计算器", "🧮 Ovulation Calculator"),

    ("loan-comparison-guide", "finance", "finance",
     "贷款对比计算器：不同贷款方案利息差异分析",
     "等额本息、等额本金、先息后本等多种贷款方案的利息和月供对比分析。",
     "<p>面对不同的贷款方案，如何选择最适合自己的还款方式？贷款对比计算器可以帮助你直观地比较多种方案的利息和月供差异。</p>\n<h2>三种常见还款方式</h2>\n<p><strong>等额本息</strong>：每月还款金额固定，前期利息占比高，后期本金占比高。适合收入稳定的借款人。</p>\n<p><strong>等额本金</strong>：每月还款本金固定，利息逐月递减，总利息最低。适合前期还款能力较强的人。</p>\n<p><strong>先息后本</strong>：前期只还利息，到期一次性还本金，月供压力最小但总利息最高。适合短期资金周转。</p>\n<h2>贷款对比的关键指标</h2>\n<p>1. 年化利率（APR）：包含所有费用的真实利率；2. 月供金额：评估每月还款压力；3. 总利息支出：决定贷款的总成本；4. 还款期限：影响月供和总利息的平衡。</p>\n<h2>如何选择贷款方案</h2>\n<p>短期贷款（1-3年）可选先息后本降低月供压力；中期贷款（3-10年）等额本息更省心；长期贷款（10-30年）等额本金总利息最低。建议用贷款对比计算器模拟不同方案后再做决定。</p>",
     "用贷款对比计算器比较不同方案",
     "Loan Comparison Calculator: Compare Different Loan Plans",
     "Compare equal installment, equal principal, and interest-first loan plans to find the best option.",
     "<p>Different loan plans have very different total costs. Use the loan comparison calculator to make an informed decision.</p>\n<h2>Three Common Repayment Methods</h2>\n<p><strong>Equal Installment</strong>: Fixed monthly payment, interest-heavy early on. Best for stable income borrowers.</p>\n<p><strong>Equal Principal</strong>: Fixed principal payment, decreasing interest. Lowest total interest cost.</p>\n<p><strong>Interest First</strong>: Pay interest only until maturity. Lowest monthly pressure but highest total cost.</p>\n<h2>Key Comparison Metrics</h2>\n<p>1. APR (Annual Percentage Rate); 2. Monthly payment amount; 3. Total interest paid; 4. Loan term length.</p>",
     "Compare loan plans",
     "/zh/calculators/loan-compare.html", "/en/calculators/loan-compare.html",
     "🧮 贷款对比计算器", "🧮 Loan Comparison Calculator"),

    # ── Image tools ──
    ("image-format-converter-guide", "tools", "tools",
     "图片格式转换：JPG、PNG、WebP、GIF怎么选？",
     "常见图片格式的区别、适用场景和转换方法，帮你选择合适的图片格式。",
     "<p>不同的图片格式有不同的特点和适用场景，选择合适的格式可以在保证画质的同时减小文件体积。</p>\n<h2>常见图片格式对比</h2>\n<p><strong>JPG/JPEG</strong>：支持数百万颜色，有损压缩，文件小。适合照片、复杂图像，不适合需要透明背景的图片。</p>\n<p><strong>PNG</strong>：无损压缩，支持透明背景，文件较大。适合图标、截图、需要透明背景的设计素材。</p>\n<p><strong>WebP</strong>：Google推出的现代格式，支持有损和无损压缩，比JPG小25%-35%。适合网页使用，但部分老旧浏览器不支持。</p>\n<p><strong>GIF</strong>：支持动画，仅支持256色。适合简单动画和表情包，不适合存储照片。</p>\n<h2>什么时候需要格式转换</h2>\n<p>1. 上传到网站时用WebP或JPG减小加载时间；2. 设计素材需要透明背景时用PNG；3. 老旧系统可能只支持特定格式。</p>",
     "用图片格式转换工具转换你的图片",
     "Image Format Converter: JPG vs PNG vs WebP vs GIF Guide",
     "Compare common image formats, their use cases, and when to convert between them.",
     "<p>Different image formats serve different purposes. Choosing the right format balances quality and file size.</p>\n<h2>Format Comparison</h2>\n<p><strong>JPG/JPEG</strong>: Millions of colors, lossy compression, small file size. Best for photos, not for transparent backgrounds.</p>\n<p><strong>PNG</strong>: Lossless compression, supports transparency, larger files. Great for icons, screenshots, and designs needing transparency.</p>\n<p><strong>WebP</strong>: Modern Google format, 25%-35% smaller than JPG. Perfect for web use.</p>\n<p><strong>GIF</strong>: Supports animation, only 256 colors. Best for simple animations.</p>",
     "Convert your images",
     "/zh/image/convert.html", "/en/image/convert.html",
     "🖼️ 格式转换", "🖼️ Format Converter"),

    ("image-resize-crop-guide", "tools", "tools",
     "图片裁剪缩放：调整图片尺寸的最佳实践",
     "图片裁剪和缩放的方法、保持比例的技巧、不同平台的最佳图片尺寸。",
     "<p>图片裁剪和缩放是日常处理图片最常用的操作之一。无论是社交媒体发图，还是网站上传，都需要合适的图片尺寸。</p>\n<h2>裁剪 vs 缩放的区别</h2>\n<p><strong>裁剪</strong>：删除图片的部分区域，改变构图但不改变分辨率。适合去除不需要的边缘、调整主体位置。</p>\n<p><strong>缩放</strong>：改变图片整体尺寸，分辨率随之变化。适合缩小大图到指定尺寸。</p>\n<h2>保持宽高比</h2>\n<p>缩放时保持宽高比可以防止图片变形。常见比例的用途：1:1（头像）、4:3（普通照片）、16:9（视频封面/PPT）、3:4（手机竖屏）</p>\n<h2>各平台推荐图片尺寸</h2>\n<p>网站横幅：1920×1080px；微信公众号封面：900×500px；淘宝主图：800×800px；朋友圈配图：1080×1080px或1080×1920px。</p>",
     "用裁剪缩放工具调整你的图片",
     "Image Resize and Crop: Best Practices for Image Sizing",
     "Image cropping vs resizing, aspect ratio tips, and recommended sizes for different platforms.",
     "<p>Image resizing and cropping are essential daily operations for anyone working with images.</p>\n<h2>Crop vs Resize</h2>\n<p><strong>Crop</strong>: Remove parts of the image, changing composition but not resolution.</p>\n<p><strong>Resize</strong>: Change overall dimensions, resolution changes accordingly.</p>\n<h2>Common Aspect Ratios</h2>\n<p>1:1 (Profile photos), 4:3 (Standard photos), 16:9 (Video covers/PPT), 3:4 (Mobile portrait)</p>\n<h2>Platform Recommendations</h2>\n<p>Website banner: 1920×1080px; Social media cover: 1200×630px; Product image: 800×800px.</p>",
     "Adjust your images",
     "/zh/image/resize.html", "/en/image/resize.html",
     "🖼️ 裁剪缩放", "🖼️ Crop & Resize"),

    ("image-to-base64-guide", "tools", "tools",
     "图片转Base64：HTML和CSS中嵌入图片的最佳方式",
     "图片转Base64编码的方法、适用场景和优缺点，帮你决定是否在网页中嵌入图片。",
     "<p>Base64编码可以将图片转换为纯文本格式，直接嵌入到HTML、CSS或JavaScript中，无需额外的HTTP请求。</p>\n<h2>什么是Base64图片编码？</h2>\n<p>Base64是一种将二进制数据转换为文本字符串的编码方式。图片Base64编码后可以直接写在HTML的src属性或CSS的background-image中。</p>\n<h2>适用场景</h2>\n<p><strong>小图标（<10KB）</strong>：减少HTTP请求，提升页面加载速度。</p>\n<p><strong>CSS Sprites替代方案</strong>：将多张小图标合并为一个Base64字符串。</p>\n<p><strong>邮件HTML</strong>：邮件客户端不支持外部资源引用，Base64嵌入是常用方案。</p>\n<h2>局限性</h2>\n<p>Base64编码会使图片体积增加约33%。大图不适合用Base64，因为会增加HTML/CSS文件大小，反而拖慢加载速度。一般建议10KB以下的小图标才考虑使用。</p>",
     "用Base64编码工具转换你的图片",
     "Image to Base64: Embed Images in HTML and CSS",
     "Convert images to Base64 for inline embedding in HTML, CSS, and JavaScript. Use cases and limitations.",
     "<p>Base64 encoding converts binary image data into text strings that can be directly embedded in HTML, CSS, or JavaScript.</p>\n<h2>What is Base64 Image Encoding?</h2>\n<p>Base64 transforms binary image data into ASCII text strings that can be placed directly in HTML src attributes or CSS background-image properties.</p>\n<h2>Best Use Cases</h2>\n<p><strong>Small icons (<10KB)</strong>: Reduce HTTP requests, improve page load speed.</p>\n<p><strong>Email HTML</strong>: Email clients don't support external resources, so Base64 embedding is standard.</p>\n<h2>Limitations</h2>\n<p>Base64 increases file size by about 33%. Not recommended for large images. Stick to files under 10KB for Base64 encoding.</p>",
     "Convert your image to Base64",
     "/zh/image/base64.html", "/en/image/base64.html",
     "🖼️ 图片转Base64", "🖼️ Image to Base64"),

    ("color-picker-guide", "tools", "tools",
     "在线取色器使用指南：屏幕取色与配色技巧",
     "取色器的使用方法、常见配色方案、十六进制/RGB/HSL颜色代码转换。",
     "<p>取色器是设计师和开发者的常用工具。从屏幕上获取准确的颜色值，是设计工作的第一步。</p>\n<h2>颜色代码格式</h2>\n<p><strong>十六进制（HEX）</strong>：#FF5733，最常用的网页颜色格式，6位十六进制数表示红绿蓝各256级。</p>\n<p><strong>RGB</strong>：rgb(255, 87, 51)，红绿蓝三通道各0-255取值。</p>\n<p><strong>HSL</strong>：hsl(9, 100%, 60%)，色相（0-360）、饱和度（0%-100%）、亮度（0%-100%）。</p>\n<h2>常见配色方案</h2>\n<p><strong>互补色</strong>：色环上相对的颜色，如蓝和橙，视觉效果强烈。</p>\n<p><strong>类似色</strong>：色环上相邻的颜色，如蓝、蓝绿、绿，和谐统一。</p>\n<p><strong>三色组合</strong>：色环上间隔120°三色，平衡且丰富。</p>\n<h2>取色技巧</h2>\n<p>使用取色器时，尽量从真实设计或自然图片中取色，这样搭配出来的颜色更自然和谐。保存常用颜色调色板，方便后续项目使用。</p>",
     "用在线取色器获取你喜欢的颜色",
     "Online Color Picker Guide: Screen Color Picking and Palette Tips",
     "How to use a color picker, common color schemes, and HEX/RGB/HSL color code conversion.",
     "<p>A color picker is an essential tool for designers and developers. Getting accurate color values from your screen is the first step in design work.</p>\n<h2>Color Code Formats</h2>\n<p><strong>HEX</strong>: #FF5733, most common web color format with 6 hexadecimal digits.</p>\n<p><strong>RGB</strong>: rgb(255, 87, 51), three channels each 0-255.</p>\n<p><strong>HSL</strong>: hsl(9, 100%, 60%), hue (0-360), saturation (0%-100%), lightness (0%-100%).</p>\n<h2>Common Color Schemes</h2>\n<p><strong>Complementary</strong>: Opposite colors on the wheel, creates strong contrast.</p>\n<p><strong>Analogous</strong>: Adjacent colors on the wheel, harmonious and unified.</p>\n<p><strong>Triadic</strong>: Three evenly spaced colors, balanced and vibrant.</p>",
     "Pick your perfect color",
     "/zh/image/color-picker.html", "/en/image/color-picker.html",
     "🖼️ 取色器", "🖼️ Color Picker"),

    # ── Text tools ──
    ("word-counter-guide", "tools", "tools",
     "字数统计工具：准确统计字符、词语和段落",
     "字数统计的使用场景、中英文统计差异、SEO写作中的字数控制建议。",
     "<p>字数统计是写作者最常用的工具之一。无论写文章、做报告、还是社交媒体发帖，了解字数都很重要。</p>\n<h2>字数统计的应用场景</h2>\n<p><strong>写作投稿</strong>：各平台对文章字数有明确要求，如公众号原创文章通常建议1500-3000字。</p>\n<p><strong>SEO写作</strong>：搜索引擎偏好的文章长度，工具类文章800-1500字，深度指南2000-4000字。</p>\n<p><strong>社交媒体</strong>：微博限140字（现已放宽），标题限70字以内最佳。</p>\n<h2>中英文统计差异</h2>\n<p>中文字数统计按字符计算，英文字数统计通常按单词计算。字数统计工具支持字符数、字数（英文单词数）、段落数、行数等多种统计方式。</p>\n<h2>SEO写作字数建议</h2>\n<p>博客文章：1500-2500字；产品描述：100-300字；元描述（Meta Description）：150-160字符。建议使用字数统计工具检查你的文章是否符合要求。</p>",
     "用字数统计工具检查你的文章",
     "Word Counter: Count Characters, Words, and Paragraphs",
     "Word counting use cases, Chinese vs English differences, and SEO writing length recommendations.",
     "<p>A word counter is one of the most essential tools for writers. Whether writing articles, reports, or social media posts, knowing your word count matters.</p>\n<h2>Use Cases</h2>\n<p><strong>Content Writing</strong>: Most platforms have minimum requirements. Blog posts typically need 1500-3000 words.</p>\n<p><strong>SEO Writing</strong>: Tool articles 800-1500 words, in-depth guides 2000-4000 words.</p>\n<p><strong>Social Media</strong>: Titles perform best under 70 characters.</p>\n<h2>Chinese vs English Counting</h2>\n<p>Chinese counts by character, English counts by word. A good word counter supports both modes.</p>",
     "Count your words",
     "/zh/text/word-counter.html", "/en/text/word-counter.html",
     "🔣 字数统计", "🔣 Word Counter"),

    ("case-converter-guide", "tools", "tools",
     "大小写转换工具：英文大小写转换的几种方式",
     "大写、小写、首字母大写、驼峰命名等大小写转换方法，适用于编程和写作场景。",
     "<p>大小写转换在写作和编程中经常用到。了解不同的大小写转换方式，可以提高工作效率。</p>\n<h2>常见的转换方式</h2>\n<p><strong>全部大写（UPPERCASE）</strong>：适用于标题、缩写词、警示文字。</p>\n<p><strong>全部小写（lowercase）</strong>：适用于URL、邮箱地址、文件名。</p>\n<p><strong>首字母大写（Capitalize）</strong>：每个单词首字母大写，适用于文章标题。</p>\n<p><strong>驼峰命名（camelCase）</strong>：第一个单词小写，后续单词首字母大写，JavaScript变量命名常用。</p>\n<p><strong>蛇形命名（snake_case）</strong>：全小写，单词间用下划线分隔，Python变量命名常用。</p>\n<h2>什么时候需要大小写转换</h2>\n<p>1. 文案写作时统一格式；2. 编程时变量名命名规范要求；3. 数据库查询时大小写敏感性处理；4. 英文写作时专有名词规范化。</p>",
     "用大小写转换工具快速转换",
     "Case Converter: UPPERCASE, lowercase, Capitalize, camelCase and More",
     "English case conversion methods including uppercase, lowercase, capitalize, camelCase, and snake_case.",
     "<p>Case conversion is frequently needed in writing and programming. Different case formats serve different purposes.</p>\n<h2>Common Conversion Types</h2>\n<p><strong>UPPERCASE</strong>: For titles, acronyms, and warnings.</p>\n<p><strong>lowercase</strong>: For URLs, email addresses, file names.</p>\n<p><strong>Capitalize</strong>: First letter of each word uppercase, for article titles.</p>\n<p><strong>camelCase</strong>: First word lowercase, subsequent words capitalized. Common in JavaScript.</p>\n<p><strong>snake_case</strong>: All lowercase with underscores. Common in Python.</p>",
     "Convert your text case",
     "/zh/text/case-converter.html", "/en/text/case-converter.html",
     "🔣 大小写转换", "🔣 Case Converter"),

    ("json-formatter-guide", "tools", "tools",
     "JSON格式化工具：美化、压缩和校验JSON数据",
     "JSON格式化的作用、在线校验JSON的重要性、常见JSON错误及修复方法。",
     "<p>JSON（JavaScript Object Notation）是当前最流行的数据交换格式之一。无论是在API开发、配置文件管理、还是数据存储中，JSON都无处不在。</p>\n<h2>JSON格式化与压缩</h2>\n<p><strong>格式化（美化）</strong>：将压缩的JSON转为带有缩进和换行的可读格式，方便阅读和调试。</p>\n<p><strong>压缩</strong>：移除所有空格和换行，将JSON压缩为一行，减小数据传输体积。</p>\n<h2>为什么需要JSON校验</h2>\n<p>一个语法错误的JSON会导致程序解析失败。常见的JSON错误包括：漏掉逗号、多余的逗号、字符串未加引号、使用单引号（JSON要求双引号）等。</p>\n<h2>JSON使用小技巧</h2>\n<p>1. 密钥名称必须用双引号包裹；2. 字符串必须用双引号，不能用单引号；3. 不支持注释（部分扩展格式除外）；4. 最后一个元素后面不能有逗号。</p>",
     "用JSON格式化工具美化你的JSON",
     "JSON Formatter: Beautify, Minify, and Validate JSON",
     "JSON formatting, validation, common errors and how to fix them for developers working with APIs and config files.",
     "<p>JSON (JavaScript Object Notation) is the most popular data interchange format. From API development to configuration files, JSON is everywhere.</p>\n<h2>Format vs Minify</h2>\n<p><strong>Beautify</strong>: Add indentation and line breaks for readability during development.</p>\n<p><strong>Minify</strong>: Remove all whitespace to reduce data transfer size.</p>\n<h2>Why Validate JSON?</h2>\n<p>A syntax error in JSON causes parsing failure. Common errors: missing commas, trailing commas, unquoted strings, single quotes instead of double quotes.</p>",
     "Format your JSON",
     "/zh/text/json-formatter.html", "/en/text/json-formatter.html",
     "🔣 JSON格式化", "🔣 JSON Formatter"),

    ("base64-encode-guide", "tools", "tools",
     "Base64编解码工具：什么是Base64？怎么用？",
     "Base64编码原理、常见应用场景、在线编解码方法，适合开发者和普通用户。",
     "<p>Base64是一种将二进制数据转换为ASCII文本的编码方式，广泛应用于数据传输和存储场景。</p>\n<h2>什么是Base64？</h2>\n<p>Base64使用64个可打印字符（A-Z、a-z、0-9、+、/）来表示任意二进制数据。编码后的数据比原数据大约增加33%。</p>\n<h2>常见应用场景</h2>\n<p><strong>邮件附件</strong>：SMTP协议只支持7位ASCII字符，Base64编码可以让二进制附件通过邮件传输。</p>\n<p><strong>HTTP基本认证</strong>：用户名和密码通过Base64编码后放在Authorization头中传输。</p>\n<p><strong>数据URI</strong>：将图片等小文件编码后直接嵌入HTML/CSS中。</p>\n<p><strong>Token传输</strong>：JWT（JSON Web Token）使用Base64编码传输信息。</p>\n<h2>Base64注意事项</h2>\n<p>Base64不是加密！编码后的数据可以轻松解码回原文。不要用Base64来保护敏感信息。如果需要加密，请使用AES等加密算法。</p>",
     "用Base64编解码工具处理你的数据",
     "Base64 Encoder Decoder: What is Base64 and How to Use It",
     "Base64 encoding principles, common use cases, and online encode/decode tools for data handling.",
     "<p>Base64 converts binary data into ASCII text, widely used in data transmission and storage.</p>\n<h2>What is Base64?</h2>\n<p>Base64 uses 64 printable characters (A-Z, a-z, 0-9, +, /) to represent binary data. Encoded data is about 33% larger than the original.</p>\n<h2>Common Use Cases</h2>\n<p><strong>Email Attachments</strong>: SMTP only supports 7-bit ASCII, Base64 enables binary attachment transmission.</p>\n<p><strong>HTTP Basic Auth</strong>: Username:password encoded in Base64 for Authorization headers.</p>\n<p><strong>Data URIs</strong>: Embed small files directly in HTML/CSS.</p>\n<p><strong>JWT Tokens</strong>: JSON Web Tokens use Base64 encoding for payload transmission.</p>",
     "Encode or decode your data",
     "/zh/text/base64-encode.html", "/en/text/base64-encode.html",
     "🔣 Base64编解码", "🔣 Base64 Encode/Decode"),

    ("url-encode-guide", "tools", "tools",
     "URL编解码工具：什么是URL编码？为什么要编码？",
     "URL编码的原理、特殊字符的处理、前端开发中的URL编解码场景。",
     "<p>URL编码（又称百分号编码）是Web开发中的基础概念。它确保URL中的特殊字符能被正确传输和解析。</p>\n<h2>什么是URL编码？</h2>\n<p>URL中只允许使用ASCII字符集中的字母、数字和部分特殊符号。其他字符（如中文、空格、&等）需要编码为%后跟两位十六进制数的格式。</p>\n<p>例如：空格编码为%20，中文'你好'编码为%E4%BD%A0%E5%A5%BD</p>\n<h2>什么时候需要URL编解码</h2>\n<p><strong>GET请求参数</strong>：URL中的查询参数包含特殊字符时需要进行编码。</p>\n<p><strong>URL路径</strong>：路径中包含中文或特殊字符的文件名。</p>\n<p><strong>表单提交</strong>：application/x-www-form-urlencoded格式提交的数据会自动编码。</p>\n<h2>常见需要编码的字符</h2>\n<p>空格 → %20、& → %26、? → %3F、= → %3D、# → %23、中文 → 多字节编码</p>",
     "用URL编解码工具处理URL参数",
     "URL Encoder Decoder: What is URL Encoding and Why It Matters",
     "URL encoding principles, special character handling, and common use cases for web developers.",
     "<p>URL encoding (percent-encoding) is a fundamental concept in web development, ensuring special characters in URLs are transmitted correctly.</p>\n<h2>What is URL Encoding?</h2>\n<p>URLs only allow letters, numbers, and a few special characters from the ASCII set. Other characters (Chinese text, spaces, &) must be encoded as % followed by two hex digits.</p>\n<p>Example: space → %20, ampersand → %26</p>\n<h2>When to Use URL Encoding</h2>\n<p><strong>GET Parameters</strong>: Query parameters with special characters.</p>\n<p><strong>URL Paths</strong>: File names containing Chinese characters or spaces.</p>\n<p><strong>Form Submission</strong>: application/x-www-form-urlencoded data.</p>",
     "Encode or decode URLs",
     "/zh/text/url-encode.html", "/en/text/url-encode.html",
     "🔣 URL编解码", "🔣 URL Encode/Decode"),

    ("text-cleaner-guide", "tools", "tools",
     "文本清理工具：去除多余空格和空行的最佳方法",
     "文本清理的常见场景，去除多余空格、空行、制表符，整理不规范文本。",
     "<p>从不同来源复制粘贴的文本常常带有格式问题：多余的空格、空行、制表符等。文本清理工具可以一键帮你整理。</p>\n<h2>文本清理的常见问题</h2>\n<p><strong>多余空格</strong>：行首行尾的空格、单词间的多余空格。</p>\n<p><strong>多余空行</strong>：连续多个空行、文末多余换行。</p>\n<p><strong>制表符</strong>：制表符与空格的混用导致对齐不一致。</p>\n<h2>清理场景举例</h2>\n<p><strong>从PDF复制</strong>：PDF复制出来的文本常有意外换行和空格。</p>\n<p><strong>从网页复制</strong>：网页文本可能带有隐藏的格式字符。</p>\n<p><strong>从代码编辑器复制</strong>：带缩进的代码复制到其他地方可能需要重新整理。</p>\n<h2>清理后做什么</h2>\n<p>清理后的文本更适合用于排版、翻译、数据分析等后续处理。建议清理后再使用字数统计工具检查文本状态。</p>",
     "用文本清理工具整理你的文本",
     "Text Cleaner: Remove Extra Spaces and Blank Lines",
     "Clean up messy text by removing extra spaces, blank lines, tabs, and formatting issues from copied content.",
     "<p>Text copied from different sources often comes with formatting problems: extra spaces, blank lines, and tab characters.</p>\n<h2>Common Issues</h2>\n<p><strong>Extra Spaces</strong>: Leading/trailing spaces, multiple spaces between words.</p>\n<p><strong>Extra Blank Lines</strong>: Consecutive empty lines, trailing newlines.</p>\n<p><strong>Tabs</strong>: Mixed tabs and spaces causing misalignment.</p>\n<h2>When to Clean Text</h2>\n<p><strong>PDF Copy</strong>: Often has unexpected line breaks and spaces.</p>\n<p><strong>Web Copy</strong>: May carry hidden formatting characters.</p>",
     "Clean your text",
     "/zh/text/text-cleaner.html", "/en/text/text-cleaner.html",
     "🔣 文本清理", "🔣 Text Cleaner"),

    ("html-stripper-guide", "tools", "tools",
     "HTML剥离工具：快速去除HTML标签获取纯文本",
     "HTML标签剥离方法、保留纯文本内容、从网页提取文字的最佳实践。",
     "<p>处理网页内容时，经常需要从HTML代码中提取纯文本。HTML剥离工具可以快速移除所有标签，只保留文字内容。</p>\n<h2>什么时候需要HTML剥离</h2>\n<p><strong>内容分析</strong>：对网页内容进行分词、关键词提取、情感分析等自然语言处理前，需要先移除HTML标签。</p>\n<p><strong>数据采集</strong>：网页爬虫采集到的数据通常包含HTML标签，需要清理后才能存储或显示。</p>\n<p><strong>邮件发送</strong>：有些邮件客户端只支持纯文本格式。</p>\n<p><strong>RSS生成</strong>：RSS Feed中的内容可能需要纯文本版本。</p>\n<h2>剥离前后的对比</h2>\n<p>处理前：&lt;p&gt;这是一段&lt;strong&gt;重要&lt;/strong&gt;的文字&lt;/p&gt;</p>\n<p>处理后：这是一段重要的文字</p>\n<h2>注意事项</h2>\n<p>HTML剥离会移除所有标签，包括图片、链接等信息。如果需要保留链接或图片引用，建议使用更精细的解析工具。</p>",
     "用HTML剥离工具提取纯文本",
     "HTML Stripper: Remove HTML Tags, Get Clean Text",
     "Strip HTML tags from web content to extract plain text for analysis, storage, or display.",
     "<p>When processing web content, you often need to extract plain text from HTML code. An HTML stripper removes all tags and keeps only the text content.</p>\n<h2>Common Use Cases</h2>\n<p><strong>Content Analysis</strong>: NLP tasks like tokenization and keyword extraction require clean text.</p>\n<p><strong>Data Collection</strong>: Web scraped content needs HTML tag removal before storage.</p>\n<p><strong>Email</strong>: Some email clients only support plain text format.</p>\n<h2>Before and After</h2>\n<p>Before: &lt;p&gt;This is &lt;strong&gt;important&lt;/strong&gt; text.&lt;/p&gt;</p>\n<p>After: This is important text.</p>",
     "Strip HTML from your content",
     "/zh/text/html-stripper.html", "/en/text/html-stripper.html",
     "🔣 HTML剥离", "🔣 HTML Stripper"),

    ("text-diff-guide", "tools", "tools",
     "文本对比工具：快速找出两段文本的差异",
     "文本对比的应用场景、差异对比方法、版本管理中常用的文本比较技巧。",
     "<p>文本对比是写作、编程和文档管理中常用的功能。比较两段文本的差异，可以帮助你快速定位修改内容。</p>\n<h2>文本对比的应用场景</h2>\n<p><strong>文章修改</strong>：对比修改前后的文章，确认改动是否符合预期。</p>\n<p><strong>代码审查</strong>：比较两段代码的差异，快速定位新增和删除的部分。</p>\n<p><strong>合同核对</strong>：对比不同版本的合同条款，避免遗漏关键变更。</p>\n<p><strong>翻译校对</strong>：对比原文和译文，检查是否有遗漏段落。</p>\n<h2>对比结果解读</h2>\n<p>通常标记为红色（删除部分）和绿色（新增部分），方便一目了然地看出差异。</p>\n<h2>使用建议</h2>\n<p>对比前先使用文本清理工具整理格式，避免因空格、换行等格式差异导致误报。大段文本对比时，建议逐段进行，提高准确度。</p>",
     "用文本对比工具比较你的内容",
     "Text Diff Tool: Quickly Find Differences Between Texts",
     "Compare two text passages to find additions, deletions, and modifications. Essential for writing, coding, and document review.",
     "<p>Text comparison is essential in writing, programming, and document management. Finding differences between two versions helps track changes.</p>\n<h2>Use Cases</h2>\n<p><strong>Article Revisions</strong>: Compare before and after edits to verify changes.</p>\n<p><strong>Code Review</strong>: Find added and removed lines in code.</p>\n<p><strong>Contract Review</strong>: Compare different versions for key changes.</p>\n<p><strong>Translation Check</strong>: Compare original and translated text for completeness.</p>",
     "Compare your texts",
     "/zh/text/text-diff.html", "/en/text/text-diff.html",
     "🔣 文本对比", "🔣 Text Diff"),

    ("uuid-generator-guide", "tools", "tools",
     "UUID生成器：什么是UUID？批量生成唯一标识符",
     "UUID的版本区别、格式说明、应用场景，以及如何批量生成唯一标识符。",
     "<p>UUID（Universally Unique Identifier）是一种标准化的唯一标识符格式，在软件开发中广泛应用。</p>\n<h2>UUID的版本</h2>\n<p><strong>UUID v4</strong>：基于随机数生成，最常用的版本。约5.3×10^36个可能值，重复概率极低。</p>\n<p><strong>UUID v1</strong>：基于时间戳和MAC地址生成，可追溯生成时间和设备。</p>\n<p><strong>UUID v5</strong>：基于命名空间和名称生成，同样的输入产生同样的UUID。</p>\n<h2>UUID的格式</h2>\n<p>标准的UUID格式为32个十六进制数字，分为5组：8-4-4-4-12</p>\n<p>例如：550e8400-e29b-41d4-a716-446655440000</p>\n<h2>UUID的应用场景</h2>\n<p><strong>数据库主键</strong>：分布式系统中作为主键，无需自增ID。</p>\n<p><strong>会话标识</strong>：用户会话的唯一标识。</p>\n<p><strong>资源标识</strong>：API中资源的唯一ID。</p>\n<p><strong>文件名</strong>：防止文件重名。</p>",
     "用UUID生成器生成唯一标识符",
     "UUID Generator: What is UUID and How to Generate Unique Identifiers",
     "UUID version differences, format explanation, use cases, and batch generation for developers.",
     "<p>UUID (Universally Unique Identifier) is a standardized unique identifier format widely used in software development.</p>\n<h2>UUID Versions</h2>\n<p><strong>UUID v4</strong>: Random-based, most common. Approximately 5.3×10³⁶ possible values.</p>\n<p><strong>UUID v1</strong>: Time-based with MAC address, traceable to generation time.</p>\n<p><strong>UUID v5</strong>: Name-based, same input produces same UUID.</p>\n<h2>UUID Format</h2>\n<p>32 hexadecimal digits in 5 groups: 8-4-4-4-12</p>\n<p>Example: 550e8400-e29b-41d4-a716-446655440000</p>",
     "Generate UUIDs",
     "/zh/text/uuid-generator.html", "/en/text/uuid-generator.html",
     "🔣 UUID生成器", "🔣 UUID Generator"),

    ("reading-time-guide", "tools", "tools",
     "阅读时间计算器：文章阅读时间和朗读时间估算",
     "阅读速度参考标准、不同内容类型的阅读时间估算方法、内容创作中的时间规划。",
     "<p>阅读时间计算可以帮助读者提前了解一篇文章需要花费多少时间，同时帮助内容创作者规划文章长度。</p>\n<h2>阅读速度参考</h2>\n<p><strong>中文阅读</strong>：成人平均阅读速度约300-500字/分钟，精读约200-300字/分钟。</p>\n<p><strong>英文阅读</strong>：成人平均阅读速度约200-300词/分钟。</p>\n<h2>朗读时间估算</h2>\n<p>中文朗读速度约150-200字/分钟，英文朗读速度约130-160词/分钟。朗读时间约为阅读时间的2-3倍。</p>\n<h2>内容创作建议</h2>\n<p>根据阅读时间规划文章长度：快速阅读（2-3分钟）对应600-900字；标准文章（5-7分钟）对应1500-2500字；深度阅读（10-15分钟）对应3000-5000字。</p>\n<h2>为什么标注阅读时间</h2>\n<p>在文章开头标注阅读时间可以帮助读者判断是否现在就开始阅读，提高阅读完成率。</p>",
     "用阅读时间工具估算你的文章阅读时间",
     "Reading Time Calculator: Estimate Article Reading and Speaking Time",
     "Reading speed reference, reading time estimation for different content types, and content planning tips.",
     "<p>Reading time estimation helps readers know how long an article takes and helps content creators plan their writing.</p>\n<h2>Reading Speed Reference</h2>\n<p><strong>Chinese Reading</strong>: Average adult at 300-500 characters/min, slow reading at 200-300 characters/min.</p>\n<p><strong>English Reading</strong>: Average adult at 200-300 words/min.</p>\n<h2>Speaking Time</h2>\n<p>Speaking speed: ~150 words/min. Speaking time is typically 2-3× reading time.</p>",
     "Estimate reading time",
     "/zh/text/reading-time.html", "/en/text/reading-time.html",
     "🔣 阅读时间", "🔣 Reading Time"),

    ("keyword-density-guide", "tools", "tools",
     "关键词密度分析工具：SEO优化的关键指标",
     "关键词密度的计算方法、SEO最佳实践范围、关键词堆砌的处罚风险。",
     "<p>关键词密度（Keyword Density）是SEO中的一个重要概念，指的是关键词在页面中出现的频率。</p>\n<h2>关键词密度的计算方法</h2>\n<p><strong>关键词密度 = （关键词出现次数 ÷ 总词数）× 100%</strong></p>\n<p>例如：一篇500字的中文文章中，目标关键词出现5次，则密度为1%。</p>\n<h2>最佳关键词密度范围</h2>\n<p>一般认为2%-5%是比较理想的关键词密度范围。低于1%可能不足以让搜索引擎识别页面主题；高于8%可能被判定为关键词堆砌。</p>\n<h2>关键词堆砌的风险</h2>\n<p>过度使用关键词（关键词堆砌）会导致搜索引擎惩罚，降低网站排名。建议在标题、H1、首段和结尾自然融入关键词，正文中根据上下文适量出现即可。</p>\n<h2>长尾关键词策略</h2>\n<p>除了主要关键词，使用多个相关的长尾关键词可以获得更好的SEO效果，同时避免关键词堆砌的风险。</p>",
     "用关键词密度分析工具优化你的文章",
     "Keyword Density Analyzer: Key Metric for SEO Optimization",
     "Keyword density calculation, best practice range, and keyword stuffing risks for content SEO.",
     "<p>Keyword density is an important SEO metric that measures how often a keyword appears in your content.</p>\n<h2>How to Calculate</h2>\n<p><strong>Keyword Density = (Keyword Count ÷ Total Words) × 100%</strong></p>\n<h2>Optimal Range</h2>\n<p>2%-5% is generally considered ideal. Below 1% may be too weak for SEO, above 8% risks keyword stuffing penalties.</p>\n<h2>Keyword Stuffing Risk</h2>\n<p>Overusing keywords can lead to search engine penalties and lower rankings. Use keywords naturally in titles, H1, opening, and closing paragraphs.</p>",
     "Analyze your keyword density",
     "/zh/text/keyword-density.html", "/en/text/keyword-density.html",
     "🔣 关键词密度", "🔣 Keyword Density"),
]


# ── Template helpers ──

def zh_title_tag(slug, zh_title):
    return zh_title

def en_title_tag(slug, en_title):
    return en_title

def zh_blog_filename(slug):
    return f"{slug}.html"

def en_blog_filename(slug):
    return f"{slug}.html"

CATEGORY_ZH_MAP = {
    "finance": ("💰 财务", "tag-finance"),
    "health": ("🏞 健康", "tag-health"),
    "life": ("🏔 生活", "tag-life"),
    "tools": ("🔧 技术工具", "tag-tools"),
}

CATEGORY_EN_MAP = {
    "finance": ("💰 Finance", "tag-finance"),
    "health": ("🏞 Health", "tag-health"),
    "life": ("🏔 Lifestyle", "tag-life"),
    "tools": ("🔧 Dev Tools", "tag-tools"),
}

def generate_zh_blog(slug, cat, zh_title, zh_desc, zh_body, zh_cta_text, tool_path, tool_name):
    cat_zh, tag_class = CATEGORY_ZH_MAP.get(cat, ("🔧 技术工具", "tag-tools"))
    canonical = f"https://calc-tools.top/blog/zh/{slug}.html"
    en_canonical = f"https://calc-tools.top/blog/en/{slug}.html"
    article_id = f"blog_{slug.replace('-', '_')}"

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{zh_title}</title>
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
    <meta name="description" content="{zh_desc}">
    <meta property='og:title' content='{zh_title}'/>
    <meta property='og:description' content='{zh_desc}'/>
    <meta property='og:type' content='article'/>
    <meta property='og:url' content='{canonical}'/>
    <meta property='og:image' content='https://www.calc-tools.top/assets/logo.svg'/>
    <meta property='og:locale' content='zh_CN'/>
    <meta name='twitter:card' content='summary_large_image'/>
    <meta name='twitter:title' content='{zh_title}'/>
    <meta name='twitter:description' content='{zh_desc}'/>
    <link rel="canonical" href="{canonical}">
    <link rel="alternate" hreflang="zh-CN" href="{canonical}">
    <link rel="alternate" hreflang="en" href="{en_canonical}">
    <link rel="alternate" hreflang="x-default" href="{canonical}">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="stylesheet" href="../../css/site.css">
    <link rel="stylesheet" href="../../css/cookie-consent.css">
    <script type="application/ld+json">
    {{
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": "{zh_title}",
        "description": "{zh_desc}",
        "author": {{ "@type": "Person", "name": "Calc-Tools 编辑" }},
        "datePublished": "{DATE}",
        "mainEntityOfPage": {{
            "@type": "WebPage",
            "@id": "{canonical}"
        }},
        "publisher": {{
            "@type": "Organization",
            "name": "在线工具"
        }}
    }}
    </script>
    <script src="../../js/i18n.js" defer></script>
    <script src="../../js/site.js" defer></script>
</head>
<body>
    <header>
        <a href="/" class="logo"><img src="/assets/logo-h.svg" alt="工具箱里" class="site-logo"></a>
        <nav>
            <a href="/">首页</a>
            <select class="lang-switch" onchange="switchLang(this.value)">
                <option value="zh" selected>🇨🇳 中文</option>
                <option value="en">🇺🇸 English</option>
            </select>
        </nav>
    </header>
    <main>
        <article class="blog-post">
            <div class="article-tags"><a href="/blog/zh/?cat={cat}" class="tag {tag_class}" data-tag="{cat}">{cat_zh}</a></div>
            <p class="blog-meta">📰 {DATE} · Calc-Tools 编辑</p>
            <h1>{zh_title}</h1>{zh_body}
            <div class="blog-cta">
                <p>{zh_cta_text}</p>
                <p><a href="{tool_path}">👉 {tool_name}</a></p>
            </div>
            <div class="article-bottom-tags"><a href="/blog/zh/?cat={cat}" class="tag {tag_class}" data-tag="{cat}">{cat_zh}</a></div>
        </article>
    </main>
    <footer>
        <p>© 2026 工具箱里</p>
    </footer>
    <script src="../../js/cookie-consent.js" defer></script>
</body>
</html>'''
    return html

def generate_en_blog(slug, cat, en_title, en_desc, en_body, en_cta_text, tool_path, tool_name):
    cat_en, tag_class = CATEGORY_EN_MAP.get(cat, ("🔧 Dev Tools", "tag-tools"))
    canonical = f"https://calc-tools.top/blog/en/{slug}.html"
    zh_canonical = f"https://calc-tools.top/blog/zh/{slug}.html"

    html = f'''<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{en_title}</title>
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<meta name="description" content="{en_desc}">
    <meta property='og:title' content='{en_title}'/>
    <meta property='og:description' content='{en_desc}'/>
    <meta property='og:type' content='website'/>
    <meta property='og:url' content='{canonical}'/>
    <meta property='og:image' content='https://www.calc-tools.top/assets/logo.svg'/>
    <meta property='og:locale' content='en_US'/>
    <meta name='twitter:card' content='summary_large_image'/>
    <meta name='twitter:title' content='{en_title}'/>
    <meta name='twitter:description' content='{en_desc}'/>
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="en" href="{canonical}">
<link rel="alternate" hreflang="zh-CN" href="{zh_canonical}">
<link rel="alternate" hreflang="x-default" href="{canonical}">
<link rel="stylesheet" href="../../css/style.css"><link rel="stylesheet" href="../../css/site.css">
    <link rel="stylesheet" href="../../css/cookie-consent.css">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Article","headline":"{en_title}","description":"{en_desc}","author":{{"@type":"Person","name":"Calc-Tools Editor"}},"datePublished":"{DATE}","mainEntityOfPage":{{"@type":"WebPage","@id":"{canonical}"}},"publisher":{{"@type":"Organization","name":"ToolBox Inside"}}}}</script>
<script src="../../js/i18n.js" defer></script><script src="../../js/site.js" defer></script>
</head>
<body>
<header><a href="/en/" class="logo"><img src="/assets/logo-h.svg" alt="ToolBox" class="site-logo"></a>
<nav><a href="/en/">Home</a><select class="lang-switch" onchange="switchLang(this.value)"><option value="zh">Chinese</option><option value="en" selected>English</option></select></nav></header>
<main><article class="blog-post">
<div class="article-tags"><a href="/blog/en/?cat={cat}" class="tag {tag_class}" data-tag="{cat}">{cat_en}</a></div>
<p class="blog-meta">📰 {DATE} · Calc-Tools Editor</p>
<h1>{en_title}</h1>{en_body}
<div class="blog-cta"><p>{en_cta_text}</p><p><a href="{tool_path}">👉 {tool_name}</a></p></div>
<div class="article-bottom-tags"><a href="/blog/en/?cat={cat}" class="tag {tag_class}" data-tag="{cat}">{cat_en}</a></div>
</article></main>
<footer>
        <div class="footer-links">
            <a href="/en/">Home</a>
            <a href="/en/about.html">About</a>
            <a href="/en/privacy.html">Privacy</a>
            <a href="/en/contact.html">Contact</a>
            <a href="/blog/en/">Blog</a>
        </div>
        <p>© 2026 ToolBox Inside | Free Online Tools</p>
    </footer>
    <script src="../../js/cookie-consent.js" defer></script>
</body>
</html>'''
    return html


# ── Generate all blog files ──
def main():
    os.makedirs(BLOG_ZH, exist_ok=True)
    os.makedirs(BLOG_EN, exist_ok=True)

    # Track all generated blog entries for index updates
    zh_entries = []
    en_entries = []

    for blog in BLOGS:
        slug, cat_zh, cat_en, zh_title, zh_desc, zh_body, zh_cta, en_title, en_desc, en_body, en_cta, tool_zh, tool_en, name_zh, name_en = blog

        # Generate zh
        zh_html = generate_zh_blog(slug, cat_zh, zh_title, zh_desc, zh_body, zh_cta, tool_zh, name_zh)
        zh_path = os.path.join(BLOG_ZH, f"{slug}.html")
        with open(zh_path, 'w', encoding='utf-8') as f:
            f.write(zh_html)
        zh_entries.append((slug, cat_zh, zh_title, zh_desc))
        print(f"✅ zh: {slug}.html")

        # Generate en
        en_html = generate_en_blog(slug, cat_en, en_title, en_desc, en_body, en_cta, tool_en, name_en)
        en_path = os.path.join(BLOG_EN, f"{slug}.html")
        with open(en_path, 'w', encoding='utf-8') as f:
            f.write(en_html)
        en_entries.append((slug, cat_en, en_title, en_desc))
        print(f"✅ en: {slug}.html")

    print(f"\nTotal: {len(BLOGS)} × 2 = {len(BLOGS)*2} blog posts generated")

    # ── Update zh/index.html ──
    zh_index_path = os.path.join(BLOG_ZH, "index.html")
    with open(zh_index_path, 'r', encoding='utf-8') as f:
        zh_index = f.read()

    # Add tools category filter
    tools_filter = '''            <button class="category-chip" data-category="tools">🔧 技术工具</button>'''
    zh_index = zh_index.replace(
        '<button class="category-chip" data-category="life">🏔 生活</button>',
        '<button class="category-chip" data-category="life">🏔 生活</button>\n' + tools_filter
    )

    # Generate article list HTML for new entries
    new_articles_html_zh = ""
    for slug, cat, title, desc in zh_entries:
        article_id = f"blog_{slug.replace('-', '_')}"
        cat_zh_display, _ = CATEGORY_ZH_MAP.get(cat, ("🔧 技术工具", "tag-tools"))
        new_articles_html_zh += f'''
            <article class="article-item" data-category="{cat}">
                <h2><a href="/blog/zh/{slug}.html">{title}</a></h2>
                <p class="article-meta">📰 {DATE}</p><button class="article-like" data-blog-id="{article_id}"><span class="heart">❤️</span> <span class="like-count">0</span></button>
                <p class="article-summary">{desc}</p>
                <div class="article-tags"><a href="/blog/zh/" class="tag tag-{cat}" data-tag="{cat}">{cat_zh_display}</a></div>
            </article>'''

    # Insert before footer
    zh_index = zh_index.replace(
        '    </main>\n    <footer>',
        new_articles_html_zh + '\n    </main>\n    <footer>'
    )

    with open(zh_index_path, 'w', encoding='utf-8') as f:
        f.write(zh_index)
    print(f"✅ Updated zh/blog/index.html")

    # ── Update en/index.html ──
    en_index_path = os.path.join(BLOG_EN, "index.html")
    with open(en_index_path, 'r', encoding='utf-8') as f:
        en_index = f.read()

    # Add tools category filter
    tools_filter_en = '''            <button class="category-chip" data-category="tools">🔧 Dev Tools</button>'''
    en_index = en_index.replace(
        '<button class="category-chip" data-category="life">🏔 Lifestyle</button>',
        '<button class="category-chip" data-category="life">🏔 Lifestyle</button>\n' + tools_filter_en
    )

    new_articles_html_en = ""
    for slug, cat, title, desc in en_entries:
        article_id = f"blog_{slug.replace('-', '_')}"
        cat_en_display, _ = CATEGORY_EN_MAP.get(cat, ("🔧 Dev Tools", "tag-tools"))
        new_articles_html_en += f'''
            <article class="article-item" data-category="{cat}">
                <h2><a href="/blog/en/{slug}.html">{title}</a></h2>
                <p class="article-meta">📰 {DATE}</p><button class="article-like" data-blog-id="{article_id}"><span class="heart">❤️</span> <span class="like-count">0</span></button>
                <p class="article-summary">{desc}</p>
                <div class="article-tags"><a href="/blog/en/" class="tag tag-{cat}" data-tag="{cat}">{cat_en_display}</a></div>
            </article>'''

    en_index = en_index.replace(
        '    </main>\n    <footer>',
        new_articles_html_en + '\n    </main>\n    <footer>'
    )

    with open(en_index_path, 'w', encoding='utf-8') as f:
        f.write(en_index)
    print(f"✅ Updated en/blog/index.html")

    # ── Also update the existing static about/contact/privacy blog list if needed ──
    # Actually these are already in the index, the article-list div gets the new entries
    print("\n✅ All done!")


if __name__ == "__main__":
    main()
