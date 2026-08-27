/**
 * embed.js — calc-tools.top 嵌入 widget 逻辑
 * 功能：读取 URL 参数 (?tool=&lang=&height=)，在 /embed.html 中加载对应工具页（iframe），
 *       并注入「由 calc-tools.top 提供」归属链接。带 ?tool= 时隐藏本页 header/footer（干净 widget）。
 * 依赖：/tools.json（公开，用于解析工具目录）；零第三方库；无内联脚本（CSP 合规）。
 */
(function () {
    'use strict';

    var SITE = 'https://www.calc-tools.top';

    function qs(name) {
        return new URLSearchParams(location.search).get(name) || '';
    }

    function hideChrome() {
        var body = document.body;
        if (body) body.classList.add('embed-active');
    }

    function init() {
        var slug = (qs('tool') || '').trim();
        var lang = (qs('lang') || 'zh').toLowerCase() === 'en' ? 'en' : 'zh';
        var height = parseInt(qs('height'), 10) || 640;
        var container = document.getElementById('embed-frame');
        var bar = document.getElementById('embed-attribution');
        if (!container) return;

        // 有工具参数 → 进入 widget 模式（隐藏本页 chrome）
        if (slug) hideChrome();

        if (!/^[a-z0-9-]+$/.test(slug)) {
            if (bar) bar.textContent = '请通过 ?tool=<slug>&lang=<zh|en> 指定要嵌入的工具。';
            return;
        }

        // 用同源相对路径 /tools.json（原为跨域 SITE + '/tools.json'，会被 CORS/网络影响导致工具加载失败）
        fetch('/tools.json')
            .then(function (r) { return r.json(); })
            .then(function (list) {
                var tool = list.find(function (t) { return t.slug === slug; });
                if (!tool) {
                    if (bar) bar.textContent = '未找到该工具。';
                    return;
                }
                var iframe = document.createElement('iframe');
                iframe.src = '/' + lang + '/' + tool.dir + '/' + tool.slug;
                iframe.className = 'embed-frame';
                iframe.setAttribute('style', 'width:100%;height:' + height + 'px;border:0;');
                iframe.setAttribute('loading', 'lazy');
                iframe.setAttribute('allow', 'fullscreen');
                container.appendChild(iframe);
                if (bar) {
                    bar.innerHTML = '<span class="embed-brand">免费在线工具</span> <a href="' + SITE + '/' + (lang === 'en' ? 'en/' : '') + '" target="_blank" rel="noopener">calc-tools.top</a>';
                }
            })
            .catch(function () {
                if (bar) bar.textContent = '工具加载失败。';
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
