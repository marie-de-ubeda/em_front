import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Card from "./Card";
import SectionTitle from "./SectionTitle";
import KPI from "./KPI";
import Chip from "./Chip";
import type { FixRatio, SupportTicket, Incident, BaseBranch, CrossContribution } from "../../lib/api";

const TOOLTIP_STYLE = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" };
const SEV_COLORS: Record<string, string> = { high: "#f87171", medium: "#fbbf24", low: "#34d399" };

interface Props {
  fixRatio: FixRatio[];
  supportTickets: SupportTicket[];
  incidents: Incident[];
  baseBranches: BaseBranch[];
  crossContributions: CrossContribution[];
}

export default function TabQualite({ fixRatio, supportTickets, incidents, baseBranches, crossContributions }: Props) {
  const [openRb, setOpenRb] = useState<number | null>(null);
  const [showBB, setShowBB] = useState(false);
  const [showCross, setShowCross] = useState(false);

  const monthLabel = (month: string) => {
    const [y, m] = month.split("-");
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    const mi = parseInt(m) - 1;
    return y === "2026" ? `${months[mi]}26` : months[mi];
  };

  const chartFixRatio = fixRatio.map((r) => ({ ...r, m: monthLabel(r.month) }));
  const chartSupport = supportTickets.map((t) => ({ ...t, m: monthLabel(t.month) }));

  const totalFeat = fixRatio.reduce((s, r) => s + r.feat, 0);
  const totalFix = fixRatio.reduce((s, r) => s + r.fix, 0);
  const totalSupport = supportTickets.reduce((s, t) => s + t.count, 0);
  const ratioStr = totalFeat + totalFix > 0 ? `~${Math.round((totalFeat / (totalFeat + totalFix)) * 100)}/${Math.round((totalFix / (totalFeat + totalFix)) * 100)}` : "—";

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <KPI label="Rollbacks" value={incidents.length} color="#f87171" sub="sur 14 mois" />
        <KPI label="Tickets SUPPORT" value={`~${totalSupport}`} color="#fbbf24" sub="traités" />
        <KPI label="Ratio feat/fix" value={ratioStr} color="#818cf8" sub="% sur l'année" />
        <KPI label="Base Branches" value={baseBranches.length} color="#fb923c" sub="dont 2 revertées" />
        <KPI label="Résolution" value="<24h" color="#34d399" sub="rollbacks" />
      </div>

      <Card>
        <SectionTitle icon="📊">Ratio Features vs Fixes par mois</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartFixRatio}>
            <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="feat" name="Features" fill="#818cf8" stackId="a" />
            <Bar dataKey="fix" name="Fixes" fill="#fbbf24" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
          Ratio stable ~{Math.round((totalFix / (totalFeat + totalFix)) * 100)}% fixes. Les pics de fixes suivent les grosses MEP.
        </p>
      </Card>

      <Card>
        <SectionTitle icon="🔧">Tickets SUPPORT par mois</SectionTitle>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={chartSupport}>
            <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 10 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" name="SUPPORT" fill="#f87171" radius={[4, 4, 0, 0]} fillOpacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle icon="🚨">Incidents & Rollbacks détaillés</SectionTitle>
        {incidents.map((rb, i) => (
          <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 8, cursor: "pointer", borderLeft: `3px solid ${SEV_COLORS[rb.severity]}` }}
            onClick={() => setOpenRb(openRb === i ? null : i)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>{rb.description}</span>
                <Chip c={SEV_COLORS[rb.severity]}>{rb.severity === "high" ? "Sévère" : rb.severity === "medium" ? "Modéré" : "Faible"}</Chip>
                <Chip c="#94a3b8">{rb.type}</Chip>
                <Chip c="#818cf8">{rb.developer_key}</Chip>
              </div>
              <span style={{ color: "#64748b", fontSize: 11 }}>{rb.date} {openRb === i ? "▲" : "▼"}</span>
            </div>
            {openRb === i && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 6 }}>{rb.detail}</div>
                {rb.jira_ticket !== "—" && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>🎫 {rb.jira_ticket}</div>}
                <div style={{ fontSize: 12, color: "#86efac", background: "#86efac10", padding: "6px 10px", borderRadius: 6 }}>
                  💡 <strong>Leçon :</strong> {rb.lesson}
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowBB(!showBB)}>
          <SectionTitle icon="🌿">Base Branches — {baseBranches.length} features majeures {showBB ? "▲" : "▼"}</SectionTitle>
        </div>
        <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
          Les base branches (BB) sont le pattern de livraison des grosses features. 2 des {incidents.length} rollbacks sont liés à des BB.
        </p>
        {showBB && (
          <div style={{ maxHeight: 400, overflow: "auto" }}>
            {baseBranches.map((bb, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderBottom: "1px solid #1a2332", fontSize: 11, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "#f8fafc", fontWeight: 600, minWidth: 200 }}>{bb.name}</span>
                <Chip c="#818cf8">{bb.developer_key}</Chip>
                <span style={{ color: "#64748b" }}>{bb.repositories}</span>
                <span style={{ color: "#475569" }}>{bb.pr_reference}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setShowCross(!showCross)}>
          <SectionTitle icon="🔀">Attributions croisées & anomalies {showCross ? "▲" : "▼"}</SectionTitle>
        </div>
        <p style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
          Releases où le crédit ne reflète pas exactement qui a codé.
        </p>
        {showCross && crossContributions.map((cc, i) => (
          <div key={i} style={{ background: "#0f172a", borderRadius: 8, padding: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#f8fafc" }}>{cc.release_desc}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              <span style={{ color: "#fbbf24" }}>Crédité : {cc.credited}</span>
              <span style={{ color: "#475569", margin: "0 8px" }}>→</span>
              <span style={{ color: "#34d399" }}>Réalité : {cc.actual}</span>
            </div>
          </div>
        ))}
      </Card>

      <Card style={{ borderLeft: "3px solid #34d399" }}>
        <SectionTitle icon="✅">Synthèse qualité</SectionTitle>
        <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.8 }}>
          <p><strong style={{ color: "#34d399" }}>Bonne pratique :</strong> Le revert stratégique Frais 2026 (Déc) — isoler une MEP réglementaire des features en cours. À systématiser.</p>
          <p><strong style={{ color: "#fbbf24" }}>Pattern à adresser :</strong> Les base branches ({baseBranches.length} identifiées, 2 revertées) sont la source principale de risque. Objectif 2026 : feature flags + livraisons incrémentales derrière des toggles.</p>
        </div>
      </Card>
    </>
  );
}
