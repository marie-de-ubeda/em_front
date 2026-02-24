import { useState, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import type { ProjectQuality } from "../../../lib/api";
import BoardGrid from "../BoardGrid";

interface Props {
  projectQuality: ProjectQuality[];
  onSelectProject: (id: number | null) => void;
  selectedProject: number | null;
}

type Filter = "all" | "roadmap" | "other";

function getStatus(lastDate: string | null): { label: string; color: string } {
  if (!lastDate) return { label: "Inactif", color: "#64748b" };
  const diff = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 60) return { label: "Actif", color: "#34d399" };
  return { label: "Inactif", color: "#64748b" };
}

export default function ProjectPortfolioTable({ projectQuality, onSelectProject, selectedProject }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projectQuality
      .filter((p) => {
        if (filter === "roadmap" && !p.is_roadmap) return false;
        if (filter === "other" && p.is_roadmap) return false;
        if (q && !p.project_name.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((p) => ({
        id: p.project_id,
        project_id: p.project_id,
        project_name: p.project_name,
        is_roadmap: p.is_roadmap,
        type: p.type || "—",
        impact: p.impact,
        total_releases: p.total_releases,
        total_bugs: p.total_bugs,
        critical_high_bugs: p.critical_high_bugs,
        total_impact_users: p.total_impact_users,
        bus_factor: p.contributors.length,
        contributors: p.contributors,
        last_release_date: p.last_release_date,
        status: getStatus(p.last_release_date),
      }));
  }, [projectQuality, filter, search]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "project_name", headerName: "Projet", flex: 2, minWidth: 180,
      cellRenderer: (p: { data: { is_roadmap: boolean; project_name: string } }) => (
        <span>
          {p.data.is_roadmap && <span style={{ color: "#34d399", marginRight: 4, fontSize: 9, fontWeight: 700 }}>R</span>}
          <span style={{ fontWeight: 600 }}>{p.data.project_name}</span>
        </span>
      ),
    },
    { field: "type", headerName: "Type", width: 100, flex: 0, cellStyle: () => ({ color: "#94a3b8" }) },
    {
      field: "impact", headerName: "Impact", width: 80, flex: 0,
      cellRenderer: (p: { value: string | null }) => p.value ? (
        <span style={{
          fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
          color: p.value === "high" ? "#f87171" : p.value === "medium" ? "#fbbf24" : "#34d399",
          background: p.value === "high" ? "#f8717122" : p.value === "medium" ? "#fbbf2422" : "#34d39922",
        }}>{p.value}</span>
      ) : null,
    },
    { field: "total_releases", headerName: "Releases", type: "numericColumn", width: 85, flex: 0 },
    { field: "total_bugs", headerName: "Bugs", type: "numericColumn", width: 70, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#f87171" : "#334155", fontWeight: 600 }) },
    { field: "critical_high_bugs", headerName: "Crit/High", type: "numericColumn", width: 85, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#e63946" : "#334155" }) },
    { field: "total_impact_users", headerName: "MV", type: "numericColumn", width: 55, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#fbbf24" : "#334155" }) },
    {
      field: "bus_factor", headerName: "Bus", type: "numericColumn", width: 60, flex: 0,
      headerTooltip: "Bus factor — nombre de contributeurs",
      cellStyle: (p) => {
        const v = p.value as number;
        return { fontWeight: 700, color: v <= 1 ? "#f87171" : v <= 2 ? "#fbbf24" : "#34d399" };
      },
    },
    {
      field: "contributors", headerName: "Contributeurs", flex: 1, minWidth: 120, filter: false, sortable: false,
      cellRenderer: (p: { value: { developer_key: string; display_name: string; color: string }[] }) => (
        <span style={{ display: "inline-flex", gap: 3, flexWrap: "wrap" }}>
          {(p.value || []).slice(0, 4).map((c) => (
            <span key={c.developer_key} style={{
              fontSize: 9, padding: "0 5px", borderRadius: 6,
              background: `${c.color}22`, color: c.color, fontWeight: 600,
            }}>
              {c.display_name.split(" ").map((n) => n[0]).join("")}
            </span>
          ))}
        </span>
      ),
    },
    {
      field: "last_release_date", headerName: "Dernière", width: 100, flex: 0,
      valueFormatter: (p) => p.value?.slice(0, 10) || "—",
      cellStyle: () => ({ color: "#64748b" }),
    },
    {
      field: "status", headerName: "Statut", width: 80, flex: 0, filter: false,
      valueGetter: (p) => p.data.status.label,
      cellRenderer: (p: { data: { status: { label: string; color: string } } }) => (
        <span style={{ fontSize: 9, fontWeight: 600, color: p.data.status.color }}>{p.data.status.label}</span>
      ),
    },
  ], []);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Portfolio projets</h3>
        {(["all", "roadmap", "other"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 10, fontWeight: 600,
            background: filter === f ? "#6366f1" : "#1e293b",
            color: filter === f ? "#fff" : "#94a3b8",
          }}>
            {f === "all" ? "Tous" : f === "roadmap" ? "Roadmap" : "Autres"}
          </button>
        ))}
        <input
          type="text"
          placeholder="Rechercher un projet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "1px solid #334155",
            background: "#1e293b", color: "#e2e8f0", fontSize: 10,
            outline: "none", width: 160,
          }}
        />
      </div>
      <BoardGrid
        rows={rows}
        columnDefs={columnDefs}
        gridName="project-portfolio"
        height={Math.min(rows.length * 36 + 40, 500)}
        onRowClicked={(row) => {
          const id = row.project_id as number;
          onSelectProject(selectedProject === id ? null : id);
        }}
      />
    </div>
  );
}
