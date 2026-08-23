/**
 * 密码强度检测器
 * 功能：检测密码强度，给出评分和建议
 */

(function() {
    'use strict';

    // 密码强度评分规则
    const rules = {
        length: {
            weak: 6,
            medium: 8,
            strong: 12,
            veryStrong: 16
        },
        complexity: {
            lowercase: 1,
            uppercase: 1,
            numbers: 1,
            symbols: 1
        }
    };

    // 检测密码强度
    function checkPasswordStrength(password) {
        if (!password) {
            return { score: 0, level: 'none', feedback: '请输入密码' };
        }

        let score = 0;
        const feedback = [];

        // 1. 长度评分
        if (password.length >= rules.length.veryStrong) {
            score += 40;
        } else if (password.length >= rules.length.strong) {
            score += 30;
        } else if (password.length >= rules.length.medium) {
            score += 20;
        } else if (password.length >= rules.length.weak) {
            score += 10;
        } else {
            feedback.push('密码太短，建议至少8位');
        }

        // 2. 复杂度评分
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        const hasSymbols = /[^a-zA-Z0-9]/.test(password);

        const complexityCount = [hasLowercase, hasUppercase, hasNumbers, hasSymbols].filter(Boolean).length;
        score += complexityCount * 15;

        // 3. 字符多样性奖励
        const uniqueChars = new Set(password).size;
        const diversityRatio = uniqueChars / password.length;
        if (diversityRatio > 0.7) {
            score += 10;
        }

        // 4. 常见模式惩罚
        const commonPatterns = [
            /^123456/,
            /^password/i,
            /^qwerty/i,
            /^abc123/i,
            /^admin/i,
            /^letmein/i,
            /^welcome/i,
            /^monkey/i,
            /^dragon/i
        ];

        for (const pattern of commonPatterns) {
            if (pattern.test(password)) {
                score -= 20;
                feedback.push('避免使用常见密码模式');
                break;
            }
        }

        // 5. 重复字符惩罚
        if (/(.)\1{2,}/.test(password)) {
            score -= 10;
            feedback.push('避免重复字符');
        }

        // 6. 连续字符惩罚
        if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
            score -= 10;
            feedback.push('避免连续字符');
        }

        // 限制分数范围
        score = Math.max(0, Math.min(100, score));

        // 确定强度等级
        let level;
        if (score >= 80) {
            level = 'veryStrong';
        } else if (score >= 60) {
            level = 'strong';
        } else if (score >= 40) {
            level = 'medium';
        } else if (score >= 20) {
            level = 'weak';
        } else {
            level = 'veryWeak';
        }

        // 生成建议
        if (feedback.length === 0) {
            if (level === 'veryStrong') {
                feedback.push('密码强度非常好！');
            } else if (level === 'strong') {
                feedback.push('密码强度良好');
            } else if (level === 'medium') {
                feedback.push('可以增加更多字符类型提高强度');
            }
        }

        return {
            score,
            level,
            feedback: feedback.join('；') || '继续加强密码',
            details: {
                length: password.length,
                hasLowercase,
                hasUppercase,
                hasNumbers,
                hasSymbols,
                uniqueChars,
                diversityRatio: Math.round(diversityRatio * 100)
            }
        };
    }

    // 生成随机强密码
    function generateStrongPassword(length = 16) {
        const charset = {
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        let password = '';
        const allChars = Object.values(charset).join('');

        // 确保包含所有字符类型
        password += charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)];
        password += charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)];
        password += charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
        password += charset.symbols[Math.floor(Math.random() * charset.symbols.length)];

        // 填充剩余长度
        for (let i = password.length; i < length; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }

        // 打乱顺序
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }

    // 暴露全局函数
    window.checkPasswordStrength = checkPasswordStrength;
    window.generateStrongPassword = generateStrongPassword;

})();