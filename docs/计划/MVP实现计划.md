# 计算工具站 MVP 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（\- [ ] \）语法来跟踪进度。

**目标：** 4 天内上线一个包含 5 个计算工具的中英双语静态网站，部署到 Vercel

**架构：** 多页静态 HTML + 独立 JS 计算逻辑 + 共用 CSS，每个工具独立 URL，/zh/ /en/ 双语分离

**技术栈：** 纯 HTML/CSS/JavaScript，Chart.js（图表可视化），Vercel 部署

---

## 文件结构

\\\
calculator-site/
├── index.html                    # 语言选择页
├── css/
│   └── style.css                 # 全局样式
├── js/
│   ├── i18n.js                   # 中英翻译
│   └── calculators/              # 每个工具独立 JS
│       ├── mortgage.js           # 房贷计算器
│       ├── tax2026.js            # 个税计算器
│       ├── bmi.js                # BMI 计算器
│       ├── date-calc.js          # 日期计算器
│       └── housing-fund.js       # 公积金贷款计算器
├── zh/                           # 中文版
│   ├── index.html
│   ├── mortgage.html
│   ├── tax2026.html
│   ├── bmi.html
│   ├── date-calc.html
│   └── housing-fund.html
├── en/                           # 英文版
│   ├── index.html
│   ├── mortgage.html
│   ├── tax2026.html
│   ├── bmi.html
│   ├── date-calc.html
│   └── housing-fund.html
└── README.md
\\\

---

### 任务 1：项目骨架 — CSS + i18n + 首页

**文件：**
- 创建：\index.html\
- 创建：\css/style.css\
- 创建：\js/i18n.js\
- 创建：\zh/index.html\
- 创建：\en/index.html\

- [ ] **步骤 1：创建语言选择页 index.html**

\\\html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>在线计算工具 | Online Calculators</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="lang-select">
        <h1>🌐 选择语言 / Choose Language</h1>
        <div class="lang-options">
            <a href="/zh/" class="lang-card">🇨🇳 中文</a>
            <a href="/en/" class="lang-card">🇬🇧 English</a>
        </div>
    </div>
</body>
</html>
\\\

- [ ] **步骤 2：创建全局样式 css/style.css**

\\\css
:root {
    --primary: #2563eb;
    --primary-light: #3b82f6;
    --bg: #f8fafc;
    --card-bg: #ffffff;
    --text: #1e293b;
    --text-light: #64748b;
    --border: #e2e8f0;
    --success: #22c55e;
    --warning: #f59e0b;
    --radius: 12px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
}

.container { max-width: 800px; margin: 0 auto; padding: 20px; }

/* Header / Nav */
.site-header {
    background: var(--primary);
    color: white;
    padding: 16px 0;
    box-shadow: 0 2px 8px rgba(37,99,235,0.3);
}
.site-header .container {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.site-header a { color: white; text-decoration: none; }
.site-header .logo { font-size: 1.3rem; font-weight: 700; }
.lang-switch { font-size: 0.9rem; opacity: 0.9; }
.lang-switch:hover { opacity: 1; }

/* Tool Grid */
.tool-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    margin: 24px 0;
}
.tool-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px;
    text-decoration: none;
    color: var(--text);
    transition: transform 0.2s, box-shadow 0.2s;
}
.tool-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.tool-card .icon { font-size: 2rem; margin-bottom: 8px; }
.tool-card h3 { font-size: 1.1rem; margin-bottom: 4px; }
.tool-card p { font-size: 0.85rem; color: var(--text-light); }

/* Calculator Page */
.calculator {
    background: var(--card-bg);
    border-radius: var(--radius);
    padding: 32px;
    margin: 24px 0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.form-group { margin-bottom: 20px; }
.form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 6px;
    font-size: 0.95rem;
}
.form-group input, .form-group select {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
}
.form-group input:focus, .form-group select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
}
.btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
    width: 100%;
    font-weight: 600;
}
.btn:hover { background: var(--primary-light); }

