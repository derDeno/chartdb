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
            tables: [{ id: 't1', name: 'Table1' }],
            relationships: [
                {
                    id: 'r1',
                    name: 'Rel1',
                    sourceTableId: 't1',
                    targetTableId: 't1',
                    sourceFieldId: 'f1',
                    targetFieldId: 'f1',
                },
            ],
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
        };
        res = await fetch(`${baseUrl}/api/diagrams/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update),
        });
        expect(res.status).toBe(200);

        res = await fetch(`${baseUrl}/api/diagrams/${id}`);
        const diagram = await res.json();
        expect(diagram.tables).toHaveLength(1);
        expect(diagram.tables[0].id).toBe('t1');
        expect(diagram.relationships).toHaveLength(1);
        expect(diagram.relationships[0].id).toBe('r1');
    });
});

describe('POST /api/diagrams/:id array defaults', () => {
    it('ensures array fields are present when omitted', async () => {
        const id = 'arr-test';
        const minimal = {
            name: 'Diagram',
            databaseType: 'mysql',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
        };

        let res = await fetch(`${baseUrl}/api/diagrams/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(minimal),
        });
        expect(res.status).toBe(200);

        res = await fetch(`${baseUrl}/api/diagrams/${id}`);
        const diagram = await res.json();
        expect(Array.isArray(diagram.tables)).toBe(true);
        expect(Array.isArray(diagram.dependencies)).toBe(true);
        expect(Array.isArray(diagram.areas)).toBe(true);
        expect(Array.isArray(diagram.customTypes)).toBe(true);
    });
});
