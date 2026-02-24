import { useMemo } from "react";
import type { BugFixDetail, DeveloperProfile } from "../../../lib/api";

const SEV_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

interface Props {
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
}

export default function BugFixMatrix({ bugFixes, profiles }: Props) {
  const { devs, matrix, maxVal, activeAuthors } = useMemo(() => {
    const sorted = [...profiles].sort((a, b) => a.display_name.localeCompare(b.display_name));

    const m = new Map<string, number>();
    for (const b of bugFixes) {
      const w = SEV_WEIGHT[b.severity ?? ""] || 1;
      const k = `${b.author_key}:${b.fixer_key}`;
      m.set(k, (m.get(k) || 0) + w);
    }

    let max = 0;
    for (const v of m.values()) if (v > max) max = v;

    // Only show rows for authors who have at least one bug
    const active = new Set<string>();
    for (const b of bugFixes) active.add(b.author_key);

    return { devs: sorted, matrix: m, maxVal: max || 1, activeAuthors: active };
  }, [bugFixes, profiles]);

  if (devs.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 4 }}>
        Matrice Bug-Fix (qui fixe les bugs de qui)
      </h3>
      <p style={{ fontSize: 10, color: "#64748b", marginBottom: 8 }}>
        Lignes = auteur du bug, Colonnes = fixeur. Pondéré par sévérité (critical×4, high×3, medium×2, low×1).
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px", color: "#94a3b8", borderBottom: "1px solid #334155" }}>Auteur</th>
              {devs.map((d) => (
                <th key={d.developer_key} style={{
                  padding: "6px 4px", color: d.color, borderBottom: "1px solid #334155",
                  fontSize: 10, textAlign: "center", fontWeight: 600,
                }}>
                  {d.display_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devs.map((author) => {
              if (!activeAuthors.has(author.developer_key)) return null;
              return (
                <tr key={author.developer_key}>
                  <td style={{
                    padding: "4px 8px", color: author.color, borderBottom: "1px solid #1e293b",
                    fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                    {author.display_name}
                  </td>
                  {devs.map((fixer) => {
                    const v = matrix.get(`${author.developer_key}:${fixer.developer_key}`) || 0;
                    const isSelf = author.developer_key === fixer.developer_key;
                    return (
                      <td key={fixer.developer_key} style={{
                        padding: "4px", textAlign: "center", borderBottom: "1px solid #1e293b",
                        background: v > 0
                          ? (isSelf ? "rgba(96,165,250,0.15)" : "rgba(251,147,36,0.15)")
                          : undefined,
                        color: v > 0
                          ? (isSelf ? "#60a5fa" : "#fb923c")
                          : "#334155",
                        fontWeight: v > 0 ? 700 : 400,
                      }}>
                        {v > 0 ? v : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
