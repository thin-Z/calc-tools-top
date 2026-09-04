/* ===== Canonical Like System (single source of truth) =====
 * Loaded on tool detail pages AND (post-convergence) on every page that
 * loads site.js. Works with or without window.ApiClient (falls back to its
 * own fetch). Auto-initializes both tool likes (.like-btn[data-like-id])
 * and blog likes (.article-like[data-blog-id]).
 *
 * NOTE: This is the ONLY implementation of like logic. site.js must delegate
 * to window.LikeSystem instead of re-defining it. See T9.
 */
(function () {
    'use strict';

    // P1-1：优先复用 ApiClient 的单一数据源；缺失时回退到本地常量（离线/独立运行）
    var _conf = (typeof window.ApiClient !== 'undefined' && window.ApiClient.config) || {};
    var LIKE_KEY = _conf.LIKE_KEY || 'toolbox_likes';
    var API_BASE = _conf.API_BASE || '/api/likes';
    var API_TIMEOUT = _conf.TIMEOUT_MS || 3000;

    /* ---------- localStorage (shared shape with site.js) ---------- */
    function getLikes() {
        try { return JSON.parse(localStorage.getItem(LIKE_KEY)) || {}; }
        catch (e) { return {}; }
    }
    function saveLikes(likes) {
        localStorage.setItem(LIKE_KEY, JSON.stringify(likes));
    }
    function getTotalLikes(toolId) {
        return getLikes()[toolId] || 0;
    }

    /* ---------- API (prefer ApiClient, fallback to own fetch) ---------- */
    function apiPost(toolId, action) {
        var body = JSON.stringify({ toolId: toolId, action: action });
        if (typeof window.ApiClient !== 'undefined' && window.ApiClient.toggleLike) {
            return window.ApiClient.toggleLike(toolId, action);
        }
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, API_TIMEOUT);
        return fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
            signal: ctrl.signal
        }).then(function (r) {
            clearTimeout(t);
            return r.ok ? r.json() : null;
        }).catch(function () {
            clearTimeout(t);
            return null;
        });
    }
    function apiGet(toolId) {
        var url = API_BASE + '?toolId=' + encodeURIComponent(toolId);
        if (typeof window.ApiClient !== 'undefined' && window.ApiClient.fetchCount) {
            return window.ApiClient.fetchCount(toolId);
        }
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, API_TIMEOUT);
        return fetch(url).then(function (r) {
            clearTimeout(t);
            return r.ok ? r.json() : null;
        }).catch(function () {
            clearTimeout(t);
            return null;
        });
    }

    /* ---------- UI ---------- */
    function updateLikeUI(toolId, count) {
        var c = (count !== undefined) ? count : getTotalLikes(toolId);
        document.querySelectorAll('[data-like-id="' + toolId + '"]').forEach(function (el) {
            var countEl = el.querySelector('.count');
            if (countEl) countEl.textContent = c;
            if (c > 0) { el.classList.add('liked'); } else { el.classList.remove('liked'); }
        });
    }
    function updateArticleUI(blogId, count) {
        var c = (count !== undefined) ? count : getTotalLikes(blogId);
        document.querySelectorAll('.article-like[data-blog-id="' + blogId + '"]').forEach(function (el) {
            var countEl = el.querySelector('.like-count');
            if (countEl) countEl.textContent = c;
            if (c > 0) { el.classList.add('liked'); } else { el.classList.remove('liked'); }
        });
    }

    function heartPop(toolId) {
        document.querySelectorAll('[data-like-id="' + toolId + '"] .heart').forEach(function (el) {
            /* class-driven animation (CSP-safe: no inline style.animation) */
            el.classList.remove('heart-pop');
            /* force reflow to restart the animation */
            void el.offsetWidth;
            el.classList.add('heart-pop');
        });
    }

    /* ---------- Toggle ---------- */
    function toggleLike(toolId) {
        heartPop(toolId);
        var likes = getLikes();
        var was = (likes[toolId] || 0) > 0;
        likes[toolId] = was ? 0 : 1;
        saveLikes(likes);
        updateLikeUI(toolId);

        var action = was ? 'unlike' : 'like';
        apiPost(toolId, action).then(function (data) {
            if (data && typeof data.count === 'number') {
                updateLikeUI(toolId, data.count);
            }
        });
    }
    function toggleArticleLike(blogId) {
        var likes = getLikes();
        var was = (likes[blogId] || 0) > 0;
        likes[blogId] = was ? 0 : 1;
        saveLikes(likes);
        updateArticleUI(blogId);

        var action = was ? 'unlike' : 'like';
        apiPost(blogId, action).then(function (data) {
            if (data && typeof data.count === 'number') {
                updateArticleUI(blogId, data.count);
            }
        });
    }

    /* ---------- Init (idempotent via data-initialized guard) ---------- */
    function initLikes() {
        document.querySelectorAll('.like-btn:not([data-initialized])').forEach(function (btn) {
            var toolId = btn.getAttribute('data-like-id');
            if (!toolId) return;
            btn.setAttribute('data-initialized', 'true');
            updateLikeUI(toolId);
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleLike(toolId);
            });
            apiGet(toolId).then(function (data) {
                if (data && typeof data.count === 'number') {
                    updateLikeUI(toolId, data.count);
                }
            });
        });
    }
    function initArticleLikes() {
        document.querySelectorAll('.article-like:not([data-initialized])').forEach(function (btn) {
            var blogId = btn.getAttribute('data-blog-id');
            if (!blogId) return;
            btn.setAttribute('data-initialized', 'true');
            updateArticleUI(blogId);
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                toggleArticleLike(blogId);
            });
            apiGet(blogId).then(function (data) {
                if (data && typeof data.count === 'number') {
                    updateArticleUI(blogId, data.count);
                }
            });
        });
    }

    /* ---------- Public API ---------- */
    window.LikeSystem = {
        getLikes: getLikes,
        saveLikes: saveLikes,
        getTotalLikes: getTotalLikes,
        toggleLike: toggleLike,
        toggleArticleLike: toggleArticleLike,
        updateLikeUI: updateLikeUI,
        updateArticleUI: updateArticleUI,
        initLikes: initLikes,
        initArticleLikes: initArticleLikes
    };

    function boot() { initLikes(); initArticleLikes(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
    window.addEventListener('pageshow', boot);
})();
