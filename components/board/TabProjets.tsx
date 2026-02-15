import { useState } from "react";
import Card from "./Card";
import Chip from "./Chip";
import type { Project } from "../../lib/api";

interface Props {
  projects: Project[];
}

type Filter = "all" | "roadmap" | "other";

export default function TabProjets({ projects }: Props) {
  const [openProj, setOpenProj] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = projects.filter((p) => {
    if (filter === "roadmap") return p.is_roadmap;
    if (filter === "other") return !p.is_roadmap;
    return true;
  });

  const roadmapCount = projects.filter((p) => p.is_roadmap).length;
  const otherCount = projects.filter((p) => !p.is_roadmap).length;

  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {([
          ["all", `Tous (${projects.length})`],
          ["roadmap", `Roadmap (${roadmapCount})`],
          ["other", `Autres (${otherCount})`],
        ] as [Filter, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              background: filter === key ? "#6366f1" : "#1e293b",
              color: filter === key ? "#fff" : "#94a3b8",
            }}>
            {label}
          </button>
        ))}
      </div>

      {filtered.map((p, i) => {
        const hasDetails = p.is_roadmap && (p.description || p.challenges || p.result || p.ai_summary);
        const hasReleases = p.releases?.length > 0;

        return (
          <Card key={p.id} style={{ borderLeft: `3px solid ${p.is_roadmap ? (p.impact === "high" ? "#f472b6" : "#fbbf24") : "#6366f1"}` }}
            onClick={() => setOpenProj(openProj === i ? null : i)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{p.name}</span>
                {p.is_roadmap && <Chip c={p.impact === "high" ? "#f87171" : "#fbbf24"}>{p.impact === "high" ? "Fort" : "Moyen"}</Chip>}
                {p.type && <Chip c="#818cf8">{p.type}</Chip>}
                {p.leads?.length > 0 && <Chip c="#34d399">{p.leads.map((l) => l.developer_key).join(" + ")}</Chip>}
                {!p.is_roadmap && <Chip c="#6366f1">Chantier</Chip>}
              </div>
              <span style={{ color: "#64748b", fontSize: 11 }}>
                {p.period || ""} {(hasDetails || hasReleases) ? (openProj === i ? "▲" : "▼") : ""}
              </span>
            </div>
            {openProj === i && (
              <div style={{ marginTop: 12 }}>
                {hasDetails && [
                  { l: "📋 Description", v: p.description, c: "#cbd5e1" },
                  { l: "⚡ Challenges", v: p.challenges, c: "#fde68a" },
                  { l: "✅ Résultat", v: p.result, c: "#86efac" },
                  { l: "🤖 Résumé", v: p.ai_summary, c: "#a78bfa" },
                ].filter((s) => s.v).map((s, j) => (
                  <div key={j} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>{s.l}</div>
                    <div style={{ fontSize: 12, color: s.c, lineHeight: 1.6, whiteSpace: "pre-line" }}>{s.v}</div>
                  </div>
                ))}
                {hasReleases && (
                  <div style={{ marginTop: hasDetails ? 8 : 0 }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>📦 Livrables ({p.releases.length} releases)</div>
                    {p.releases.map((rel) => (
                      <div key={rel.release_id} style={{ fontSize: 11, color: "#cbd5e1", padding: "2px 0" }}>
                        • {rel.repo_name.replace(/^indb-/, "")} {rel.version}
                        {rel.release_date ? ` (${new Date(rel.release_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })})` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </>
  );
}
