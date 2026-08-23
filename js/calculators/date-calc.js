/**
 * 日期计算器
 * 功能：提供日期加减、日期差、星期几与今日日期等纯函数。
 */

/**
 * 在指定日期上增加/减少天数并返回 YYYY-MM-DD 字符串。
 * @param {string} dateStr - 起始日期字符串。
 * @param {number} days - 增减天数（可为负）。
 * @returns {string} 计算后的日期（YYYY-MM-DD）。
 */
function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

/**
 * 计算两个日期之间的天数差。
 * @param {string} start - 起始日期字符串。
 * @param {string} end - 结束日期字符串。
 * @returns {number} 相隔天数（结束减开始）。
 */
function daysBetween(start, end) {
    const s = new Date(start), e = new Date(end);
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

/**
 * 获取指定日期是星期几（中英文）。
 * @param {string} dateStr - 日期字符串。
 * @returns {{zh: string, en: string}} 中文与英文星期名。
 */
function getDayOfWeek(dateStr) {
    const daysZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return { zh: daysZh[new Date(dateStr).getDay()], en: daysEn[new Date(dateStr).getDay()] };
}

/**
 * 返回今天的日期字符串（YYYY-MM-DD）。
 * @returns {string} 今天日期。
 */
function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}