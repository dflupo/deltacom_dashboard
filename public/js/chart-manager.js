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

    // Crea tutti i blocchi operatore con i 3 grafici
    renderOperatorCharts(operatorsData, selectedOperators) {
        const metrics = [
            { key: 'bpm', label: 'Battiti per Minuto (BPM)', unit: 'BPM' },
            { key: 'distance', label: 'Distanza (metri)', unit: 'Metri' },
            { key: 'speed', label: 'Velocità (m/s)', unit: 'm/s' }
        ];
        const container = document.getElementById('charts-section');
        container.innerHTML = '';
        this.charts = {};

        this.assignColors(selectedOperators);

        selectedOperators.forEach(op => {
            const opData = operatorsData[op];
            const color = this.operatorColors[op];
            // Blocco operatore
            const opBox = document.createElement('div');
            opBox.className = 'operator-block';
            opBox.innerHTML = `<h2 style="color:${color};margin-bottom:8px;">${op.charAt(0).toUpperCase() + op.slice(1)}</h2>`;
            metrics.forEach(metric => {
                // Crea canvas
                const chartId = `${op}-${metric.key}-chart`;
                const chartBox = document.createElement('div');
                chartBox.className = 'chart-box';
                chartBox.innerHTML = `
                    <h3>${metric.label}</h3>
                    <canvas id="${chartId}"></canvas>
                    <div class="chart-legend" id="legend-${chartId}"></div>
                `;
                opBox.appendChild(chartBox);
                // Prepara dati
                let data = opData && opData[metric.key] ? opData[metric.key] : [];
                // Ordina per timestamp
                data = data.slice().sort((a, b) => a.unixTimestamp - b.unixTimestamp);
                const labels = data.map(item => item.timestamp);
                const values = data.map(item => item.value);
                // Crea/distruggi grafico
                if (this.charts[chartId]) {
                    this.charts[chartId].destroy();
                }
                this.charts[chartId] = new Chart(document.getElementById(chartId), {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: op.charAt(0).toUpperCase() + op.slice(1),
                            data: values,
                            borderColor: color,
                            backgroundColor: color + '20',
                            borderWidth: 2,
                            fill: false,
                            tension: 0.4,
                            pointRadius: 2,
                            pointHoverRadius: 5
                        }]
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
                // Legenda
                const legendDiv = document.getElementById(`legend-${chartId}`);
                if (legendDiv) {
                    legendDiv.innerHTML = `<span style="display:inline-block;width:16px;height:4px;background:${color};margin-right:6px;vertical-align:middle;"></span><span style="vertical-align:middle;">${op.charAt(0).toUpperCase() + op.slice(1)}</span>`;
                }
                // Se nessun dato, mostra errore visivo
                if (!values.length) {
                    chartBox.insertAdjacentHTML('beforeend', '<div class="chart-error">Nessun dato disponibile per questa metrica</div>');
                }
            });
            container.appendChild(opBox);
        });
    }
}

// Istanza globale
window.chartManager = new ChartManager(); 