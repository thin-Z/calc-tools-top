// QR Generator - QR Code Generator
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
    document.getElementById('resultArea').style.display = 'block';
    
    // Setup download
    setupDownload(container, text, size);
}

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

function resetForm() {
    document.getElementById('qrText').value = '';
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('qrcode').innerHTML = '';
}