/* Results */
.result-card {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: var(--radius);
    padding: 24px;
    margin-top: 20px;
}
.result-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e0f2fe;
}
.result-item:last-child { border-bottom: none; }
.result-item .label { color: var(--text-light); }
.result-item .value { font-weight: 700; font-size: 1.1rem; color: var(--primary); }
.result-item .value.highlight { color: var(--success); font-size: 1.3rem; }

/* Chart */
.chart-container { margin-top: 24px; height: 300px; }

/* Ad Placeholder */
.ad-slot {
    background: #f1f5f9;
    border: 1px dashed var(--border);
    border-radius: 8px;
    padding: 60px 20px;
    text-align: center;
    color: var(--text-light);
    font-size: 0.85rem;
    margin: 24px 0;
}

/* Footer */
footer {
    text-align: center;
    padding: 32px 0;
    color: var(--text-light);
    font-size: 0.85rem;
}

/* Page Title */
.page-title { margin: 24px 0 8px; font-size: 1.8rem; }
.page-desc { color: var(--text-light); margin-bottom: 16px; }

/* Mobile */
@media (max-width: 640px) {
    .container { padding: 12px; }
    .calculator { padding: 20px; }
    .tool-grid { grid-template-columns: 1fr; }
    .page-title { font-size: 1.4rem; }
}
\\\

- [ ] **步骤 3：创建 i18n.js 翻译文件**

\\\javascript
const i18n = {
    zh: {
        siteName: '在线计算工具',
        siteDesc: '免费、快捷的在线计算器集合',
        langName: 'English',
        langPath: '/en/',
        // 首页
        pageTitle: '在线计算工具',
        pageDesc: '免费、快捷的在线计算器集合，无需安装，打开即用',
        // 房贷
        mortgage: '房贷计算器',
        mortgageDesc: '快速计算房贷月供、利息总额',
        // 个税
        tax2026: '2026个税计算器',
        tax2026Desc: '计算最新个税，了解税后收入',
        // BMI
        bmi: 'BMI 计算器',
        bmiDesc: '计算身体质量指数，了解体型状况',
        // 日期
        dateCalc: '日期计算器',
        dateCalcDesc: '计算日期差，推算目标日期',
        // 公积金
        housingFund: '公积金贷款计算器',
        housingFundDesc: '计算公积金贷款月供和利息',
        // 通用
        calculate: '计算',
        reset: '重置',
        result: '计算结果',
        adPlaceholder: '广告位',
        copyright: '© 2026 在线计算工具 - 免费在线工具',
        // 表单
        loanAmount: '贷款总额（元）',
        annualRate: '年利率（%）',
        loanYears: '贷款年限（年）',
        repaymentMethod: '还款方式',
        equalPrincipalInterest: '等额本息',
        equalPrincipal: '等额本金',
        monthlyPayment: '月供',
        totalPayment: '还款总额',
        totalInterest: '利息总额',
        // 个税
        monthlySalary: '税前月薪（元）',
        socialInsurance: '社保公积金扣除（元）',
        specialDeduction: '专项附加扣除（元）',
        taxableIncome: '应纳税所得额',
        taxRate: '适用税率',
        taxPayable: '应缴个税',
        afterTax: '税后月薪',
        // BMI
        height: '身高（cm）',
        weight: '体重（kg）',
        bmiValue: 'BMI 指数',
        bmiCategory: '体型分类',
        underweight: '偏瘦',
        normal: '正常',
        overweight: '超重',
        obese: '肥胖',
        healthAdvice: '健康建议',
        // 日期
        startDate: '起始日期',
        daysToAdd: '天数（可正可负）',
        calculateDiff: '计算日期差',
        dateResult: '计算结果日期',
        dayOfWeek: '星期',
        daysDiff: '间隔天数',
        endDate: '结束日期',
        // 公积金
        fundAmount: '公积金贷款额度（元）',
        fundRate: '公积金年利率（%）',
    },
    en: {
        siteName: 'Online Calculators',
        siteDesc: 'Free, fast online calculator collection',
        langName: '中文',
        langPath: '/zh/',
        pageTitle: 'Online Calculators',
        pageDesc: 'Free, fast online calculators - no install needed',
        mortgage: 'Mortgage Calculator',
        mortgageDesc: 'Calculate monthly payments and total interest',
        tax2026: '2026 Tax Calculator',
        tax2026Desc: 'Calculate income tax and after-tax salary',
        bmi: 'BMI Calculator',
        bmiDesc: 'Calculate your Body Mass Index',
        dateCalc: 'Date Calculator',
        dateCalcDesc: 'Calculate date difference or add days',
        housingFund: 'Housing Fund Calculator',
        housingFundDesc: 'Calculate housing fund loan payments',
        calculate: 'Calculate',
        reset: 'Reset',
        result: 'Result',
        adPlaceholder: 'Advertisement',
        copyright: '© 2026 Online Calculators - Free Online Tools',
        loanAmount: 'Loan Amount (¥)',
        annualRate: 'Annual Rate (%)',
        loanYears: 'Loan Term (years)',
        repaymentMethod: 'Repayment Method',
        equalPrincipalInterest: 'Equal Installments',
        equalPrincipal: 'Equal Principal',
        monthlyPayment: 'Monthly Payment',
        totalPayment: 'Total Payment',
        totalInterest: 'Total Interest',
        monthlySalary: 'Monthly Salary (¥)',
        socialInsurance: 'Social Insurance (¥)',
        specialDeduction: 'Special Deductions (¥)',
        taxableIncome: 'Taxable Income',
        taxRate: 'Tax Rate',
        taxPayable: 'Tax Payable',
        afterTax: 'After-Tax Salary',
        height: 'Height (cm)',
        weight: 'Weight (kg)',
        bmiValue: 'BMI',
        bmiCategory: 'Category',
        underweight: 'Underweight',
        normal: 'Normal',
        overweight: 'Overweight',
        obese: 'Obese',
        healthAdvice: 'Health Advice',
        startDate: 'Start Date',
        daysToAdd: 'Days (+/-)',
        calculateDiff: 'Calculate Difference',
        dateResult: 'Result Date',
        dayOfWeek: 'Day of Week',
        daysDiff: 'Days Difference',
        endDate: 'End Date',
        fundAmount: 'Loan Amount (¥)',
        fundRate: 'Annual Rate (%)',
    }
};

