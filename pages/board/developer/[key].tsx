import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import type { ColDef } from "ag-grid-community";
import type {
  DeveloperProfile, DeveloperQualityTrend, BugFixDetail,
  ProjectQuality, GanttRelease, TeamMonthly,
} from "../../../lib/api";
import { api } from "../../../lib/api";
import { useBoardFilter } from "../../../lib/boardFilterContext";
import V2Layout from "../../../components/v2/V2Layout";
import BoardGrid from "../../../components/v2/BoardGrid";

const TYPE_COLORS: Record<string, string> = {
  feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8",
};
const SEV_COLORS: Record<string, string> = {
  critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399",
};
const DETECTED_LABELS: Record<string, { label: string; color: string }> = {
  client: { label: "Client / Support", color: "#f87171" },
  support: { label: "Client / Support", color: "#f87171" },
  team: { label: "Équipe", color: "#34d399" },
  monitoring: { label: "Monitoring", color: "#38bdf8" },
  qa: { label: "QA", color: "#a78bfa" },
};

function fmtMonth(m: string) { const [y, mm] = m.split("-"); return `${mm}/${y}`; }

function Sparkline({ points, months, label, color }: { points: number[]; months: string[]; label: string; color: string }) {
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

function TicketBadges({ tickets }: { tickets: { key: string; url: string }[] }) {
  if (tickets.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {tickets.map((t) => (
        <a key={t.key} href={t.url} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
            background: "#1e293b", color: "#34d399", textDecoration: "none",
            border: "1px solid #334155",
          }}>
          {t.key} ↗
        </a>
      ))}
    </div>
  );
}

