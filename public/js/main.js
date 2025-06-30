class Dashboard {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    // Inizializza la dashboard
    async init() {
        try {
            console.log('🚀 Inizializzazione dashboard...');
            
            // Mostra loading
            this.showLoading();
            
            // Carica i dati
            await this.loadData();
            
            // Popola i filtri
            this.populateFilters();
            
            // Nasconde loading
            this.hideLoading();
            
            // Aggiorna la visualizzazione iniziale
            this.updateMainChart();
            this.updateStats();
            
            this.isInitialized = true;
            console.log('✅ Dashboard inizializzata con successo!');
            
        } catch (error) {
            console.error('❌ Errore durante l\'inizializzazione:', error);
            this.showError('Errore durante il caricamento dei dati');
        }
    }

    // Carica tutti i dati
    async loadData() {
        console.log('📊 Caricamento dati...');
        
        // Scansiona gli operatori disponibili
        const operators = await window.dataLoader.scanOperators();
        console.log('Operatori trovati:', operators);
        
        if (operators.length === 0) {
            throw new Error('Nessun operatore trovato');
        }
    }

    // Inizializza i grafici (ora non serve più)
    initCharts() {
        // Non serve più inizializzare grafici singoli
    }

    // Popola i filtri con i dati disponibili
    populateFilters() {
        const operators = window.dataLoader.availableOperators;
        window.filterManager.populateOperatorSelect(operators);
        const allData = window.dataLoader.getAllData();
        window.filterManager.setTimeRanges(allData);
    }

    // Aggiorna i grafici (mostra sempre tutti)
    updateMainChart() {
        const data = window.filterManager.getFilteredData();
        window.chartManager.renderAllCharts(data);
    }

    // Aggiorna le statistiche
    updateStats() {
        const data = window.filterManager.getFilteredData();
        
        if (!data || data.length === 0) {
            this.updateStatElements('-', '-', '-', '-');
            return;
        }

        const stats = window.dataLoader.calculateStats(data);
        const duration = window.dataLoader.calculateDuration(data);
        
        this.updateStatElements(
            stats.min.toFixed(2),
            stats.max.toFixed(2),
            stats.avg.toFixed(2),
            duration
        );
    }

    // Aggiorna il grafico di confronto
    updateComparisonChart() {
        const selectedOperators = window.filterManager.selectedOperators;
        
        if (selectedOperators.length === 0) {
            window.chartManager.clearCharts();
            return;
        }

        const allData = window.filterManager.getAllFilteredData();
        const dataType = window.filterManager.currentDataType;
        
        window.chartManager.updateComparisonChart(allData, dataType, selectedOperators);
    }

    // Aggiorna gli elementi delle statistiche
    updateStatElements(min, max, avg, duration) {
        const minElement = document.getElementById('min-value');
        const maxElement = document.getElementById('max-value');
        const avgElement = document.getElementById('avg-value');
        const durationElement = document.getElementById('duration');
        
        if (minElement) minElement.textContent = min;
        if (maxElement) maxElement.textContent = max;
        if (avgElement) avgElement.textContent = avg;
        if (durationElement) durationElement.textContent = duration;
    }

    // Mostra loading
    showLoading() {
        const container = document.querySelector('.container');
        if (container) {
            const loading = document.createElement('div');
            loading.className = 'loading';
            loading.innerHTML = `
                <div>
                    <h3>Caricamento dati...</h3>
                    <p>Inizializzazione dashboard in corso</p>
                </div>
            `;
            container.appendChild(loading);
        }
    }

    // Nasconde loading
    hideLoading() {
        const loading = document.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }

    // Mostra errore
    showError(message) {
        const container = document.querySelector('.container');
        if (container) {
            const error = document.createElement('div');
            error.className = 'error';
            error.innerHTML = `
                <div style="background: #fee; color: #c33; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>❌ Errore</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-primary">Riprova</button>
                </div>
            `;
            container.appendChild(error);
        }
    }

    // Esporta dati in CSV
    exportToCSV() {
        const data = window.filterManager.getFilteredData();
        if (!data || data.length === 0) {
            alert('Nessun dato da esportare');
            return;
        }

        const dataType = window.filterManager.currentDataType;
        const operatorName = window.filterManager.currentOperator;
        
        // Crea header CSV
        const headers = ['Timestamp', this.getDataTypeLabel(dataType)];
        const csvContent = [
            headers.join(','),
            ...data.map(item => `${item.timestamp},${item.value}`)
        ].join('\n');

        // Crea e scarica file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${operatorName}_${dataType}_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Ottiene l'etichetta per il tipo di dato
    getDataTypeLabel(dataType) {
        const labels = {
            'bpm': 'Battiti per Minuto',
            'distance': 'Distanza (metri)',
            'speed': 'Velocità (m/s)'
        };
        return labels[dataType] || dataType;
    }

    // Ottiene informazioni sui dati
    getDataInfo() {
        const allData = window.dataLoader.getAllData();
        const info = {
            totalOperators: Object.keys(allData).length,
            operators: Object.keys(allData),
            dataTypes: ['bpm', 'distance', 'speed'],
            totalRecords: 0
        };

        Object.values(allData).forEach(operatorData => {
            if (operatorData) {
                Object.values(operatorData).forEach(dataTypeData => {
                    if (dataTypeData) {
                        info.totalRecords += dataTypeData.length;
                    }
                });
            }
        });

        return info;
    }

    // Debug: mostra informazioni sui dati
    debugData() {
        const info = this.getDataInfo();
        console.log('📊 Informazioni dati:', info);
        
        const allData = window.dataLoader.getAllData();
        Object.entries(allData).forEach(([operator, data]) => {
            console.log(`Operatore ${operator}:`, data);
        });
    }
}

// Inizializza la dashboard quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    
    // Aggiungi pulsante debug (solo in sviluppo)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = '🐛 Debug';
        debugBtn.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; padding: 5px 10px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;';
        debugBtn.onclick = () => window.dashboard.debugData();
        document.body.appendChild(debugBtn);
    }
});

// Aggiungi pulsante esporta CSV
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📥 Esporta CSV';
    exportBtn.className = 'btn-primary';
    exportBtn.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 1000;';
    exportBtn.onclick = () => window.dashboard.exportToCSV();
    document.body.appendChild(exportBtn);
}); 