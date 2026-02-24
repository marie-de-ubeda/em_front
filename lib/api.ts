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

export interface QualityStats {
  bugs_introduced: number;
  rollbacks: number;
  fix_ratio: number;
  avg_time_to_fix_days: number | null;
  fixes_for_others: Record<string, number>;
  fixed_by_others: Record<string, number>;
  severity_breakdown: Record<string, number>;
  total_impact_users: number;
  critical_bugs: number;
  high_bugs: number;
}

export interface DeveloperProfile {
  developer_key: string;
  display_name: string;
  color: string;
  is_em: boolean;
  repos: string[];
  themes: string[];
  type_breakdown: TypeBreakdown;
  quality_stats: QualityStats;
}

export interface ProjectLead {
  developer_key: string;
  display_name: string;
}

export interface ProjectRelease {
  release_id: number;
  version: string;
  release_date: string | null;
  release_type: string | null;
  changes: string | null;
  repo_name: string;
  sprint_number: number | null;
}

export interface Project {
  id: number;
  name: string;
  is_roadmap: boolean;
  is_archived: boolean;
  period: string | null;
  impact: string | null;
  type: string | null;
  description: string | null;
  challenges: string | null;
  result: string | null;
  ai_summary: string | null;
  sort_order: number;
  leads: ProjectLead[];
  releases: ProjectRelease[];
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

// Keep RoadmapProject as alias for backward compat
export type RoadmapProject = Project;

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

// --- New board types ---

export interface RepoMatrixEntry {
  developer_key: string;
  display_name: string;
  color: string;
  repo_name: string;
  release_count: number;
}

export interface ProjectCoverageDevEntry {
  display_name: string;
  developer_key: string;
  color: string;
  total: number;
  associated: number;
  orphan: number;
  coverage_pct: number;
}

export interface ProjectCoverageMonthEntry {
  month: string;
  total: number;
  associated: number;
  orphan: number;
  coverage_pct: number;
}

export interface ProjectCoverage {
  perDeveloper: ProjectCoverageDevEntry[];
  monthly: ProjectCoverageMonthEntry[];
  topOrphanRepos: { repo_name: string; orphan_count: number }[];
}

export interface ReleaseCadence {
  dayOfWeek: { day: string; count: number }[];
  weekly: { week_start: string; count: number }[];
  avgPerWeek: number;
}

export interface BugFixDetail {
  id: number;
  fix_release_id: number;
  bugged_release_id: number;
  fix_version: string;
  fix_date: string | null;
  fix_release_url: string | null;
  fix_repo: string;
  fixer_key: string;
  fixer_name: string;
  fixer_color: string;
  bugged_version: string;
  bugged_date: string | null;
  bugged_release_url: string | null;
  bugged_repo: string;
  author_key: string;
  author_name: string;
  author_color: string;
  days_to_fix: number | null;
  severity: string | null;
  impact_users: number | null;
  impact_description: string | null;
  detected_by: string | null;
  environment: string | null;
  bugged_changes: string | null;
  fix_changes: string | null;
  bugged_tickets: { key: string; url: string }[];
  fix_tickets: { key: string; url: string }[];
  project_ids: number[];
}

export interface QuarterlyEntry {
  quarter: string;
  total: number;
  feat: number;
  fix: number;
  refacto: number;
  chore: number;
}

export interface QuarterlyDevEntry {
  quarter: string;
  developer_key: string;
  display_name: string;
  color: string;
  count: number;
}

export interface QuarterlyData {
  quarters: QuarterlyEntry[];
  perDeveloper: QuarterlyDevEntry[];
}

// --- V2 board types ---

export interface DeveloperQualityTrend {
  developer_key: string;
  display_name: string;
  color: string;
  quarter: string;
  releases_count: number;
  bugs_introduced: number;
  bug_rate: number;
  severity_weighted: number;
  total_impact_users: number;
  fixes_for_others: number;
}

export interface ProjectQualityContributor {
  developer_key: string;
  display_name: string;
  color: string;
  release_count: number;
  bug_count: number;
}

export interface ProjectQuality {
  project_id: number;
  project_name: string;
  type: string | null;
  impact: string | null;
  is_roadmap: boolean;
  first_release_date: string | null;
  total_releases: number;
  total_bugs: number;
  bug_rate: number;
  critical_high_bugs: number;
  total_impact_users: number;
  last_release_date: string | null;
  last_bug_date: string | null;
  contributors: ProjectQualityContributor[];
}

// --- Sprint types ---

export interface Sprint {
  id: number;
  number: number;
  start_date: string;
  end_date: string;
}

export interface SprintDevBreakdown {
  developer_key: string;
  display_name: string;
  color: string;
  total: number;
  feat: number;
  fix: number;
  refacto: number;
  chore: number;
  bugs: number;
}

export interface SprintMetrics {
  sprint_number: number;
  start_date: string;
  end_date: string;
  total_releases: number;
  feat: number;
  fix: number;
  refacto: number;
  chore: number;
  bugs: number;
  bug_rate: number;
  critical_bugs: number;
  total_impact_users: number;
  rollbacks: number;
  per_developer: SprintDevBreakdown[];
}

// --- Gantt types ---

export interface GanttEntry {
  developer_key: string;
  display_name: string;
  dev_color: string;
  project_id: number;
  project_name: string;
  is_roadmap: boolean;
  first_release_date: string | null;
  project_color: string;
  sprint_id: number | null;
  sprint_number: number | null;
  sprint_start: string | null;
  sprint_end: string | null;
  release_count: number;
}

export interface GanttRelease {
  release_id: number;
  version: string;
  release_date: string | null;
  release_type: string | null;
  release_url: string | null;
  changes: string | null;
  repo_name: string;
  developer_key: string;
  display_name: string;
  dev_color: string;
  sprint_number: number | null;
  tickets: { key: string; url: string }[];
  pull_requests: { number: number; title: string }[];
  project_ids: number[];
}

// --- Sprint-Project Matrix types ---

export interface SprintProjectEntry {
  releases: number;
  bugs: number;
  feat: number;
  fix: number;
  refacto: number;
  chore: number;
}

export interface SprintProjectRow {
  sprint_number: number;
  start_date: string;
  end_date: string;
  total_releases: number;
  total_bugs: number;
  by_project: Record<string, SprintProjectEntry>;
  orphan: SprintProjectEntry;
}

export interface SprintProjectMatrix {
  projects: { id: number; name: string; is_roadmap: boolean }[];
  matrix: SprintProjectRow[];
}

// --- Admin types ---

export interface AdminMeta {
  developers: { id: number; display_name: string; developer_key: string; alias: string | null }[];
  repositories: { id: number; name: string }[];
  releases: { id: number; version: string; release_date: string; changes: string | null; repo_name: string | null }[];
  baseBranches: { id: number; name: string }[];
  projects: { id: number; name: string; is_roadmap: boolean }[];
}

async function fetchJSONWithBody<T>(path: string, opts: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const adminApi = {
  meta: () => fetchJSON<AdminMeta>("/api/admin/meta"),
  list: (table: string) => fetchJSON<Record<string, unknown>[]>(`/api/admin/${table}`),
  create: (table: string, data: Record<string, unknown>) =>
    fetchJSONWithBody<Record<string, unknown>>(`/api/admin/${table}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  batchUpdate: (table: string, rows: Record<string, unknown>[]) =>
    fetchJSONWithBody<Record<string, unknown>[]>(`/api/admin/batch/${table}`, {
      method: "PUT",
      body: JSON.stringify({ rows }),
    }),
  update: (table: string, id: number, data: Record<string, unknown>) =>
    fetchJSONWithBody<Record<string, unknown>>(`/api/admin/${table}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  remove: (table: string, id: number) =>
    fetchJSONWithBody<void>(`/api/admin/${table}/${id}`, { method: "DELETE" }),
};

export const api = {
  teamMonthly: (p = "") => fetchJSON<TeamMonthly[]>(`/api/board/team-monthly${p}`),
  fixRatio: (p = "") => fetchJSON<FixRatio[]>(`/api/board/fix-ratio${p}`),
  supportTickets: () => fetchJSON<SupportTicket[]>("/api/board/support-tickets"),
  jiraBreakdown: () => fetchJSON<JiraBreakdown[]>("/api/board/jira-breakdown"),
  developers: () => fetchJSON<Developer[]>("/api/board/developers"),
  developerProfiles: (p = "") => fetchJSON<DeveloperProfile[]>(`/api/board/developer-profiles${p}`),
  projects: (p = "") => fetchJSON<Project[]>(`/api/board/projects${p}`),
  incidents: (p = "") => fetchJSON<Incident[]>(`/api/board/incidents${p}`),
  baseBranches: () => fetchJSON<BaseBranch[]>("/api/board/base-branches"),
  generateSummary: (projectId: number) =>
    fetchJSONWithBody<{ ai_summary: string }>(`/api/board/projects/${projectId}/generate-summary`, {
      method: "POST",
    }),
  crossContributions: () => fetchJSON<CrossContribution[]>("/api/board/cross-contributions"),
  summary: (p = "") => fetchJSON<BoardSummary[]>(`/api/board/summary${p}`),
  repoMatrix: (p = "") => fetchJSON<RepoMatrixEntry[]>(`/api/board/repo-matrix${p}`),
  projectCoverage: (p = "") => fetchJSON<ProjectCoverage>(`/api/board/project-coverage${p}`),
  releaseCadence: (p = "") => fetchJSON<ReleaseCadence>(`/api/board/release-cadence${p}`),
  bugFixDetail: (p = "") => fetchJSON<BugFixDetail[]>(`/api/board/bug-fix-detail${p}`),
  quarterly: (p = "") => fetchJSON<QuarterlyData>(`/api/board/quarterly${p}`),
  analyzeTab: (tab: string, data: object) =>
    fetchJSONWithBody<{ analysis: string }>("/api/board/analyze-tab", {
      method: "POST",
      body: JSON.stringify({ tab, data }),
    }),
  developerQualityTrend: (p = "") => fetchJSON<DeveloperQualityTrend[]>(`/api/board/developer-quality-trend${p}`),
  projectQuality: (p = "") => fetchJSON<ProjectQuality[]>(`/api/board/project-quality${p}`),
  sprints: () => fetchJSON<Sprint[]>("/api/board/sprints"),
  sprintMetrics: (p = "") => fetchJSON<SprintMetrics[]>(`/api/board/sprint-metrics${p}`),
  sprintProjectMatrix: (p = "") => fetchJSON<SprintProjectMatrix>(`/api/board/sprint-project-matrix${p}`),
  ganttData: (p = "") => fetchJSON<GanttEntry[]>(`/api/board/gantt-data${p}`),
  ganttReleases: (p: string) => fetchJSON<GanttRelease[]>(`/api/board/gantt-releases${p}`),
};

