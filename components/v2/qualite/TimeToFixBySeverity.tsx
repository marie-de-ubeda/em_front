import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { BugFixDetail } from "../../../lib/api";

const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });

const SEV_COLORS: Record<string, string> = {
  critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399",
};
const SEV_ORDER = ["critical", "high", "medium", "low"];

interface Props {
  bugFixes: BugFixDetail[];
}

export default function TimeToFixBySeverity({ bugFixes }: Props) {
  const data = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const sev of SEV_ORDER) groups.set(sev, []);

    for (const b of bugFixes) {
      if (b.severity && b.days_to_fix != null && groups.has(b.severity)) {
        groups.get(b.severity)!.push(b.days_to_fix);
      }
    }

    return SEV_ORDER.map((sev) => {
      const vals = groups.get(sev) || [];
      const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
      return { severity: sev, avg_days: avg, count: vals.length, color: SEV_COLORS[sev] };
    }).filter((d) => d.count > 0);
  }, [bugFixes]);

  if (data.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
        Temps de correction par sévérité
      </h3>
      <div style={{ background: "#1e293b", borderRadius: 8, padding: 12 }}>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <XAxis type="number" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${v}j`} />
            <YAxis dataKey="severity" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
              formatter={(value) => [`${value}j`, "Fix moyen"]}
            />
            <Bar dataKey="avg_days" radius={[0, 4, 4, 0]} barSize={20}>
              {data.map((d) => (
                <Cell key={d.severity} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
