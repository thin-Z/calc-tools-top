let chartInstance = null;

        function getCategoryLabel(categoryZh) {
            const lang = getLang();
            const map = {
                "偏瘦": lang === "en" ? "Underweight" : "偏瘦",
                "正常": lang === "en" ? "Normal" : "正常",
                "超重": lang === "en" ? "Overweight" : "超重",
                "肥胖": lang === "en" ? "Obese" : "肥胖"
            };
            return map[categoryZh] || categoryZh;
        }

        function getAdviceKey(categoryZh) {
            const map = {
                "偏瘦": "adviceUnderweight",
                "正常": "adviceNormal",
                "超重": "adviceOverweight",
                "肥胖": "adviceObese"
            };
            return map[categoryZh] || "";
        }

        function doCalculate() {
            const height = parseFloat(document.getElementById("height").value);
            const weight = parseFloat(document.getElementById("weight").value);

            if (!height || !weight || height <= 0 || weight <= 0) return;

            const result = calculateBMI(height, weight);
            const lang = getLang();
            const labels = i18n[lang];

            // Show result area
            const resultArea = document.getElementById("resultArea");
            resultArea.classList.remove('hidden');

            // BMI value
            document.getElementById("bmiValue").textContent = result.bmi;

            // Category with color
            const catEl = document.getElementById("bmiCategory");
            catEl.textContent = getCategoryLabel(result.category);
            catEl.style.color = result.color;

            // Health advice
            const adviceKey = getAdviceKey(result.category);
            document.getElementById("healthAdvice").textContent = labels[adviceKey] || "";

            // BMI scale chart
            const chartContainer = document.getElementById("chartContainer");
            chartContainer.classList.remove('hidden');

            if (chartInstance) {
                chartInstance.destroy();
            }

            const ctx = document.getElementById("bmiChart").getContext("2d");

            // Segments: underweight (0-18.5), normal (18.5-24), overweight (24-28), obese (28-40)
            const segments = [
                { label: labels.underweight || "偏瘦", from: 0, to: 18.5, color: "#f59e0b" },
                { label: labels.normal || "正常", from: 18.5, to: 24, color: "#22c55e" },
                { label: labels.overweight || "超重", from: 24, to: 28, color: "#f97316" },
                { label: labels.obese || "肥胖", from: 28, to: 40, color: "#ef4444" }
            ];

            const bmiVal = parseFloat(result.bmi);
            const clampedBMI = Math.min(Math.max(bmiVal, 0), 40);
            const barMax = 40;

            // Build segment data for stacked horizontal bar
            const segValues = segments.map(s => s.to - s.from);
            const segColors = segments.map(s => s.color);

            // Position of the marker as percentage
            const markerPct = (clampedBMI / barMax) * 100;

            chartInstance = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: [""],
                    datasets: segments.map((s, i) => ({
                        label: s.label,
                        data: [segValues[i]],
                        backgroundColor: s.color,
                        borderColor: s.color,
                        borderWidth: 1,
                        barPercentage: 0.6,
                        categoryPercentage: 1
                    }))
                },
                options: {
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            min: 0,
                            max: barMax,
                            ticks: {
                                stepSize: 5,
                                callback: function(v) { return v; }
                            },
                            title: {
                                display: true,
                                text: "BMI"
                            }
                        },
                        y: {
                            stacked: true,
                            display: false
                        }
                    },
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                padding: 12,
                                font: { size: 12 },
                                generateLabels: function(chart) {
                                    // Use segment labels with color boxes
                                    return segments.map((s, i) => ({
                                        text: s.label,
                                        fillStyle: s.color,
                                        strokeStyle: s.color,
                                        lineWidth: 1,
                                        index: i
                                    }));
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const seg = segments[context.datasetIndex];
                                    return seg.label + ": " + seg.from + " - " + seg.to;
                                }
                            }
                        }
                    }
                },
                plugins: [{
                    id: "bmiMarker",
                    afterDraw: function(chart) {
                        const ctx2 = chart.ctx;
                        const chartArea = chart.chartArea;
                        const xScale = chart.scales.x;
                        const yScale = chart.scales.y;

                        const xPos = xScale.getPixelForValue(clampedBMI);
                        const yTop = yScale.getPixelForValue(0) - 10;
                        const yBottom = yScale.getPixelForValue(0) + 10;

                        // Draw marker triangle
                        ctx2.save();
                        ctx2.beginPath();
                        ctx2.moveTo(xPos, yTop - 8);
                        ctx2.lineTo(xPos - 8, yTop + 4);
                        ctx2.lineTo(xPos + 8, yTop + 4);
                        ctx2.closePath();
                        ctx2.fillStyle = "#1e293b";
                        ctx2.fill();

                        // Draw value label above marker
                        ctx2.font = "bold 13px -apple-system, sans-serif";
                        ctx2.textAlign = "center";
                        ctx2.fillStyle = "#1e293b";
                        const labelText = result.bmi;
                        const textWidth = ctx2.measureText(labelText).width;
                        const labelX = xPos;
                        const labelY = yTop - 14;

                        // Background
                        ctx2.fillStyle = "rgba(255,255,255,0.9)";
                        const pad = 4;
                        ctx2.roundRect ? ctx2.roundRect(labelX - textWidth/2 - pad, labelY - 14, textWidth + pad*2, 20, 4) : null;
                        ctx2.fill();

                        ctx2.fillStyle = "#1e293b";
                        ctx2.textAlign = "center";
                        ctx2.fillText(labelText, labelX, labelY);
                        ctx2.restore();
                    }
                }]
            });
        }

        function resetForm() {
            document.getElementById("height").value = 170;
            document.getElementById("weight").value = 70;
            document.getElementById('resultArea').classList.add('hidden');
            document.getElementById('chartContainer').classList.add('hidden');
            if (chartInstance) {
                chartInstance.destroy();
                chartInstance = null;
            }
        }

        // 页面加载后自动计算
        document.addEventListener("DOMContentLoaded", function() {
            
            setTimeout(doCalculate, 100);
        });
