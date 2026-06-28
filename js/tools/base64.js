/* ===== Image to Base64 Converter Tool ===== */
(function() {
    'use strict';

    let currentBase64 = '';
    let currentFileName = '';

    const MAX_FILE_SIZE = 50 * 1024 * 1024;

    function init() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const includePrefix = document.getElementById('includePrefix');
        const generateBtn = document.getElementById('generateBtn');
        const resetBtn = document.getElementById('resetBtn');
        const copyBtn = document.getElementById('copyBtn');

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

        generateBtn.addEventListener('click', generateBase64);
        resetBtn.addEventListener('click', resetTool);
        copyBtn.addEventListener('click', copyToClipboard);
    }

    function loadFile(file) {
        if (file.size > MAX_FILE_SIZE) {
            alert('文件大小超过 50MB 限制。');
            return;
        }

        currentFileName = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            document.getElementById('previewImg').src = dataUrl;
            document.getElementById('fileInfo').textContent =
                formatFileSize(file.size) + ' | ' + file.name;
            previewContainer.classList.add('visible');
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = 'none';
            document.getElementById('generateBtn').disabled = false;
            // Auto-generate
            document.getElementById('generateBtn').click();
        };
        reader.readAsDataURL(file);
    }

    function generateBase64() {
        const img = document.getElementById('previewImg');
        const prefix = document.getElementById('includePrefix').checked;

        if (!img.src || img.src === window.location.href) return;

        let result = img.src;
        if (!prefix) {
            // Remove data:image/xxx;base64, prefix
            result = result.split(',')[1] || result;
        }

        currentBase64 = result;
        document.getElementById('base64Output').textContent = result;
        document.getElementById('outputContainer').classList.add('visible');
        document.getElementById('outputLen').textContent = formatFileSize(new Blob([result]).size);

        // Update copy button
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.textContent = copyBtn.dataset.label || '复制 Base64';
        copyBtn.disabled = false;
    }

    function copyToClipboard() {
        if (!currentBase64) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(currentBase64).then(() => {
                showCopied();
            }).catch(() => {
                fallbackCopy();
            });
        } else {
            fallbackCopy();
        }
    }

    function fallbackCopy() {
        const textarea = document.createElement('textarea');
        textarea.value = currentBase64;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showCopied();
        } catch (e) {
            alert('复制失败，请手动选择文本复制。');
        }
        document.body.removeChild(textarea);
    }

    function showCopied() {
        const btn = document.getElementById('copyBtn');
        btn.textContent = '✅ ' + (btn.dataset.copiedLabel || '已复制!');
        setTimeout(() => {
            btn.textContent = btn.dataset.label || '复制 Base64';
        }, 2000);
    }

    function resetTool() {
        currentBase64 = '';
        currentFileName = '';
        document.getElementById('fileInput').value = '';
            var dz = document.getElementById('dropZone');
            if (dz) dz.style.display = '';
        document.getElementById('previewContainer').classList.remove('visible');
        document.getElementById('outputContainer').classList.remove('visible');
        document.getElementById('generateBtn').disabled = true;
        document.getElementById('copyBtn').disabled = true;
        document.getElementById('previewImg').src = '';
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
