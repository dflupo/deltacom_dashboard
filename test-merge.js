const fs = require('fs');
const path = require('path');

// Simula la logica di merge del DataLoader
function mergeNumberedData(dataArray) {
    const merged = {};
    let allValues = [];
    
    dataArray.forEach(data => {
        if (data && data.value) {
            Object.assign(merged, data.value);
            // Raccogli tutti i valori per ricalcolare min/max/mid
            Object.values(data.value).forEach(val => {
                allValues.push(parseFloat(val));
            });
        }
    });
    
    // Ricalcola le statistiche sui dati uniti
    if (allValues.length > 0) {
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const midValue = Math.round((minValue + maxValue) / 2);
        
        return {
            value: merged,
            minValue: minValue,
            midValue: midValue,
            maxValue: maxValue
        };
    }
    
    return merged;
}

// Test con dati reali
async function testMerge() {
    const dataDir = path.join(__dirname, 'data', '20250721', 'guadalupi');
    
    // Carica dati da tutte le cartelle numerate
    const bpmData = [];
    const folders = ['1', '2', '3', '4'];
    
    for (const folder of folders) {
        const filePath = path.join(dataDir, folder, 'bpm.json');
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            bpmData.push(data);
            console.log(`Caricato ${folder}/bpm.json - ${Object.keys(data.value).length} punti dati`);
        }
    }
    
    // Unisci i dati
    const merged = mergeNumberedData(bpmData);
    
    console.log('\n=== RISULTATI UNIONE ===');
    console.log(`Totale punti dati: ${Object.keys(merged.value).length}`);
    console.log(`Min Value: ${merged.minValue}`);
    console.log(`Mid Value: ${merged.midValue}`);
    console.log(`Max Value: ${merged.maxValue}`);
    
    // Verifica che tutti i timestamp siano unici
    const timestamps = Object.keys(merged.value);
    const uniqueTimestamps = new Set(timestamps);
    console.log(`Timestamp unici: ${uniqueTimestamps.size}/${timestamps.length}`);
    
    if (timestamps.length !== uniqueTimestamps.size) {
        console.log('⚠️  ATTENZIONE: Ci sono timestamp duplicati!');
    }
}

testMerge().catch(console.error); 