function t(key) { return i18n[currentLang][key] || key; }

// Detect language from URL path
const pathLang = window.location.pathname.startsWith('/en/') ? 'en' : 'zh';
let currentLang = pathLang;

function switchLang() {
    const target = currentLang === 'zh' ? '/en/' : '/zh/';
    const currentPath = window.location.pathname.replace(/^\/(zh|en)\//, '');
    window.location.href = target + currentPath;
}
\\\

- [ ] **步骤 4：创建中文首页 zh/index.html**

\\\html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>在线计算工具 - 免费快捷的在线计算器集合</title>
    <meta name="description" content="免费在线计算器：房贷计算器、个税计算器、BMI 计算器、日期计算器、公积金贷款计算器。打开即用，无需安装。">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="canonical" href="https://你的域名/zh/">
    <link rel="alternate" hreflang="zh" href="https://你的域名/zh/">
    <link rel="alternate" hreflang="en" href="https://你的域名/en/">
</head>
<body>
    <header class="site-header">
        <div class="container">
            <a href="/zh/" class="logo">🧮 在线计算工具</a>
            <a href="/en/" class="lang-switch">English</a>
        </div>
    </header>
    <main class="container">
        <h1 class="page-title">在线计算工具</h1>
        <p class="page-desc">免费、快捷的在线计算器集合，无需安装，打开即用</p>
        <div class="tool-grid">
            <a href="/zh/mortgage/" class="tool-card">
                <div class="icon">🏠</div>
                <h3>房贷计算器</h3>
                <p>快速计算房贷月供、利息总额</p>
            </a>
            <a href="/zh/tax2026/" class="tool-card">
                <div class="icon">💰</div>
                <h3>2026个税计算器</h3>
                <p>计算最新个税，了解税后收入</p>
            </a>
            <a href="/zh/bmi/" class="tool-card">
                <div class="icon">⚖️</div>
                <h3>BMI 计算器</h3>
                <p>计算身体质量指数，了解体型状况</p>
            </a>
            <a href="/zh/date-calc/" class="tool-card">
                <div class="icon">📅</div>
                <h3>日期计算器</h3>
                <p>计算日期差，推算目标日期</p>
            </a>
            <a href="/zh/housing-fund/" class="tool-card">
                <div class="icon">🏦</div>
                <h3>公积金贷款计算器</h3>
                <p>计算公积金贷款月供和利息</p>
            </a>
        </div>
    </main>
    <footer>
        <div class="container">
            <p>© 2026 在线计算工具 - 免费在线工具</p>
        </div>
    </footer>
</body>
</html>
\\\

- [ ] **步骤 5：创建英文首页 en/index.html**（结构同中文首页，内容为英文）

\\\html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Calculators - Free Online Calculator Collection</title>
    <meta name="description" content="Free online calculators: Mortgage Calculator, Tax Calculator, BMI Calculator, Date Calculator, Housing Fund Calculator.">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="canonical" href="https://yourdomain.com/en/">
    <link rel="alternate" hreflang="en" href="https://yourdomain.com/en/">
    <link rel="alternate" hreflang="zh" href="https://yourdomain.com/zh/">
</head>
<body>
    <header class="site-header">
        <div class="container">
            <a href="/en/" class="logo">🧮 Online Calculators</a>
            <a href="/zh/" class="lang-switch">中文</a>
        </div>
    </header>
    <main class="container">
        <h1 class="page-title">Online Calculators</h1>
        <p class="page-desc">Free, fast online calculators - no install needed</p>
        <div class="tool-grid">
            <a href="/en/mortgage/" class="tool-card">
                <div class="icon">🏠</div>
                <h3>Mortgage Calculator</h3>
                <p>Calculate monthly payments and total interest</p>
            </a>
            <a href="/en/tax2026/" class="tool-card">
                <div class="icon">💰</div>
                <h3>2026 Tax Calculator</h3>
                <p>Calculate income tax and after-tax salary</p>
            </a>
            <a href="/en/bmi/" class="tool-card">
                <div class="icon">⚖️</div>
                <h3>BMI Calculator</h3>
                <p>Calculate your Body Mass Index</p>
            </a>
            <a href="/en/date-calc/" class="tool-card">
                <div class="icon">📅</div>
                <h3>Date Calculator</h3>
                <p>Calculate date difference or add days</p>
            </a>
            <a href="/en/housing-fund/" class="tool-card">
                <div class="icon">🏦</div>
                <h3>Housing Fund Calculator</h3>
                <p>Calculate housing fund loan payments</p>
            </a>
        </div>
    </main>
    <footer>
        <div class="container">
            <p>© 2026 Online Calculators - Free Online Tools</p>
        </div>
    </footer>
</body>
</html>
\\\

---

### 任务 2：房贷计算器（中英文）

**文件：**
- 创建：\zh/mortgage/index.html\
- 创建：\en/mortgage/index.html\
- 创建：\js/calculators/mortgage.js\

- [ ] **步骤 1：创建房贷计算 JS 逻辑 js/calculators/mortgage.js**

\\\javascript
function calculateMortgage(amount, rate, years, method) {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    if (method === 'equal-payment') {
        const payment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) /
                       (Math.pow(1 + monthlyRate, months) - 1);
        const totalPayment = payment * months;
        const totalInterest = totalPayment - amount;
        return { monthlyPayment: Math.round(payment), totalPayment: Math.round(totalPayment), totalInterest: Math.round(totalInterest), method: 'equal-payment' };
    } else {
        const principalPerMonth = amount / months;
        let totalInterest = 0;
        let firstPayment, lastPayment;
        for (let i = 0; i < months; i++) {
            const interest = (amount - principalPerMonth * i) * monthlyRate;
            totalInterest += interest;
            if (i === 0) firstPayment = principalPerMonth + interest;
            if (i === months - 1) lastPayment = principalPerMonth + interest;
        }
        return {
            firstPayment: Math.round(firstPayment),
            lastPayment: Math.round(lastPayment),
            totalPayment: Math.round(amount + totalInterest),
            totalInterest: Math.round(totalInterest),
            method: 'equal-principal'
        };
    }
}

