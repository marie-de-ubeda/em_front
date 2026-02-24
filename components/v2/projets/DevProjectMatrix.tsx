import { useMemo } from "react";
import type { ColDef } from "ag-grid-community";
import type { ProjectQuality } from "../../../lib/api";
import BoardGrid from "../BoardGrid";

interface Props {
  projectQuality: ProjectQuality[];
}

/** Intensity color based on release count: 0 = dark, high = vivid indigo */
function heatColor(count: number, max: number): string {
  if (count === 0) return "#1e293b";
  const ratio = Math.min(count / max, 1);
  const alpha = Math.round(0.2 + ratio * 0.8 * 255)
    .toString(16)
    .padStart(2, "0");
  return `#6366f1${alpha}`;
}

export default function DevProjectMatrix({ projectQuality }: Props) {
  // Build developer × project data
  const { rows, columnDefs, maxCount } = useMemo(() => {
    // Collect active projects (with contributors)
    const activeProjects = projectQuality
      .filter((p) => p.contributors.length > 0 && p.total_releases > 0)
      .sort((a, b) => b.total_releases - a.total_releases);

    // Collect all developers across all projects
    const devMap = new Map<string, { display_name: string; color: string; projects: Record<string, number>; total: number }>();

    for (const proj of activeProjects) {
      for (const c of proj.contributors) {
        if (!devMap.has(c.developer_key)) {
          devMap.set(c.developer_key, {
            display_name: c.display_name,
            color: c.color,
            projects: {},
            total: 0,
          });
        }
        const dev = devMap.get(c.developer_key)!;
        dev.projects[String(proj.project_id)] = c.release_count;
        dev.total += c.release_count;
      }
    }

    // Find max for heat coloring
    let max = 1;
    for (const dev of devMap.values()) {
      for (const count of Object.values(dev.projects)) {
        if (count > max) max = count;
      }
    }

    // Build rows sorted alphabetically
    const devRows = [...devMap.entries()]
      .sort((a, b) => a[1].display_name.localeCompare(b[1].display_name))
      .map(([key, dev]) => {
        const row: Record<string, unknown> = {
          id: key,
          developer_key: key,
          display_name: dev.display_name,
          color: dev.color,
          total: dev.total,
        };
        for (const proj of activeProjects) {
          row[`p_${proj.project_id}`] = dev.projects[String(proj.project_id)] || 0;
        }
        return row;
      });

    // Build column defs
    const cols: ColDef[] = [
      {
        field: "display_name", headerName: "Développeur", pinned: "left" as const, width: 140, flex: 0, minWidth: 100,
        cellRenderer: (p: { data: { color: string; display_name: string } }) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.data.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{p.data.display_name}</span>
          </span>
        ),
      },
      {
        field: "total", headerName: "Total", type: "numericColumn", pinned: "left" as const, width: 70, flex: 0,
        cellStyle: () => ({ fontWeight: 700, color: "#6366f1" }),
      },
    ];

    for (const proj of activeProjects) {
      cols.push({
        field: `p_${proj.project_id}`,
        headerName: proj.project_name.length > 14 ? proj.project_name.slice(0, 12) + "…" : proj.project_name,
        headerTooltip: proj.project_name,
        type: "numericColumn",
        width: 80,
        flex: 0,
        minWidth: 55,
        cellRenderer: (p: { value: number }) => {
          const v = p.value as number;
          if (v === 0) return <span style={{ color: "#334155" }}>·</span>;
          return (
            <span style={{
              fontWeight: 600, color: "#e2e8f0",
              background: heatColor(v, max),
              padding: "1px 6px", borderRadius: 4, fontSize: 10,
            }}>{v}</span>
          );
        },
      });
    }

    return { rows: devRows, columnDefs: cols, maxCount: max };
  }, [projectQuality]);

  if (rows.length === 0) return null;

  // Project count badge
  const projectCount = columnDefs.length - 2; // minus dev name + total

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          Matrice développeurs × projets
        </h3>
        <span style={{ fontSize: 9, color: "#64748b" }}>
          {rows.length} devs · {projectCount} projets · max {maxCount} releases
        </span>
      </div>
      <BoardGrid
        rows={rows}
        columnDefs={columnDefs}
        gridName="dev-project-matrix"
        height={Math.min(rows.length * 36 + 40, 500)}
      />
    </div>
  );
}
