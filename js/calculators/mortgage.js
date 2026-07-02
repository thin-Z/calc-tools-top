/**
 * 房贷计算器
 * Mortgage Calculator
 */

function calculateMortgage(amount, rate, years, method) {
    const monthlyRate = rate / 100 / 12;
    const months = years * 12;

    if (method === 'equal-payment') {
        const payment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) /
                       (Math.pow(1 + monthlyRate, months) - 1);
        const totalPayment = payment * months;
        const totalInterest = totalPayment - amount;
        return { monthlyPayment: Math.round(payment), totalPayment: Math.round(totalPayment), totalInterest: Math.round(totalInterest), method: 'equal-payment' };
    } else {
        const principalPerMonth = amount / months;
        let totalInterest = 0;
        let firstPayment, lastPayment;
        for (let i = 0; i < months; i++) {
            const interest = (amount - principalPerMonth * i) * monthlyRate;
            totalInterest += interest;
            if (i === 0) firstPayment = principalPerMonth + interest;
            if (i === months - 1) lastPayment = principalPerMonth + interest;
        }
        return {
            firstPayment: Math.round(firstPayment),
            lastPayment: Math.round(lastPayment),
            totalPayment: Math.round(amount + totalInterest),
            totalInterest: Math.round(totalInterest),
            method: 'equal-principal'
        };
    }
}