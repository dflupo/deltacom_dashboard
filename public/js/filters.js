class FilterManager {
    constructor() {
        this.currentOperator = '';
        this.startTime = null;
        this.endTime = null;
        this.selectedOperators = [];
        
        this.initEventListeners();
    }

    // Inizializza gli event listener
    initEventListeners() {
        // Filtro operatore
        const operatorSelect = document.getElementById('operator-select');
        if (operatorSelect) {
            operatorSelect.addEventListener('change', (e) => {
                this.currentOperator = e.target.value;
                this.onFilterChange();
            });
        }

        // Filtri temporali
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        
        if (startTimeInput) {
            startTimeInput.addEventListener('change', (e) => {
                this.startTime = e.target.value;
                this.onFilterChange();
            });
        }

        if (endTimeInput) {
            endTimeInput.addEventListener('change', (e) => {
                this.endTime = e.target.value;
                this.onFilterChange();
            });
        }

        // Pulsante applica filtri
        const applyFiltersBtn = document.getElementById('apply-filters');
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => {
                this.onFilterChange();
            });
        }
    }

    // Popola il selettore degli operatori
    populateOperatorSelect(operators) {
        const operatorSelect = document.getElementById('operator-select');
        if (!operatorSelect) return;

        // Pulisci le opzioni esistenti
        operatorSelect.innerHTML = '';

        // Aggiungi l'opzione 'Tutti' come default
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'Tutti';
        operatorSelect.appendChild(allOption);

        // Aggiungi gli operatori disponibili
        operators.forEach(operator => {
            const option = document.createElement('option');
            option.value = operator;
            option.textContent = operator.charAt(0).toUpperCase() + operator.slice(1);
            operatorSelect.appendChild(option);
        });

        // Seleziona 'Tutti' di default
        operatorSelect.value = 'all';
        this.currentOperator = 'all';
    }

    // Popola i checkbox per il confronto multi-operatore
    populateOperatorCheckboxes(operators) {
        const checkboxesContainer = document.getElementById('operator-checkboxes');
        if (!checkboxesContainer) return;

        checkboxesContainer.innerHTML = '';

        operators.forEach(operator => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `operator-${operator}`;
            checkbox.value = operator;
            
            const label = document.createElement('label');
            label.htmlFor = `operator-${operator}`;
            label.textContent = operator.charAt(0).toUpperCase() + operator.slice(1);
            
            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            
            // Event listener per il checkbox
            checkbox.addEventListener('change', (e) => {
                this.updateSelectedOperators();
            });
            
            checkboxesContainer.appendChild(checkboxItem);
        });
    }

    // Aggiorna la lista degli operatori selezionati per il confronto
    updateSelectedOperators() {
        const checkboxes = document.querySelectorAll('#operator-checkboxes input[type="checkbox"]:checked');
        this.selectedOperators = Array.from(checkboxes).map(cb => cb.value);
        
        // Trigger per aggiornare il grafico di confronto
        if (window.dashboard) {
            window.dashboard.updateComparisonChart();
        }
    }

    // Imposta i range temporali basati sui dati disponibili
    setTimeRanges(allData) {
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        
        if (!startTimeInput || !endTimeInput) return;

        // Trova il range temporale globale
        let globalMinTime = null;
        let globalMaxTime = null;

        Object.values(allData).forEach(operatorData => {
            if (!operatorData) return;
            
            Object.values(operatorData).forEach(dataTypeData => {
                if (!dataTypeData || dataTypeData.length === 0) return;
                
                const minTime = new Date(dataTypeData[0].timestamp);
                const maxTime = new Date(dataTypeData[dataTypeData.length - 1].timestamp);
                
                if (!globalMinTime || minTime < globalMinTime) {
                    globalMinTime = minTime;
                }
                
                if (!globalMaxTime || maxTime > globalMaxTime) {
                    globalMaxTime = maxTime;
                }
            });
        });

        if (globalMinTime && globalMaxTime) {
            // Formatta le date per input datetime-local
            const formatDateForInput = (date) => {
                return date.toISOString().slice(0, 16);
            };

            startTimeInput.min = formatDateForInput(globalMinTime);
            startTimeInput.max = formatDateForInput(globalMaxTime);
            endTimeInput.min = formatDateForInput(globalMinTime);
            endTimeInput.max = formatDateForInput(globalMaxTime);

            // Imposta valori di default su tutto l'intervallo disponibile
            startTimeInput.value = formatDateForInput(globalMinTime);
            endTimeInput.value = formatDateForInput(globalMaxTime);
            
            this.startTime = startTimeInput.value;
            this.endTime = endTimeInput.value;
        }
    }

    // Ottiene i dati filtrati per l'operatore corrente
    getFilteredData() {
        if (!this.currentOperator || !window.dataLoader) {
            return null;
        }

        // Se 'Tutti' è selezionato, restituisci i dati di tutti gli operatori
        if (this.currentOperator === 'all') {
            const allData = window.dataLoader.getAllData();
            return allData;
        }

        const operatorData = window.dataLoader.getOperatorData(this.currentOperator);
        if (!operatorData || !operatorData[this.currentDataType]) {
            return null;
        }

        let data = operatorData[this.currentDataType];

        // Applica filtri temporali
        if (this.startTime || this.endTime) {
            data = window.dataLoader.filterDataByTimeRange(data, this.startTime, this.endTime);
        }

        return data;
    }

    // Ottiene tutti i dati per il confronto multi-operatore
    getAllFilteredData() {
        if (!window.dataLoader) return {};

        const allData = window.dataLoader.getAllData();
        const filteredData = {};

        this.selectedOperators.forEach(operatorName => {
            const operatorData = allData[operatorName];
            if (operatorData && operatorData[this.currentDataType]) {
                let data = operatorData[this.currentDataType];
                
                // Applica filtri temporali
                if (this.startTime || this.endTime) {
                    data = window.dataLoader.filterDataByTimeRange(data, this.startTime, this.endTime);
                }
                
                filteredData[operatorName] = data;
            }
        });

        return filteredData;
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