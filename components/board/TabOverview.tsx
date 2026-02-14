import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import KPI from "./KPI";
import type { TeamMonthly, DeveloperProfile, JiraBreakdown } from "../../lib/api";

const COLORS = ["#818cf8", "#fbbf24", "#34d399", "#f87171", "#60a5fa", "#f472b6"];
const TYPE_COLORS: Record<string, string> = { feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8" };
const TYPE_LABELS: Record<string, string> = { feat: "Feature", fix: "Fix", refacto: "Refacto/Revert", chore: "Chore/QAA" };
const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };

interface Props {
  teamMonthly: TeamMonthly[];
  profiles: DeveloperProfile[];
  jiraBreakdown: JiraBreakdown[];
  totalReleases: number;
  totalIncidents: number;
  totalBB: number;
}

const JIRA_COLORS: Record<string, string> = {
  B2B: "#818cf8", SUPPORT: "#f87171", QAA: "#34d399", INFRA: "#fb923c",
  SOCLE: "#94a3b8", RUN: "#fbbf24", PVA: "#f472b6", B2C: "#60a5fa",
};

export default function TabOverview({ teamMonthly, profiles, jiraBreakdown, totalReleases, totalIncidents, totalBB }: Props) {
  const devKeys = profiles.map((p) => p.display_name);

  const totals = useMemo(() => {
    return profiles.map((p, i) => {
      const total = teamMonthly.reduce((s, m) => s + (Number(m[p.display_name]) || 0), 0);
      return { name: p.display_name, total, color: p.color || COLORS[i] };
    }).sort((a, b) => b.total - a.total);
  }, [teamMonthly, profiles]);

  const cumulative = useMemo(() => {
    const acc: Record<string, number> = {};
    devKeys.forEach((k) => (acc[k] = 0));
    return teamMonthly.map((m) => {
      const o: Record<string, string | number> = { month: m.month };
      devKeys.forEach((k) => {
        acc[k] += Number(m[k]) || 0;
        o[k] = acc[k];
      });
      return o;
    });
  }, [teamMonthly, devKeys]);

  const typeBarData = profiles.map((p) => ({
    name: p.display_name,
    ...p.type_breakdown,
  }));

  const maxType = Math.max(...profiles.map((p) => p.type_breakdown.total));

  const monthLabel = (month: string) => {
    const [y, m] = month.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const mi = parseInt(m) - 1;
    return y === "2026" ? `${months[mi]}26` : months[mi];
  };

  const chartMonthly = teamMonthly.map((m) => ({ ...m, m: monthLabel(m.month) }));
  const chartCumulative = cumulative.map((m) => ({ ...m, m: monthLabel(m.month as string) }));

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {totals.map((t, i) => (
          <KPI key={i} label={t.name} value={t.total} color={t.color} sub="releases" />
        ))}
        <KPI label="Total équipe" value={`~${totalReleases}`} color="#f8fafc" sub={`~${Math.round(totalReleases / 14)}/mois · 14 mois`} />
        <KPI label="Rollbacks" value={totalIncidents} color="#f87171" sub="1.5%" />
        <KPI label="Base Branches" value={totalBB} color="#fb923c" sub="features majeures" />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <Card style={{ flex: "2 1 500px" }}>
          <SectionTitle icon="📊">Releases par personne et par mois</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartMonthly}>
              <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
              <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {profiles.map((p, i) => (
                <Bar key={p.display_name} dataKey={p.display_name} name={p.display_name} fill={p.color || COLORS[i]} stackId="a" />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ flex: "1 1 260px" }}>
          <SectionTitle icon="🥧">Répartition annuelle</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={totals} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={35}
                label={({ name, value }) => `${name}: ${value}`} labelLine={{ stroke: "#475569" }} style={{ fontSize: 10 }}>
                {totals.map((t, i) => <Cell key={i} fill={t.color} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionTitle icon="🔬">Ventilation Feat / Fix / Refacto / Chore par personne</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={typeBarData} layout="vertical">
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} width={80} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="feat" name="Feature" fill={TYPE_COLORS.feat} stackId="a" />
            <Bar dataKey="fix" name="Fix" fill={TYPE_COLORS.fix} stackId="a" />
            <Bar dataKey="refacto" name="Refacto" fill={TYPE_COLORS.refacto} stackId="a" />
            <Bar dataKey="chore" name="Chore/QAA" fill={TYPE_COLORS.chore} stackId="a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {Object.entries(TYPE_LABELS).map(([k, label]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: TYPE_COLORS[k] }} />
              <span style={{ color: "#94a3b8" }}>
                {label}: <strong style={{ color: "#e2e8f0" }}>{profiles.reduce((s, p) => s + (p.type_breakdown as any)[k], 0)}</strong>
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon="📈">Vélocité cumulative</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartCumulative}>
            <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {profiles.map((p, i) => (
              <Area key={p.display_name} type="monotone" dataKey={p.display_name} name={p.display_name}
                stroke={p.color || COLORS[i]} fill={p.color || COLORS[i]} fillOpacity={0.08} strokeWidth={2} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle icon="🎫">Répartition tickets JIRA</SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {jiraBreakdown.map((j, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: "8px 14px", borderLeft: `3px solid ${JIRA_COLORS[j.category] || "#94a3b8"}`, flex: "1 1 110px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: JIRA_COLORS[j.category] || "#94a3b8" }}>{j.count}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{j.category}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
