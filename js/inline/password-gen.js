/**
 * 密码生成器页面 - 附加密码强度检测功能
 * 功能：对用户输入的密码进行强度评分与反馈（合并自原密码强度检测器页面）。
 */
document.addEventListener("DOMContentLoaded", function() {
    // 无需额外初始化
});

/**
 * 检测用户输入的密码强度（UI 入口，data-csp-click 委托调用）。
 * @returns {void} 无返回值；空输入时提示并中断。
 */
function checkPwdStrength() {
    var input = document.getElementById('checkPwdInput');
    var password = input ? input.value : '';
    if (!password) {
        alert('请输入密码 / Please enter a password');
        return;
    }
    var result = evaluatePwdStrength(password);
    var scoreEl = document.getElementById('checkScore');
    var feedbackEl = document.getElementById('checkFeedback');
    var area = document.getElementById('checkResultArea');

    var labels = { veryStrong: '非常强 / Very Strong', strong: '强 / Strong', medium: '中等 / Medium', weak: '弱 / Weak', veryWeak: '非常弱 / Very Weak' };
    var colors = { veryStrong: '#22c55e', strong: '#22c55e', medium: '#f59e0b', weak: '#ef4444', veryWeak: '#ef4444' };

    scoreEl.textContent = '强度评分: ' + result.score + '/100 - ' + (labels[result.level] || result.level);
    scoreEl.style.color = colors[result.level] || '#666';
    feedbackEl.textContent = result.feedback;
    if (area) area.classList.remove('hidden');
}

/**
 * 清空检测输入与结果（data-csp-click 委托调用）。
 * @returns {void} 无返回值。
 */
function resetCheck() {
    var input = document.getElementById('checkPwdInput');
    if (input) input.value = '';
    var area = document.getElementById('checkResultArea');
    if (area) area.classList.add('hidden');
}

/**
 * 密码强度评分核心逻辑（复用原密码强度检测器规则）。
 * @param {string} password - 待检测密码。
 * @returns {{score: number, level: string, feedback: string}} 评分、等级与建议。
 */
function evaluatePwdStrength(password) {
    if (!password) {
        return { score: 0, level: 'none', feedback: '请输入密码 / Please enter a password' };
    }
    var score = 0;
    var feedback = [];

    // 1. 长度评分
    if (password.length >= 16) { score += 40; }
    else if (password.length >= 12) { score += 30; }
    else if (password.length >= 8) { score += 20; }
    else if (password.length >= 6) { score += 10; }
    else { feedback.push('密码太短，建议至少8位 / Too short, use at least 8 characters'); }

    // 2. 复杂度评分
    var hasLowercase = /[a-z]/.test(password);
    var hasUppercase = /[A-Z]/.test(password);
    var hasNumbers = /[0-9]/.test(password);
    var hasSymbols = /[^a-zA-Z0-9]/.test(password);
    var complexityCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
    score += complexityCount * 15;

    // 3. 字符多样性奖励
    var uniqueChars = new Set(password).size;
    if (uniqueChars / password.length > 0.7) { score += 10; }

    // 4. 常见模式惩罚
    var commonPatterns = [/^123456/, /^password/i, /^qwerty/i, /^abc123/i, /^admin/i, /^letmein/i, /^welcome/i, /^monkey/i, /^dragon/i];
    for (var i = 0; i < commonPatterns.length; i++) {
        if (commonPatterns[i].test(password)) {
            score -= 20;
            feedback.push('避免使用常见密码模式 / Avoid common password patterns');
            break;
        }
    }

    // 5. 重复字符惩罚
    if (/(.)\1{2,}/.test(password)) {
        score -= 10;
        feedback.push('避免重复字符 / Avoid repeated characters');
    }

    // 6. 连续字符惩罚
    if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
        score -= 10;
        feedback.push('避免连续字符 / Avoid sequential characters');
    }

    score = Math.max(0, Math.min(100, score));

    var level;
    if (score >= 80) { level = 'veryStrong'; }
    else if (score >= 60) { level = 'strong'; }
    else if (score >= 40) { level = 'medium'; }
    else if (score >= 20) { level = 'weak'; }
    else { level = 'veryWeak'; }

    if (feedback.length === 0) {
        if (level === 'veryStrong') { feedback.push('密码强度非常好！/ Password strength is excellent!'); }
        else if (level === 'strong') { feedback.push('密码强度良好 / Password strength is good'); }
        else if (level === 'medium') { feedback.push('可以增加更多字符类型提高强度 / Add more character types to improve strength'); }
    }

    return { score: score, level: level, feedback: feedback.join('；') || '继续加强密码 / Keep improving the password' };
}
