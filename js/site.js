/* ===== Site-wide features: Config ===== */

const PAGE_SIZE = 10;
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
        { id: 'mortgage', categories: ['finance'] },
        { id: 'tax2026', categories: ['finance'] },
        { id: 'bmi', categories: ['health'] },
        { id: 'date-calc', categories: ['life'] },
        { id: 'housing-fund', categories: ['finance'] },
        { id: 'age-calc', categories: ['life'] },
        { id: 'discount', categories: ['shopping', 'finance'] },
        { id: 'fuel-cost', categories: ['travel', 'finance'] },
        { id: 'electricity', categories: ['life', 'finance'] },
        { id: 'ideal-weight', categories: ['health'] },
        { id: 'overtime', categories: ['finance'] },
        { id: 'unit-converter', categories: ['utility'] },
        { id: 'ovulation', categories: ['health', 'life'] },
        { id: 'loan-compare', categories: ['finance'] },
        { id: 'compound-interest', categories: ['finance'] },
        { id: 'car-loan', categories: ['finance'] },
        { id: 'compress', categories: ['image'] },
        { id: 'convert', categories: ['image'] },
        { id: 'resize', categories: ['image'] },
        { id: 'base64', categories: ['image'] },
        { id: 'color-picker', categories: ['image'] },
        { id: 'word-counter', categories: ['text'] },
        { id: 'case-converter', categories: ['text'] },
        { id: 'json-formatter', categories: ['text'] },
        { id: 'base64-encode', categories: ['text'] },
        { id: 'url-encode', categories: ['text'] },
        { id: 'text-cleaner', categories: ['text'] },
        { id: 'html-stripper', categories: ['text'] },
        { id: 'text-diff', categories: ['text'] },
        { id: 'uuid-generator', categories: ['text'] },
        { id: 'reading-time', categories: ['text'] },
        { id: 'keyword-density', categories: ['text'] }
    ]
};

/* ===== Tag Click Handler ===== */
function initTagClicks() {
    var tags = document.querySelectorAll('a.tag[data-tag]');
    for (var i = 0; i < tags.length; i++) {
        tags[i].addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            var cat = this.getAttribute('data-tag');
            var lang = document.documentElement.lang || 'zh-CN';
            var homeUrl = lang.indexOf('zh') === 0 ? '/' : '/en/';
            sessionStorage.setItem('preselectCategory', cat);
            window.location.href = homeUrl;
        });
    }
}

/* ===== Like System ===== */
const LIKE_STORAGE_KEY = 'toolbox_likes';

function getLikes() {
    try {
        return JSON.parse(localStorage.getItem(LIKE_STORAGE_KEY)) || {};
    } catch { return {}; }
}

function saveLikes(likes) {
    localStorage.setItem(LIKE_STORAGE_KEY, JSON.stringify(likes));
}

function getTotalLikes(toolId) {
    return getLikes()[toolId] || 0;
}

function toggleLike(toolId) {
    // Heart pop animation
    var hearts = document.querySelectorAll('[data-like-id="' + toolId + '"] .heart');
    hearts.forEach(function(el) {
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = 'heartPop 0.4s ease';
    });
    const likes = getLikes();
    const current = likes[toolId] || 0;
    const was = current > 0;
    likes[toolId] = was ? 0 : 1;
    saveLikes(likes);
    updateLikeUI(toolId);
    
    // Async sync global like to server
    var action = was ? 'unlike' : 'like';
    if (typeof window.ApiClient !== 'undefined') {
        window.ApiClient.toggleLike(toolId, action).then(function(data) {
            if (data && typeof data.count === 'number') {
                updateLikeUI(toolId, data.count);
            }
        });
    }

    return likes[toolId];
}

function updateLikeUI(toolId) {
    const count = getTotalLikes(toolId);
    document.querySelectorAll(`[data-like-id="${toolId}"]`).forEach(el => {
        const countEl = el.querySelector('.count');
        if (countEl) countEl.textContent = count;
        if (count > 0) {
            el.classList.add('liked');
        } else {
            el.classList.remove('liked');
        }
    });
}


