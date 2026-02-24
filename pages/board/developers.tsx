import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import type { ColDef } from "ag-grid-community";
import type { BugFixDetail, DeveloperProfile, ProjectQuality, TeamMonthly } from "../../lib/api";
import { api } from "../../lib/api";
import { useBoardFilter } from "../../lib/boardFilterContext";
import V2Layout from "../../components/v2/V2Layout";
import BoardGrid from "../../components/v2/BoardGrid";

const SEV_COLORS: Record<string, string> = {
  critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399",
};
const TYPE_COLORS: Record<string, string> = {
  feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8",
};

interface Data {
  profiles: DeveloperProfile[];
  projectQuality: ProjectQuality[];
  bugFixes: BugFixDetail[];
  teamMonthly: TeamMonthly[];
}

export default function DevelopersPage() {
  const router = useRouter();
  const { queryParams, hydrated } = useBoardFilter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    Promise.all([
      api.developerProfiles(queryParams),
      api.projectQuality(queryParams),
      api.bugFixDetail(queryParams),
      api.teamMonthly(queryParams),
    ]).then(([profiles, projectQuality, bugFixes, teamMonthly]) => {
      setData({ profiles, projectQuality, bugFixes, teamMonthly });
      setLoading(false);
    });
  }, [queryParams, hydrated]);

  if (loading || !data) {
    return (
      <V2Layout>
        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 12 }}>Chargement…</div>
      </V2Layout>
    );
  }

  return (
    <V2Layout>
      <DevelopersContent profiles={data.profiles} projectQuality={data.projectQuality} bugFixes={data.bugFixes} teamMonthly={data.teamMonthly} />
    </V2Layout>
  );
}

function fmtMonth(m: string) { const [y, mm] = m.split("-"); return `${mm}/${y}`; }

