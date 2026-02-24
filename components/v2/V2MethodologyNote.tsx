import { useState } from "react";

interface Props {
  items: { label: string; description: string }[];
}

export default function V2MethodologyNote({ items }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 32, borderTop: "1px solid #1e293b", paddingTop: 12 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: "none", border: "none", cursor: "pointer", color: "#475569",
        fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
        padding: 0,
      }}>
        <span style={{ fontSize: 9 }}>{open ? "▾" : "▸"}</span>
        Méthodologie
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #1e293b" }}>
          {items.map((item, i) => (
            <div key={i} style={{ marginBottom: 6, fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
              <strong style={{ color: "#94a3b8" }}>{item.label}</strong> — {item.description}
            </div>
          ))}
          <div style={{ fontSize: 10, color: "#475569", marginTop: 8, borderTop: "1px solid #1e293b", paddingTop: 6 }}>
            Toutes les métriques sont calculées à partir des données factuelles (releases, release_fixes, incidents).
            Aucun score subjectif n&apos;est utilisé.
          </div>
        </div>
      )}
    </div>
  );
}
