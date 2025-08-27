import React, { useCallback } from 'react';
import { storageContext } from './storage-context';
import type { Diagram } from '@/lib/domain/diagram';
import type { DBTable } from '@/lib/domain/db-table';
import type { DBRelationship } from '@/lib/domain/db-relationship';
import type { ChartDBConfig } from '@/lib/domain/config';
import type { DBDependency } from '@/lib/domain/db-dependency';
import type { Area } from '@/lib/domain/area';
import type { DBCustomType } from '@/lib/domain/db-custom-type';
import type { DiagramFilter } from '@/lib/domain/diagram-filter/diagram-filter';

const API_BASE = '/api';

const parseDiagram = (d: Record<string, unknown>): Diagram => ({
    ...d,
    createdAt: new Date(d.createdAt),
    updatedAt: new Date(d.updatedAt),
});

export const VolumeStorageProvider: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const listDiagrams = useCallback(async () => {
        const res = await fetch(`${API_BASE}/diagrams`);
        if (!res.ok) return [];
        const data = await res.json();
        return data.map(parseDiagram);
    }, []);

    const getDiagram = useCallback(async (id: string) => {
        const res = await fetch(`${API_BASE}/diagrams/${id}`);
        if (!res.ok) return undefined;
        return parseDiagram(await res.json());
    }, []);

    const saveDiagram = useCallback(async (diagram: Diagram) => {
        await fetch(`${API_BASE}/diagrams/${diagram.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(diagram),
        });
    }, []);

    const mutateDiagram = useCallback(
        async (diagramId: string, mutator: (d: Diagram) => void) => {
            const diagram = await getDiagram(diagramId);
            if (!diagram) return;
            mutator(diagram);
            diagram.updatedAt = new Date();
            await saveDiagram(diagram);
        },
        [getDiagram, saveDiagram]
    );

    const mutateByItemId = useCallback(
        async (
            itemId: string,
            collection: keyof Diagram,
            mutator: (items: unknown[], index: number) => void
        ) => {
            const diagrams = await listDiagrams();
            for (const diagram of diagrams) {
                const items =
                    ((diagram as Record<string, unknown>)[
                        collection
                    ] as unknown[]) || [];
                const index = (items as { id: string }[]).findIndex(
                    (i) => i.id === itemId
                );
                if (index !== -1) {
                    mutator(items, index);
                    (diagram as Record<string, unknown>)[collection] = items;
                    diagram.updatedAt = new Date();
                    await saveDiagram(diagram);
                    break;
                }
            }
        },
        [listDiagrams, saveDiagram]
    );

    // Config
    const getConfig = useCallback(async (): Promise<
        ChartDBConfig | undefined
    > => {
        const res = await fetch(`${API_BASE}/config`);
        if (!res.ok) return undefined;
        return await res.json();
    }, []);

    const updateConfig = useCallback(async (config: Partial<ChartDBConfig>) => {
        await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
    }, []);

    // Diagram filters
    const getDiagramFilter = useCallback(
        async (diagramId: string): Promise<DiagramFilter | undefined> => {
            const res = await fetch(`${API_BASE}/diagram-filters/${diagramId}`);
            if (!res.ok) return undefined;
            return await res.json();
        },
        []
    );

    const updateDiagramFilter = useCallback(
        async (diagramId: string, filter: DiagramFilter): Promise<void> => {
            await fetch(`${API_BASE}/diagram-filters/${diagramId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filter),
            });
        },
        []
    );

    const deleteDiagramFilter = useCallback(
        async (diagramId: string): Promise<void> => {
            await fetch(`${API_BASE}/diagram-filters/${diagramId}`, {
                method: 'DELETE',
            });
        },
        []
    );

    // Diagram operations
    const addDiagram = useCallback(
        async ({ diagram }: { diagram: Diagram }) => {
            await saveDiagram(diagram);
        },
        [saveDiagram]
    );

    const updateDiagram = useCallback(
        async ({
            id,
            attributes,
        }: {
            id: string;
            attributes: Partial<Diagram>;
        }) => {
            await mutateDiagram(id, (d) => Object.assign(d, attributes));
        },
        [mutateDiagram]
    );

    const deleteDiagram = useCallback(async (id: string) => {
        await fetch(`${API_BASE}/diagrams/${id}`, { method: 'DELETE' });
    }, []);

    // Table operations
    const addTable = useCallback(
        async ({ diagramId, table }: { diagramId: string; table: DBTable }) => {
            await mutateDiagram(diagramId, (d) => {
                d.tables = d.tables || [];
                d.tables.push(table);
            });
        },
        [mutateDiagram]
    );

    const getTable = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            const diagram = await getDiagram(diagramId);
            return diagram?.tables?.find((t) => t.id === id);
        },
        [getDiagram]
    );

    const updateTable = useCallback(
        async ({
            id,
            attributes,
        }: {
            id: string;
            attributes: Partial<DBTable>;
        }) => {
            await mutateByItemId(id, 'tables', (items, index) => {
                Object.assign(items[index], attributes);
            });
        },
        [mutateByItemId]
    );

    const putTable = useCallback(
        async ({ diagramId, table }: { diagramId: string; table: DBTable }) => {
            await mutateDiagram(diagramId, (d) => {
                d.tables = d.tables || [];
                const idx = d.tables.findIndex((t) => t.id === table.id);
                if (idx !== -1) {
                    d.tables[idx] = table;
                } else {
                    d.tables.push(table);
                }
            });
        },
        [mutateDiagram]
    );

    const deleteTable = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            await mutateDiagram(diagramId, (d) => {
                d.tables = (d.tables || []).filter((t) => t.id !== id);
            });
        },
        [mutateDiagram]
    );

    const listTables = useCallback(
        async (diagramId: string): Promise<DBTable[]> => {
            const diagram = await getDiagram(diagramId);
            return diagram?.tables || [];
        },
        [getDiagram]
    );

    const deleteDiagramTables = useCallback(
        async (diagramId: string): Promise<void> => {
            await mutateDiagram(diagramId, (d) => {
                d.tables = [];
            });
        },
        [mutateDiagram]
    );

    // Relationship operations
    const addRelationship = useCallback(
        async ({
            diagramId,
            relationship,
        }: {
            diagramId: string;
            relationship: DBRelationship;
        }) => {
            await mutateDiagram(diagramId, (d) => {
                d.relationships = d.relationships || [];
                d.relationships.push(relationship);
            });
        },
        [mutateDiagram]
    );

    const getRelationship = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            const diagram = await getDiagram(diagramId);
            return diagram?.relationships?.find((r) => r.id === id);
        },
        [getDiagram]
    );

    const updateRelationship = useCallback(
        async ({
            id,
            attributes,
        }: {
            id: string;
            attributes: Partial<DBRelationship>;
        }) => {
            await mutateByItemId(id, 'relationships', (items, index) => {
                Object.assign(items[index], attributes);
            });
        },
        [mutateByItemId]
    );

    const deleteRelationship = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            await mutateDiagram(diagramId, (d) => {
                d.relationships = (d.relationships || []).filter(
                    (r) => r.id !== id
                );
            });
        },
        [mutateDiagram]
    );

    const listRelationships = useCallback(
        async (diagramId: string): Promise<DBRelationship[]> => {
            const diagram = await getDiagram(diagramId);
            return diagram?.relationships || [];
        },
        [getDiagram]
    );

    const deleteDiagramRelationships = useCallback(
        async (diagramId: string): Promise<void> => {
            await mutateDiagram(diagramId, (d) => {
                d.relationships = [];
            });
        },
        [mutateDiagram]
    );

    // Dependency operations
    const addDependency = useCallback(
        async ({
            diagramId,
            dependency,
        }: {
            diagramId: string;
            dependency: DBDependency;
        }) => {
            await mutateDiagram(diagramId, (d) => {
                d.dependencies = d.dependencies || [];
                d.dependencies.push(dependency);
            });
        },
        [mutateDiagram]
    );

    const getDependency = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            const diagram = await getDiagram(diagramId);
            return diagram?.dependencies?.find((r) => r.id === id);
        },
        [getDiagram]
    );

    const updateDependency = useCallback(
        async ({
            id,
            attributes,
        }: {
            id: string;
            attributes: Partial<DBDependency>;
        }) => {
            await mutateByItemId(id, 'dependencies', (items, index) => {
                Object.assign(items[index], attributes);
            });
        },
        [mutateByItemId]
    );

    const deleteDependency = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            await mutateDiagram(diagramId, (d) => {
                d.dependencies = (d.dependencies || []).filter(
                    (r) => r.id !== id
                );
            });
        },
        [mutateDiagram]
    );

    const listDependencies = useCallback(
        async (diagramId: string): Promise<DBDependency[]> => {
            const diagram = await getDiagram(diagramId);
            return diagram?.dependencies || [];
        },
        [getDiagram]
    );

    const deleteDiagramDependencies = useCallback(
        async (diagramId: string): Promise<void> => {
            await mutateDiagram(diagramId, (d) => {
                d.dependencies = [];
            });
        },
        [mutateDiagram]
    );

    // Area operations
    const addArea = useCallback(
        async ({ diagramId, area }: { diagramId: string; area: Area }) => {
            await mutateDiagram(diagramId, (d) => {
                d.areas = d.areas || [];
                d.areas.push(area);
            });
        },
        [mutateDiagram]
    );

    const getArea = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            const diagram = await getDiagram(diagramId);
            return diagram?.areas?.find((a) => a.id === id);
        },
        [getDiagram]
    );

    const updateArea = useCallback(
        async ({
            id,
            attributes,
        }: {
            id: string;
            attributes: Partial<Area>;
        }) => {
            await mutateByItemId(id, 'areas', (items, index) => {
                Object.assign(items[index], attributes);
            });
        },
        [mutateByItemId]
    );

    const deleteArea = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            await mutateDiagram(diagramId, (d) => {
                d.areas = (d.areas || []).filter((a) => a.id !== id);
            });
        },
        [mutateDiagram]
    );

    const listAreas = useCallback(
        async (diagramId: string): Promise<Area[]> => {
            const diagram = await getDiagram(diagramId);
            return diagram?.areas || [];
        },
        [getDiagram]
    );

    const deleteDiagramAreas = useCallback(
        async (diagramId: string): Promise<void> => {
            await mutateDiagram(diagramId, (d) => {
                d.areas = [];
            });
        },
        [mutateDiagram]
    );

    // Custom type operations
    const addCustomType = useCallback(
        async ({
            diagramId,
            customType,
        }: {
            diagramId: string;
            customType: DBCustomType;
        }) => {
            await mutateDiagram(diagramId, (d) => {
                d.customTypes = d.customTypes || [];
                d.customTypes.push(customType);
            });
        },
        [mutateDiagram]
    );

    const getCustomType = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            const diagram = await getDiagram(diagramId);
            return diagram?.customTypes?.find((c) => c.id === id);
        },
        [getDiagram]
    );

    const updateCustomType = useCallback(
        async ({
            id,
            attributes,
        }: {
            id: string;
            attributes: Partial<DBCustomType>;
        }) => {
            await mutateByItemId(id, 'customTypes', (items, index) => {
                Object.assign(items[index], attributes);
            });
        },
        [mutateByItemId]
    );

    const deleteCustomType = useCallback(
        async ({ diagramId, id }: { diagramId: string; id: string }) => {
            await mutateDiagram(diagramId, (d) => {
                d.customTypes = (d.customTypes || []).filter(
                    (c) => c.id !== id
                );
            });
        },
        [mutateDiagram]
    );

    const listCustomTypes = useCallback(
        async (diagramId: string): Promise<DBCustomType[]> => {
            const diagram = await getDiagram(diagramId);
            return diagram?.customTypes || [];
        },
        [getDiagram]
    );

    const deleteDiagramCustomTypes = useCallback(
        async (diagramId: string): Promise<void> => {
            await mutateDiagram(diagramId, (d) => {
                d.customTypes = [];
            });
        },
        [mutateDiagram]
    );

    const value = {
        getConfig,
        updateConfig,
        getDiagramFilter,
        updateDiagramFilter,
        deleteDiagramFilter,
        addDiagram,
        listDiagrams,
        getDiagram,
        updateDiagram,
        deleteDiagram,
        addTable,
        getTable,
        updateTable,
        putTable,
        deleteTable,
        listTables,
        deleteDiagramTables,
        addRelationship,
        getRelationship,
        updateRelationship,
        deleteRelationship,
        listRelationships,
        deleteDiagramRelationships,
        addDependency,
        getDependency,
        updateDependency,
        deleteDependency,
        listDependencies,
        deleteDiagramDependencies,
        addArea,
        getArea,
        updateArea,
        deleteArea,
        listAreas,
        deleteDiagramAreas,
        addCustomType,
        getCustomType,
        updateCustomType,
        deleteCustomType,
        listCustomTypes,
        deleteDiagramCustomTypes,
    };

    return (
        <storageContext.Provider value={value}>
            {children}
        </storageContext.Provider>
    );
};
