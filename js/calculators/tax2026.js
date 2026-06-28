/**
 * 2026 个税计算器
 * Tax Calculator 2026
 */

function calculateTax(salary, insurance, specialDeduction) {
    const threshold = 5000;
    const monthlyTaxable = salary - threshold - insurance - specialDeduction;
    if (monthlyTaxable <= 0) {
        return {
            taxableIncome: Math.max(0, monthlyTaxable),
            taxRate: 0,
            taxPayable: 0,
            afterTax: salary - insurance
        };
    }

    const annualTaxable = monthlyTaxable * 12;
    let rate, quickDeduction;

    if (annualTaxable <= 36000) {
        rate = 0.03;
        quickDeduction = 0;
    } else if (annualTaxable <= 144000) {
        rate = 0.10;
        quickDeduction = 2520;
    } else if (annualTaxable <= 300000) {
        rate = 0.20;
        quickDeduction = 16920;
    } else if (annualTaxable <= 420000) {
        rate = 0.25;
        quickDeduction = 31920;
    } else if (annualTaxable <= 660000) {
        rate = 0.30;
        quickDeduction = 52920;
    } else if (annualTaxable <= 960000) {
        rate = 0.35;
        quickDeduction = 85920;
    } else {
        rate = 0.45;
        quickDeduction = 181920;
    }

    const annualTax = annualTaxable * rate - quickDeduction;
    const monthlyTax = annualTax / 12;
    const afterTax = salary - insurance - monthlyTax;

    return {
        taxableIncome: Math.round(monthlyTaxable),
        taxRate: rate,
        taxPayable: Math.round(monthlyTax),
        afterTax: Math.round(afterTax)
    };
}
