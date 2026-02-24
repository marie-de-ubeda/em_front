import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import KPI from "./KPI";
import type { RepoMatrixEntry, ProjectCoverage } from "../../lib/api";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };

interface Props {
  repoMatrix: RepoMatrixEntry[];
  projectCoverage: ProjectCoverage;
}

export default function TabRepos({ repoMatrix, projectCoverage }: Props) {
  const { perDeveloper, monthly, topOrphanRepos } = projectCoverage;

  // Aggregate data
  const repos = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    const devs = new Map<string, { display_name: string; color: string }>();
    for (const e of repoMatrix) {
      if (!map.has(e.repo_name)) map.set(e.repo_name, new Map());
      map.get(e.repo_name)!.set(e.developer_key, e.release_count);
      devs.set(e.developer_key, { display_name: e.display_name, color: e.color });
    }
    return { map, devs };
  }, [repoMatrix]);

  const devList = useMemo(() => Array.from(repos.devs.entries()).map(([k, v]) => ({ key: k, ...v })), [repos]);

  // Build matrix rows — only repos with >= 3 releases
  const matrixRows = useMemo(() => {
    const rows: { repo: string; total: number; devCounts: Map<string, number>; busFactor: number }[] = [];
    for (const [repo, devMap] of repos.map) {
      const total = Array.from(devMap.values()).reduce((s, v) => s + v, 0);
      if (total < 3) continue;
      // Bus factor: minimum devs to cover 50%
      const sorted = Array.from(devMap.values()).sort((a, b) => b - a);
      let cumul = 0;
      let bf = 0;
      for (const v of sorted) {
        cumul += v;
        bf++;
        if (cumul >= total * 0.5) break;
      }
      rows.push({ repo, total, devCounts: devMap, busFactor: bf });
    }
    rows.sort((a, b) => b.total - a.total);
    return rows;
  }, [repos]);

  const maxReleases = Math.max(...matrixRows.map((r) => r.total), 1);
  const totalRepos = new Set(repoMatrix.map((e) => e.repo_name)).size;
  const busFactor1Repos = matrixRows.filter((r) => r.busFactor === 1).length;

  const globalCoverage = useMemo(() => {
    const total = perDeveloper.reduce((s, d) => s + d.total, 0);
    const assoc = perDeveloper.reduce((s, d) => s + d.associated, 0);
    return total > 0 ? Math.round((assoc / total) * 100) : 0;
  }, [perDeveloper]);

  // Monthly chart data
  const monthLabel = (month: string) => {
    const [y, m] = month.split("-");
    const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"];
    const mi = parseInt(m) - 1;
    return y === "2026" ? `${months[mi]}26` : months[mi];
  };

  const monthlyChart = monthly.map((m) => ({
    ...m,
    label: monthLabel(m.month),
  }));

  // Donut data
  const donutData = useMemo(() => {
    const total = perDeveloper.reduce((s, d) => s + d.total, 0);
    const assoc = perDeveloper.reduce((s, d) => s + d.associated, 0);
    return [
      { name: "Associees", value: assoc, color: "#34d399" },
      { name: "Orphelines", value: total - assoc, color: "#fb923c" },
    ];
  }, [perDeveloper]);

  return (
    <>
      {/* KPIs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <KPI label="Repos actifs" value={totalRepos} color="#818cf8" />
        <KPI label="Couverture projet" value={`${globalCoverage}%`} color={globalCoverage >= 70 ? "#34d399" : "#fb923c"} sub={`${100 - globalCoverage}% orphelines`} />
        <KPI label="Bus factor = 1" value={busFactor1Repos} color="#f87171" sub="repos a risque" />
        <KPI label="Repo dominant" value={matrixRows[0]?.repo || "-"} color="#60a5fa" sub={`${matrixRows[0]?.total || 0} releases`} />
      </div>

      {/* Matrice Dev x Repo */}
      <Card>
        <SectionTitle>Matrice Dev x Repo (heatmap)</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155", position: "sticky", left: 0, background: "#1e293b", zIndex: 1 }}>Repo</th>
                {devList.map((d) => (
                  <th key={d.key} style={{ padding: "6px 4px", color: d.color, borderBottom: "1px solid #334155", fontSize: 10, minWidth: 60, textAlign: "center" }}>{d.display_name}</th>
                ))}
                <th style={{ padding: "6px 4px", color: "#94a3b8", borderBottom: "1px solid #334155", textAlign: "center" }}>Total</th>
                <th style={{ padding: "6px 4px", color: "#94a3b8", borderBottom: "1px solid #334155", textAlign: "center" }}>BF</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((row) => (
                <tr key={row.repo} style={{ background: row.busFactor === 1 ? "rgba(248,113,113,0.08)" : undefined }}>
                  <td style={{ padding: "4px 8px", color: "#e2e8f0", borderBottom: "1px solid #1e293b", fontWeight: 600, whiteSpace: "nowrap", position: "sticky", left: 0, background: row.busFactor === 1 ? "#1a1520" : "#1e293b", zIndex: 1 }}>{row.repo}</td>
                  {devList.map((d) => {
                    const count = row.devCounts.get(d.key) || 0;
                    const opacity = count > 0 ? 0.15 + (count / maxReleases) * 0.85 : 0;
                    return (
                      <td key={d.key} style={{
                        padding: "4px", textAlign: "center", borderBottom: "1px solid #1e293b",
                        background: count > 0 ? `rgba(${hexToRgb(d.color)}, ${opacity})` : undefined,
                        color: count > 0 ? "#f1faee" : "#334155", fontWeight: count > 0 ? 700 : 400,
                      }}>
                        {count || ""}
                      </td>
                    );
                  })}
                  <td style={{ padding: "4px", textAlign: "center", borderBottom: "1px solid #1e293b", fontWeight: 700, color: "#e2e8f0" }}>{row.total}</td>
                  <td style={{ padding: "4px", textAlign: "center", borderBottom: "1px solid #1e293b", fontWeight: 700, color: row.busFactor === 1 ? "#f87171" : "#34d399" }}>{row.busFactor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Couverture projet */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Card style={{ flex: "1 1 260px" }}>
          <SectionTitle>Couverture projet (global)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#475569" }} style={{ fontSize: 10 }}>
                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ flex: "2 1 400px" }}>
          <SectionTitle>Couverture mensuelle</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyChart}>
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="associated" name="Associees" fill="#34d399" stackId="a" />
              <Bar dataKey="orphan" name="Orphelines" fill="#fb923c" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Couverture par dev */}
      <Card>
        <SectionTitle>Couverture par developpeur</SectionTitle>
        <ResponsiveContainer width="100%" height={Math.max(180, perDeveloper.length * 40)}>
          <BarChart data={perDeveloper} layout="vertical">
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} domain={[0, 100]} unit="%" />
            <YAxis type="category" dataKey="display_name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={90} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
            <Bar dataKey="coverage_pct" name="Couverture" fill="#818cf8" radius={[0, 4, 4, 0]}>
              {perDeveloper.map((d, i) => (
                <Cell key={i} fill={d.color || "#818cf8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Top repos orphelins */}
      {topOrphanRepos.length > 0 && (
        <Card>
          <SectionTitle>Top repos sans couverture projet</SectionTitle>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topOrphanRepos.map((r) => (
              <div key={r.repo_name} style={{
                background: "#0f172a", borderRadius: 8, padding: "6px 12px",
                borderLeft: "3px solid #fb923c", flex: "1 1 150px",
              }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fb923c" }}>{r.orphan_count}</div>
                <div style={{ fontSize: 11, color: "#e2e8f0" }}>{r.repo_name}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}
