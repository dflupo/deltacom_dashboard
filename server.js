const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

app.use(cors());
app.use('/data', express.static(DATA_DIR));
app.get('/favicon.ico', (req, res) => res.status(204).end());
// Serve tutti i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// API: Elenco operatori (cartelle)
app.get('/api/operators', (req, res) => {
    fs.readdir(DATA_DIR, { withFileTypes: true }, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Errore lettura directory' });
        }
        const operators = files.filter(f => f.isDirectory()).map(f => f.name);
        res.json({ operators });
    });
});

// API: Elenco file di un operatore
app.get('/api/files/:operator', (req, res) => {
    const operatorDir = path.join(DATA_DIR, req.params.operator);
    fs.readdir(operatorDir, (err, files) => {
        if (err) {
            return res.status(404).json({ error: 'Operatore non trovato' });
        }
        res.json({ files });
    });
});

// Avvio server
app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
}); 