function renderMortgageResult(result) {
    let html = '<div class=\"result-card\">';
    if (result.method === 'equal-payment') {
        html += '<div class=\"result-item\"><span class=\"label\">' + t('monthlyPayment') + '</span><span class=\"value highlight\">¥' + result.monthlyPayment.toLocaleString() + '</span></div>';
    } else {
        html += '<div class=\"result-item\"><span class=\"label\">首月月供</span><span class=\"value\">¥' + result.firstPayment.toLocaleString() + '</span></div>';
        html += '<div class=\"result-item\"><span class=\"label\">末月月供</span><span class=\"value\">¥' + result.lastPayment.toLocaleString() + '</span></div>';
    }
    html += '<div class=\"result-item\"><span class=\"label\">' + t('totalPayment') + '</span><span class=\"value\">¥' + result.totalPayment.toLocaleString() + '</span></div>';
    html += '<div class=\"result-item\"><span class=\"label\">' + t('totalInterest') + '</span><span class=\"value\">¥' + result.totalInterest.toLocaleString() + '</span></div>';
    html += '</div>';
    return html;
}
\\\

- [ ] **步骤 2：创建中文房贷页面 zh/mortgage/index.html**

\\\html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>房贷计算器 - 在线计算房贷月供和利息</title>
    <meta name="description" content="免费在线房贷计算器，支持等额本息和等额本金两种还款方式，快速计算月供、还款总额和利息总额。">
    <link rel="stylesheet" href="../../css/style.css">
    <link rel="canonical" href="https://你的域名/zh/mortgage/">
    <link rel="alternate" hreflang="zh" href="https://你的域名/zh/mortgage/">
    <link rel="alternate" hreflang="en" href="https://你的域名/en/mortgage/">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <header class="site-header"><div class="container">
        <a href="/zh/" class="logo">🧮 在线计算工具</a>
        <a href="/en/mortgage/" class="lang-switch">English</a>
    </div></header>
    <main class="container">
        <h1 class="page-title">🏠 房贷计算器</h1>
        <p class="page-desc">快速计算房贷月供、利息总额</p>
        <div class="ad-slot">广告位 A</div>
        <div class="calculator" id="app">
            <div class="form-group">
                <label>贷款总额（元）</label>
                <input type="number" id="amount" value="1000000" min="0">
            </div>
            <div class="form-group">
                <label>年利率（%）</label>
                <input type="number" id="rate" value="3.85" step="0.01" min="0">
            </div>
            <div class="form-group">
                <label>贷款年限（年）</label>
                <input type="number" id="years" value="30" min="1" max="30">
            </div>
            <div class="form-group">
                <label>还款方式</label>
                <select id="method">
                    <option value="equal-payment">等额本息</option>
                    <option value="equal-principal">等额本金</option>
                </select>
            </div>
            <button class="btn" onclick="doCalc()">计算</button>
            <div id="result"></div>
            <div class="chart-container"><canvas id="chart"></canvas></div>
        </div>
        <div class="ad-slot">广告位 B</div>
    </main>
    <footer><div class="container"><p>© 2026 在线计算工具</p></div></footer>
    <script src="../../js/i18n.js"></script>
    <script src="../../js/calculators/mortgage.js"></script>
    <script>
    function doCalc() {
        const amount = parseFloat(document.getElementById('amount').value);
        const rate = parseFloat(document.getElementById('rate').value);
        const years = parseFloat(document.getElementById('years').value);
        const method = document.getElementById('method').value;
        const result = calculateMortgage(amount, rate, years, method);
        document.getElementById('result').innerHTML = renderMortgageResult(result);
        drawChart(amount, result.totalInterest);
    }
    function drawChart(principal, interest) {
        const ctx = document.getElementById('chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['贷款本金', '利息总额'],
                datasets: [{ data: [principal, interest], backgroundColor: ['#2563eb', '#f59e0b'] }]
            },
            options: { responsive: true, maintainAspectRatio: true }
        });
    }
    doCalc();
    </script>
