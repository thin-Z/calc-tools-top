/* ===== Site-wide home/list features (T05 拆分自 js/site.js) =====
 * 首页与列表页专用：SITE_CONFIG / TOOLS_DATA / TOOL_KEYWORDS_ZH / 热门工具 /
 * 点击与搜索追踪 / 分类筛选 / 博客分页 / 搜索热词。
 * 加载范围：首页 / 博客索引页（需在 js/site-core.js 之后加载，复用其 like 访问器）。
 * 依赖：js/site-core.js（getLikes/saveLikes/getTotalLikes）、js/like.js、js/api-client.js。
 */

/* ===== Site-wide features: Config ===== */

const PAGE_SIZE = 8;
const BLOG_PAGINATION_KEY = "blog_page";

const SITE_CONFIG = {
    categories: [
        { id: 'all', label: { zh: '全部', en: 'All' } },
        { id: 'finance', label: { zh: '财务', en: 'Finance' }, icon: 'wallet' },
        { id: 'health', label: { zh: '健康', en: 'Health' }, icon: 'stethoscope' },
        { id: 'life', label: { zh: '生活', en: 'Lifestyle' }, icon: 'home' },
        { id: 'shopping', label: { zh: '购物', en: 'Shopping' }, icon: 'shopping-cart' },
        { id: 'travel', label: { zh: '出行', en: 'Travel' }, icon: 'plane' },
        { id: 'utility', label: { zh: '工具', en: 'Utility' }, icon: 'wrench' },
        { id: 'image', label: { zh: '图片', en: 'Image' }, icon: 'image' },
        { id: 'text', label: { zh: '文字', en: 'Text' }, icon: 'file-text' }
    ],
    tools: [
    /* __GENERATED_SITE_CONFIG_TOOLS_START__ */
        { id: 'mortgage', categories: ["finance"] },
        { id: 'tax2026', categories: ["finance"] },
        { id: 'housing-fund', categories: ["finance"] },
        { id: 'car-loan', categories: ["finance"] },
        { id: 'loan-compare', categories: ["finance"] },
        { id: 'compound-interest', categories: ["finance"] },
        { id: 'overtime', categories: ["finance"] },
        { id: 'percentage-calc', categories: ["shopping","finance"] },
        { id: 'discount', categories: ["shopping","finance"] },
        { id: 'fuel-cost', categories: ["travel","finance"] },
        { id: 'bmi', categories: ["health"] },
        { id: 'ideal-weight', categories: ["health"] },
        { id: 'ovulation', categories: ["health","life"] },
        { id: 'calorie-calculator', categories: ["health"] },
        { id: 'date-calc', categories: ["life"] },
        { id: 'workday-calculator', categories: ["life"] },
        { id: 'age-calc', categories: ["life"] },
        { id: 'electricity', categories: ["life","finance"] },
        { id: 'unit-converter', categories: ["utility"] },
        { id: 'password-strength', categories: ["utility"] },
        { id: 'qr-generator', categories: ["utility"] },
        { id: 'password-gen', categories: ["utility"] },
        { id: 'random-gen', categories: ["utility"] },
        { id: 'compress', categories: ["image"] },
        { id: 'convert', categories: ["image"] },
        { id: 'resize', categories: ["image"] },
        { id: 'base64', categories: ["image"] },
        { id: 'color-picker', categories: ["image"] },
        { id: 'image-crop', categories: ["image"] },
        { id: 'color-contrast', categories: ["image"] },
        { id: 'case-converter', categories: ["text"] },
        { id: 'json-formatter', categories: ["text"] },
        { id: 'base64-encode', categories: ["text"] },
        { id: 'url-encode', categories: ["text"] },
        { id: 'text-cleaner', categories: ["text"] },
        { id: 'html-stripper', categories: ["text"] },
        { id: 'text-diff', categories: ["text"] },
        { id: 'uuid-generator', categories: ["text"] },
        { id: 'reading-time', categories: ["text"] },
        { id: 'keyword-density', categories: ["text"] },
        { id: 'word-counter', categories: ["text"] },
        { id: 'regex-tester', categories: ["text"] },
        { id: 'markdown-preview', categories: ["text"] },
        { id: 'timestamp', categories: ["utility"] },
        { id: 'pregnancy', categories: ["health"] },
        { id: 'dca-calculator', categories: ["finance"] },
        { id: 'fraction-calculator', categories: ["utility"] },
        { id: 'currency-converter', categories: ["travel","finance"] },
        { id: 'simplified-traditional', categories: ["text"] }
/* __GENERATED_SITE_CONFIG_TOOLS_END__ */
    ]
};

/* ===== Click Tracking ===== */
const CLICK_STORAGE_KEY = 'toolbox_clicks';
const SEARCH_TERMS_KEY = 'toolbox_search_terms';
const RECENT_KEY = 'toolbox_recent';   // 最近使用的工具（slug 去重，最新优先，最多 RECENT_MAX 个）
const RECENT_MAX = 8;

function updateClickUI(toolId, total) {
    // Update usage-count in regular tool cards only
    document.querySelectorAll('.tool-card-wrap [data-like-id="' + toolId + '"]').forEach(function(el) {
        const wrap = el.closest('.tool-card-wrap');
        if (!wrap) return;
        const uc = wrap.querySelector('.usage-count');
        if (uc) {
            uc.textContent = total;
        }
        if (total > 0 && !uc) {
            const newUc = document.createElement('span');
            newUc.className = 'usage-count';
            newUc.textContent = total;
            el.insertAdjacentElement('afterend', newUc);
        }
    });
    // Clean up any leaked usage-count inside hot-tool-card
    document.querySelectorAll('.hot-tool-card .usage-count').forEach(function(el) {
        el.remove();
    });
}

/* Tool/blog like buttons are initialized by js/like.js (window.LikeSystem.initLikes /
 * initArticleLikes), which auto-boots on DOMContentLoaded + pageshow. Do NOT re-init here. */

