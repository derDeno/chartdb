import { promises as fs } from 'node:fs';
import path from 'node:path';

const jsonContentType = { 'Content-Type': 'application/json; charset=utf-8' };
const defaultConfig = { defaultDiagramId: '' };
const includeKeys = [
    'tables',
    'relationships',
    'dependencies',
    'areas',
    'customTypes',
    'notes',
];

export const resolveDataDir = () =>
    process.env.CHARTDB_DATA_DIR ?? path.join(process.cwd(), 'data');

const ensureDir = async (dir) => {
    await fs.mkdir(dir, { recursive: true });
};

const safeJsonParse = (text) => {
    if (!text) return undefined;
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
};

const readJsonFile = async (filePath) => {
    const text = await fs.readFile(filePath, 'utf8');
    return safeJsonParse(text);
};

const writeJsonAtomic = async (filePath, data) => {
    const dir = path.dirname(filePath);
    await ensureDir(dir);
    const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
    const json = JSON.stringify(data);
    const handle = await fs.open(tempPath, 'w');
    try {
        await handle.writeFile(json, 'utf8');
        await handle.sync();
    } finally {
        await handle.close();
    }
    await fs.rename(tempPath, filePath);
};

const readRequestBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    if (chunks.length === 0) {
        return '';
    }
    return Buffer.concat(chunks).toString('utf8');
};

const sendJson = (res, statusCode, data) => {
    res.writeHead(statusCode, jsonContentType);
    res.end(JSON.stringify(data));
};

const sendEmpty = (res, statusCode) => {
    res.statusCode = statusCode;
    res.end();
};

const isSafeId = (value) => {
    if (!value) return false;
    if (value.includes('..')) return false;
    return path.basename(value) === value;
};

const buildIncludeSet = (url) => {
    const include = url.searchParams.get('include');
    if (!include) return new Set();
    return new Set(
        include
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean)
    );
};

const stripDiagram = (diagram, includeSet) => {
    if (includeSet.size === 0) {
        const trimmed = { ...diagram };
        for (const key of includeKeys) {
            delete trimmed[key];
        }
        return trimmed;
    }

    const trimmed = { ...diagram };
    for (const key of includeKeys) {
        if (!includeSet.has(key)) {
            delete trimmed[key];
        }
    }
    return trimmed;
};

