/**
 * 分数计算器 - 核心逻辑
 * 功能：对两个分数执行加、减、乘、除运算，并将结果自动约分为最简分数。
 * 用法：本文件为纯函数模块（IIFE），在浏览器中暴露 window.fractionCalculator 命名空间
 *       以及 window.gcd / window.parseFraction / window.simplify / window.addFractions /
 *       window.subtractFractions / window.multiplyFractions / window.divideFractions /
 *       window.formatFraction 顶层函数（供 UI 层与单元测试直接调用）。
 * 依赖：无（零第三方库，CSP 白名单不扩张）。
 * 说明：仅使用整数运算，结果保持在 Number.MAX_SAFE_INTEGER 内；超出安全范围返回 null。
 */
(function () {
    'use strict';

    /**
     * 计算非负整数的最大公约数（欧几里得辗转相除法）。
     * @param {number} a - 整数。
     * @param {number} b - 整数（通常取分母）。
     * @returns {number} a 与 b 的最大公约数（始终非负）；a=b=0 时返回 0。
     */
    function gcd(a, b) {
        a = Math.abs(a);
        b = Math.abs(b);
        while (b) {
            var t = b;
            b = a % b;
            a = t;
        }
        return a;
    }

    /**
     * 解析分子与分母，返回规范化后的分数对象（分母恒为正）。
     * @param {number|string} num - 分子。
     * @param {number|string} den - 分母（不能为 0）。
     * @returns {{n: number, d: number}|null} 规范化分数 {n, d}（d 恒为正）；
     *          非法输入、非安全整数或分母为 0 时返回 null。
     */
    function parseFraction(num, den) {
        var n = parseInt(num, 10);
        var d = parseInt(den, 10);
        if (isNaN(n) || isNaN(d)) return null;
        if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d)) return null;
        if (d === 0) return null;
        // 规范化：分母保持为正，符号移到分子。
        if (d < 0) { n = -n; d = -d; }
        return { n: n, d: d };
    }

    /**
     * 将分数约分为最简分数。
     * @param {{n: number, d: number}} f - 分数 {n, d}。
     * @returns {{n: number, d: number}|null} 约分后的最简分数；非法输入（分母为 0）返回 null。
     */
    function simplify(f) {
        if (!f || typeof f.n !== 'number' || typeof f.d !== 'number') return null;
        var n = f.n;
        var d = f.d;
        if (d === 0) return null;
        // 规范化：分母保持为正。
        if (d < 0) { n = -n; d = -d; }
        if (n === 0) return { n: 0, d: 1 };
        var g = gcd(n, d);
        return { n: n / g, d: d / g };
    }

    /**
     * 分数相加：a + b = (a.n*b.d + b.n*a.d) / (a.d*b.d)。
     * @param {{n: number, d: number}} a - 第一个分数。
     * @param {{n: number, d: number}} b - 第二个分数。
     * @returns {{n: number, d: number}|null} 约分后的最简分数；非法输入返回 null。
     */
    function addFractions(a, b) {
        if (!a || !b) return null;
        var n = a.n * b.d + b.n * a.d;
        var d = a.d * b.d;
        return simplify({ n: n, d: d });
    }

    /**
     * 分数相减：a - b = (a.n*b.d - b.n*a.d) / (a.d*b.d)。
     * @param {{n: number, d: number}} a - 第一个分数。
     * @param {{n: number, d: number}} b - 第二个分数。
     * @returns {{n: number, d: number}|null} 约分后的最简分数；非法输入返回 null。
     */
    function subtractFractions(a, b) {
        if (!a || !b) return null;
        var n = a.n * b.d - b.n * a.d;
        var d = a.d * b.d;
        return simplify({ n: n, d: d });
    }

    /**
     * 分数相乘：a * b = (a.n*b.n) / (a.d*b.d)。
     * @param {{n: number, d: number}} a - 第一个分数。
     * @param {{n: number, d: number}} b - 第二个分数。
     * @returns {{n: number, d: number}|null} 约分后的最简分数；非法输入返回 null。
     */
    function multiplyFractions(a, b) {
        if (!a || !b) return null;
        return simplify({ n: a.n * b.n, d: a.d * b.d });
    }

    /**
     * 分数相除：a / b = a * (b.d/b.n) = (a.n*b.d) / (a.d*b.n)，等价于乘以倒数。
     * @param {{n: number, d: number}} a - 第一个分数。
     * @param {{n: number, d: number}} b - 第二个分数（除数）。
     * @returns {{n: number, d: number}|null} 约分后的最简分数；非法输入或除数为 0 返回 null。
     */
    function divideFractions(a, b) {
        if (!a || !b) return null;
        if (b.n === 0) return null; // 除以 0 无意义
        return simplify({ n: a.n * b.d, d: a.d * b.n });
    }

    /**
     * 将分数格式化为可读字符串：分母为 1 时显示整数，否则显示 "n/d"。
     * @param {{n: number, d: number}} f - 分数 {n, d}。
     * @returns {string} 格式化后的字符串；非法输入返回空字符串。
     */
    function formatFraction(f) {
        if (!f || typeof f.n !== 'number' || typeof f.d !== 'number' || f.d === 0) return '';
        if (f.d === 1) return String(f.n);
        return f.n + '/' + f.d;
    }

    // 暴露命名空间 + 顶层函数（UI 与单测两用）
    window.fractionCalculator = {
        gcd: gcd,
        parseFraction: parseFraction,
        simplify: simplify,
        addFractions: addFractions,
        subtractFractions: subtractFractions,
        multiplyFractions: multiplyFractions,
        divideFractions: divideFractions,
        formatFraction: formatFraction
    };
    window.gcd = gcd;
    window.parseFraction = parseFraction;
    window.simplify = simplify;
    window.addFractions = addFractions;
    window.subtractFractions = subtractFractions;
    window.multiplyFractions = multiplyFractions;
    window.divideFractions = divideFractions;
    window.formatFraction = formatFraction;
})();