function updateClickUI(toolId, total) {
    // Update usage-count spans
    document.querySelectorAll('[data-like-id="' + toolId + '"]').forEach(function(el) {
        var uc = el.parentElement.querySelector('.usage-count');
        if (uc) {
            uc.textContent = '\u2728 ' + total;
        }
        if (total > 0 && !uc) {
            var newUc = document.createElement('span');
            newUc.className = 'usage-count';
            newUc.textContent = '\u2728 ' + total;
            el.insertAdjacentElement('afterend', newUc);
        }
    });
    // Update hot-likes spans for hot tool cards
    var hotCards = document.querySelectorAll('.hot-tool-card[data-like-id="' + toolId + '"]');
    hotCards.forEach(function(card) {
        var hotLikes = card.querySelector('.hot-likes');
        if (hotLikes) hotLikes.textContent = '\u2728 ' + total;
    });
}

function initLikes() {
    document.querySelectorAll('.like-btn:not([data-initialized])').forEach(btn => {
        const toolId = btn.dataset.likeId;
        if (toolId) {
            btn.setAttribute('data-initialized', 'true');
            updateLikeUI(toolId);
            btn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                e.stopPropagation();
                toggleLike(toolId);
            });

            // Fetch global count from server
            if (typeof window.ApiClient !== 'undefined') {
                window.ApiClient.fetchCount(toolId).then(function(data) {
                    if (data && typeof data.count === 'number') {
                        updateLikeUI(toolId, data.count);
                    }
                });
            }
        }
    });
}

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
    // Async sync to server (fire-and-forget)
    if (typeof window.ApiClient !== 'undefined') {
        window.ApiClient.post('/api/clicks', { toolId: toolId }).then(function(data) {
            if (data && typeof data.total === 'number') {
                updateClickUI(toolId, data.total);
            }
        });
    }
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

