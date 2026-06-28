# 点击统计优化 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 升级首页点击统计系统，新增趋势标识、使用次数展示、搜索热词统计三个功能

**架构：** 纯前端 localStorage 方案，点击数据格式从 `{toolId: count}` 升级为 `{toolId: {total, daily}}`，新增搜索词频存储

**技术栈：** 原生 JavaScript（ES6），CSS3，HTML5

---

### 任务 1：数据层升级 - 点击数据结构迁移

**文件：**
- 修改：`js/site.js:70-100`（Click Tracking 区域）

- [ ] **步骤 1：替换 Click Tracking 数据层代码**

找到 `js/site.js` 中 `/* ===== Click Tracking ===== */` 区域，将 `getClicks`、`saveClicks`、`incrementClick` 三个函数替换为以下代码：

```javascript
/* ===== Click Tracking ===== */
const CLICK_STORAGE_KEY = 'toolbox_clicks';
const SEARCH_TERMS_KEY = 'toolbox_search_terms';

function getClicks() {
    try {
        var raw = JSON.parse(localStorage.getItem(CLICK_STORAGE_KEY)) || {};
        // 迁移旧格式：{toolId: number} → {toolId: {total, daily}}
        var migrated = false;
        for (var id in raw) {
            if (typeof raw[id] === 'number') {
                raw[id] = { total: raw[id], daily: {} };
                migrated = true;
            }
        }
        if (migrated) {
            localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify(raw));
        }
        return raw;
    } catch (e) {
        return {};
    }
}

function saveClicks(clicks) {
    localStorage.setItem(CLICK_STORAGE_KEY, JSON.stringify(clicks));
}

function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function incrementClick(toolId) {
    var clicks = getClicks();
    if (!clicks[toolId]) {
        clicks[toolId] = { total: 0, daily: {} };
    }
    clicks[toolId].total = (clicks[toolId].total || 0) + 1;
    var today = getTodayStr();
    if (!clicks[toolId].daily) clicks[toolId].daily = {};
    clicks[toolId].daily[today] = (clicks[toolId].daily[today] || 0) + 1;
    saveClicks(clicks);
}

function getDailyClicks(toolId) {
    var clicks = getClicks();
    var d = clicks[toolId] ? (clicks[toolId].daily || {}) : {};
    return d;
}

function getTodayClickCount(toolId) {
    var daily = getDailyClicks(toolId);
    return daily[getTodayStr()] || 0;
}

function getTotalClicks(toolId) {
    var clicks = getClicks();
    return clicks[toolId] ? (clicks[toolId].total || 0) : 0;
}

function getTrendLabel(toolId) {
    var clicks = getClicks();
    var d = clicks[toolId] ? (clicks[toolId].daily || {}) : {};
    var today = getTodayStr();
    var todayCount = d[today] || 0;

    // 计算日均点击（过去 7 天，排除今天）
    var dates = Object.keys(d).filter(function(k) { return k !== today; }).sort();
    var recentDates = dates.slice(-7);
    var sum = 0;
    for (var i = 0; i < recentDates.length; i++) { sum += d[recentDates[i]]; }
    var avg = recentDates.length > 0 ? sum / recentDates.length : 0;

    var trend = '';
    if (todayCount > 0 && avg > 0 && todayCount >= avg * 2) {
        trend = 'hot';
    } else if (recentDates.length >= 3) {
        var last3 = recentDates.slice(-3);
        var prev3 = recentDates.slice(-6, -3);
        var last3Sum = 0, prev3Sum = 0;
        // prev3 may be shorter than 3 if less than 6 days of data
        for (var j = 0; j < last3.length; j++) { last3Sum += d[last3[j]]; }
        for (var k = 0; k < prev3.length; k++) { prev3Sum += d[prev3[k]]; }
        var last3Avg = last3.length > 0 ? last3Sum / last3.length : 0;
        var prev3Avg = prev3.length > 0 ? prev3Sum / prev3.length : 0;
        if (last3Avg > 0 && prev3Avg > 0 && last3Avg >= prev3Avg * 1.5) {
            trend = 'up';
        }
    }

    // 超过 7 天无活动，不显示标签
    if (recentDates.length === 0 && todayCount === 0) {
        trend = '';
    }

    return trend;
}

/* ===== Search Terms Tracking ===== */
function getSearchTerms() {
    try {
        return JSON.parse(localStorage.getItem(SEARCH_TERMS_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveSearchTerms(terms) {
    // 保留前 30 个
    var sorted = Object.keys(terms).sort(function(a, b) { return terms[b] - terms[a]; });
    if (sorted.length > 30) {
        var trimmed = {};
        for (var i = 0; i < 30; i++) {
            trimmed[sorted[i]] = terms[sorted[i]];
        }
        localStorage.setItem(SEARCH_TERMS_KEY, JSON.stringify(trimmed));
    } else {
        localStorage.setItem(SEARCH_TERMS_KEY, JSON.stringify(terms));
    }
}

function recordSearchTerm(term) {
    term = term.trim().toLowerCase();
    if (term.length < 1) return;
    var terms = getSearchTerms();
    terms[term] = (terms[term] || 0) + 1;
    saveSearchTerms(terms);
}

function getHotSearchTerms(maxCount) {
    maxCount = maxCount || 6;
    var terms = getSearchTerms();
    var sorted = Object.keys(terms).sort(function(a, b) { return terms[b] - terms[a]; });
    return sorted.slice(0, maxCount);
}
```