</body>
</html>
\\\

- [ ] **步骤 3：创建英文房贷页面 en/mortgage/index.html**（结构同上，英文文案）

---

### 任务 3：个税计算器（中英文）

**文件：**
- 创建：\zh/tax2026/index.html\
- 创建：\en/tax2026/index.html\
- 创建：\js/calculators/tax2026.js\

- [ ] **步骤 1：创建个税计算 JS js/calculators/tax2026.js**

\\\javascript
function calculateTax(salary, insurance, specialDeduction) {
    const threshold = 5000;
    const taxable = Math.max(0, salary - threshold - insurance - specialDeduction);
    let tax = 0, rate = 0;
    if (taxable <= 36000) { tax = taxable * 0.03; rate = 3; }
    else if (taxable <= 144000) { tax = taxable * 0.1 - 2520; rate = 10; }
    else if (taxable <= 300000) { tax = taxable * 0.2 - 16920; rate = 20; }
    else if (taxable <= 420000) { tax = taxable * 0.25 - 31920; rate = 25; }
    else if (taxable <= 660000) { tax = taxable * 0.3 - 52920; rate = 30; }
    else if (taxable <= 960000) { tax = taxable * 0.35 - 85920; rate = 35; }
    else { tax = taxable * 0.45 - 181920; rate = 45; }
    return {
        taxableIncome: Math.round(taxable),
        taxRate: rate,
        taxPayable: Math.round(tax),
        afterTax: Math.round(salary - insurance - tax)
    };
}

