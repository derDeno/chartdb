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

describe('POST /api/diagrams/:id overwrite', () => {
    it('replaces existing data when fields are omitted', async () => {
        const id = 'test';
        const initial = {
            name: 'Diagram',
            databaseType: 'mysql',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            tables: [{ id: 't1', name: 'Table1' }],
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
        expect(diagram.tables).toHaveLength(0);
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
            tables: [{ id: 't1', name: 'Table1' }],
            customTypes: [{ id: 'ct1', name: 'Type1', kind: 'enum' }],
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
        expect(Array.isArray(diagram.tables[0].fields)).toBe(true);
        expect(Array.isArray(diagram.tables[0].indexes)).toBe(true);
        expect(Array.isArray(diagram.customTypes[0].values)).toBe(true);
        expect(Array.isArray(diagram.customTypes[0].fields)).toBe(true);
    });
});

describe('POST /api/diagrams/:id concurrent saves', () => {
    it('does not corrupt data when requests overlap', async () => {
        const id = 'race';
        const payloadA = {
            name: 'A',
            databaseType: 'mysql',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            tables: [{ id: 'ta', name: 'TA' }],
        };
        const payloadB = {
            name: 'B',
            databaseType: 'mysql',
            createdAt: '2024-01-01',
            updatedAt: '2024-01-01',
            tables: [{ id: 'tb', name: 'TB' }],
        };

        const [resA, resB] = await Promise.all([
            fetch(`${baseUrl}/api/diagrams/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadA),
            }),
            fetch(`${baseUrl}/api/diagrams/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payloadB),
            }),
        ]);
        expect(resA.status).toBe(200);
        expect(resB.status).toBe(200);

        const res = await fetch(`${baseUrl}/api/diagrams/${id}`);
        const diagram = await res.json();

        expect(diagram.tables).toHaveLength(1);
        const tableId = diagram.tables[0].id;
        if (tableId === 'ta') {
            expect(diagram.name).toBe('A');
        } else if (tableId === 'tb') {
            expect(diagram.name).toBe('B');
        } else {
            throw new Error('unexpected table id');
        }
    });
});
