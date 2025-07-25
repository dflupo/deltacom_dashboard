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
            
            // Inizializza il day selector
            await this.initDaySelector();
            
            // Nasconde loading
            this.hideLoading();
            
            this.isInitialized = true;
            console.log('✅ Dashboard inizializzata con successo!');
            
        } catch (error) {
            console.error('❌ Errore durante l\'inizializzazione:', error);
            this.showError('Errore durante il caricamento dei dati');
        }
    }

    // Inizializza il day selector
    async initDaySelector() {
        console.log('📅 Inizializzazione day selector...');
        
        // Inizializza il day selector con callback per i cambiamenti
        await window.daySelector.init('day-selector-container', (selectedDays) => {
            this.onDayChanged(selectedDays[0]);
        });
        
        // Se ci sono giorni disponibili, seleziona il primo di default
        const availableDays = window.daySelector.availableDays;
        if (availableDays.length > 0) {
            window.daySelector.setSelectedDay(availableDays[0]);
        }
    }

    // Gestisce il cambiamento del giorno selezionato
    async onDayChanged(selectedDay) {
        console.log('📅 Giorno selezionato cambiato:', selectedDay);
        
        try {
            // Mostra loading
            this.showLoading();
            
            // Reset filtri orari quando cambia la data
            window.filterManager.resetTimeFilters();
            
            // Assegna i colori fissi agli operatori del giorno
            if (window.chartManager && window.dataLoader) {
                window.chartManager.assignColorsToAllOperators(window.dataLoader.availableOperators);
            }
            
            // Aggiorna la UI dei toggle operatori
            window.filterManager.renderOperatorToggles();
            
            // Popola i filtri con i nuovi dati
            this.populateFilters();
            
            // Aggiorna la visualizzazione
            this.updateMainChart();
            this.updateStats();
            
            // Nasconde loading
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ Errore durante l\'aggiornamento:', error);
            this.hideLoading();
            this.showError('Errore durante l\'aggiornamento dei dati');
        }
    }

    // Carica tutti i dati (non più necessario, gestito dal day selector)
    async loadData() {
        // Non serve più caricare dati qui, viene gestito dal day selector
        console.log('📊 Caricamento dati gestito dal day selector');
    }

    // Inizializza i grafici (ora non serve più)
    initCharts() {
        // Non serve più inizializzare grafici singoli
    }

    // Popola i filtri con i dati disponibili
    populateFilters() {
        // Non serve più popolare il selettore operatori
        // La UI dei toggle si aggiorna automaticamente
        const allData = window.dataLoader.getAllData();
        window.filterManager.setTimeRanges(allData);
    }

    // Aggiorna i grafici (solo 3, uno per metrica)
    updateMainChart() {
        const selectedOperators = window.filterManager.selectedOperators;
        if (!selectedOperators || selectedOperators.length === 0) {
            window.chartManager.renderAllCharts({}, []);
            return;
        }
        const allData = window.dataLoader.getAllData();

        // Filtro temporale dinamico in base al giorno selezionato
        let start, end;
        const selectedDay = window.daySelector.getSelectedDay();
        if (selectedDay && /^\d{8}$/.test(selectedDay)) {
            // Se il giorno è in formato YYYYMMDD
            const year = selectedDay.substring(0, 4);
            const month = selectedDay.substring(4, 6);
            const day = selectedDay.substring(6, 8);
            start = `${year}-${month}-${day}T00:00`;
            end = `${year}-${month}-${day}T23:59`;
        } else {
            // Default: nessun filtro
            start = null;
            end = null;
        }

        const filteredData = {};
        selectedOperators.forEach(op => {
            if (allData[op]) {
                filteredData[op] = {};
                Object.keys(allData[op]).forEach(metric => {
                    if (Array.isArray(allData[op][metric])) {
                        // DEBUG: loggo i timestamp ISO dei dati BPM di Lastilla prima del filtro orario
                        if ((op === 'lastilla' || op === 'Lastilla') && metric === 'bpm') {
                            console.log('DEBUG Timestamp ISO BPM Lastilla PRIMA del filtro:', allData[op][metric].map(item => item.timestamp));
                        }
                        let filtered = allData[op][metric].filter(item => {
                            if (!start || !end) return true;
                            const t = new Date(item.timestamp);
                            return t >= new Date(start) && t <= new Date(end);
                        });
                        
                        // Applica filtro orario
                        filtered = window.filterManager.filterDataByHourRange(filtered);
                        
                        // Filtro dinamico per spike di velocità
                        if (metric === 'speed' && filtered.length > 0) {
                            const values = filtered.map(item => item.value);
                            const mean = values.reduce((a, b) => a + b, 0) / values.length;
                            const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
                            const threshold = mean + 3 * std;
                            filtered = filtered.filter(item => item.value <= threshold);
                        }
                        filteredData[op][metric] = filtered;
                    }
                });
            }
        });
        window.chartManager.renderAllCharts(filteredData, selectedOperators);
        // DEBUG: loggo i dati filtrati di Lastilla
        if (filteredData['lastilla']) {
            console.log('DEBUG Lastilla BPM filtrati:', filteredData['lastilla'].bpm);
            console.log('DEBUG Lastilla SPEED filtrati:', filteredData['lastilla'].speed);
        } else if (filteredData['Lastilla']) {
            console.log('DEBUG Lastilla BPM filtrati:', filteredData['Lastilla'].bpm);
            console.log('DEBUG Lastilla SPEED filtrati:', filteredData['Lastilla'].speed);
        }
    }

    // Aggiorna le statistiche (solo se un operatore selezionato)
    updateStats() {
        // Statistiche solo se un operatore attivo
        const selectedOperators = window.filterManager.selectedOperators;
        if (!selectedOperators || selectedOperators.length !== 1) {
            this.updateStatElements('-', '-', '-', '-');
            return;
        }
        const op = selectedOperators[0];
        const allData = window.dataLoader.getAllData();
        const data = allData[op] || {};
        const bpmData = data['bpm'] || [];
        if (!bpmData.length) {
            this.updateStatElements('-', '-', '-', '-');
            return;
        }
        const stats = window.dataLoader.calculateStats(bpmData);
        const duration = window.dataLoader.calculateDuration(bpmData);
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
        const selectedOperators = window.filterManager.selectedOperators;
        if (selectedOperators.length === 0) {
            alert('Seleziona almeno un operatore per esportare i dati');
            return;
        }

        const allData = window.dataLoader.getAllData();
        let csvContent = 'Operatore,Tipo Dato,Timestamp,Valore\n';

        selectedOperators.forEach(operator => {
            if (allData[operator]) {
                Object.keys(allData[operator]).forEach(dataType => {
                    const data = allData[operator][dataType];
                    if (Array.isArray(data)) {
                        data.forEach(item => {
                            const timestamp = window.dataLoader.convertTimestamp(item.unixTimestamp);
                            csvContent += `${operator},${this.getDataTypeLabel(dataType)},${timestamp},${item.value}\n`;
                        });
                    }
                });
            }
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `dati_operatori_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Ottiene l'etichetta per il tipo di dato
    getDataTypeLabel(dataType) {
        const labels = {
            'bpm': 'Battiti per Minuto',
            'distance': 'Distanza',
            'speed': 'Velocità'
        };
        return labels[dataType] || dataType;
    }

    // Ottiene informazioni sui dati
    getDataInfo() {
        const selectedOperators = window.filterManager.selectedOperators;
        const allData = window.dataLoader.getAllData();
        let totalRecords = 0;
        let dateRange = { start: null, end: null };

        selectedOperators.forEach(operator => {
            if (allData[operator]) {
                Object.keys(allData[operator]).forEach(dataType => {
                    const data = allData[operator][dataType];
                    if (Array.isArray(data)) {
                        totalRecords += data.length;
                        data.forEach(item => {
                            const timestamp = new Date(item.timestamp);
                            if (!dateRange.start || timestamp < dateRange.start) {
                                dateRange.start = timestamp;
                            }
                            if (!dateRange.end || timestamp > dateRange.end) {
                                dateRange.end = timestamp;
                            }
                        });
                    }
                });
            }
        });

        return {
            operators: selectedOperators.length,
            totalRecords,
            dateRange
        };
    }

    // Debug dei dati
    debugData() {
        const info = this.getDataInfo();
        console.log('📊 Informazioni sui dati:', info);
        console.log('🎯 Operatori selezionati:', window.filterManager.selectedOperators);
        console.log('📅 Giorno selezionato:', window.daySelector.getSelectedDay());
        console.log('📈 Dati completi:', window.dataLoader.getAllData());
    }
}

// === LIGHT/DARK MODE ===
function setTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function loadThemePreference() {
    const pref = localStorage.getItem('theme');
    if (pref === 'dark') return true;
    if (pref === 'light') return false;
    // Default: dark
    return true;
}

// === VISIBILITÀ NOMI OPERATORI ===
function setOperatorNameVisibility(isVisible) {
    localStorage.setItem('operatorNameVisible', isVisible ? '1' : '0');
}

function loadOperatorNameVisibility() {
    const pref = localStorage.getItem('operatorNameVisible');
    if (pref === '0') return false;
    if (pref === '1') return true;
    return false; // default: nascosto
}

window.isOperatorNameVisible = function() {
    return loadOperatorNameVisibility();
};

// Inizializza la dashboard quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    const isDark = loadThemePreference();
    setTheme(isDark);
    themeToggle.checked = !isDark ? false : true;
    themeToggle.addEventListener('change', (e) => {
        setTheme(e.target.checked);
        localStorage.setItem('theme', e.target.checked ? 'dark' : 'light');
    });

    // === Gestione toggle visibilità nomi operatori ===
    const operatorVisibilityToggle = document.getElementById('operator-visibility-toggle');
    const iconVisibilityOn = document.getElementById('icon-visibility-on');
    const iconVisibilityOff = document.getElementById('icon-visibility-off');
    function updateVisibilityIcons(isVisible) {
        if (iconVisibilityOn && iconVisibilityOff) {
            iconVisibilityOn.style.opacity = isVisible ? '0.3' : '1';
            iconVisibilityOff.style.opacity = isVisible ? '1' : '0.3';
        }
    }
    if (operatorVisibilityToggle) {
        const isVisible = loadOperatorNameVisibility();
        operatorVisibilityToggle.checked = isVisible;
        updateVisibilityIcons(isVisible);
        operatorVisibilityToggle.addEventListener('change', (e) => {
            setOperatorNameVisibility(e.target.checked);
            updateVisibilityIcons(e.target.checked);
            // Aggiorna UI
            if (window.filterManager) window.filterManager.renderOperatorToggles();
            if (window.dashboard) {
                window.dashboard.updateMainChart();
                window.dashboard.updateStats();
            }
        });
    }
}); 