function InteractiveSparkline({ points, months, label, color }: { points: number[]; months: string[]; label: string; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  if (points.length < 2) return null;
  const vw = 200, vh = 28, pad = 2;
  const max = Math.max(...points, 1);
  const stepX = (vw - pad * 2) / (points.length - 1);
  const coords = points.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - v / max) * (vh - pad * 2),
  }));
  const pathD = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${coords[coords.length - 1].x.toFixed(1)},${vh - pad} L${coords[0].x.toFixed(1)},${vh - pad} Z`;

  const onMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const idx = Math.round(xRatio * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, idx)));
  };

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: 28, cursor: "crosshair" }}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <path d={areaD} fill={color} opacity={0.12} />
        <path d={pathD} fill="none" stroke={color} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={i === hover ? 3 : 1.2} fill={color} stroke={i === hover ? "#e2e8f0" : "none"} strokeWidth={i === hover ? 1 : 0} />
        ))}
        {hover != null && (
          <line x1={coords[hover].x} y1={0} x2={coords[hover].x} y2={vh} stroke={color} strokeWidth={0.5} opacity={0.4} vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      {hover != null && (
        <div style={{
          position: "absolute", bottom: "100%", marginBottom: 4,
          left: `${(hover / (points.length - 1)) * 100}%`,
          transform: "translateX(-50%)",
          background: "#0f172a", border: `1px solid ${color}44`, borderRadius: 4,
          padding: "3px 8px", whiteSpace: "nowrap", fontSize: 9, fontWeight: 600,
          color, pointerEvents: "none", zIndex: 10,
        }}>
          {points[hover]} {label} — {fmtMonth(months[hover])}
        </div>
      )}
    </div>
  );
}

function DevelopersContent({ profiles, projectQuality, bugFixes, teamMonthly }: { profiles: DeveloperProfile[]; projectQuality: ProjectQuality[]; bugFixes: BugFixDetail[]; teamMonthly: TeamMonthly[] }) {
  const router = useRouter();

  // Group releases by developer_key + month (teamMonthly is keyed by display_name)
  const releasesByDev = useMemo(() => {
    const nameToKey = new Map<string, string>();
    for (const p of profiles) nameToKey.set(p.display_name, p.developer_key);
    const months = teamMonthly.map((t) => t.month as string).sort();
    const result = new Map<string, { months: string[]; values: number[] }>();
    for (const p of profiles) {
      const values = months.map((m) => {
        const row = teamMonthly.find((t) => t.month === m);
        return row ? (row[p.display_name] as number || 0) : 0;
      });
      if (values.some((v) => v > 0)) {
        result.set(p.developer_key, { months, values });
      }
    }
    return result;
  }, [teamMonthly, profiles]);

  // Group bugs by developer + month
  const bugsByDev = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const allMonths = new Set<string>();
    for (const b of bugFixes) {
      if (!b.bugged_date) continue;
      const month = b.bugged_date.slice(0, 7); // "YYYY-MM"
      allMonths.add(month);
      let devMap = map.get(b.author_key);
      if (!devMap) { devMap = new Map(); map.set(b.author_key, devMap); }
      devMap.set(month, (devMap.get(month) || 0) + 1);
    }
    // Sorted months for consistent x-axis
    const months = [...allMonths].sort();
    // Build per-dev ordered arrays
    const result = new Map<string, { months: string[]; values: number[] }>();
    for (const [devKey, devMap] of map) {
      const values = months.map((m) => devMap.get(m) || 0);
      result.set(devKey, { months, values });
    }
    return result;
  }, [bugFixes]);

  const focusMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of projectQuality) {
      for (const c of p.contributors) {
        m.set(c.developer_key, (m.get(c.developer_key) || 0) + 1);
      }
    }
    return m;
  }, [projectQuality]);

  const devs = useMemo(() =>
    [...profiles]
      .filter((p) => !p.is_em)
      .sort((a, b) => a.display_name.localeCompare(b.display_name)),
  [profiles]);

  const em = useMemo(() => profiles.filter((p) => p.is_em), [profiles]);

  const rows = useMemo(() =>
    [...profiles].sort((a, b) => a.display_name.localeCompare(b.display_name)).map((p) => {
      const qs = p.quality_stats;
      const total = p.type_breakdown.total;
      const sev = qs.severity_breakdown;
      return {
        id: p.developer_key,
        display_name: p.display_name,
        color: p.color,
        is_em: p.is_em,
        releases: total,
        feat: p.type_breakdown.feat,
        fix: p.type_breakdown.fix,
        refacto: p.type_breakdown.refacto,
        chore: p.type_breakdown.chore,
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
        repos: p.repos.map((r) => r.replace(/^indb-/, "")).join(", "),
        themes: p.themes.join(", "),
        [Symbol.toPrimitive as unknown as string]: undefined,
      } as Record<string, unknown>;
    }), [profiles, focusMap]);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "display_name", headerName: "Développeur", flex: 2, minWidth: 140,
      sort: "asc" as const,
      cellRenderer: (p: { data: { id: string; color: string; display_name: string; is_em: boolean } }) => (
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
          onClick={() => router.push(`/board/developer/${p.data.id}`)}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.data.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, textDecoration: "underline", textDecorationStyle: "dotted" }}>{p.data.display_name}</span>
          {p.data.is_em && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: "#f472b622", color: "#f472b6" }}>EM</span>}
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
  ], [router]);

  return (
    <>
      {/* Developer pills — quick navigation */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
        padding: "8px 12px", background: "#1e293b", borderRadius: 8, flexWrap: "wrap",
      }}>
        {devs.map((p) => (
          <span
            key={p.developer_key}
            onClick={() => router.push(`/board/developer/${p.developer_key}`)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
              background: "#0f172a", color: "#94a3b8",
              border: "1px solid #334155",
              transition: "all 0.15s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            {p.display_name}
          </span>
        ))}
        {em.length > 0 && <div style={{ flex: 1 }} />}
        {em.map((p) => (
          <span
            key={p.developer_key}
            onClick={() => router.push(`/board/developer/${p.developer_key}`)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
              background: "#0f172a", color: "#94a3b8",
              border: "1px solid #334155",
              transition: "all 0.15s",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            {p.display_name}
          </span>
        ))}
      </div>

      {/* Per-developer summary cards */}
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
        Profils développeurs
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {[...profiles]
          .sort((a, b) => {
            if (a.is_em !== b.is_em) return a.is_em ? 1 : -1;
            return a.display_name.localeCompare(b.display_name);
          })
          .map((p) => {
            const tb = p.type_breakdown;
            const qs = p.quality_stats;
            return (
              <div
                key={p.developer_key}
                onClick={() => router.push(`/board/developer/${p.developer_key}`)}
                style={{
                  background: "#1e293b", borderRadius: 8, padding: 16, cursor: "pointer",
                  borderLeft: `3px solid ${p.color}`,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#253349"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#1e293b"; }}
              >
                {/* Name + badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.display_name}</span>
                  {p.is_em && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: "#f472b622", color: "#f472b6" }}>EM</span>}
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{tb.total} rel.</span>
                </div>

                {/* Type bar */}
                {tb.total > 0 && (
                  <div style={{ display: "flex", height: 16, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                    {(["feat", "fix", "refacto", "chore"] as const).map((t) => {
                      const count = tb[t];
                      if (count === 0) return null;
                      const pct = (count / tb.total) * 100;
                      return (
                        <div key={t} style={{
                          width: `${pct}%`, background: TYPE_COLORS[t],
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 8, fontWeight: 700, color: "#0f172a",
                        }} title={`${t}: ${count} (${Math.round(pct)}%)`}>
                          {pct > 15 ? `${t} ${Math.round(pct)}%` : ""}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* KPI row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {qs.bugs_introduced > 0 && (
                    <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>
                      {qs.bugs_introduced} bug{qs.bugs_introduced > 1 ? "s" : ""}
                    </span>
                  )}
                  {(qs.total_impact_users || 0) > 0 && (
                    <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600 }}>
                      {qs.total_impact_users} MV
                    </span>
                  )}
                  {qs.rollbacks > 0 && (
                    <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>
                      {qs.rollbacks} rollb.
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: (tb.total > 0 ? Math.round((qs.bugs_introduced / tb.total) * 100) : 0) > 20 ? "#f87171"
                      : (tb.total > 0 ? Math.round((qs.bugs_introduced / tb.total) * 100) : 0) > 10 ? "#fbbf24" : "#34d399",
                  }}>
                    {tb.total > 0 ? Math.round((qs.bugs_introduced / tb.total) * 100) : 0}% bug rate
                  </span>
                </div>

                {/* Sparklines */}
                {(() => {
                  const devReleases = releasesByDev.get(p.developer_key);
                  const devBugs = bugsByDev.get(p.developer_key);
                  if ((!devReleases || devReleases.values.length < 2) && (!devBugs || devBugs.values.length < 2)) return null;
                  const months = devReleases?.months || devBugs?.months;
                  return (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                      {devReleases && devReleases.values.length >= 2 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 8, color: "#818cf8", fontWeight: 600, width: 24, flexShrink: 0 }}>rel.</span>
                          <div style={{ flex: 1, minWidth: 0 }}><InteractiveSparkline points={devReleases.values} months={devReleases.months} label="releases" color="#818cf8" /></div>
                        </div>
                      )}
                      {devBugs && devBugs.values.length >= 2 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 8, color: "#f87171", fontWeight: 600, width: 24, flexShrink: 0 }}>bugs</span>
                          <div style={{ flex: 1, minWidth: 0 }}><InteractiveSparkline points={devBugs.values} months={devBugs.months} label="bugs" color="#f87171" /></div>
                        </div>
                      )}
                      {months && (
                        <span style={{ fontSize: 8, color: "#475569", marginLeft: 28 }}>
                          {fmtMonth(months[0])} → {fmtMonth(months[months.length - 1])}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Repos */}
                {p.repos.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                    {p.repos.slice(0, 5).map((r) => (
                      <span key={r} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, background: "#334155", color: "#94a3b8" }}>
                        {r.replace(/^indb-/, "")}
                      </span>
                    ))}
                    {p.repos.length > 5 && <span style={{ fontSize: 9, color: "#475569" }}>+{p.repos.length - 5}</span>}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Scorecard grid */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
          Scorecard qualité — données factuelles
        </h3>
        <BoardGrid rows={rows} columnDefs={columnDefs} gridName="developers-scorecard" height={Math.min(rows.length * 36 + 40, 500)} />
      </div>
    </>
  );
}
