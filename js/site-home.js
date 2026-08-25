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
        { id: 'finance', label: { zh: '财务', en: 'Finance' }, icon: '💰' },
        { id: 'health', label: { zh: '健康', en: 'Health' }, icon: '🏥' },
        { id: 'life', label: { zh: '生活', en: 'Lifestyle' }, icon: '🏠' },
        { id: 'shopping', label: { zh: '购物', en: 'Shopping' }, icon: '🛒' },
        { id: 'travel', label: { zh: '出行', en: 'Travel' }, icon: '🚗' },
        { id: 'utility', label: { zh: '工具', en: 'Utility' }, icon: '🔧' },
        { id: 'image', label: { zh: '图片', en: 'Image' }, icon: '🖼️' },
        { id: 'text', label: { zh: '文字', en: 'Text' }, icon: '✏️' }
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
        { id: 'markdown-preview', categories: ["text"] }
/* __GENERATED_SITE_CONFIG_TOOLS_END__ */
    ]
};

/* ===== Click Tracking ===== */
const CLICK_STORAGE_KEY = 'toolbox_clicks';
const SEARCH_TERMS_KEY = 'toolbox_search_terms';

function updateClickUI(toolId, total) {
    // Update usage-count in regular tool cards only
    document.querySelectorAll('.tool-card-wrap [data-like-id="' + toolId + '"]').forEach(function(el) {
        const wrap = el.closest('.tool-card-wrap');
        if (!wrap) return;
        const uc = wrap.querySelector('.usage-count');
        if (uc) {
            uc.textContent = '✨ ' + total;
        }
        if (total > 0 && !uc) {
            const newUc = document.createElement('span');
            newUc.className = 'usage-count';
            newUc.textContent = '✨ ' + total;
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
            badge.textContent = trend === 'hot' ? '🔥 今日热门' : '⬆ 上升中';
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
            uc.textContent = '✨ ' + total;
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
        // Clean URL without reload
        const cleanUrl = window.location.pathname + window.location.hash;
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

/* ===== Filter tools and articles by category ===== */
function filterTools(category) {
    // Filter tool cards
    const cards = document.querySelectorAll('.tool-card');
    cards.forEach(function(card) {
        const cats = (card.dataset.category || "").split(",");
        const match = category === "all" || cats.includes(category);
        card.parentElement.classList.toggle("filtered-out", !match);
    });

    // Filter article items
    const articles = document.querySelectorAll(".article-item");
    articles.forEach(function(article) {
        const cats = (article.dataset.category || "").split(",");
        const match = category === "all" || cats.includes(category);
        // Clear all inline display first (removes pagination artifacts)
        article.style.display = "";
        // Apply filtered-out class (CSS handles the visual hide via display:none)
        article.classList.toggle("filtered-out", !match);
    });

    // Re-apply pagination for filtered items
    applyFilteredPagination(category, articles);

    const noResults = document.querySelector(".no-results");
    if (noResults) {
        const visibleCards = document.querySelectorAll(".tool-card-wrap:not(.filtered-out)");
        noResults.classList.toggle("visible", visibleCards.length === 0);
    }
}

function applyFilteredPagination(category, articles) {
    // Count visible (non-filtered) items
    const visibleItems = [];
    articles.forEach(function(article) {
        const cats = (article.dataset.category || "").split(",");
        const match = category === "all" || cats.includes(category);
        if (match) {
            visibleItems.push(article);
        }
    });

    // Get or create load-more wrapper
    const section = document.querySelector(".homepage-article-list, .article-list");
    if (!section) return;
    let wrap = section.parentNode.querySelector(".load-more-wrap");
    let btn = wrap ? wrap.querySelector(".load-more-btn") : null;

    if (visibleItems.length <= PAGE_SIZE) {
        // All visible items fit on one page - hide load-more if exists
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

    // Hide items beyond PAGE_SIZE
    const currentVisible = Math.min(PAGE_SIZE, visibleItems.length);
    visibleItems.forEach(function(item, i) {
        if (i >= PAGE_SIZE) {
            item.style.display = "none";
        } else {
            item.style.display = "";
        }
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
        // Count how many are currently visible
        let shown = 0;
        let remainingCount = 0;
        visibleItems.forEach(function(item, i) {
            if (i < visibleItems.length && item.style.display !== "none") {
                shown++;
            }
        });
        const toShow = Math.min(PAGE_SIZE, visibleItems.length - shown);
        const shownSoFar = shown;
        for (let i = shownSoFar; i < shownSoFar + toShow && i < visibleItems.length; i++) {
            visibleItems[i].style.display = "";
        }
        shown += toShow;
        remainingCount = visibleItems.length - shown;
        if (remainingCount > 0) {
            newBtn.textContent = "加载更多 (" + remainingCount + " 篇)";
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
    mortgage: { icon: '🏠', name: { zh: '房贷计算器', en: 'Mortgage Calculator' }, desc: { zh: '等额本息+等额本金，支持商业/公积金组合贷款', en: 'Equal payment + principal, supports commercial + housing fund loans' } },
    tax2026: { icon: '📋', name: { zh: '个税计算器', en: 'Tax Calculator 2026' }, desc: { zh: '2026最新个税税率，一键计算税后收入', en: 'Latest 2026 tax rates, calculate after-tax income' } },
    'housing-fund': { icon: '💰', name: { zh: '公积金计算器', en: 'Housing Fund Calculator' }, desc: { zh: '公积金贷款额度与利率计算，支持最新政策', en: 'Housing fund loan amount + rate calculation' } },
    'car-loan': { icon: '🚗', name: { zh: '车贷计算器', en: 'Car Loan Calculator' }, desc: { zh: '车贷月供与利息计算', en: 'Car loan monthly payment + interest' } },
    'loan-compare': { icon: '📊', name: { zh: '贷款对比计算器', en: 'Loan Comparison' }, desc: { zh: '多种贷款方案利率对比', en: 'Compare multiple loan plans side by side' } },
    'compound-interest': { icon: '📈', name: { zh: '复利计算器', en: 'Compound Interest' }, desc: { zh: '复利收益与投资增长计算', en: 'Calculate compound interest growth' } },
    overtime: { icon: '⏰', name: { zh: '加班费计算器', en: 'Overtime Calculator' }, desc: { zh: '加班工资计算，劳动法标准', en: 'Overtime pay calculation per labor law' } },
    'percentage-calc': { icon: '📊', name: { zh: '百分比计算器', en: 'Percentage Calculator' }, desc: { zh: '百分比计算/增减/变化多种模式', en: 'Percentage calc, increase, decrease, change' } },
    discount: { icon: '🏷️', name: { zh: '折扣计算器', en: 'Discount Calculator' }, desc: { zh: '计算折扣后价格与节省金额', en: 'Calculate discounted price and savings' } },
    'fuel-cost': { icon: '⛽', name: { zh: '油耗计算器', en: 'Fuel Cost Calculator' }, desc: { zh: '油费与每公里成本计算', en: 'Fuel cost per kilometer calculation' } },
    bmi: { icon: '⚖️', name: { zh: 'BMI 计算器', en: 'BMI Calculator' }, desc: { zh: '根据身高体重计算身体质量指数', en: 'Calculate BMI from height and weight' } },
    'ideal-weight': { icon: '🎯', name: { zh: '标准体重计算器', en: 'Ideal Weight Calculator' }, desc: { zh: '标准体重对照与BMI参考', en: 'Standard weight reference + BMI guide' } },
    ovulation: { icon: '🌸', name: { zh: '排卵期计算器', en: 'Ovulation Calculator' }, desc: { zh: '排卵期与安全期推算', en: 'Ovulation + safe period tracker' } },
    'calorie-calculator': { icon: '🔥', name: { zh: '卡路里计算器', en: 'Calorie Calculator' }, desc: { zh: '按身高体重年龄性别计算每日所需热量', en: 'Calculate daily calorie needs by height, weight, age and gender' } },
    'date-calc': { icon: '📅', name: { zh: '日期计算器', en: 'Date Calculator' }, desc: { zh: '计算日期差/推算目标日期/工作日', en: 'Date difference, target date, workday calc' } },
    'workday-calculator': { icon: '💼', name: { zh: '工作日计算器', en: 'Workday Calculator' }, desc: { zh: '计算两个日期之间的工作日天数，可选排除节假日', en: 'Count workdays between two dates, optionally excluding holidays' } },
    'age-calc': { icon: '🎂', name: { zh: '年龄计算器', en: 'Age Calculator' }, desc: { zh: '周岁/生肖/生日精确计算', en: 'Exact age calculation including zodiac' } },
    electricity: { icon: '💡', name: { zh: '电费计算器', en: 'Electricity Calculator' }, desc: { zh: '电费与用电量精确计算', en: 'Calculate electricity bill and usage' } },
    'unit-converter': { icon: '📏', name: { zh: '单位换算器', en: 'Unit Converter' }, desc: { zh: '长度/重量/温度等常用单位换算', en: 'Length/weight/temperature converter' } },
    'password-strength': { icon: '🛡️', name: { zh: '密码强度检测器', en: 'Password Strength Checker' }, desc: { zh: '实时检测密码安全性并给出改进建议', en: 'Test password security with improvement tips' } },
    'qr-generator': { icon: '📱', name: { zh: '二维码生成器', en: 'QR Code Generator' }, desc: { zh: '文字或链接快速生成二维码，下载PNG', en: 'Generate QR codes from text/URL, download as PNG' } },
    'password-gen': { icon: '🔑', name: { zh: '密码生成器', en: 'Password Generator' }, desc: { zh: '自定义字符类型生成高强度密码', en: 'Generate strong passwords with custom options' } },
    'random-gen': { icon: '🎲', name: { zh: '随机数生成器', en: 'Random Number Generator' }, desc: { zh: '自定义范围生成随机整数', en: 'Generate random integers in custom range' } },
    compress: { icon: '🗜️', name: { zh: '图片压缩', en: 'Image Compress' }, desc: { zh: '压缩图片大小，本地处理不上传', en: 'Compress images locally without upload' } },
    convert: { icon: '🔄', name: { zh: '格式转换', en: 'Format Convert' }, desc: { zh: 'JPG/PNG/WebP格式互转', en: 'Convert between JPG/PNG/WebP' } },
    resize: { icon: '📐', name: { zh: '裁剪缩放', en: 'Resize & Crop' }, desc: { zh: '调整图片尺寸，保持宽高比', en: 'Resize and crop images' } },
    base64: { icon: '🔣', name: { zh: '图片转Base64', en: 'Image to Base64' }, desc: { zh: '图片转Base64编码嵌入', en: 'Convert image to Base64 embedding' } },
    'color-picker': { icon: '🎨', name: { zh: '图片取色器', en: 'Color Picker' }, desc: { zh: '提取图片中的颜色值', en: 'Pick colors from images' } },
    'image-crop': { icon: '✂️', name: { zh: '图片裁剪', en: 'Image Cropper' }, desc: { zh: '拖拽裁剪图片，比例锁定，下载 PNG/JPEG', en: 'Drag to crop images with aspect lock, download PNG/JPEG' } },
    'color-contrast': { icon: '🎨', name: { zh: '颜色对比度检查器', en: 'Color Contrast Checker' }, desc: { zh: 'WCAG AA/AAA 对比度在线检测', en: 'Check WCAG AA/AAA contrast ratio online' } },
    'case-converter': { icon: '🔠', name: { zh: '大小写转换', en: 'Case Converter' }, desc: { zh: '全半角/大小写字母转换', en: 'Convert between upper/lower case' } },
    'json-formatter': { icon: '📋', name: { zh: 'JSON 格式化', en: 'JSON Formatter' }, desc: { zh: '格式化/压缩/校验JSON数据', en: 'Format, compress and validate JSON' } },
    'base64-encode': { icon: '🔐', name: { zh: 'Base64 编解码', en: 'Base64 Encode/Decode' }, desc: { zh: '文本与Base64互转', en: 'Encode and decode Base64 text' } },
    'url-encode': { icon: '🔗', name: { zh: 'URL 编解码', en: 'URL Encode/Decode' }, desc: { zh: 'URL编码与解码', en: 'Encode and decode URLs' } },
    'text-cleaner': { icon: '🧹', name: { zh: '文本清理', en: 'Text Cleaner' }, desc: { zh: '清理多余空格和换行', en: 'Clean extra spaces and line breaks' } },
    'html-stripper': { icon: '✂️', name: { zh: 'HTML 剥离', en: 'HTML Stripper' }, desc: { zh: '移除文本中的HTML标签', en: 'Strip HTML tags from text' } },
    'text-diff': { icon: '📊', name: { zh: '文本对比', en: 'Text Diff' }, desc: { zh: '对比两段文本差异', en: 'Compare two texts for differences' } },
    'uuid-generator': { icon: '🆔', name: { zh: 'UUID 生成', en: 'UUID Generator' }, desc: { zh: '生成UUID唯一标识符', en: 'Generate UUID identifiers' } },
    'reading-time': { icon: '📖', name: { zh: '阅读时间', en: 'Reading Time' }, desc: { zh: '估算文章阅读时长', en: 'Estimate text reading time' } },
    'keyword-density': { icon: '🎯', name: { zh: '关键词密度', en: 'Keyword Density' }, desc: { zh: '分析文章关键词密度', en: 'Analyze keyword density in text' } },
    'word-counter': { icon: '🔤', name: { zh: '字数统计', en: 'Word Counter' }, desc: { zh: '统计字符/字数/段落', en: 'Count characters/words/paragraphs' } },
    'regex-tester': { icon: '🔍', name: { zh: '正则表达式测试器', en: 'Regex Tester' }, desc: { zh: '实时匹配高亮与捕获组解析', en: 'Real-time match highlight and group parsing' } },
    'markdown-preview': { icon: '📝', name: { zh: 'Markdown 预览器', en: 'Markdown Preview' }, desc: { zh: '实时预览 Markdown 渲染结果', en: 'Live Markdown rendering preview' } }
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
    'markdown-preview': 'markdown,markdown预览,md转html,markdown编辑器,markdown在线'
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
        ? { finance: '💰 财务', health: '🏥 健康', life: '🏠 生活', shopping: '🛒 购物', travel: '🚗 出行', utility: '🔧 工具', image: '🖼️ 图片', text: '✏️ 文字' }
        : { finance: '💰 Finance', health: '🏥 Health', life: '🏠 Lifestyle', shopping: '🛒 Shopping', travel: '🚗 Travel', utility: '🔧 Utility', image: '🖼️ Image', text: '✏️ Text' };
    
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
            trendBadge = '<span class="trend-badge trend-hot">🔥 今日热门</span>';
        } else if (todayClicks >= 1 && totalClicks > 0) {
            trendBadge = '<span class="trend-badge trend-up">⬆ 今日使用</span>';
        }
        
        html += '<div class="hot-tool-card">'
            + '<div class="hot-badge">#' + (idx + 1) + '</div>'
            + '<span class="hot-score">🔥 ' + entry.score + '</span>'
            + '<a href="' + prefix + entry.id + '.html" class="tool-card" data-like-id="' + entry.id + '" data-category="' + cats.join(',') + '" data-keywords-zh="' + (TOOL_KEYWORDS_ZH[entry.id] || '') + '">'
            + '<div class="icon icon-' + firstCat + '">' + tool.icon + '</div>'
            + '<h3>' + name + ' ' + trendBadge + '</h3>'
            + '<p>' + (tool.desc ? (tool.desc[lang] || tool.desc['zh']) : '') + '</p>'
            + '</a>'
            + '<div class="tool-tags">' + cats.map(function(c) {
                return '<a href="' + (isZh ? '/tags/' : '/en/tags/') + c + '.html" class="tag tag-' + c + '" data-tag="' + c + '">' + (catTexts[c] || c) + '</a>';
            }).join('') + '</div>'
            + '</div>';
    });
    
    grid.innerHTML = html;
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

/* ===== Search ===== */
function initSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const clearBtn = document.querySelector('.search-clear');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (clearBtn) clearBtn.classList.toggle('visible', query.length > 0);

        const cards = document.querySelectorAll('.tool-card');
        let visibleCount = 0;

        cards.forEach(card => {
            const name = (card.querySelector('h3')?.textContent || '').toLowerCase();
            const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
            const toolId = card.closest('.tool-card-wrap, .hot-tool-card')?.querySelector('[data-like-id]')?.getAttribute('data-like-id') || '';
            const keywordsZh = card.dataset.keywordsZh || (TOOL_KEYWORDS_ZH[toolId] || '').toLowerCase();
            const matches = query === '' || name.includes(query) || desc.includes(query) || keywordsZh.includes(query);
            
            // Only show if matches search AND current category filter
            const activeCat = document.querySelector('.category-chip.active');
            const cat = activeCat?.dataset.category || 'all';
            const cats = (card.dataset.category || '').split(',');
            const catMatch = cat === 'all' || cats.includes(cat);

            if (matches && catMatch) {
                card.parentElement.classList.remove('filtered-out');
                visibleCount++;
            } else {
                card.parentElement.classList.add('filtered-out');
            }
        });

        const noResults = document.querySelector('.no-results');
        if (noResults) {
            noResults.classList.toggle('visible', visibleCount === 0);
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.classList.remove('visible');
            searchInput.dispatchEvent(new Event('input'));
            searchInput.focus();
        });
    }
    // 搜索记录：输入停顿 500ms 后记录
    let searchTimer = null;
    searchInput.addEventListener("input", function() {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            const val = searchInput.value.trim();
            if (val.length >= 2) {
                recordSearchTerm(val);
            }
        }, 500);
    });

    // 渲染搜索热词
    renderHotSearch(searchInput);
}

function renderHotSearch(searchInput) {
    const container = document.querySelector('.hot-search');
    if (!container) return;
    const terms = getHotSearchTerms(6);
    const termsContainer = container.querySelector('.hot-search-terms');
    if (!termsContainer) return;
    if (terms.length === 0) {
        container.classList.add('hidden');
        return;
    }
    container.classList.remove('hidden');
    container.style.display = '';
    termsContainer.innerHTML = '';
    for (let i = 0; i < terms.length; i++) {
        (function(term) {
            const el = document.createElement('span');
            el.className = 'hot-search-term';
            el.textContent = term;
            el.addEventListener('click', function() {
                if (searchInput) {
                    searchInput.value = term;
                    searchInput.dispatchEvent(new Event('input'));
                }
            });
            termsContainer.appendChild(el);
        })(terms[i]);
    }
}

/* ===== Initialization (home/list pages) ===== */
document.addEventListener('DOMContentLoaded', () => {
    /* Like buttons (tool + blog) are initialized by js/like.js (window.LikeSystem). */
    initCategoryFilters();
    initSearch();
    initToolSort();
    initBlogPagination();
    initHotTools();
    initArticleClicks();
    initClickTracking();
    // Fetch global click counts and refresh hot tools + tool grid sort
    fetchAndMergeGlobalClicks(function() {
        initHotTools();
        initToolSort();
        initClickTracking();
    });
});

// Reload click display when page restored from bfcache (browser back/forward)
window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        updateClickDisplay();
        fetchAndMergeGlobalClicks(function() {
            initHotTools();
            initToolSort();
            initClickTracking();
        });
    }
});
