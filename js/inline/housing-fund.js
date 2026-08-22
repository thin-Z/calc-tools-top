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

            document.getElementById('resultArea').style.display = 'block';
            document.getElementById('monthlyValue').textContent = '¥' + formatNumber(result.monthlyPayment);
            document.getElementById('totalPaymentValue').textContent = '¥' + formatNumber(result.totalPayment);
            document.getElementById('totalInterestValue').textContent = '¥' + formatNumber(result.totalInterest);

            // Pie chart
            const chartContainer = document.getElementById('chartContainer');
            chartContainer.style.display = 'block';

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
            document.getElementById('fundRate').value = 2.85;
            document.getElementById('fundYears').value = 30;
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
