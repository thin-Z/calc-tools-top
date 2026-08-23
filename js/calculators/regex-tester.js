/**
 * 正则表达式测试器 - 核心逻辑
 * 功能：本地构建正则、查找匹配、解析捕获组、转义特殊字符。零第三方库
 *       （CSP 白名单不扩张），纯函数模块（IIFE）。
 * 用法：浏览器中暴露 window.regexTester 命名空间以及 window.buildRegex /
 *       window.findMatches / window.explainGroups / window.escapeRegex 四个
 *       顶层函数（供 UI 层与单元测试直接调用）。
 */
(function () {
    'use strict';

    var FLAG_CHARS = 'gimsuy';

    /**
     * 从用户输入构建 RegExp 对象。
     * @param {string} pattern - 正则表达式模式串。
     * @param {string} [flags] - 标志位字符串（g/i/m/s/u/y，非法字符自动过滤）。
     * @returns {{ok: boolean, regex: (RegExp|null), flags: string, error: string}}
     *    ok: 是否成功；regex: 成功时的 RegExp；flags: 过滤后的标志位；
     *    error: 失败时的错误描述。
     */
    function buildRegex(pattern, flags) {
        if (typeof pattern !== 'string' || pattern.trim() === '') {
            return { ok: false, regex: null, flags: '', error: '正则表达式不能为空' };
        }
        var flagStr = typeof flags === 'string'
            ? flags.split('').filter(function (f) { return FLAG_CHARS.indexOf(f) !== -1; }).join('')
            : '';
        try {
            var re = new RegExp(pattern, flagStr);
            return { ok: true, regex: re, flags: flagStr, error: '' };
        } catch (e) {
            return { ok: false, regex: null, flags: flagStr, error: e.message };
        }
    }

    /**
     * 在文本中查找所有匹配项。
     * @param {string} text - 被搜索文本。
     * @param {RegExp} regex - 正则对象（无 g 标志时自动补 g 以便全量查找）。
     * @returns {Array<{match: string, index: number, groups: string[]}>} 匹配列表；
     *    每组含匹配文本、起始下标与捕获组数组。
     */
    function findMatches(text, regex) {
        if (typeof text !== 'string' || !regex) return [];
        var re = regex.global ? regex : new RegExp(regex.source, regex.flags + 'g');
        var results = [];
        var m;
        var guard = 0;
        while ((m = re.exec(text)) !== null && guard < 100000) {
            results.push({
                match: m[0],
                index: m.index,
                groups: m.slice(1)
            });
            guard++;
            // 空匹配时手动前进，避免死循环
            if (m[0] === '') re.lastIndex++;
        }
        return results;
    }

    /**
     * 解析模式串中的捕获组信息（跳过转义括号、字符类内括号、非捕获组与前后断言）。
     * @param {string} pattern - 正则表达式模式串。
     * @returns {Array<{index: number, name: (string|null)}>} 捕获组列表；
     *    index 为 1 基捕获组编号，name 为命名组名称（匿名组为 null）。
     */
    function explainGroups(pattern) {
        var groups = [];
        if (typeof pattern !== 'string' || pattern === '') return groups;
        var i = 0;
        var n = pattern.length;
        var inClass = false;
        var count = 0;
        while (i < n) {
            var ch = pattern[i];
            if (ch === '\\') { i += 2; continue; }
            if (ch === '[') { inClass = true; i++; continue; }
            if (ch === ']') { inClass = false; i++; continue; }
            if (ch === '(' && !inClass) {
                // 命名捕获组 (?<name>...)
                if (pattern[i + 1] === '?' && pattern[i + 2] === '<'
                    && pattern[i + 3] !== '=' && pattern[i + 3] !== '!') {
                    var nameEnd = pattern.indexOf('>', i + 3);
                    if (nameEnd === -1) { i++; continue; }
                    count++;
                    groups.push({ index: count, name: pattern.slice(i + 3, nameEnd) });
                    i = nameEnd + 1;
                    continue;
                }
                // 非捕获组 / 前后断言 (?= (?! (?: (?<= (?<!
                if (pattern[i + 1] === '?') { i += 2; continue; }
                count++;
                groups.push({ index: count, name: null });
            }
            i++;
        }
        return groups;
    }

    /**
     * 转义正则表达式特殊字符（用于把用户文本当作字面量匹配）。
     * @param {string} str - 待转义字符串。
     * @returns {string} 转义后的字符串。
     */
    function escapeRegex(str) {
        return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    window.regexTester = {
        buildRegex: buildRegex,
        findMatches: findMatches,
        explainGroups: explainGroups,
        escapeRegex: escapeRegex
    };
    window.buildRegex = buildRegex;
    window.findMatches = findMatches;
    window.explainGroups = explainGroups;
    window.escapeRegex = escapeRegex;
})();
