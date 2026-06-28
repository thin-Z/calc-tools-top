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
