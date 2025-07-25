class FilterManager {
    constructor() {
        this.currentOperator = '';
        // Imposto i limiti hardcoded per il 30 giugno 2025
        this.startTime = '2025-06-30T00:00';
        this.endTime = '2025-06-30T23:59';
        // Aggiungo filtri orari con default 00:00 - 23:59
        this.startHour = '00:00';
        this.endHour = '23:59';
        this.selectedOperators = [];
        this.currentDataType = 'bpm'; // default metrica
        
        // Condivido la palette di colori con ChartManager
        this.HIGH_CONTRAST_COLORS = [
            '#3b82f6', // blu
            '#ef4444', // rosso
            '#10b981', // verde
            '#f59e42', // arancione
            '#a21caf', // viola
        ];
        this.operatorColors = {};
        
        this.initOperatorToggleUI();
    }

    // Assegna colori agli operatori (stesso metodo di ChartManager)
    assignColors(operators) {
        // Non riassegnare mai i colori, usa sempre quelli di ChartManager
        if (window.chartManager && window.chartManager.operatorColors) {
            this.operatorColors = { ...window.chartManager.operatorColors };
        }
    }

    // Inizializza la UI dei pulsanti toggle operatori
    initOperatorToggleUI() {
        // Rimosso DOMContentLoaded: la chiamata verrà fatta esplicitamente dopo il caricamento operatori
    }

    // Renderizza i pulsanti toggle per gli operatori
    renderOperatorToggles() {
        const group = document.getElementById('operator-toggle-group');
        if (!group) return;
        group.innerHTML = '';
        const operators = window.dataLoader ? window.dataLoader.availableOperators : [];
        this.selectedOperators = [...operators]; // tutti attivi di default
        
        // Sincronizza la mappatura colori già esistente
        this.assignColors(operators);
        
        // Container per operatori e filtri orari
        const operatorsContainer = document.createElement('div');
        operatorsContainer.className = 'operators-container';
        
        // Aggiungi pulsanti operatori
        const showNames = window.isOperatorNameVisible && window.isOperatorNameVisible();
        operators.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'operator-toggle-btn active';
            btn.textContent = showNames
                ? op.charAt(0).toUpperCase() + op.slice(1)
                : (window.OPERATOR_NAME_ID_MAP[op] || op);
            btn.dataset.operator = op;
            
            // Applica il colore specifico dell'operatore
            const operatorColor = this.operatorColors[op];
            if (operatorColor) {
                btn.style.setProperty('--operator-color', operatorColor);
                btn.style.setProperty('--operator-color-light', operatorColor + '20');
                btn.style.setProperty('--operator-color-dark', operatorColor + '80');
            }
            
            btn.onclick = () => {
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) {
                    if (!this.selectedOperators.includes(op)) this.selectedOperators.push(op);
                } else {
                    this.selectedOperators = this.selectedOperators.filter(o => o !== op);
                }
                this.onOperatorToggleChange();
            };
            operatorsContainer.appendChild(btn);
        });
        
        // Container per filtri orari (spostato a destra)
        const timeFiltersContainer = document.createElement('div');
        timeFiltersContainer.className = 'time-filters-container';
        
        // Input ora inizio
        const startHourInput = document.createElement('input');
        startHourInput.type = 'time';
        startHourInput.className = 'time-input';
        startHourInput.value = this.startHour;
        startHourInput.onchange = (e) => {
            this.startHour = e.target.value;
            this.onTimeFilterChange();
        };
        timeFiltersContainer.appendChild(startHourInput);
        
        // Separatore
        const separator = document.createElement('span');
        separator.className = 'time-separator';
        separator.textContent = '-';
        timeFiltersContainer.appendChild(separator);
        
        // Input ora fine
        const endHourInput = document.createElement('input');
        endHourInput.type = 'time';
        endHourInput.className = 'time-input';
        endHourInput.value = this.endHour;
        endHourInput.onchange = (e) => {
            this.endHour = e.target.value;
            this.onTimeFilterChange();
        };
        timeFiltersContainer.appendChild(endHourInput);
        
        // Pulsante reset
        const resetBtn = document.createElement('button');
        resetBtn.className = 'reset-time-btn';
        resetBtn.textContent = 'Reset';
        resetBtn.onclick = () => {
            this.resetTimeFilters();
            startHourInput.value = this.startHour;
            endHourInput.value = this.endHour;
            this.onTimeFilterChange();
        };
        timeFiltersContainer.appendChild(resetBtn);
        
        // Aggiungi entrambi i container al gruppo principale
        group.appendChild(operatorsContainer);
        group.appendChild(timeFiltersContainer);
        
        this.onOperatorToggleChange();
    }

    // Aggiorna i grafici quando cambia la selezione operatori
    onOperatorToggleChange() {
        if (window.dashboard) {
            window.dashboard.updateMainChart();
            window.dashboard.updateStats();
        }
    }

    // Aggiorna i grafici quando cambiano i filtri orari
    onTimeFilterChange() {
        if (window.dashboard) {
            window.dashboard.updateMainChart();
            window.dashboard.updateStats();
        }
    }

    // Resetta i filtri orari ai valori di default
    resetTimeFilters() {
        this.startHour = '00:00';
        this.endHour = '23:59';
    }

    // Sovrascrivo getFilteredData per compatibilità (non usato più il selettore)
    getFilteredData() {
        // Non più usato
        return null;
    }

    // Ottiene tutti i dati per il confronto multi-operatore
    getAllFilteredData() {
        if (!window.dataLoader) return {};
        const allData = window.dataLoader.getAllData();
        const filteredData = {};
        this.selectedOperators.forEach(operatorName => {
            const operatorData = allData[operatorName];
            if (operatorData) {
                filteredData[operatorName] = {};
                ['bpm', 'distance', 'speed'].forEach(metric => {
                    let data = operatorData[metric] || [];
                    // Applica filtro temporale hardcoded
                    data = window.dataLoader.filterDataByTimeRange(data, this.startTime, this.endTime);
                    // Applica filtro orario
                    data = this.filterDataByHourRange(data);
                    filteredData[operatorName][metric] = data;
                });
            }
        });
        return filteredData;
    }

    // Filtra i dati per intervallo orario
    filterDataByHourRange(data) {
        if (!data || !this.startHour || !this.endHour) return data;
        
        return data.filter(item => {
            // Controlli di sicurezza
            if (!item || !item.timestamp || typeof item.timestamp !== 'string') {
                return false; // Escludi item senza timestamp valido
            }
            
            try {
                // Converti il timestamp ISO in oggetto Date
                const date = new Date(item.timestamp);
                if (isNaN(date.getTime())) {
                    return false; // Escludi date non valide
                }
                
                // Estrai l'ora in formato HH:MM dal timestamp ISO
                const itemHour = date.toTimeString().substring(0, 5); // Prende HH:MM
                
                // Confronta con i range orari
                return itemHour >= this.startHour && itemHour <= this.endHour;
            } catch (error) {
                console.warn('Errore nel parsing del timestamp:', item.timestamp, error);
                return false; // Escludi item con timestamp non valido
            }
        });
    }

    // Imposta i range temporali basati sui dati disponibili
    setTimeRanges(allData) {
        // Nessuna azione: filtro temporale hardcoded
    }

    // Callback quando cambiano i filtri
    onFilterChange() {
        if (window.dashboard) {
            window.dashboard.updateMainChart();
            window.dashboard.updateStats();
        }
    }

    // Resetta tutti i filtri
    resetFilters() {
        this.currentOperator = '';
        this.startTime = null;
        this.endTime = null;
        this.selectedOperators = [];

        // Reset UI
        const operatorSelect = document.getElementById('operator-select');
        if (operatorSelect) operatorSelect.value = '';

        const startTimeInput = document.getElementById('start-time');
        if (startTimeInput) startTimeInput.value = '';

        const endTimeInput = document.getElementById('end-time');
        if (endTimeInput) endTimeInput.value = '';

        // Reset checkboxes
        const checkboxes = document.querySelectorAll('#operator-checkboxes input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = false);
    }

    // Ottiene le impostazioni correnti dei filtri
    getCurrentFilters() {
        return {
            operator: this.currentOperator,
            startTime: this.startTime,
            endTime: this.endTime,
            selectedOperators: [...this.selectedOperators]
        };
    }
}

// === MAPPING OPERATORI: nome <-> id ===
window.OPERATOR_NAME_ID_MAP = {
    lecce: 74,
    lastilla: 75,
    guadalupi: 70,
    midulla: 67,
    lupo: 69,
    schichilone: 34
};
window.OPERATOR_ID_NAME_MAP = Object.fromEntries(Object.entries(window.OPERATOR_NAME_ID_MAP).map(([k,v])=>[v,k.charAt(0).toUpperCase()+k.slice(1)]));

// Istanza globale del filter manager
window.filterManager = new FilterManager(); 