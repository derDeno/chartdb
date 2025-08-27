import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import process from 'node:process';

const app = express();
const port = process.env.PORT || 80;
const dataDir = process.env.DIAGRAMS_DIR || '/data';
const filterDir = path.join(dataDir, 'diagram-filters');
const configFile = path.join(dataDir, 'config.json');

app.use(express.json({ limit: '10mb' }));

async function readJSON(filePath) {
    const text = await fs.readFile(filePath, 'utf8');
    return JSON.parse(text);
}

async function writeJSON(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

app.get('/api/config', async (req, res) => {
    try {
        const config = await readJSON(configFile);
        res.json(config);
    } catch (e) {
        if (e.code === 'ENOENT') return res.json({});
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        await writeJSON(configFile, req.body);
        res.status(204).end();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/diagram-filters/:id', async (req, res) => {
    const filePath = path.join(filterDir, `${req.params.id}.json`);
    try {
        const filter = await readJSON(filePath);
        res.json(filter);
    } catch (e) {
        if (e.code === 'ENOENT') return res.status(404).end();
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/diagram-filters/:id', async (req, res) => {
    const filePath = path.join(filterDir, `${req.params.id}.json`);
    try {
        await writeJSON(filePath, req.body);
        res.status(204).end();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/diagram-filters/:id', async (req, res) => {
    const filePath = path.join(filterDir, `${req.params.id}.json`);
    try {
        await fs.unlink(filePath);
        res.status(204).end();
    } catch (e) {
        if (e.code === 'ENOENT') return res.status(204).end();
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/diagrams', async (_req, res) => {
    try {
        await fs.mkdir(dataDir, { recursive: true });
        const files = await fs.readdir(dataDir);
        const diagrams = [];
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            const diagram = await readJSON(path.join(dataDir, file));
            diagrams.push(diagram);
        }
        res.json(diagrams);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/diagrams/:id', async (req, res) => {
    const filePath = path.join(dataDir, `${req.params.id}.json`);
    try {
        const diagram = await readJSON(filePath);
        res.json(diagram);
    } catch (e) {
        if (e.code === 'ENOENT') return res.status(404).end();
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/diagrams/:id', async (req, res) => {
    const filePath = path.join(dataDir, `${req.params.id}.json`);
    try {
        await writeJSON(filePath, req.body);
        res.status(204).end();
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/diagrams/:id', async (req, res) => {
    const filePath = path.join(dataDir, `${req.params.id}.json`);
    try {
        await fs.unlink(filePath);
        res.status(204).end();
    } catch (e) {
        if (e.code === 'ENOENT') return res.status(204).end();
        res.status(500).json({ error: e.message });
    }
});

// static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
