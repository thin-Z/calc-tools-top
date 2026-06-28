/* ===== Image Resize & Crop Tool ===== */
(function() {
    'use strict';

    let originalFile = null;
    let originalImage = null;
    let resizedBlobUrl = null;
    let originalWidth = 0;
    let originalHeight = 0;

    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    const SUPPORTED_OUTPUT = ['image/jpeg', 'image/png', 'image/webp'];

    function normalizeType(mime) {
        return SUPPORTED_OUTPUT.includes(mime) ? mime : 'image/png';
    }

    function init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const widthInput = document.getElementById('widthInput');
        const heightInput = document.getElementById('heightInput');
        const keepRatio = document.getElementById('keepRatio');
        const resizeBtn = document.getElementById('resizeBtn');
        const resetBtn = document.getElementById('resetBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        if (!dropZone) return;

        dropZone.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; fileInput.click(); });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) loadFile(e.target.files[0]);
        });

        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
        });

        // Auto-adjust height when width changes (if keep ratio)
        widthInput.addEventListener('input', function() {
            if (keepRatio.checked && originalWidth > 0) {
                const ratio = originalHeight / originalWidth;
                heightInput.value = Math.round(parseInt(this.value || 0, 10) * ratio);
            }
        });

        heightInput.addEventListener('input', function() {
            if (keepRatio.checked && originalHeight > 0) {
                const ratio = originalWidth / originalHeight;
                widthInput.value = Math.round(parseInt(this.value || 0, 10) * ratio);
            }
        });

        resizeBtn.addEventListener('click', resizeImage);
        resetBtn.addEventListener('click', resetTool);
        downloadBtn.addEventListener('click', downloadResult);
    }

    function loadFile(file) {
        if (file.size > MAX_FILE_SIZE) {
            alert('文件大小超过 50MB 限制。');
            return;
        }

        originalFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                originalImage = img;
                originalWidth = img.width;
                originalHeight = img.height;
                showPreview(img, file);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function showPreview(img, file) {
        const previewContainer = document.getElementById('previewContainer');
        const originalPreview = document.getElementById('originalPreview');
        const originalInfo = document.getElementById('originalInfo');

        originalPreview.src = img.src;
        originalInfo.innerHTML = `
            <span>${formatFileSize(file.size)}</span>
            <span>${img.width} × ${img.height}px</span>
        `;

        document.getElementById('widthInput').value = img.width;
        document.getElementById('heightInput').value = img.height;

        previewContainer.classList.add('visible');
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = 'none';
        document.getElementById('resultSummary').classList.remove('visible');
        document.getElementById('resizeBtn').disabled = false;
    }

    function resizeImage() {
        if (!originalImage) return;

        let newWidth = parseInt(document.getElementById('widthInput').value, 10);
        let newHeight = parseInt(document.getElementById('heightInput').value, 10);

        if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
            alert('请输入有效的宽度和高度（至少 1px）。');
            return;
        }

        // Cap at reasonable size
        if (newWidth > 10000 || newHeight > 10000) {
            alert('尺寸不能超过 10000px。');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        // Handle transparency with white background for JPEG
        const rawType = originalFile.type === 'image/png' ? 'image/png' : originalFile.type;
        const outputType = normalizeType(rawType);
        if (outputType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(originalImage, 0, 0, newWidth, newHeight);

        canvas.toBlob(function(blob) {
            if (!blob) return;

            if (resizedBlobUrl) URL.revokeObjectURL(resizedBlobUrl);
            resizedBlobUrl = URL.createObjectURL(blob);

            document.getElementById('resizedPreview').src = resizedBlobUrl;
            document.getElementById('resizedInfo').innerHTML = `
                <span>${formatFileSize(blob.size)}</span>
                <span>${newWidth} × ${newHeight}px</span>
            `;

            document.getElementById('origDims').textContent = originalWidth + ' × ' + originalHeight + 'px';
            document.getElementById('origSize2').textContent = formatFileSize(originalFile.size);
            document.getElementById('newDims').textContent = newWidth + ' × ' + newHeight + 'px';
            document.getElementById('newSize').textContent = formatFileSize(blob.size);

            const ext = outputType.split('/')[1] || 'png';
            document.getElementById('downloadBtn').dataset.fileName =
                originalFile.name.replace(/\.[^.]+$/, '') + '_resized.' + ext;

            document.getElementById('resultSummary').classList.add('visible');
        }, outputType, 0.92);
    }

    function downloadResult() {
        const btn = document.getElementById('downloadBtn');
        if (resizedBlobUrl && btn.dataset.fileName) {
            const a = document.createElement('a');
            a.href = resizedBlobUrl;
            a.download = btn.dataset.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function resetTool() {
        originalFile = null;
        originalImage = null;
        originalWidth = 0;
        originalHeight = 0;
        if (resizedBlobUrl) { URL.revokeObjectURL(resizedBlobUrl); resizedBlobUrl = null; }
        document.getElementById('fileInput').value = '';
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = '';
        document.getElementById('previewContainer').classList.remove('visible');
        document.getElementById('resultSummary').classList.remove('visible');
        document.getElementById('resizeBtn').disabled = true;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
