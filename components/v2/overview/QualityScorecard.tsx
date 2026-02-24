import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import type { DeveloperProfile, ProjectQuality } from "../../../lib/api";
import BoardGrid from "../BoardGrid";

interface Props {
  profiles: DeveloperProfile[];
  projectQuality: ProjectQuality[];
}

const SEV_COLORS: Record<string, string> = {
  critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399",
};

export default function QualityScorecard({ profiles, projectQuality }: Props) {
  // Compute focus score: how many distinct projects each dev works on
  const focusMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projectQuality) {
      for (const c of p.contributors) {
        m.set(c.developer_key, (m.get(c.developer_key) || 0) + 1);
      }
    }
    return m;
  }, [projectQuality]);

  const rows = useMemo(() =>
    [...profiles].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((p) => {
      const qs = p.quality_stats;
      const total = p.type_breakdown.total;
      const sev = qs.severity_breakdown;
      return {
        id: p.developer_key,
        display_name: p.display_name,
        color: p.color,
        releases: total,
        bugs: qs.bugs_introduced,
        critical: sev.critical || 0,
        high: sev.high || 0,
        medium: sev.medium || 0,
        low: sev.low || 0,
        mv: qs.total_impact_users || 0,
        rollbacks: qs.rollbacks,
        bug_rate: total > 0 ? Math.round((qs.bugs_introduced / total) * 100) : 0,
        fix_avg: qs.avg_time_to_fix_days,
        fixes_others: Object.values(qs.fixes_for_others).reduce((a: number, b: number) => a + b, 0),
        fixed_by: Object.values(qs.fixed_by_others).reduce((a: number, b: number) => a + b, 0),
        focus: focusMap.get(p.developer_key) || 0,
      };
    }), [profiles, focusMap]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "display_name", headerName: "Développeur", flex: 2, minWidth: 140,
      sort: "asc" as const,
      cellRenderer: (p: { data: { color: string; display_name: string } }) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.data.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 600 }}>{p.data.display_name}</span>
        </span>
      ),
    },
    { field: "releases", headerName: "Releases", type: "numericColumn", width: 90, flex: 0 },
    {
      field: "focus", headerName: "Focus", type: "numericColumn", width: 75, flex: 0,
      headerTooltip: "Nombre de projets distincts (context-switching)",
      cellStyle: (p) => {
        const v = p.value as number;
        return { color: v <= 2 ? "#34d399" : v <= 4 ? "#fbbf24" : "#f87171", fontWeight: 600 };
      },
    },
    {
      field: "bugs", headerName: "Bugs", type: "numericColumn", width: 70, flex: 0,
      cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#f87171" : "#34d399", fontWeight: 600 }),
    },
    { field: "critical", headerName: "Crit.", type: "numericColumn", width: 65, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? SEV_COLORS.critical : "#334155" }) },
    { field: "high", headerName: "High", type: "numericColumn", width: 65, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? SEV_COLORS.high : "#334155" }) },
    { field: "medium", headerName: "Med.", type: "numericColumn", width: 65, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? SEV_COLORS.medium : "#334155" }) },
    { field: "low", headerName: "Low", type: "numericColumn", width: 60, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? SEV_COLORS.low : "#334155" }) },
    { field: "mv", headerName: "MV", type: "numericColumn", width: 55, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#fbbf24" : "#334155", fontWeight: 600 }) },
    { field: "rollbacks", headerName: "Rollb.", type: "numericColumn", width: 70, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#f87171" : "#334155" }) },
    {
      field: "bug_rate", headerName: "Bug rate", type: "numericColumn", width: 85, flex: 0,
      valueFormatter: (p) => `${p.value}%`,
      cellStyle: (p) => ({ color: (p.value as number) > 20 ? "#f87171" : (p.value as number) > 10 ? "#fbbf24" : "#34d399" }),
    },
    {
      field: "fix_avg", headerName: "Fix moy.", type: "numericColumn", width: 80, flex: 0,
      valueFormatter: (p) => p.value != null ? `${p.value}j` : "—",
      cellStyle: () => ({ color: "#94a3b8" }),
    },
    { field: "fixes_others", headerName: "Fixes autres", type: "numericColumn", width: 100, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#34d399" : "#334155" }) },
    { field: "fixed_by", headerName: "Corrigé par", type: "numericColumn", width: 100, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#fbbf24" : "#334155" }) },
  ], []);

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
        Scorecard qualité — données factuelles
      </h3>
      <BoardGrid rows={rows} columnDefs={columnDefs} gridName="quality-scorecard" height={Math.min(rows.length * 36 + 40, 400)} />
    </div>
  );
}
