let chartInstance = null;

        function formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        function formatRate(rate) {
            return (rate * 100).toFixed(0) + "%";
        }

        function doCalculate() {
            const salary = parseFloat(document.getElementById("salary").value);
            const insurance = parseFloat(document.getElementById("insurance").value);
            const specialDeduction = parseFloat(document.getElementById("specialDeduction").value);

            if (!salary || salary <= 0) return;

            const result = calculateTax(salary, insurance, specialDeduction);
            const lang = getLang();
            const labels = i18n[lang];

            const resultArea = document.getElementById("resultArea");
            resultArea.classList.remove('hidden');

            document.getElementById("taxableIncomeValue").textContent = '¥' + formatNumber(result.taxableIncome);
            document.getElementById("taxRateValue").textContent = formatRate(result.taxRate);
            document.getElementById("taxPayableValue").textContent = '¥' + formatNumber(result.taxPayable);
            document.getElementById("afterTaxValue").textContent = '¥' + formatNumber(result.afterTax);

            // Bar chart
            const chartContainer = document.getElementById("chartContainer");
            chartContainer.classList.remove('hidden');

            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = document.getElementById("taxChart").getContext("2d");
            chartInstance = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: [labels.salary || "Pre-Tax Monthly Salary", labels.afterTax || "After-Tax Monthly Salary"],
                    datasets: [{
                        label: "$$",
                        data: [salary, result.afterTax],
                        backgroundColor: ["#2563eb", "#16a34a"],
                        borderRadius: 6,
                        maxBarThickness: 80
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) { return '¥' + formatNumber(value); }
                            }
                        }
                    }
                }
            });
        }

        function resetForm() {
            document.getElementById("salary").value = 15000;
            document.getElementById("insurance").value = 2000;
            document.getElementById("specialDeduction").value = 2000;
            document.getElementById('resultArea').classList.add('hidden');
            document.getElementById('chartContainer').classList.add('hidden');
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        }

        document.addEventListener("DOMContentLoaded", function() {
            
            setTimeout(doCalculate, 100);
        });
