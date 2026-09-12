/* calc-tools.top Service Worker (W3-2 PWA)
 * 策略（保守，避免干扰投放/统计）：
 *   - 导航请求：network-first，失败回退缓存（离线尽力返回同页，再退首页）。
 *   - 同源静态资源（css/js/img）：带版本戳的精确 URL 缓存优先（离线时退化为忽略查询串命中）。
 *   - 跨源请求（广告/GA/字体/CDN）：一律 network-only，不缓存。
 *
 * ⚠️ v2 修复（2026-09-13：「首次打开样式错乱、Ctrl+F5 才恢复」根因）
 *   旧版对静态资源用 cache-first + caches.match(req, { ignoreSearch: true })，
 *   **忽略查询串**——而构建脚本（scripts/build.mjs）正是靠 ?v=<构建戳> 做缓存失效。
 *   后果：新 HTML 引用 style.css?v=NEW，却被旧 SW 用 style.css?v=OLD 命中返回，
 *   线上表现为「新页面 + 上一版 CSS/JS」样式错乱；硬刷新绕过 SW 才恢复。
 *   本版三项修复：
 *     1) 静态资源改为**精确 URL 匹配（含 ?v=）**，让构建戳真正生效；
 *     2) CACHE 升级到 v2，activate 删除全部旧缓存，一次性清除历史脏资源；
 *     3) 若确实清除了旧缓存（老访客迁移），通知页面自动重载一次，用户无需手动 Ctrl+F5。
 *   另修：导航响应原先一律写入 key '/'（离线时任意页面都会拿到别页 HTML），改为按请求 URL 精确缓存。
 */

const CACHE = 'calc-tools-shell-v2';
/* 仅预缓存「无版本戳」的稳定 URL。
 * 注意：css/js 一律以 ?v=<构建戳> 请求（见 build.mjs 版本注入），因此这里不再预缓存
 * '/css/style.css' 等——带戳 URL 才是实际命中键，预缓存无戳键永远不会被匹配。 */
const SHELL = ['/', '/manifest.json'];

/* 同源静态资源（路径尾部扩展名判定，与 build.mjs 版本注入覆盖的扩展名对齐） */
const STATIC_RE = /\.(?:css|js|svg|png|jpe?g|gif|webp|ico|woff2?)$/;

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            return Promise.all(SHELL.map(function (u) {
                return cache.add(u).catch(function () {});
            }));
        }).then(function () { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            // 删除所有非当前版本的缓存（含历史上堆积的旧 ?v= 资源条目）
            const legacy = keys.filter(function (k) { return k !== CACHE; });
            return Promise.all(legacy.map(function (k) { return caches.delete(k); }))
                .then(function () { return legacy.length; });
        }).then(function (purgedLegacy) {
            return self.clients.claim().then(function () {
                if (!purgedLegacy) return;
                // 迁移提示：老访客当前页面可能已由旧 SW 喂过脏资源，通知重载一次。
                // 是否真的重载由页面侧（js/pwa.js）用 sessionStorage 守卫决定，每会话至多一次。
                return self.clients.matchAll({ type: 'window' }).then(function (list) {
                    list.forEach(function (client) { client.postMessage({ type: 'sw-cache-reset' }); });
                });
            });
        })
    );
});

self.addEventListener('fetch', function (event) {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // 跨源（广告/统计/字体/CDN）：不拦截、不缓存
    if (url.origin !== location.origin) return;

    // 导航：network-first，失败回退缓存
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).then(function (resp) {
                if (resp && resp.ok && resp.type === 'basic') {
                    const copy = resp.clone();
                    // 按真实请求 URL 精确缓存（旧版一律写 '/'，会导致离线时任意页面拿到别页 HTML）
                    caches.open(CACHE).then(function (c) { c.put(req, copy); });
                }
                return resp;
            }).catch(function () {
                return caches.match(req, { ignoreSearch: true }).then(function (hit) {
                    return hit || caches.match('/');
                });
            })
        );
        return;
    }

    // 同源静态：精确 URL 缓存优先（?v= 参与匹配 → 构建戳变更即自动取新资源）
    if (STATIC_RE.test(url.pathname)) {
        event.respondWith(
            caches.match(req).then(function (cached) {
                if (cached) return cached;
                return fetch(req).then(function (resp) {
                    if (resp && resp.ok && resp.type === 'basic') {
                        const copy = resp.clone();
                        caches.open(CACHE).then(function (c) { c.put(req, copy); });
                    }
                    return resp;
                }).catch(function () {
                    // 仅离线/网络失败路径才退化为忽略查询串命中（不影响线上新鲜度）
                    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
                        return hit || Response.error();
                    });
                });
            })
        );
    }
});
