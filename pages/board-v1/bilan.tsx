import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type { TeamMonthly, JiraBreakdown, Project, BoardSummary } from "../../lib/api";

const TabBilan = dynamic(() => import("../../components/board/TabBilan"), { ssr: false });

interface Props {
  teamMonthly: TeamMonthly[];
  projects: Project[];
  jiraBreakdown: JiraBreakdown[];
  summary: BoardSummary;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [teamMonthly, projects, jiraBreakdown, summary] = await Promise.all([
    f<TeamMonthly[]>("/api/board/team-monthly"),
    f<Project[]>("/api/board/projects"),
    f<JiraBreakdown[]>("/api/board/jira-breakdown"),
    f<BoardSummary>("/api/board/summary"),
  ]);

  return { props: { teamMonthly, projects, jiraBreakdown, summary } };
};

export default function BilanPage({ teamMonthly, projects, jiraBreakdown, summary }: Props) {
  return (
    <BoardLayout>
      <TabBilan
        teamMonthly={teamMonthly}
        projects={projects}
        jiraBreakdown={jiraBreakdown}
        totalReleases={summary.total_releases}
        totalDevelopers={summary.total_developers}
        totalIncidents={summary.total_incidents}
      />
    </BoardLayout>
  );
}
