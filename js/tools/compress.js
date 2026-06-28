/* ===== Image Compression Tool ===== */
(function() {
    'use strict';

    let originalFile = null;
    let originalImage = null;
    let compressedBlobUrl = null;

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const SUPPORTED_OUTPUT = ['image/jpeg', 'image/png', 'image/webp'];

    function normalizeType(mime) {
        return SUPPORTED_OUTPUT.includes(mime) ? mime : 'image/png';
    }

    const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/gif'];

    function init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        const compressBtn = document.getElementById('compressBtn');
        const resetBtn = document.getElementById('resetBtn');
        const downloadBtn = document.getElementById('downloadBtn');

        if (!dropZone) return;

        // Click to upload
        dropZone.addEventListener('click', function(e) { if (e.target.tagName === 'INPUT') return; fileInput.click(); });

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                loadFile(e.target.files[0]);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                loadFile(e.dataTransfer.files[0]);
            }
        });

        // Quality slider
        qualitySlider.addEventListener('input', () => {
            qualityValue.textContent = qualitySlider.value + '%';
        });

        // Compress button
        compressBtn.addEventListener('click', compressImage);

        // Reset button
        resetBtn.addEventListener('click', resetTool);

        // Download button
        downloadBtn.addEventListener('click', downloadResult);
    }

    function loadFile(file) {
        // Validate file type
        if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|bmp|gif)$/i)) {
            alert('不支持的文件格式。请上传 JPG、PNG、WebP、BMP 或 GIF 图片。');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            alert('文件大小超过 50MB 限制，请压缩后再试。');
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
            <span>${file.name}</span>
        `;

        previewContainer.classList.add('visible');
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = 'none';
        document.getElementById('resultSummary').classList.remove('visible');
        document.getElementById('compressedPreview').src = '';
        document.getElementById('compressBtn').disabled = false;
    }

    function compressImage() {
        if (!originalImage) return;

        const quality = parseInt(document.getElementById('qualitySlider').value, 10) / 100;
        const resultSummary = document.getElementById('resultSummary');
        const compressedPreview = document.getElementById('compressedPreview');
        const compressedInfo = document.getElementById('compressedInfo');

        // Determine output format
        let outputType = originalFile.type;
        outputType = normalizeType(outputType);
        // PNG lossy compression doesn't work well; convert to JPEG if quality < 100
        if (outputType === 'image/png' && quality < 1) {
            outputType = 'image/jpeg';
        }

        const canvas = document.createElement('canvas');
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        const ctx = canvas.getContext('2d');
        // For JPEG conversion from PNG with transparency, fill white background
        if (outputType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(originalImage, 0, 0);

        canvas.toBlob(function(blob) {
            if (!blob) return;

            // Revoke previous blob URL to prevent memory leak
            if (compressedBlobUrl) URL.revokeObjectURL(compressedBlobUrl);
            const compressedUrl = URL.createObjectURL(blob);
            compressedBlobUrl = compressedUrl;
            compressedPreview.src = compressedUrl;
            compressedInfo.innerHTML = `
                <span>${formatFileSize(blob.size)}</span>
                <span>${originalImage.width} × ${originalImage.height}px</span>
            `;

            // Calculate reduction
            const reduction = ((originalFile.size - blob.size) / originalFile.size * 100).toFixed(1);
            document.getElementById('originalSize').textContent = formatFileSize(originalFile.size);
            document.getElementById('compressedSize').textContent = formatFileSize(blob.size);
            document.getElementById('reductionRate').textContent = reduction + '%';

            // Store for download
            document.getElementById('downloadBtn').dataset.blobUrl = compressedUrl;
            document.getElementById('downloadBtn').dataset.fileName = getOutputFileName(originalFile.name, outputType);

            resultSummary.classList.add('visible');
        }, outputType, quality);
    }

    function downloadResult() {
        const btn = document.getElementById('downloadBtn');
        const url = btn.dataset.blobUrl;
        const fileName = btn.dataset.fileName;
        if (url && fileName) {
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    function getOutputFileName(originalName, mimeType) {
        const ext = mimeType.split('/')[1];
        const name = originalName.replace(/\.[^.]+$/, '');
        return name + '_compressed.' + ext;
    }

    function resetTool() {
        originalFile = null;
        originalImage = null;
        if (compressedBlobUrl) { URL.revokeObjectURL(compressedBlobUrl); compressedBlobUrl = null; }
        document.getElementById('fileInput').value = '';
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = '';
        document.getElementById('previewContainer').classList.remove('visible');
        document.getElementById('resultSummary').classList.remove('visible');
        document.getElementById('qualitySlider').value = 80;
        document.getElementById('qualityValue').textContent = '80%';
        document.getElementById('compressBtn').disabled = true;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
