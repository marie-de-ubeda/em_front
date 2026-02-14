import { useState } from "react";
import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import Chip from "../components/board/Chip";
import type {
  TeamMonthly, FixRatio, SupportTicket, JiraBreakdown,
  DeveloperProfile, RoadmapProject, Incident, BaseBranch,
  Achievement, CrossContribution, BoardSummary,
} from "../lib/api";

// Dynamic imports to avoid SSR issues with recharts
const TabOverview = dynamic(() => import("../components/board/TabOverview"), { ssr: false });
const TabPerPerson = dynamic(() => import("../components/board/TabPerPerson"), { ssr: false });
const TabBilan = dynamic(() => import("../components/board/TabBilan"), { ssr: false });
const TabProjets = dynamic(() => import("../components/board/TabProjets"), { ssr: false });
const TabQualite = dynamic(() => import("../components/board/TabQualite"), { ssr: false });

const TABS = ["Vue d'ensemble", "Par personne", "Bilan", "Projets clés", "Qualité & Incidents"];

interface BoardData {
  teamMonthly: TeamMonthly[];
  fixRatio: FixRatio[];
  supportTickets: SupportTicket[];
  jiraBreakdown: JiraBreakdown[];
  profiles: DeveloperProfile[];
  projects: RoadmapProject[];
  incidents: Incident[];
  baseBranches: BaseBranch[];
  achievements: Achievement[];
  crossContributions: CrossContribution[];
  summary: BoardSummary;
}

export const getServerSideProps: GetServerSideProps<BoardData> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";

  const fetchJSON = async <T,>(path: string): Promise<T> => {
    const res = await fetch(`${API}${path}`);
    return res.json() as Promise<T>;
  };

  const [teamMonthly, fixRatio, supportTickets, jiraBreakdown, profiles, projects, incidents, baseBranches, achievements, crossContributions, summary] = await Promise.all([
    fetchJSON<TeamMonthly[]>("/api/board/team-monthly"),
    fetchJSON<FixRatio[]>("/api/board/fix-ratio"),
    fetchJSON<SupportTicket[]>("/api/board/support-tickets"),
    fetchJSON<JiraBreakdown[]>("/api/board/jira-breakdown"),
    fetchJSON<DeveloperProfile[]>("/api/board/developer-profiles"),
    fetchJSON<RoadmapProject[]>("/api/board/big-projects"),
    fetchJSON<Incident[]>("/api/board/incidents"),
    fetchJSON<BaseBranch[]>("/api/board/base-branches"),
    fetchJSON<Achievement[]>("/api/board/achievements"),
    fetchJSON<CrossContribution[]>("/api/board/cross-contributions"),
    fetchJSON<BoardSummary>("/api/board/summary"),
  ]);

  return {
    props: { teamMonthly, fixRatio, supportTickets, jiraBreakdown, profiles, projects, incidents, baseBranches, achievements, crossContributions, summary },
  };
};

export default function BoardPage(props: BoardData) {
  const [tab, setTab] = useState(0);
  const { teamMonthly, fixRatio, supportTickets, jiraBreakdown, profiles, projects, incidents, baseBranches, achievements, crossContributions, summary } = props;

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#0f172a", color: "#e2e8f0", minHeight: "100vh", padding: 16 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f472b6", margin: 0 }}>Marie de Ubeda</h1>
          <Chip c="#f472b6">Engineering Manager</Chip>
          <Chip c="#818cf8">Individual Contributor</Chip>
        </div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
          Bilan annuel · Janvier 2025 → Février 2026
        </p>
        <p style={{ color: "#475569", fontSize: 10, marginBottom: 16 }}>
          Comptages basés sur le parsing des release notes Slack. Approximatifs (±5%).
        </p>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap", overflowX: "auto" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)}
              style={{ padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: tab === i ? "#6366f1" : "#1e293b", color: tab === i ? "#fff" : "#94a3b8", whiteSpace: "nowrap" }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 0 && (
          <TabOverview
            teamMonthly={teamMonthly}
            profiles={profiles}
            jiraBreakdown={jiraBreakdown}
            totalReleases={summary.total_releases}
            totalIncidents={summary.total_incidents}
            totalBB={summary.total_base_branches}
          />
        )}

        {tab === 1 && (
          <TabPerPerson
            teamMonthly={teamMonthly}
            profiles={profiles}
            incidents={incidents}
            baseBranches={baseBranches}
          />
        )}

        {tab === 2 && (
          <TabBilan
            teamMonthly={teamMonthly}
            achievements={achievements}
            jiraBreakdown={jiraBreakdown}
            totalReleases={summary.total_releases}
            totalDevelopers={summary.total_developers}
            totalIncidents={summary.total_incidents}
          />
        )}

        {tab === 3 && (
          <TabProjets projects={projects} />
        )}

        {tab === 4 && (
          <TabQualite
            fixRatio={fixRatio}
            supportTickets={supportTickets}
            incidents={incidents}
            baseBranches={baseBranches}
            crossContributions={crossContributions}
          />
        )}
      </div>
    </div>
  );
}