function BugDetailDrawer({ bugs, onClose }: { bugs: BugFixDetail[]; onClose: () => void }) {
  // Group bugs by bugged_release_id so we show origin once per source release
  const groups = useMemo(() => {
    const m = new Map<number, BugFixDetail[]>();
    for (const b of bugs) {
      const arr = m.get(b.bugged_release_id) || [];
      arr.push(b);
      m.set(b.bugged_release_id, arr);
    }
    return [...m.values()].map((g) =>
      g.sort((a, b) => new Date(a.fix_date || "").getTime() - new Date(b.fix_date || "").getTime())
    );
  }, [bugs]);

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 520, maxWidth: "85vw",
        background: "#0f172a", borderLeft: "1px solid #334155",
        zIndex: 2001, display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease-out",
      }}>
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #1e293b",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
            {bugs.length === 1 ? "Détail du bug" : `${bugs.length} bugs`}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", padding: 4,
          }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map((group) => {
            const origin = group[0];
            const detected = DETECTED_LABELS[origin.detected_by || ""] || { label: origin.detected_by || "—", color: "#64748b" };
            return (
              <div key={origin.bugged_release_id} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Origin — shown once per source release */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", marginBottom: 8, borderBottom: "1px solid #334155", paddingBottom: 4 }}>
                    Origine {group.length > 1 ? `(${group.length} bugs)` : ""}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Release :</span>
                      <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>{origin.bugged_repo.replace(/^indb-/, "")} {origin.bugged_version}</span>
                      {origin.bugged_date && <span style={{ fontSize: 10, color: "#64748b" }}>({new Date(origin.bugged_date).toLocaleDateString("fr-FR")})</span>}
                      {origin.bugged_release_url && <a href={origin.bugged_release_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "#6366f1", textDecoration: "none" }}>release ↗</a>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Auteur :</span>
                      <span style={{ fontSize: 11, color: origin.author_color, fontWeight: 600 }}>{origin.author_name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Détecté par :</span>
                      <span style={{ fontSize: 11, color: detected.color, fontWeight: 600 }}>{detected.label}</span>
                    </div>
                    {origin.bugged_tickets?.length > 0 && (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                        <span style={{ fontSize: 10, color: "#64748b", minWidth: 70, marginTop: 2 }}>Tickets :</span>
                        <TicketBadges tickets={origin.bugged_tickets} />
                      </div>
                    )}
                    {origin.bugged_changes && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "#64748b" }}>Changelog :</span>
                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap", background: "#1e293b", padding: "8px 10px", borderRadius: 6 }}>{origin.bugged_changes}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Corrections — one per bug */}
                {group.map((bug, idx) => {
                  const sevColor = SEV_COLORS[bug.severity || ""] || "#94a3b8";
                  return (
                    <div key={bug.id} style={{
                      background: "#1e293b", borderRadius: 8, padding: "12px 14px",
                      borderLeft: `3px solid ${sevColor}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#34d399" }}>
                          Correction {group.length > 1 ? `${idx + 1}/${group.length}` : ""}
                        </span>
                        {bug.severity && (
                          <span style={{
                            fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                            background: `${sevColor}22`, color: sevColor, textTransform: "uppercase",
                          }}>{bug.severity}</span>
                        )}
                        {bug.impact_users != null && bug.impact_users > 0 && (
                          <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600 }}>{bug.impact_users} MV</span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Release :</span>
                          <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>{bug.fix_repo.replace(/^indb-/, "")} {bug.fix_version}</span>
                          {bug.fix_date && <span style={{ fontSize: 10, color: "#64748b" }}>({new Date(bug.fix_date).toLocaleDateString("fr-FR")})</span>}
                          {bug.fix_release_url && <a href={bug.fix_release_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: "#6366f1", textDecoration: "none" }}>release ↗</a>}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Fixeur :</span>
                          <span style={{ fontSize: 11, color: bug.fixer_color, fontWeight: 600 }}>{bug.fixer_name}</span>
                        </div>
                        {bug.days_to_fix != null && (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Délai :</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: bug.days_to_fix > 30 ? "#f87171" : bug.days_to_fix > 14 ? "#fbbf24" : "#34d399" }}>
                              {bug.days_to_fix} jours
                            </span>
                          </div>
                        )}
                        {bug.environment && (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Env. :</span>
                            <span style={{ fontSize: 11, color: "#e2e8f0" }}>{bug.environment}</span>
                          </div>
                        )}
                        {bug.fix_tickets?.length > 0 && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 10, color: "#64748b", minWidth: 70, marginTop: 2 }}>Tickets :</span>
                            <TicketBadges tickets={bug.fix_tickets} />
                          </div>
                        )}
                        {bug.fix_changes && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: "#64748b" }}>Changelog :</span>
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap", background: "#0f172a", padding: "8px 10px", borderRadius: 6 }}>{bug.fix_changes}</div>
                          </div>
                        )}
                        {bug.impact_description && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: "#fbbf24" }}>Impact :</span>
                            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{bug.impact_description}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function fmtShort(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

/* ── Releases AG Grid ── */

interface ReleaseRow {
  [key: string]: unknown;
  id: number;
  date: string | null;
  dateFmt: string;
  dateSort: number;
  type: string;
  repo: string;
  version: string;
  changes: string;
  bugs: number;
  releaseUrl: string | null;
  ticketKeys: string;
  release: GanttRelease;
  relBugs: BugFixDetail[];
}

function ReleasesGrid({
  releases, bugsByReleaseId, onBugClick,
}: {
  releases: GanttRelease[];
  bugsByReleaseId: Map<number, BugFixDetail[]>;
  onBugClick: (b: BugFixDetail[]) => void;
}) {
  const rows = useMemo<ReleaseRow[]>(() =>
    releases.map((r) => {
      const relBugs = bugsByReleaseId.get(r.release_id) || [];
      return {
        id: r.release_id,
        date: r.release_date,
        dateFmt: r.release_date ? fmtDate(r.release_date) : "—",
        dateSort: r.release_date ? new Date(r.release_date).getTime() : 0,
        type: r.release_type || "",
        repo: r.repo_name?.replace(/^indb-/, "") || "",
        version: r.version,
        changes: r.changes || "",
        bugs: relBugs.length,
        releaseUrl: r.release_url,
        ticketKeys: r.tickets.map((t) => t.key).join(", "),
        release: r,
        relBugs,
      };
    }),
  [releases, bugsByReleaseId]);

  const columnDefs = useMemo<ColDef<ReleaseRow>[]>(() => [
    {
      field: "dateFmt", headerName: "Date", width: 105, flex: 0,
      sort: "desc" as const,
      comparator: (_a: string, _b: string, nodeA: { data?: ReleaseRow }, nodeB: { data?: ReleaseRow }) =>
        (nodeA.data?.dateSort ?? 0) - (nodeB.data?.dateSort ?? 0),
    },
    {
      field: "type", headerName: "Type", width: 80, flex: 0,
      cellRenderer: (p: { value: string }) => p.value ? (
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
          background: `${TYPE_COLORS[p.value] || "#94a3b8"}22`,
          color: TYPE_COLORS[p.value] || "#94a3b8",
        }}>{p.value}</span>
      ) : null,
    },
    { field: "repo", headerName: "Repo", width: 110, flex: 0 },
    {
      field: "version", headerName: "Version", width: 110, flex: 0,
      cellRenderer: (p: { data: ReleaseRow }) => p.data.releaseUrl ? (
        <a href={p.data.releaseUrl} target="_blank" rel="noopener noreferrer"
          style={{ color: "#e2e8f0", fontWeight: 600, textDecoration: "none" }}>
          {p.data.version} <span style={{ color: "#6366f1", fontSize: 10 }}>↗</span>
        </a>
      ) : <span style={{ fontWeight: 600 }}>{p.data.version}</span>,
    },
    {
      field: "changes", headerName: "Changelog", flex: 3, minWidth: 200,
      tooltipField: "changes",
      cellStyle: () => ({ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }),
    },
    {
      field: "bugs", headerName: "Bugs", width: 80, flex: 0, type: "numericColumn",
      cellRenderer: (p: { data: ReleaseRow }) => {
        if (p.data.bugs === 0) return <span style={{ color: "#334155" }}>0</span>;
        const worstSev = p.data.relBugs.reduce((worst, b) => {
          if (!b.severity) return worst;
          const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          return (order[b.severity] || 0) > (order[worst] || 0) ? b.severity : worst;
        }, "" as string);
        return (
          <span
            onClick={(e) => { e.stopPropagation(); onBugClick(p.data.relBugs); }}
            style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
              background: `${SEV_COLORS[worstSev] || "#f87171"}22`,
              color: SEV_COLORS[worstSev] || "#f87171",
              border: `1px solid ${SEV_COLORS[worstSev] || "#f87171"}44`,
            }}
          >{p.data.bugs} ℹ</span>
        );
      },
    },
    {
      field: "ticketKeys", headerName: "Tickets", width: 140, flex: 0,
      tooltipField: "ticketKeys",
      cellRenderer: (p: { data: ReleaseRow }) => {
        const tickets = p.data.release.tickets;
        if (tickets.length === 0) return null;
        return (
          <div style={{ display: "flex", gap: 4, alignItems: "center", overflow: "hidden" }}>
            {tickets.map((t) => (
              <a key={t.key} href={t.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 10, fontWeight: 600, color: "#34d399", textDecoration: "none", whiteSpace: "nowrap" }}>
                {t.key}
              </a>
            ))}
          </div>
        );
      },
    },
  ], [onBugClick]);

  return (
    <div style={{ marginBottom: 20 }}>
      <BoardGrid
        rows={rows}
        columnDefs={columnDefs as ColDef[]}
        gridName="dev-releases"
        height={Math.min(rows.length * 36 + 44, 500)}
      />
    </div>
  );
}

interface Data {
  profile: DeveloperProfile | null;
  allProfiles: DeveloperProfile[];
  trend: DeveloperQualityTrend[];
  bugs: BugFixDetail[];
  allBugs: BugFixDetail[];
  projects: ProjectQuality[];
  releases: GanttRelease[];
  teamMonthly: TeamMonthly[];
}

export default function DeveloperProfilePage() {
  const router = useRouter();
  const key = router.query.key as string | undefined;
  const { queryParams, hydrated } = useBoardFilter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated || !key) return;
    setLoading(true);
    const relParams = queryParams
      ? `${queryParams}&developer_key=${key}`
      : `?developer_key=${key}`;

    Promise.all([
      api.developerProfiles(queryParams),
      api.developerQualityTrend(queryParams),
      api.bugFixDetail(queryParams),
      api.projectQuality(queryParams),
      api.ganttReleases(relParams),
      api.teamMonthly(queryParams),
    ]).then(([profiles, trendData, bugData, projData, relData, teamMonthly]) => {
      setData({
        profile: profiles.find((p) => p.developer_key === key) || null,
        allProfiles: profiles,
        trend: trendData.filter((t) => t.developer_key === key),
        bugs: bugData.filter((b) => b.author_key === key),
        allBugs: bugData,
        projects: projData.filter((p) => p.contributors.some((c) => c.developer_key === key)),
        releases: relData,
        teamMonthly,
      });
      setLoading(false);
    }).catch((err) => {
      console.error("Developer page fetch error:", err);
      setLoading(false);
    });
  }, [queryParams, hydrated, key]);

  if (!key || loading || !data) {
    return (
      <V2Layout>
        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 12 }}>Chargement…</div>
      </V2Layout>
    );
  }

  const { profile, allProfiles, trend, bugs, allBugs, projects, releases, teamMonthly } = data;

  if (!profile) {
    return (
      <V2Layout>
        <div style={{ padding: "40px 0", textAlign: "center", color: "#475569", fontSize: 12 }}>
          Développeur introuvable.{" "}
          <Link href="/board/developers" style={{ color: "#6366f1" }}>← Retour</Link>
        </div>
      </V2Layout>
    );
  }

  const tb = profile.type_breakdown;
  const qs = profile.quality_stats;

  return (
    <V2Layout>
      {/* Developer navigation pills */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
        padding: "8px 12px", background: "#1e293b", borderRadius: 8, flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, marginRight: 4 }}>Développeurs :</span>
        {[...allProfiles]
          .filter((p) => !p.is_em)
          .sort((a, b) => a.display_name.localeCompare(b.display_name))
          .map((p) => {
            const isActive = p.developer_key === key;
            return (
              <Link
                key={p.developer_key}
                href={`/board/developer/${p.developer_key}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                  textDecoration: "none", whiteSpace: "nowrap",
                  background: isActive ? `${p.color}33` : "#0f172a",
                  color: isActive ? p.color : "#94a3b8",
                  border: isActive ? `1px solid ${p.color}66` : "1px solid #334155",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                {p.display_name}
              </Link>
            );
          })}
        <div style={{ flex: 1 }} />
        {allProfiles
          .filter((p) => p.is_em)
          .map((p) => {
            const isActive = p.developer_key === key;
            return (
              <Link
                key={p.developer_key}
                href={`/board/developer/${p.developer_key}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                  textDecoration: "none", whiteSpace: "nowrap",
                  background: isActive ? `${p.color}33` : "#0f172a",
                  color: isActive ? p.color : "#94a3b8",
                  border: isActive ? `1px solid ${p.color}66` : "1px solid #334155",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                {p.display_name}
              </Link>
            );
          })}
      </div>

      <DeveloperContent
        profile={profile}
        tb={tb}
        qs={qs}
        trend={trend}
        bugs={bugs}
        allBugs={allBugs}
        projects={projects}
        releases={releases}
        teamMonthly={teamMonthly}
      />
    </V2Layout>
  );
}

/* ── Main content extracted so the page component stays lean ── */

function DeveloperContent({
  profile, tb, qs, trend, bugs, allBugs, projects, releases, teamMonthly,
}: {
  profile: DeveloperProfile;
  tb: DeveloperProfile["type_breakdown"];
  qs: DeveloperProfile["quality_stats"];
  trend: DeveloperQualityTrend[];
  bugs: BugFixDetail[];
  allBugs: BugFixDetail[];
  projects: ProjectQuality[];
  releases: GanttRelease[];
  teamMonthly: TeamMonthly[];
}) {
  const { filterFrom, filterTo } = useBoardFilter();
  const developerKey = profile.developer_key;
  const color = profile.color;
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [selectedBugs, setSelectedBugs] = useState<BugFixDetail[] | null>(null);

  // Sparkline data — releases by month
  const releaseSparkline = useMemo(() => {
    const months = teamMonthly.map((t) => t.month as string).sort();
    if (months.length < 2) return null;
    const values = months.map((m) => {
      const row = teamMonthly.find((t) => t.month === m);
      return row ? (row[profile.display_name] as number || 0) : 0;
    });
    if (values.every((v) => v === 0)) return null;
    return { months, values };
  }, [teamMonthly, profile.display_name]);

  // Sparkline data — bugs by month
  const bugSparkline = useMemo(() => {
    const allMonths = new Set<string>();
    const devMap = new Map<string, number>();
    for (const b of allBugs) {
      if (!b.bugged_date) continue;
      const month = b.bugged_date.slice(0, 7);
      allMonths.add(month);
      if (b.author_key === developerKey) {
        devMap.set(month, (devMap.get(month) || 0) + 1);
      }
    }
    const months = [...allMonths].sort();
    if (months.length < 2) return null;
    const values = months.map((m) => devMap.get(m) || 0);
    if (values.every((v) => v === 0)) return null;
    return { months, values };
  }, [allBugs, developerKey]);

  const bugsByReleaseId = useMemo(() => {
    const m = new Map<number, BugFixDetail[]>();
    for (const b of bugs) {
      const arr = m.get(b.bugged_release_id) || [];
      arr.push(b);
      m.set(b.bugged_release_id, arr);
    }
    return m;
  }, [bugs]);

  // Map bugs by project_id for this dev
  const bugsByProjectId = useMemo(() => {
    const m = new Map<number, BugFixDetail[]>();
    for (const b of bugs) {
      for (const pid of b.project_ids || []) {
        const arr = m.get(pid) || [];
        arr.push(b);
        m.set(pid, arr);
      }
    }
    return m;
  }, [bugs]);

  const devProjects = useMemo(() => {
    return projects
      .map((p) => {
        const contrib = p.contributors.find((c) => c.developer_key === developerKey);
        const devReleases = contrib?.release_count || 0;
        const devBugs = bugsByProjectId.get(p.project_id)?.length || 0;
        return {
          ...p,
          devReleases,
          devBugs,
        };
      })
      .sort((a, b) => b.devReleases - a.devReleases);
  }, [projects, developerKey, bugsByProjectId]);

  const devMap = useMemo(() => {
    const m = new Map<string, { name: string; color: string }>();
    for (const p of projects) {
      for (const c of p.contributors) {
        m.set(c.developer_key, { name: c.display_name, color: c.color });
      }
    }
    return m;
  }, [projects]);

  const [activeTab, setActiveTab] = useState<"releases" | "projets">("releases");

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Link href="/board/developers" style={{ fontSize: 11, color: "#6366f1", textDecoration: "none" }}>← Développeurs</Link>
        <span style={{ width: 14, height: 14, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{profile.display_name}</h2>
      </div>

      {/* Repos & Themes */}
      {(profile.repos.length > 0 || profile.themes.length > 0) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
          {profile.repos.map((r) => (
            <span key={r} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#334155", color: "#94a3b8" }}>
              {r.replace(/^indb-/, "")}
            </span>
          ))}
          {profile.themes.map((t) => (
            <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#6366f122", color: "#818cf8" }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { label: "Releases", value: tb.total, color: "#6366f1" },
          { label: "Bug rate", value: `${tb.total > 0 ? Math.round((qs.bugs_introduced / tb.total) * 100) : 0}%`, color: qs.bugs_introduced > 0 ? "#f87171" : "#34d399" },
          { label: "Fix moyen", value: qs.avg_time_to_fix_days != null ? `${qs.avg_time_to_fix_days}j` : "—", color: "#94a3b8" },
          { label: "Rollbacks", value: qs.rollbacks, color: qs.rollbacks > 0 ? "#f87171" : "#334155" },
          { label: "MV impactées", value: qs.total_impact_users || 0, color: (qs.total_impact_users || 0) > 0 ? "#fbbf24" : "#334155" },
        ].map((k) => (
          <div key={k.label} style={{
            background: "#1e293b", borderRadius: 8, padding: "10px 16px",
            flex: "1 1 100px", borderLeft: `3px solid ${k.color}`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Sparklines — releases & bugs over time */}
      {(releaseSparkline || bugSparkline) && (
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>Évolution mensuelle</div>
          {releaseSparkline && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#818cf8", fontWeight: 600, width: 28, flexShrink: 0 }}>rel.</span>
              <div style={{ flex: 1, minWidth: 0 }}><Sparkline points={releaseSparkline.values} months={releaseSparkline.months} label="releases" color="#818cf8" /></div>
            </div>
          )}
          {bugSparkline && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 9, color: "#f87171", fontWeight: 600, width: 28, flexShrink: 0 }}>bugs</span>
              <div style={{ flex: 1, minWidth: 0 }}><Sparkline points={bugSparkline.values} months={bugSparkline.months} label="bugs" color="#f87171" /></div>
            </div>
          )}
          <span style={{ fontSize: 8, color: "#475569", marginLeft: 34 }}>
            {fmtMonth((releaseSparkline?.months || bugSparkline?.months)?.[0] || "")} → {fmtMonth((releaseSparkline?.months || bugSparkline?.months)?.slice(-1)[0] || "")}
          </span>
        </div>
      )}

      {/* Type breakdown — full width */}
      <div style={{ background: "#1e293b", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Répartition par type</div>
        {tb.total > 0 && (
          <>
            <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden" }}>
              {(["feat", "fix", "refacto", "chore"] as const).map((t) => {
                const count = tb[t];
                if (count === 0) return null;
                const pct = (count / tb.total) * 100;
                return (
                  <div key={t} style={{
                    width: `${pct}%`, background: TYPE_COLORS[t],
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#0f172a",
                  }} title={`${t}: ${count} (${Math.round(pct)}%)`}>
                    {pct > 10 ? `${t} ${Math.round(pct)}%` : ""}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
              {(["feat", "fix", "refacto", "chore"] as const).map((t) => (
                <span key={t} style={{ fontSize: 10, color: TYPE_COLORS[t] }}>
                  {t}: {tb[t]}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 2-column: Quarterly trend + Cross-fix */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Évolution trimestrielle</div>
          {trend.length > 0 ? (
            <>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 120 }}>
                {trend.map((t) => {
                  const maxRel = Math.max(...trend.map((x) => x.releases_count), 1);
                  const relH = (t.releases_count / maxRel) * 100;
                  const bugH = (t.bugs_introduced / maxRel) * 100;
                  return (
                    <div key={t.quarter} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: 100 }}>
                        {bugH > 0 && (
                          <div style={{ width: 20, height: bugH, background: "#f87171", borderRadius: "3px 3px 0 0" }}
                            title={`${t.bugs_introduced} bugs`} />
                        )}
                        <div style={{ width: 20, height: Math.max(relH, 3), background: "#6366f1", borderRadius: bugH > 0 ? 0 : "3px 3px 0 0" }}
                          title={`${t.releases_count} releases`} />
                      </div>
                      <span style={{ fontSize: 8, color: "#475569", whiteSpace: "nowrap" }}>{t.quarter}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
                <span style={{ fontSize: 9, color: "#6366f1" }}>Releases</span>
                <span style={{ fontSize: 9, color: "#f87171" }}>Bugs</span>
              </div>
            </>
          ) : (
            <div style={{ color: "#475569", fontSize: 11 }}>Aucune donnée</div>
          )}
        </div>

        <div style={{ background: "#1e293b", borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>Qualité — interactions</div>
          {(Object.keys(qs.fixes_for_others).length > 0 || Object.keys(qs.fixed_by_others).length > 0) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Object.keys(qs.fixes_for_others).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#34d399", fontWeight: 700, marginBottom: 4 }}>Corrige les bugs de</div>
                  {Object.entries(qs.fixes_for_others)
                    .filter(([k]) => k !== developerKey)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => {
                      const d = devMap.get(k);
                      const max = Math.max(...Object.values(qs.fixes_for_others));
                      return (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: d?.color || "#94a3b8", fontWeight: 600, minWidth: 80 }}>{d?.name || k}</span>
                          <div style={{ flex: 1, height: 8, background: "#334155", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: "#34d399", borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "#94a3b8", minWidth: 20, textAlign: "right" }}>{v}</span>
                        </div>
                      );
                    })}
                </div>
              )}
              {Object.keys(qs.fixed_by_others).length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#fbbf24", fontWeight: 700, marginBottom: 4 }}>Corrigé par</div>
                  {Object.entries(qs.fixed_by_others)
                    .filter(([k]) => k !== developerKey)
                    .sort(([, a], [, b]) => b - a)
                    .map(([k, v]) => {
                      const d = devMap.get(k);
                      const max = Math.max(...Object.values(qs.fixed_by_others));
                      return (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: d?.color || "#94a3b8", fontWeight: 600, minWidth: 80 }}>{d?.name || k}</span>
                          <div style={{ flex: 1, height: 8, background: "#334155", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${(v / max) * 100}%`, height: "100%", background: "#fbbf24", borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 10, color: "#94a3b8", minWidth: 20, textAlign: "right" }}>{v}</span>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#475569", fontSize: 11 }}>Aucune interaction</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {([
          { key: "releases" as const, label: `Releases (${releases.length})` },
          { key: "projets" as const, label: `Projets (${devProjects.length})` },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: activeTab === t.key ? "#6366f1" : "#1e293b",
              color: activeTab === t.key ? "#fff" : "#94a3b8",
              transition: "background 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Releases ── */}
      {activeTab === "releases" && (
        <ReleasesGrid
          releases={releases}
          bugsByReleaseId={bugsByReleaseId}
          onBugClick={setSelectedBugs}
        />
      )}

      {/* ── Tab: Projets ── */}
      {activeTab === "projets" && (
        <>
          {devProjects.length > 0 ? devProjects.map((p) => {
            const projBugs = bugsByProjectId.get(p.project_id) || [];
            const projReleases = releases.filter((r) => (r.project_ids || []).includes(p.project_id));
            const bugReleaseIds = new Set(projBugs.map((b) => b.bugged_release_id));
            const bugReleases = projReleases.filter((r) => bugReleaseIds.has(r.release_id));
            const cleanReleases = projReleases.filter((r) => !bugReleaseIds.has(r.release_id));
            const isOpen = expandedProject === p.project_id;
            return (
              <div key={p.project_id} style={{
                background: "#1e293b", borderRadius: 8, marginBottom: 8, overflow: "hidden",
                borderLeft: p.is_roadmap ? "3px solid #34d399" : "3px solid #334155",
              }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedProject(isOpen ? null : p.project_id)}
                >
                  {p.is_roadmap && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#34d39922", color: "#34d399" }}>Roadmap</span>}
                  {!!(filterFrom && p.first_release_date && p.first_release_date >= filterFrom && (!filterTo || p.first_release_date <= filterTo)) && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#38bdf822", color: "#38bdf8" }}>new</span>
                  )}
                  <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12, flex: 1 }}>{p.project_name}</span>
                  <span style={{ color: color, fontWeight: 700, fontSize: 12 }}>{p.devReleases} rel.</span>
                  {p.devBugs > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: "#f8717122", color: "#f87171",
                      border: "1px solid #f8717133",
                    }}>
                      {p.devBugs} bug{p.devBugs > 1 ? "s" : ""}
                    </span>
                  )}
                  <span style={{ color: "#475569", fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: "1px solid #334155", padding: "10px 16px", background: "#0f172a" }}>
                    {/* Bug releases */}
                    {bugReleases.length > 0 && (
                      <div style={{ marginBottom: cleanReleases.length > 0 ? 14 : 0 }}>
                        <div style={{ fontSize: 10, color: "#f87171", fontWeight: 700, marginBottom: 6 }}>
                          Releases avec bugs ({bugReleases.length})
                        </div>
                        {bugReleases.map((r) => {
                          const relBugs = bugsByReleaseId.get(r.release_id) || [];
                          return (
                            <div key={r.release_id} style={{ marginBottom: 6, borderRadius: 6, background: "#1e293b", overflow: "hidden", borderLeft: "2px solid #f87171" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", fontSize: 11 }}>
                                <span style={{ color: "#64748b", fontSize: 10, minWidth: 40 }}>
                                  {r.release_date ? fmtShort(r.release_date) : "—"}
                                </span>
                                {r.release_type && (
                                  <span style={{
                                    fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                                    background: `${TYPE_COLORS[r.release_type] || "#94a3b8"}22`,
                                    color: TYPE_COLORS[r.release_type] || "#94a3b8",
                                  }}>{r.release_type}</span>
                                )}
                                <span style={{ color: "#94a3b8", fontSize: 10 }}>{r.repo_name?.replace(/^indb-/, "")}</span>
                                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.version}</span>
                                {r.release_url && (
                                  <a href={r.release_url} target="_blank" rel="noopener noreferrer"
                                    style={{ fontSize: 9, color: "#6366f1", textDecoration: "none" }}>↗</a>
                                )}
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                                  background: "#f8717122", color: "#f87171", marginLeft: "auto",
                                }}>
                                  {relBugs.length} bug{relBugs.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              {r.changes && (
                                <div style={{ padding: "0 10px 6px", fontSize: 10, color: "#94a3b8", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                                  {r.changes}
                                </div>
                              )}
                              <div style={{ borderTop: "1px solid #334155", padding: "6px 10px" }}>
                                {[...relBugs].sort((a, b) => (b.days_to_fix ?? 0) - (a.days_to_fix ?? 0)).map((b) => (
                                  <div key={b.id} style={{
                                    display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
                                    fontSize: 10, flexWrap: "wrap",
                                  }}>
                                    {b.severity && (
                                      <span style={{
                                        fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                                        background: `${SEV_COLORS[b.severity] || "#94a3b8"}33`,
                                        color: SEV_COLORS[b.severity] || "#94a3b8",
                                        textTransform: "uppercase",
                                      }}>{b.severity}</span>
                                    )}
                                    <span style={{ color: "#64748b", fontSize: 9 }}>
                                      {b.days_to_fix != null ? `${b.days_to_fix}j` : "—"}
                                    </span>
                                    <span style={{ color: "#94a3b8" }}>→</span>
                                    <span style={{ color: b.fixer_color, fontWeight: 600 }}>{b.fixer_name}</span>
                                    <span style={{ color: "#94a3b8" }}>
                                      {b.fix_repo.replace(/^indb-/, "")} {b.fix_version}
                                    </span>
                                    {b.impact_users != null && b.impact_users > 0 && (
                                      <span style={{ fontSize: 9, color: "#fbbf24" }}>{b.impact_users} MV</span>
                                    )}
                                    <span
                                      onClick={(e) => { e.stopPropagation(); setSelectedBugs([b]); }}
                                      style={{ cursor: "pointer", fontSize: 9, color: "#6366f1", fontWeight: 700, marginLeft: "auto" }}
                                      title="Détail du bug"
                                    >ℹ</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Clean releases */}
                    {cleanReleases.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: "#34d399", fontWeight: 700, marginBottom: 6 }}>
                          Releases ({cleanReleases.length})
                        </div>
                        {cleanReleases.map((r) => (
                          <div key={r.release_id} style={{
                            padding: "5px 10px", fontSize: 11, borderBottom: "1px solid #1e293b",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ color: "#64748b", fontSize: 10, minWidth: 40 }}>
                                {r.release_date ? fmtShort(r.release_date) : "—"}
                              </span>
                              {r.release_type && (
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3,
                                  background: `${TYPE_COLORS[r.release_type] || "#94a3b8"}22`,
                                  color: TYPE_COLORS[r.release_type] || "#94a3b8",
                                }}>{r.release_type}</span>
                              )}
                              <span style={{ color: "#94a3b8", fontSize: 10 }}>{r.repo_name?.replace(/^indb-/, "")}</span>
                              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.version}</span>
                              {r.release_url && (
                                <a href={r.release_url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 9, color: "#6366f1", textDecoration: "none", marginLeft: "auto" }}>↗</a>
                              )}
                            </div>
                            {r.changes && (
                              <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 3, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                                {r.changes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {projReleases.length === 0 && (
                      <div style={{ color: "#475569", fontSize: 11 }}>Aucune release associée</div>
                    )}
                  </div>
                )}
              </div>
            );
          }) : (
            <div style={{ color: "#475569", fontSize: 12, padding: 20, textAlign: "center" }}>Aucun projet</div>
          )}
        </>
      )}

      {selectedBugs && <BugDetailDrawer bugs={selectedBugs} onClose={() => setSelectedBugs(null)} />}
    </>
  );
}
