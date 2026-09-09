/* ===== Color Picker from Image — 多渠道版（C1 上传 / C2 粘贴 / C3 链接 / C4 吸管 / C5 反查） =====
 * 设计依据：deliverables/color-picker-multi-channel-PRD.md 第 2/3/4/6 节（P0 范围）。
 *
 * 约定：
 *   - 保持 IIFE + var，全部事件用 JS 侧 el.onclick / addEventListener 绑定。
 *     ⚠️ 不要改写成 HTML 内联 onclick，也不要用 data-csp-*：本站 CSP 为
 *     script-src 'self'（无 unsafe-inline），且 data-csp-* 委托要求函数为顶层声明。
 *   - 5 个渠道共用同一个 #imageCanvas 与同一套取色/输出管线。
 *   - 不使用 alert()，全部错误走内联 .cp-error 错误条。
 */
(function () {
    'use strict';

    // ---------------------------------------------------------------- 常量
    var MAX_DIM = 1200;                       // 上传/粘贴/链接渠道的画布最长边
    var MAX_FILE_BYTES = 50 * 1024 * 1024;    // 本地上传 50MB
    var VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
    var TYPE_RE = /\.(jpg|jpeg|png|webp|bmp|gif)$/i;

    // 代理错误码 → 文案 key（body.error 优先，status 兜底）
    var URL_ERROR_MAP = {
        invalid_url: 'cp_err_url_invalid',
        invalid_protocol: 'cp_err_url_http',
        private_address: 'cp_err_url_private',
        redirect_limit: 'cp_err_url_redirect',
        too_large: 'cp_err_url_toolarge',
        unsupported_type: 'cp_err_url_type',
        too_many_requests: 'cp_err_url_rate',
        upstream_timeout: 'cp_err_url_timeout',
        fetch_failed: 'cp_err_url_unreachable',
        method_not_allowed: 'cp_err_url_unreachable'
    };

    // ---------------------------------------------------------------- 文案（PRD 6.x）
    var I18N = {
        zh: {
            cp_err_badtype: '不支持的文件格式。请上传 JPG、PNG、WebP、BMP 或 GIF 图片。',
            cp_err_toobig: '文件大小超过 50MB 限制。',
            cp_err_decode: '图片加载失败，请确认文件是否有效。',
            cp_paste_empty: '剪贴板里没有图片。请先截图，或改用「本地上传」。',
            cp_err_url_invalid: '链接格式不正确，请检查后重试。',
            cp_err_url_http: '仅支持 https 开头的链接。',
            cp_err_url_private: '该链接指向内网或本机地址，已拒绝加载。',
            cp_err_url_redirect: '该链接跳转次数过多，已停止加载。',
            cp_err_url_toolarge: '图片超过 8MB，请改用「本地上传」。',
            cp_err_url_type: '不是受支持的图片格式（JPG / PNG / WebP / BMP / GIF）。',
            cp_err_url_rate: '请求过于频繁，请稍后再试。',
            cp_err_url_timeout: '图片加载超时，请重试或改用「本地上传」。',
            cp_err_url_unreachable: '无法获取该图片，请确认链接可公开访问。',
            cp_loading: '加载中…',
            cp_screen_unsupported: '当前浏览器不支持屏幕捕获。请使用 Chrome / Edge 桌面版，或改用「粘贴截图」。',
            cp_screen_cancelled: '已取消屏幕共享，未捕获任何画面。',
            cp_screen_denied: '屏幕捕获被系统或浏览器策略拒绝。请改用「粘贴截图」。',
            cp_screen_failed: '屏幕捕获失败，请重试或改用「粘贴截图」。',
            cp_screen_captured: '已捕获一帧',
            cp_captured_label: '屏幕截图',
            cp_err_parse: '无法识别该色值，请使用 #RRGGBB、rgb() 或 hsl() 格式。',
            cp_err_copy: '复制失败，请手动选中色值后复制。',
            cp_copied: '已复制',
            cp_alpha_note: '该像素为半透明（不透明度 {pct}%），色值已包含 Alpha 通道。',
            cp_alpha_note_zero: '该像素完全透明，色值为 rgba(0,0,0,0)。'
        },
        en: {
            cp_err_badtype: 'Unsupported file type. Please upload a JPG, PNG, WebP, BMP or GIF image.',
            cp_err_toobig: 'The file exceeds the 50MB limit.',
            cp_err_decode: 'Could not load the image. Please make sure the file is valid.',
            cp_paste_empty: 'No image found in the clipboard. Take a screenshot first, or use Upload instead.',
            cp_err_url_invalid: 'That URL is not valid. Please check it and try again.',
            cp_err_url_http: 'Only https:// URLs are supported.',
            cp_err_url_private: 'That URL points to a private or local address and was blocked.',
            cp_err_url_redirect: 'That URL redirected too many times and was stopped.',
            cp_err_url_toolarge: 'The image is larger than 8MB. Please use Upload instead.',
            cp_err_url_type: 'Unsupported image format (JPG / PNG / WebP / BMP / GIF).',
            cp_err_url_rate: 'Too many requests. Please try again later.',
            cp_err_url_timeout: 'The image timed out. Please retry or use Upload instead.',
            cp_err_url_unreachable: 'Could not fetch that image. Make sure the URL is publicly accessible.',
            cp_loading: 'Loading…',
            cp_screen_unsupported: 'Your browser does not support screen capture. Use desktop Chrome / Edge, or use Paste instead.',
            cp_screen_cancelled: 'Screen sharing was cancelled; nothing was captured.',
            cp_screen_denied: 'Screen capture was blocked by your system or browser policy. Please use Paste instead.',
            cp_screen_failed: 'Screen capture failed. Please retry or use Paste instead.',
            cp_screen_captured: 'Captured one frame',
            cp_captured_label: 'Screen capture',
            cp_err_parse: 'Unrecognized color value. Use #RRGGBB, rgb() or hsl() format.',
            cp_err_copy: 'Copy failed. Please select the value and copy it manually.',
            cp_copied: 'Copied',
            cp_alpha_note: 'This pixel is semi-transparent ({pct}% opacity); the values include an alpha channel.',
            cp_alpha_note_zero: 'This pixel is fully transparent — the value is rgba(0,0,0,0).'
        }
    };

    // ---------------------------------------------------------------- 状态（PRD 3.2）
    var state = {
        channel: 'upload',   // 'upload' | 'paste' | 'url' | 'screen' | 'lookup'
        hasImage: false,     // canvas 中是否已有位图
        current: null,       // { r, g, b, a }，a 为 0-255
        fileLabel: '',       // #fileInfo 文案
        stream: null         // C4 的 MediaStream，切换渠道/重置时释放
    };

    var ctx = null;          // CanvasRenderingContext2D
    var suppressEcho = false;// C5 回填标志，防 input 解析回环
    var E = {};              // DOM 缓存

    // ---------------------------------------------------------------- 工具
    function $(id) { return document.getElementById(id); }

    function currentLang() {
        var docEl = document.documentElement;
        var lang = docEl && docEl.lang ? String(docEl.lang).toLowerCase() : '';
        return lang.indexOf('en') === 0 ? 'en' : 'zh';
    }

    /** 取本地化文案；vars 用于替换 {pct} 一类占位符。 */
    function t(key, vars) {
        var dict = I18N[currentLang()] || I18N.zh;
        var s = dict[key];
        if (typeof s !== 'string') s = typeof I18N.zh[key] === 'string' ? I18N.zh[key] : key;
        if (!vars) return s;
        for (var k in vars) {
            if (Object.prototype.hasOwnProperty.call(vars, k)) {
                s = s.split('{' + k + '}').join(String(vars[k]));
            }
        }
        return s;
    }

    function show(el, visible) {
        if (!el) return;
        if (visible) el.classList.remove('hidden');
        else el.classList.add('hidden');
    }

    function clamp255(n) {
        n = Math.round(n);
        if (n < 0) return 0;
        if (n > 255) return 255;
        return n;
    }

    function clamp01(n) {
        if (n < 0) return 0;
        if (n > 1) return 1;
        return n;
    }

    function pad2(n) {
        var s = Number(n).toString(16);
        return s.length === 1 ? '0' + s : s;
    }

    // ---------------------------------------------------------------- 错误条
    function errorKeyForChannel() {
        if (state.channel === 'paste') return 'pasteError';
        if (state.channel === 'url') return 'urlError';
        if (state.channel === 'screen') return 'screenError';
        if (state.channel === 'lookup') return 'lookupError';
        return 'uploadError';
    }

    function setError(id, msg) {
        var el = E[id];
        if (!el) return;
        el.textContent = msg;
        show(el, true);
    }

    function clearError(id) {
        var el = E[id];
        if (!el) return;
        el.textContent = '';
        show(el, false);
    }

    function clearAllErrors() {
        clearError('uploadError');
        clearError('pasteError');
        clearError('urlError');
        clearError('screenError');
        clearError('lookupError');
        clearError('copyError');
    }

    function showScreenNote(msg) {
        clearError('screenError');
        if (!E.screenNote) return;
        E.screenNote.textContent = msg || '';
        show(E.screenNote, !!(msg));
    }

    // ---------------------------------------------------------------- 颜色格式化（PRD 4.1）
    function alphaFloat(a) {
        return parseFloat((a / 255).toFixed(2));
    }

    function formatHex(c) {
        var base = pad2(c.r) + pad2(c.g) + pad2(c.b);
        return ('#' + base + (c.a < 255 ? pad2(c.a) : '')).toUpperCase();
    }

    function formatRgb(c) {
        var body = c.r + ',' + c.g + ',' + c.b;
        if (c.a < 255) return 'rgba(' + body + ',' + alphaFloat(c.a) + ')';
        return 'rgb(' + body + ')';
    }

    function formatHsl(c) {
        var hsl = rgbToHsl(c.r, c.g, c.b);
        var body = hsl.h + ',' + hsl.s + '%,' + hsl.l + '%';
        if (c.a < 255) return 'hsla(' + body + ',' + alphaFloat(c.a) + ')';
        return 'hsl(' + body + ')';
    }

    function rgbToHsl(r, g, b) {
        var rr = r / 255, gg = g / 255, bb = b / 255;
        var max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb);
        var h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
            else if (max === gg) h = ((bb - rr) / d + 2) / 6;
            else h = ((rr - gg) / d + 4) / 6;
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    function hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360;
        var c = (1 - Math.abs(2 * l - 1)) * s;
        var hp = h / 60;
        var x = c * (1 - Math.abs((hp % 2) - 1));
        var r = 0, g = 0, b = 0;
        if (hp >= 0 && hp < 1) { r = c; g = x; b = 0; }
        else if (hp < 2) { r = x; g = c; b = 0; }
        else if (hp < 3) { r = 0; g = c; b = x; }
        else if (hp < 4) { r = 0; g = x; b = c; }
        else if (hp < 5) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        var m = l - c / 2;
        return [clamp255((r + m) * 255), clamp255((g + m) * 255), clamp255((b + m) * 255)];
    }

    // ---------------------------------------------------------------- 色值解析（PRD 2.2 C5）
    function splitSlash(raw) {
        var s = String(raw);
        var idx = s.indexOf('/');
        if (idx === -1) return { main: s, alpha: null };
        return { main: s.slice(0, idx), alpha: s.slice(idx + 1) };
    }

    function splitNumbers(main) {
        return String(main).replace(/,/g, ' ').split(/\s+/).filter(function (p) { return p !== ''; });
    }

    /**
     * 拆出通道值与 alpha。
     * 支持两种写法：空格斜杠式（rgb(255 107 53 / 50%)）与遗留逗号式
     * （rgba(255,107,53,0.5)）——后者第 4 个值即 alpha。
     */
    function splitChannels(raw) {
        var parts = splitSlash(raw);
        var nums = splitNumbers(parts.main);
        var alpha = parts.alpha;
        if (alpha === null && nums.length === 4) {
            alpha = nums[3];
            nums = nums.slice(0, 3);
        }
        return { nums: nums, alpha: alpha };
    }

    function parseNumToken(tok) {
        var v = String(tok).trim();
        if (!v) return null;
        var pct = false;
        if (v.charAt(v.length - 1) === '%') { pct = true; v = v.slice(0, -1); }
        var n = parseFloat(v);
        if (isNaN(n)) return null;
        return { n: n, pct: pct };
    }

    function alphaFromToken(tok) {
        if (tok === null || tok === undefined) return 255;
        var p = parseNumToken(tok);
        if (p === null) return null;
        return clamp255(p.pct ? p.n / 100 * 255 : p.n * 255);
    }

    function parseRgbArgs(raw) {
        var parts = splitChannels(raw);
        var nums = parts.nums;
        if (nums.length !== 3) return null;
        var ch = [];
        for (var i = 0; i < 3; i++) {
            var p = parseNumToken(nums[i]);
            if (p === null) return null;
            ch.push(clamp255(p.pct ? p.n / 100 * 255 : p.n));
        }
        var a = alphaFromToken(parts.alpha);
        if (a === null) return null;
        return { r: ch[0], g: ch[1], b: ch[2], a: a };
    }

    function parseHslArgs(raw) {
        var parts = splitChannels(raw);
        var nums = parts.nums;
        if (nums.length !== 3) return null;
        var hTok = parseNumToken(nums[0]);
        var sTok = parseNumToken(nums[1]);
        var lTok = parseNumToken(nums[2]);
        if (hTok === null || sTok === null || lTok === null) return null;
        var a = alphaFromToken(parts.alpha);
        if (a === null) return null;
        var rgb = hslToRgb(hTok.n, clamp01(sTok.n / 100), clamp01(lTok.n / 100));
        return { r: rgb[0], g: rgb[1], b: rgb[2], a: a };
    }

    /**
     * 解析色值字符串，返回 { r,g,b,a }（a 为 0-255）或 null。
     * 支持：#RGB / #RGBA / #RRGGBB / #RRGGBBAA / 裸 hex（3/4/6/8 位）/
     *      rgb() rgba() hsl() hsla()（逗号或空格分隔，alpha 支持 0-1 与 0-100%）。
     * 不支持：CSS 颜色关键字、lab()/oklch()/color()（P1/P2）。
     */
    function parseColorString(input) {
        if (input === null || input === undefined) return null;
        var s = String(input).replace(/^\s+/, '').replace(/\s+$/, '');
        if (!s) return null;
        if (s.charAt(0) === '#') s = s.slice(1);
        if (/^[0-9a-fA-F]{3}$/.test(s) || /^[0-9a-fA-F]{4}$/.test(s) ||
            /^[0-9a-fA-F]{6}$/.test(s) || /^[0-9a-fA-F]{8}$/.test(s)) {
            var h = s.toLowerCase();
            if (h.length === 3 || h.length === 4) {
                var ex = '';
                for (var i = 0; i < h.length; i++) ex += h.charAt(i) + h.charAt(i);
                h = ex;
            }
            return {
                r: parseInt(h.slice(0, 2), 16),
                g: parseInt(h.slice(2, 4), 16),
                b: parseInt(h.slice(4, 6), 16),
                a: h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255
            };
        }
        var mRgb = s.match(/^rgba?\(([^()]*)\)$/i);
        if (mRgb) return parseRgbArgs(mRgb[1]);
        var mHsl = s.match(/^hsla?\(([^()]*)\)$/i);
        if (mHsl) return parseHslArgs(mHsl[1]);
        return null;
    }

    // ---------------------------------------------------------------- 渲染
    function setValue(el, text) {
        if (!el) return;
        el.setAttribute('data-original', text);
        // 复制反馈期间不覆盖用户看到的「✓ 已复制」，仅更新待还原值
        if (el.getAttribute('data-copied') === '1') return;
        el.textContent = text;
    }

    function renderOutputs() {
        var c = state.current;
        if (!c) return;
        if (E.colorSwatch) {
            E.colorSwatch.style.backgroundColor = 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alphaFloat(c.a) + ')';
        }
        setValue(E.hexValue, formatHex(c));
        setValue(E.rgbValue, formatRgb(c));
        setValue(E.hslValue, formatHsl(c));
        if (E.alphaNote) {
            if (c.a >= 255) {
                show(E.alphaNote, false);
            } else {
                E.alphaNote.textContent = c.a === 0
                    ? t('cp_alpha_note_zero')
                    : t('cp_alpha_note', { pct: Math.round(c.a / 255 * 100) });
                show(E.alphaNote, true);
            }
        }
    }

    function echoColorToLookup() {
        var c = state.current;
        if (!c) return;
        suppressEcho = true;
        var hex6 = ('#' + pad2(c.r) + pad2(c.g) + pad2(c.b)).toLowerCase();
        if (E.colorWheel) E.colorWheel.value = hex6;
        // 用户正在输入框里打字时不要回写，避免光标跳动/内容被吞
        if (E.colorTextInput && document.activeElement !== E.colorTextInput) {
            E.colorTextInput.value = hex6;
        }
        suppressEcho = false;
    }

    function updateFileInfo() {
        if (E.fileInfo) E.fileInfo.textContent = state.fileLabel;
    }

    function render() {
        var ch = state.channel;
        show(E.panelUpload, ch === 'upload' && !state.hasImage);
        show(E.panelPaste, ch === 'paste' && !state.hasImage);
        show(E.panelUrl, ch === 'url');
        show(E.panelScreen, ch === 'screen');
        show(E.panelLookup, ch === 'lookup');
        // 画布在 C5 隐藏（图片仍在内存），切回 C1–C4 时恢复显示
        show(E.pickerContainer, state.hasImage && ch !== 'lookup');
        show(E.colorInfo, !!state.current);
        show(E.screenRecaptureBtn, state.hasImage && ch === 'screen');
        updateFileInfo();
        if (E.resetBtn) E.resetBtn.disabled = !(state.hasImage || state.current);
    }

    /** 选中一个颜色（所有渠道的唯一出口）。 */
    function applyColor(r, g, b, a) {
        if (typeof a !== 'number' || isNaN(a)) a = 255;
        state.current = { r: clamp255(r), g: clamp255(g), b: clamp255(b), a: clamp255(a) };
        renderOutputs();
        echoColorToLookup();
        render();
    }

    // ---------------------------------------------------------------- 画布
    function drawToCanvas(source, w, h, scale) {
        if (!E.canvas) return false;
        if (scale && (w > MAX_DIM || h > MAX_DIM)) {
            var ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
            w = Math.floor(w * ratio);
            h = Math.floor(h * ratio);
        }
        w = Math.max(1, Math.floor(w));
        h = Math.max(1, Math.floor(h));
        E.canvas.width = w;
        E.canvas.height = h;
        ctx = E.canvas.getContext('2d');
        if (!ctx) return false;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(source, 0, 0, w, h);
        state.hasImage = true;
        render();
        return true;
    }

    function pointFromEvent(e) {
        if (!E.canvas) return null;
        var rect = E.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        var sx = E.canvas.width / rect.width;
        var sy = E.canvas.height / rect.height;
        var x = Math.floor((e.clientX - rect.left) * sx);
        var y = Math.floor((e.clientY - rect.top) * sy);
        if (x < 0 || y < 0 || x >= E.canvas.width || y >= E.canvas.height) return null;
        return { x: x, y: y };
    }

    function pickColor(x, y) {
        if (!ctx) return;
        var data;
        try {
            data = ctx.getImageData(x, y, 1, 1).data;
        } catch (err) {
            return; // 理论上不会触发（blob:/data: 均同源），保留以防 canvas 被污染
        }
        applyColor(data[0], data[1], data[2], data[3]);
    }

    // ---------------------------------------------------------------- C1 本地上传
    function loadFile(file) {
        if (!file) return;
        var key = errorKeyForChannel();
        var validType = VALID_TYPES.indexOf(String(file.type || '').toLowerCase()) > -1 ||
            TYPE_RE.test(String(file.name || ''));
        if (!validType) { setError(key, t('cp_err_badtype')); return; }
        if (file.size > MAX_FILE_BYTES) { setError(key, t('cp_err_toobig')); return; }
        clearError(key);
        var reader = new FileReader();
        reader.onload = function (ev) {
            loadImage(String(ev.target.result), String(file.name || ''), false);
        };
        reader.onerror = function () { setError(errorKeyForChannel(), t('cp_err_decode')); };
        reader.readAsDataURL(file);
    }

    /** 通用图片装载：src 可为 data: / blob: / http(s): 直链。 */
    function loadImage(src, label, isObjectUrl) {
        var img = new Image();
        img.onload = function () {
            if (isObjectUrl) URL.revokeObjectURL(src);
            var w = img.naturalWidth || img.width;
            var h = img.naturalHeight || img.height;
            if (w < 1 || h < 1) { setError(errorKeyForChannel(), t('cp_err_decode')); return; }
            if (!drawToCanvas(img, w, h, true)) { setError(errorKeyForChannel(), t('cp_err_decode')); return; }
            state.fileLabel = w + ' x ' + h + 'px' + (label ? ' | ' + label : '');
            updateFileInfo();
        };
        img.onerror = function () {
            if (isObjectUrl) URL.revokeObjectURL(src);
            setError(errorKeyForChannel(), t('cp_err_decode'));
            if (state.channel === 'url') show(E.urlFallbackWrap, true);
        };
        img.src = src;
    }

    // ---------------------------------------------------------------- C3 图片链接
    function labelFromUrl(u) {
        var seg = String(u.pathname || '').split('/').pop();
        return seg || u.hostname || '';
    }

    function setUrlLoading(loading) {
        if (!E.urlLoadBtn) return;
        E.urlLoadBtn.disabled = loading;
        if (loading) {
            if (!E.urlLoadBtn.hasAttribute('data-idle-label')) {
                E.urlLoadBtn.setAttribute('data-idle-label', E.urlLoadBtn.textContent);
            }
            E.urlLoadBtn.textContent = t('cp_loading');
        } else if (E.urlLoadBtn.hasAttribute('data-idle-label')) {
            E.urlLoadBtn.textContent = E.urlLoadBtn.getAttribute('data-idle-label');
        }
    }

    /** C3 所有失败路径都提供一键切回 C1（PRD 2.2 C3「所有失败路径都提供一键切到 C1」）。 */
    function urlFail(key) {
        setError('urlError', t(key));
        show(E.urlFallbackWrap, true);
    }

    function urlErrorKey(status, code) {
        if (code && URL_ERROR_MAP[code]) return URL_ERROR_MAP[code];
        if (status === 429) return 'cp_err_url_rate';
        if (status === 413) return 'cp_err_url_toolarge';
        if (status === 415) return 'cp_err_url_type';
        if (status === 504) return 'cp_err_url_timeout';
        if (status === 400) return 'cp_err_url_invalid';
        return 'cp_err_url_unreachable';
    }

    function loadFromUrl() {
        var raw = String(E.urlInput ? E.urlInput.value : '').replace(/^\s+/, '').replace(/\s+$/, '');
        clearError('urlError');
        show(E.urlFallbackWrap, false);
        if (!raw) { urlFail('cp_err_url_invalid'); return; }
        var u = null;
        try { u = new URL(raw); } catch (e) { u = null; }
        if (!u) { urlFail('cp_err_url_invalid'); return; }
        if (u.protocol !== 'https:') { urlFail('cp_err_url_http'); return; }

        setUrlLoading(true);
        fetch('/api/image-proxy?url=' + encodeURIComponent(raw)).then(function (res) {
            setUrlLoading(false);
            if (!res.ok) {
                return res.json().catch(function () { return {}; }).then(function (body) {
                    urlFail(urlErrorKey(res.status, body && body.error));
                });
            }
            return res.blob().then(function (blob) {
                var type = String(blob.type || '').toLowerCase();
                if (VALID_TYPES.indexOf(type) === -1) {
                    urlFail('cp_err_url_type');
                    return;
                }
                var objUrl = URL.createObjectURL(blob);
                loadImage(objUrl, labelFromUrl(u), true);
            });
        }).catch(function () {
            setUrlLoading(false);
            urlFail('cp_err_url_unreachable');
        });
    }

    // ---------------------------------------------------------------- C4 屏幕吸管
    function screenSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) && !!window.isSecureContext;
    }

    function ensureVideo() {
        if (E.video) return E.video;
        var v = document.createElement('video');
        v.autoplay = true;
        v.muted = true;
        v.playsInline = true;
        v.setAttribute('playsinline', '');
        v.setAttribute('aria-hidden', 'true');
        v.style.display = 'none';
        document.body.appendChild(v);
        E.video = v;
        return v;
    }

    function stopStream() {
        if (state.stream) {
            var tracks = state.stream.getTracks ? state.stream.getTracks() : [];
            for (var i = 0; i < tracks.length; i++) {
                try { tracks[i].stop(); } catch (e) { /* 已停止的轨道忽略 */ }
            }
            state.stream = null;
        }
        if (E.video) E.video.srcObject = null;
    }

    function captureFrame(video) {
        var w = video.videoWidth;
        var h = video.videoHeight;
        if (w < 1 || h < 1) {
            setError('screenError', t('cp_screen_failed'));
            show(E.screenFallbackWrap, true);
            stopStream();
            return;
        }
        // 快照模式：整帧入画布，不缩放（PRD 2.2 C4 步骤 9）
        if (!drawToCanvas(video, w, h, false)) {
            setError('screenError', t('cp_screen_failed'));
            show(E.screenFallbackWrap, true);
            stopStream();
            return;
        }
        state.fileLabel = t('cp_captured_label') + ' ' + w + ' x ' + h + 'px';
        updateFileInfo();
        stopStream(); // 捕获一帧后立即释放屏幕共享
        showScreenNote(t('cp_screen_captured'));
    }

    function startScreenCapture() {
        clearError('screenError');
        show(E.screenNote, false);
        if (!screenSupported()) {
            setError('screenError', t('cp_screen_unsupported'));
            show(E.screenFallbackWrap, true);
            return;
        }
        navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false })
            .then(function (stream) {
                stopStream();
                state.stream = stream;
                var video = ensureVideo();
                video.srcObject = stream;
                video.onloadeddata = function () { captureFrame(video); };
                var playResult = video.play();
                if (playResult && playResult.catch) playResult.catch(function () { /* autoplay 拒绝不影响 loadeddata */ });
            })
            .catch(function (err) {
                var name = err && err.name;
                if (name === 'NotAllowedError') {
                    showScreenNote(t('cp_screen_cancelled'));   // 用户主动取消：非错误态
                    return;
                }
                if (name === 'NotReadableError') {
                    setError('screenError', t('cp_screen_denied'));
                } else {
                    setError('screenError', t('cp_screen_failed'));
                }
                show(E.screenFallbackWrap, true);
            });
    }

    function initScreenCapability() {
        if (screenSupported()) return;
        var input = $('chScreen');
        if (input) input.disabled = true;
        var label = document.querySelector('label[for="chScreen"]');
        if (label) {
            label.classList.add('is-disabled');
            label.setAttribute('title', t('cp_screen_unsupported'));
        }
        if (E.screenStartBtn) E.screenStartBtn.disabled = true;
        setError('screenError', t('cp_screen_unsupported'));
        show(E.screenFallbackWrap, true);
    }

    // ---------------------------------------------------------------- C5 色值反查
    function parseFromTextInput() {
        if (suppressEcho || !E.colorTextInput) return;
        var c = parseColorString(E.colorTextInput.value);
        if (!c) {
            E.colorTextInput.classList.add('is-invalid');
            setError('lookupError', t('cp_err_parse'));
            return; // 解析失败不清空上一次已渲染的输出结果
        }
        E.colorTextInput.classList.remove('is-invalid');
        clearError('lookupError');
        applyColor(c.r, c.g, c.b, c.a);
    }

    // ---------------------------------------------------------------- 复制
    function legacyCopy(text) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', 'readonly');
            ta.style.position = 'fixed';
            ta.style.top = '-1000px';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            if (ta.setSelectionRange) ta.setSelectionRange(0, ta.value.length);
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return !!ok;
        } catch (e) {
            return false;
        }
    }

    /** @returns {Promise<boolean>} 复制是否成功 */
    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () {
                return true;
            }, function () {
                return legacyCopy(text);
            });
        }
        return Promise.resolve(legacyCopy(text));
    }

    function flashCopied(el) {
        var fmt = el.getAttribute('data-fmt') || '';
        var msg = '✓ ' + t('cp_copied') + (fmt ? ' ' + fmt : '');
        if (E.copyStatus) E.copyStatus.textContent = msg;
        el.classList.add('copied');
        if (el.getAttribute('data-copied') === '1') return;
        el.setAttribute('data-copied', '1');
        var original = el.getAttribute('data-original');
        if (original === null) original = el.textContent;
        el.textContent = msg;
        setTimeout(function () {
            var restore = el.getAttribute('data-original');
            el.textContent = restore === null ? original : restore;
            el.classList.remove('copied');
            el.removeAttribute('data-copied');
            if (E.copyStatus) E.copyStatus.textContent = '';
        }, 1500);
    }

    // ---------------------------------------------------------------- 渠道切换
    function readChannel() {
        var inputs = document.getElementsByName('cpChannel');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].checked) return inputs[i].value;
        }
        return 'upload';
    }

    function switchChannel(value) {
        var inputs = document.getElementsByName('cpChannel');
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].value === value) {
                inputs[i].checked = true;
                break;
            }
        }
        onChannelChange();
    }

    function onChannelChange() {
        stopStream();
        clearAllErrors();
        state.channel = readChannel();
        if (state.channel === 'lookup') echoColorToLookup();
        render();
    }

    // ---------------------------------------------------------------- 重置
    function resetTool() {
        stopStream();
        state.hasImage = false;
        state.current = null;
        state.fileLabel = '';
        if (E.canvas) {
            if (ctx) ctx.clearRect(0, 0, E.canvas.width, E.canvas.height);
            E.canvas.width = 0;
            E.canvas.height = 0;
        }
        if (E.fileInput) E.fileInput.value = '';
        if (E.urlInput) E.urlInput.value = '';
        if (E.hoverPreview) E.hoverPreview.style.backgroundColor = '';
        if (E.hoverHex) E.hoverHex.textContent = '-';
        if (E.hoverCoords) E.hoverCoords.textContent = '-';
        if (E.colorSwatch) E.colorSwatch.style.backgroundColor = '';
        if (E.copyStatus) E.copyStatus.textContent = '';
        clearAllErrors();
        show(E.alphaNote, false);
        show(E.urlFallbackWrap, false);
        show(E.screenFallbackWrap, false);
        show(E.screenNote, false);
        setUrlLoading(false);
        render();
    }

    // ---------------------------------------------------------------- 绑定
    function bindChannels() {
        var inputs = document.getElementsByName('cpChannel');
        for (var i = 0; i < inputs.length; i++) {
            inputs[i].onchange = onChannelChange;
        }
    }

    function bindUpload() {
        if (!E.dropZone || !E.fileInput) return;
        E.dropZone.onclick = function (e) {
            if (e.target && e.target.tagName === 'INPUT') return;
            E.fileInput.click();
        };
        E.fileInput.onchange = function () {
            if (this.files && this.files.length > 0) loadFile(this.files[0]);
        };
        E.dropZone.ondragover = function (e) {
            e.preventDefault();
            E.dropZone.classList.add('drag-over');
        };
        E.dropZone.ondragleave = function () {
            E.dropZone.classList.remove('drag-over');
        };
        E.dropZone.ondrop = function (e) {
            e.preventDefault();
            E.dropZone.classList.remove('drag-over');
            var files = e.dataTransfer && e.dataTransfer.files;
            if (files && files.length > 0) loadFile(files[0]);
        };
    }

    function bindCanvas() {
        if (!E.canvas) return;
        E.canvas.onclick = function (e) {
            if (!state.hasImage || !ctx) return;
            var p = pointFromEvent(e);
            if (p) pickColor(p.x, p.y);
        };
        E.canvas.onmousemove = function (e) {
            if (!state.hasImage || !ctx) return;
            var p = pointFromEvent(e);
            if (!p) return;
            var d;
            try {
                d = ctx.getImageData(p.x, p.y, 1, 1).data;
            } catch (err) {
                return;
            }
            var hex = ('#' + pad2(d[0]) + pad2(d[1]) + pad2(d[2])).toUpperCase();
            if (E.hoverPreview) E.hoverPreview.style.backgroundColor = 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + alphaFloat(d[3]) + ')';
            if (E.hoverHex) E.hoverHex.textContent = hex;
            if (E.hoverCoords) E.hoverCoords.textContent = p.x + ', ' + p.y;
        };
    }

    function bindUrl() {
        if (E.urlLoadBtn) E.urlLoadBtn.onclick = loadFromUrl;
        if (E.urlInput) {
            E.urlInput.onkeydown = function (e) {
                if (e.key === 'Enter' || e.keyCode === 13) {
                    e.preventDefault();
                    loadFromUrl();
                }
            };
        }
        if (E.fallbackUploadBtn) {
            E.fallbackUploadBtn.onclick = function () { switchChannel('upload'); };
        }
    }

    function bindScreen() {
        if (E.screenStartBtn) E.screenStartBtn.onclick = startScreenCapture;
        if (E.screenRecaptureBtn) E.screenRecaptureBtn.onclick = startScreenCapture;
        if (E.screenFallbackBtn) {
            E.screenFallbackBtn.onclick = function () { switchChannel('paste'); };
        }
    }

    function bindLookup() {
        if (E.colorWheel) {
            E.colorWheel.oninput = function () {
                var c = parseColorString(this.value);
                if (!c) return;
                clearError('lookupError');
                if (E.colorTextInput) E.colorTextInput.classList.remove('is-invalid');
                applyColor(c.r, c.g, c.b, c.a);
            };
        }
        if (E.colorTextInput) E.colorTextInput.oninput = parseFromTextInput;
        if (E.colorParseBtn) E.colorParseBtn.onclick = parseFromTextInput;
    }

    function bindPaste() {
        document.addEventListener('paste', function (e) {
            var active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            var items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            var file = null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].kind === 'file' && String(items[i].type || '').indexOf('image/') === 0) {
                    file = items[i].getAsFile();
                    if (file) break;
                }
            }
            if (!file) {
                // 不拦截默认粘贴行为；仅当用户在「粘贴截图」渠道时才提示
                if (state.channel === 'paste') setError('pasteError', t('cp_paste_empty'));
                return;
            }
            e.preventDefault();
            switchChannel('paste');
            loadFile(file);
        });
    }

    function bindCopy() {
        document.addEventListener('click', function (e) {
            var el = e.target;
            while (el) {
                if (el.classList && el.classList.contains('color-value')) {
                    // 复制反馈期间 textContent 会被改为「✓ 已复制」，必须用 data-original 里的真实色值；
                    // 取不到（理论上首次点击前已 set）时再退化到 textContent。
                    var raw = el.getAttribute('data-original');
                    var text = (raw != null ? String(raw) : String(el.textContent || '')).replace(/^\s+/, '').replace(/\s+$/, '');
                    copyText(text).then(function (ok) {
                        if (ok) {
                            clearError('copyError');
                            flashCopied(el);
                        } else {
                            setError('copyError', t('cp_err_copy'));
                        }
                    });
                    return;
                }
                el = el.parentElement;
            }
        });
    }

    // ---------------------------------------------------------------- 初始化
    function cacheEls() {
        E.panelUpload = $('panelUpload');
        E.panelPaste = $('panelPaste');
        E.panelUrl = $('panelUrl');
        E.panelScreen = $('panelScreen');
        E.panelLookup = $('panelLookup');
        E.pickerContainer = $('pickerContainer');
        E.colorInfo = $('colorInfo');
        E.dropZone = $('dropZone');
        E.fileInput = $('fileInput');
        E.canvas = $('imageCanvas');
        E.fileInfo = $('fileInfo');
        E.hoverPreview = $('hoverPreview');
        E.hoverHex = $('hoverHex');
        E.hoverCoords = $('hoverCoords');
        E.colorSwatch = $('colorSwatch');
        E.hexValue = $('hexValue');
        E.rgbValue = $('rgbValue');
        E.hslValue = $('hslValue');
        E.copyStatus = $('copyStatus');
        E.alphaNote = $('alphaNote');
        E.resetBtn = $('resetBtn');
        E.urlInput = $('urlInput');
        E.urlLoadBtn = $('urlLoadBtn');
        E.urlFallbackWrap = $('urlFallbackWrap');
        E.fallbackUploadBtn = $('fallbackUploadBtn');
        E.uploadError = $('uploadError');
        E.pasteError = $('pasteError');
        E.urlError = $('urlError');
        E.screenError = $('screenError');
        E.lookupError = $('lookupError');
        E.copyError = $('copyError');
        E.screenStartBtn = $('screenStartBtn');
        E.screenRecaptureBtn = $('screenRecaptureBtn');
        E.screenFallbackBtn = $('screenFallbackBtn');
        E.screenFallbackWrap = $('screenFallbackWrap');
        E.screenNote = $('screenNote');
        E.colorWheel = $('colorWheel');
        E.colorTextInput = $('colorTextInput');
        E.colorParseBtn = $('colorParseBtn');
    }

    function init() {
        cacheEls();
        if (!E.canvas) return;
        state.channel = readChannel();
        bindChannels();
        bindUpload();
        bindCanvas();
        bindUrl();
        bindScreen();
        bindLookup();
        bindPaste();
        bindCopy();
        if (E.resetBtn) E.resetBtn.onclick = resetTool;
        initScreenCapability();
        render();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
