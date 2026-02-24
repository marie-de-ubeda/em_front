import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type { RepoMatrixEntry, ProjectCoverage } from "../../lib/api";

const TabRepos = dynamic(() => import("../../components/board/TabRepos"), { ssr: false });

interface Props {
  repoMatrix: RepoMatrixEntry[];
  projectCoverage: ProjectCoverage;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [repoMatrix, projectCoverage] = await Promise.all([
    f<RepoMatrixEntry[]>("/api/board/repo-matrix"),
    f<ProjectCoverage>("/api/board/project-coverage"),
  ]);

  return { props: { repoMatrix, projectCoverage } };
};

export default function ReposPage({ repoMatrix, projectCoverage }: Props) {
  return (
    <BoardLayout>
      <TabRepos repoMatrix={repoMatrix} projectCoverage={projectCoverage} />
    </BoardLayout>
  );
}
