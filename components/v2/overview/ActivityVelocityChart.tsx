import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import type { TeamMonthly, SprintMetrics, DeveloperProfile } from "../../../lib/api";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const ReferenceLine = dynamic(() => import("recharts").then((m) => m.ReferenceLine), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });

const TOOLTIP_STYLE = { contentStyle: { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 } };

const TYPE_COLORS = { feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8" };

type Mode = "sprint" | "dev" | "monthly";

interface Props {
  teamMonthly: TeamMonthly[];
  sprintMetrics: SprintMetrics[];
  profiles: DeveloperProfile[];
}

export default function ActivityVelocityChart({ teamMonthly, sprintMetrics, profiles }: Props) {
  const [mode, setMode] = useState<Mode>("sprint");

  const devColors = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) m.set(p.display_name, p.color);
    return m;
  }, [profiles]);

  // Data for "Par sprint" mode (stacked by release type)
  const sprintData = useMemo(() => {
    const sorted = [...sprintMetrics].sort((a, b) => a.sprint_number - b.sprint_number);
    const avg = sorted.length > 0
      ? Math.round(sorted.reduce((s, m) => s + m.total_releases, 0) / sorted.length)
      : 0;
    return {
      data: sorted.map((m) => ({
        name: `S${m.sprint_number}`,
        feat: m.feat, fix: m.fix, refacto: m.refacto, chore: m.chore,
      })),
      avg,
    };
  }, [sprintMetrics]);

  // Data for "Par dev" mode (stacked by developer per sprint)
  const devData = useMemo(() => {
    const sorted = [...sprintMetrics].sort((a, b) => a.sprint_number - b.sprint_number);
    const devNames = [...new Set(sorted.flatMap((m) => m.per_developer.map((d) => d.display_name)))].sort();
    return {
      data: sorted.map((m) => {
        const row: Record<string, string | number> = { name: `S${m.sprint_number}` };
        for (const d of m.per_developer) row[d.display_name] = d.total;
        return row;
      }),
      devNames,
    };
  }, [sprintMetrics]);

  // Data for "Mensuel" mode (stacked by developer per month)
  const monthlyData = useMemo(() => {
    const devNames = [...new Set(teamMonthly.flatMap((m) => Object.keys(m).filter((k) => k !== "month")))].sort();
    return {
      data: teamMonthly.map((m) => {
        const row: Record<string, string | number> = { name: m.month.slice(0, 7) };
        for (const k of devNames) row[k] = (m[k] as number) || 0;
        return row;
      }),
      devNames,
    };
  }, [teamMonthly]);

  const buttons: { mode: Mode; label: string }[] = [
    { mode: "sprint", label: "Par sprint" },
    { mode: "dev", label: "Par dev" },
    { mode: "monthly", label: "Mensuel" },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>Activité</h3>
        {buttons.map((b) => (
          <button key={b.mode} onClick={() => setMode(b.mode)} style={{
            padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
            fontSize: 10, fontWeight: 600,
            background: mode === b.mode ? "#6366f1" : "#1e293b",
            color: mode === b.mode ? "#fff" : "#94a3b8",
          }}>
            {b.label}
          </button>
        ))}
      </div>

      <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
        <ResponsiveContainer width="100%" height={260}>
          {mode === "sprint" ? (
            <BarChart data={sprintData.data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine y={sprintData.avg} stroke="#6366f1" strokeDasharray="4 4" label={{ value: `moy: ${sprintData.avg}`, fontSize: 9, fill: "#6366f1", position: "right" }} />
              <Bar dataKey="feat" name="Features" stackId="a" fill={TYPE_COLORS.feat} />
              <Bar dataKey="fix" name="Fixes" stackId="a" fill={TYPE_COLORS.fix} />
              <Bar dataKey="refacto" name="Refacto" stackId="a" fill={TYPE_COLORS.refacto} />
              <Bar dataKey="chore" name="Chore" stackId="a" fill={TYPE_COLORS.chore} />
            </BarChart>
          ) : mode === "dev" ? (
            <BarChart data={devData.data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {devData.devNames.map((name) => (
                <Bar key={name} dataKey={name} stackId="a" fill={devColors.get(name) || "#6366f1"} />
              ))}
            </BarChart>
          ) : (
            <BarChart data={monthlyData.data} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {monthlyData.devNames.map((name) => (
                <Bar key={name} dataKey={name} stackId="a" fill={devColors.get(name) || "#6366f1"} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
