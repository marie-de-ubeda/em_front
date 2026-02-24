import { useRef, useCallback, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  type ColDef,
  type GridReadyEvent,
  type FilterChangedEvent,
  type SortChangedEvent,
  type ColumnResizedEvent,
  type ColumnMovedEvent,
  type CellClickedEvent,
} from "ag-grid-community";
import { boardDarkTheme, loadGridState, saveGridState } from "../../lib/boardTheme";

ModuleRegistry.registerModules([AllCommunityModule]);

type Row = Record<string, unknown>;

interface Props {
  rows: Row[];
  columnDefs: ColDef[];
  gridName: string;
  height?: number | string;
  onRowClicked?: (row: Row) => void;
  pagination?: boolean;
  paginationPageSize?: number;
}

export default function BoardGrid({
  rows,
  columnDefs,
  gridName,
  height = 400,
  onRowClicked,
  pagination = false,
  paginationPageSize = 50,
}: Props) {
  const gridRef = useRef<AgGridReact>(null);
  const restoringRef = useRef(true);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: false,
    minWidth: 60,
    flex: 1,
  }), []);

  const persist = useCallback(() => {
    if (restoringRef.current) return;
    const api = gridRef.current?.api;
    if (!api) return;
    saveGridState(gridName, {
      filterModel: api.getFilterModel(),
      columnState: api.getColumnState(),
    });
  }, [gridName]);

  const onGridReady = useCallback((_e: GridReadyEvent) => {
    const api = gridRef.current?.api;
    if (!api) return;
    const saved = loadGridState(gridName);
    if (saved) {
      if (saved.columnState) api.applyColumnState({ state: saved.columnState as never, applyOrder: true });
      if (saved.filterModel) api.setFilterModel(saved.filterModel as never);
    }
    setTimeout(() => { restoringRef.current = false; }, 100);
  }, [gridName]);

  const handleCellClicked = useCallback((e: CellClickedEvent) => {
    if (onRowClicked) onRowClicked(e.data as Row);
  }, [onRowClicked]);

  return (
    <div style={{ height, width: "100%" }}>
      <AgGridReact
        ref={gridRef}
        theme={boardDarkTheme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(params) => String(params.data.id ?? "")}
        onGridReady={onGridReady}
        onFilterChanged={persist as (e: FilterChangedEvent) => void}
        onSortChanged={persist as (e: SortChangedEvent) => void}
        onColumnResized={persist as (e: ColumnResizedEvent) => void}
        onColumnMoved={persist as (e: ColumnMovedEvent) => void}
        onCellClicked={handleCellClicked}
        tooltipShowDelay={300}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        paginationPageSizeSelector={[25, 50, 100]}
        suppressCellFocus
        rowSelection="single"
      />
    </div>
  );
}
