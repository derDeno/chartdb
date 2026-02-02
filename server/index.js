import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApiHandler, resolveDataDir } from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number.parseInt(process.env.PORT ?? '80', 10);
const dataDir = resolveDataDir();
const staticDir =
    process.env.CHARTDB_STATIC_DIR ?? path.resolve(__dirname, '..', 'dist');

const apiHandler = createApiHandler({ dataDir });

const mimeTypes = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.webp', 'image/webp'],
    ['.ico', 'image/x-icon'],
    ['.woff', 'font/woff'],
    ['.woff2', 'font/woff2'],
    ['.ttf', 'font/ttf'],
    ['.map', 'application/json; charset=utf-8'],
]);

const sendFile = async (res, filePath) => {
    const ext = path.extname(filePath);
    const contentType = mimeTypes.get(ext) ?? 'application/octet-stream';
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
};

const resolveStaticPath = (urlPath) => {
    const decoded = decodeURIComponent(urlPath.split('?')[0]);
    const safePath = path.normalize(decoded).replace(/^([/\\])+/, '');
    return path.join(staticDir, safePath);
};

const serveStatic = async (req, res) => {
    const urlPath = req.url ?? '/';
    const filePath = resolveStaticPath(urlPath === '/' ? '/index.html' : urlPath);

    try {
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            await sendFile(res, indexPath);
            return;
        }
        await sendFile(res, filePath);
    } catch (error) {
        if (error?.code === 'ENOENT') {
            const fallbackPath = path.join(staticDir, 'index.html');
            try {
                await sendFile(res, fallbackPath);
                return;
            } catch (fallbackError) {
                res.statusCode = 404;
                res.end('Not Found');
                return;
            }
        }

        res.statusCode = 500;
        res.end('Internal Server Error');
    }
};

const server = http.createServer(async (req, res) => {
    const handled = await apiHandler(req, res);
    if (handled) {
        return;
    }
    await serveStatic(req, res);
});

server.listen(port, () => {
    console.log(`ChartDB server listening on ${port}`);
    console.log(`Data directory: ${dataDir}`);
    console.log(`Static directory: ${staticDir}`);
});
