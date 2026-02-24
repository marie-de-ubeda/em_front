import { useState, useEffect } from "react";
import type { GanttRelease } from "../../../lib/api";
import { api } from "../../../lib/api";

const TYPE_COLORS: Record<string, string> = {
  feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8",
};

interface Props {
  title: string;
  subtitle: string;
  developerKey: string | null;
  projectId: number | null;
  sprintId: number;
  sprintNumber: number;
  onClose: () => void;
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export default function GanttDrawer({ title, subtitle, developerKey, projectId, sprintId, sprintNumber, onClose }: Props) {
  const [releases, setReleases] = useState<GanttRelease[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("sprint_id", String(sprintId));
    if (developerKey) params.set("developer_key", developerKey);
    if (projectId) params.set("project_id", String(projectId));
    api.ganttReleases(`?${params.toString()}`).then((data) => {
      setReleases(data);
      setLoading(false);
    });
  }, [developerKey, projectId, sprintId]);

  // Group releases by repo
  const grouped = releases
    ? [...Map.groupBy(releases, (r) => r.repo_name).entries()]
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  const totalTickets = releases?.reduce((s, r) => s + r.tickets.length, 0) || 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000 }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 560, maxWidth: "90vw",
        background: "#0f172a", borderLeft: "1px solid #334155",
        zIndex: 1001, display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #1e293b",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{title}</h2>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {subtitle} — Sprint {sprintNumber}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", padding: 4,
          }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ textAlign: "center", color: "#64748b", fontSize: 11, padding: "30px 0" }}>Chargement…</div>
          ) : releases && releases.length === 0 ? (
            <div style={{ textAlign: "center", color: "#475569", fontSize: 11, padding: "30px 0" }}>Aucune release</div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Releases", value: releases?.length || 0, color: "#6366f1" },
                  { label: "Tickets liés", value: totalTickets, color: totalTickets > 0 ? "#34d399" : "#334155" },
                  { label: "Repos", value: grouped.length, color: "#818cf8" },
                ].map((k) => (
                  <div key={k.label} style={{
                    background: "#1e293b", borderRadius: 8, padding: "8px 12px",
                    flex: "1 1 80px", borderLeft: `3px solid ${k.color}`,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 9, color: "#64748b" }}>{k.label}</div>
                  </div>
                ))}
              </div>

              {/* Releases grouped by repo */}
              {grouped.map(([repoName, repoReleases]) => (
                <div key={repoName} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: "#6366f1", padding: "6px 0",
                    borderBottom: "1px solid #334155", marginBottom: 4,
                  }}>
                    {repoName.replace(/^indb-/, "")}
                    <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 6 }}>
                      ({repoReleases.length})
                    </span>
                  </div>

                  {repoReleases.map((r) => (
                    <div key={r.release_id} style={{
                      padding: "8px 0 8px 8px", borderBottom: "1px solid #0f172a",
                    }}>
                      {/* Release header */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ color: "#64748b", fontSize: 10, minWidth: 44 }}>
                          {r.release_date ? formatDate(r.release_date) : "—"}
                        </span>
                        {r.release_type && (
                          <span style={{
                            fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                            color: TYPE_COLORS[r.release_type] || "#94a3b8",
                            background: `${TYPE_COLORS[r.release_type] || "#94a3b8"}22`,
                          }}>
                            {r.release_type}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>
                          {r.version}
                        </span>
                        <span style={{ fontSize: 10, color: r.dev_color, fontWeight: 600 }}>
                          {r.display_name}
                        </span>
                        {r.release_url && (
                          <a
                            href={r.release_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 9, color: "#6366f1", textDecoration: "none" }}
                          >
                            release ↗
                          </a>
                        )}
                      </div>

                      {/* Changes */}
                      {r.changes && (
                        <div style={{
                          fontSize: 10, color: "#94a3b8", marginTop: 3, lineHeight: 1.4,
                          paddingLeft: 4,
                          whiteSpace: "pre-wrap",
                        }}>
                          {r.changes}
                        </div>
                      )}

                      {/* Tickets */}
                      {r.tickets.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4, paddingLeft: 4 }}>
                          {r.tickets.map((t) => (
                            <a
                              key={t.key}
                              href={t.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
                                background: "#1e293b", color: "#34d399", textDecoration: "none",
                                border: "1px solid #334155",
                              }}
                            >
                              {t.key} ↗
                            </a>
                          ))}
                        </div>
                      )}

                      {/* PRs */}
                      {r.pull_requests.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3, paddingLeft: 4 }}>
                          {r.pull_requests.map((pr) => (
                            <span
                              key={pr.number}
                              style={{
                                fontSize: 9, color: "#64748b", padding: "1px 4px",
                              }}
                              title={pr.title}
                            >
                              #{pr.number}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
