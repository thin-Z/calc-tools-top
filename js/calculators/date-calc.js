function addDays(dateStr, days) {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
}

function daysBetween(start, end) {
    const s = new Date(start), e = new Date(end);
    return Math.round((e - s) / (1000 * 60 * 60 * 24));
}

function getDayOfWeek(dateStr) {
    const daysZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return { zh: daysZh[new Date(dateStr).getDay()], en: daysEn[new Date(dateStr).getDay()] };
}

function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}