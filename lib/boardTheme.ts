import { themeQuartz } from "ag-grid-community";

// Board V2 dark theme — matches V2Layout colors
export const boardDarkTheme = themeQuartz.withParams({
  backgroundColor: "#0f172a",
  foregroundColor: "#e2e8f0",
  headerBackgroundColor: "#0f172a",
  headerTextColor: "#94a3b8",
  oddRowBackgroundColor: "#1e293b",
  rowHoverColor: "#334155",
  borderColor: "#1e293b",
  accentColor: "#6366f1",
  chromeBackgroundColor: "#0f172a",
  columnBorder: false,
  headerFontWeight: 700,
  headerFontSize: 9,
  headerHeight: 32,
  rowHeight: 36,
  fontSize: 11,
  wrapperBorderRadius: 8,
});

// Grid state persistence helpers
export function loadGridState(gridName: string): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(`board:grid:${gridName}`);
    return v ? JSON.parse(v) : null;
  } catch { return null; }
}

export function saveGridState(gridName: string, state: Record<string, unknown>): void {
  try {
    localStorage.setItem(`board:grid:${gridName}`, JSON.stringify(state));
  } catch { /* ignore */ }
}