function getClicks() {
    try {
        const raw = JSON.parse(localStorage.getItem(CLICK_STORAGE_KEY)) || {};
        // 迁移旧格式：{toolId: number} → {toolId: {total, daily}}
        let migrated = false;
        for (const id in raw) {
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
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function incrementClick(toolId) {
    const clicks = getClicks();
    if (!clicks[toolId]) {
        clicks[toolId] = { total: 0, daily: {} };
    }
    clicks[toolId].total = (clicks[toolId].total || 0) + 1;
    const today = getTodayStr();
    if (!clicks[toolId].daily) clicks[toolId].daily = {};
    clicks[toolId].daily[today] = (clicks[toolId].daily[today] || 0) + 1;
    saveClicks(clicks);
    recordRecent(toolId);
    // Async sync to server (fire-and-forget)
    if (typeof window.ApiClient !== 'undefined') {
        window.ApiClient.post('/api/clicks', { toolId: toolId }).then(function(data) {
            if (data && typeof data.total === 'number') {
                updateClickUI(toolId, data.total);
                _globalClickTotals[toolId] = data.total;
            }
            // Re-sort tool grids after click data updates
            initToolSort();
        });
    } else {
        // No server available, still re-sort based on local data
        setTimeout(function() { initToolSort(); }, 50);
    }
}

function getRecent() {
    try {
        const r = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
        return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
}

function recordRecent(toolId) {
    if (!toolId) return;
    let r = getRecent().filter(function(s) { return s !== toolId; });
    r.unshift(toolId);
    if (r.length > RECENT_MAX) r = r.slice(0, RECENT_MAX);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(r)); } catch (e) {}
}

function toolCardUrl(id) {
    // 复用首页静态工具卡的真实 URL（扩展名去除），避免手写 dir 映射。
    // a.tool-card 本身无 data-like-id，需从 like-btn → .tool-card-wrap → a.tool-card 定位。
    const likeBtn = document.querySelector('.tool-grid [data-like-id="' + id + '"]');
    const wrap = likeBtn ? likeBtn.closest('.tool-card-wrap, .hot-tool-card') : null;
    const card = wrap ? wrap.querySelector('a.tool-card') : null;
    return card ? card.getAttribute('href') : '';
}

function renderRecent() {
    const sec = document.getElementById('recent-tools');
    const grid = document.getElementById('recent-tools-grid');
    if (!sec || !grid) return;
    const recent = getRecent().filter(function(id) { return TOOLS_DATA[id]; });
    if (!recent.length) { sec.classList.add('hidden'); grid.textContent = ''; return; }
    const lang = document.documentElement.lang === 'en' ? 'en' : 'zh';
    grid.textContent = '';
    recent.forEach(function(id) {
        const url = toolCardUrl(id);
        if (!url) return;
        const t = TOOLS_DATA[id];
        const name = t.name[lang] || t.name['zh'];
        const a = document.createElement('a');
        a.href = url;
        a.className = 'recent-tool';
        a.textContent = name;
        grid.appendChild(a);
    });
    sec.classList.remove('hidden');
}

function getDailyClicks(toolId) {
    const clicks = getClicks();
    const d = clicks[toolId] ? (clicks[toolId].daily || {}) : {};
    return d;
}

function getTodayClickCount(toolId) {
    const daily = getDailyClicks(toolId);
    return daily[getTodayStr()] || 0;
}

function getTotalClicks(toolId) {
    const clicks = getClicks();
    return clicks[toolId] ? (clicks[toolId].total || 0) : 0;
}

function getTrendLabel(toolId) {
    const clicks = getClicks();
    const d = clicks[toolId] ? (clicks[toolId].daily || {}) : {};
    const today = getTodayStr();
    const todayCount = d[today] || 0;

    // 计算日均点击（过去 7 天，排除今天）
    const dates = Object.keys(d).filter(function(k) { return k !== today; }).sort();
    const recentDates = dates.slice(-7);
    let sum = 0;
    for (let i = 0; i < recentDates.length; i++) { sum += d[recentDates[i]]; }
    const avg = recentDates.length > 0 ? sum / recentDates.length : 0;

    let trend = '';
    if (todayCount > 0 && avg > 0 && todayCount >= avg * 2) {
        trend = 'hot';
    } else if (recentDates.length >= 3) {
        const last3 = recentDates.slice(-3);
        const prev3 = recentDates.slice(-6, -3);
        let last3Sum = 0, prev3Sum = 0;
        for (let j = 0; j < last3.length; j++) { last3Sum += d[last3[j]]; }
        for (let k = 0; k < prev3.length; k++) { prev3Sum += d[prev3[k]]; }
        const last3Avg = last3.length > 0 ? last3Sum / last3.length : 0;
        const prev3Avg = prev3.length > 0 ? prev3Sum / prev3.length : 0;
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
    const sorted = Object.keys(terms).sort(function(a, b) { return terms[b] - terms[a]; });
    if (sorted.length > 30) {
        const trimmed = {};
        for (let i = 0; i < 30; i++) {
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
    const terms = getSearchTerms();
    terms[term] = (terms[term] || 0) + 1;
    saveSearchTerms(terms);
}

function getHotSearchTerms(maxCount) {
    maxCount = maxCount || 6;
    const terms = getSearchTerms();
    const sorted = Object.keys(terms).sort(function(a, b) { return terms[b] - terms[a]; });
    return sorted.slice(0, maxCount);
}

/* ===== Trend & Usage Rendering ===== */
function renderTrendBadges() {
    document.querySelectorAll('.tool-card-wrap').forEach(function(wrap) {
        const likeBtn = wrap.querySelector('[data-like-id]');
        if (!likeBtn) return;
        const toolId = likeBtn.dataset.likeId;
        const trend = getTrendLabel(toolId);
        const h3 = wrap.querySelector('h3');
        if (!h3) return;
        const oldBadge = h3.querySelector('.trend-badge');
        if (oldBadge) oldBadge.remove();
        if (trend) {
            const badge = document.createElement('span');
            badge.className = 'trend-badge ' + (trend === 'hot' ? 'trend-hot' : 'trend-up');
            badge.textContent = trend === 'hot' ? '今日热门' : '上升中';
            h3.appendChild(badge);
        }
    });
}

function renderUsageCounts() {
    document.querySelectorAll('.tool-card-wrap').forEach(function(wrap) {
        const likeBtn = wrap.querySelector('.like-btn');
        if (!likeBtn) return;
        const toolId = likeBtn.dataset.likeId;
        const total = getTotalClicks(toolId);
        const existing = wrap.querySelector('.usage-count');
        if (existing) existing.remove();
        if (total > 0) {
            const uc = document.createElement('span');
            uc.className = 'usage-count';
            uc.textContent = total;
            likeBtn.insertAdjacentElement('afterend', uc);
        }
    });
}
function fetchServerClickCounts() {
    if (typeof window.ApiClient === 'undefined') return;
    if (typeof window.ApiClient.fetchClicksBulk === 'function') {
        // 批量拉取：单请求取全部卡片点击量，替代逐卡片 GET（规避 46 并发 + KV 配额消耗）
        const ids = [];
        document.querySelectorAll('[data-like-id]').forEach(function(el) {
            const toolId = el.getAttribute('data-like-id');
            if (toolId && ids.indexOf(toolId) === -1) ids.push(toolId);
        });
        if (!ids.length) return;
        window.ApiClient.fetchClicksBulk(ids).then(function(data) {
            const map = (data && data.tools) || {};
            ids.forEach(function(toolId) {
                if (typeof map[toolId] === 'number') updateClickUI(toolId, map[toolId]);
            });
        });
        return;
    }
    // 回退：无批量能力时逐个拉取
    document.querySelectorAll('[data-like-id]').forEach(function(el) {
        const toolId = el.getAttribute('data-like-id');
        if (!toolId) return;
        window.ApiClient.get('/api/clicks?toolId=' + encodeURIComponent(toolId)).then(function(data) {
            if (data && typeof data.total === 'number') {
                updateClickUI(toolId, data.total);
            }
        });
    });
}

function updateClickDisplay() {
    renderTrendBadges();
    renderUsageCounts();
    fetchServerClickCounts();
}

function initClickTracking() {
    updateClickDisplay();
    document.querySelectorAll('.tool-card:not([data-click-bound])').forEach(function(card) {
        card.setAttribute('data-click-bound', 'true');
        card.addEventListener('click', function() {
            const wrap = this.closest('.tool-card-wrap, .hot-tool-card');
            if (wrap) {
                const likeBtn = wrap.querySelector('[data-like-id]');
                if (likeBtn) {
                    incrementClick(likeBtn.dataset.likeId);
                    return;
                }
            }
            const href = this.getAttribute('href') || '';
            const match = href.match(/\/([^\/]+)\.html/);
            if (match) {
                incrementClick(match[1]);
            }
        });
    });
}

/* ===== Category Filter ===== */
function initCategoryFilters() {
    // Check URL query param first (e.g. ?cat=health from article detail pages)
    const urlParams = new URLSearchParams(window.location.search);
    const urlCat = urlParams.get('cat');
    if (urlCat) {
        sessionStorage.setItem('preselectCategory', urlCat);
        // Clean URL without reload（保留其它参数如 ?q=）
        const params = new URLSearchParams(window.location.search);
        params.delete('cat');
        const qs = params.toString();
        const cleanUrl = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
        history.replaceState(null, '', cleanUrl);
    }

    const preselect = sessionStorage.getItem("preselectCategory");
    if (preselect) {
        sessionStorage.removeItem("preselectCategory");
        setTimeout(function() {
            // 白名单校验：仅当 preselect 是页面已有分类时才触发，防选择器注入/非法值
            const validCategories = Array.prototype.map.call(
                document.querySelectorAll('.category-chip'),
                function (ch) { return ch.getAttribute('data-category'); }
            );
            if (validCategories.indexOf(preselect) === -1) return;
            const chip = document.querySelector(".category-chip[data-category=\"" + preselect + "\"]");
            if (chip) chip.click();
        }, 100);
    }
    const chips = document.querySelectorAll('.category-chip');

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            const cat = chip.dataset.category;
            // Update active state
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            // Filter tools and articles
            filterTools(cat);
        });
    });
}

/* ===== Filter tools and articles by category (delegates to unified applyFilters) ===== */
function filterTools(category) {
    // 当前分类已在 chip 点击处更新为 active；applyFilters 统一处理 搜索 ∩ 分类
    applyFilters();
}

function applyFilteredPagination(category, articles) {
    // 仅对"未被分类/搜索过滤"的文章做分页（.filtered-out 已编码 分类∩搜索 结果）
    const visibleItems = [];
    articles.forEach(function(article) {
        if (article.classList.contains("filtered-out")) return;
        visibleItems.push(article);
    });

    const section = document.querySelector(".homepage-article-list, .article-list");
    if (!section) return;
    let wrap = section.parentNode.querySelector(".load-more-wrap");
    let btn = wrap ? wrap.querySelector(".load-more-btn") : null;

    if (visibleItems.length <= PAGE_SIZE) {
        // 全部可在一页显示：清除分页内联隐藏，隐藏"加载更多"
        visibleItems.forEach(function(item) { item.style.display = ""; });
        if (wrap) wrap.style.display = "none";
        return;
    }

    // Build or reuse load-more button
    if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "load-more-wrap"; // 样式由 css/style.css .load-more-wrap 提供（CSP 无内联 style）
        btn = document.createElement("button");
        btn.className = "load-more-btn";
        section.parentNode.insertBefore(wrap, section.nextSibling);
        wrap.appendChild(btn);
    }
    wrap.style.display = "";

    // 先全部隐藏，再按页展示（仅在可见集合内）
    visibleItems.forEach(function(item, i) {
        item.style.display = (i < PAGE_SIZE) ? "" : "none";
    });

    const remaining = visibleItems.length - PAGE_SIZE;
    btn.textContent = "加载更多 (" + remaining + " 篇)";
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";

    // Replace click handler (remove old, add new)
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener("click", function() {
        let shown = 0;
        visibleItems.forEach(function(item) {
            if (item.style.display !== "none") shown++;
        });
        const toShow = Math.min(PAGE_SIZE, visibleItems.length - shown);
        for (let i = shown; i < shown + toShow && i < visibleItems.length; i++) {
            visibleItems[i].style.display = "";
        }
        shown += toShow;
        const rem = visibleItems.length - shown;
        if (rem > 0) {
            newBtn.textContent = "加载更多 (" + rem + " 篇)";
        } else {
            newBtn.textContent = "已显示全部文章";
            newBtn.disabled = true;
            newBtn.style.opacity = "0.65";
            newBtn.style.cursor = "default";
        }
    });
}

