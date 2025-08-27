import process from 'node:process';
import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const DATA_FILE = process.env.DATA_FILE || '/data/diagrams.json';
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/storage', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json({});
            }
            return res.status(500).json({ error: err.message });
        }
        try {
            res.json(JSON.parse(data));
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

app.post('/api/storage', (req, res) => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ status: 'ok' });
    });
});

app.use(express.static('dist'));
app.get('*', (_, res) => {
    res.sendFile(path.resolve('dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
