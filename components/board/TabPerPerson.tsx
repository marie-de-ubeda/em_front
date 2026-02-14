import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import Chip from "./Chip";
import MiniBar from "./MiniBar";
import type { TeamMonthly, DeveloperProfile, Incident, BaseBranch } from "../../lib/api";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 };
const SEV_COLORS: Record<string, string> = { high: "#f87171", medium: "#fbbf24", low: "#34d399" };

interface Props {
  teamMonthly: TeamMonthly[];
  profiles: DeveloperProfile[];
  incidents: Incident[];
  baseBranches: BaseBranch[];
}

export default function TabPerPerson({ teamMonthly, profiles, incidents, baseBranches }: Props) {
  const [sel, setSel] = useState<string | null>(null);

  const totals = useMemo(() => {
    return profiles.map((p) => {
      const total = teamMonthly.reduce((s, m) => s + (Number(m[p.display_name]) || 0), 0);
      return { name: p.display_name, key: p.developer_key, total, color: p.color };
    });
  }, [teamMonthly, profiles]);

  const maxType = Math.max(...profiles.map((p) => p.type_breakdown.total));

  const radarData = profiles.map((p) => {
    const t = totals.find((x) => x.key === p.developer_key)!;
    const maxTotal = Math.max(...totals.map((x) => x.total));
    return {
      name: p.display_name,
      color: p.color,
      key: p.developer_key,
      axes: [
        { a: "Volume", v: Math.min(100, Math.round((t.total / maxTotal) * 100)) },
        { a: "Régularité", v: Math.round((teamMonthly.filter((m) => (Number(m[p.display_name]) || 0) > 0).length / 14) * 100) },
        { a: "Polyvalence", v: Math.min(100, Math.round((p.repos.length / 15) * 100)) },
        { a: "Pics", v: Math.min(100, Math.round((Math.max(...teamMonthly.map((m) => Number(m[p.display_name]) || 0)) / 19) * 100)) },
      ],
    };
  });

  const monthLabel = (month: string) => {
    const [y, m] = month.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const mi = parseInt(m) - 1;
    return y === "2026" ? `${months[mi]}26` : months[mi];
  };

  const chartMonthly = teamMonthly.map((m) => ({ ...m, m: monthLabel(m.month) }));

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {profiles.map((p) => {
          const t = totals.find((x) => x.key === p.developer_key)!;
          return (
            <button key={p.developer_key} onClick={() => setSel(sel === p.developer_key ? null : p.developer_key)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: sel === p.developer_key ? p.color : "#1e293b", color: sel === p.developer_key ? "#fff" : "#94a3b8" }}>
              {p.display_name} ({t.total})
            </button>
          );
        })}
      </div>

      {!sel && (
        <>
          <Card>
            <SectionTitle icon="🔬">Ventilation par type et par personne</SectionTitle>
            {profiles.map((p, i) => {
              const b = p.type_breakdown;
              const pct = (k: string) => Math.round(((b as any)[k] / b.total) * 100);
              return (
                <div key={p.developer_key} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid #1a2332" : "none" }}>
                  <span style={{ color: p.color, fontWeight: 700, fontSize: 12, minWidth: 90 }}>{p.display_name}</span>
                  <MiniBar data={b} max={maxType} />
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minWidth: 200 }}>
                    <Chip c="#818cf8">{b.feat} feat ({pct("feat")}%)</Chip>
                    <Chip c="#fbbf24">{b.fix} fix ({pct("fix")}%)</Chip>
                    {b.refacto > 0 && <Chip c="#fb923c">{b.refacto} refacto</Chip>}
                    {b.chore > 0 && <Chip c="#94a3b8">{b.chore} chore</Chip>}
                  </div>
                </div>
              );
            })}
          </Card>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 12 }}>
            {radarData.map((p, i) => (
              <div key={i} style={{ background: "#1e293b", borderRadius: 12, padding: 12, textAlign: "center", flex: "0 0 280px", cursor: "pointer" }}
                onClick={() => setSel(profiles[i].developer_key)}>
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.name}</div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={p.axes}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="a" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Radar dataKey="v" fill={p.color} fillOpacity={0.25} stroke={p.color} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: 9, color: "#64748b" }}>
                  {p.axes.map((a, j) => <span key={j} style={{ marginRight: 6 }}>{a.a}:{a.v}%</span>)}
                </div>
              </div>
            ))}
          </div>

          <Card>
            <SectionTitle icon="📐">Légende</SectionTitle>
            <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.8 }}>
              <strong style={{ color: "#f8fafc" }}>Volume</strong> — Total releases / max.{" "}
              <strong style={{ color: "#f8fafc" }}>Régularité</strong> — % mois avec ≥1 release.{" "}
              <strong style={{ color: "#f8fafc" }}>Polyvalence</strong> — Repos distincts / 15.{" "}
              <strong style={{ color: "#f8fafc" }}>Pics</strong> — Max mensuel / 19.
            </div>
          </Card>
        </>
      )}

      {sel && (() => {
        const p = profiles.find((x) => x.developer_key === sel)!;
        const t = totals.find((x) => x.key === sel)!;
        const b = p.type_breakdown;
        const mActive = teamMonthly.filter((m) => (Number(m[p.display_name]) || 0) > 0).length;
        const maxM = Math.max(...teamMonthly.map((m) => Number(m[p.display_name]) || 0));
        const bestMonth = teamMonthly.find((m) => (Number(m[p.display_name]) || 0) === maxM);
        const pRollbacks = incidents.filter((r) => r.developer_key === sel);
        const pBB = baseBranches.filter((bb) => bb.developer_key.includes(sel));

        return (
          <Card style={{ borderLeft: `3px solid ${p.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: p.color, margin: 0 }}>{p.display_name}</h2>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip c={p.color}>{t.total} releases</Chip>
                <Chip c="#94a3b8">{mActive}/14 mois</Chip>
                <Chip c="#94a3b8">{p.repos.length} repos</Chip>
                <Chip c="#94a3b8">pic: {maxM} ({bestMonth ? monthLabel(bestMonth.month) : ""})</Chip>
              </div>
            </div>

            <div style={{ background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 8 }}>🔬 Ventilation feat / fix / refacto / chore</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <MiniBar data={b} max={maxType} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Chip c="#818cf8">{b.feat} features ({Math.round((b.feat / b.total) * 100)}%)</Chip>
                <Chip c="#fbbf24">{b.fix} fixes ({Math.round((b.fix / b.total) * 100)}%)</Chip>
                {b.refacto > 0 && <Chip c="#fb923c">{b.refacto} refacto ({Math.round((b.refacto / b.total) * 100)}%)</Chip>}
                {b.chore > 0 && <Chip c="#94a3b8">{b.chore} chore/QAA ({Math.round((b.chore / b.total) * 100)}%)</Chip>}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <Chip c="#f87171">{pRollbacks.length} rollback{pRollbacks.length > 1 ? "s" : ""}</Chip>
                <Chip c="#fb923c">{pBB.length} base branch{pBB.length > 1 ? "es" : ""}</Chip>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>📈 Activité mensuelle</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chartMonthly}>
                  <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 8 }} interval={0} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey={p.display_name} fill={p.color} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: "1 1 300px" }}>
                <h4 style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>🎯 Projets & thèmes clés</h4>
                {p.themes.map((th, j) => (
                  <div key={j} style={{ fontSize: 12, color: "#cbd5e1", padding: "3px 0", borderBottom: "1px solid #1a2332" }}>• {th}</div>
                ))}
              </div>
            </div>

            {pRollbacks.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 12, color: "#f87171", marginBottom: 6 }}>🚨 Rollbacks associés</h4>
                {pRollbacks.map((rb, j) => (
                  <div key={j} style={{ fontSize: 11, color: "#cbd5e1", padding: "4px 0", borderBottom: "1px solid #1a2332" }}>
                    <Chip c={SEV_COLORS[rb.severity]}>{rb.severity}</Chip>{" "}
                    <span style={{ marginLeft: 6 }}>{rb.date} — {rb.description}</span>
                    <div style={{ fontSize: 10, color: "#86efac", marginTop: 2 }}>💡 {rb.lesson}</div>
                  </div>
                ))}
              </div>
            )}

            {pBB.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 12, color: "#fb923c", marginBottom: 6 }}>🌿 Base Branches ({pBB.length})</h4>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {pBB.map((bb, j) => (
                    <span key={j} style={{ fontSize: 10, color: "#fb923c", background: "#fb923c15", padding: "3px 10px", borderRadius: 8 }}>
                      {bb.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>📦 Repos</h4>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {p.repos.map((r, j) => (
                  <span key={j} style={{ fontSize: 10, color: "#94a3b8", background: "#0f172a", padding: "2px 8px", borderRadius: 8 }}>{r}</span>
                ))}
              </div>
            </div>
          </Card>
        );
      })()}
    </>
  );
}
