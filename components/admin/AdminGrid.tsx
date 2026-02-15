import { useRef, useState, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type CellValueChangedEvent,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

const darkTheme = themeQuartz.withParams({
  backgroundColor: "#0f172a",
  foregroundColor: "#e2e8f0",
  headerBackgroundColor: "#1e293b",
  headerTextColor: "#94a3b8",
  oddRowBackgroundColor: "#0f172a",
  rowHoverColor: "#1e293b",
  borderColor: "#1e293b",
  accentColor: "#6366f1",
  chromeBackgroundColor: "#1e293b",
  headerFontWeight: 600,
  headerFontSize: 11,
  headerHeight: 32,
  rowHeight: 32,
  fontSize: 12,
  wrapperBorderRadius: 8,
});

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
            background: dirtyCount > 0 ? "#6366f1" : "#334155", color: "#fff", fontSize: 11, fontWeight: 600,
            opacity: dirtyCount > 0 ? 1 : 0.5,
          }}>
          {saving ? "..." : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
        </button>
        <button onClick={handleAdd}
          style={{
            padding: "3px 10px", borderRadius: 4, border: "1px solid #334155", cursor: "pointer",
            background: "transparent", color: "#94a3b8", fontSize: 11, fontWeight: 600,
          }}>
          + Add
        </button>
        <button onClick={handleDelete} disabled={selectedId == null}
          style={{
            padding: "3px 10px", borderRadius: 4, border: "1px solid #334155", cursor: selectedId != null ? "pointer" : "default",
            background: "transparent", color: selectedId != null ? "#f87171" : "#475569", fontSize: 11, fontWeight: 600,
          }}>
          Del
        </button>
        {dirtyCount > 0 && (
          <button onClick={handleDiscard}
            style={{
              padding: "3px 10px", borderRadius: 4, border: "1px solid #334155", cursor: "pointer",
              background: "transparent", color: "#fbbf24", fontSize: 11, fontWeight: 600,
            }}>
            Discard
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#64748b" }}>
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
        />
      </div>
    </div>
  );
}
