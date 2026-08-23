/**
 * 密码强度检测器 UI 交互
 */

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('toggle-password');
    const meterBar = document.getElementById('meter-bar');
    const strengthLevel = document.getElementById('strength-level');
    const strengthScore = document.getElementById('strength-score');
    const strengthFeedback = document.getElementById('strength-feedback');
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const generatedPassword = document.getElementById('generated-password');
    const generatedPasswordText = document.getElementById('generated-password-text');

    // 密码显示/隐藏切换
    toggleBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
    });

    // 密码强度检测
    passwordInput.addEventListener('input', function() {
        const result = checkPasswordStrength(this.value);
        updateUI(result);
    });

    // 更新UI
    function updateUI(result) {
        meterBar.style.width = result.score + '%';
        meterBar.className = 'meter-bar ' + result.level;
        strengthLevel.textContent = getLevelText(result.level);
        strengthScore.textContent = result.score + '/100';
        strengthFeedback.textContent = result.feedback;
    }

    // 获取等级文本
    function getLevelText(level) {
        const levels = {
            'none': '请输入密码',
            'veryWeak': '非常弱',
            'weak': '弱',
            'medium': '中等',
            'strong': '强',
            'veryStrong': '非常强'
        };
        return levels[level] || '未知';
    }

    // 生成强密码
    generateBtn.addEventListener('click', function() {
        const password = generateStrongPassword(16);
        generatedPasswordText.textContent = password;
        generatedPassword.style.display = 'block';
        copyBtn.disabled = false;

        // 自动填入密码框并检测
        passwordInput.value = password;
        passwordInput.type = 'text';
        const result = checkPasswordStrength(password);
        updateUI(result);
    });

    // 复制密码
    copyBtn.addEventListener('click', function() {
        const password = generatedPasswordText.textContent;
        navigator.clipboard.writeText(password).then(function() {
            copyBtn.textContent = '已复制';
            setTimeout(function() {
                copyBtn.textContent = '复制密码';
            }, 2000);
        });
    });
});