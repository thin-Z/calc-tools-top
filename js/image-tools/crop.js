/* ===== Image Crop Tool (图片裁剪) =====
 * 纯前端 Canvas 实现，无第三方依赖。
 * 功能：选择/拖拽图片 → 拖拽调整裁剪框（支持 8 个方向手柄）→ 比例锁定
 *       （自由 / 1:1 / 4:3 / 16:9）→ 实时预览 → 下载 PNG / JPEG。
 * 所有处理均在浏览器本地完成，图片不会上传到任何服务器。
 */
(function () {
    'use strict';

    var MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    var DISPLAY_MAX_W = 820; // 画布最大显示宽度
    var DISPLAY_MAX_H = 560; // 画布最大显示高度
    var MIN_RECT = 16;       // 裁剪框最小边长（显示像素）

    var state = {
        file: null,
        image: null,   // HTMLImageElement
        naturalW: 0,
        naturalH: 0,
        dispW: 0,
        dispH: 0,
        scale: 1,      // 显示像素 / 图像像素
        rect: null,    // {x, y, w, h} 显示坐标系
        ratio: 0,      // 宽高比锁定值，0 = 自由
        drag: null,    // {mode:'move'|'resize', handle, startX, startY, origRect, ratio}
        croppedCanvas: null
    };

    var canvas = null;
    var ctx = null;

    /* ---------- 工具函数 ---------- */
    function clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    function ratioFor(value) {
        if (value === '1:1') return 1;
        if (value === '4:3') return 4 / 3;
        if (value === '16:9') return 16 / 9;
        return 0;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    /* ---------- 初始化 ---------- */
    function init() {
        var dropZone = document.getElementById('dropZone');
        var fileInput = document.getElementById('fileInput');
        if (!dropZone || !fileInput) return;

        canvas = document.getElementById('cropCanvas');
        ctx = canvas.getContext('2d');

        dropZone.addEventListener('click', function (e) {
            if (e.target.tagName === 'INPUT') return;
            fileInput.click();
        });

        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) loadFile(e.target.files[0]);
        });

        dropZone.addEventListener('dragover', function (e) {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', function () {
            dropZone.classList.remove('drag-over');
        });
        dropZone.addEventListener('drop', function (e) {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
        });

        // 比例锁定
        document.querySelectorAll('input[name="cropRatio"]').forEach(function (el) {
            el.addEventListener('change', function () {
                state.ratio = ratioFor(el.value);
                applyRatioToRect();
                draw();
            });
        });

        document.getElementById('cropBtn').addEventListener('click', doCrop);
        document.getElementById('resetBtn').addEventListener('click', resetTool);
        document.getElementById('downloadPng').addEventListener('click', function () {
            downloadResult('image/png');
        });
        document.getElementById('downloadJpeg').addEventListener('click', function () {
            downloadResult('image/jpeg');
        });

        // 画布指针交互
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        canvas.addEventListener('pointerleave', onPointerUp);
    }

    /* ---------- 图片加载 ---------- */
    function loadFile(file) {
        if (!file.type || file.type.indexOf('image/') !== 0) {
            alert(getLang() === 'zh' ? '请选择图片文件。' : 'Please choose an image file.');
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            alert(getLang() === 'zh' ? '文件大小超过 50MB 限制。' : 'File size exceeds the 50MB limit.');
            return;
        }

        state.file = file;
        var reader = new FileReader();
        reader.onload = function (e) {
            var img = new Image();
            img.onload = function () {
                state.image = img;
                state.naturalW = img.naturalWidth || img.width;
                state.naturalH = img.naturalHeight || img.height;
                setupCanvas();
            };
            img.onerror = function () {
                alert(getLang() === 'zh' ? '图片加载失败，请换一张图片。' : 'Failed to load the image. Please try another file.');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function setupCanvas() {
        // 计算显示尺寸（保持宽高比，限制在最大范围内）
        var ratio = state.naturalW / state.naturalH;
        var dispW = Math.min(state.naturalW, DISPLAY_MAX_W);
        var dispH = Math.round(dispW / ratio);
        if (dispH > DISPLAY_MAX_H) {
            dispH = DISPLAY_MAX_H;
            dispW = Math.round(dispH * ratio);
        }

        state.dispW = dispW;
        state.dispH = dispH;
        state.scale = dispW / state.naturalW;

        canvas.width = dispW;
        canvas.height = dispH;

        // 初始裁剪框：默认占满整图（自由比例）
        state.rect = { x: 0, y: 0, w: dispW, h: dispH };

        var dz = document.getElementById('dropZone');
        if (dz) dz.style.display = 'none';
        document.getElementById('cropStage').classList.remove('hidden');
        document.getElementById('fileInfo').textContent = formatFileSize(state.file.size) + ' · ' + state.naturalW + ' × ' + state.naturalH + 'px';
        document.getElementById('resultArea').classList.add('hidden');

        // 若有比例锁定，应用一次
        var checked = document.querySelector('input[name="cropRatio"]:checked');
        if (checked) state.ratio = ratioFor(checked.value);
        applyRatioToRect();
        draw();
    }

    /* ---------- 绘制 ---------- */
    function draw() {
        ctx.clearRect(0, 0, state.dispW, state.dispH);
        ctx.drawImage(state.image, 0, 0, state.dispW, state.dispH);

        var r = state.rect;
        if (!r) return;

        // 四周压暗
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, state.dispW, r.y);
        ctx.fillRect(0, r.y + r.h, state.dispW, state.dispH - r.y - r.h);
        ctx.fillRect(0, r.y, r.x, r.h);
        ctx.fillRect(r.x + r.w, r.y, state.dispW - r.x - r.w, r.h);

        // 裁剪框边框
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // 三分线网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        var x1 = r.x + r.w / 3;
        var x2 = r.x + (r.w * 2) / 3;
        var y1 = r.y + r.h / 3;
        var y2 = r.y + (r.h * 2) / 3;
        ctx.beginPath();
        ctx.moveTo(x1, r.y); ctx.lineTo(x1, r.y + r.h);
        ctx.moveTo(x2, r.y); ctx.lineTo(x2, r.y + r.h);
        ctx.moveTo(r.x, y1); ctx.lineTo(r.x + r.w, y1);
        ctx.moveTo(r.x, y2); ctx.lineTo(r.x + r.w, y2);
        ctx.stroke();

        // 8 个手柄
        var handles = handlePositions(r);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        for (var i = 0; i < handles.length; i++) {
            var h = handles[i];
            ctx.fillRect(h.x - 4, h.y - 4, 8, 8);
            ctx.strokeRect(h.x - 4, h.y - 4, 8, 8);
        }

        // 尺寸信息
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(r.x, r.y - 22, 130, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px -apple-system, "Segoe UI", sans-serif';
        ctx.fillText(Math.round(r.w / state.scale) + ' × ' + Math.round(r.h / state.scale) + ' px', r.x + 6, r.y - 8);
    }

    function handlePositions(r) {
        var cx = r.x + r.w / 2;
        var cy = r.y + r.h / 2;
        return {
            nw: { x: r.x, y: r.y, key: 'nw' },
            n: { x: cx, y: r.y, key: 'n' },
            ne: { x: r.x + r.w, y: r.y, key: 'ne' },
            e: { x: r.x + r.w, y: cy, key: 'e' },
            se: { x: r.x + r.w, y: r.y + r.h, key: 'se' },
            s: { x: cx, y: r.y + r.h, key: 's' },
            sw: { x: r.x, y: r.y + r.h, key: 'sw' },
            w: { x: r.x, y: cy, key: 'w' }
        };
    }

    /* ---------- 指针交互 ---------- */
    function onPointerDown(e) {
        e.preventDefault();
        var pos = getPos(e);
        var r = state.rect;
        if (!r) return;

        // 命中手柄
        var handles = handlePositions(r);
        var hit = null;
        for (var key in handles) {
            if (handles.hasOwnProperty(key)) {
                var h = handles[key];
                if (Math.abs(pos.x - h.x) <= 8 && Math.abs(pos.y - h.y) <= 8) {
                    hit = key;
                    break;
                }
            }
        }

        if (hit) {
            state.drag = {
                mode: 'resize',
                handle: hit,
                startX: pos.x,
                startY: pos.y,
                origRect: { x: r.x, y: r.y, w: r.w, h: r.h },
                ratio: state.ratio
            };
        } else if (pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h) {
            state.drag = {
                mode: 'move',
                startX: pos.x,
                startY: pos.y,
                origRect: { x: r.x, y: r.y, w: r.w, h: r.h }
            };
        } else {
            // 在框外拖动：绘制新选框
            state.drag = {
                mode: 'new',
                startX: pos.x,
                startY: pos.y,
                origRect: { x: pos.x, y: pos.y, w: 0, h: 0 },
                ratio: state.ratio
            };
        }
        canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
        if (!state.drag) return;
        e.preventDefault();
        var pos = getPos(e);
        var d = state.drag;
        var dx = pos.x - d.startX;
        var dy = pos.y - d.startY;

        if (d.mode === 'move') {
            var nr = {
                x: clamp(d.origRect.x + dx, 0, state.dispW - d.origRect.w),
                y: clamp(d.origRect.y + dy, 0, state.dispH - d.origRect.h),
                w: d.origRect.w,
                h: d.origRect.h
            };
            state.rect = nr;
        } else if (d.mode === 'resize') {
            state.rect = resizeRect(d.origRect, d.handle, dx, dy, d.ratio);
        } else if (d.mode === 'new') {
            var x = Math.min(d.origRect.x, pos.x);
            var y = Math.min(d.origRect.y, pos.y);
            var w = Math.abs(pos.x - d.origRect.x);
            var h = Math.abs(pos.y - d.origRect.y);
            state.rect = makeRect(x, y, w, h, d.ratio);
        }
        draw();
    }

    function onPointerUp(e) {
        if (!state.drag) return;
        state.drag = null;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        draw();
    }

    function getPos(e) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    /* ---------- 几何计算 ---------- */
    function makeRect(x, y, w, h, ratio) {
        w = clamp(w, MIN_RECT, state.dispW);
        h = clamp(h, MIN_RECT, state.dispH);
        if (ratio > 0) {
            if (w / h > ratio) {
                w = h * ratio;
            } else {
                h = w / ratio;
            }
        }
        x = clamp(x, 0, state.dispW - w);
        y = clamp(y, 0, state.dispH - h);
        return { x: x, y: y, w: w, h: h };
    }

    function resizeRect(orig, handle, dx, dy, ratio) {
        var r = { x: orig.x, y: orig.y, w: orig.w, h: orig.h };
        var min = MIN_RECT;

        function setRect(x, y, w, h) {
            w = Math.max(w, min);
            h = Math.max(h, min);
            if (ratio > 0) {
                // 依据移动方向确定主轴，再按比例修正
                if (Math.abs(dx) >= Math.abs(dy)) {
                    h = w / ratio;
                } else {
                    w = h * ratio;
                }
            }
            // 根据手柄锚点修正位置
            if (handle.indexOf('w') !== -1) x = orig.x + orig.w - w;
            if (handle.indexOf('n') !== -1) y = orig.y + orig.h - h;

            // 边界约束
            if (x < 0) { x = 0; if (ratio > 0) { w = ratio > 0 && orig.w >= orig.h ? Math.min(orig.w, ratio * (state.dispH - y)) : orig.w; } }
            if (y < 0) { y = 0; }
            if (x + w > state.dispW) { w = state.dispW - x; if (ratio > 0) { h = w / ratio; if (handle.indexOf('n') !== -1) y = orig.y + orig.h - h; } }
            if (y + h > state.dispH) { h = state.dispH - y; if (ratio > 0) { w = h * ratio; if (handle.indexOf('w') !== -1) x = orig.x + orig.w - w; } }

            return { x: x, y: y, w: w, h: h };
        }

        if (handle === 'nw') return setRect(r.x + dx, r.y + dy, r.w - dx, r.h - dy);
        if (handle === 'n') return setRect(r.x, r.y + dy, r.w, r.h - dy);
        if (handle === 'ne') return setRect(r.x, r.y + dy, r.w + dx, r.h - dy);
        if (handle === 'e') return setRect(r.x, r.y, r.w + dx, r.h);
        if (handle === 'se') return setRect(r.x, r.y, r.w + dx, r.h + dy);
        if (handle === 's') return setRect(r.x, r.y, r.w, r.h + dy);
        if (handle === 'sw') return setRect(r.x + dx, r.y, r.w - dx, r.h + dy);
        if (handle === 'w') return setRect(r.x + dx, r.y, r.w - dx, r.h);
        return r;
    }

    function applyRatioToRect() {
        var r = state.rect;
        if (!r || state.ratio <= 0) return;
        // 以当前矩形中心为锚点，调整到目标比例
        var cx = r.x + r.w / 2;
        var cy = r.y + r.h / 2;
        var w = r.w;
        var h = w / state.ratio;
        if (h > state.dispH) {
            h = state.dispH;
            w = h * state.ratio;
        }
        state.rect = {
            x: clamp(cx - w / 2, 0, state.dispW - w),
            y: clamp(cy - h / 2, 0, state.dispH - h),
            w: w,
            h: h
        };
    }

    /* ---------- 裁剪输出 ---------- */
    function doCrop() {
        if (!state.image || !state.rect) return;
        var r = state.rect;

        var sx = clamp(Math.round(r.x / state.scale), 0, state.naturalW);
        var sy = clamp(Math.round(r.y / state.scale), 0, state.naturalH);
        var sw = clamp(Math.round(r.w / state.scale), 1, state.naturalW - sx);
        var sh = clamp(Math.round(r.h / state.scale), 1, state.naturalH - sy);

        var out = document.createElement('canvas');
        out.width = sw;
        out.height = sh;
        var octx = out.getContext('2d');
        octx.drawImage(state.image, sx, sy, sw, sh, 0, 0, sw, sh);

        state.croppedCanvas = out;

        // 预览
        var preview = document.getElementById('cropPreview');
        preview.src = out.toDataURL('image/png');
        document.getElementById('cropDims').textContent = sw + ' × ' + sh + 'px';

        var resultArea = document.getElementById('resultArea');
        resultArea.classList.remove('hidden');
        resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function downloadResult(type) {
        if (!state.croppedCanvas) return;
        var baseName = state.file ? state.file.name.replace(/\.[^.]+$/, '') : 'cropped';
        var ext = type === 'image/jpeg' ? 'jpg' : 'png';
        var mime = type;

        if (mime === 'image/jpeg') {
            state.croppedCanvas.toBlob(function (blob) {
                if (!blob) return;
                triggerDownload(blob, baseName + '_cropped.' + ext);
            }, mime, 0.92);
        } else {
            state.croppedCanvas.toBlob(function (blob) {
                if (!blob) return;
                triggerDownload(blob, baseName + '_cropped.' + ext);
            }, mime);
        }
    }

    function triggerDownload(blob, fileName) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    /* ---------- 重置 ---------- */
    function resetTool() {
        state.file = null;
        state.image = null;
        state.croppedCanvas = null;
        state.rect = null;
        state.drag = null;

        var fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        var dz = document.getElementById('dropZone');
        if (dz) dz.style.display = '';
        document.getElementById('cropStage').classList.add('hidden');
        document.getElementById('resultArea').classList.add('hidden');
        if (canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    /* ---------- 启动 ---------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
