import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type {
  QuarterlyData, Project, Incident, BoardSummary, ProjectCoverage, DeveloperProfile,
} from "../../lib/api";

const TabCodir = dynamic(() => import("../../components/board/TabCodir"), { ssr: false });

interface Props {
  quarterly: QuarterlyData;
  projects: Project[];
  incidents: Incident[];
  summary: BoardSummary;
  projectCoverage: ProjectCoverage;
  profiles: DeveloperProfile[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [quarterly, projects, incidents, summary, projectCoverage, profiles] = await Promise.all([
    f<QuarterlyData>("/api/board/quarterly"),
    f<Project[]>("/api/board/projects"),
    f<Incident[]>("/api/board/incidents"),
    f<BoardSummary>("/api/board/summary"),
    f<ProjectCoverage>("/api/board/project-coverage"),
    f<DeveloperProfile[]>("/api/board/developer-profiles"),
  ]);

  return { props: { quarterly, projects, incidents, summary, projectCoverage, profiles } };
};

export default function CodirPage({ quarterly, projects, incidents, summary, projectCoverage, profiles }: Props) {
  return (
    <BoardLayout>
      <TabCodir quarterly={quarterly} projects={projects} incidents={incidents} summary={summary} projectCoverage={projectCoverage} profiles={profiles} />
    </BoardLayout>
  );
}
