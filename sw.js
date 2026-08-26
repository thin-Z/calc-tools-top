/* calc-tools.top Service Worker (W3-2 PWA)
 * 策略（保守，避免干扰投放/统计）：
 *   - 导航请求：network-first，失败回退缓存（离线返回首页）。
 *   - 同源静态资源（css/js/img）：cache-first + 后台更新（stale-while-revalidate）。
 *   - 跨源请求（广告/GA/字体/CDN）：一律 network-only，不缓存。
 */
const CACHE = 'calc-tools-shell-v1';
const SHELL = ['/', '/manifest.json', '/css/style.css', '/js/theme-init.js', '/js/theme-toggle.js', '/js/i18n.js'];

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
            return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
        }).then(function () { return self.clients.claim(); })
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
                const copy = resp.clone();
                caches.open(CACHE).then(function (c) { c.put('/', copy); });
                return resp;
            }).catch(function () {
                return caches.match('/').then(function (hit) { return hit || caches.match(req); });
            })
        );
        return;
    }

    // 同源静态：cache-first + 后台更新
    if (url.pathname.match(/\.(css|js|svg|png|jpg|jpeg|webp|woff2?|ico)$/)) {
        event.respondWith(
            caches.match(req).then(function (cached) {
                const fetchPromise = fetch(req).then(function (resp) {
                    if (resp && resp.ok) {
                        const copy = resp.clone();
                        caches.open(CACHE).then(function (c) { c.put(req, copy); });
                    }
                    return resp;
                }).catch(function () { return cached; });
                return cached || fetchPromise;
            })
        );
    }
});
