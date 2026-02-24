import { useState, useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import type { ProjectQuality } from "../../../lib/api";
import { useBoardFilter } from "../../../lib/boardFilterContext";
import BoardGrid from "../BoardGrid";

interface Props {
  projectQuality: ProjectQuality[];
  onSelectProject: (id: number | null) => void;
  selectedProject: number | null;
}

function PieChart({ data, selected, onSliceClick }: {
  data: { label: string; count: number; color: string }[];
  selected: string | null;
  onSliceClick: (label: string | null) => void;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  const R = 40;
  const CX = 50;
  const CY = 50;
  let cumAngle = -Math.PI / 2;

  const slices = data.map((d) => {
    const angle = (d.count / total) * 2 * Math.PI;
    const startX = CX + R * Math.cos(cumAngle);
    const startY = CY + R * Math.sin(cumAngle);
    cumAngle += angle;
    const endX = CX + R * Math.cos(cumAngle);
    const endY = CY + R * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = d.count === total
      ? `M ${CX},${CY - R} A ${R},${R} 0 1,1 ${CX - 0.01},${CY - R} Z`
      : `M ${CX},${CY} L ${startX},${startY} A ${R},${R} 0 ${large},1 ${endX},${endY} Z`;
    return { ...d, path };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={100} height={100} viewBox="0 0 100 100" style={{ cursor: "pointer" }}>
        {slices.map((s) => (
          <path
            key={s.label}
            d={s.path}
            fill={s.color}
            stroke="#0f172a"
            strokeWidth={1}
            opacity={selected && selected !== s.label ? 0.3 : 1}
            style={{ cursor: "pointer", transition: "opacity 0.15s" }}
            onClick={() => onSliceClick(selected === s.label ? null : s.label)}
          >
            <title>{s.label}: {s.count} ({Math.round((s.count / total) * 100)}%)</title>
          </path>
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {data.map((d) => {
          const isActive = selected === d.label;
          return (
            <div
              key={d.label}
              onClick={() => onSliceClick(selected === d.label ? null : d.label)}
              style={{
                display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                opacity: selected && !isActive ? 0.4 : 1,
                transition: "opacity 0.15s",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#e2e8f0", fontWeight: isActive ? 700 : 400 }}>{d.label}</span>
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{d.count}</span>
              <span style={{ fontSize: 9, color: "#475569" }}>({Math.round((d.count / total) * 100)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getStatus(lastDate: string | null): { label: string; color: string } {
  if (!lastDate) return { label: "Inactif", color: "#64748b" };
  const diff = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 60) return { label: "Actif", color: "#34d399" };
  return { label: "Inactif", color: "#64748b" };
}

export default function ProjectPortfolioTable({ projectQuality, onSelectProject, selectedProject }: Props) {
  const { filterFrom, filterTo } = useBoardFilter();
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedRoadmap, setSelectedRoadmap] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<number | null>(null);
  const [filterNew, setFilterNew] = useState(false);

  const typePieData = useMemo(() => {
    const colors: Record<string, string> = {
      "Produit": "#818cf8", "Tech": "#fb923c", "Dette technique": "#fbbf24", "Non défini": "#475569",
    };
    const counts: Record<string, number> = {};
    for (const p of projectQuality) {
      const t = p.type || "Non défini";
      counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count, color: colors[label] || "#94a3b8" }))
      .sort((a, b) => b.count - a.count);
  }, [projectQuality]);

  const roadmapPieData = useMemo(() => {
    let roadmap = 0;
    let other = 0;
    for (const p of projectQuality) {
      if (p.is_roadmap) roadmap++; else other++;
    }
    return [
      { label: "Roadmap", count: roadmap, color: "#34d399" },
      { label: "Autre", count: other, color: "#64748b" },
    ].filter((d) => d.count > 0);
  }, [projectQuality]);

  const busBars = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const p of projectQuality) {
      const n = p.contributors.length;
      counts[n] = (counts[n] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([k, v]) => ({ bus: Number(k), count: v }))
      .sort((a, b) => a.bus - b.bus);
  }, [projectQuality]);

  const hasChartFilter = selectedType || selectedRoadmap || selectedBus !== null || filterNew;

  const newCount = useMemo(() => {
    if (!filterFrom) return 0;
    return projectQuality.filter((p) =>
      p.first_release_date && p.first_release_date >= filterFrom && (!filterTo || p.first_release_date <= filterTo)
    ).length;
  }, [projectQuality, filterFrom, filterTo]);

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return projectQuality
      .filter((p) => {
        if (q && !p.project_name.toLowerCase().includes(q)) return false;
        if (selectedType) {
          const t = p.type || "Non défini";
          if (t !== selectedType) return false;
        }
        if (selectedRoadmap) {
          if (selectedRoadmap === "Roadmap" && !p.is_roadmap) return false;
          if (selectedRoadmap === "Autre" && p.is_roadmap) return false;
        }
        if (selectedBus !== null) {
          if (p.contributors.length !== selectedBus) return false;
        }
        if (filterNew) {
          const isNew = !!(filterFrom && p.first_release_date && p.first_release_date >= filterFrom && (!filterTo || p.first_release_date <= filterTo));
          if (!isNew) return false;
        }
        return true;
      })
      .map((p) => {
        const isNew = !!(filterFrom && p.first_release_date && p.first_release_date >= filterFrom && (!filterTo || p.first_release_date <= filterTo));
        return {
          id: p.project_id,
          project_id: p.project_id,
          project_name: p.project_name,
          is_roadmap: p.is_roadmap,
          is_new: isNew,
          type: p.type || "—",
          impact: p.impact,
          total_releases: p.total_releases,
          total_bugs: p.total_bugs,
          critical_high_bugs: p.critical_high_bugs,
          total_impact_users: p.total_impact_users,
          bus_factor: p.contributors.length,
          contributors: p.contributors,
          first_release_date: p.first_release_date,
          last_release_date: p.last_release_date,
          status: getStatus(p.last_release_date),
        };
      });
  }, [projectQuality, search, selectedType, selectedRoadmap, selectedBus, filterNew, filterFrom, filterTo]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "project_name", headerName: "Projet", flex: 2, minWidth: 180,
      cellRenderer: (p: { data: { is_roadmap: boolean; project_name: string } }) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {p.data.is_roadmap && <span style={{ color: "#34d399", fontSize: 9, fontWeight: 700 }}>R</span>}
          <span style={{ fontWeight: 600 }}>{p.data.project_name}</span>
        </span>
      ),
    },
    {
      field: "is_new", headerName: "New", headerTooltip: "Projet nouveau sur la période", width: 60, flex: 0,
      cellRenderer: (p: { value: boolean }) => p.value ? (
        <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#38bdf822", color: "#38bdf8" }}>new</span>
      ) : null,
      comparator: (a: boolean, b: boolean) => (a === b ? 0 : a ? -1 : 1),
    },
    { field: "type", headerName: "Type", headerTooltip: "Type de projet", width: 100, flex: 0, cellStyle: () => ({ color: "#94a3b8" }) },
    {
      field: "impact", headerName: "Impact", headerTooltip: "Niveau d'impact du projet", width: 80, flex: 0,
      cellRenderer: (p: { value: string | null }) => p.value ? (
        <span style={{
          fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
          color: p.value === "high" ? "#f87171" : p.value === "medium" ? "#fbbf24" : "#34d399",
          background: p.value === "high" ? "#f8717122" : p.value === "medium" ? "#fbbf2422" : "#34d39922",
        }}>{p.value}</span>
      ) : null,
    },
    { field: "total_releases", headerName: "Releases", headerTooltip: "Nombre total de releases", type: "numericColumn", width: 85, flex: 0 },
    { field: "total_bugs", headerName: "Bugs", headerTooltip: "Nombre total de bugs introduits", type: "numericColumn", width: 70, flex: 0, cellStyle: (p) => ({ color: (p.value as number) > 0 ? "#f87171" : "#334155", fontWeight: 600 }) },
    {
      field: "bus_factor", headerName: "Bus", type: "numericColumn", width: 60, flex: 0,
      headerTooltip: "Bus factor — nombre de contributeurs",
      cellStyle: (p) => {
        const v = p.value as number;
        return { fontWeight: 700, color: v <= 1 ? "#f87171" : v <= 2 ? "#fbbf24" : "#34d399" };
      },
    },
    {
      field: "contributors", headerName: "Contributeurs", headerTooltip: "Développeurs ayant contribué au projet", flex: 1, minWidth: 120, filter: false, sortable: false,
      cellRenderer: (p: { value: { developer_key: string; display_name: string; color: string }[] }) => (
        <span style={{ display: "inline-flex", gap: 3, flexWrap: "wrap" }}>
          {(p.value || []).slice(0, 4).map((c) => (
            <span key={c.developer_key} style={{
              fontSize: 9, padding: "0 5px", borderRadius: 6,
              background: `${c.color}22`, color: c.color, fontWeight: 600,
            }}>
              {c.developer_key}
            </span>
          ))}
        </span>
      ),
    },
    {
      field: "first_release_date", headerName: "Première", headerTooltip: "Date de la première release", width: 100, flex: 0,
      valueFormatter: (p) => {
        if (!p.value) return "—";
        const dt = new Date(p.value);
        return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
      },
      cellStyle: () => ({ color: "#64748b" }),
    },
    {
      field: "last_release_date", headerName: "Dernière", headerTooltip: "Date de la dernière release", width: 100, flex: 0,
      valueFormatter: (p) => {
        if (!p.value) return "—";
        const dt = new Date(p.value);
        return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
      },
      cellStyle: () => ({ color: "#64748b" }),
    },
    {
      field: "status", headerName: "Statut", headerTooltip: "Actif si dernière release < 2 mois", width: 80, flex: 0, filter: false,
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
        {newCount > 0 && (
          <button
            onClick={() => setFilterNew(!filterNew)}
            style={{
              padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 600,
              background: filterNew ? "#38bdf8" : "#1e293b",
              color: filterNew ? "#0f172a" : "#38bdf8",
            }}
          >
            New ({newCount})
          </button>
        )}
        {hasChartFilter && (
          <button
            onClick={() => { setSelectedType(null); setSelectedRoadmap(null); setSelectedBus(null); setFilterNew(false); }}
            style={{
              padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 600, background: "#6366f1", color: "#fff",
            }}
          >
            Réinitialiser filtres
          </button>
        )}
        {hasChartFilter && (
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            {rows.length} / {projectQuality.length} projets
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ padding: "12px 16px", background: "#1e293b", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Répartition par type</div>
          <PieChart data={typePieData} selected={selectedType} onSliceClick={setSelectedType} />
        </div>
        <div style={{ padding: "12px 16px", background: "#1e293b", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Roadmap / Autre</div>
          <PieChart data={roadmapPieData} selected={selectedRoadmap} onSliceClick={setSelectedRoadmap} />
        </div>
        <div style={{ padding: "12px 16px", background: "#1e293b", borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Bus factor</div>
          {(() => {
            const max = Math.max(...busBars.map((b) => b.count), 1);
            const total = busBars.reduce((s, b) => s + b.count, 0);
            const risk = busBars.filter((b) => b.bus <= 1).reduce((s, b) => s + b.count, 0);
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {busBars.map((b) => {
                  const color = b.bus <= 1 ? "#f87171" : b.bus <= 2 ? "#fbbf24" : "#34d399";
                  const isActive = selectedBus === b.bus;
                  return (
                    <div
                      key={b.bus}
                      onClick={() => setSelectedBus(isActive ? null : b.bus)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                        opacity: selectedBus !== null && !isActive ? 0.35 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 10, color: "#94a3b8", minWidth: 10, textAlign: "right", fontWeight: 600 }}>{b.bus}</span>
                      <div style={{ flex: 1, height: 14, background: "#0f172a", borderRadius: 3, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${(b.count / max) * 100}%`, height: "100%", background: color, borderRadius: 3,
                            display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4,
                            outline: isActive ? `2px solid ${color}` : "none", outlineOffset: 1,
                          }}
                          title={`${b.count} projet${b.count > 1 ? "s" : ""} avec ${b.bus} contributeur${b.bus > 1 ? "s" : ""}`}
                        >
                          {b.count > 1 && <span style={{ fontSize: 8, fontWeight: 700, color: "#0f172a" }}>{b.count}</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 9, color: "#475569", minWidth: 24 }}>{b.count} proj.</span>
                    </div>
                  );
                })}
                <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: risk > 0 ? "#f87171" : "#34d399", fontWeight: 700 }}>
                    {risk}/{total} projet{risk > 1 ? "s" : ""} à risque (bus ≤ 1)
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
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