/* __GENERATED_TOOLS_DATA_START__ */
const TOOLS_DATA = {
    mortgage: { icon: 'home', name: { zh: '房贷计算器', en: 'Mortgage Calculator' }, desc: { zh: '等额本息+等额本金，支持商业/公积金组合贷款', en: 'Equal payment + principal, supports commercial + housing fund loans' } },
    tax2026: { icon: 'receipt-text', name: { zh: '个税计算器', en: 'Tax Calculator 2026' }, desc: { zh: '2026最新个税税率，一键计算税后收入', en: 'Latest 2026 tax rates, calculate after-tax income' } },
    'housing-fund': { icon: 'piggy-bank', name: { zh: '公积金计算器', en: 'Housing Fund Calculator' }, desc: { zh: '公积金贷款额度与利率计算，支持最新政策', en: 'Housing fund loan amount + rate calculation' } },
    'car-loan': { icon: 'car', name: { zh: '车贷计算器', en: 'Car Loan Calculator' }, desc: { zh: '车贷月供与利息计算', en: 'Car loan monthly payment + interest' } },
    'loan-compare': { icon: 'scale', name: { zh: '贷款对比计算器', en: 'Loan Comparison' }, desc: { zh: '多种贷款方案利率对比', en: 'Compare multiple loan plans side by side' } },
    'compound-interest': { icon: 'trending-up', name: { zh: '复利计算器', en: 'Compound Interest' }, desc: { zh: '复利收益与投资增长计算', en: 'Calculate compound interest growth' } },
    overtime: { icon: 'clock', name: { zh: '加班费计算器', en: 'Overtime Calculator' }, desc: { zh: '加班工资计算，劳动法标准', en: 'Overtime pay calculation per labor law' } },
    'percentage-calc': { icon: 'percent', name: { zh: '百分比计算器', en: 'Percentage Calculator' }, desc: { zh: '百分比计算/增减/变化多种模式', en: 'Percentage calc, increase, decrease, change' } },
    discount: { icon: 'tag', name: { zh: '折扣计算器', en: 'Discount Calculator' }, desc: { zh: '计算折扣后价格与节省金额', en: 'Calculate discounted price and savings' } },
    'fuel-cost': { icon: 'fuel', name: { zh: '油耗计算器', en: 'Fuel Cost Calculator' }, desc: { zh: '油费与每公里成本计算', en: 'Fuel cost per kilometer calculation' } },
    bmi: { icon: 'scale', name: { zh: 'BMI 计算器', en: 'BMI Calculator' }, desc: { zh: '根据身高体重计算身体质量指数', en: 'Calculate BMI from height and weight' } },
    'ideal-weight': { icon: 'target', name: { zh: '标准体重计算器', en: 'Ideal Weight Calculator' }, desc: { zh: '标准体重对照与BMI参考', en: 'Standard weight reference + BMI guide' } },
    ovulation: { icon: 'flower', name: { zh: '排卵期计算器', en: 'Ovulation Calculator' }, desc: { zh: '排卵期与安全期推算', en: 'Ovulation + safe period tracker' } },
    'calorie-calculator': { icon: 'flame', name: { zh: '卡路里计算器', en: 'Calorie Calculator' }, desc: { zh: '按身高体重年龄性别计算每日所需热量', en: 'Calculate daily calorie needs by height, weight, age and gender' } },
    'date-calc': { icon: 'calendar', name: { zh: '日期计算器', en: 'Date Calculator' }, desc: { zh: '计算日期差/推算目标日期/工作日', en: 'Date difference, target date, workday calc' } },
    'workday-calculator': { icon: 'briefcase', name: { zh: '工作日计算器', en: 'Workday Calculator' }, desc: { zh: '计算两个日期之间的工作日天数，可选排除节假日', en: 'Count workdays between two dates, optionally excluding holidays' } },
    'age-calc': { icon: 'cake', name: { zh: '年龄计算器', en: 'Age Calculator' }, desc: { zh: '周岁/生肖/生日精确计算', en: 'Exact age calculation including zodiac' } },
    electricity: { icon: 'lightbulb', name: { zh: '电费计算器', en: 'Electricity Calculator' }, desc: { zh: '电费与用电量精确计算', en: 'Calculate electricity bill and usage' } },
    'unit-converter': { icon: 'ruler', name: { zh: '单位换算器', en: 'Unit Converter' }, desc: { zh: '长度/重量/温度等常用单位换算', en: 'Length/weight/temperature converter' } },
    'password-strength': { icon: 'shield', name: { zh: '密码强度检测器', en: 'Password Strength Checker' }, desc: { zh: '实时检测密码安全性并给出改进建议', en: 'Test password security with improvement tips' } },
    'qr-generator': { icon: 'qr-code', name: { zh: '二维码生成器', en: 'QR Code Generator' }, desc: { zh: '文字或链接快速生成二维码，下载PNG', en: 'Generate QR codes from text/URL, download as PNG' } },
    'password-gen': { icon: 'key-round', name: { zh: '密码生成器', en: 'Password Generator' }, desc: { zh: '自定义字符类型生成高强度密码', en: 'Generate strong passwords with custom options' } },
    'random-gen': { icon: 'dice-5', name: { zh: '随机数生成器', en: 'Random Number Generator' }, desc: { zh: '自定义范围生成随机整数', en: 'Generate random integers in custom range' } },
    compress: { icon: 'minimize-2', name: { zh: '图片压缩', en: 'Image Compress' }, desc: { zh: '压缩图片大小，本地处理不上传', en: 'Compress images locally without upload' } },
    convert: { icon: 'repeat', name: { zh: '格式转换', en: 'Format Convert' }, desc: { zh: 'JPG/PNG/WebP格式互转', en: 'Convert between JPG/PNG/WebP' } },
    resize: { icon: 'scaling', name: { zh: '裁剪缩放', en: 'Resize & Crop' }, desc: { zh: '调整图片尺寸，保持宽高比', en: 'Resize and crop images' } },
    base64: { icon: 'binary', name: { zh: '图片转Base64', en: 'Image to Base64' }, desc: { zh: '图片转Base64编码嵌入', en: 'Convert image to Base64 embedding' } },
    'color-picker': { icon: 'palette', name: { zh: '图片取色器', en: 'Color Picker' }, desc: { zh: '提取图片中的颜色值', en: 'Pick colors from images' } },
    'image-crop': { icon: 'crop', name: { zh: '图片裁剪', en: 'Image Cropper' }, desc: { zh: '拖拽裁剪图片，比例锁定，下载 PNG/JPEG', en: 'Drag to crop images with aspect lock, download PNG/JPEG' } },
    'color-contrast': { icon: 'contrast', name: { zh: '颜色对比度检查器', en: 'Color Contrast Checker' }, desc: { zh: 'WCAG AA/AAA 对比度在线检测', en: 'Check WCAG AA/AAA contrast ratio online' } },
    'case-converter': { icon: 'type', name: { zh: '大小写转换', en: 'Case Converter' }, desc: { zh: '全半角/大小写字母转换', en: 'Convert between upper/lower case' } },
    'json-formatter': { icon: 'braces', name: { zh: 'JSON 格式化', en: 'JSON Formatter' }, desc: { zh: '格式化/压缩/校验JSON数据', en: 'Format, compress and validate JSON' } },
    'base64-encode': { icon: 'lock', name: { zh: 'Base64 编解码', en: 'Base64 Encode/Decode' }, desc: { zh: '文本与Base64互转', en: 'Encode and decode Base64 text' } },
    'url-encode': { icon: 'link', name: { zh: 'URL 编解码', en: 'URL Encode/Decode' }, desc: { zh: 'URL编码与解码', en: 'Encode and decode URLs' } },
    'text-cleaner': { icon: 'broom', name: { zh: '文本清理', en: 'Text Cleaner' }, desc: { zh: '清理多余空格和换行', en: 'Clean extra spaces and line breaks' } },
    'html-stripper': { icon: 'scissors', name: { zh: 'HTML 剥离', en: 'HTML Stripper' }, desc: { zh: '移除文本中的HTML标签', en: 'Strip HTML tags from text' } },
    'text-diff': { icon: 'file-diff', name: { zh: '文本对比', en: 'Text Diff' }, desc: { zh: '对比两段文本差异', en: 'Compare two texts for differences' } },
    'uuid-generator': { icon: 'id-card', name: { zh: 'UUID 生成', en: 'UUID Generator' }, desc: { zh: '生成UUID唯一标识符', en: 'Generate UUID identifiers' } },
    'reading-time': { icon: 'book-open', name: { zh: '阅读时间', en: 'Reading Time' }, desc: { zh: '估算文章阅读时长', en: 'Estimate text reading time' } },
    'keyword-density': { icon: 'hash', name: { zh: '关键词密度', en: 'Keyword Density' }, desc: { zh: '分析文章关键词密度', en: 'Analyze keyword density in text' } },
    'word-counter': { icon: 'align-left', name: { zh: '字数统计', en: 'Word Counter' }, desc: { zh: '统计字符/字数/段落', en: 'Count characters/words/paragraphs' } },
    'regex-tester': { icon: 'regex', name: { zh: '正则表达式测试器', en: 'Regex Tester' }, desc: { zh: '实时匹配高亮与捕获组解析', en: 'Real-time match highlight and group parsing' } },
    'markdown-preview': { icon: 'file-text', name: { zh: 'Markdown 预览器', en: 'Markdown Preview' }, desc: { zh: '实时预览 Markdown 渲染结果', en: 'Live Markdown rendering preview' } },
    timestamp: { icon: 'history', name: { zh: '时间戳转换', en: 'Timestamp Converter' }, desc: { zh: 'Unix 时间戳与日期时间互转，支持秒/毫秒与本地/UTC', en: 'Convert Unix timestamps to dates and back, with seconds/milliseconds and local/UTC' } },
    pregnancy: { icon: 'baby', name: { zh: '孕期计算器', en: 'Pregnancy Calculator' }, desc: { zh: '按末次月经/受孕日推算预产期与孕周', en: 'Estimate due date and gestational week from LMP or conception' } },
    'dca-calculator': { icon: 'line-chart', name: { zh: '定投计算器', en: 'DCA Calculator' }, desc: { zh: '定期定额投资收益与复利增长计算', en: 'Calculate future value of regular periodic investments' } },
    'fraction-calculator': { icon: 'divide', name: { zh: '分数计算器', en: 'Fraction Calculator' }, desc: { zh: '分数的加减乘除与最简化', en: 'Add, subtract, multiply and divide fractions and simplify' } },
    'currency-converter': { icon: 'coins', name: { zh: '汇率换算器', en: 'Currency Converter' }, desc: { zh: '常见货币参考汇率，任意两种货币实时互换', en: 'Convert between major currencies with reference rates' } },
    'simplified-traditional': { icon: 'languages', name: { zh: '简繁转换', en: 'Simplified-Traditional Converter' }, desc: { zh: '简体中文与繁体中文互转，常用字对照', en: 'Convert between simplified and traditional Chinese' } }
};
/* __GENERATED_TOOLS_DATA_END__ */
/* __GENERATED_TOOL_KEYWORDS_START__ */
const TOOL_KEYWORDS_ZH = {
    mortgage: '房贷,贷款,按揭,买房,月供,利息,商业贷款,公积金贷款',
    tax2026: '个税,个人所得税,税率,工资,扣税,2026',
    'housing-fund': '公积金,住房公积金,贷款,利率',
    'car-loan': '车贷,买车,汽车贷款,月供',
    'loan-compare': '贷款对比,贷款方案,利率对比',
    'compound-interest': '复利,投资,理财,收益计算',
    overtime: '加班费,加班工资,加班,劳动法',
    'percentage-calc': '百分比,百分数,百分比计算,百分率,百分号计算',
    discount: '折扣,打折,优惠,省钱,降价',
    'fuel-cost': '油耗,油费,加油,每公里成本',
    bmi: 'bmi,体重,身高,肥胖,超重,身体质量指数',
    'ideal-weight': '标准体重,理想体重,减肥,健康体重',
    ovulation: '排卵期,安全期,生理期,备孕',
    'calorie-calculator': '卡路里,热量,每日热量,基础代谢,饮食,热量计算',
    'date-calc': '日期,天数,工作日,日期差,日期推算',
    'workday-calculator': '工作日,工作日计算,工作天数,排除节假日,工作日天数',
    'age-calc': '年龄,周岁,生肖,生日',
    electricity: '电费,用电量,电价,电表',
    'unit-converter': '单位换算,长度换算,重量换算,温度换算,转换',
    'password-strength': '密码强度,密码安全,强密码检测,密码检测,密码评分',
    'qr-generator': '二维码,二维码生成器,qrcode,二维码制作,二维码在线',
    'password-gen': '密码生成器,随机密码,强密码,密码生成,密码工具',
    'random-gen': '随机数,随机数生成,随机数字,抽奖随机,摇号',
    compress: '图片压缩,压缩图片,减小图片,压缩',
    convert: '格式转换,图片格式,jpg,png,webp',
    resize: '裁剪,缩放,调整大小,图片尺寸',
    base64: 'base64,图片编码,图片转码',
    'color-picker': '取色器,颜色提取,拾色器,颜色选择',
    'image-crop': '图片裁剪,裁剪图片,图片编辑,剪切图片,crop,图片裁剪工具',
    'color-contrast': '颜色对比度,对比度检查,wcag,无障碍,aa,aaa,配色,前景色,背景色',
    'case-converter': '大小写转换,大写,小写,首字母大写',
    'json-formatter': 'json格式化,json压缩,json校验,json',
    'base64-encode': 'base64编解码,base64加密,base64',
    'url-encode': 'url编码,url解码,网址编码',
    'text-cleaner': '文本清理,去除空格,清理文本,空白字符',
    'html-stripper': 'html剥离,去除html,提取文本',
    'text-diff': '文本对比,文本差异,比较文本',
    'uuid-generator': 'uuid生成,唯一标识符,随机id',
    'reading-time': '阅读时间,文章阅读,阅读速度',
    'keyword-density': '关键词密度,关键词频率,seo分析',
    'word-counter': '字数统计,字数,字符数,文章统计',
    'regex-tester': '正则表达式,正则测试,正则匹配,regex,正则高亮,捕获组',
    'markdown-preview': 'markdown,markdown预览,md转html,markdown编辑器,markdown在线',
    timestamp: '时间戳,时间戳转换,unix时间戳,时间戳计算,时间戳转日期,日期转时间戳',
    pregnancy: '孕期,孕期计算器,预产期,孕周,怀孕,末次月经,受孕日',
    'dca-calculator': '定投,定投计算器,基金定投,定期投资,复利,收益计算',
    'fraction-calculator': '分数计算器,分数,分数加减乘除,最简分数,通分',
    'currency-converter': '汇率,汇率换算,汇率计算器,货币换算,外币兑换,汇率转换',
    'simplified-traditional': '简繁转换,繁体转换,简体转繁体,繁体转简体,汉字转换'
};
/* __GENERATED_TOOL_KEYWORDS_END__ */

