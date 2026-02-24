import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  AreaChart, Area,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import KPI from "./KPI";
import type { ReleaseCadence, BugFixDetail, DeveloperProfile } from "../../lib/api";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };
const SEV_COLORS: Record<string, string> = { critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399" };
const SEV_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

interface Props {
  releaseCadence: ReleaseCadence;
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
}

export default function TabCadence({ releaseCadence, bugFixes, profiles }: Props) {
  const [selectedDev, setSelectedDev] = useState<string | null>(null);
  const { dayOfWeek, weekly, avgPerWeek } = releaseCadence;

  // Bug-fix stats
  const autoFixes = bugFixes.filter((b) => b.fixer_key === b.author_key).length;
  const crossFixes = bugFixes.length - autoFixes;
  const criticalBugs = bugFixes.filter((b) => b.severity === "critical").length;
  const totalMV = bugFixes.reduce((s, b) => s + (b.impact_users || 0), 0);
  const avgDaysToFix = useMemo(() => {
    const valid = bugFixes.filter((b) => b.days_to_fix != null);
    if (valid.length === 0) return null;
    return Math.round(valid.reduce((s, b) => s + b.days_to_fix!, 0) / valid.length * 10) / 10;
  }, [bugFixes]);

  // Bug-fix matrix (6x6) — weighted by severity
  const devKeys = profiles.map((p) => p.developer_key);
  const matrix = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    for (const dk of devKeys) {
      m[dk] = {};
      for (const dk2 of devKeys) m[dk][dk2] = 0;
    }
    for (const b of bugFixes) {
      if (m[b.author_key] && m[b.author_key][b.fixer_key] !== undefined) {
        const w = SEV_WEIGHT[b.severity ?? ""] || 1;
        m[b.author_key][b.fixer_key] += w;
      }
    }
    return m;
  }, [bugFixes, devKeys]);

  // Filtered bug fixes
  const filteredBugFixes = useMemo(() => {
    if (!selectedDev) return bugFixes;
    return bugFixes.filter((b) => b.author_key === selectedDev || b.fixer_key === selectedDev);
  }, [bugFixes, selectedDev]);

  // Weekly chart labels
  const weeklyChart = weekly.map((w) => {
    const d = new Date(w.week_start);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    return { ...w, label };
  });

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}/${(dt.getMonth() + 1).toString().padStart(2, "0")}/${dt.getFullYear().toString().slice(2)}`;
  };

  // Per-developer bug summary
  const devBugSummary = useMemo(() => {
    return profiles
      .map((p) => {
        const devBugs = bugFixes.filter((b) => b.author_key === p.developer_key);
        const critical = devBugs.filter((b) => b.severity === "critical").length;
        const high = devBugs.filter((b) => b.severity === "high").length;
        const mv = devBugs.reduce((s, b) => s + (b.impact_users || 0), 0);
        const avgFix = (() => {
          const valid = devBugs.filter((b) => b.days_to_fix != null);
          return valid.length > 0 ? Math.round(valid.reduce((s, b) => s + b.days_to_fix!, 0) / valid.length * 10) / 10 : null;
        })();
        return { ...p, bugCount: devBugs.length, critical, high, mv, avgFix };
      })
      .filter((d) => d.bugCount > 0)
      .sort((a, b) => b.bugCount - a.bugCount);
  }, [bugFixes, profiles]);

  return (
    <>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <KPI label="Releases/semaine" value={avgPerWeek.toFixed(1)} color="#818cf8" sub="moyenne" />
        <KPI label="Bug fixes traces" value={bugFixes.length} color="#fbbf24" />
        <KPI label="Auto-fix" value={`${autoFixes}`} color="#34d399" sub={`${bugFixes.length > 0 ? Math.round((autoFixes / bugFixes.length) * 100) : 0}%`} />
        <KPI label="Cross-fix" value={`${crossFixes}`} color="#fb923c" sub="fixes par un autre dev" />
        {avgDaysToFix !== null && <KPI label="Delai moyen fix" value={`${avgDaysToFix}j`} color="#60a5fa" />}
        {criticalBugs > 0 && <KPI label="Bugs critiques" value={criticalBugs} color="#e63946" />}
        {totalMV > 0 && <KPI label="MV impactees" value={totalMV} color="#f87171" sub="total" />}
      </div>

      {/* Releases par jour de la semaine */}
      <Card>
        <SectionTitle>Releases par jour de la semaine</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dayOfWeek}>
            <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Releases" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Densité hebdomadaire */}
      <Card>
        <SectionTitle>Densite hebdomadaire</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeklyChart}>
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 8 }} interval={3} angle={-30} textAnchor="end" height={40} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="count" name="Releases" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Per-developer bug summary */}
      {devBugSummary.length > 0 && (
        <Card>
          <SectionTitle>Bugs par developpeur</SectionTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {devBugSummary.map((d) => (
              <div key={d.developer_key} style={{
                background: "#0f172a", borderRadius: 8, padding: "8px 14px",
                borderLeft: `3px solid ${d.color}`, flex: "1 1 140px",
                cursor: "pointer", opacity: selectedDev && selectedDev !== d.developer_key ? 0.5 : 1,
              }} onClick={() => setSelectedDev(selectedDev === d.developer_key ? null : d.developer_key)}>
                <div style={{ color: d.color, fontWeight: 700, fontSize: 13 }}>{d.display_name}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>{d.bugCount} <span style={{ fontSize: 10, color: "#64748b" }}>bugs</span></div>
                <div style={{ fontSize: 10, color: "#94a3b8", display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                  {d.critical > 0 && <span style={{ color: SEV_COLORS.critical }}>{d.critical} crit</span>}
                  {d.high > 0 && <span style={{ color: SEV_COLORS.high }}>{d.high} high</span>}
                  {d.mv > 0 && <span>{d.mv} MV</span>}
                  {d.avgFix !== null && <span>{d.avgFix}j moy.</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Matrice Bug-Fix */}
      <Card>
        <SectionTitle>Matrice Bug-Fix (qui fixe les bugs de qui)</SectionTitle>
        <p style={{ fontSize: 10, color: "#64748b", marginTop: 0 }}>Lignes = auteur du bug, Colonnes = fixeur. Pondere par severite (critical=4, high=3, medium=2, low=1).</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Auteur bug</th>
                {profiles.map((p) => (
                  <th key={p.developer_key} style={{ padding: "6px 4px", color: p.color, borderBottom: "1px solid #334155", fontSize: 10, textAlign: "center" }}>
                    {p.display_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((author) => {
                const row = matrix[author.developer_key];
                if (!row) return null;
                const hasAny = Object.values(row).some((v) => v > 0);
                if (!hasAny) return null;
                return (
                  <tr key={author.developer_key}>
                    <td style={{ padding: "4px 8px", color: author.color, borderBottom: "1px solid #1e293b", fontWeight: 600 }}>{author.display_name}</td>
                    {profiles.map((fixer) => {
                      const count = row[fixer.developer_key] || 0;
                      const isDiag = author.developer_key === fixer.developer_key;
                      return (
                        <td key={fixer.developer_key} style={{
                          padding: "4px", textAlign: "center", borderBottom: "1px solid #1e293b",
                          background: count > 0 ? (isDiag ? "rgba(96,165,250,0.15)" : "rgba(251,147,36,0.15)") : undefined,
                          color: count > 0 ? (isDiag ? "#60a5fa" : "#fb923c") : "#334155",
                          fontWeight: count > 0 ? 700 : 400,
                        }}>
                          {count || ""}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Liste détaillée des Bug-Fixes */}
      <Card>
        <SectionTitle>Detail des Bug-Fixes</SectionTitle>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          <button onClick={() => setSelectedDev(null)}
            style={{
              padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
              background: selectedDev === null ? "#6366f1" : "#1e293b", color: selectedDev === null ? "#fff" : "#94a3b8",
            }}>
            Tous
          </button>
          {profiles.map((p) => (
            <button key={p.developer_key} onClick={() => setSelectedDev(p.developer_key)}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 600,
                background: selectedDev === p.developer_key ? p.color : "#1e293b",
                color: selectedDev === p.developer_key ? "#fff" : p.color,
              }}>
              {p.display_name}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ position: "sticky", top: 0, background: "#1e293b", zIndex: 1 }}>
                <th style={{ textAlign: "center", padding: "6px 4px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Sev.</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Bug</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Auteur</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Fix</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Fixeur</th>
                <th style={{ textAlign: "center", padding: "6px 4px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>MV</th>
                <th style={{ textAlign: "center", padding: "6px 4px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Delai</th>
              </tr>
            </thead>
            <tbody>
              {filteredBugFixes.map((b) => (
                <tr key={b.id}>
                  <td style={{ padding: "4px", borderBottom: "1px solid #1e293b", textAlign: "center" }}>
                    {b.severity && (
                      <span style={{
                        color: SEV_COLORS[b.severity] || "#94a3b8", fontWeight: 700, fontSize: 9,
                        background: `${SEV_COLORS[b.severity] || "#94a3b8"}20`,
                        padding: "1px 5px", borderRadius: 4,
                      }}>{b.severity}</span>
                    )}
                  </td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b", color: "#e2e8f0" }}>
                    <span style={{ fontWeight: 600 }}>{b.bugged_version}</span>
                    <br /><span style={{ fontSize: 9, color: "#64748b" }}>{b.bugged_repo} · {formatDate(b.bugged_date)}</span>
                    {b.bugged_changes && <br />}
                    {b.bugged_changes && <span style={{ fontSize: 9, color: "#94a3b8", fontStyle: "italic" }}>{b.bugged_changes.length > 80 ? b.bugged_changes.slice(0, 80) + "..." : b.bugged_changes}</span>}
                  </td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ color: b.author_color, fontWeight: 600 }}>{b.author_name}</span>
                  </td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b", color: "#e2e8f0" }}>
                    <span style={{ fontWeight: 600 }}>{b.fix_version}</span>
                    <br /><span style={{ fontSize: 9, color: "#64748b" }}>{b.fix_repo} · {formatDate(b.fix_date)}</span>
                    {b.fix_changes && <br />}
                    {b.fix_changes && <span style={{ fontSize: 9, color: "#94a3b8", fontStyle: "italic" }}>{b.fix_changes.length > 80 ? b.fix_changes.slice(0, 80) + "..." : b.fix_changes}</span>}
                  </td>
                  <td style={{ padding: "4px 8px", borderBottom: "1px solid #1e293b" }}>
                    <span style={{ color: b.fixer_color, fontWeight: 600 }}>{b.fixer_name}</span>
                  </td>
                  <td style={{ padding: "4px 4px", borderBottom: "1px solid #1e293b", textAlign: "center", color: "#e2e8f0", fontWeight: 600 }}>
                    {b.impact_users ?? ""}
                  </td>
                  <td style={{ padding: "4px 4px", borderBottom: "1px solid #1e293b", textAlign: "center", color: "#e2e8f0", fontWeight: 600 }}>
                    {b.days_to_fix != null ? `${Math.round(b.days_to_fix)}j` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBugFixes.length === 0 && (
          <p style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: 20 }}>Aucun bug-fix pour ce filtre</p>
        )}
      </Card>
    </>
  );
}
