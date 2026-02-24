import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import type { BugFixDetail, Project } from "../../../lib/api";
import BoardGrid from "../BoardGrid";

const SEV_COLORS: Record<string, string> = {
  critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399",
};
const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

interface Props {
  bugFixes: BugFixDetail[];
  projects: Project[];
  filterDev: string | null;
}

export default function BugFixDetailTable({ bugFixes, projects, filterDev }: Props) {
  // Build a map: "repo:version" → project name
  const projectMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      for (const r of p.releases) {
        const key = `${r.repo_name}:${r.version}`;
        if (!m.has(key)) m.set(key, p.name);
      }
    }
    return m;
  }, [projects]);

  const filtered = useMemo(() =>
    filterDev
      ? bugFixes.filter((b) => b.author_key === filterDev || b.fixer_key === filterDev)
      : bugFixes
  , [bugFixes, filterDev]);

  const rows = useMemo(() => filtered.map((b) => ({
    ...b,
    project_name: projectMap.get(`${b.bugged_repo}:${b.bugged_version}`) || "—",
  })), [filtered, projectMap]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "severity", headerName: "Sév.", width: 80, flex: 0,
      comparator: (a: string, b: string) => (SEV_ORDER[a] ?? 9) - (SEV_ORDER[b] ?? 9),
      cellRenderer: (p: { value: string }) => p.value ? (
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
          background: `${SEV_COLORS[p.value] || "#94a3b8"}22`,
          color: SEV_COLORS[p.value] || "#94a3b8",
        }}>
          {p.value}
        </span>
      ) : null,
    },
    {
      field: "project_name", headerName: "Projet", width: 140, flex: 0, minWidth: 80,
      cellStyle: (p) => ({ color: p.value === "—" ? "#334155" : "#e2e8f0", fontWeight: 600 }),
    },
    {
      field: "bugged_version", headerName: "Bug version", flex: 1, minWidth: 120,
      valueGetter: (p) => `${(p.data.bugged_repo || "").replace(/^indb-/, "")} ${p.data.bugged_version}`,
    },
    {
      field: "author_name", headerName: "Auteur", width: 110, flex: 0,
      cellRenderer: (p: { data: { author_color: string; author_name: string } }) => (
        <span style={{ color: p.data.author_color, fontWeight: 600 }}>{p.data.author_name}</span>
      ),
    },
    {
      field: "fix_version", headerName: "Fix version", flex: 1, minWidth: 120,
      valueGetter: (p) => `${(p.data.fix_repo || "").replace(/^indb-/, "")} ${p.data.fix_version}`,
    },
    {
      field: "fixer_name", headerName: "Fixeur", width: 110, flex: 0,
      cellRenderer: (p: { data: { fixer_color: string; fixer_name: string } }) => (
        <span style={{ color: p.data.fixer_color, fontWeight: 600 }}>{p.data.fixer_name}</span>
      ),
    },
    {
      field: "impact_users", headerName: "MV", type: "numericColumn", width: 55, flex: 0,
      cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#fbbf24" : "#334155", fontWeight: 600 }),
      valueFormatter: (p) => p.value || "—",
    },
    {
      field: "days_to_fix", headerName: "Délai", type: "numericColumn", width: 65, flex: 0,
      valueFormatter: (p) => p.value != null ? `${p.value}j` : "—",
      cellStyle: () => ({ color: "#94a3b8" }),
    },
    { field: "environment", headerName: "Env.", width: 70, flex: 0, cellStyle: () => ({ color: "#64748b" }) },
    { field: "detected_by", headerName: "Détecté", width: 80, flex: 0, cellStyle: () => ({ color: "#64748b" }) },
    {
      field: "impact_description", headerName: "Impact", flex: 1, minWidth: 100,
      tooltipField: "impact_description",
      cellStyle: () => ({ color: "#475569" }),
    },
  ], []);

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
        Détail des bugs{filterDev ? ` (filtre: ${filterDev})` : ""} — {filtered.length} entrées
      </h3>
      <BoardGrid
        rows={rows}
        columnDefs={columnDefs}
        gridName="bug-fix-detail"
        height={Math.min(filtered.length * 36 + 40, 450)}
        pagination={filtered.length > 50}
        paginationPageSize={50}
      />
    </div>
  );
}