// Default hot tools for new visitors
const DEFAULT_HOT_TOOLS = ['mortgage', 'bmi', 'tax2026', 'color-picker', 'discount', 'unit-converter', 'word-counter', 'json-formatter'];

const _globalClickTotals = {};
// 全局点击量缓存：sessionStorage 10 分钟，避免每次刷新/bfcache 恢复都重新拉取
const CLICKS_CACHE_KEY = 'toolbox_global_clicks_cache';
const CLICKS_CACHE_TTL = 10 * 60 * 1000;

function readClicksCache() {
    try {
        const raw = sessionStorage.getItem(CLICKS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.expires || Date.now() > parsed.expires) return null;
        return parsed.data || null;
    } catch (e) { return null; }
}

function writeClicksCache(data) {
    try {
        sessionStorage.setItem(CLICKS_CACHE_KEY, JSON.stringify({
            expires: Date.now() + CLICKS_CACHE_TTL,
            data: data,
        }));
    } catch (e) {}
}

function fetchAndMergeGlobalClicks(callback) {
    if (typeof window.ApiClient === 'undefined' || typeof window.ApiClient.fetchClicksBulk !== 'function') {
        if (callback) callback();
        return;
    }
    const ids = Object.keys(TOOLS_DATA);
    if (!ids.length) { if (callback) callback(); return; }

    // 缓存命中：直接合并计数并回调（不发起网络请求，杜绝 46 并发拉取）
    const cached = readClicksCache();
    if (cached) {
        Object.keys(cached).forEach(function (id) { _globalClickTotals[id] = cached[id]; });
        if (callback) callback();
        return;
    }

    // 单次批量请求替代 46 个并发 GET（KV 调用从 ~138 次降至 1 次，规避 120/min 读限速 429）
    window.ApiClient.fetchClicksBulk(ids).then(function (data) {
        const map = (data && data.tools) || {};
        Object.keys(map).forEach(function (id) { _globalClickTotals[id] = map[id]; });
        writeClicksCache(map);
        if (callback) callback();
    }).catch(function () {
        if (callback) callback();
    });
}

