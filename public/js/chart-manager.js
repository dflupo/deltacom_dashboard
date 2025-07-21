class ChartManager {
    constructor() {
        this.operatorColors = {};
        this.charts = {};
        // Palette a contrasto per massimo 5 serie
        this.HIGH_CONTRAST_COLORS = [
            '#3b82f6', // blu
            '#ef4444', // rosso
            '#10b981', // verde
            '#f59e42', // arancione
            '#a21caf', // viola
        ];
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

    // Assegna un colore unico e ben contrastato a ogni operatore (fino a 5 diversi)
    assignColors(operators) {
        // Reset colori per evitare residui
        this.operatorColors = {};
        operators.forEach((op, idx) => {
            const colorIdx = idx % this.HIGH_CONTRAST_COLORS.length;
            this.operatorColors[op] = this.HIGH_CONTRAST_COLORS[colorIdx];
        });
        
        // Sincronizza con FilterManager se disponibile
        if (window.filterManager && window.filterManager.assignColors) {
            window.filterManager.assignColors(operators);
        }
    }

    renderAllCharts(operatorsData, selectedOperators) {
        const metrics = [
            { key: 'bpm', label: 'Battiti per Minuto (BPM)', unit: 'BPM', chartId: 'bpm-chart', legendId: 'legend-bpm' },
            { key: 'distance', label: 'Distanza (metri)', unit: 'Metri', chartId: 'distance-chart', legendId: 'legend-distance' },
            { key: 'speed', label: 'Velocità (m/s)', unit: 'm/s', chartId: 'speed-chart', legendId: 'legend-speed' }
        ];
        this.assignColors(selectedOperators);

        // Funzione per abbreviare i numeri (solo mobile)
        function abbreviateNumber(value) {
            if (value >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
            if (value >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
            return value;
        }
        const isMobileOrTablet = window.matchMedia && window.matchMedia('(max-width: 1024px), (max-height: 600px)').matches;

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
                return {
                    label: op.charAt(0).toUpperCase() + op.slice(1),
                    data: opData.map(item => ({ x: item.timestamp, y: item.value })), // formato XY
                    borderColor: this.operatorColors[op],
                    backgroundColor: this.operatorColors[op] + '60',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 1.2,
                    pointHoverRadius: 3
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
                    datasets: datasets // labels non serve più
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: false },
                        legend: { display: false },
                        tooltip: { mode: 'index', intersect: false,
                            callbacks: {
                                title: (context) => {
                                    const date = new Date(context[0].parsed.x);
                                    if (isMobileOrTablet) {
                                        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                    }
                                    return date.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            display: true,
                            title: { display: true, text: 'Tempo' },
                            time: {
                                tooltipFormat: isMobileOrTablet ? 'HH:mm:ss' : 'dd-MM-yyyy HH:mm:ss',
                                displayFormats: {
                                    hour: isMobileOrTablet ? 'HH:mm' : 'dd-MM-yyyy HH:mm',
                                    minute: 'HH:mm'
                                }
                            },
                            ticks: { maxTicksLimit: 10, maxRotation: 45 }
                        },
                        y: {
                            display: true,
                            title: {
                                display: isMobileOrTablet ? false : true,
                                text: metric.unit
                            },
                            beginAtZero: false,
                            ticks: {
                                callback: function(value) {
                                    if (isMobileOrTablet) {
                                        return abbreviateNumber(value);
                                    }
                                    return value;
                                }
                            }
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

            // Se nessun dato, mostra errore visivo SOLO se tutti i dataset sono vuoti
            const allEmpty = datasets.every(ds => !ds.data || ds.data.length === 0);
            // Rimuovo eventuali errori precedenti
            const prevError = canvas.parentElement.querySelector('.chart-error');
            if (prevError) prevError.remove();
            if (allEmpty) {
                canvas.parentElement.insertAdjacentHTML('beforeend', '<div class="chart-error">Nessun dato disponibile per questa metrica</div>');
            }
        });
    }

    // Aggiorna i grafici di confronto (wrapper per renderAllCharts)
    updateComparisonChart(operatorsData, dataType, selectedOperators) {
        // Se non vengono passati dati, usa quelli attualmente selezionati
        if (!operatorsData || !selectedOperators) {
            operatorsData = {};
            selectedOperators = [];
        }
        this.renderAllCharts(operatorsData, selectedOperators);
    }

    // Pulisce tutti i grafici e le legende
    clearCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
        // Svuota le legende
        const legendIds = ['legend-bpm', 'legend-distance', 'legend-speed'];
        legendIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
    }
}

// Istanza globale
window.chartManager = new ChartManager(); 