function renderTaxResult(result) {
    return '<div class=\"result-card\">' +
        '<div class=\"result-item\"><span class=\"label\">' + t('taxableIncome') + '</span><span class=\"value\">¥' + result.taxableIncome.toLocaleString() + '</span></div>' +
        '<div class=\"result-item\"><span class=\"label\">' + t('taxRate') + '</span><span class=\"value\">' + result.taxRate + '%</span></div>' +
        '<div class=\"result-item\"><span class=\"label\">' + t('taxPayable') + '</span><span class=\"value\">¥' + result.taxPayable.toLocaleString() + '</span></div>' +
        '<div class=\"result-item\"><span class=\"label\">' + t('afterTax') + '</span><span class=\"value highlight\">¥' + result.afterTax.toLocaleString() + '</span></div>' +
        '</div>';
}
\\\

- [ ] **步骤 2：创建中文个税页面 zh/tax2026/index.html**（结构同房贷页面，适配个税表单和结果）

- [ ] **步骤 3：创建英文个税页面 en/tax2026/index.html**

---

### 任务 4：BMI 计算器（中英双语）

**文件：**
- 创建：\zh/bmi/index.html\
- 创建：\en/bmi/index.html\
- 创建：\js/calculators/bmi.js\

- [ ] **步骤 1：创建 BMI 计算 JS js/calculators/bmi.js**

\\\javascript
function calculateBMI(height, weight) {
    const h = height / 100;
    const bmi = weight / (h * h);
    let category, color;
    if (bmi < 18.5) { category = '偏瘦'; color = '#f59e0b'; }
    else if (bmi < 24) { category = '正常'; color = '#22c55e'; }
    else if (bmi < 28) { category = '超重'; color = '#f97316'; }
    else { category = '肥胖'; color = '#ef4444'; }
    return { bmi: bmi.toFixed(1), category, color };
}

function renderBMIResult(result) {
    return '<div class=\"result-card\">' +
        '<div class=\"result-item\"><span class=\"label\">' + t('bmiValue') + '</span><span class=\"value highlight\">' + result.bmi + '</span></div>' +
        '<div class=\"result-item\"><span class=\"label\">' + t('bmiCategory') + '</span><span class=\"value\" style=\"color:' + result.color + '\">' + result.category + '</span></div>' +
        '</div>';
}
\\\

- [ ] **步骤 2：创建中文 BMI 页面 zh/bmi/index.html**

- [ ] **步骤 3：创建英文 BMI 页面 en/bmi/index.html**

---

### 任务 5：日期计算器（中英双语）

**文件：**
- 创建：\zh/date-calc/index.html\
- 创建：\en/date-calc/index.html\
- 创建：\js/calculators/date-calc.js\

- [ ] **步骤 1：创建日期计算 JS js/calculators/date-calc.js**

\\\javascript
function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