function initHotTools() {
    const grid = document.getElementById('hotToolsGrid');
    const container = document.getElementById('hotToolsContainer');
    if (!grid || !container) return;
    
    const likes = getLikes();
    const clicks = getClicks();
    const searchTerms = getSearchTerms();
    
    // Composite scoring: likes × 3 + clicks × 1 + search × 2
    const allToolIds = Object.keys(TOOLS_DATA);
    const scored = [];
    allToolIds.forEach(function(id) {
        let score = 0;
        score += (likes[id] || 0) * 3;
        const clickData = clicks[id];
        if (clickData) score += clickData.total || 0;
        const toolName = TOOLS_DATA[id].name['zh'].toLowerCase();
        Object.keys(searchTerms).forEach(function(term) {
            if (toolName.includes(term)) score += (searchTerms[term] || 0) * 2;
        });
        scored.push({ id: id, score: score });
    });
    // Use global click count (if available) for scoring
    const hasUserData = Object.keys(likes).length > 0 || Object.keys(clicks).length > 0;
    let selected;
    if (!hasUserData && Object.keys(_globalClickTotals).length === 0) {
        // New user with no data: use defaults
        selected = DEFAULT_HOT_TOOLS.slice(0, 8).map(function(id) {
            return TOOLS_DATA[id] ? { id: id, score: 0 } : null;
        }).filter(Boolean);
    } else {
        // Re-score with global click data merged
        const rescored = [];
        allToolIds.forEach(function(id) {
            let s = (likes[id] || 0) * 3;
            const localC = clicks[id] ? (clicks[id].total || 0) : 0;
            const globalC = _globalClickTotals[id] || 0;
            s += Math.max(localC, globalC);
            const toolName = TOOLS_DATA[id].name['zh'].toLowerCase();
            Object.keys(searchTerms).forEach(function(term) {
                if (toolName.includes(term)) s += (searchTerms[term] || 0) * 2;
            });
            rescored.push({ id: id, score: s });
        });
        rescored.sort(function(a, b) { return b.score - a.score; });
        selected = rescored.slice(0, 8);
    }
    
    if (selected.length === 0) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    container.style.display = '';
    
    const lang = getLang ? getLang() : 'zh';
    const isZh = lang === 'zh';
    const prefix = isZh ? '/zh/' : '/en/';
    
    const catTexts = isZh
        ? { finance: '财务', health: '健康', life: '生活', shopping: '购物', travel: '出行', utility: '工具', image: '图片', text: '文字' }
        : { finance: 'Finance', health: 'Health', life: 'Lifestyle', shopping: 'Shopping', travel: 'Travel', utility: 'Utility', image: 'Image', text: 'Text' };
    
    let html = '';
    selected.forEach(function(entry, idx) {
        const tool = TOOLS_DATA[entry.id];
        const name = tool.name[lang] || tool.name['zh'];
        const toolConfig = SITE_CONFIG.tools.find(function(t) { return t.id === entry.id; });
        const cats = toolConfig ? toolConfig.categories : [];
        const firstCat = cats[0] || 'utility';
        
        const todayClicks = getTodayClickCount(entry.id);
        const totalClicks = getTotalClicks(entry.id);
        let trendBadge = '';
        if (todayClicks >= 3) {
            trendBadge = '<span class="trend-badge trend-hot">今日热门</span>';
        } else if (todayClicks >= 1 && totalClicks > 0) {
            trendBadge = '<span class="trend-badge trend-up">今日使用</span>';
        }
        
        html += '<div class="hot-tool-card">'
            + '<div class="hot-badge">#' + (idx + 1) + '</div>'
            + '<span class="hot-score">' + entry.score + '</span>'
            + '<a href="' + prefix + entry.id + '.html" class="tool-card" data-like-id="' + entry.id + '" data-category="' + cats.join(',') + '" data-keywords-zh="' + (TOOL_KEYWORDS_ZH[entry.id] || '') + '">'
            + '<div class="icon icon-' + firstCat + '"><svg class="ic" aria-hidden="true"><use href="#icon-' + tool.icon + '"></use></svg></div>'
            + '<h3>' + name + ' ' + trendBadge + '</h3>'
            + '<p>' + (tool.desc ? (tool.desc[lang] || tool.desc['zh']) : '') + '</p>'
            + '</a>'
            + '<div class="tool-tags">' + cats.map(function(c) {
                return '<a href="' + (isZh ? '/tags/' : '/en/tags/') + c + '.html" class="tag tag-' + c + '" data-tag="' + c + '">' + (catTexts[c] || c) + '</a>';
            }).join('') + '</div>'
            + '</div>';
    });

    // P1-2：首页已静态预渲染默认热门工具卡。为避免全局点击数据异步加载后动态重排序/重建
    // 造成 CLS 波动，只要网格已被静态填充就**不再重建**（热门工具稳定为预渲染的默认集，
    // 点击/点赞/跳转仍可交互，仅排名不随全局计数实时变化）。
    if (!(grid.children.length > 0)) {
      grid.innerHTML = html;
    } else {
      // 静态卡已存在：遍历每张已有卡片，按各卡 data-like-id 的真实得分更新 .hot-score，
      // 不重建 DOM（保留 CLS 防抖意图，仅分数随全局数据更新，而非只更新 top8）。
      grid.querySelectorAll('.hot-tool-card').forEach(function(hotCard) {
        const cardEl = hotCard.querySelector('[data-like-id]');
        if (!cardEl) return;
        const id = cardEl.getAttribute('data-like-id');
        if (!TOOLS_DATA[id]) return;
        let s = (likes[id] || 0) * 3;
        const localC = clicks[id] ? (clicks[id].total || 0) : 0;
        const globalC = _globalClickTotals[id] || 0;
        s += Math.max(localC, globalC);
        const toolName = TOOLS_DATA[id].name['zh'].toLowerCase();
        Object.keys(searchTerms).forEach(function(term) {
          if (toolName.includes(term)) s += (searchTerms[term] || 0) * 2;
        });
        const scoreEl = hotCard.querySelector('.hot-score');
        if (scoreEl) scoreEl.textContent = s;
      });
    }
}

