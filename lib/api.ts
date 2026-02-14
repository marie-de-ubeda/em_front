const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface TeamMonthly {
  month: string;
  [developer: string]: string | number;
}

export interface FixRatio {
  month: string;
  feat: number;
  fix: number;
}

export interface SupportTicket {
  month: string;
  count: number;
}

export interface JiraBreakdown {
  category: string;
  count: number;
}

export interface Developer {
  id: number;
  name: string;
  alias: string;
  is_em: boolean;
}

export interface TypeBreakdown {
  developer_key: string;
  feat: number;
  fix: number;
  refacto: number;
  chore: number;
  total: number;
}

export interface DeveloperProfile {
  developer_key: string;
  display_name: string;
  color: string;
  repos: string[];
  themes: string[];
  type_breakdown: TypeBreakdown;
}

export interface RoadmapProject {
  id: number;
  name: string;
  period: string;
  impact: string;
  type: string;
  leads: string;
  description: string;
  challenges: string;
  result: string;
  sort_order: number;
}

export interface Incident {
  id: number;
  date: string;
  developer_key: string;
  severity: string;
  type: string;
  description: string;
  detail: string;
  jira_ticket: string;
  lesson: string;
}

export interface BaseBranch {
  id: number;
  name: string;
  developer_key: string;
  pr_reference: string;
  repositories: string;
}

export interface Achievement {
  id: number;
  category: string;
  items: string[];
}

export interface CrossContribution {
  id: number;
  release_desc: string;
  credited: string;
  actual: string;
}

export interface BoardSummary {
  total_releases: number;
  total_developers: number;
  total_repositories: number;
  total_incidents: number;
  total_base_branches: number;
  total_pull_requests: number;
  total_tickets: number;
}

export const api = {
  teamMonthly: () => fetchJSON<TeamMonthly[]>("/api/board/team-monthly"),
  fixRatio: () => fetchJSON<FixRatio[]>("/api/board/fix-ratio"),
  supportTickets: () => fetchJSON<SupportTicket[]>("/api/board/support-tickets"),
  jiraBreakdown: () => fetchJSON<JiraBreakdown[]>("/api/board/jira-breakdown"),
  developers: () => fetchJSON<Developer[]>("/api/board/developers"),
  developerProfiles: () => fetchJSON<DeveloperProfile[]>("/api/board/developer-profiles"),
  bigProjects: () => fetchJSON<RoadmapProject[]>("/api/board/big-projects"),
  incidents: () => fetchJSON<Incident[]>("/api/board/incidents"),
  baseBranches: () => fetchJSON<BaseBranch[]>("/api/board/base-branches"),
  achievements: () => fetchJSON<Achievement[]>("/api/board/achievements"),
  crossContributions: () => fetchJSON<CrossContribution[]>("/api/board/cross-contributions"),
  summary: () => fetchJSON<BoardSummary[]>("/api/board/summary"),
};
