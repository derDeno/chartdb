import React, { useMemo } from 'react';
import { storageContext } from './storage-context';
import type { StorageContext } from './storage-context';
import type { Diagram } from '@/lib/domain/diagram';

const API = '/api';

async function fetchJSON(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    if (!res.ok) {
        throw new Error(res.statusText);
    }
    if (res.status === 204) return undefined;
    return res.json();
}

async function loadDiagram(id: string): Promise<Diagram | undefined> {
    try {
        return await fetchJSON(`${API}/diagrams/${id}`);
    } catch {
        return undefined;
    }
}

async function saveDiagram(diagram: Diagram) {
    await fetchJSON(`${API}/diagrams/${diagram.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(diagram),
    });
}

async function listAllDiagrams(): Promise<Diagram[]> {
    return fetchJSON(`${API}/diagrams`);
}

async function findDiagramBy<T extends keyof Diagram>(
    key: T,
    id: string
): Promise<Diagram | undefined> {
    const diagrams = await listAllDiagrams();
    return diagrams.find((d) => {
        const list = d[key] as unknown;
        return (
            Array.isArray(list) &&
            (list as { id: string }[]).some((e) => e.id === id)
        );
    });
}

export const VolumeStorageProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const value: StorageContext = useMemo(
        () => ({
            async getConfig() {
                return fetchJSON(`${API}/config`);
            },
            async updateConfig(config) {
                await fetchJSON(`${API}/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config),
                });
            },
            async getDiagramFilter(id) {
                try {
                    return await fetchJSON(`${API}/diagram-filters/${id}`);
                } catch {
                    return undefined;
                }
            },
            async updateDiagramFilter(id, filter) {
                await fetchJSON(`${API}/diagram-filters/${id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(filter),
                });
            },
            async deleteDiagramFilter(id) {
                await fetchJSON(`${API}/diagram-filters/${id}`, {
                    method: 'DELETE',
                });
            },
            async addDiagram({ diagram }) {
                await saveDiagram(diagram);
            },
            async listDiagrams() {
                return listAllDiagrams();
            },
            async getDiagram(id) {
                return loadDiagram(id);
            },
            async updateDiagram({ id, attributes }) {
                const diagram = await loadDiagram(id);
                if (!diagram) return;
                Object.assign(diagram, attributes);
                await saveDiagram(diagram);
            },
            async deleteDiagram(id) {
                await fetchJSON(`${API}/diagrams/${id}`, { method: 'DELETE' });
            },
            async addTable({ diagramId, table }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.tables = [...(diagram.tables || []), table];
                await saveDiagram(diagram);
            },
            async getTable({ diagramId, id }) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.tables?.find((t) => t.id === id);
            },
            async updateTable({ id, attributes }) {
                const diagram = await findDiagramBy('tables', id);
                if (!diagram) return;
                diagram.tables = (diagram.tables || []).map((t) =>
                    t.id === id ? { ...t, ...attributes } : t
                );
                await saveDiagram(diagram);
            },
            async putTable({ diagramId, table }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.tables = [
                    ...(diagram.tables || []).filter((t) => t.id !== table.id),
                    table,
                ];
                await saveDiagram(diagram);
            },
            async deleteTable({ diagramId, id }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.tables = (diagram.tables || []).filter(
                    (t) => t.id !== id
                );
                await saveDiagram(diagram);
            },
            async listTables(diagramId) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.tables || [];
            },
            async deleteDiagramTables(diagramId) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.tables = [];
                await saveDiagram(diagram);
            },
            async addRelationship({ diagramId, relationship }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.relationships = [
                    ...(diagram.relationships || []),
                    relationship,
                ];
                await saveDiagram(diagram);
            },
            async getRelationship({ diagramId, id }) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.relationships?.find((r) => r.id === id);
            },
            async updateRelationship({ id, attributes }) {
                const diagram = await findDiagramBy('relationships', id);
                if (!diagram) return;
                diagram.relationships = (diagram.relationships || []).map(
                    (r) => (r.id === id ? { ...r, ...attributes } : r)
                );
                await saveDiagram(diagram);
            },
            async deleteRelationship({ diagramId, id }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.relationships = (diagram.relationships || []).filter(
                    (r) => r.id !== id
                );
                await saveDiagram(diagram);
            },
            async listRelationships(diagramId) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.relationships || [];
            },
            async deleteDiagramRelationships(diagramId) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.relationships = [];
                await saveDiagram(diagram);
            },
            async addDependency({ diagramId, dependency }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.dependencies = [
                    ...(diagram.dependencies || []),
                    dependency,
                ];
                await saveDiagram(diagram);
            },
            async getDependency({ diagramId, id }) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.dependencies?.find((d) => d.id === id);
            },
            async updateDependency({ id, attributes }) {
                const diagram = await findDiagramBy('dependencies', id);
                if (!diagram) return;
                diagram.dependencies = (diagram.dependencies || []).map((d) =>
                    d.id === id ? { ...d, ...attributes } : d
                );
                await saveDiagram(diagram);
            },
            async deleteDependency({ diagramId, id }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.dependencies = (diagram.dependencies || []).filter(
                    (d) => d.id !== id
                );
                await saveDiagram(diagram);
            },
            async listDependencies(diagramId) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.dependencies || [];
            },
            async deleteDiagramDependencies(diagramId) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.dependencies = [];
                await saveDiagram(diagram);
            },
            async addArea({ diagramId, area }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.areas = [...(diagram.areas || []), area];
                await saveDiagram(diagram);
            },
            async getArea({ diagramId, id }) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.areas?.find((a) => a.id === id);
            },
            async updateArea({ id, attributes }) {
                const diagram = await findDiagramBy('areas', id);
                if (!diagram) return;
                diagram.areas = (diagram.areas || []).map((a) =>
                    a.id === id ? { ...a, ...attributes } : a
                );
                await saveDiagram(diagram);
            },
            async deleteArea({ diagramId, id }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.areas = (diagram.areas || []).filter(
                    (a) => a.id !== id
                );
                await saveDiagram(diagram);
            },
            async listAreas(diagramId) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.areas || [];
            },
            async deleteDiagramAreas(diagramId) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.areas = [];
                await saveDiagram(diagram);
            },
            async addCustomType({ diagramId, customType }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.customTypes = [
                    ...(diagram.customTypes || []),
                    customType,
                ];
                await saveDiagram(diagram);
            },
            async getCustomType({ diagramId, id }) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.customTypes?.find((c) => c.id === id);
            },
            async updateCustomType({ id, attributes }) {
                const diagram = await findDiagramBy('customTypes', id);
                if (!diagram) return;
                diagram.customTypes = (diagram.customTypes || []).map((c) =>
                    c.id === id ? { ...c, ...attributes } : c
                );
                await saveDiagram(diagram);
            },
            async deleteCustomType({ diagramId, id }) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.customTypes = (diagram.customTypes || []).filter(
                    (c) => c.id !== id
                );
                await saveDiagram(diagram);
            },
            async listCustomTypes(diagramId) {
                const diagram = await loadDiagram(diagramId);
                return diagram?.customTypes || [];
            },
            async deleteDiagramCustomTypes(diagramId) {
                const diagram = (await loadDiagram(diagramId)) as Diagram;
                diagram.customTypes = [];
                await saveDiagram(diagram);
            },
        }),
        []
    );

    return (
        <storageContext.Provider value={value}>
            {children}
        </storageContext.Provider>
    );
};
