class FilterManager {
    constructor() {
        this.currentOperator = '';
        // Imposto i limiti hardcoded per il 30 giugno 2025
        this.startTime = '2025-06-30T00:00';
        this.endTime = '2025-06-30T23:59';
        this.selectedOperators = [];
        this.currentDataType = 'bpm'; // default metrica
        this.initOperatorToggleUI();
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
        operators.forEach(op => {
            const btn = document.createElement('button');
            btn.className = 'operator-toggle-btn active';
            btn.textContent = op.charAt(0).toUpperCase() + op.slice(1);
            btn.dataset.operator = op;
            btn.onclick = () => {
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) {
                    if (!this.selectedOperators.includes(op)) this.selectedOperators.push(op);
                } else {
                    this.selectedOperators = this.selectedOperators.filter(o => o !== op);
                }
                this.onOperatorToggleChange();
            };
            group.appendChild(btn);
        });
        this.onOperatorToggleChange();
    }

    // Aggiorna i grafici quando cambia la selezione operatori
    onOperatorToggleChange() {
        if (window.dashboard) {
            window.dashboard.updateMainChart();
            window.dashboard.updateStats();
        }
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
                    filteredData[operatorName][metric] = data;
                });
            }
        });
        return filteredData;
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

// Istanza globale del filter manager
window.filterManager = new FilterManager(); 