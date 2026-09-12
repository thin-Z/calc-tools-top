/**
 * pwa.js — 注册 Service Worker（W3-2 PWA，离线/安装支持）。
 * 仅在生产环境注册（localhost 亦允许）；失败静默。
 *
 * ⚠️ 2026-09-13（「首次打开样式错乱」修复配套）：
 *   1) register 加 updateViaCache: 'none' —— sw.js 本身永远绕过 HTTP 缓存取新版，
 *      保证 SW 逻辑（含缓存策略修复）能及时生效，不被中间层缓存钉住。
 *   2) 监听 sw.js 发来的 'sw-cache-reset'（SW 升级时清除了历史脏缓存）：
 *      自动重载一次，使用户无需手动 Ctrl+F5。用 sessionStorage 守卫每会话至多一次；
 *      sessionStorage 不可用（隐私模式/被禁用）时直接跳过，绝不进入重载循环。
 */
(function () {
    'use strict';
    if (!('serviceWorker' in navigator)) return;

    var RESET_FLAG = 'sw-cache-reset-v2';

    navigator.serviceWorker.addEventListener('message', function (e) {
        var data = e && e.data;
        if (!data || data.type !== 'sw-cache-reset') return;
        try {
            if (sessionStorage.getItem(RESET_FLAG)) return;
            sessionStorage.setItem(RESET_FLAG, '1');
        } catch (err) {
            return; // 存储不可用则放弃自动重载，宁可少一次重载也不冒循环风险
        }
        location.reload();
    });

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(function () {});
    });
})();