function initToolSort() {
    // Compute composite score: likes × 3 + max(local clicks, global clicks)
    document.querySelectorAll('.tool-grid').forEach(function(grid) {
        const wraps = Array.from(grid.querySelectorAll('.tool-card-wrap'));
        if (wraps.length === 0) return;
        wraps.sort(function(a, b) {
            const idA = (a.querySelector('[data-like-id]') || {}).dataset?.likeId || '';
            const idB = (b.querySelector('[data-like-id]') || {}).dataset?.likeId || '';
            const localA = getTotalClicks(idA);
            const localB = getTotalClicks(idB);
            const globalA = _globalClickTotals[idA] || 0;
            const globalB = _globalClickTotals[idB] || 0;
            const scoreA = getTotalLikes(idA) * 3 + Math.max(localA, globalA);
            const scoreB = getTotalLikes(idB) * 3 + Math.max(localB, globalB);
            return scoreB - scoreA;
        })
        wraps.forEach(function(w) { grid.appendChild(w); });
        // Prevent CSS animation from re-triggering after DOM reorder
        wraps.forEach(function(w) { w.style.animation = 'none'; });
    });
}

function initBlogPagination() {
    const section = document.querySelector('.homepage-article-list, .article-list');
    if (!section) return;
    const items = section.querySelectorAll('.article-item');
    if (items.length <= PAGE_SIZE) return;
    // Remove any existing load-more button first
    const oldWrap = section.parentNode.querySelector('.load-more-wrap');
    if (oldWrap) oldWrap.remove();
    // Use the shared pagination function with "all" category
    applyFilteredPagination("all", items);
}function initArticleClicks() {
    const items = document.querySelectorAll('.article-item');
    for (let i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function(e) {
            // Don't intercept clicks on tag links or existing links inside the article
            if (e.target.closest('a')) return;
            const link = this.querySelector('h2 a, h4 a');
            if (link) {
                window.location.href = link.getAttribute('href');
            }
        });
    }
}

/* ===== Search (unified: query ∩ category, tools + articles) ===== */
// 全局热搜开关：默认 false = 使用本地历史（标签"最近搜索"）。
// 置 true 并部署 /api/hot-search 后升级为真·全局热搜（见 loadHotSearchTerms）。
window.USE_GLOBAL_HOT_SEARCH = false;

// GA4：搜索零结果事件（防重复上报同一查询词）
let lastNoResultTerm = null;
function trackSearchNoResult(query) {
    if (query === lastNoResultTerm) return;
    lastNoResultTerm = query;
    try {
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'search_no_result', { search_term: query });
        }
    } catch (e) {}
}

function getActiveCategory() {
    const activeCat = document.querySelector('.category-chip.active');
    return (activeCat && activeCat.dataset.category) || 'all';
}

// 工具匹配文本：中文名/描述/关键词 + 全拼 + 首字母（大小写归一）
function toolSearchBlob(card, toolId) {
    const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
    const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
    const keywordsZh = (card.dataset.keywordsZh || (window.TOOL_KEYWORDS_ZH && window.TOOL_KEYWORDS_ZH[toolId]) || '').toLowerCase();
    const keywordsEn = (card.dataset.keywordsEn || '').toLowerCase();
    const pin = (window.TOOL_PINYIN_ZH && window.TOOL_PINYIN_ZH[toolId]) || { py: '', ini: '' };
    return (name + ' ' + desc + ' ' + keywordsZh + ' ' + keywordsEn + ' ' + pin.py + ' ' + pin.ini).toLowerCase();
}

// 文章匹配文本：标题/摘要/标签
function articleSearchBlob(article) {
    const title = (article.querySelector('h4 a, h2 a')?.textContent || '').toLowerCase();
    const summary = (article.querySelector('.article-summary')?.textContent || '').toLowerCase();
    const tags = Array.from(article.querySelectorAll('.article-tags a')).map(a => a.textContent.toLowerCase()).join(' ');
    return (title + ' ' + summary + ' ' + tags).toLowerCase();
}

