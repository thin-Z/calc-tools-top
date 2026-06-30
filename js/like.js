/* ===== Independent Like System (for detail pages) ===== */
(function() {
    'use strict';

    var LIKE_KEY = 'toolbox_likes';
    var API_BASE = '/api/likes';
    var API_TIMEOUT = 3000;

    // ---- localStorage ----
    function getLikes() {
        try { return JSON.parse(localStorage.getItem(LIKE_KEY)) || {}; }
        catch(e) { return {}; }
    }
    function saveLikes(likes) {
        localStorage.setItem(LIKE_KEY, JSON.stringify(likes));
    }
    function getTotalLikes(toolId) {
        return getLikes()[toolId] || 0;
    }

    // ---- Server API ----
    function apiFetch(url, opts) {
        var ctrl = new AbortController();
        var t = setTimeout(function() { ctrl.abort(); }, API_TIMEOUT);
        return fetch(url, opts).then(function(r) {
            clearTimeout(t);
            return r.ok ? r.json() : null;
        }).catch(function() {
            clearTimeout(t);
            return null;
        });
    }

    function fetchServerCount(toolId) {
        return apiFetch(API_BASE + '?toolId=' + encodeURIComponent(toolId));
    }

    function toggleServerLike(toolId, action) {
        return apiFetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolId: toolId, action: action })
        });
    }

    // ---- UI ----
    function updateLikeUI(toolId, count) {
        var c = (count !== undefined) ? count : getTotalLikes(toolId);
        document.querySelectorAll('[data-like-id="' + toolId + '"]').forEach(function(el) {
            var countEl = el.querySelector('.count');
            if (countEl) countEl.textContent = c;
            if (c > 0) {
                el.classList.add('liked');
            } else {
                el.classList.remove('liked');
            }
        });
    }

    // ---- Toggle ----
    function toggleLike(toolId) {
        var likes = getLikes();
        var was = (likes[toolId] || 0) > 0;
        likes[toolId] = was ? 0 : 1;
        saveLikes(likes);
        updateLikeUI(toolId);

        // Async sync to server (fire-and-forget)
        var action = was ? 'unlike' : 'like';
        toggleServerLike(toolId, action).then(function(data) {
            if (data && typeof data.count === 'number') {
                updateLikeUI(toolId, data.count);
            }
        });
    }

    // ---- Init ----
    function initLikes() {
        document.querySelectorAll('.like-btn:not([data-initialized])').forEach(function(btn) {
            var toolId = btn.getAttribute('data-like-id');
            if (!toolId) return;

            // Mark as initialized to prevent double-binding on pageshow
            btn.setAttribute('data-initialized', 'true');

            // Show local count immediately
            updateLikeUI(toolId);

            // Bind click
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                toggleLike(toolId);
            });

            // Fetch global count from server (async update)
            fetchServerCount(toolId).then(function(data) {
                if (data && typeof data.count === 'number') {
                    updateLikeUI(toolId, data.count);
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLikes);
    } else {
        initLikes();
    }
    window.addEventListener('pageshow', initLikes);
})();
