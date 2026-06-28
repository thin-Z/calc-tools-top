/* ===== Color Picker from Image Tool (rewritten) ===== */
(function() {
    'use strict';

    var canvas = null;
    var ctx = null;
    var imgLoaded = false;

    function init() {
        var dz = document.getElementById('dropZone');
        var fi = document.getElementById('fileInput');
        var ic = document.getElementById('imageCanvas');
        var rb = document.getElementById('resetBtn');

        if (!dz || !fi || !ic || !rb) return;

        dz.onclick = function(e) { if (e.target.tagName === 'INPUT') return; fi.click(); };

        fi.onchange = function(e) {
            if (e.target.files.length > 0) loadFile(e.target.files[0]);
        };

        dz.ondragover = function(e) { e.preventDefault(); dz.classList.add('drag-over'); };
        dz.ondragleave = function() { dz.classList.remove('drag-over'); };
        dz.ondrop = function(e) {
            e.preventDefault();
            dz.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
        };

        ic.onclick = function(e) {
            if (!imgLoaded) return;
            var rect = this.getBoundingClientRect();
            var sx = this.width / rect.width;
            var sy = this.height / rect.height;
            var px = Math.floor((e.clientX - rect.left) * sx);
            var py = Math.floor((e.clientY - rect.top) * sy);
            pickColor(px, py);
        };

        ic.onmousemove = function(e) {
            if (!imgLoaded || !ctx) return;
            var rect = this.getBoundingClientRect();
            var sx = this.width / rect.width;
            var sy = this.height / rect.height;
            var px = Math.floor((e.clientX - rect.left) * sx);
            var py = Math.floor((e.clientY - rect.top) * sy);
            if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
                var p = ctx.getImageData(px, py, 1, 1).data;
                var h = rgbToHex(p[0], p[1], p[2]);
                var el = document.getElementById('hoverPreview');
                if (el) el.style.backgroundColor = h;
                var el2 = document.getElementById('hoverCoords');
                if (el2) el2.textContent = px + ', ' + py;
                var el3 = document.getElementById('hoverHex');
                if (el3) el3.textContent = h;
            }
        };

        rb.onclick = resetTool;
    }

    function loadFile(file) {
        var validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];
        var isValidType = validTypes.indexOf(file.type) > -1 ||
            /.(jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name);
        if (!isValidType) {
            alert('不支持的文件格式。请上传 JPG、PNG、WebP、BMP 或 GIF 图片。');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            alert('文件大小超过 50MB 限制。');
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = new Image();
            img.onerror = function() {
                alert('图片加载失败，请确认文件是否有效。');
            };
            img.onload = function() {
                var w = img.width;
                var h = img.height;
                if (w < 1 || h < 1) {
                    alert('图片尺寸有误，请换一张图片。');
                    return;
                }
                if (w > 1200 || h > 1200) {
                    var r = Math.min(1200 / w, 1200 / h);
                    w = Math.floor(w * r);
                    h = Math.floor(h * r);
                }
                canvas = document.getElementById('imageCanvas');
                if (!canvas) return;
                canvas.width = w;
                canvas.height = h;
                ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                imgLoaded = true;

                var dz = document.getElementById('dropZone');
                if (dz) dz.style.display = 'none';

                var pc = document.getElementById('pickerContainer');
                if (pc) { pc.style.display = 'block'; }

                var fi = document.getElementById('fileInfo');
                if (fi) fi.textContent = img.width + ' x ' + img.height + 'px | ' + file.name;

                var rb = document.getElementById('resetBtn');
                if (rb) rb.disabled = false;

                var ci = document.getElementById('colorInfo');
                if (ci) ci.style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function pickColor(x, y) {
        if (!ctx) return;
        var p = ctx.getImageData(x, y, 1, 1).data;
        var r = p[0], g = p[1], b = p[2];
        var hex = rgbToHex(r, g, b);
        var hsl = rgbToHsl(r, g, b);

        var sw = document.getElementById('colorSwatch');
        if (sw) sw.style.backgroundColor = hex;

        var hv = document.getElementById('hexValue');
        if (hv) hv.textContent = hex.toUpperCase();

        var rv = document.getElementById('rgbValue');
        if (rv) rv.textContent = 'rgb(' + r + ', ' + g + ', ' + b + ')';

        var hslv = document.getElementById('hslValue');
        if (hslv) hslv.textContent = hsl;

        var ci = document.getElementById('colorInfo');
        if (ci) ci.style.display = 'block';
    }

    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(function(x) {
            var h = x.toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    }

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        var max = Math.max(r, g, b), min = Math.min(r, g, b);
        var h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            if (max === r) { h = ((g - b) / d + (g < b ? 6 : 0)) / 6; }
            else if (max === g) { h = ((b - r) / d + 2) / 6; }
            else { h = ((r - g) / d + 4) / 6; }
        }
        return 'hsl(' + Math.round(h * 360) + ', ' + Math.round(s * 100) + '%, ' + Math.round(l * 100) + '%)';
    }

    function resetTool() {
        imgLoaded = false;
        canvas = null;
        ctx = null;
        var fi = document.getElementById('fileInput');
        if (fi) fi.value = '';
        var dz = document.getElementById('dropZone');
        if (dz) dz.style.display = '';
        var pc = document.getElementById('pickerContainer');
        if (pc) pc.style.display = 'none';
        var ci = document.getElementById('colorInfo');
        if (ci) ci.style.display = 'none';
        var rb = document.getElementById('resetBtn');
        if (rb) rb.disabled = true;
    }

    // Copy color value on click
    document.addEventListener('click', function(e) {
        var t = e.target;
        while (t) {
            if (t.classList && t.classList.contains('color-value')) {
                var text = t.textContent.trim();
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(function() {
                        t.classList.add('copied');
                        setTimeout(function() { t.classList.remove('copied'); }, 1500);
                    }).catch(function() {});
                }
                return;
            }
            t = t.parentElement;
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
