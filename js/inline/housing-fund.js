let chartInstance = null;

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        function doCalculate() {
            const amount = parseFloat(document.getElementById('fundAmount').value);
            const rate = parseFloat(document.getElementById('fundRate').value);
            const years = parseInt(document.getElementById('fundYears').value);

            if (!amount || !rate || !years) return;

            const result = calculateHousingFund(amount, rate, years);
            const lang = getLang();
            const labels = i18n[lang];

            document.getElementById('resultArea').classList.remove('hidden');

            // C8 历史记录：仅存浏览器本地，不上传
            if (window.CalcHistory) {
                CalcHistory.save('housing-fund', {
                    label: '¥' + formatNumber(result.monthlyPayment) + '/月 · ' + amount + '元 @ ' + rate + '% × ' + years + '年',
                    inputs: { amount: amount, rate: rate, years: years }
                });
            }

            document.getElementById('monthlyValue').textContent = '¥' + formatNumber(result.monthlyPayment);
            document.getElementById('totalPaymentValue').textContent = '¥' + formatNumber(result.totalPayment);
            document.getElementById('totalInterestValue').textContent = '¥' + formatNumber(result.totalInterest);

            // Pie chart
            const chartContainer = document.getElementById('chartContainer');
            chartContainer.classList.remove('hidden');

            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = document.getElementById('fundChart').getContext('2d');
            chartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: [labels.principal, labels.interest],
                    datasets: [{
                        data: [amount, result.totalInterest],
                        backgroundColor: ['#2563eb', '#dc2626'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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
            document.getElementById('fundAmount').value = 800000;
            document.getElementById('fundRate').value = 2.6;
            document.getElementById('fundYears').value = 30;
            document.getElementById('resultArea').classList.add('hidden');
            document.getElementById('chartContainer').classList.add('hidden');
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        }

        // Auto-calculate on page load
        document.addEventListener('DOMContentLoaded', function() {
            // C8 历史记录回填：恢复输入并重算
            if (window.CalcHistory) {
                CalcHistory.setRestorer('housing-fund', function (inputs) {
                    if (!inputs) return;
                    document.getElementById('fundAmount').value = inputs.amount;
                    document.getElementById('fundRate').value = inputs.rate;
                    document.getElementById('fundYears').value = inputs.years;
                    doCalculate();
                });
            }

            
            setTimeout(doCalculate, 100);
        });
