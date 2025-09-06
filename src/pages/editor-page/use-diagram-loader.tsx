import { useChartDB } from '@/hooks/use-chartdb';
import { useConfig } from '@/hooks/use-config';
import { useDialog } from '@/hooks/use-dialog';
import { useFullScreenLoader } from '@/hooks/use-full-screen-spinner';
import { useRedoUndoStack } from '@/hooks/use-redo-undo-stack';
import { useStorage } from '@/hooks/use-storage';
import type { Diagram } from '@/lib/domain/diagram';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const useDiagramLoader = (options?: {
    clean?: boolean;
    tableId?: string | null;
}) => {
    const [initialDiagram, setInitialDiagram] = useState<Diagram | undefined>();
    const { diagramId } = useParams<{ diagramId: string }>();
    const { config } = useConfig();
    const { loadDiagram, loadDiagramFromData, currentDiagram } = useChartDB();
    const { resetRedoStack, resetUndoStack } = useRedoUndoStack();
    const { showLoader, hideLoader } = useFullScreenLoader();
    const { openCreateDiagramDialog, openOpenDiagramDialog } = useDialog();
    const navigate = useNavigate();
    const { listDiagrams, getDiagram } = useStorage();

    const currentDiagramLoadingRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!config) {
            return;
        }

        if (currentDiagram?.id === diagramId) {
            return;
        }

        const loadDefaultDiagram = async () => {
            if (diagramId) {
                setInitialDiagram(undefined);
                showLoader();
                resetRedoStack();
                resetUndoStack();
                if (options?.clean && options.tableId) {
                    const diagram = await getDiagram(diagramId, {
                        includeRelationships: true,
                        includeTables: true,
                        includeDependencies: true,
                        includeAreas: true,
                        includeCustomTypes: true,
                    });
                    if (!diagram) {
                        openOpenDiagramDialog({ canClose: false });
                        hideLoader();
                        return;
                    }
                    const table = diagram.tables?.find(
                        (t) => t.id === options.tableId
                    );
                    const loadedDiagram = {
                        ...diagram,
                        tables: table ? [table] : [],
                        relationships: [],
                        dependencies: [],
                        areas: [],
                    };
                    loadDiagramFromData(loadedDiagram);
                    setInitialDiagram(loadedDiagram);
                    hideLoader();
                    return;
                }

                const diagram = await loadDiagram(diagramId);
                if (!diagram) {
                    openOpenDiagramDialog({ canClose: false });
                    hideLoader();
                    return;
                }

                let loadedDiagram = diagram;
                if (options?.clean && options.tableId) {
                    const table = diagram.tables?.find(
                        (t) => t.id === options.tableId
                    );
                    loadedDiagram = {
                        ...diagram,
                        tables: table ? [table] : [],
                        relationships: [],
                        dependencies: [],
                        areas: [],
                    };
                    loadDiagramFromData(loadedDiagram);
                }

                setInitialDiagram(loadedDiagram);
                hideLoader();

                return;
            } else if (!diagramId && config.defaultDiagramId) {
                const diagram = await loadDiagram(config.defaultDiagramId);
                if (diagram) {
                    navigate(`/diagrams/${config.defaultDiagramId}`);

                    return;
                }
            }
            const diagrams = await listDiagrams();

            if (diagrams.length > 0) {
                openOpenDiagramDialog({ canClose: false });
            } else {
                openCreateDiagramDialog();
            }
        };

        if (
            currentDiagramLoadingRef.current === (diagramId ?? '') &&
            currentDiagramLoadingRef.current !== undefined
        ) {
            return;
        }
        currentDiagramLoadingRef.current = diagramId ?? '';

        loadDefaultDiagram();
    }, [
        diagramId,
        openCreateDiagramDialog,
        config,
        navigate,
        listDiagrams,
        getDiagram,
        loadDiagram,
        loadDiagramFromData,
        resetRedoStack,
        resetUndoStack,
        hideLoader,
        showLoader,
        currentDiagram?.id,
        openOpenDiagramDialog,
        options?.clean,
        options?.tableId,
    ]);

    return { initialDiagram };
};
