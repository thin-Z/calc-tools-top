/* ===== Canonical Like System (single source of truth) =====
 * Loaded on tool detail pages AND (post-convergence) on every page that
 * loads site.js. Works with or without window.ApiClient (falls back to its
 * own fetch). Auto-initializes both tool likes (.like-btn[data-like-id])
 * and blog likes (.article-like[data-blog-id]).
 *
 * NOTE: This is the ONLY implementation of like logic. site.js must delegate
 * to window.LikeSystem instead of re-defining it. See T9.
 *
 * ---------------------------------------------------------------------------
 * BUGFIX (2026-09-04) — 点赞数被本地状态覆盖
 * ---------------------------------------------------------------------------
 * 旧实现把「全局点赞总数」和「我是否点过赞（本地 0/1）」两个语义不同的数字
 * 写进了同一个 `.count` 节点：
 *   - 点击瞬间 updateLikeUI(toolId) 用本地 0/1 覆盖全局总数 → 计数回跳（2 → 1）
 *   - 请求失败（429/403/500/超时）后永久停在被覆盖的值 → 计数丢失、不持久化
 *   - `liked` 红心态由 `count > 0` 推导 → 只要有人点过赞，所有访客都显示红心
 *
 * 修复：两个数字彻底分离。
 *   - 显示的数字永远以服务端返回的全局总数（serverCounts）为准；
 *     乐观更新是在「已知全局总数」上做 ±1，而不是写入本地 0/1。
 *   - `liked` 红心态只由本地个人状态（localStorage）决定。
 *   - 写请求失败时整体回滚（本地状态 + 显示值），绝不破坏已展示的全局计数。
 *
 * ---------------------------------------------------------------------------
 * BUGFIX (2026-09-05) — 三处既有用户可见缺陷
 * ---------------------------------------------------------------------------
 *   E8 localStorage 不可用（Cookie 全禁 / Safari 隐私模式）→ 点击按钮彻底
 *      失效 + 抛未捕获异常。saveLikes/getLikes 无 try/catch，paint 排在
 *      setLiked 之后。saveLikes/getLikes 加 try/catch + memLikes 内存降级，
 *      paint 始终在 setLiked 之前。
 *   过期 GET 覆盖：POST 后延迟返回的 GET 用旧值覆盖显示。bind 记录 GET
 *      发起时刻的 lastMutationAt，回调到达时若本地已发生新变更则丢弃。
 *   连点打满日限额（5 次/日/IP/工具）：toggle 加 300ms 防抖合并，
 *      静默期内多次点击只发 1 次写请求（action 为最终态）。
 */
