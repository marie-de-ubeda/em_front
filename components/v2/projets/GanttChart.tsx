import { useState, useMemo, useRef, useCallback } from "react";
import type { GanttEntry, Sprint } from "../../../lib/api";
import { useBoardFilter } from "../../../lib/boardFilterContext";
import GanttDrawer from "./GanttDrawer";

type Mode = "by-developer" | "by-project";

interface Props {
  data: GanttEntry[];
  sprints: Sprint[];
}

const ROW_HEIGHT = 26;
const CELL_PAD = 3;

interface TooltipData {
  x: number;
  y: number;
  rowLabel: string;
  segLabel: string;
  sprintLabel: string;
  releases: number;
}

interface DrawerState {
  title: string;
  subtitle: string;
  developerKey: string | null;
  projectId: number | null;
  sprintId: number;
  sprintNumber: number;
}

export default function GanttChart({ data, sprints }: Props) {
  const { filterFrom, filterTo } = useBoardFilter();
  const [mode, setMode] = useState<Mode>("by-project");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a sprint list sorted by number
  const sortedSprints = useMemo(
    () => [...sprints].sort((a, b) => a.number - b.number),
    [sprints],
  );

  // Build lookups for click handling
  const entryLookup = useMemo(() => {
    // Map: "rowKey|sprintId" → GanttEntry[]
    const map = new Map<string, GanttEntry[]>();
    for (const d of data) {
      if (!d.sprint_id) continue;
      const rowKey = mode === "by-project" ? String(d.project_id) : d.developer_key;
      const cellKey = `${rowKey}|${d.sprint_id}`;
      if (!map.has(cellKey)) map.set(cellKey, []);
      map.get(cellKey)!.push(d);
    }
    return map;
  }, [data, mode]);

  // Only keep sprints that have data
  const { rows, activeSprints } = useMemo(() => {
    if (data.length === 0 || sortedSprints.length === 0) {
      return { rows: [], activeSprints: [] };
    }

    const sprintIdsWithData = new Set(data.map((d) => d.sprint_id).filter(Boolean));
    const active = sortedSprints.filter((s) => sprintIdsWithData.has(s.id));

    type CellSeg = { label: string; color: string; releases: number; developerKey: string; projectId: number };
    type Row = { key: string; label: string; color: string; isNew: boolean; cells: Map<number, CellSeg[]> };

    const rowMap = new Map<string, Row>();

    if (mode === "by-project") {
      for (const d of data) {
        if (!d.sprint_id) continue;
        const key = String(d.project_id);
        if (!rowMap.has(key)) {
          const isNew = !!(filterFrom && d.first_release_date && d.first_release_date >= filterFrom && (!filterTo || d.first_release_date <= filterTo));
          rowMap.set(key, { key, label: d.project_name, color: d.project_color, isNew, cells: new Map() });
        }
        const row = rowMap.get(key)!;
        if (!row.cells.has(d.sprint_id)) row.cells.set(d.sprint_id, []);
        row.cells.get(d.sprint_id)!.push({
          label: d.display_name,
          color: d.dev_color,
          releases: d.release_count,
          developerKey: d.developer_key,
          projectId: d.project_id,
        });
      }
    } else {
      for (const d of data) {
        if (!d.sprint_id) continue;
        const key = d.developer_key;
        if (!rowMap.has(key)) {
          rowMap.set(key, { key, label: d.display_name, color: d.dev_color, isNew: false, cells: new Map() });
        }
        const row = rowMap.get(key)!;
        if (!row.cells.has(d.sprint_id)) row.cells.set(d.sprint_id, []);
        row.cells.get(d.sprint_id)!.push({
          label: d.project_name,
          color: d.project_color,
          releases: d.release_count,
          developerKey: d.developer_key,
          projectId: d.project_id,
        });
      }
    }

    const builtRows = [...rowMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    return { rows: builtRows, activeSprints: active };
  }, [data, sortedSprints, mode, filterFrom, filterTo]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, rowLabel: string, segLabel: string, sprintLabel: string, releases: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left + 12,
        y: e.clientY - rect.top - 12,
        rowLabel,
        segLabel,
        sprintLabel,
        releases,
      });
    },
    [],
  );

  const handleCellClick = useCallback(
    (rowKey: string, rowLabel: string, sprint: Sprint, segLabel: string, developerKey: string, projectId: number) => {
      setTooltip(null);
      if (mode === "by-project") {
        setDrawer({
          title: rowLabel,
          subtitle: segLabel,
          developerKey,
          projectId: Number(rowKey),
          sprintId: sprint.id,
          sprintNumber: sprint.number,
        });
      } else {
        setDrawer({
          title: rowLabel,
          subtitle: segLabel,
          developerKey: rowKey,
          projectId,
          sprintId: sprint.id,
          sprintNumber: sprint.number,
        });
      }
    },
    [mode],
  );

  const handleRowClick = useCallback(
    (rowKey: string, rowLabel: string, sprint: Sprint) => {
      setTooltip(null);
      // Get all entries for this row+sprint to build a full-cell drawer
      const entries = entryLookup.get(`${rowKey}|${sprint.id}`);
      if (!entries || entries.length === 0) return;

      if (mode === "by-project") {
        setDrawer({
          title: rowLabel,
          subtitle: `${entries.length} développeur${entries.length > 1 ? "s" : ""}`,
          developerKey: null,
          projectId: Number(rowKey),
          sprintId: sprint.id,
          sprintNumber: sprint.number,
        });
      } else {
        setDrawer({
          title: rowLabel,
          subtitle: `${entries.length} projet${entries.length > 1 ? "s" : ""}`,
          developerKey: rowKey,
          projectId: null,
          sprintId: sprint.id,
          sprintNumber: sprint.number,
        });
      }
    },
    [mode, entryLookup],
  );

  if (data.length === 0 || activeSprints.length === 0) {
    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>Gantt</h3>
        <div style={{ padding: "20px 0", textAlign: "center", color: "#475569", fontSize: 11 }}>
          Aucune donnée pour cette période
        </div>
      </div>
    );
  }

  const LABEL_WIDTH = 180;
  const SPRINT_COL_WIDTH = Math.max(70, Math.floor(800 / activeSprints.length));

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          Gantt — Parallélisation
        </h3>
        <button
          onClick={() => setMode("by-developer")}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 10, fontWeight: 600,
            background: mode === "by-developer" ? "#6366f1" : "#1e293b",
            color: mode === "by-developer" ? "#fff" : "#94a3b8",
          }}
        >
          Par développeur
        </button>
        <button
          onClick={() => setMode("by-project")}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 10, fontWeight: 600,
            background: mode === "by-project" ? "#6366f1" : "#1e293b",
            color: mode === "by-project" ? "#fff" : "#94a3b8",
          }}
        >
          Par projet
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          background: "#1e293b", borderRadius: 8, overflowX: "auto", position: "relative",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse", minWidth: LABEL_WIDTH + activeSprints.length * SPRINT_COL_WIDTH,
            width: "100%",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  position: "sticky", left: 0, zIndex: 2, background: "#1e293b",
                  width: LABEL_WIDTH, minWidth: LABEL_WIDTH, padding: "6px 12px",
                  textAlign: "left", fontSize: 9, color: "#475569", fontWeight: 600,
                  borderBottom: "1px solid #334155",
                }}
              >
                {mode === "by-project" ? "Projet" : "Développeur"}
              </th>
              {activeSprints.map((s) => (
                <th
                  key={s.id}
                  style={{
                    width: SPRINT_COL_WIDTH, minWidth: SPRINT_COL_WIDTH,
                    padding: "6px 4px", textAlign: "center",
                    fontSize: 9, color: "#64748b", fontWeight: 600,
                    borderBottom: "1px solid #334155",
                    borderLeft: "1px solid #334155",
                  }}
                >
                  S{s.number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.key} style={{ background: ri % 2 === 0 ? "transparent" : "#0f172a22" }}>
                <td
                  style={{
                    position: "sticky", left: 0, zIndex: 1,
                    background: ri % 2 === 0 ? "#1e293b" : "#1a2436",
                    padding: "0 12px", height: ROW_HEIGHT,
                    fontSize: 10, fontWeight: 600, color: row.color,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    maxWidth: LABEL_WIDTH, borderBottom: "1px solid #0f172a44",
                  }}
                  title={row.label}
                >
                  {row.label}
                  {row.isNew && <span style={{ fontSize: 7, fontWeight: 700, marginLeft: 4, padding: "0 3px", borderRadius: 2, background: "#38bdf822", color: "#38bdf8", verticalAlign: "middle" }}>N</span>}
                </td>
                {activeSprints.map((s) => {
                  const segs = row.cells.get(s.id);
                  return (
                    <td
                      key={s.id}
                      style={{
                        padding: `${CELL_PAD}px 2px`, height: ROW_HEIGHT,
                        borderLeft: "1px solid #0f172a44", borderBottom: "1px solid #0f172a44",
                        verticalAlign: "middle",
                        cursor: segs ? "pointer" : "default",
                      }}
                      onClick={() => segs && handleRowClick(row.key, row.label, s)}
                    >
                      {segs && (
                        <div style={{ display: "flex", gap: 1, height: ROW_HEIGHT - CELL_PAD * 2 }}>
                          {segs.map((seg, si) => (
                            <div
                              key={si}
                              style={{
                                flex: seg.releases,
                                background: seg.color,
                                borderRadius: 3,
                                opacity: 0.85,
                                cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                overflow: "hidden",
                                minWidth: 8,
                              }}
                              onMouseMove={(e) =>
                                handleMouseMove(e, row.label, seg.label, `Sprint ${s.number}`, seg.releases)
                              }
                              onMouseLeave={() => setTooltip(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(row.key, row.label, s, seg.label, seg.developerKey, seg.projectId);
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 8, fontWeight: 700, color: "#fff",
                                  whiteSpace: "nowrap", overflow: "hidden",
                                  padding: "0 3px",
                                }}
                              >
                                {seg.releases > 1 ? seg.releases : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "absolute", left: tooltip.x, top: tooltip.y,
              background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
              padding: "6px 10px", fontSize: 10, pointerEvents: "none", zIndex: 10,
              minWidth: 120,
            }}
          >
            <div style={{ fontWeight: 700, color: "#e2e8f0" }}>{tooltip.rowLabel}</div>
            <div style={{ color: "#94a3b8" }}>{tooltip.segLabel}</div>
            <div style={{ color: "#64748b" }}>{tooltip.sprintLabel}</div>
            <div style={{ color: "#6366f1", fontWeight: 600 }}>{tooltip.releases} release{tooltip.releases > 1 ? "s" : ""}</div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {drawer && (
        <GanttDrawer
          title={drawer.title}
          subtitle={drawer.subtitle}
          developerKey={drawer.developerKey}
          projectId={drawer.projectId}
          sprintId={drawer.sprintId}
          sprintNumber={drawer.sprintNumber}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
