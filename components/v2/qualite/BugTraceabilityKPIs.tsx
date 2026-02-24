import { useMemo } from "react";
import type { BugFixDetail, DeveloperProfile } from "../../../lib/api";

interface Props {
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
}

export default function BugTraceabilityKPIs({ bugFixes, profiles }: Props) {
  const stats = useMemo(() => {
    const total = bugFixes.length;
    const critical = bugFixes.filter((b) => b.severity === "critical").length;
    const high = bugFixes.filter((b) => b.severity === "high").length;
    const mvTotal = bugFixes.reduce((s, b) => s + (b.impact_users || 0), 0);

    const fixTimes = bugFixes.filter((b) => b.days_to_fix != null).map((b) => b.days_to_fix!);
    const avgFix = fixTimes.length > 0 ? Math.round((fixTimes.reduce((a, b) => a + b, 0) / fixTimes.length) * 10) / 10 : 0;

    // Auto-fix: author === fixer
    const autoFix = bugFixes.filter((b) => b.author_key === b.fixer_key).length;
    const autoFixPct = total > 0 ? Math.round((autoFix / total) * 100) : 0;

    // Rollbacks
    const rollbacks = profiles.reduce((s, p) => s + p.quality_stats.rollbacks, 0);

    return { total, critical, high, mvTotal, avgFix, autoFixPct, rollbacks };
  }, [bugFixes, profiles]);

  const kpis = [
    { label: "Bugs tracés", value: stats.total, color: stats.total > 0 ? "#f87171" : "#334155" },
    { label: "Critical", value: stats.critical, color: stats.critical > 0 ? "#e63946" : "#334155" },
    { label: "High", value: stats.high, color: stats.high > 0 ? "#f87171" : "#334155" },
    { label: "MV impactées", value: stats.mvTotal, color: stats.mvTotal > 0 ? "#fbbf24" : "#334155" },
    { label: "Fix moyen", value: stats.avgFix > 0 ? `${stats.avgFix}j` : "—", color: "#94a3b8" },
    { label: "Auto-fix", value: `${stats.autoFixPct}%`, color: "#818cf8" },
    { label: "Rollbacks", value: stats.rollbacks, color: stats.rollbacks > 0 ? "#f87171" : "#334155" },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            background: "#1e293b", borderRadius: 8, padding: "8px 14px",
            borderLeft: `3px solid ${k.color}`, flex: "1 1 100px", minWidth: 90,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
