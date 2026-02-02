import React, { useCallback, useEffect, useMemo } from 'react';
import {
    CircleDotDashed,
    GripVertical,
    Pencil,
    EllipsisVertical,
    Trash2,
    FileType2,
    FileKey2,
    Check,
    Group,
    Copy,
    Share2,
} from 'lucide-react';
import { ListItemHeaderButton } from '@/pages/editor-page/side-panel/list-item-header-button/list-item-header-button';
import type { DBTable } from '@/lib/domain/db-table';
import { Input } from '@/components/input/input';
import { useChartDB } from '@/hooks/use-chartdb';
import { useClickAway, useKeyPressEvent } from 'react-use';
import { useSortable } from '@dnd-kit/sortable';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/dropdown-menu/dropdown-menu';
import { useFocusOn } from '@/hooks/use-focus-on';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/hooks/use-dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/tooltip/tooltip';
import { cloneTable } from '@/lib/clone';
import type { DBSchema } from '@/lib/domain';
import { defaultSchemas } from '@/lib/data/default-schemas';
import { useDiagramFilter } from '@/context/diagram-filter-context/use-diagram-filter';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/dialog/dialog';
import { Button } from '@/components/button/button';
import { useParams } from 'react-router-dom';

export interface TableListItemHeaderProps {
    table: DBTable;
}

