/* eslint-env node */
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const dataDir = process.env.DIAGRAMS_PATH || '/data';
const diagramsDir = path.join(dataDir, 'diagrams');
const filtersDir = path.join(dataDir, 'diagram_filters');
const configFile = path.join(dataDir, 'config.json');

const ensureDir = async (dir) => {
    await fs.mkdir(dir, { recursive: true });
};

const deepMerge = (target, source) => {
    for (const key of Object.keys(source)) {
        const srcVal = source[key];
        const tgtVal = target[key];
        if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
            target[key] = deepMerge(
                tgtVal && typeof tgtVal === 'object' ? { ...tgtVal } : {},
                srcVal
            );
        } else {
            target[key] = srcVal;
        }
    }
    return target;
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/diagrams', async (_req, res) => {
    try {
        await ensureDir(diagramsDir);
        const files = await fs.readdir(diagramsDir);
        const diagrams = await Promise.all(
            files
                .filter((f) => f.endsWith('.json'))
                .map(async (f) => {
                    const file = path.join(diagramsDir, f);
                    const diagram = JSON.parse(
                        await fs.readFile(file, 'utf-8')
                    );
                    if (!diagram.id) {
                        diagram.id = path.basename(f, '.json');
                    }
                    return diagram;
                })
        );
        res.json(diagrams);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/diagrams/:id', async (req, res) => {
    try {
        const file = path.join(diagramsDir, `${req.params.id}.json`);
        const data = await fs.readFile(file, 'utf-8');
        const diagram = JSON.parse(data);
        if (!diagram.id) {
            diagram.id = path.basename(file, '.json');
        }
        res.json(diagram);
    } catch {
        res.status(404).end();
    }
});

app.post('/api/diagrams/:id', async (req, res) => {
    try {
        await ensureDir(diagramsDir);
        const file = path.join(diagramsDir, `${req.params.id}.json`);

        const required = ['name', 'databaseType', 'createdAt', 'updatedAt'];
        const missing = required.filter(
            (key) => !Object.prototype.hasOwnProperty.call(req.body, key)
        );
        if (missing.length) {
            return res.status(400).json({
                error: `Missing required fields: ${missing.join(', ')}`,
            });
        }

        let existing = {};
        try {
            const data = await fs.readFile(file, 'utf-8');
            existing = JSON.parse(data);
        } catch {
            // ignore missing file or invalid JSON
        }

      
        const diagram = deepMerge({ ...existing, id: req.params.id }, req.body);
        const tmpFile = `${file}.tmp`;
      
        await fs.writeFile(tmpFile, JSON.stringify(diagram, null, 2));
        await fs.rename(tmpFile, file);

        try {
            const data = await fs.readFile(file, 'utf-8');
            JSON.parse(data);
        } catch {
            return res
                .status(500)
                .json({ error: 'Failed to verify saved diagram' });
        }


        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/diagrams/:id', async (req, res) => {
    try {
        const file = path.join(diagramsDir, `${req.params.id}.json`);
        await fs.unlink(file);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Config
app.get('/api/config', async (_req, res) => {
    try {
        const data = await fs.readFile(configFile, 'utf-8');
        res.json(JSON.parse(data));
    } catch {
        res.status(404).end();
    }
});

app.post('/api/config', async (req, res) => {
    try {
        await ensureDir(dataDir);
        await fs.writeFile(configFile, JSON.stringify(req.body, null, 2));
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Diagram filters
app.get('/api/diagram-filters/:id', async (req, res) => {
    try {
        const file = path.join(filtersDir, `${req.params.id}.json`);
        const data = await fs.readFile(file, 'utf-8');
        res.json(JSON.parse(data));
    } catch {
        res.status(404).end();
    }
});

app.post('/api/diagram-filters/:id', async (req, res) => {
    try {
        await ensureDir(filtersDir);
        const file = path.join(filtersDir, `${req.params.id}.json`);
        await fs.writeFile(file, JSON.stringify(req.body, null, 2));
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/diagram-filters/:id', async (req, res) => {
    try {
        const file = path.join(filtersDir, `${req.params.id}.json`);
        await fs.unlink(file);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const port = process.env.PORT || 80;
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => console.log(`Server running on ${port}`));
}

export default app;
