import { useMemo } from "react";
import type { RepoMatrixEntry } from "../../../lib/api";

interface Props {
  repoMatrix: RepoMatrixEntry[];
}

interface RepoOwner {
  repo: string;
  owners: { name: string; color: string; count: number; pct: number }[];
  total: number;
}

export default function RepoOwnershipMap({ repoMatrix }: Props) {
  const repos = useMemo<RepoOwner[]>(() => {
    // Group by repo
    const map = new Map<string, { name: string; color: string; count: number }[]>();
    for (const r of repoMatrix) {
      if (!map.has(r.repo_name)) map.set(r.repo_name, []);
      map.get(r.repo_name)!.push({ name: r.display_name, color: r.color, count: r.release_count });
    }

    return [...map.entries()]
      .map(([repo, devs]) => {
        const total = devs.reduce((s, d) => s + d.count, 0);
        const sorted = [...devs].sort((a, b) => b.count - a.count);
        const owners = sorted.slice(0, 2).map((d) => ({
          name: d.name,
          color: d.color,
          count: d.count,
          pct: Math.round((d.count / total) * 100),
        }));
        return { repo, owners, total };
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [repoMatrix]);

  if (repos.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 8 }}>
        Ownership repos
      </h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {repos.map((r) => {
          const primary = r.owners[0];
          const isPrimaryOwner = primary && primary.pct > 50;
          return (
            <div key={r.repo} style={{
              background: "#1e293b", borderRadius: 8, padding: "6px 10px",
              borderLeft: `3px solid ${isPrimaryOwner ? primary.color : "#334155"}`,
              minWidth: 140, flex: "0 1 auto",
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
                {r.repo.replace(/^indb-/, "")}
                <span style={{ fontSize: 8, color: "#64748b", marginLeft: 4 }}>{r.total} rel.</span>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {r.owners.map((o) => (
                  <span key={o.name} style={{
                    fontSize: 9, padding: "1px 5px", borderRadius: 4,
                    background: `${o.color}22`, color: o.color, fontWeight: 600,
                  }}>
                    {o.name.split(" ").map((n) => n[0]).join("")} {o.pct}%
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