export const createApiHandler = ({ dataDir = resolveDataDir() } = {}) => {
    const diagramsDir = path.join(dataDir, 'diagrams');
    const filtersDir = path.join(dataDir, 'diagram-filters');
    const configPath = path.join(dataDir, 'config.json');

    return async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (!url.pathname.startsWith('/api/')) {
            if (next) {
                next();
            }
            return false;
        }

        try {
            if (url.pathname === '/api/health' && req.method === 'GET') {
                sendJson(res, 200, { ok: true });
                return true;
            }

            if (url.pathname === '/api/config') {
                if (req.method === 'GET') {
                    try {
                        const config = await readJsonFile(configPath);
                        sendJson(res, 200, config ?? defaultConfig);
                    } catch (error) {
                        if (error?.code === 'ENOENT') {
                            sendJson(res, 200, defaultConfig);
                        } else {
                            throw error;
                        }
                    }
                    return true;
                }

                if (req.method === 'PUT') {
                    const body = await readRequestBody(req);
                    const data = safeJsonParse(body);
                    if (!data || typeof data !== 'object') {
                        sendJson(res, 400, { error: 'Invalid config JSON.' });
                        return true;
                    }
                    await writeJsonAtomic(configPath, data);
                    sendEmpty(res, 204);
                    return true;
                }
            }

            if (url.pathname.startsWith('/api/diagram-filters/')) {
                const diagramId = decodeURIComponent(
                    url.pathname.replace('/api/diagram-filters/', '')
                );

                if (!isSafeId(diagramId)) {
                    sendJson(res, 400, { error: 'Invalid diagram id.' });
                    return true;
                }

                const filterPath = path.join(filtersDir, `${diagramId}.json`);

                if (req.method === 'GET') {
                    try {
                        const filter = await readJsonFile(filterPath);
                        sendJson(res, 200, filter ?? {});
                    } catch (error) {
                        if (error?.code === 'ENOENT') {
                            sendEmpty(res, 404);
                        } else {
                            throw error;
                        }
                    }
                    return true;
                }

                if (req.method === 'PUT') {
                    const body = await readRequestBody(req);
                    const data = safeJsonParse(body);
                    if (!data || typeof data !== 'object') {
                        sendJson(res, 400, { error: 'Invalid filter JSON.' });
                        return true;
                    }
                    await writeJsonAtomic(filterPath, data);
                    sendEmpty(res, 204);
                    return true;
                }

                if (req.method === 'DELETE') {
                    try {
                        await fs.unlink(filterPath);
                    } catch (error) {
                        if (error?.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                    sendEmpty(res, 204);
                    return true;
                }
            }

            if (url.pathname === '/api/diagrams' && req.method === 'GET') {
                const includeSet = buildIncludeSet(url);
                await ensureDir(diagramsDir);
                const files = await fs.readdir(diagramsDir);
                const diagrams = [];

                for (const file of files) {
                    if (!file.endsWith('.json')) continue;
                    const diagramPath = path.join(diagramsDir, file);
                    try {
                        const diagram = await readJsonFile(diagramPath);
                        if (diagram) {
                            diagrams.push(stripDiagram(diagram, includeSet));
                        }
                    } catch (error) {
                        if (error?.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                }

                sendJson(res, 200, diagrams);
                return true;
            }

            if (url.pathname === '/api/diagrams' && req.method === 'POST') {
                const body = await readRequestBody(req);
                const data = safeJsonParse(body);
                if (!data || typeof data !== 'object') {
                    sendJson(res, 400, { error: 'Invalid diagram JSON.' });
                    return true;
                }
                const diagramId = data.id;
                if (!isSafeId(diagramId)) {
                    sendJson(res, 400, { error: 'Invalid diagram id.' });
                    return true;
                }
                const diagramPath = path.join(diagramsDir, `${diagramId}.json`);
                await writeJsonAtomic(diagramPath, data);
                sendEmpty(res, 204);
                return true;
            }

            if (url.pathname.startsWith('/api/diagrams/')) {
                const diagramId = decodeURIComponent(
                    url.pathname.replace('/api/diagrams/', '')
                );
                if (!isSafeId(diagramId)) {
                    sendJson(res, 400, { error: 'Invalid diagram id.' });
                    return true;
                }
                const diagramPath = path.join(diagramsDir, `${diagramId}.json`);

                if (req.method === 'GET') {
                    try {
                        const includeSet = buildIncludeSet(url);
                        const diagram = await readJsonFile(diagramPath);
                        if (!diagram) {
                            sendEmpty(res, 404);
                            return true;
                        }
                        sendJson(res, 200, stripDiagram(diagram, includeSet));
                    } catch (error) {
                        if (error?.code === 'ENOENT') {
                            sendEmpty(res, 404);
                        } else {
                            throw error;
                        }
                    }
                    return true;
                }

                if (req.method === 'PUT') {
                    const body = await readRequestBody(req);
                    const data = safeJsonParse(body);
                    if (!data || typeof data !== 'object') {
                        sendJson(res, 400, { error: 'Invalid diagram JSON.' });
                        return true;
                    }
                    if (data.id && data.id !== diagramId) {
                        sendJson(res, 400, { error: 'Diagram id mismatch.' });
                        return true;
                    }
                    await writeJsonAtomic(diagramPath, data);
                    sendEmpty(res, 204);
                    return true;
                }

                if (req.method === 'DELETE') {
                    try {
                        await fs.unlink(diagramPath);
                    } catch (error) {
                        if (error?.code !== 'ENOENT') {
                            throw error;
                        }
                    }
                    sendEmpty(res, 204);
                    return true;
                }
            }

            sendJson(res, 404, { error: 'Not found.' });
            return true;
        } catch {
            sendJson(res, 500, { error: 'Internal server error.' });
            return true;
        }
    };
};
