import type { Incident } from "../../../lib/api";

const SEV_COLORS: Record<string, string> = {
  high: "#f87171", medium: "#fbbf24", low: "#34d399",
};

interface Props {
  incidents: Incident[];
}

export default function IncidentTimeline({ incidents }: Props) {
  if (incidents.length === 0) return null;

  const sorted = [...incidents].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
        Incidents ({incidents.length})
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sorted.map((inc) => (
          <div key={inc.id} style={{
            background: "#1e293b", borderRadius: 8, padding: "8px 12px",
            borderLeft: `3px solid ${SEV_COLORS[inc.severity] || "#64748b"}`,
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>{inc.date}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
                color: SEV_COLORS[inc.severity] || "#94a3b8",
                background: `${SEV_COLORS[inc.severity] || "#94a3b8"}22`,
              }}>
                {inc.severity}
              </span>
              {inc.developer_key && (
                <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 600 }}>{inc.developer_key}</span>
              )}
              {inc.type && <span style={{ fontSize: 9, color: "#475569" }}>{inc.type}</span>}
            </div>
            <div style={{ fontSize: 11, color: "#e2e8f0" }}>{inc.description}</div>
            {inc.lesson && (
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>
                Leçon : {inc.lesson}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
