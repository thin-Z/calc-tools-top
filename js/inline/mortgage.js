let chartInstance = null;

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        function doCalculate() {
            const amount = parseFloat(document.getElementById('loanAmount').value) * 10000;
            const rate = parseFloat(document.getElementById('annualRate').value);
            const years = parseInt(document.getElementById('loanYears').value);
            const method = document.getElementById('repaymentMethod').value;

            if (!amount || !rate || !years) return;

            const result = calculateMortgage(amount, rate, years, method);
            const lang = getLang();
            const labels = i18n[lang];

            const resultArea = document.getElementById('resultArea');
            resultArea.style.display = 'block';

            const monthlyLabel = document.getElementById('monthlyLabel');
            const monthlyValue = document.getElementById('monthlyValue');

            if (result.method === 'equal-payment') {
                monthlyLabel.textContent = labels.monthlyPayment + ' (' + labels.equalInstallment + ')';
                monthlyValue.textContent = '¥' + formatNumber(result.monthlyPayment);
            } else {
                monthlyLabel.textContent = labels.firstPayment + ' ~ ' + labels.lastPayment + ' (' + labels.equalPrincipal + ')';
                monthlyValue.textContent = '¥' + formatNumber(result.firstPayment) + ' ~ $$' + formatNumber(result.lastPayment);
            }

            document.getElementById('totalPaymentValue').textContent = '¥' + formatNumber(result.totalPayment);
            document.getElementById('totalInterestValue').textContent = '¥' + formatNumber(result.totalInterest);

            // Pie chart
            const chartContainer = document.getElementById('chartContainer');
            chartContainer.style.display = 'block';

            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = document.getElementById('mortgageChart').getContext('2d');
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
            document.getElementById('resultArea').style.display = 'none';
            document.getElementById('chartContainer').style.display = 'none';
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        }

        // Auto-calculate on page load
        document.addEventListener('DOMContentLoaded', function() {
            
            setTimeout(doCalculate, 100);
        });