- [ ] **步骤 2：验证无语法错误**

运行：`node -e "var fs=require('fs');var src=fs.readFileSync('js/site.js','utf8');try{new Function(src);console.log('OK')}catch(e){console.log('ERROR:',e.message)}"`（从 calculator-site 目录运行）

预期：输出 `OK`

---

### 任务 2：CSS 样式 - 趋势标签 + 使用次数 + 搜索热词

**文件：**
- 修改：`css/site.css`

- [ ] **步骤 1：在 site.css 末尾追加新样式**

在 `css/site.css` 文件末尾追加以下样式：

```css
/* ===== Trend Badges ===== */
.trend-badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    margin-left: 0.3rem;
    vertical-align: middle;
    line-height: 1.4;
    white-space: nowrap;
}
.trend-hot {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    animation: pulse-hot 2s ease-in-out infinite;
}
.trend-up {
    background: #fff7ed;
    color: #ea580c;
    border: 1px solid #fed7aa;
}
@keyframes pulse-hot {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

/* ===== Usage Count ===== */
.usage-count {
    font-size: 0.75rem;
    color: #94a3b8;
    margin-top: 0.25rem;
    display: block;
}

/* ===== Hot Search ===== */
.hot-search {
    margin: 0.5rem 0 0.75rem 0;
    font-size: 0.8rem;
    color: #64748b;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.3rem;
}
.hot-search-label {
    font-weight: 600;
    color: #475569;
    white-space: nowrap;
}
.hot-search-terms {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}
.hot-search-term {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    background: #f1f5f9;
    border-radius: 999px;
    color: #475569;
    cursor: pointer;
    transition: background 0.15s;
    font-size: 0.8rem;
}
.hot-search-term:hover {
    background: #e2e8f0;
    color: #1e293b;
}
```

- [ ] **步骤 2：验证 CSS 语法**

运行：`node -e "var fs=require('fs');var css=fs.readFileSync('css/site.css','utf8');var braces=css.split('{').length-1;var closeBraces=css.split('}').length-1;console.log('{ =',braces,'} =',closeBraces,braces===closeBraces?'OK':'MISMATCH')"`

预期：`{ = ... } = ... OK`

---

### 任务 3：site.js 渲染函数 + 搜索钩子

**文件：**
- 修改：`js/site.js`

- [ ] **步骤 1：添加趋势标签渲染函数**

在 `/* ===== Click Tracking ===== */` 区域之后（`recordSearchTerm` 函数之后），添加渲染函数：

```javascript
/* ===== Trend & Usage Rendering ===== */
function renderTrendBadges() {
    document.querySelectorAll('.tool-card-wrap').forEach(function(wrap) {
        var likeBtn = wrap.querySelector('[data-like-id]');
        if (!likeBtn) return;
        var toolId = likeBtn.dataset.likeId;
        var trend = getTrendLabel(toolId);
        var h3 = wrap.querySelector('h3');
        if (!h3) return;
        // Remove existing badge
        var oldBadge = h3.querySelector('.trend-badge');
        if (oldBadge) oldBadge.remove();
        if (trend) {
            var badge = document.createElement('span');
            badge.className = 'trend-badge ' + (trend === 'hot' ? 'trend-hot' : 'trend-up');
            badge.textContent = trend === 'hot' ? '🔥 今日热门' : '⬆ 上升中';
            h3.appendChild(badge);
        }
    });
}

function renderUsageCounts() {
    document.querySelectorAll('.tool-card-wrap').forEach(function(wrap) {
        var likeBtn = wrap.querySelector('[data-like-id]');
        if (!likeBtn) return;
        var toolId = likeBtn.dataset.likeId;
        var total = getTotalClicks(toolId);
        // Remove existing usage count
        var existing = wrap.querySelector('.usage-count');
        if (existing) existing.remove();
        if (total > 0) {
            var p = wrap.querySelector('.tool-card p');
            if (p) {
                var uc = document.createElement('span');
                uc.className = 'usage-count';
                uc.textContent = '已使用 ' + total + ' 次';
                p.insertAdjacentElement('afterend', uc);
            }
        }
    });
}
```

