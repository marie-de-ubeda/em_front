import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import KPI from "./KPI";
import type { TeamMonthly, Achievement, JiraBreakdown } from "../../lib/api";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" };
const JIRA_COLORS: Record<string, string> = {
  B2B: "#818cf8", SUPPORT: "#f87171", QAA: "#34d399", INFRA: "#fb923c",
  SOCLE: "#94a3b8", RUN: "#fbbf24", PVA: "#f472b6", B2C: "#60a5fa",
};

interface Props {
  teamMonthly: TeamMonthly[];
  achievements: Achievement[];
  jiraBreakdown: JiraBreakdown[];
  totalReleases: number;
  totalDevelopers: number;
  totalIncidents: number;
}

export default function TabBilan({ teamMonthly, achievements, jiraBreakdown, totalReleases, totalDevelopers, totalIncidents }: Props) {
  const [showAch, setShowAch] = useState(false);

  const monthLabel = (month: string) => {
    const [y, m] = month.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const mi = parseInt(m) - 1;
    return y === "2026" ? `${months[mi]}26` : months[mi];
  };

  // Compute total releases per month (sum all developers)
  const velocityData = teamMonthly.map((m) => {
    const total = Object.entries(m).reduce((s, [k, v]) => k === "month" ? s : s + (Number(v) || 0), 0);
    return { m: monthLabel(m.month), total };
  });

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <KPI label="Releases équipe" value={`~${totalReleases}`} color="#818cf8" sub="14 mois" />
        <KPI label="Moyenne/mois" value={`~${Math.round(totalReleases / 14)}`} color="#34d399" />
        <KPI label="Contributeurs" value={totalDevelopers} color="#fbbf24" />
        <KPI label="Chantiers majeurs" value="12+" color="#f472b6" />
        <KPI label="Rollbacks" value={totalIncidents} color="#f87171" sub="1.5%" />
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowAch(!showAch)}>
          <SectionTitle icon="🏗️">Grands chantiers livrés par l'équipe {showAch ? "▲" : "▼"}</SectionTitle>
        </div>
        {showAch && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {achievements.map((a, i) => (
              <div key={i} style={{ flex: "1 1 220px", background: "#0f172a", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#f472b6", marginBottom: 6 }}>{a.category}</div>
                {a.items.map((item, j) => (
                  <div key={j} style={{
                    fontSize: 11,
                    color: item.includes("Marie") ? "#f472b6" : item.startsWith("⏳") ? "#fbbf24" : "#cbd5e1",
                    padding: "2px 0",
                    fontWeight: item.includes("Marie") ? 600 : 400,
                  }}>
                    {item.includes("Marie") ? "★ " : item.startsWith("⏳") ? "" : "• "}{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="📈">Vélocité équipe</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={velocityData}>
            <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="total" name="Releases" stroke="#818cf8" fill="#818cf8" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle icon="🎫">Répartition tickets JIRA par type</SectionTitle>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {jiraBreakdown.map((j, i) => (
            <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: "8px 14px", borderLeft: `3px solid ${JIRA_COLORS[j.category] || "#94a3b8"}`, flex: "1 1 120px" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: JIRA_COLORS[j.category] || "#94a3b8" }}>{j.count}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{j.category}</div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
