import { useMemo } from "react";
import type { BugFixDetail, DeveloperProfile } from "../../../lib/api";

const SEV_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

interface Props {
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
}

export default function BugFixMatrix({ bugFixes, profiles }: Props) {
  const { devKeys, matrix, maxVal } = useMemo(() => {
    const keys = [...profiles]
      .sort((a, b) => a.display_name.localeCompare(b.display_name))
      .map((p) => ({ key: p.developer_key, name: p.display_name, color: p.color }));

    const m = new Map<string, number>();
    for (const b of bugFixes) {
      const w = SEV_WEIGHT[b.severity ?? ""] || 1;
      const k = `${b.author_key}:${b.fixer_key}`;
      m.set(k, (m.get(k) || 0) + w);
    }

    let max = 0;
    for (const v of m.values()) if (v > max) max = v;

    return { devKeys: keys, matrix: m, maxVal: max || 1 };
  }, [bugFixes, profiles]);

  if (devKeys.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
        Matrice bugs : qui corrige les bugs de qui
      </h3>
      <p style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>
        Pondéré par sévérité (critical×4, high×3, medium×2, low×1). Lignes = auteur du bug, colonnes = correcteur.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 8px", fontSize: 9, color: "#64748b" }}>Auteur ↓ / Fixeur →</th>
              {devKeys.map((d) => (
                <th key={d.key} style={{ padding: "4px 6px", fontSize: 9, color: d.color, fontWeight: 600, textAlign: "center" }}>
                  {d.name.split(" ").map((n) => n[0]).join("")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devKeys.map((author) => (
              <tr key={author.key}>
                <td style={{ padding: "4px 8px", fontSize: 10, color: author.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {author.name}
                </td>
                {devKeys.map((fixer) => {
                  const v = matrix.get(`${author.key}:${fixer.key}`) || 0;
                  const opacity = v > 0 ? 0.2 + (v / maxVal) * 0.8 : 0;
                  const isSelf = author.key === fixer.key;
                  return (
                    <td key={fixer.key} style={{
                      padding: "4px 6px", textAlign: "center", fontSize: 10, fontWeight: v > 0 ? 700 : 400,
                      color: v > 0 ? "#e2e8f0" : "#334155",
                      background: v > 0 ? `rgba(${isSelf ? "251,191,36" : "99,102,241"},${opacity})` : "transparent",
                      borderRadius: 4,
                    }}>
                      {v > 0 ? v : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
