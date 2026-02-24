import { useMemo } from "react";
import type { BoardSummary, DeveloperProfile, ProjectCoverage, BugFixDetail, SprintMetrics, ProjectQuality } from "../../../lib/api";

interface Props {
  summary: BoardSummary;
  profiles: DeveloperProfile[];
  coverage: ProjectCoverage;
  bugFixes: BugFixDetail[];
  sprintMetrics: SprintMetrics[];
  projectQuality: ProjectQuality[];
}

/** Mini SVG sparkline from an array of numbers */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 44;
  const h = 16;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block", marginTop: 4 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OverviewKPIBar({ summary, profiles, coverage, bugFixes, sprintMetrics, projectQuality }: Props) {
  const stats = useMemo(() => {
    const totalReleases = summary.total_releases;

    // Bug rate
    const totalBugs = profiles.reduce((s, p) => s + p.quality_stats.bugs_introduced, 0);
    const bugRate = totalReleases > 0 ? Math.round((totalBugs / totalReleases) * 100) : 0;

    // Avg fix time
    const fixTimes = bugFixes.filter((b) => b.days_to_fix != null).map((b) => b.days_to_fix!);
    const avgFixTime = fixTimes.length > 0 ? Math.round((fixTimes.reduce((a, b) => a + b, 0) / fixTimes.length) * 10) / 10 : 0;

    // Deploy freq (releases per week)
    const dates = bugFixes.length > 0 || totalReleases > 0
      ? (() => {
          // Use sprint metrics to estimate period length
          if (sprintMetrics.length > 0) {
            const sorted = [...sprintMetrics].sort((a, b) => a.sprint_number - b.sprint_number);
            const first = new Date(sorted[0].start_date);
            const last = new Date(sorted[sorted.length - 1].end_date);
            const weeks = Math.max(1, (last.getTime() - first.getTime()) / (7 * 24 * 60 * 60 * 1000));
            return Math.round((totalReleases / weeks) * 10) / 10;
          }
          return 0;
        })()
      : 0;

    // Active projects
    const activeProjects = projectQuality.filter((p) => {
      if (!p.last_release_date) return false;
      const diff = (Date.now() - new Date(p.last_release_date).getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 60;
    }).length;

    // Roadmap coverage
    const coveragePct = coverage.perDeveloper.length > 0
      ? Math.round(coverage.perDeveloper.reduce((s, d) => s + d.coverage_pct, 0) / coverage.perDeveloper.length)
      : 0;

    // Bus factor alert
    const busFactorRisk = projectQuality.filter((p) => p.contributors.length === 1 && p.total_releases > 0).length;

    // Sparkline data (last 5 sprints)
    const last5 = [...sprintMetrics].sort((a, b) => a.sprint_number - b.sprint_number).slice(-5);
    const sparkReleases = last5.map((m) => m.total_releases);
    const sparkBugRate = last5.map((m) => m.bug_rate);

    return {
      totalReleases, bugRate, avgFixTime, deployFreq: dates,
      incidents: summary.total_incidents, activeProjects, coveragePct, busFactorRisk,
      sparkReleases, sparkBugRate,
    };
  }, [summary, profiles, coverage, bugFixes, sprintMetrics, projectQuality]);

  const kpis = [
    { label: "Releases", value: stats.totalReleases, color: "#6366f1", spark: stats.sparkReleases },
    { label: "Fréq. deploy", value: `${stats.deployFreq}/sem`, color: "#38bdf8", spark: stats.sparkReleases },
    { label: "Bug rate", value: `${stats.bugRate}%`, color: stats.bugRate > 15 ? "#f87171" : stats.bugRate > 5 ? "#fbbf24" : "#34d399", spark: stats.sparkBugRate },
    { label: "Fix moyen", value: stats.avgFixTime > 0 ? `${stats.avgFixTime}j` : "—", color: "#94a3b8" },
    { label: "Incidents", value: stats.incidents, color: stats.incidents > 0 ? "#f87171" : "#334155" },
    { label: "Projets actifs", value: stats.activeProjects, color: "#34d399" },
    { label: "Couv. roadmap", value: `${stats.coveragePct}%`, color: stats.coveragePct > 70 ? "#34d399" : "#fbbf24" },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {kpis.map((k) => (
          <div key={k.label} style={{
            background: "#1e293b", borderRadius: 8, padding: "8px 14px",
            borderLeft: `3px solid ${k.color}`, flex: "1 1 110px", minWidth: 100,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: k.color }}>{k.value}</span>
              {k.spark && <Sparkline data={k.spark} color={k.color} />}
            </div>
            <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
        {/* Bus factor alert */}
        {stats.busFactorRisk > 0 && (
          <div style={{
            background: "#f8717122", borderRadius: 8, padding: "8px 14px",
            borderLeft: "3px solid #f87171", flex: "1 1 110px", minWidth: 100,
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#f87171" }}>{stats.busFactorRisk}</div>
            <div style={{ fontSize: 9, color: "#f87171" }}>Projets à risque (bus factor 1)</div>
          </div>
        )}
      </div>
    </div>
  );
}
