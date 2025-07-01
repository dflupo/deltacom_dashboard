class DaySelector {
    constructor() {
        this.selectedDay = null;
        this.availableDays = [];
        this.container = null;
        this.onChangeCallback = null;
    }

    // Inizializza il selettore
    async init(containerId, onChangeCallback = null) {
        this.container = document.getElementById(containerId);
        this.onChangeCallback = onChangeCallback;
        
        if (!this.container) {
            console.error(`Container ${containerId} non trovato`);
            return;
        }

        // Carica i giorni disponibili
        await this.loadAvailableDays();
        
        // Seleziona il primo giorno di default se non c'è selezione
        if (!this.selectedDay && this.availableDays.length > 0) {
            this.selectedDay = this.availableDays[0];
        }

        // Renderizza l'interfaccia
        this.render();
        
        // Aggiungi event listeners
        this.addEventListeners();
    }

    // Carica i giorni disponibili
    async loadAvailableDays() {
        try {
            this.availableDays = await window.dataLoader.scanDays();
            console.log('Giorni disponibili:', this.availableDays);
        } catch (error) {
            console.error('Errore caricamento giorni:', error);
            this.availableDays = [];
        }
    }

    // Renderizza l'interfaccia
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="day-selector">
                <div class="day-selector-header">
                    <h3>📅 Seleziona Giorno/Missione</h3>
                </div>
                <div class="day-selector-content">
                    <div class="day-grid" id="day-grid">
                        ${this.renderDayOptions()}
                    </div>
                </div>
                <div class="day-selector-footer">
                    <span class="selected-count">
                        ${this.selectedDay ? '1 giorno selezionato' : 'Nessun giorno selezionato'}
                    </span>
                </div>
            </div>
        `;
    }

    // Renderizza le opzioni dei giorni (radio button)
    renderDayOptions() {
        if (this.availableDays.length === 0) {
            return '<div class="no-days">Nessun giorno disponibile</div>';
        }

        return this.availableDays.map(day => {
            const isSelected = this.selectedDay === day;
            const formattedName = window.dataLoader.formatDayName(day);
            
            return `
                <div class="day-option ${isSelected ? 'selected' : ''}" data-day="${day}">
                    <div class="day-checkbox">
                        <input type="radio" name="day-radio" id="day-${day}" ${isSelected ? 'checked' : ''}>
                        <label for="day-${day}"></label>
                    </div>
                    <div class="day-info">
                        <div class="day-name">${formattedName}</div>
                        <div class="day-id">${day}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Aggiunge gli event listeners
    addEventListeners() {
        // Event listeners per i radio
        const dayOptions = this.container.querySelectorAll('.day-option');
        dayOptions.forEach(option => {
            const radio = option.querySelector('input[type="radio"]');
            radio.addEventListener('change', (e) => {
                const day = option.dataset.day;
                this.selectDay(day);
            });
            // Rendo cliccabile tutta la card
            option.addEventListener('click', (e) => {
                // Evita doppio trigger se clicchi direttamente sul radio
                if (e.target.tagName.toLowerCase() !== 'input') {
                    radio.checked = true;
                    this.selectDay(option.dataset.day);
                }
            });
        });
    }

    // Seleziona un giorno
    selectDay(day) {
        if (this.selectedDay !== day) {
            this.selectedDay = day;
            this.updateUI();
            this.notifyChange();
        }
    }

    // Aggiorna l'interfaccia utente
    updateUI() {
        // Aggiorna i radio
        this.availableDays.forEach(day => {
            const option = this.container.querySelector(`[data-day="${day}"]`);
            const radio = option?.querySelector('input[type="radio"]');
            if (radio) {
                radio.checked = this.selectedDay === day;
                option.classList.toggle('selected', this.selectedDay === day);
            }
        });

        // Aggiorna il contatore
        const countElement = this.container.querySelector('.selected-count');
        if (countElement) {
            countElement.textContent = this.selectedDay ? '1 giorno selezionato' : 'Nessun giorno selezionato';
        }
    }

    // Notifica il cambiamento
    async notifyChange() {
        if (this.onChangeCallback) {
            try {
                // Carica i dati per il giorno selezionato
                if (this.selectedDay) {
                    await window.dataLoader.setSelectedDays([this.selectedDay]);
                }
                // Chiama la callback
                this.onChangeCallback([this.selectedDay]);
            } catch (error) {
                console.error('Errore durante l\'aggiornamento dei dati:', error);
            }
        }
    }

    // Ottiene il giorno selezionato
    getSelectedDay() {
        return this.selectedDay;
    }

    // Imposta il giorno selezionato
    setSelectedDay(day) {
        if (this.availableDays.includes(day)) {
            this.selectedDay = day;
            this.updateUI();
            this.notifyChange();
        }
    }
}

// Istanza globale del day selector
window.daySelector = new DaySelector(); 