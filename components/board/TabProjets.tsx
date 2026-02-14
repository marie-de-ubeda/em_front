import { useState } from "react";
import Card from "./Card";
import Chip from "./Chip";
import type { RoadmapProject } from "../../lib/api";

interface Props {
  projects: RoadmapProject[];
}

export default function TabProjets({ projects }: Props) {
  const [openProj, setOpenProj] = useState<number | null>(null);

  return (
    <>
      {projects.map((p, i) => (
        <Card key={i} style={{ borderLeft: `3px solid ${p.impact === "high" ? "#f472b6" : "#fbbf24"}` }}
          onClick={() => setOpenProj(openProj === i ? null : i)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#f8fafc" }}>{p.name}</span>
              <Chip c={p.impact === "high" ? "#f87171" : "#fbbf24"}>{p.impact === "high" ? "Fort" : "Moyen"}</Chip>
              <Chip c="#818cf8">{p.type}</Chip>
              <Chip c="#34d399">{p.leads}</Chip>
            </div>
            <span style={{ color: "#64748b", fontSize: 11 }}>{p.period} {openProj === i ? "▲" : "▼"}</span>
          </div>
          {openProj === i && (
            <div style={{ marginTop: 12 }}>
              {[
                { l: "📋 Description", v: p.description, c: "#cbd5e1" },
                { l: "⚡ Challenges", v: p.challenges, c: "#fde68a" },
                { l: "✅ Résultat", v: p.result, c: "#86efac" },
              ].map((s, j) => (
                <div key={j} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 12, color: s.c, lineHeight: 1.6 }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </>
  );
}