// 相关度评分：标题>关键词>描述>首字母>全拼
function scoreToolCard(card, query, toolId) {
    if (!query) return 0;
    const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
    const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
    const keywordsZh = (card.dataset.keywordsZh || (window.TOOL_KEYWORDS_ZH && window.TOOL_KEYWORDS_ZH[toolId]) || '').toLowerCase();
    const keywordsEn = (card.dataset.keywordsEn || '').toLowerCase();
    const pin = (window.TOOL_PINYIN_ZH && window.TOOL_PINYIN_ZH[toolId]) || { py: '', ini: '' };
    let score = 0;
    if (name.includes(query)) score += 100;
    if (keywordsZh.includes(query)) score += 60;
    if (keywordsEn.includes(query)) score += 60;
    if (desc.includes(query)) score += 20;
    if (pin.ini.includes(query)) score += 15;
    if (pin.py.includes(query)) score += 10;
    return score;
}

// 命中高亮：在 h3/p/标题 文本中包裹匹配子串为 <mark>（保留原始 HTML 以便还原）
function highlightIn(el, query) {
    if (!el) return;
    if (el.dataset.orig === undefined) el.dataset.orig = el.innerHTML;
    let html = el.dataset.orig;
    if (query) {
        const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try { html = html.replace(new RegExp('(' + safe + ')', 'gi'), '<mark>$1</mark>'); } catch (e) {}
    }
    if (el.innerHTML !== html) el.innerHTML = html;
}
function clearHighlight(card) {
    card.querySelectorAll('h3, p').forEach(function(el) {
        if (el.dataset.orig !== undefined) { el.innerHTML = el.dataset.orig; delete el.dataset.orig; }
    });
}

// 编辑距离（模糊容错，阈值 1–2）
function levenshtein(a, b) {
    a = (a || '').toLowerCase(); b = (b || '').toLowerCase();
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const dp = Array.from({ length: m + 1 }, function(_, i) { return [i]; });
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }
    return dp[m][n];
}

// 工具卡片链接（用于建议/纠错跳转）
function getToolHref(card) {
    return card.getAttribute('href') || (card.closest('.tool-card-wrap, .hot-tool-card')?.querySelector('.tool-card')?.getAttribute('href')) || '';
}

// URL 状态同步（?q=，保留 ?cat=）
function syncSearchUrl(query) {
    try {
        const params = new URLSearchParams(window.location.search);
        if (query) params.set('q', query); else params.delete('q');
        const qs = params.toString();
        const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
        history.replaceState(null, '', url);
    } catch (e) {}
}

// 零结果纠错：编辑距离≤2 的相似工具推荐
function buildFuzzySuggestions(query) {
    const q = query.toLowerCase();
    const cards = Array.from(document.querySelectorAll('.tool-card'));
    const scored = [];
    cards.forEach(function(card) {
        const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
        const kw = (card.dataset.keywordsZh || '').toLowerCase();
        let best = Infinity;
        [name].concat(kw.split(',')).forEach(function(tok) {
            tok = tok.trim(); if (!tok) return;
            best = Math.min(best, levenshtein(q, tok));
        });
        if (best <= 2) scored.push({ card: card, d: best, name: card.querySelector('h3')?.textContent || '' });
    });
    scored.sort(function(a, b) { return a.d - b.d; });
    const top = scored.slice(0, 4);
    if (!top.length) return '';
    const label = (document.documentElement.lang === 'en') ? 'Did you mean:' : '你是不是想找：';
    const items = top.map(function(s) {
        return '<a class="search-fallback-item" href="' + getToolHref(s.card) + '">' + (s.name || '') + '</a>';
    }).join('');
    return '<span class="search-fallback-label">' + label + '</span>' + items;
}

// 统一过滤：搜索词 ∩ 当前分类，同时作用于工具卡片与文章；含相关度排序+命中高亮+零结果纠错
function applyFilters() {
    const searchInput = document.querySelector('.search-bar input');
    const query = ((searchInput && searchInput.value) || '').toLowerCase().trim();
    const cat = getActiveCategory();

    let visibleTools = 0, visibleArticles = 0;

    document.querySelectorAll('.tool-card').forEach(card => {
        const toolId = card.closest('.tool-card-wrap, .hot-tool-card')?.querySelector('[data-like-id]')?.getAttribute('data-like-id') || '';
        const cats = (card.dataset.category || '').split(',');
        const catMatch = cat === 'all' || cats.includes(cat);
        const show = catMatch && (query === '' || toolSearchBlob(card, toolId).includes(query));
        card.parentElement.classList.toggle('filtered-out', !show);
        if (show) {
            visibleTools++;
            if (query) { highlightIn(card.querySelector('h3'), query); highlightIn(card.querySelector('p'), query); }
            else clearHighlight(card);
        } else {
            clearHighlight(card);
        }
    });

    // 相关度排序（保持分类分区：仅在每个 .tool-grid 内重排，分区结构不变）
    document.querySelectorAll('.tool-grid').forEach(function(grid) {
        const wraps = Array.from(grid.querySelectorAll('.tool-card-wrap'));
        wraps.forEach(function(w, i) { if (w.dataset.origIndex === undefined) w.dataset.origIndex = String(i); });
        const scored = wraps.map(function(w) {
            const card = w.querySelector('.tool-card');
            const toolId = card ? (card.closest('.tool-card-wrap, .hot-tool-card')?.querySelector('[data-like-id]')?.getAttribute('data-like-id') || '') : '';
            return { w: w, score: query ? scoreToolCard(card, query, toolId) : 0, idx: parseInt(w.dataset.origIndex || '0', 10) };
        });
        scored.sort(function(a, b) { return query ? (b.score - a.score || a.idx - b.idx) : (a.idx - b.idx); });
        scored.forEach(function(s) { grid.appendChild(s.w); });
    });

    const articles = document.querySelectorAll('.article-item');
    articles.forEach(article => {
        const cats = (article.dataset.category || '').split(',');
        const catMatch = cat === 'all' || cats.includes(cat);
        const show = catMatch && (query === '' || articleSearchBlob(article).includes(query));
        article.style.display = ''; // 清除分页内联 display，避免与 .filtered-out(class) 冲突
        article.classList.toggle('filtered-out', !show);
        if (show) {
            visibleArticles++;
            if (query) highlightIn(article.querySelector('h4 a, h2 a'), query);
        } else {
            const t = article.querySelector('h4 a, h2 a');
            if (t && t.dataset.orig !== undefined) { t.innerHTML = t.dataset.orig; delete t.dataset.orig; }
        }
    });

    // 对"存活"文章重做分页（跳过 .filtered-out）
    applyFilteredPagination(cat, articles);

    // 隐藏无可见工具的分类标题（section-divider）
    // 以及搜索/分类筛选时隐藏"最近使用"区域
    const isFiltered = query !== '' || cat !== 'all';
    const recentSection = document.getElementById('recent-tools');
    if (recentSection) {
        // 搜索/筛选时隐藏；清除筛选时恢复（renderRecent 已在 initAll 中调用，recent 已填充）
        if (isFiltered) {
            recentSection.classList.add('hidden');
        } else if (recentSection.querySelector('.recent-tool')) {
            // 有最近使用记录时才恢复显示（避免空区域闪烁）
            recentSection.classList.remove('hidden');
        }
    }
    document.querySelectorAll('.tool-grid').forEach(function(grid) {
        const hasVisible = grid.querySelector('.tool-card-wrap:not(.filtered-out)');
        const divider = grid.previousElementSibling;
        if (divider && divider.classList.contains('section-divider')) {
            divider.style.display = hasVisible ? '' : 'none';
            grid.style.display = hasVisible ? '' : 'none';
        }
    });

    // 无结果：展示"你是不是想找"纠错建议
    const zero = (visibleTools === 0 && visibleArticles === 0);
    const noResults = document.querySelector('.no-results');
    if (noResults) {
        noResults.classList.toggle('visible', zero);
        const fb = noResults.querySelector('.search-fallback');
        if (fb) {
            if (zero && query) { fb.innerHTML = buildFuzzySuggestions(query); fb.classList.add('visible'); }
            else { fb.innerHTML = ''; fb.classList.remove('visible'); }
        }
    }

    // 无障碍：结果计数实时播报（aria-live polite）
    const liveRegion = document.querySelector('.search-live');
    if (liveRegion) {
        const total = visibleTools + visibleArticles;
        if (query) {
            const en = (document.documentElement.lang === 'en');
            liveRegion.textContent = en
                ? (total > 0 ? `Found ${total} result${total === 1 ? '' : 's'} for "${query}"` : `No results found for "${query}"`)
                : (total > 0 ? `找到 ${total} 个与"${query}"相关的结果` : `未找到与"${query}"相关的结果`);
        } else {
            liveRegion.textContent = '';
        }
    }

    return { visibleTools: visibleTools, visibleArticles: visibleArticles, zero: zero };
}

