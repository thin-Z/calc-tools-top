/**
 * 公积金贷款计算器（等额本息）
 * Housing Fund Loan Calculator (Equal Installment)
 */

function calculateHousingFund(amount, rate, years) {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;
    // 零利率边界：等额本息公式在 r=0 时 0/0 除零，极限为无息均摊
    const payment = monthlyRate === 0
        ? amount / months
        : amount * monthlyRate * Math.pow(1 + monthlyRate, months) /
          (Math.pow(1 + monthlyRate, months) - 1);
    const totalPayment = payment * months;
    const totalInterest = totalPayment - amount;
    return {
        monthlyPayment: Math.round(payment),
        totalPayment: Math.round(totalPayment),
        totalInterest: Math.round(totalInterest)
    };
}
