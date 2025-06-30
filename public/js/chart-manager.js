class ChartManager {
    constructor() {
        this.operatorColors = {};
        this.charts = {};
    }

    // Genera un colore random
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // Assegna un colore random a ogni operatore (costante per la sessione)
    assignColors(operators) {
        operators.forEach(op => {
            if (!this.operatorColors[op]) {
                this.operatorColors[op] = this.getRandomColor();
            }
        });
    }

    renderAllCharts(operatorsData, selectedOperators) {
        const metrics = [
            { key: 'bpm', label: 'Battiti per Minuto (BPM)', unit: 'BPM', chartId: 'bpm-chart', legendId: 'legend-bpm' },
            { key: 'distance', label: 'Distanza (metri)', unit: 'Metri', chartId: 'distance-chart', legendId: 'legend-distance' },
            { key: 'speed', label: 'Velocità (m/s)', unit: 'm/s', chartId: 'speed-chart', legendId: 'legend-speed' }
        ];
        this.assignColors(selectedOperators);

        metrics.forEach(metric => {
            // Unione di tutti i timestamp disponibili per questa metrica
            let allTimestamps = new Set();
            selectedOperators.forEach(op => {
                if (operatorsData[op] && operatorsData[op][metric.key]) {
                    operatorsData[op][metric.key].forEach(item => {
                        allTimestamps.add(item.timestamp);
                    });
                }
            });
            allTimestamps = Array.from(allTimestamps).sort();

            // Costruisci datasets per ogni operatore
            const datasets = selectedOperators.map(op => {
                const opData = operatorsData[op] && operatorsData[op][metric.key] ? operatorsData[op][metric.key] : [];
                // Mappa timestamp -> valore
                const valueMap = {};
                opData.forEach(item => {
                    valueMap[item.timestamp] = item.value;
                });
                // Allinea i dati su tutti i timestamp
                const data = allTimestamps.map(ts => valueMap[ts] !== undefined ? valueMap[ts] : null);
                return {
                    label: op.charAt(0).toUpperCase() + op.slice(1),
                    data,
                    borderColor: this.operatorColors[op],
                    backgroundColor: this.operatorColors[op] + '20',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 2,
                    pointHoverRadius: 5
                };
            });

            // Crea/distruggi grafico
            const canvas = document.getElementById(metric.chartId);
            if (!canvas) return;
            if (this.charts[metric.key]) {
                this.charts[metric.key].destroy();
            }
            this.charts[metric.key] = new Chart(canvas, {
                type: 'line',
                data: {
                    labels: allTimestamps,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'Tempo' },
                            ticks: { maxTicksLimit: 10, maxRotation: 45 }
                        },
                        y: {
                            display: true,
                            title: { display: true, text: metric.unit },
                            beginAtZero: false
                        }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });

            // Legenda custom sotto il grafico
            const legendDiv = document.getElementById(metric.legendId);
            if (legendDiv) {
                legendDiv.innerHTML = selectedOperators.map(op => `
                    <span style="display:inline-block;margin-right:16px;">
                        <span style="display:inline-block;width:16px;height:4px;background:${this.operatorColors[op]};margin-right:6px;vertical-align:middle;"></span>
                        <span style="vertical-align:middle;">${op.charAt(0).toUpperCase() + op.slice(1)}</span>
                    </span>
                `).join('');
            }

            // Se nessun dato, mostra errore visivo
            if (datasets.every(ds => ds.data.every(v => v === null))) {
                canvas.parentElement.insertAdjacentHTML('beforeend', '<div class="chart-error">Nessun dato disponibile per questa metrica</div>');
            }
        });
    }
}

// Istanza globale
window.chartManager = new ChartManager(); 