/* ===== Trend & Usage Rendering ===== */
function renderTrendBadges() {
    document.querySelectorAll('.tool-card-wrap').forEach(function(wrap) {
        var likeBtn = wrap.querySelector('[data-like-id]');
        if (!likeBtn) return;
        var toolId = likeBtn.dataset.likeId;
        var trend = getTrendLabel(toolId);
        var h3 = wrap.querySelector('h3');
        if (!h3) return;
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
        var likeBtn = wrap.querySelector('.like-btn');
        if (!likeBtn) return;
        var toolId = likeBtn.dataset.likeId;
        var total = getTotalClicks(toolId);
        var existing = wrap.querySelector('.usage-count');
        if (existing) existing.remove();
        if (total > 0) {
            var uc = document.createElement('span');
            uc.className = 'usage-count';
            uc.textContent = '✨ ' + total;
            likeBtn.insertAdjacentElement('afterend', uc);
        }
    });
}
function fetchServerClickCounts() {
    if (typeof window.ApiClient === 'undefined') return;
    document.querySelectorAll('[data-like-id]').forEach(function(el) {
        var toolId = el.getAttribute('data-like-id');
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
    document.querySelectorAll('.tool-card').forEach(function(card) {
        card.addEventListener('click', function() {
            var wrap = this.closest('.tool-card-wrap, .hot-tool-card');
            if (wrap) {
                var likeBtn = wrap.querySelector('[data-like-id]');
                if (likeBtn) {
                    incrementClick(likeBtn.dataset.likeId);
                    return;
                }
            }
            var href = this.getAttribute('href') || '';
            var match = href.match(/\/([^\/]+)\.html/);
            if (match) {
                incrementClick(match[1]);
            }
        });
    });
}

/* ===== Category Filter ===== */
function initCategoryFilters() {
    // Check URL query param first (e.g. ?cat=health from article detail pages)
    var urlParams = new URLSearchParams(window.location.search);
    var urlCat = urlParams.get('cat');
    if (urlCat) {
        sessionStorage.setItem('preselectCategory', urlCat);
        // Clean URL without reload
        var cleanUrl = window.location.pathname + window.location.hash;
        history.replaceState(null, '', cleanUrl);
    }

    var preselect = sessionStorage.getItem("preselectCategory");
    if (preselect) {
        sessionStorage.removeItem("preselectCategory");
        setTimeout(function() {
            var chip = document.querySelector(".category-chip[data-category=" + preselect + "]");
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
        const cats = (card.dataset.category || '').split(',');
        const match = category === 'all' || cats.includes(category);
        card.parentElement.classList.toggle('filtered-out', !match);
    });

    // Filter article items on home page or blog listing page
    const articles = document.querySelectorAll('.article-item');
    articles.forEach(function(article) {
        const cats = (article.dataset.category || '').split(',');
        const match = category === 'all' || cats.includes(category);
        article.classList.toggle('filtered-out', !match);
    });

    const noResults = document.querySelector('.no-results');
    if (noResults) {
        const allFiltered = document.querySelectorAll('.tool-card-wrap:not(.filtered-out)').length === 0;
        noResults.classList.toggle('visible', allFiltered);
    }
}

/* ===== Make article cards clickable ===== */
function initArticleLikes() {
    document.querySelectorAll('.article-like').forEach(function(btn) {
        var blogId = btn.dataset.blogId;
        if (!blogId) return;
        var count = getTotalLikes(blogId);
        var countEl = btn.querySelector('.like-count');
        if (countEl) countEl.textContent = count;
        if (count > 0) btn.classList.add('liked');
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            var likes = getLikes();
            var was = (likes[blogId] || 0) > 0;
            likes[blogId] = was ? 0 : 1;
            saveLikes(likes);
            var countEl2 = btn.querySelector('.like-count');
            if (countEl2) countEl2.textContent = likes[blogId];
            if (likes[blogId] > 0) { btn.classList.add('liked'); } else { btn.classList.remove('liked'); }

            // Async sync to server
            var action = was ? 'unlike' : 'like';
            if (typeof window.ApiClient !== 'undefined') {
                window.ApiClient.toggleLike(blogId, action).then(function(data) {
                    if (data && typeof data.count === 'number') {
                        var ce3 = btn.querySelector('.like-count');
                        if (ce3) ce3.textContent = data.count;
                    }
                });
            }
        });

        // Fetch global count from server
        if (typeof window.ApiClient !== 'undefined') {
            window.ApiClient.fetchCount(blogId).then(function(data) {
                if (data && typeof data.count === 'number') {
                    var ce4 = btn.querySelector('.like-count');
                    if (ce4) ce4.textContent = data.count;
                }
            });
        }
    });
}


const TOOLS_DATA = {
    mortgage: { icon: '🏠', name: { zh: '房贷计算器', en: 'Mortgage Calculator' }, desc: { zh: '等额本息+等额本金，支持商业/公积金组合贷款', en: 'Equal payment + principal, supports commercial + housing fund loans' } },
    tax2026: { icon: '📋', name: { zh: '个税计算器', en: 'Tax Calculator 2026' }, desc: { zh: '2026最新个税税率，一键计算税后收入', en: 'Latest 2026 tax rates, calculate after-tax income' } },
    bmi: { icon: '⚖️', name: { zh: 'BMI 计算器', en: 'BMI Calculator' }, desc: { zh: '根据身高体重计算身体质量指数', en: 'Calculate BMI from height and weight' } },
    'date-calc': { icon: '📅', name: { zh: '日期计算器', en: 'Date Calculator' }, desc: { zh: '计算日期差/推算目标日期/工作日', en: 'Date difference, target date, workday calc' } },
    'housing-fund': { icon: '💰', name: { zh: '公积金计算器', en: 'Housing Fund Calculator' }, desc: { zh: '公积金贷款额度与利率计算，支持最新政策', en: 'Housing fund loan amount + rate calculation' } },
    'age-calc': { icon: '🎂', name: { zh: '年龄计算器', en: 'Age Calculator' }, desc: { zh: '周岁/生肖/生日精确计算', en: 'Exact age calculation including zodiac' } },
    discount: { icon: '🏷️', name: { zh: '折扣计算器', en: 'Discount Calculator' }, desc: { zh: '计算折扣后价格与节省金额', en: 'Calculate discounted price and savings' } },
    'fuel-cost': { icon: '⛽', name: { zh: '油耗计算器', en: 'Fuel Cost Calculator' }, desc: { zh: '油费与每公里成本计算', en: 'Fuel cost per kilometer calculation' } },
    electricity: { icon: '💡', name: { zh: '电费计算器', en: 'Electricity Calculator' }, desc: { zh: '电费与用电量精确计算', en: 'Calculate electricity bill and usage' } },
    'ideal-weight': { icon: '🎯', name: { zh: '标准体重计算器', en: 'Ideal Weight Calculator' }, desc: { zh: '标准体重对照与BMI参考', en: 'Standard weight reference + BMI guide' } },
    overtime: { icon: '⏰', name: { zh: '加班费计算器', en: 'Overtime Calculator' }, desc: { zh: '加班工资计算，劳动法标准', en: 'Overtime pay calculation per labor law' } },
    'unit-converter': { icon: '📏', name: { zh: '单位换算器', en: 'Unit Converter' }, desc: { zh: '长度/重量/温度等常用单位换算', en: 'Length/weight/temperature converter' } },
    ovulation: { icon: '🌸', name: { zh: '排卵期计算器', en: 'Ovulation Calculator' }, desc: { zh: '排卵期与安全期推算', en: 'Ovulation + safe period tracker' } },
    'loan-compare': { icon: '📊', name: { zh: '贷款对比计算器', en: 'Loan Comparison' }, desc: { zh: '多种贷款方案利率对比', en: 'Compare multiple loan plans side by side' } },
    'compound-interest': { icon: '📈', name: { zh: '复利计算器', en: 'Compound Interest' }, desc: { zh: '复利收益与投资增长计算', en: 'Calculate compound interest growth' } },
    'car-loan': { icon: '🚗', name: { zh: '车贷计算器', en: 'Car Loan Calculator' }, desc: { zh: '车贷月供与利息计算', en: 'Car loan monthly payment + interest' } },
    compress: { icon: '🗜️', name: { zh: '图片压缩', en: 'Image Compress' }, desc: { zh: '压缩图片大小，本地处理不上传', en: 'Compress images locally without upload' } },
    convert: { icon: '🔄', name: { zh: '格式转换', en: 'Format Convert' }, desc: { zh: 'JPG/PNG/WebP格式互转', en: 'Convert between JPG/PNG/WebP' } },
    resize: { icon: '📐', name: { zh: '裁剪缩放', en: 'Resize & Crop' }, desc: { zh: '调整图片尺寸，保持宽高比', en: 'Resize and crop images' } },
    base64: { icon: '🔣', name: { zh: '图片转Base64', en: 'Image to Base64' }, desc: { zh: '图片转Base64编码嵌入', en: 'Convert image to Base64 embedding' } },
    'color-picker': { icon: '🎨', name: { zh: '图片取色器', en: 'Color Picker' }, desc: { zh: '提取图片中的颜色值', en: 'Pick colors from images' } },
    'word-counter': { icon: '🔤', name: { zh: '字数统计', en: 'Word Counter' }, desc: { zh: '统计字符/字数/段落', en: 'Count characters/words/paragraphs' } },
    'case-converter': { icon: '🔠', name: { zh: '大小写转换', en: 'Case Converter' }, desc: { zh: '全半角/大小写字母转换', en: 'Convert between upper/lower case' } },
    'json-formatter': { icon: '📋', name: { zh: 'JSON 格式化', en: 'JSON Formatter' }, desc: { zh: '格式化/压缩/校验JSON数据', en: 'Format, compress and validate JSON' } },
    'base64-encode': { icon: '🔐', name: { zh: 'Base64 编解码', en: 'Base64 Encode/Decode' }, desc: { zh: '文本与Base64互转', en: 'Encode and decode Base64 text' } },
    'url-encode': { icon: '🔗', name: { zh: 'URL 编解码', en: 'URL Encode/Decode' }, desc: { zh: 'URL编码与解码', en: 'Encode and decode URLs' } },
    'text-cleaner': { icon: '🧹', name: { zh: '文本清理', en: 'Text Cleaner' }, desc: { zh: '清理多余空格和换行', en: 'Clean extra spaces and line breaks' } },
    'html-stripper': { icon: '🏷️', name: { zh: 'HTML 剥离', en: 'HTML Stripper' }, desc: { zh: '移除文本中的HTML标签', en: 'Strip HTML tags from text' } },
    'text-diff': { icon: '📊', name: { zh: '文本对比', en: 'Text Diff' }, desc: { zh: '对比两段文本差异', en: 'Compare two texts for differences' } },
    'uuid-generator': { icon: '🆔', name: { zh: 'UUID 生成', en: 'UUID Generator' }, desc: { zh: '生成UUID唯一标识符', en: 'Generate UUID identifiers' } },
    'reading-time': { icon: '📖', name: { zh: '阅读时间', en: 'Reading Time' }, desc: { zh: '估算文章阅读时长', en: 'Estimate text reading time' } },
    'keyword-density': { icon: '🎯', name: { zh: '关键词密度', en: 'Keyword Density' }, desc: { zh: '分析文章关键词密度', en: 'Analyze keyword density in text' } }
};
const TOOL_KEYWORDS_ZH = {
    mortgage: '房贷,贷款,按揭,买房,月供,利息,商业贷款,公积金贷款',
    tax2026: '个税,个人所得税,税率,工资,扣税,2026',
    bmi: 'bmi,体重,身高,肥胖,超重,身体质量指数',
    'date-calc': '日期,天数,工作日,日期差,日期推算',
    'housing-fund': '公积金,住房公积金,贷款,利率',
    'age-calc': '年龄,周岁,生肖,生日',
    discount: '折扣,打折,优惠,省钱,降价',
    'fuel-cost': '油耗,油费,加油,每公里成本',
    electricity: '电费,用电量,电价,电表',
    'ideal-weight': '标准体重,理想体重,减肥,健康体重',
    overtime: '加班费,加班工资,加班,劳动法',
    'unit-converter': '单位换算,长度换算,重量换算,温度换算,转换',
    ovulation: '排卵期,安全期,生理期,备孕',
    'loan-compare': '贷款对比,贷款方案,利率对比',
    'compound-interest': '复利,投资,理财,收益计算',
    'car-loan': '车贷,买车,汽车贷款,月供',
    compress: '图片压缩,压缩图片,减小图片,压缩',
    convert: '格式转换,图片格式,jpg,png,webp',
    resize: '裁剪,缩放,调整大小,图片尺寸',
    base64: 'base64,图片编码,图片转码',
    'color-picker': '取色器,颜色提取,拾色器,颜色选择',
    'word-counter': '字数统计,字数,字符数,文章统计',
    'case-converter': '大小写转换,大写,小写,首字母大写',
    'json-formatter': 'json格式化,json压缩,json校验,json',
    'base64-encode': 'base64编解码,base64加密,base64',
    'url-encode': 'url编码,url解码,网址编码',
    'text-cleaner': '文本清理,去除空格,清理文本,空白字符',
    'html-stripper': 'html剥离,去除html,提取文本',
    'text-diff': '文本对比,文本差异,比较文本',
    'uuid-generator': 'uuid生成,唯一标识符,随机id',
    'reading-time': '阅读时间,文章阅读,阅读速度',
    'keyword-density': '关键词密度,关键词频率,seo分析'
};



// Default hot tools for new visitors
const DEFAULT_HOT_TOOLS = ['mortgage', 'bmi', 'tax2026', 'color-picker', 'discount', 'unit-converter', 'word-counter', 'json-formatter'];

function initHotTools() {
    var grid = document.getElementById('hotToolsGrid');
    var container = document.getElementById('hotToolsContainer');
    if (!grid || !container) return;
    
    var likes = getLikes();
    var clicks = getClicks();
    var searchTerms = getSearchTerms();
    
    // Composite scoring: likes × 3 + clicks × 1 + search × 2
    var allToolIds = Object.keys(TOOLS_DATA);
    var scored = [];
    allToolIds.forEach(function(id) {
        var score = 0;
        score += (likes[id] || 0) * 3;
        var clickData = clicks[id];
        if (clickData) score += clickData.total || 0;
        var toolName = TOOLS_DATA[id].name['zh'].toLowerCase();
        Object.keys(searchTerms).forEach(function(term) {
            if (toolName.includes(term)) score += (searchTerms[term] || 0) * 2;
        });
        scored.push({ id: id, score: score });
    });
    scored.sort(function(a, b) { return b.score - a.score; });
    
    // If no user data, use defaults
    var hasUserData = Object.keys(likes).length > 0 || Object.keys(clicks).length > 0;
    var selected = [];
    var added = {};
    
    if (!hasUserData) {
        DEFAULT_HOT_TOOLS.forEach(function(id) {
            if (TOOLS_DATA[id] && !added[id]) {
                selected.push({ id: id, score: 999, isDefault: true });
                added[id] = true;
            }
        });
    }
    
    // Ensure category diversity: at least 1 per category
    var categories = ['finance', 'health', 'life', 'shopping', 'travel', 'utility', 'image', 'text'];
    categories.forEach(function(cat) {
        for (var i = 0; i < scored.length && selected.length < 12; i++) {
            var tc = SITE_CONFIG.tools.find(function(t) { return t.id === scored[i].id; });
            if (tc && tc.categories.indexOf(cat) !== -1 && !added[scored[i].id]) {
                selected.push(scored[i]);
                added[scored[i].id] = true;
                break;
            }
        }
    });
    
    // Fill remaining slots with highest-scored tools
    for (var i = 0; i < scored.length && selected.length < 8; i++) {
        if (!added[scored[i].id]) {
            selected.push(scored[i]);
            added[scored[i].id] = true;
        }
    }
    
    // Ultimate fallback
    if (selected.length === 0) {
        DEFAULT_HOT_TOOLS.forEach(function(id) {
            if (TOOLS_DATA[id] && !added[id]) {
                selected.push({ id: id, score: 0, isDefault: true });
                added[id] = true;
            }
        });
    }
    
    if (selected.length === 0) { container.style.display = 'none'; return; }
    container.style.display = '';
    
    var lang = getLang ? getLang() : 'zh';
    var isZh = lang === 'zh';
    var prefix = isZh ? '/zh/' : '/en/';
    
    var catTexts = isZh
        ? { finance: '💰 财务', health: '🏥 健康', life: '🏠 生活', shopping: '🛒 购物', travel: '🚗 出行', utility: '🔧 工具', image: '🖼️ 图片', text: '✏️ 文字' }
        : { finance: '💰 Finance', health: '🏥 Health', life: '🏠 Lifestyle', shopping: '🛒 Shopping', travel: '🚗 Travel', utility: '🔧 Utility', image: '🖼️ Image', text: '✏️ Text' };
    
    var html = '';
    selected.forEach(function(entry, idx) {
        var tool = TOOLS_DATA[entry.id];
        var name = tool.name[lang] || tool.name['zh'];
        var toolConfig = SITE_CONFIG.tools.find(function(t) { return t.id === entry.id; });
        var cats = toolConfig ? toolConfig.categories : [];
        var firstCat = cats[0] || 'utility';
        
        var todayClicks = getTodayClickCount(entry.id);
        var totalClicks = getTotalClicks(entry.id);
        var trendBadge = '';
        if (todayClicks >= 3) {
            trendBadge = '<span class="trend-badge trend-hot">🔥 今日热门</span>';
        } else if (todayClicks >= 1 && totalClicks > 0) {
            trendBadge = '<span class="trend-badge trend-up">⬆ 今日使用</span>';
        }
        
        html += '<div class="hot-tool-card" data-like-id="' + entry.id + '">'
            + '<div class="hot-badge">#' + (idx + 1) + '</div>'
            + (true ? '<span class="hot-likes">✨ ' + getTotalClicks(entry.id) + '</span>' : '')
            + '<a href="' + prefix + entry.id + '.html" class="tool-card" data-like-id="' + entry.id + '" data-category="' + cats.join(',') + '" data-keywords-zh="' + (TOOL_KEYWORDS_ZH[entry.id] || '') + '" style="text-decoration:none;color:inherit;">'
            + '<div class="icon icon-' + firstCat + '">' + tool.icon + '</div>'
            + '<h3>' + name + ' ' + trendBadge + '</h3>'
            + '<p>' + (tool.desc ? (tool.desc[lang] || tool.desc['zh']) : '') + '</p>'
            + '</a>'
            + '<div class="tool-tags"><a href="' + (isZh ? '/' : '/en/') + '" class="tag tag-' + firstCat + '" data-tag="' + firstCat + '">' + catTexts[firstCat] + '</a></div>'
            + '</div>';
    });
    
    grid.innerHTML = html;
    // Stagger entrance animation for hot tools
    var hotCards = grid.querySelectorAll('.hot-tool-card');
    hotCards.forEach(function(card, i) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        setTimeout(function() {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = '';
        }, i * 80);
    });
}

