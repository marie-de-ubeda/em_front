import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type CellValueChangedEvent,
  type GridReadyEvent,
  type FilterChangedEvent,
  type SortChangedEvent,
  type ColumnResizedEvent,
  type ColumnMovedEvent,
  type PaginationChangedEvent,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const darkTheme = themeQuartz.withParams({
  backgroundColor: "#0a1a30",
  foregroundColor: "#f1faee",
  headerBackgroundColor: "#06101f",
  headerTextColor: "#a8dadc",
  oddRowBackgroundColor: "#0e2038",
  rowHoverColor: "#162d4e",
  borderColor: "#2e4a6e",
  accentColor: "#457b9d",
  chromeBackgroundColor: "#06101f",
  columnBorder: true,
  headerFontWeight: 600,
  headerFontSize: 11,
  headerHeight: 32,
  rowHeight: 32,
  fontSize: 12,
  wrapperBorderRadius: 8,
});

function loadGridState(tableName: string) {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(`admin:grid:${tableName}`);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

function saveGridState(tableName: string, state: Record<string, unknown>) {
  try { localStorage.setItem(`admin:grid:${tableName}`, JSON.stringify(state)); } catch { /* ignore */ }
}

type Row = Record<string, unknown>;

interface Props {
  rows: Row[];
  columnDefs: ColDef[];
  tableName: string;
  onSave: (changed: Row[]) => Promise<void>;
  onAdd: () => void;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
  onRowClicked?: (row: Row) => void;
  checkboxSelection?: boolean;
  onCheckedChange?: (ids: number[]) => void;
}

export default function AdminGrid({ rows, columnDefs, tableName, onSave, onAdd, onDelete, onRefresh, onRowClicked, checkboxSelection, onCheckedChange }: Props) {
  const gridRef = useRef<AgGridReact>(null);
  const [dirty, setDirty] = useState<Map<number, Row>>(new Map());
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const dirtyCount = dirty.size;

  const onCellValueChanged = useCallback((e: CellValueChangedEvent) => {
    const id = e.data.id as number;
    setDirty((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) || { id };
      existing[e.colDef.field!] = e.newValue;
      next.set(id, existing);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (dirtyCount === 0) return;
    setSaving(true);
    try {
      await onSave(Array.from(dirty.values()));
      setDirty(new Map());
    } finally {
      setSaving(false);
    }
  }, [dirty, dirtyCount, onSave]);

  const handleDiscard = useCallback(() => {
    setDirty(new Map());
    onRefresh();
  }, [onRefresh]);

  const handleAdd = useCallback(() => {
    onAdd();
  }, [onAdd]);

  const handleDelete = useCallback(async () => {
    if (selectedId == null) return;
    if (!confirm(`Delete row #${selectedId} from ${tableName}?`)) return;
    await onDelete(selectedId);
  }, [selectedId, tableName, onDelete]);

  // --- Grid state persistence ---
  const restoringRef = useRef(true);

  const persistState = useCallback(() => {
    if (restoringRef.current) return;
    const api = gridRef.current?.api;
    if (!api) return;
    const state: Record<string, unknown> = {
      filterModel: api.getFilterModel(),
      columnState: api.getColumnState(),
      paginationPage: api.paginationGetCurrentPage(),
    };
    saveGridState(tableName, state);
  }, [tableName]);

  const onGridReady = useCallback((_e: GridReadyEvent) => {
    const api = gridRef.current?.api;
    if (!api) return;
    const saved = loadGridState(tableName);
    if (saved) {
      if (saved.columnState) api.applyColumnState({ state: saved.columnState, applyOrder: true });
      if (saved.filterModel) api.setFilterModel(saved.filterModel);
      if (typeof saved.paginationPage === "number") {
        // paginationGoToPage must wait for data to be rendered
        setTimeout(() => api.paginationGoToPage(saved.paginationPage), 0);
      }
    }
    // Allow saving after a short delay so restore events don't trigger saves
    setTimeout(() => { restoringRef.current = false; }, 100);
  }, [tableName]);

  // Reset restoring flag when table changes
  useEffect(() => {
    restoringRef.current = true;
  }, [tableName]);

  const onFilterChanged = useCallback((_e: FilterChangedEvent) => persistState(), [persistState]);
  const onSortChanged = useCallback((_e: SortChangedEvent) => persistState(), [persistState]);
  const onColumnResized = useCallback((e: ColumnResizedEvent) => { if (e.finished) persistState(); }, [persistState]);
  const onColumnMoved = useCallback((_e: ColumnMovedEvent) => persistState(), [persistState]);
  const onPaginationChanged = useCallback((_e: PaginationChangedEvent) => persistState(), [persistState]);

  const onSelectionChanged = useCallback(() => {
    const selected = gridRef.current?.api.getSelectedRows();
    if (checkboxSelection && onCheckedChange) {
      onCheckedChange(selected?.map((r) => r.id as number) ?? []);
    }
    setSelectedId(selected?.[0]?.id ?? null);
  }, [checkboxSelection, onCheckedChange]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: true,
    minWidth: 80,
    flex: 1,
  }), []);

  const finalColumnDefs = useMemo(() => {
    if (!checkboxSelection) return columnDefs;
    const checkCol: ColDef = {
      headerCheckboxSelection: true,
      checkboxSelection: true,
      maxWidth: 40,
      editable: false,
      sortable: false,
      filter: false,
      resizable: false,
      flex: 0,
    };
    return [checkCol, ...columnDefs];
  }, [columnDefs, checkboxSelection]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        display: "flex", gap: 6, padding: "4px 0", alignItems: "center", flexWrap: "wrap",
      }}>
        <button onClick={handleSave} disabled={dirtyCount === 0 || saving}
          style={{
            padding: "3px 10px", borderRadius: 4, border: "none", cursor: dirtyCount > 0 ? "pointer" : "default",
            background: dirtyCount > 0 ? "#457b9d" : "#2e4a6e", color: "#f1faee", fontSize: 11, fontWeight: 600,
            opacity: dirtyCount > 0 ? 1 : 0.5,
          }}>
          {saving ? "..." : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
        </button>
        <button onClick={handleAdd}
          style={{
            padding: "3px 10px", borderRadius: 4, border: "1px solid #2e4a6e", cursor: "pointer",
            background: "transparent", color: "#a8dadc", fontSize: 11, fontWeight: 600,
          }}>
          + Add
        </button>
        <button onClick={handleDelete} disabled={selectedId == null}
          style={{
            padding: "3px 10px", borderRadius: 4, border: "1px solid #2e4a6e", cursor: selectedId != null ? "pointer" : "default",
            background: "transparent", color: selectedId != null ? "#e63946" : "#457b9d", fontSize: 11, fontWeight: 600,
          }}>
          Del
        </button>
        {dirtyCount > 0 && (
          <button onClick={handleDiscard}
            style={{
              padding: "3px 10px", borderRadius: 4, border: "1px solid #2e4a6e", cursor: "pointer",
              background: "transparent", color: "#fbbf24", fontSize: 11, fontWeight: 600,
            }}>
            Discard
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#457b9d" }}>
          {rows.length} rows
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <AgGridReact
          ref={gridRef}
          theme={darkTheme}
          rowData={rows}
          columnDefs={finalColumnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          rowSelection={checkboxSelection ? "multiple" : "single"}
          onSelectionChanged={onSelectionChanged}
          getRowId={(params) => String(params.data.id)}
          onRowClicked={(e) => onRowClicked?.(e.data)}
          tooltipShowDelay={300}
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          onGridReady={onGridReady}
          onFilterChanged={onFilterChanged}
          onSortChanged={onSortChanged}
          onColumnResized={onColumnResized}
          onColumnMoved={onColumnMoved}
          onPaginationChanged={onPaginationChanged}
        />
      </div>
    </div>
  );
}
