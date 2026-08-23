/**
 * BMI 计算器
 * 功能：根据身高（cm）与体重（kg）计算 BMI 指数并返回分类与颜色。
 */

/**
 * 计算身体质量指数（BMI）并给出分类。
 * @param {number} height - 身高（厘米）。
 * @param {number} weight - 体重（千克）。
 * @returns {{bmi: string, category: string, color: string}} 结果对象：
 *   bmi 为保留一位小数的字符串；category 为偏瘦/正常/超重/肥胖；
 *   color 为对应分类的主题色（hex）。
 */
function calculateBMI(height, weight) {
    const h = height / 100;
    const bmi = weight / (h * h);
    let category, color;
    if (bmi < 18.5) { category = '偏瘦'; color = '#f59e0b'; }
    else if (bmi < 24) { category = '正常'; color = '#22c55e'; }
    else if (bmi < 28) { category = '超重'; color = '#f97316'; }
    else { category = '肥胖'; color = '#ef4444'; }
    return { bmi: bmi.toFixed(1), category, color };
}
