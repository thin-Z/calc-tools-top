/**
 * Cookie Consent Banner for calc-tools.top
 * GDPR/CCPA compliant consent management
 */
(function() {
    "use strict";

    const COOKIE_CONSENT_KEY = "calc_tools_cookie_consent";
    const COOKIE_CONSENT_VERSION = 1;

    // AdSense 客户端 ID（与各页 head 中的静态标签一致）
    const ADSENSE_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1794930797650076";

    function getConsent() {
        try {
            const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                if (data.version === COOKIE_CONSENT_VERSION) {
                    return data;
                }
            }
        } catch (e) {}
        return null;
    }

    function setConsent(accepted) {
        const data = {
            accepted: accepted,
            version: COOKIE_CONSENT_VERSION,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(data));
        return data;
    }

    function createBanner() {
        // Check if banner already exists
        if (document.getElementById("cookie-consent-banner")) return;

        var isEn = window.location.pathname.startsWith("/en/");

        var banner = document.createElement("div");
        banner.id = "cookie-consent-banner";
        banner.innerHTML =
            "<div class=\"cookie-content\">" +
                "<div class=\"cookie-text\">" +
                    (isEn
                        ? "<p>This site uses cookies to improve your experience and serve personalized ads. <a href=\"/en/privacy.html\">Learn more</a>.</p>"
                        : "<p>本站使用 Cookie 来改善体验和展示个性化广告。 <a href=\"/privacy.html\">了解详情</a>。</p>") +
                "</div>" +
                "<div class=\"cookie-actions\">" +
                    (isEn
                        ? "<button class=\"cookie-btn cookie-btn-accept\" onclick=\"window.__acceptCookies()\">Accept All</button><button class=\"cookie-btn cookie-btn-decline\" onclick=\"window.__declineCookies()\">Decline</button>"
                        : "<button class=\"cookie-btn cookie-btn-accept\" onclick=\"window.__acceptCookies()\">接受</button><button class=\"cookie-btn cookie-btn-decline\" onclick=\"window.__declineCookies()\">拒绝</button>") +
                "</div>" +
            "</div>";
        document.body.appendChild(banner);

        // Trigger entrance animation
        requestAnimationFrame(function() {
            banner.classList.add("visible");
        });
    }

    function removeBanner() {
        var banner = document.getElementById("cookie-consent-banner");
        if (banner) {
            banner.classList.remove("visible");
            setTimeout(function() {
                if (banner.parentNode) banner.parentNode.removeChild(banner);
            }, 300);
        }
    }

    window.__acceptCookies = function() {
        setConsent(true);
        removeBanner();
        loadAdSense();
    };

    window.__declineCookies = function() {
        setConsent(false);
        removeBanner();
        // 拒绝时不加载 AdSense（保持隐私合规）
    };

    // 仅在用户已同意时动态注入 AdSense 脚本。
    // 幂等：同一页面只会注入一次。
    function loadAdSense() {
        try {
            if (window.__adsenseLoaded) return;
            var existing = document.querySelector('script[src*="adsbygoogle.js"]');
            if (existing) { window.__adsenseLoaded = true; return; }
            var s = document.createElement("script");
            s.async = true;
            s.src = ADSENSE_SRC;
            s.onload = function() { window.__adsenseLoaded = true; };
            s.onerror = function() { window.__adsenseLoaded = false; };
            document.head.appendChild(s);
            window.__adsenseLoaded = true;
        } catch (e) {}
    }

    // Initialize on DOM ready
    function init() {
        var consent = getConsent();
        if (!consent) {
            // Small delay so it doesn't block rendering
            setTimeout(createBanner, 500);
        } else if (consent.accepted) {
            // 已有同意记录：动态加载 AdSense
            loadAdSense();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