- [ ] **步骤 2：添加搜索热词渲染 + 搜索记录钩子**

在 `/* ===== Search ===== */` 区域的 `initSearch` 函数中，在 `searchInput.addEventListener('input', ...)` 之前插入搜索记录逻辑，并在函数末尾添加热词渲染：

找到 `initSearch` 函数中 `searchInput.addEventListener('input',` 这一行，在其上方添加：

```javascript
    // 搜索记录：输入完成（停顿 500ms）后记录
    var searchTimer = null;
    searchInput.addEventListener('input', function() {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            var val = searchInput.value.trim();
            if (val.length >= 2) {
                recordSearchTerm(val);
            }
        }, 500);
    });
```

在 `initSearch` 函数的末尾（`clearBtn.addEventListener` 之后，`initSearch` 闭合之前），添加：

```javascript
    // 渲染搜索热词
    renderHotSearch(searchInput);
```

在 `initSearch` 函数闭合之后，添加独立的 `renderHotSearch` 函数：

```javascript
function renderHotSearch(searchInput) {
    var container = document.querySelector('.hot-search');
    if (!container) return;
    var terms = getHotSearchTerms(6);
    var termsContainer = container.querySelector('.hot-search-terms');
    if (!termsContainer) return;
    if (terms.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = '';
    termsContainer.innerHTML = '';
    for (var i = 0; i < terms.length; i++) {
        var el = document.createElement('span');
        el.className = 'hot-search-term';
        el.textContent = terms[i];
        el.addEventListener('click', function(t) {
            return function() {
                if (searchInput) {
                    searchInput.value = t;
                    searchInput.dispatchEvent(new Event('input'));
                }
            };
        }(terms[i]));
        termsContainer.appendChild(el);
    }
}
```

- [ ] **步骤 3：在 init 中加入趋势渲染**

找到 `document.addEventListener('DOMContentLoaded', function() { ... })` 区域，在 `initClickTracking();` 之后添加：

```javascript
    renderTrendBadges();
    renderUsageCounts();
```

- [ ] **步骤 4：验证无语法错误**

运行：`node -e "var fs=require('fs');var src=fs.readFileSync('js/site.js','utf8');try{new Function(src);console.log('OK')}catch(e){console.log('ERROR:',e.message)}"`

预期：输出 `OK`

---

### 任务 4：index.html 添加热词容器 + 使用次数容器

**文件：**
- 修改：`index.html`
- 修改：`en/index.html`

- [ ] **步骤 1：在 index.html 搜索栏下方添加热词容器**

在 `index.html` 中找到搜索栏 `</div>` 闭合标签（search-bar div 的闭合），在其后紧接插入：

```html
<div class="hot-search" style="display:none;"><span class="hot-search-label">🔥 大家都在搜：</span><span class="hot-search-terms"></span></div>
```

具体位置：在 `<div class="search-bar">...</div>` 的 `</div>` 之后，`<div class="hot-section"` 之前。

- [ ] **步骤 2：在 en/index.html 搜索栏下方添加热词容器**

在 `en/index.html` 中找到搜索栏，在其 `</div>` 闭合标签后插入：

```html
<div class="hot-search" style="display:none;"><span class="hot-search-label">🔥 Trending:</span><span class="hot-search-terms"></span></div>
```

---

### 任务 5：最终验证

**文件：**
- 验证：`index.html`、`js/site.js`、`css/site.css`

- [ ] **步骤 1：综合语法检查**

运行：`node -e "var fs=require('fs');var src=fs.readFileSync('js/site.js','utf8');try{new Function(src);console.log('site.js: OK')}catch(e){console.log('site.js ERROR:',e.message)};var css=fs.readFileSync('css/site.css','utf8');var braces=css.split('{').length-1;var closeBraces=css.split('}').length-1;console.log('css/site.css: '+(braces===closeBraces?'OK':'MISMATCH {='+braces+' }='+closeBraces))"`

预期：`site.js: OK` + `css/site.css: OK`

- [ ] **步骤 2：验证 HTML 结构**

运行：`Select-String "hot-search" index.html` 和 `Select-String "hot-search" en/index.html`

预期：两个文件都有 `.hot-search` 容器