function initToolSort() {
    document.querySelectorAll('.tool-grid').forEach(function(grid) {
        var wraps = Array.from(grid.querySelectorAll('.tool-card-wrap'));
        if (wraps.length === 0) return;
        wraps.sort(function(a, b) {
            var idA = (a.querySelector('[data-like-id]') || {}).dataset?.likeId || '';
            var idB = (b.querySelector('[data-like-id]') || {}).dataset?.likeId || '';
            var scoreA = getTotalLikes(idA) * 3 + getTotalClicks(idA);
            var scoreB = getTotalLikes(idB) * 3 + getTotalClicks(idB);
            return scoreB - scoreA;
        })
        wraps.forEach(function(w) { grid.appendChild(w); });
    });
}

function initBlogPagination() {
    var section = document.querySelector('.homepage-article-list, .article-list');
    if (!section) return;
    var items = section.querySelectorAll('.article-item');
    if (items.length <= PAGE_SIZE) return;
    
    // Always start collapsed on page load
    items.forEach(function(item, i) {
        if (i >= PAGE_SIZE) {
            item.style.display = 'none';
        }
    });
    
    // Remove existing load-more if any
    var oldBtn = section.parentNode.querySelector('.load-more-wrap');
    if (oldBtn) oldBtn.remove();
    
    var wrap = document.createElement('div');
    wrap.className = 'load-more-wrap';
    wrap.style.cssText = 'text-align:center;margin-top:1rem;';
    var btn = document.createElement('button');
    btn.className = 'btn btn-secondary load-more-btn';
    btn.textContent = '加载更多 (' + (items.length - PAGE_SIZE) + ' 篇)';
    btn.addEventListener('click', function() {
        items.forEach(function(item) { item.style.display = ''; });
        this.textContent = '已显示全部文章';
        this.disabled = true;
        this.style.opacity = '0.6';
    });
    wrap.appendChild(btn);
    section.parentNode.insertBefore(wrap, section.nextSibling);
}function initArticleClicks() {
    var items = document.querySelectorAll('.article-item');
    for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function(e) {
            // Don't intercept clicks on tag links or existing links inside the article
            if (e.target.closest('a')) return;
            var link = this.querySelector('h2 a, h4 a');
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
    var searchTimer = null;
    searchInput.addEventListener("input", function() {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
            var val = searchInput.value.trim();
            if (val.length >= 2) {
                recordSearchTerm(val);
            }
        }, 500);
    });

    // 渲染搜索热词
    renderHotSearch(searchInput);
}

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
        (function(term) {
            var el = document.createElement('span');
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

/* ===== Initialization ===== */
document.addEventListener('DOMContentLoaded', () => {
    initLikes();
    initCategoryFilters();
    initSearch();
    initTagClicks();
    initArticleLikes();
    initToolSort();
    initBlogPagination();
    initHotTools();
    initArticleClicks();
    initClickTracking();
});

// Reload click display when page restored from bfcache (browser back/forward)
window.addEventListener('pageshow', function(e) {
    if (e.persisted) {
        updateClickDisplay();
        // Update hot tool counts without re-generating HTML (preserves click handlers)
        document.querySelectorAll('.hot-likes').forEach(function(hl) {
            var card = hl.closest('[data-like-id]');
            if (card) {
                var toolId = card.getAttribute('data-like-id');
                hl.textContent = '✨ ' + getTotalClicks(toolId);
            }
        });
    }
});

// ===== Dark Mode Toggle =====
(function() {
  var STORAGE_KEY = 'theme-preference';
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      var icon = btn.querySelector('.theme-icon');
      if (icon) icon.textContent = theme === 'dark' ? '\U0001F319' : '\u2600\uFE0F';
    }
  }
  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    setTheme(saved);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
    localStorage.setItem(STORAGE_KEY, 'dark');
  }
  document.addEventListener('click', function(e) {
    var toggle = e.target.closest('#theme-toggle');
    if (!toggle) return;
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  });
})();
