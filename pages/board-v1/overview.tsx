import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type {
  TeamMonthly, JiraBreakdown, DeveloperProfile, BoardSummary, ProjectCoverage,
} from "../../lib/api";

const TabOverview = dynamic(() => import("../../components/board/TabOverview"), { ssr: false });

interface Props {
  teamMonthly: TeamMonthly[];
  profiles: DeveloperProfile[];
  jiraBreakdown: JiraBreakdown[];
  summary: BoardSummary;
  projectCoverage: ProjectCoverage;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [teamMonthly, profiles, jiraBreakdown, summary, projectCoverage] = await Promise.all([
    f<TeamMonthly[]>("/api/board/team-monthly"),
    f<DeveloperProfile[]>("/api/board/developer-profiles"),
    f<JiraBreakdown[]>("/api/board/jira-breakdown"),
    f<BoardSummary>("/api/board/summary"),
    f<ProjectCoverage>("/api/board/project-coverage"),
  ]);

  return { props: { teamMonthly, profiles, jiraBreakdown, summary, projectCoverage } };
};

export default function OverviewPage({ teamMonthly, profiles, jiraBreakdown, summary, projectCoverage }: Props) {
  return (
    <BoardLayout>
      <TabOverview
        teamMonthly={teamMonthly}
        profiles={profiles}
        jiraBreakdown={jiraBreakdown}
        totalReleases={summary.total_releases}
        totalIncidents={summary.total_incidents}
        totalBB={summary.total_base_branches}
        totalPRs={summary.total_pull_requests}
        coveragePct={(() => {
          const total = projectCoverage.perDeveloper.reduce((s, d) => s + d.total, 0);
          const assoc = projectCoverage.perDeveloper.reduce((s, d) => s + d.associated, 0);
          return total > 0 ? Math.round((assoc / total) * 100) : 0;
        })()}
      />
    </BoardLayout>
  );
}
