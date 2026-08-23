/**
 * 二维码生成器
 * 功能：使用第三方库 QRCode 生成二维码，并支持按尺寸/纠错级别设置与 PNG 下载。
 */

/**
 * 读取表单并生成二维码（UI 入口）。
 * @returns {void} 无返回值；内容为空时弹出提示并中断。
 */
function doCalculate() {
    var text = document.getElementById('qrText').value.trim();
    if (!text) {
        alert('请输入内容 / Please enter content');
        return;
    }
    
    // Size mapping
    var sizeSelect = document.getElementById('qrSize');
    var sizeMap = { small: 200, medium: 300, large: 400 };
    var size = sizeMap[sizeSelect.value] || 300;
    
    // Clear previous QR code
    var container = document.getElementById('qrcode');
    container.innerHTML = '';
    
    // Error correction level
    var ecLevelSelect = document.getElementById('qrECLevel');
    var ecMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };
    var ecLevel = ecMap[ecLevelSelect.value] || QRCode.CorrectLevel.M;
    
    // Generate QR code
    var qr = new QRCode(container, {
        text: text,
        width: size,
        height: size,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: ecLevel
    });
    
    // Show result area
    document.getElementById('resultArea').classList.remove('hidden');
    
    // Setup download
    setupDownload(container, text, size);
}

/**
 * 为二维码容器绑定下载按钮（导出 PNG）。
 * @param {HTMLElement} container - 二维码容器元素。
 * @param {string} text - 二维码内容（保留用于未来扩展）。
 * @param {number} size - 二维码尺寸（像素）。
 * @returns {void} 无返回值。
 */
function setupDownload(container, text, size) {
    var downloadBtn = document.getElementById('downloadQR');
    downloadBtn.onclick = function() {
        var canvas = container.querySelector('canvas');
        if (canvas) {
            var link = document.createElement('a');
            link.download = 'qrcode.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }
    };
}

/**
 * 重置二维码表单并隐藏结果区。
 * @returns {void} 无返回值。
 */
function resetForm() {
    document.getElementById('qrText').value = '';
    document.getElementById('resultArea').classList.add('hidden');
    document.getElementById('qrcode').innerHTML = '';
}
