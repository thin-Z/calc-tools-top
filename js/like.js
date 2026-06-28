/* ===== Independent Like System (for detail pages) ===== */
(function() {
    var LIKE_KEY = 'toolbox_likes';
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
    function toggleLike(toolId) {
        var likes = getLikes();
        likes[toolId] = (likes[toolId] || 0) > 0 ? 0 : 1;
        saveLikes(likes);
        updateLikeUI(toolId);
    }
    function updateLikeUI(toolId) {
        var count = getTotalLikes(toolId);
        document.querySelectorAll('[data-like-id="' + toolId + '"]').forEach(function(el) {
            var countEl = el.querySelector('.count');
            if (countEl) countEl.textContent = count;
            if (count > 0) {
                el.classList.add('liked');
            } else {
                el.classList.remove('liked');
            }
        });
    }
    function initLikes() {
        document.querySelectorAll('.like-btn').forEach(function(btn) {
            var toolId = btn.getAttribute('data-like-id');
            if (toolId) {
                updateLikeUI(toolId);
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleLike(toolId);
                });
            }
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLikes);
    } else {
        initLikes();
    }
    window.addEventListener('pageshow', initLikes);
})();