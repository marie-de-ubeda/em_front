import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import KPI from "./KPI";
import type {
  QuarterlyData, Project, Incident, BoardSummary, ProjectCoverage, DeveloperProfile,
} from "../../lib/api";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };
const TYPE_COLORS: Record<string, string> = { feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8" };
const SEVERITY_COLORS: Record<string, string> = { high: "#f87171", medium: "#fb923c", low: "#34d399" };

interface Props {
  quarterly: QuarterlyData;
  projects: Project[];
  incidents: Incident[];
  summary: BoardSummary;
  projectCoverage: ProjectCoverage;
  profiles: DeveloperProfile[];
}

export default function TabCodir({ quarterly, projects, incidents, summary, projectCoverage, profiles }: Props) {
  const { quarters, perDeveloper } = quarterly;

  const totalReleases = summary.total_releases;
  const roadmapProjects = projects.filter((p) => p.is_roadmap && !p.is_archived);
  const totalProjects = projects.filter((p) => !p.is_archived).length;
  const nbDevs = profiles.length;

  const avgPerMonth = totalReleases > 0 ? Math.round(totalReleases / 14) : 0;

  // Global coverage
  const globalCoverage = useMemo(() => {
    const total = projectCoverage.perDeveloper.reduce((s, d) => s + d.total, 0);
    const assoc = projectCoverage.perDeveloper.reduce((s, d) => s + d.associated, 0);
    return total > 0 ? Math.round((assoc / total) * 100) : 0;
  }, [projectCoverage]);

  // Quarter comparison deltas
  const deltas = useMemo(() => {
    return quarters.map((q, i) => {
      if (i === 0) return { ...q, delta: null };
      const prev = quarters[i - 1].total;
      const pct = prev > 0 ? Math.round(((q.total - prev) / prev) * 100) : null;
      return { ...q, delta: pct };
    });
  }, [quarters]);

  // Roadmap projects table
  const roadmapTable = useMemo(() => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    return roadmapProjects.map((p) => {
      const lastRelease = p.releases.length > 0
        ? p.releases.reduce((latest, r) => {
            if (!r.release_date) return latest;
            if (!latest || r.release_date > latest) return r.release_date;
            return latest;
          }, null as string | null)
        : null;

      const isActive = lastRelease ? new Date(lastRelease) >= twoMonthsAgo : false;

      return {
        name: p.name,
        impact: p.impact || "-",
        releaseCount: p.releases.length,
        leads: p.leads.map((l) => l.display_name).join(", ") || "-",
        lastRelease,
        status: isActive ? "Actif" : "Inactif",
      };
    }).sort((a, b) => b.releaseCount - a.releaseCount);
  }, [roadmapProjects]);

  // Timeline incidents
  const incidentTimeline = useMemo(() => {
    return incidents
      .filter((i) => i.date)
      .map((i) => ({
        ...i,
        dateObj: new Date(i.date),
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [incidents]);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear().toString().slice(2)}`;
  };

  // Monthly roadmap vs non-roadmap vs orphan chart
  const monthlyAlignment = useMemo(() => {
    // Use projectCoverage monthly data as base for orphan count
    // We need to compute roadmap vs non-roadmap from projects + releases
    const monthMap = new Map<string, { roadmap: number; nonRoadmap: number; orphan: number }>();

    for (const m of projectCoverage.monthly) {
      monthMap.set(m.month, { roadmap: 0, nonRoadmap: 0, orphan: m.orphan });
    }

    // Count releases associated to roadmap vs non-roadmap projects
    for (const p of projects) {
      if (p.is_archived) continue;
      for (const rel of p.releases) {
        if (!rel.release_date) continue;
        const month = rel.release_date.substring(0, 7);
        const entry = monthMap.get(month);
        if (!entry) continue;
        if (p.is_roadmap) entry.roadmap++;
        else entry.nonRoadmap++;
      }
    }

    const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => {
        const [y, m] = month.split("-");
        const mi = parseInt(m) - 1;
        const label = y === "2026" ? `${months[mi]}26` : months[mi];
        return { label, ...data };
      });
  }, [projectCoverage, projects]);

  return (
    <>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <KPI label="Releases (14 mois)" value={totalReleases} color="#818cf8" sub={`~${avgPerMonth}/mois`} />
        <KPI label="Projets" value={totalProjects} color="#34d399" sub={`dont ${roadmapProjects.length} roadmap`} />
        <KPI label="Incidents" value={incidents.length} color="#f87171" />
        <KPI label="Contributeurs" value={nbDevs} color="#60a5fa" />
        <KPI label="Couverture projet" value={`${globalCoverage}%`} color={globalCoverage >= 70 ? "#34d399" : "#fb923c"} />
      </div>

      {/* Comparaison trimestrielle */}
      <Card>
        <SectionTitle>Comparaison trimestrielle</SectionTitle>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={quarters}>
            <XAxis dataKey="quarter" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="feat" name="Feature" fill={TYPE_COLORS.feat} stackId="a" />
            <Bar dataKey="fix" name="Fix" fill={TYPE_COLORS.fix} stackId="a" />
            <Bar dataKey="refacto" name="Refacto" fill={TYPE_COLORS.refacto} stackId="a" />
            <Bar dataKey="chore" name="Chore" fill={TYPE_COLORS.chore} stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
          {deltas.map((d) => (
            <div key={d.quarter} style={{ fontSize: 10, color: "#94a3b8", textAlign: "center" }}>
              <strong style={{ color: "#e2e8f0" }}>{d.quarter}</strong>: {d.total} releases
              {d.delta !== null && (
                <span style={{ color: d.delta >= 0 ? "#34d399" : "#f87171", marginLeft: 4 }}>
                  {d.delta >= 0 ? "+" : ""}{d.delta}%
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Alignement Roadmap */}
      <Card>
        <SectionTitle>Alignement strategique (Roadmap vs Hors-Roadmap vs Orphelin)</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyAlignment}>
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="roadmap" name="Roadmap" fill="#818cf8" stackId="a" />
            <Bar dataKey="nonRoadmap" name="Hors-roadmap" fill="#34d399" stackId="a" />
            <Bar dataKey="orphan" name="Orphelines" fill="#475569" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Avancement projets Roadmap */}
      <Card>
        <SectionTitle>Avancement projets Roadmap</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Projet</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Impact</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Releases</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Leads</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Derniere release</th>
                <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {roadmapTable.map((p) => (
                <tr key={p.name}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #1e293b", color: "#e2e8f0", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #1e293b", textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: p.impact === "high" ? "rgba(248,113,113,0.2)" : p.impact === "medium" ? "rgba(251,191,36,0.2)" : "rgba(148,163,184,0.2)",
                      color: p.impact === "high" ? "#f87171" : p.impact === "medium" ? "#fbbf24" : "#94a3b8",
                    }}>
                      {p.impact}
                    </span>
                  </td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #1e293b", textAlign: "center", fontWeight: 700, color: "#818cf8" }}>{p.releaseCount}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #1e293b", color: "#94a3b8" }}>{p.leads}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #1e293b", textAlign: "center", color: "#e2e8f0" }}>{formatDate(p.lastRelease)}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #1e293b", textAlign: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: p.status === "Actif" ? "rgba(52,211,153,0.2)" : "rgba(148,163,184,0.2)",
                      color: p.status === "Actif" ? "#34d399" : "#94a3b8",
                    }}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {roadmapTable.length === 0 && (
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: 20 }}>Aucun projet roadmap</p>
        )}
      </Card>

      {/* Timeline Incidents */}
      <Card>
        <SectionTitle>Timeline des incidents</SectionTitle>
        {incidentTimeline.length === 0 ? (
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: 20 }}>Aucun incident</p>
        ) : (
          <>
            {/* Visual timeline bar */}
            <div style={{ position: "relative", height: 60, marginBottom: 16, background: "#0f172a", borderRadius: 8, padding: "10px 16px" }}>
              {(() => {
                const minDate = incidentTimeline[0].dateObj.getTime();
                const maxDate = incidentTimeline[incidentTimeline.length - 1].dateObj.getTime();
                const range = maxDate - minDate || 1;

                return incidentTimeline.map((inc, i) => {
                  const pct = ((inc.dateObj.getTime() - minDate) / range) * 90 + 5;
                  return (
                    <div key={inc.id} title={`${formatDate(inc.date)} - ${inc.description}`}
                      style={{
                        position: "absolute", left: `${pct}%`, top: "50%", transform: "translate(-50%, -50%)",
                        width: 14, height: 14, borderRadius: "50%",
                        background: SEVERITY_COLORS[inc.severity] || "#94a3b8",
                        border: "2px solid #0f172a",
                        cursor: "pointer",
                      }} />
                  );
                });
              })()}
              {/* Axis labels */}
              <div style={{ position: "absolute", bottom: 2, left: 16, fontSize: 9, color: "#64748b" }}>
                {formatDate(incidentTimeline[0].date)}
              </div>
              <div style={{ position: "absolute", bottom: 2, right: 16, fontSize: 9, color: "#64748b" }}>
                {formatDate(incidentTimeline[incidentTimeline.length - 1].date)}
              </div>
            </div>

            {/* Incident list */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Date</th>
                    <th style={{ textAlign: "center", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Severite</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Description</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Dev</th>
                  </tr>
                </thead>
                <tbody>
                  {incidentTimeline.map((inc) => {
                    const dev = profiles.find((p) => p.developer_key === inc.developer_key);
                    return (
                      <tr key={inc.id}>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b", color: "#e2e8f0", whiteSpace: "nowrap" }}>{formatDate(inc.date)}</td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b", textAlign: "center" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600,
                            background: `${SEVERITY_COLORS[inc.severity] || "#94a3b8"}20`,
                            color: SEVERITY_COLORS[inc.severity] || "#94a3b8",
                          }}>
                            {inc.severity}
                          </span>
                        </td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b", color: "#e2e8f0" }}>{inc.description}</td>
                        <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b", color: dev?.color || "#94a3b8", fontWeight: 600 }}>
                          {dev?.display_name || inc.developer_key}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
              {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                <div key={sev} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                  <span style={{ color: "#94a3b8" }}>{sev}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
