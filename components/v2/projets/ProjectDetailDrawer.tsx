import { useMemo, useState } from "react";
import type { Project, BugFixDetail, ProjectRelease, ProjectQualityContributor } from "../../../lib/api";

const SEV_COLORS: Record<string, string> = {
  critical: "#e63946", high: "#f87171", medium: "#fbbf24", low: "#34d399",
};
const TYPE_COLORS: Record<string, string> = {
  feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8",
};

interface Props {
  project: Project;
  bugFixes: BugFixDetail[];
  contributors: ProjectQualityContributor[];
  onClose: () => void;
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

function formatShort(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function ContributorPieChart({ contributors }: { contributors: ProjectQualityContributor[] }) {
  const sorted = useMemo(
    () => [...contributors].sort((a, b) => b.release_count - a.release_count),
    [contributors],
  );
  const total = sorted.reduce((s, c) => s + c.release_count, 0);
  if (total === 0) return null;

  const SIZE = 120;
  const R = 50;
  const CX = SIZE / 2;
  const CY = SIZE / 2;

  // Build pie slices
  const slices: { path: string; color: string; name: string; count: number; pct: number; midAngle: number }[] = [];
  let cumAngle = -Math.PI / 2; // start at top
  for (const c of sorted) {
    const pct = c.release_count / total;
    const angle = pct * 2 * Math.PI;
    const startX = CX + R * Math.cos(cumAngle);
    const startY = CY + R * Math.sin(cumAngle);
    const endX = CX + R * Math.cos(cumAngle + angle);
    const endY = CY + R * Math.sin(cumAngle + angle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = cumAngle + angle / 2;

    const path = sorted.length === 1
      ? `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`
      : `M ${CX} ${CY} L ${startX} ${startY} A ${R} ${R} 0 ${largeArc} 1 ${endX} ${endY} Z`;

    slices.push({ path, color: c.color, name: c.display_name, count: c.release_count, pct: Math.round(pct * 100), midAngle });
    cumAngle += angle;
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>
        Contributeurs ({sorted.length})
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} opacity={0.85} stroke="#0f172a" strokeWidth={1.5} />
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {sorted.map((c) => {
            const pct = Math.round((c.release_count / total) * 100);
            return (
              <div key={c.developer_key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: c.color, minWidth: 90 }}>
                  {c.display_name}
                </span>
                <span style={{ fontSize: 10, color: "#e2e8f0", fontWeight: 700, minWidth: 30, textAlign: "right" }}>
                  {pct}%
                </span>
                <span style={{ fontSize: 9, color: "#64748b" }}>
                  ({c.release_count} rel.)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SEV_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const DETECTED_LABELS: Record<string, { label: string; color: string }> = {
  client: { label: "Client / Support", color: "#f87171" },
  support: { label: "Client / Support", color: "#f87171" },
  team: { label: "Équipe", color: "#34d399" },
  monitoring: { label: "Monitoring", color: "#38bdf8" },
  qa: { label: "QA", color: "#a78bfa" },
};

function TicketBadges({ tickets }: { tickets: { key: string; url: string }[] }) {
  if (tickets.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {tickets.map((t) => (
        <a
          key={t.key}
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
            background: "#1e293b", color: "#34d399", textDecoration: "none",
            border: "1px solid #334155",
          }}
        >
          {t.key} ↗
        </a>
      ))}
    </div>
  );
}

function BugDetailDrawer({ bug, onClose }: { bug: BugFixDetail; onClose: () => void }) {
  const sevColor = SEV_COLORS[bug.severity || ""] || "#94a3b8";
  const detected = DETECTED_LABELS[bug.detected_by || ""] || { label: bug.detected_by || "—", color: "#64748b" };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 2000 }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 500, maxWidth: "85vw",
        background: "#0f172a", borderLeft: "1px solid #334155",
        zIndex: 2001, display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid #1e293b",
          display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {bug.severity && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                  background: `${sevColor}22`, color: sevColor, textTransform: "uppercase",
                }}>
                  {bug.severity}
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                Détail du bug
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              {bug.bugged_repo.replace(/^indb-/, "")} {bug.bugged_version} → {bug.fix_repo.replace(/^indb-/, "")} {bug.fix_version}
              {bug.days_to_fix != null && (
                <span style={{ color: "#6366f1", fontWeight: 600, marginLeft: 8 }}>corrigé en {bug.days_to_fix}j</span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#64748b", fontSize: 18, cursor: "pointer", padding: 4,
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Origin section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#f87171", marginBottom: 8, borderBottom: "1px solid #334155", paddingBottom: 4 }}>
              Origine du bug
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Release :</span>
                <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>
                  {bug.bugged_repo.replace(/^indb-/, "")} {bug.bugged_version}
                </span>
                {bug.bugged_date && (
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    ({new Date(bug.bugged_date).toLocaleDateString("fr-FR")})
                  </span>
                )}
                {bug.bugged_release_url && (
                  <a href={bug.bugged_release_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 9, color: "#6366f1", textDecoration: "none" }}>release ↗</a>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Auteur :</span>
                <span style={{ fontSize: 11, color: bug.author_color, fontWeight: 600 }}>{bug.author_name}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Détecté par :</span>
                <span style={{ fontSize: 11, color: detected.color, fontWeight: 600 }}>{detected.label}</span>
              </div>
              {bug.environment && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Env. :</span>
                  <span style={{ fontSize: 11, color: "#e2e8f0" }}>{bug.environment}</span>
                </div>
              )}
              {bug.bugged_tickets?.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: "#64748b", minWidth: 70, marginTop: 2 }}>Tickets :</span>
                  <TicketBadges tickets={bug.bugged_tickets} />
                </div>
              )}
              {bug.bugged_changes && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Changelog :</span>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap", background: "#1e293b", padding: "8px 10px", borderRadius: 6 }}>
                    {bug.bugged_changes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fix section */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#34d399", marginBottom: 8, borderBottom: "1px solid #334155", paddingBottom: 4 }}>
              Correction
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Release :</span>
                <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600 }}>
                  {bug.fix_repo.replace(/^indb-/, "")} {bug.fix_version}
                </span>
                {bug.fix_date && (
                  <span style={{ fontSize: 10, color: "#64748b" }}>
                    ({new Date(bug.fix_date).toLocaleDateString("fr-FR")})
                  </span>
                )}
                {bug.fix_release_url && (
                  <a href={bug.fix_release_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 9, color: "#6366f1", textDecoration: "none" }}>release ↗</a>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Fixeur :</span>
                <span style={{ fontSize: 11, color: bug.fixer_color, fontWeight: 600 }}>{bug.fixer_name}</span>
              </div>
              {bug.days_to_fix != null && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>Délai :</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: bug.days_to_fix > 30 ? "#f87171" : bug.days_to_fix > 14 ? "#fbbf24" : "#34d399",
                  }}>
                    {bug.days_to_fix} jours
                  </span>
                </div>
              )}
              {bug.fix_tickets?.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 10, color: "#64748b", minWidth: 70, marginTop: 2 }}>Tickets :</span>
                  <TicketBadges tickets={bug.fix_tickets} />
                </div>
              )}
              {bug.fix_changes && (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: "#64748b" }}>Changelog :</span>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap", background: "#1e293b", padding: "8px 10px", borderRadius: 6 }}>
                    {bug.fix_changes}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Impact section */}
          {(bug.impact_users || bug.impact_description) && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fbbf24", marginBottom: 8, borderBottom: "1px solid #334155", paddingBottom: 4 }}>
                Impact
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {bug.impact_users != null && bug.impact_users > 0 && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#64748b", minWidth: 70 }}>MV :</span>
                    <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>{bug.impact_users} maisons de vente impactées</span>
                  </div>
                )}
                {bug.impact_description && (
                  <div>
                    <span style={{ fontSize: 10, color: "#64748b" }}>Description :</span>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {bug.impact_description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function scrollToRelease(repo: string, version: string) {
  const id = `release-${repo}-${version}`;
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.background = "#6366f133";
    setTimeout(() => { el.style.background = ""; }, 1500);
  }
}

function BugsByVersion({ bugs }: { bugs: BugFixDetail[] }) {
  const [selectedBug, setSelectedBug] = useState<BugFixDetail | null>(null);

  // Group by "repo:bugged_version"
  const grouped = useMemo(() => {
    const map = new Map<string, BugFixDetail[]>();
    for (const b of bugs) {
      const key = `${b.bugged_repo}:${b.bugged_version}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    // Sort groups: worst severity first, then by max days_to_fix desc
    return [...map.entries()].sort(([, a], [, b]) => {
      const sevA = Math.max(...a.map((x) => SEV_WEIGHT[x.severity || ""] || 0));
      const sevB = Math.max(...b.map((x) => SEV_WEIGHT[x.severity || ""] || 0));
      if (sevA !== sevB) return sevB - sevA;
      const maxDaysA = Math.max(...a.map((x) => x.days_to_fix ?? 0));
      const maxDaysB = Math.max(...b.map((x) => x.days_to_fix ?? 0));
      return maxDaysB - maxDaysA;
    });
  }, [bugs]);

  const totalMV = bugs.reduce((s, b) => s + (b.impact_users || 0), 0);
  const critCount = bugs.filter((b) => b.severity === "critical").length;
  const highCount = bugs.filter((b) => b.severity === "high").length;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Summary header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#f87171", fontWeight: 700 }}>
          Bugs associés ({bugs.length})
        </span>
        {critCount > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#e6394622", color: "#e63946" }}>
            {critCount} critical
          </span>
        )}
        {highCount > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#f8717122", color: "#f87171" }}>
            {highCount} high
          </span>
        )}
        {totalMV > 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#fbbf2422", color: "#fbbf24" }}>
            {totalMV} MV impactées
          </span>
        )}
      </div>

      {/* Groups */}
      {grouped.map(([key, groupBugs]) => {
        const first = groupBugs[0];
        const repo = first.bugged_repo.replace(/^indb-/, "");
        const worstSev = groupBugs.reduce((worst, b) => {
          const w = SEV_WEIGHT[b.severity || ""] || 0;
          return w > (SEV_WEIGHT[worst] || 0) ? (b.severity || worst) : worst;
        }, "");
        const groupMV = groupBugs.reduce((s, b) => s + (b.impact_users || 0), 0);
        const avgFix = groupBugs.filter((b) => b.days_to_fix != null).length > 0
          ? Math.round(groupBugs.filter((b) => b.days_to_fix != null).reduce((s, b) => s + b.days_to_fix!, 0) / groupBugs.filter((b) => b.days_to_fix != null).length)
          : null;

        return (
          <div key={key} style={{
            marginBottom: 8, background: "#1e293b", borderRadius: 6,
            borderLeft: `3px solid ${SEV_COLORS[worstSev] || "#475569"}`,
            overflow: "hidden",
          }}>
            {/* Group header */}
            <div style={{
              padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              {worstSev && (
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
                  background: `${SEV_COLORS[worstSev] || "#94a3b8"}33`,
                  color: SEV_COLORS[worstSev] || "#94a3b8",
                  textTransform: "uppercase",
                }}>
                  {worstSev}
                </span>
              )}
              <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700 }}>
                {repo} {first.bugged_version}
              </span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 10,
                background: groupBugs.length > 3 ? "#f8717133" : "#334155",
                color: groupBugs.length > 3 ? "#f87171" : "#94a3b8",
              }}>
                {groupBugs.length} fix{groupBugs.length > 1 ? "es" : ""}
              </span>
              <span style={{ fontSize: 10, color: first.author_color, fontWeight: 600 }}>
                par {first.author_name}
              </span>
              {groupMV > 0 && (
                <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 600 }}>{groupMV} MV</span>
              )}
              {avgFix != null && (
                <span style={{ fontSize: 9, color: "#64748b" }} title="Délai moyen entre la release buggée et le correctif">corrigé en moy. {avgFix}j</span>
              )}
            </div>

            {/* Individual fixes — sorted by days_to_fix desc */}
            <div style={{ padding: "0 10px 6px" }}>
              {[...groupBugs].sort((a, b) => (b.days_to_fix ?? 0) - (a.days_to_fix ?? 0)).map((b) => (
                <div
                  key={b.id}
                  onClick={() => scrollToRelease(b.fix_repo, b.fix_version)}
                  style={{
                    display: "flex", gap: 6, alignItems: "center", padding: "3px 0",
                    borderTop: "1px solid #0f172a66", fontSize: 10,
                    cursor: "pointer", borderRadius: 3,
                  }}
                  title={`Voir la release ${b.fix_repo.replace(/^indb-/, "")} ${b.fix_version}`}
                >
                  <span style={{ color: "#6366f1", minWidth: 50, fontSize: 9, textDecoration: "underline", textDecorationStyle: "dotted" }}>
                    {b.days_to_fix != null ? `en ${b.days_to_fix}j` : "—"}
                  </span>
                  <span style={{ color: "#94a3b8" }}>→</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 600 }}>
                    {b.fix_repo.replace(/^indb-/, "")} {b.fix_version}
                  </span>
                  <span style={{ color: b.fixer_color, fontWeight: 600 }}>
                    {b.fixer_name}
                  </span>
                  {b.impact_description && (
                    <span style={{ color: "#475569", flex: 1 }} title={b.impact_description}>
                      {b.impact_description.length > 50 ? b.impact_description.slice(0, 50) + "…" : b.impact_description}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedBug(b); }}
                    style={{
                      background: "none", border: "1px solid #334155", borderRadius: 4,
                      color: "#64748b", fontSize: 9, padding: "1px 5px", cursor: "pointer",
                      flexShrink: 0,
                    }}
                    title="Voir tous les détails de ce bug"
                  >
                    i
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {selectedBug && (
        <BugDetailDrawer bug={selectedBug} onClose={() => setSelectedBug(null)} />
      )}
    </div>
  );
}

export default function ProjectDetailDrawer({ project, bugFixes, contributors, onClose }: Props) {
  const projectBugs = useMemo(() =>
    bugFixes.filter((b) =>
      project.releases.some((r) => r.version === b.bugged_version && r.repo_name === b.bugged_repo)
    ), [bugFixes, project]);

  // Group releases by sprint
  const grouped = useMemo(() => {
    const map = new Map<number | null, ProjectRelease[]>();
    for (const r of project.releases) {
      const key = r.sprint_number;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return b[0] - a[0];
    });
  }, [project.releases]);

  // KPIs
  const totalReleases = project.releases.length;
  const dates = project.releases.filter((r) => r.release_date).map((r) => r.release_date!);
  const firstRelease = dates.length > 0 ? dates[dates.length - 1] : null;
  const lastRelease = dates.length > 0 ? dates[0] : null;
  const bugRate = totalReleases > 0 ? Math.round((projectBugs.length / totalReleases) * 1000) / 10 : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 1000,
        }}
      />
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{project.name}</h2>
              {project.is_roadmap && (
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4, background: "#34d39922", color: "#34d399" }}>Roadmap</span>
              )}
              {project.type && (
                <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "#1e293b", color: "#94a3b8" }}>{project.type}</span>
              )}
              {project.impact && (
                <span style={{
                  fontSize: 9, padding: "1px 6px", borderRadius: 4,
                  background: project.impact === "high" ? "#f8717122" : "#fbbf2422",
                  color: project.impact === "high" ? "#f87171" : "#fbbf24",
                }}>{project.impact}</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#64748b", fontSize: 18,
              cursor: "pointer", padding: 4,
            }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* KPIs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Releases", value: totalReleases, color: "#6366f1" },
              { label: "1ère release", value: firstRelease ? formatShort(firstRelease) : "—", color: "#34d399" },
              { label: "Dernière", value: lastRelease ? formatShort(lastRelease) : "—", color: "#818cf8" },
              { label: "Bugs", value: projectBugs.length, color: projectBugs.length > 0 ? "#f87171" : "#334155" },
              { label: "Bug rate", value: `${bugRate}%`, color: bugRate > 15 ? "#f87171" : bugRate > 5 ? "#fbbf24" : "#34d399" },
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

          {/* Description */}
          {project.description && (
            <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>{project.description}</p>
          )}

          {/* AI Summary */}
          {project.ai_summary && (
            <div style={{
              fontSize: 11, color: "#a78bfa", marginBottom: 12,
              padding: "8px 10px", background: "#1e293b", borderRadius: 6, borderLeft: "3px solid #a78bfa",
            }}>
              {project.ai_summary}
            </div>
          )}

          {/* Contributors pie chart */}
          {contributors.length > 0 && <ContributorPieChart contributors={contributors} />}

          {/* Chronology by sprint */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>
              Chronologie ({totalReleases} releases)
            </div>
            {grouped.map(([sprintNum, releases]) => (
              <div key={sprintNum ?? "orphan"} style={{ marginBottom: 10 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: "#6366f1", padding: "4px 0",
                  borderBottom: "1px solid #334155", marginBottom: 4,
                }}>
                  {sprintNum ? `Sprint ${sprintNum}` : "Hors sprint"}
                  <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 6 }}>
                    ({releases.length})
                  </span>
                </div>
                {releases.map((r) => (
                  <div key={r.release_id} id={`release-${r.repo_name}-${r.version}`} style={{
                    padding: "4px 0 4px 8px",
                    borderBottom: "1px solid #0f172a", fontSize: 10,
                    transition: "background 0.3s",
                  }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ color: "#64748b", minWidth: 40 }}>
                        {r.release_date ? formatShort(r.release_date) : "—"}
                      </span>
                      {r.release_type && (
                        <span style={{
                          fontSize: 8, fontWeight: 700, padding: "0px 4px", borderRadius: 3,
                          color: TYPE_COLORS[r.release_type] || "#94a3b8",
                        }}>
                          {r.release_type}
                        </span>
                      )}
                      <span style={{ color: "#94a3b8" }}>{r.repo_name?.replace(/^indb-/, "")}</span>
                      <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{r.version}</span>
                    </div>
                    {r.changes && (
                      <div style={{ color: "#94a3b8", marginTop: 2, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                        {r.changes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bugs grouped by bugged version */}
          {projectBugs.length > 0 && (
            <BugsByVersion bugs={projectBugs} />
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
