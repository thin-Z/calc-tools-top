/**
 * pwa.js — 注册 Service Worker（W3-2 PWA，离线/安装支持）。
 * 仅在生产环境注册（localhost 亦允许）；失败静默。
 */
(function () {
    'use strict';
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
})();
