const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3051;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use('/data', express.static(DATA_DIR));
app.get('/favicon.ico', (req, res) => res.status(204).end());
// Serve tutti i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API: Elenco giorni/missioni disponibili
app.get('/api/days', (req, res) => {
    fs.readdir(DATA_DIR, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Errore lettura directory' });
        }
        const days = files.filter(f => f.isDirectory()).map(f => f.name);
        res.json({ days });
    });
});

// API: Elenco operatori di un giorno specifico
app.get('/api/operators/:day', (req, res) => {
    const dayDir = path.join(DATA_DIR, req.params.day);
    fs.readdir(dayDir, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(404).json({ error: 'Giorno non trovato' });
        }
        const operators = files.filter(f => f.isDirectory()).map(f => f.name);
        res.json({ operators });
    });
});

// API: Elenco file di un operatore in un giorno specifico
app.get('/api/files/:day/:operator', (req, res) => {
    const operatorDir = path.join(DATA_DIR, req.params.day, req.params.operator);
    fs.readdir(operatorDir, (err, files) => {
        if (err) {
            return res.status(404).json({ error: 'Operatore non trovato' });
        }
        res.json({ files });
    });
});

// API: Elenco operatori (mantenuta per compatibilità)
app.get('/api/operators', (req, res) => {
    // Scansiona tutti i giorni e raccogli tutti gli operatori
    fs.readdir(DATA_DIR, { withFileTypes: true }, async (err, dayDirs) => {
        if (err) {
            return res.status(500).json({ error: 'Errore lettura directory' });
        }
        
        const allOperators = new Set();
        
        for (const dayDir of dayDirs.filter(f => f.isDirectory())) {
            try {
                const operatorPath = path.join(DATA_DIR, dayDir.name);
                const operators = await fs.promises.readdir(operatorPath, { withFileTypes: true });
                operators.filter(f => f.isDirectory()).forEach(op => allOperators.add(op.name));
            } catch (error) {
                console.error(`Errore lettura operatori per ${dayDir.name}:`, error);
            }
        }
        
        res.json({ operators: Array.from(allOperators) });
    });
});

// Avvio server
app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
}); 