const SEARCH_SUGGEST_MAX = 8;

function initSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const clearBtn = document.querySelector('.search-clear');
    if (!searchInput) return;

    // 标记原始顺序（相关度排序还原用）
    document.querySelectorAll('.tool-grid').forEach(function(grid) {
        Array.from(grid.querySelectorAll('.tool-card-wrap')).forEach(function(w, i) { w.dataset.origIndex = String(i); });
    });

    // 建议下拉容器（一次性创建，置于搜索框之后）
    let suggBox = document.querySelector('.search-suggestions');
    if (!suggBox) {
        suggBox = document.createElement('ul');
        suggBox.className = 'search-suggestions';
        suggBox.setAttribute('role', 'listbox');
        const bar = document.querySelector('.search-bar');
        if (bar && bar.parentNode) bar.parentNode.insertBefore(suggBox, bar.nextSibling);
    }
    let liveRegion = document.querySelector('.search-live');
    if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.className = 'search-live sr-only';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('role', 'status');
        const bar = document.querySelector('.search-bar');
        if (bar && bar.parentNode) bar.parentNode.insertBefore(liveRegion, bar.nextSibling);
    }
    let activeSugg = -1;

    function closeSuggestions() { suggBox.classList.remove('open'); activeSugg = -1; }
    function updateActive(items) {
        items.forEach(function(it, i) { it.classList.toggle('active', i === activeSugg); });
    }

    function renderSuggestions() {
        const query = searchInput.value.toLowerCase().trim();
        if (query.length < 1) { closeSuggestions(); return; }
        const matches = [];
        document.querySelectorAll('.tool-card').forEach(function(card) {
            const toolId = card.closest('.tool-card-wrap, .hot-tool-card')?.querySelector('[data-like-id]')?.getAttribute('data-like-id') || '';
            if (toolSearchBlob(card, toolId).includes(query)) {
                matches.push({ name: card.querySelector('h3')?.textContent || '', href: getToolHref(card), score: scoreToolCard(card, query, toolId) });
            }
        });
        matches.sort(function(a, b) { return b.score - a.score; });
        const top = matches.slice(0, SEARCH_SUGGEST_MAX);
        if (!top.length) { closeSuggestions(); return; }
        suggBox.innerHTML = '';
        top.forEach(function(m) {
            const li = document.createElement('li');
            li.className = 'search-suggestion';
            li.setAttribute('role', 'option');
            li.dataset.href = m.href;
            li.textContent = m.name;
            li.addEventListener('mousedown', function(e) { e.preventDefault(); window.location.href = m.href; });
            suggBox.appendChild(li);
        });
        suggBox.classList.add('open');
        activeSugg = -1;
    }

    let recordTimer = null;
    searchInput.addEventListener('input', function() {
        const query = searchInput.value.toLowerCase().trim();
        if (clearBtn) clearBtn.classList.toggle('visible', query.length > 0);
        const res = applyFilters();
        renderSuggestions();
        syncSearchUrl(query);
        // 防抖记录（合并原第二个监听器，S12）
        if (recordTimer) clearTimeout(recordTimer);
        recordTimer = setTimeout(function() {
            if (query.length >= 2) {
                recordSearchTerm(query);
                if (res && res.zero) trackSearchNoResult(query);
            }
        }, 400);
    });

    // 键盘可达性：↑↓ 选择 / Enter 跳转 / Esc 关闭
    searchInput.addEventListener('keydown', function(e) {
        const items = suggBox.querySelectorAll('.search-suggestion');
        if (!suggBox.classList.contains('open') || !items.length) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSugg = (activeSugg + 1) % items.length;
            updateActive(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSugg = (activeSugg - 1 + items.length) % items.length;
            updateActive(items);
        } else if (e.key === 'Enter') {
            if (activeSugg >= 0) { e.preventDefault(); window.location.href = items[activeSugg].dataset.href; }
        } else if (e.key === 'Escape') {
            closeSuggestions();
        }
    });

    searchInput.addEventListener('blur', function() { setTimeout(closeSuggestions, 150); });

    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            applyFilters();
            renderSuggestions();
            syncSearchUrl('');
            searchInput.focus();
        });
    }

    // 初始：还原 URL ?q= 状态
    const initialQ = new URLSearchParams(window.location.search).get('q');
    if (initialQ) {
        searchInput.value = initialQ;
        if (clearBtn) clearBtn.classList.add('visible');
        applyFilters();
        renderSuggestions();
    } else {
        applyFilters();
    }
    renderHotSearch(searchInput);
}

// 全局热搜候选：默认本地历史；开启 USE_GLOBAL_HOT_SEARCH 时尝试 /api/hot-search，失败回退本地
async function loadHotSearchTerms(maxCount) {
    maxCount = maxCount || 6;
    if (window.USE_GLOBAL_HOT_SEARCH) {
        try {
            const res = await fetch('/api/hot-search');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length) return data.slice(0, maxCount);
            }
        } catch (e) { /* 网络/接口异常，回退本地历史 */ }
    }
    return getHotSearchTerms(maxCount);
}

function renderHotSearch(searchInput) {
    const container = document.querySelector('.hot-search');
    if (!container) return;
    loadHotSearchTerms(6).then(terms => {
        const termsContainer = container.querySelector('.hot-search-terms');
        if (!termsContainer) return;
        if (terms.length === 0) {
            container.classList.add('hidden');
            return;
        }
        container.classList.remove('hidden');
        termsContainer.innerHTML = '';
        terms.forEach(function(term) {
            const el = document.createElement('span');
            el.className = 'hot-search-term';
            el.textContent = term;
            el.addEventListener('click', function() {
                if (searchInput) {
                    searchInput.value = term;
                    applyFilters();
                    searchInput.focus();
                }
            });
            termsContainer.appendChild(el);
        });
    });
}

/* ===== Initialization (home/list pages) ===== */
let _homeInited = false;
function initAll() {
    if (_homeInited) return;
    _homeInited = true;
    /* Like buttons (tool + blog) are initialized by js/like.js (window.LikeSystem). */
    initCategoryFilters();
    initSearch();
    initToolSort();
    initBlogPagination();
    initHotTools();
    initArticleClicks();
    initClickTracking();
    renderRecent();
    // Fetch global click counts and refresh hot tools + tool grid sort
    fetchAndMergeGlobalClicks(function() {
        initHotTools();
        initToolSort();
        initClickTracking();
    });
}

// ES module 兼容：DOMContentLoaded 可能已触发（动态 import 时）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
} else {
    initAll();
}

// Reload click display when page restored from bfcache (browser back/forward)
window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        updateClickDisplay();
        renderRecent();
        fetchAndMergeGlobalClicks(function() {
            initHotTools();
            initToolSort();
            initClickTracking();
        });
    }
});
