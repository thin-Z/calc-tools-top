/* ===== Image Format Conversion Tool ===== */
(function() {
    'use strict';

    let originalFile = null;
    let originalImage = null;
    let convertedBlobUrl = null;

    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    function init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const formatSelect = document.getElementById('formatSelect');
        const convertBtn = document.getElementById('convertBtn');
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

        convertBtn.addEventListener('click', convertFormat);
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
            <span>${file.type || 'unknown'}</span>
        `;

        previewContainer.classList.add('visible');
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = 'none';
        document.getElementById('resultSummary').classList.remove('visible');
        document.getElementById('convertBtn').disabled = false;
    }

    function convertFormat() {
        if (!originalImage) return;

        const targetFormat = document.getElementById('formatSelect').value;
        const mimeMap = {
            'image/jpeg': 'jpeg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/bmp': 'bmp'
        };
        const mimeType = targetFormat;
        const ext = mimeMap[targetFormat] || 'png';

        const canvas = document.createElement('canvas');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        const ctx = canvas.getContext('2d');
        // Fill white background when converting to JPEG (no alpha support)
        if (targetFormat === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(originalImage, 0, 0);

        canvas.toBlob(function(blob) {
            if (!blob) return;

            // Clean up previous blob URL
            if (convertedBlobUrl) URL.revokeObjectURL(convertedBlobUrl);

            convertedBlobUrl = URL.createObjectURL(blob);
            document.getElementById('convertedPreview').src = convertedBlobUrl;
            document.getElementById('convertedInfo').innerHTML = `
                <span>${formatFileSize(blob.size)}</span>
                <span>${originalImage.width} × ${originalImage.height}px</span>
                <span>${mimeType}</span>
            `;

            document.getElementById('originalSize2').textContent = formatFileSize(originalFile.size);
            document.getElementById('convertedSize2').textContent = formatFileSize(blob.size);

            const nameBase = originalFile.name.replace(/\.[^.]+$/, '');
            document.getElementById('downloadBtn').dataset.fileName = nameBase + '_converted.' + ext;

            document.getElementById('resultSummary').classList.add('visible');
        }, mimeType, 0.92);
    }

    function downloadResult() {
        const btn = document.getElementById('downloadBtn');
        if (convertedBlobUrl && btn.dataset.fileName) {
            const a = document.createElement('a');
            a.href = convertedBlobUrl;
            a.download = btn.dataset.fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function resetTool() {
        originalFile = null;
        originalImage = null;
        if (convertedBlobUrl) { URL.revokeObjectURL(convertedBlobUrl); convertedBlobUrl = null; }
        document.getElementById('fileInput').value = '';
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = '';
        document.getElementById('previewContainer').classList.remove('visible');
        document.getElementById('resultSummary').classList.remove('visible');
        document.getElementById('convertBtn').disabled = true;
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