function daysBetween(start, end) {
    const s = new Date(start), e = new Date(end);
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function getDayOfWeek(dateStr) {
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return days[new Date(dateStr).getDay()];
}

function renderDateResult(result) {
    let html = '<div class=\"result-card\">';
    if (result.type === 'add') {
        html += '<div class=\"result-item\"><span class=\"label\">' + t('dateResult') + '</span><span class=\"value\">' + result.date + '</span></div>';
        html += '<div class=\"result-item\"><span class=\"label\">' + t('dayOfWeek') + '</span><span class=\"value\">' + result.dayOfWeek + '</span></div>';
    } else {
        html += '<div class=\"result-item\"><span class=\"label\">' + t('daysDiff') + '</span><span class=\"value highlight\">' + result.days + ' 天</span></div>';
    }
    html += '</div>';
    return html;
}
\\\

- [ ] **步骤 2：创建中文日期页面 zh/date-calc/index.html**

- [ ] **步骤 3：创建英文日期页面 en/date-calc/index.html**

---

### 任务 6：公积金贷款计算器（中英文）

**文件：**
- 创建：\zh/housing-fund/index.html\
- 创建：\en/housing-fund/index.html\（仅中文需要，英文可跳过）
- 创建：\js/calculators/housing-fund.js\

- [ ] **步骤 1：创建公积金计算 JS js/calculators/housing-fund.js**（逻辑同房贷，但使用公积金利率）

\\\javascript
function calculateHousingFund(amount, rate, years) {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    const payment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) /
                   (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = payment * months;
    const totalInterest = totalPayment - amount;
    return {
        monthlyPayment: Math.round(payment),
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest)
    };
}

function renderFundResult(result) {
    return '<div class=\"result-card\">' +
        '<div class=\"result-item\"><span class=\"label\">' + t('monthlyPayment') + '</span><span class=\"value highlight\">¥' + result.monthlyPayment.toLocaleString() + '</span></div>' +
        '<div class=\"result-item\"><span class=\"label\">' + t('totalPayment') + '</span><span class=\"value\">¥' + result.totalPayment.toLocaleString() + '</span></div>' +
        '<div class=\"result-item\"><span class=\"label\">' + t('totalInterest') + '</span><span class=\"value\">¥' + result.totalInterest.toLocaleString() + '</span></div>' +
        '</div>';
}
\\\

- [ ] **步骤 2：创建中文公积金页面 zh/housing-fund/index.html**

- [ ] **步骤 3：可选：创建英文公积金页面 en/housing-fund/index.html**（或直接 301 跳转到中文版）

---

### 任务 7：SEO 配置 + 最终检查

**文件：**
- 修改：所有 HTML 页面

- [ ] **步骤 1：检查所有页面的 SEO 标签完整性**
  - 每个页面有唯一 title + meta description
  - 每个页面有 hreflang 标签（zh + en）
  - 每个页面有 canonical URL
  - 首页添加 JSON-LD 结构化数据

- [ ] **步骤 2：添加 JSON-LD 到首页**

在 zh/index.html 和 en/index.html 的 head 中添加：
\\\html
<script type=\"application/ld+json\">
{
    \"@context\": \"https://schema.org\",
    \"@type\": \"CollectionPage\",
    \"name\": \"在线计算工具\",
    \"description\": \"免费在线计算器集合\",
    \"url\": \"https://你的域名/zh/\"
}
</script>
\\\

- [ ] **步骤 3：验证所有页面在本地能正常打开，功能可用**

- [ ] **步骤 4：创建 README.md**

---

## 执行顺序总结

| 顺序 | 任务 | 产出 |
|:---:|------|------|
| 1 | 项目骨架 | CSS + i18n + 首页（中英） |
| 2 | 房贷计算器 | 中英页面 + JS 逻辑 + 图表 |
| 3 | 个税计算器 | 中英页面 + JS 逻辑 |
| 4 | BMI 计算器 | 中英页面 + JS 逻辑 |
| 5 | 日期计算器 | 中英页面 + JS 逻辑 |
| 6 | 公积金贷款计算器 | 中英页面 + JS 逻辑 |
| 7 | SEO + 收尾 | 标签配置 + JSON-LD + README |
