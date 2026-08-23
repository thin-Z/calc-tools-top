/* ===== Site-wide core (T05 拆分自 js/site.js) =====
 * 全站必需功能：标签跳转、like 访问器（委托 js/like.js）、阅读进度条、返回顶部。
 * 加载范围：首页 / 博客索引 / 博客正文 / 7 个 text 工具页（仅本文件，不加载 site-home.js）。
 * 依赖：window.LikeSystem（js/like.js，需先加载）。
 */

/* ===== Tag Click Handler ===== */
function initTagClicks() {
    const tags = document.querySelectorAll('a.tag[data-tag]');
    for (let i = 0; i < tags.length; i++) {
        tags[i].addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const cat = this.getAttribute('data-tag');
            const lang = document.documentElement.lang || 'zh-CN';
            const homeUrl = lang.indexOf('zh') === 0 ? '/' : '/en/';
            sessionStorage.setItem('preselectCategory', cat);
            window.location.href = homeUrl;
        });
    }
}

/* ===== Like System (delegates to js/like.js -> window.LikeSystem) =====
 * The actual like state/logic lives in js/like.js (single source of truth, T9).
 * These are thin read/write accessors so site-home.js (hot-tool scoring,
 * tool-grid sort) keeps working without call-site changes. Falls back to direct
 * localStorage access if like.js failed to load. */
function getLikes() {
    if (window.LikeSystem && window.LikeSystem.getLikes) return window.LikeSystem.getLikes();
    const key = (window.ApiClient && window.ApiClient.config && window.ApiClient.config.STORAGE_KEY) || 'toolbox_likes';
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
}
function saveLikes(likes) {
    if (window.LikeSystem && window.LikeSystem.saveLikes) { window.LikeSystem.saveLikes(likes); return; }
    const key = (window.ApiClient && window.ApiClient.config && window.ApiClient.config.STORAGE_KEY) || 'toolbox_likes';
    try { localStorage.setItem(key, JSON.stringify(likes)); } catch (e) {}
}
function getTotalLikes(toolId) {
    return getLikes()[toolId] || 0;
}

/* ===== Reading Progress Bar ===== */
function initReadingProgress() {
    // Only show on blog post pages (has article.blog-post)
    const article = document.querySelector('article.blog-post');
    if (!article) return;

    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    bar.innerHTML = '<div class="progress-fill"></div>';
    document.body.appendChild(bar);

    const fill = bar.querySelector('.progress-fill');

    window.addEventListener('scroll', function() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        const progress = Math.min(scrollTop / docHeight * 100, 100);
        fill.style.width = progress + '%';
    }, { passive: true });
}

/* ===== Back to Top ===== */
function initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '\u2B06';
    btn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(btn);

    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                if (window.scrollY > 400) {
                    btn.classList.add('visible');
                } else {
                    btn.classList.remove('visible');
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
}

/* ===== Initialization (core only) ===== */
document.addEventListener('DOMContentLoaded', () => {
    initTagClicks();
    initReadingProgress();
    initBackToTop();
});
