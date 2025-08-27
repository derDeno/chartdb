// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { once } from 'events';
import type { AddressInfo } from 'net';

let server;
let baseUrl;
let tempDir;

beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'diagram-test-'));
    process.env.DIAGRAMS_PATH = tempDir;
    process.env.NODE_ENV = 'test';
    const { default: app } = await import('./server.js');
    server = app.listen(0);
    await once(server, 'listening');
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
});

afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(tempDir, { recursive: true, force: true });
    delete process.env.DIAGRAMS_PATH;
    delete process.env.NODE_ENV;
});

describe('POST /api/diagrams/:id deep merge', () => {
    it('preserves existing tables and relationships on partial update', async () => {
        const id = 'test';
        const initial = {
            name: 'Diagram',
            databaseType: 'mysql',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            tables: { t1: { id: 't1', name: 'Table1' } },
            relationships: { r1: { id: 'r1', name: 'Rel1' } },
        };
        let res = await fetch(`${baseUrl}/api/diagrams/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initial),
        });
        expect(res.status).toBe(200);

        const update = {
            name: 'Diagram',
            databaseType: 'mysql',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-02',
            tables: { t2: { id: 't2', name: 'Table2' } },
            relationships: { r2: { id: 'r2', name: 'Rel2' } },
        };
        res = await fetch(`${baseUrl}/api/diagrams/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
        });
        expect(res.status).toBe(200);

        res = await fetch(`${baseUrl}/api/diagrams/${id}`);
        const diagram = await res.json();
        expect(diagram.tables).toHaveProperty('t1');
        expect(diagram.tables).toHaveProperty('t2');
        expect(diagram.relationships).toHaveProperty('r1');
        expect(diagram.relationships).toHaveProperty('r2');
    });
});