(function () {
    'use strict';

    // P1-1：优先复用 ApiClient 的单一数据源；缺失时回退到本地常量（离线/独立运行）
    var _conf = (typeof window.ApiClient !== 'undefined' && window.ApiClient.config) || {};
    var LIKE_KEY = _conf.LIKE_KEY || 'toolbox_likes';
    var API_BASE = _conf.API_BASE || '/api/likes';
    var API_TIMEOUT = _conf.TIMEOUT_MS || 3000;

    /* ---------- localStorage (shared shape with site.js) ----------
     * saveLikes/getLikes 内置异常处理 + memLikes 内存降级镜像，
     * 保证 Cookie 全禁 / Safari 隐私模式下本会话内状态仍正确（不抛异常）。 */
    var memLikes = Object.create(null);
    function getLikes() {
        try {
            var raw = localStorage.getItem(LIKE_KEY);
            var parsed = raw ? JSON.parse(raw) : null;
            return (parsed && typeof parsed === 'object') ? parsed : {};
        } catch (e) {
            // localStorage 不可用：返回内存镜像拷贝
            return Object.assign({}, memLikes);
        }
    }
    function saveLikes(likes) {
        // 永远先更新内存镜像；localStorage 写入失败时静默降级为内存态
        memLikes = Object.assign({}, likes || {});
        try {
            localStorage.setItem(LIKE_KEY, JSON.stringify(memLikes));
        } catch (e) { /* 静默降级 */ }
    }
    function getTotalLikes(toolId) {
        return getLikes()[toolId] || 0;
    }

    /* ---------- 全局总数缓存（与"我是否点过赞"分离） ----------
     * serverCounts[id] === undefined 表示尚未拿到服务端数值，此时不改写页面数字。 */
    var serverCounts = Object.create(null);

    /* ---------- 防抖合并 POST ----------
     * 300ms 静默期内多次点击只发 1 次写请求，action 为最终态（避免连点打满日限额）。 */
    var DEBOUNCE_MS = 300;
    var debounceT = Object.create(null);     // id -> setTimeout handle
    var pendingAction = Object.create(null); // id -> boolean (目标 liked)

    /* ---------- 上次本地变更时间戳（过期 GET 守卫） ---------- */
    var lastMutationAt = Object.create(null);

    /** 读取"我是否点过赞"（本地个人状态，0/1 → boolean）。 */
    function isLiked(id) {
        return (getLikes()[id] || 0) > 0;
    }

    /** 写入"我是否点过赞"（本地个人状态）。
     *  saveLikes 已内置 try/catch，localStorage 不可用时静默降级为内存态。 */
    function setLiked(id, liked) {
        var likes = getLikes();
        likes[id] = liked ? 1 : 0;
        saveLikes(likes);
    }

    /** 服务端数值已知时在其上做 ±1；未知时退化为本地 0/1（与旧行为一致）。 */
    function optimisticCount(base, liked) {
        return (typeof base === 'number') ? Math.max(0, base + (liked ? 1 : -1)) : (liked ? 1 : 0);
    }

    /** 写请求失败回滚时恢复的显示值。 */
    function rollbackCount(base, liked) {
        return (typeof base === 'number') ? base : (liked ? 1 : 0);
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
    /**
     * 只做"渲染"，不掺入任何状态推导。
     * @param {NodeList|Array<Element>} nodes 需要渲染的按钮集合
     * @param {string} countSelector 计数节点选择器
     * @param {number|undefined} count 全局总数；undefined 表示未知，保持页面原值不动
     * @param {boolean} liked 我是否点过赞
     */
    function paint(nodes, countSelector, count, liked) {
        Array.prototype.forEach.call(nodes, function (el) {
            if (typeof count === 'number') {
                var countEl = el.querySelector(countSelector);
                if (countEl) countEl.textContent = count;
            }
            if (liked) { el.classList.add('liked'); } else { el.classList.remove('liked'); }
        });
    }

    function likeNodes(toolId) {
        return document.querySelectorAll('[data-like-id="' + toolId + '"]');
    }
    function articleNodes(blogId) {
        return document.querySelectorAll('.article-like[data-blog-id="' + blogId + '"]');
    }

    /**
     * 渲染工具点赞按钮。
     * @param {string} toolId 工具 id
     * @param {number=} count 服务端返回的全局总数（不传则沿用上次已知值）
     */
    function updateLikeUI(toolId, count) {
        if (typeof count === 'number') serverCounts[toolId] = count;
        paint(likeNodes(toolId), '.count', serverCounts[toolId], isLiked(toolId));
    }

    /**
     * 渲染博客点赞按钮。
     * @param {string} blogId 博客 id
     * @param {number=} count 服务端返回的全局总数（不传则沿用上次已知值）
     */
    function updateArticleUI(blogId, count) {
        if (typeof count === 'number') serverCounts[blogId] = count;
        paint(articleNodes(blogId), '.like-count', serverCounts[blogId], isLiked(blogId));
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
    /**
     * 点赞/取消点赞的通用流程（工具与博客共用）。
     * @param {string} id 工具 id 或博客 id
     * @param {function(string):NodeList} nodesOf 取按钮集合
     * @param {string} countSelector 计数节点选择器
     * @param {boolean} popHeart 是否播放心形动画
     */
    function toggle(id, nodesOf, countSelector, popHeart) {
        if (popHeart) heartPop(id);

        var was = isLiked(id);
        var next = !was;
        var base = serverCounts[id]; // 点击前的全局总数；undefined = 尚未拿到

        // 1) UI 立即翻转（在已知全局总数上 ±1），并记录本次本地变更时间戳
        //    paint 排在 setLiked 之前 → 即使 localStorage 抛异常（已被 saveLikes
        //    内部吞掉），UI 也已经更新，用户能看到反馈。
        lastMutationAt[id] = Date.now();
        paint(nodesOf(id), countSelector, optimisticCount(base, next), next);
        setLiked(id, next);

        // 2) 防抖合并 POST：300ms 静默期内多次点击只发 1 次写请求（避免连点
        //    打满后端 5次/日/IP/工具 限额），action 为最终态。
        pendingAction[id] = next;
        if (debounceT[id]) clearTimeout(debounceT[id]);
        debounceT[id] = setTimeout(function () {
            debounceT[id] = null;
            var expected = pendingAction[id]; // boolean（连点序列的最终目标态）
            pendingAction[id] = null;
            if (typeof expected !== 'boolean') return;
            var wasBefore = !expected;

            apiPost(id, expected ? 'like' : 'unlike').then(function (data) {
                if (data && typeof data.count === 'number') {
                    serverCounts[id] = data.count;
                    paint(nodesOf(id), countSelector, data.count, expected);
                } else {
                    // 失败回滚：恢复本地状态与显示值，保证已展示的全局计数不被破坏
                    setLiked(id, wasBefore);
                    paint(nodesOf(id), countSelector, rollbackCount(base, wasBefore), wasBefore);
                }
            });
        }, DEBOUNCE_MS);
    }

    function toggleLike(toolId) {
        toggle(toolId, likeNodes, '.count', true);
    }
    function toggleArticleLike(blogId) {
        toggle(blogId, articleNodes, '.like-count', false);
    }

    /**
     * 绑定按钮（幂等：data-initialized 守卫）。
     * @param {string} selector 按钮选择器
     * @param {string} idAttr 存放 id 的属性名
     * @param {function(string):NodeList} nodesOf 取按钮集合
     * @param {string} countSelector 计数节点选择器
     * @param {function(string):void} onToggle 点击回调
     */
    function bind(selector, idAttr, nodesOf, countSelector, onToggle) {
        document.querySelectorAll(selector + ':not([data-initialized])').forEach(function (btn) {
            var id = btn.getAttribute(idAttr);
            if (!id) return;
            btn.setAttribute('data-initialized', 'true');

            // 首屏只同步"我是否点过赞"的红心态；数字留待 GET 返回后再写，
            // 避免用本地 0/1 覆盖掉页面上的全局总数。
            paint(nodesOf(id), countSelector, serverCounts[id], isLiked(id));

            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                onToggle(id);
            });

            // 过期 GET 守卫：记录 GET 发起时刻的本地变更时间戳；回调到达时若
            // 本地已发生新变更（mutationAtSend 之后），则丢弃该 GET 旧值，
            // 防止「POST 后延迟 GET 用旧值覆盖已提交显示」的数据自相矛盾。
            var mutationAtSend = lastMutationAt[id] || 0;
            apiGet(id).then(function (data) {
                if (!data || typeof data.count !== 'number') return;
                if (typeof lastMutationAt[id] === 'number' && lastMutationAt[id] > mutationAtSend) return;
                serverCounts[id] = data.count;
                paint(nodesOf(id), countSelector, data.count, isLiked(id));
            });
        });
    }

    function initLikes() {
        bind('.like-btn', 'data-like-id', likeNodes, '.count', toggleLike);
    }
    function initArticleLikes() {
        bind('.article-like', 'data-blog-id', articleNodes, '.like-count', toggleArticleLike);
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
        initArticleLikes: initArticleLikes,
        /** 取最近一次从服务端拿到的全局总数（未拿到时为 undefined）。 */
        getServerCount: function (id) { return serverCounts[id]; },
        /** 测试钩子：调小防抖毫秒以加速测试。生产环境勿调。 */
        _setDebounceMs: function (ms) { DEBOUNCE_MS = ms; }
    };

    function boot() { initLikes(); initArticleLikes(); }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
    window.addEventListener('pageshow', boot);
})();