export const TableListItemHeader: React.FC<TableListItemHeaderProps> = ({
    table,
}) => {
    const {
        updateTable,
        updateTablesState,
        removeTable,
        createIndex,
        createField,
        createTable,
        schemas,
        databaseType,
        readonly,
        currentDiagram,
    } = useChartDB();
    const { schemasDisplayed } = useDiagramFilter();
    const { openTableSchemaDialog } = useDialog();
    const { t } = useTranslation();
    const { focusOnTable } = useFocusOn();
    const { diagramId } = useParams<{ diagramId?: string }>();
    const [editMode, setEditMode] = React.useState(false);
    const [tableName, setTableName] = React.useState(table.name);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
    const [isShareCopied, setIsShareCopied] = React.useState(false);
    const { listeners } = useSortable({ id: table.id });

    const editTableName = useCallback(() => {
        if (!editMode) return;
        if (tableName.trim()) {
            updateTable(table.id, { name: tableName.trim() });
        }

        setEditMode(false);
    }, [tableName, table.id, updateTable, editMode]);

    const abortEdit = useCallback(() => {
        setEditMode(false);
        setTableName(table.name);
    }, [table.name]);

    useClickAway(inputRef, editTableName);
    useKeyPressEvent('Enter', editTableName);
    useKeyPressEvent('Escape', abortEdit);

    const enterEditMode = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditMode(true);
    };

    const handleFocusOnTable = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.stopPropagation();
            focusOnTable(table.id);
        },
        [focusOnTable, table.id]
    );

    const shareUrl = useMemo(() => {
        const resolvedDiagramId = diagramId ?? currentDiagram?.id;
        const url = new URL(window.location.origin);
        url.pathname = resolvedDiagramId
            ? `/diagrams/${resolvedDiagramId}`
            : window.location.pathname;
        url.searchParams.set('clean', 'true');
        url.searchParams.set('tableId', table.id);
        return url.toString();
    }, [currentDiagram?.id, diagramId, table.id]);

    const handleOpenShareDialog = useCallback(
        (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
            event.stopPropagation();
            setShareDialogOpen(true);
            setIsShareCopied(false);
        },
        []
    );

    const handleCopyShareUrl = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setIsShareCopied(true);
            setTimeout(() => setIsShareCopied(false), 2000);
        } catch {
            setIsShareCopied(false);
        }
    }, [shareUrl]);

    const deleteTableHandler = useCallback(() => {
        removeTable(table.id);
    }, [table.id, removeTable]);

    const updateTableSchema = useCallback(
        ({ schema }: { schema: DBSchema }) => {
            updateTablesState((currentTables) =>
                currentTables.map((t) =>
                    t.id === table.id || !t.schema
                        ? { ...t, schema: schema.name }
                        : t
                )
            );
        },
        [table.id, updateTablesState]
    );

    const changeSchema = useCallback(() => {
        openTableSchemaDialog({
            table,
            schemas,
            onConfirm: updateTableSchema,
            allowSchemaCreation: true,
        });
    }, [openTableSchemaDialog, table, schemas, updateTableSchema]);

    const duplicateTableHandler = useCallback(
        (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.stopPropagation();
            const clonedTable = cloneTable(table);

            clonedTable.name = `${clonedTable.name}_copy`;
            clonedTable.x += 30;
            clonedTable.y += 50;

            createTable(clonedTable);
        },
        [createTable, table]
    );

    const renderDropDownMenu = useCallback(
        () => (
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <ListItemHeaderButton>
                        <EllipsisVertical />
                    </ListItemHeaderButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-fit min-w-40">
                    <DropdownMenuLabel>
                        {t(
                            'side_panel.tables_section.table.table_actions.title'
                        )}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {schemas.length > 0 || defaultSchemas?.[databaseType] ? (
                        <>
                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    className="flex justify-between gap-4"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        changeSchema();
                                    }}
                                >
                                    {t(
                                        'side_panel.tables_section.table.table_actions.change_schema'
                                    )}
                                    <Group className="size-3.5" />
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                        </>
                    ) : null}
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            className="flex justify-between gap-4"
                            onClick={(e) => {
                                e.stopPropagation();
                                createField(table.id);
                            }}
                        >
                            {t(
                                'side_panel.tables_section.table.table_actions.add_field'
                            )}
                            <FileType2 className="size-3.5" />
                        </DropdownMenuItem>
                        {!table.isView ? (
                            <DropdownMenuItem
                                className="flex justify-between gap-4"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    createIndex(table.id);
                                }}
                            >
                                {t(
                                    'side_panel.tables_section.table.table_actions.add_index'
                                )}
                                <FileKey2 className="size-3.5" />
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            onClick={duplicateTableHandler}
                            className="flex justify-between"
                        >
                            {t(
                                'side_panel.tables_section.table.table_actions.duplicate_table'
                            )}
                            <Copy className="size-3.5" />
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem
                            onClick={deleteTableHandler}
                            className="flex justify-between !text-red-700"
                        >
                            {t(
                                'side_panel.tables_section.table.table_actions.delete_table'
                            )}
                            <Trash2 className="size-3.5 text-red-700" />
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        ),
        [
            table.id,
            table.isView,
            createField,
            createIndex,
            deleteTableHandler,
            duplicateTableHandler,
            t,
            changeSchema,
            schemas.length,
            databaseType,
        ]
    );

    const schemaToDisplay = useMemo(() => {
        if (schemasDisplayed.length > 1) {
            return table.schema ?? defaultSchemas[databaseType];
        }
    }, [table.schema, schemasDisplayed.length, databaseType]);

    useEffect(() => {
        if (table.name.trim()) {
            setTableName(table.name.trim());
        }
    }, [table.name]);

    return (
        <>
            <div className="group flex h-11 flex-1 items-center justify-between gap-1 overflow-hidden">
                {!readonly ? (
                    <div
                        className="flex cursor-move items-center justify-center"
                        {...listeners}
                    >
                        <GripVertical className="size-4 text-muted-foreground" />
                    </div>
                ) : null}
                <div className="flex min-w-0 flex-1 px-1">
                    {editMode ? (
                        <Input
                            ref={inputRef}
                            autoFocus
                            type="text"
                            placeholder={table.name}
                            value={tableName}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setTableName(e.target.value)}
                            className="h-7 w-full focus-visible:ring-0"
                        />
                    ) : !readonly ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div
                                    onDoubleClick={enterEditMode}
                                    className="text-editable truncate px-2 py-0.5"
                                >
                                    {table.name}
                                    <span className="text-xs text-muted-foreground">
                                        {schemaToDisplay
                                            ? ` (${schemaToDisplay})`
                                            : ''}
                                    </span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {t('tool_tips.double_click_to_edit')}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="truncate px-2 py-0.5">
                            {table.name}
                            <span className="text-xs text-muted-foreground">
                                {schemaToDisplay ? ` (${schemaToDisplay})` : ''}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex flex-row-reverse items-center">
                    {!editMode ? (
                        <>
                            {!readonly ? (
                                <div>{renderDropDownMenu()}</div>
                            ) : null}
                            {table.isView ? (
                                <span className="rounded bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                                    View
                                </span>
                            ) : null}
                            <div className="flex flex-row-reverse md:hidden md:group-hover:flex">
                                {!readonly ? (
                                    <ListItemHeaderButton
                                        onClick={enterEditMode}
                                    >
                                        <Pencil />
                                    </ListItemHeaderButton>
                                ) : null}
                                <ListItemHeaderButton
                                    onClick={handleOpenShareDialog}
                                >
                                    <Share2 />
                                </ListItemHeaderButton>
                                <ListItemHeaderButton
                                    onClick={handleFocusOnTable}
                                >
                                    <CircleDotDashed />
                                </ListItemHeaderButton>
                            </div>
                        </>
                    ) : (
                        <ListItemHeaderButton onClick={editTableName}>
                            <Check />
                        </ListItemHeaderButton>
                    )}
                </div>
            </div>
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Share Table</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <Input readOnly value={shareUrl} />
                        <Button onClick={handleCopyShareUrl} type="button">
                            <Copy className="mr-2 size-4" />
                            {isShareCopied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
