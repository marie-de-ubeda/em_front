import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type { Project } from "../../lib/api";

const TabProjets = dynamic(() => import("../../components/board/TabProjets"), { ssr: false });

interface Props {
  projects: Project[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const res = await fetch(`${API}/api/board/projects`);
  const projects = await res.json() as Project[];
  return { props: { projects } };
};

export default function ProjectsPage({ projects }: Props) {
  return (
    <BoardLayout>
      <TabProjets projects={projects} />
    </BoardLayout>
  );
}
