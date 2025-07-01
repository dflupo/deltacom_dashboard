class DataLoader {
    constructor() {
        this.operators = {};
        this.availableOperators = [];
        this.availableDays = [];
        this.selectedDays = [];
        this.apiBase = window.location.origin.includes('localhost') ? 'http://localhost:3051' : '';
    }

    // Converte timestamp Unix in data leggibile (orario italiano CEST)
    convertTimestamp(unixTimestamp) {
        const date = new Date(parseInt(unixTimestamp) * 1000);
        // Converti in orario italiano (CEST)
        return date.toLocaleString('it-IT', {
            timeZone: 'Europe/Rome',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(',', '').replace(/\//g, '-');
    }

    // Formatta il nome del giorno/missione per la visualizzazione
    formatDayName(dayName) {
        // Se è in formato YYYYMMDD, converti in data leggibile
        if (/^\d{8}$/.test(dayName)) {
            const year = dayName.substring(0, 4);
            const month = dayName.substring(4, 6);
            const day = dayName.substring(6, 8);
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Se è un nome di missione, sostituisci _ con spazi e capitalizza
        return dayName.replace(/_/g, ' ')
                     .split(' ')
                     .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                     .join(' ');
    }

    // Carica un singolo file JSON
    async loadJsonFile(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                if (response.status === 404) {
                    // File non trovato: logga solo come info, non come errore
                    console.info(`File opzionale non trovato: ${path}`);
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Errore nel caricamento di ${path}:`, error);
            return null;
        }
    }

    // Unisce dati con numerazione (es. bpm.json + bpm2.json)
    mergeNumberedData(dataArray) {
        const merged = {};
        
        dataArray.forEach(data => {
            if (data && data.value) {
                Object.assign(merged, data.value);
            }
        });
        
        return merged;
    }

    // Normalizza i dati di un operatore
    normalizeOperatorData(operatorName) {
        const operator = this.operators[operatorName];
        const normalized = {};

        // Per ogni tipo di dato (bpm, distance, speed)
        ['bpm', 'distance', 'speed'].forEach(dataType => {
            if (operator[dataType]) {
                const dataArray = Array.isArray(operator[dataType]) ? operator[dataType] : [operator[dataType]];
                const mergedData = this.mergeNumberedData(dataArray);
                
                // Converti in array di oggetti con timestamp ISO (UTC)
                normalized[dataType] = Object.entries(mergedData)
                    .map(([timestamp, value]) => {
                        const date = new Date(parseInt(timestamp) * 1000);
                        return {
                            timestamp: date.toISOString(), // <-- ISO per Chart.js
                            value: parseFloat(value),
                            unixTimestamp: parseInt(timestamp)
                        };
                    })
                    .sort((a, b) => a.unixTimestamp - b.unixTimestamp);
            }
        });

        return normalized;
    }

    // Scansiona i giorni/missioni disponibili
    async scanDays() {
        try {
            const res = await fetch(`${this.apiBase}/api/days`);
            const data = await res.json();
            this.availableDays = data.days || [];
            return this.availableDays;
        } catch (error) {
            console.error('Errore nella scansione giorni:', error);
            return [];
        }
    }

    // Scansiona la cartella data per trovare tutti gli operatori tramite API (compatibilità)
    async scanOperators() {
        try {
            const res = await fetch(`${this.apiBase}/api/operators`);
            const data = await res.json();
            const operatorNames = data.operators || [];
            for (const operatorName of operatorNames) {
                await this.loadOperatorData(operatorName);
            }
            this.availableOperators = operatorNames;
            return this.availableOperators;
        } catch (error) {
            console.error('Errore nella scansione operatori:', error);
            return [];
        }
    }

    // Carica i dati di un operatore da giorni specifici
    async loadOperatorDataFromDays(operatorName, days) {
        const dataTypes = ['bpm', 'distance', 'speed'];
        const operatorData = {};

        for (const day of days) {
            for (const dataType of dataTypes) {
                const dataFiles = [];
                let fileIndex = 1;
                let hasMoreFiles = true;
                
                while (hasMoreFiles) {
                    const fileName = fileIndex === 1 ? `${dataType}.json` : `${dataType}${fileIndex}.json`;
                    const filePath = `${this.apiBase}/data/${day}/${operatorName}/${fileName}`;
                    const data = await this.loadJsonFile(filePath);
                    if (data) {
                        dataFiles.push(data);
                        fileIndex++;
                    } else {
                        hasMoreFiles = false;
                    }
                }
                
                if (dataFiles.length > 0) {
                    if (!operatorData[dataType]) {
                        operatorData[dataType] = [];
                    }
                    operatorData[dataType].push(...dataFiles);
                }
            }
        }
        
        this.operators[operatorName] = operatorData;
    }

    // Carica i dati di un singolo operatore (compatibilità)
    async loadOperatorData(operatorName) {
        const dataTypes = ['bpm', 'distance', 'speed'];
        const operatorData = {};

        for (const dataType of dataTypes) {
            const dataFiles = [];
            let fileIndex = 1;
            let hasMoreFiles = true;
            while (hasMoreFiles) {
                const fileName = fileIndex === 1 ? `${dataType}.json` : `${dataType}${fileIndex}.json`;
                const filePath = `${this.apiBase}/data/${operatorName}/${fileName}`;
                const data = await this.loadJsonFile(filePath);
                if (data) {
                    dataFiles.push(data);
                    fileIndex++;
                } else {
                    hasMoreFiles = false;
                }
            }
            if (dataFiles.length > 0) {
                operatorData[dataType] = dataFiles;
            }
        }
        this.operators[operatorName] = operatorData;
    }

    // Ottiene i dati normalizzati di un operatore
    getOperatorData(operatorName) {
        if (!this.operators[operatorName]) {
            return null;
        }
        return this.normalizeOperatorData(operatorName);
    }

    // Ottiene tutti i dati normalizzati
    getAllData() {
        const allData = {};
        for (const operatorName of this.availableOperators) {
            allData[operatorName] = this.getOperatorData(operatorName);
        }
        return allData;
    }

    // Imposta il giorno selezionato e ricarica i dati (single-select)
    async setSelectedDays(days) {
        // Supporta solo un giorno alla volta
        const day = days && days.length > 0 ? days[0] : null;
        this.selectedDays = day ? [day] : [];
        this.operators = {}; // Reset operatori
        this.availableOperators = []; // Reset operatori disponibili

        if (!day) return;

        try {
            const res = await fetch(`${this.apiBase}/api/operators/${day}`);
            const data = await res.json();
            const operators = data.operators || [];
            this.availableOperators = [...operators];
            for (const operator of operators) {
                await this.loadOperatorDataFromDays(operator, [day]);
            }
        } catch (error) {
            console.error(`Errore caricamento operatori per ${day}:`, error);
        }
    }

    // Filtra i dati per intervallo temporale
    filterDataByTimeRange(data, startTime, endTime) {
        if (!data) return [];
        return data.filter(item => {
            // Converti il timestamp dell'item in oggetto Date (formato italiano DD-MM-YYYY HH:MM:SS)
            const convertItalianTimestamp = (timestamp) => {
                const parts = timestamp.split(/[- :]/);
                return new Date(parts[2] + '-' + parts[1] + '-' + parts[0] + 'T' + parts[3] + ':' + parts[4] + ':' + parts[5]);
            };
            const itemTime = convertItalianTimestamp(item.timestamp);
            const start = startTime ? new Date(startTime) : new Date(0);
            const end = endTime ? new Date(endTime) : new Date();
            return itemTime >= start && itemTime <= end;
        });
    }

    // Calcola statistiche sui dati
    calculateStats(data) {
        if (!data || data.length === 0) {
            return { min: 0, max: 0, avg: 0, count: 0 };
        }
        const values = data.map(item => item.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const count = values.length;
        return { min, max, avg, count };
    }

    // Calcola la durata totale
    calculateDuration(data) {
        if (!data || data.length < 2) return '0 min';
        // Converti i timestamp in formato italiano in oggetti Date
        const convertItalianTimestamp = (timestamp) => {
            const parts = timestamp.split(/[- :]/);
            return new Date(parts[2] + '-' + parts[1] + '-' + parts[0] + 'T' + parts[3] + ':' + parts[4] + ':' + parts[5]);
        };
        const firstTime = convertItalianTimestamp(data[0].timestamp);
        const lastTime = convertItalianTimestamp(data[data.length - 1].timestamp);
        const durationMs = lastTime - firstTime;
        const durationMinutes = Math.round(durationMs / (1000 * 60));
        if (durationMinutes < 60) {
            return `${durationMinutes} min`;
        } else {
            const hours = Math.floor(durationMinutes / 60);
            const minutes = durationMinutes % 60;
            return `${hours}h ${minutes}min`;
        }
    }
}

// Istanza globale del data loader
window.dataLoader = new DataLoader(); 