let chartInstance = null;

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        /* 读取可选项（房产税/保险/PMI/额外还款），返回每月附加费用 */
        function readOptionalCosts(amount) {
            const propertyTax = parseFloat(document.getElementById('propertyTax').value) || 0;
            const homeInsurance = parseFloat(document.getElementById('homeInsurance').value) || 0;
            const pmiRate = parseFloat(document.getElementById('pmiRate').value) || 0;
            const extraPayment = parseFloat(document.getElementById('extraPayment').value) || 0;
            const taxMonthly = propertyTax / 12;
            const insuranceMonthly = homeInsurance / 12;
            const pmiMonthly = pmiRate > 0 ? (amount * pmiRate / 100 / 12) : 0;
            return {
                taxMonthly, insuranceMonthly, pmiMonthly, extraPayment,
                totalMonthly: taxMonthly + insuranceMonthly + pmiMonthly + extraPayment
            };
        }

        function doCalculate() {
            const amount = parseFloat(document.getElementById('loanAmount').value) * 10000;
            const rate = parseFloat(document.getElementById('annualRate').value);
            const years = parseInt(document.getElementById('loanYears').value);
            const method = document.getElementById('repaymentMethod').value;

            if (!amount || !rate || !years) return;

            const result = calculateMortgage(amount, rate, years, method);
            const extra = readOptionalCosts(amount);
            const lang = getLang();
            const labels = i18n[lang];

            const resultArea = document.getElementById('resultArea');
            resultArea.classList.remove('hidden');

            const monthlyLabel = document.getElementById('monthlyLabel');
            const monthlyValue = document.getElementById('monthlyValue');

            let baseMonthly;
            if (result.method === 'equal-payment') {
                baseMonthly = result.monthlyPayment;
                monthlyLabel.textContent = labels.monthlyPayment + ' (' + labels.equalInstallment + ')';
                monthlyValue.textContent = '¥' + formatNumber(baseMonthly);
            } else {
                baseMonthly = result.firstPayment;
                monthlyLabel.textContent = labels.firstPayment + ' ~ ' + labels.lastPayment + ' (' + labels.equalPrincipal + ')';
                monthlyValue.textContent = '¥' + formatNumber(result.firstPayment) + ' ~ ¥' + formatNumber(result.lastPayment);
            }

            // 附加费用明细（仅当有可选项时显示）
            const extraCostsArea = document.getElementById('extraCostsArea');
            const extraCostsText = document.getElementById('extraCostsText');
            const parts = [];
            if (extra.taxMonthly > 0) parts.push(labels.propertyTaxShort + ' ¥' + formatNumber(Math.round(extra.taxMonthly)) + '/月');
            if (extra.insuranceMonthly > 0) parts.push(labels.homeInsuranceShort + ' ¥' + formatNumber(Math.round(extra.insuranceMonthly)) + '/月');
            if (extra.pmiMonthly > 0) parts.push(labels.pmiShort + ' ¥' + formatNumber(Math.round(extra.pmiMonthly)) + '/月');
            if (extra.extraPayment > 0) parts.push(labels.extraPaymentShort + ' ¥' + formatNumber(Math.round(extra.extraPayment)) + '/月');
            if (parts.length > 0) {
                const totalMonthlyWithExtras = Math.round(baseMonthly + extra.totalMonthly);
                extraCostsText.textContent = (labels.monthlyPaymentWithExtras || '月供合计（含附加费用）') + ': ¥' + formatNumber(totalMonthlyWithExtras) + '（' + parts.join(' + ') + '）';
                extraCostsArea.classList.remove('hidden');
            } else {
                extraCostsArea.classList.add('hidden');
            }

            document.getElementById('totalPaymentValue').textContent = '¥' + formatNumber(result.totalPayment);
            document.getElementById('totalInterestValue').textContent = '¥' + formatNumber(result.totalInterest);

            // Pie chart
            const chartContainer = document.getElementById('chartContainer');
            chartContainer.classList.remove('hidden');

            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = document.getElementById('mortgageChart').getContext('2d');
            const extraTotal = extra.taxMonthly * years * 12 + extra.insuranceMonthly * years * 12 + extra.pmiMonthly * years * 12;
            const chartData = extraTotal > 0
                ? [amount, result.totalInterest, Math.round(extraTotal)]
                : [amount, result.totalInterest];
            const chartLabels = extraTotal > 0
                ? [labels.principal, labels.interest, labels.extraCosts]
                : [labels.principal, labels.interest];
            const chartColors = extraTotal > 0
                ? ['#2563eb', '#dc2626', '#f59e0b']
                : ['#2563eb', '#dc2626'];

            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 16,
                                font: { size: 14 }
                            }
                        }
                    }
                }
            });
        }

        function resetForm() {
            document.getElementById('loanAmount').value = 100;
            document.getElementById('annualRate').value = 3.85;
            document.getElementById('loanYears').value = 30;
            document.getElementById('repaymentMethod').value = 'equal-payment';
            document.getElementById('propertyTax').value = 0;
            document.getElementById('homeInsurance').value = 0;
            document.getElementById('pmiRate').value = 0;
            document.getElementById('extraPayment').value = 0;
            document.getElementById('resultArea').classList.add('hidden');
            document.getElementById('extraCostsArea').classList.add('hidden');
            document.getElementById('chartContainer').classList.add('hidden');
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        }

        // Auto-calculate on page load
        document.addEventListener('DOMContentLoaded', function() {
            
            setTimeout(doCalculate, 100);
        });
