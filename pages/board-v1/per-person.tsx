import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type { TeamMonthly, DeveloperProfile, Incident, BaseBranch, RepoMatrixEntry } from "../../lib/api";

const TabPerPerson = dynamic(() => import("../../components/board/TabPerPerson"), { ssr: false });

interface Props {
  teamMonthly: TeamMonthly[];
  profiles: DeveloperProfile[];
  incidents: Incident[];
  baseBranches: BaseBranch[];
  repoMatrix: RepoMatrixEntry[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [teamMonthly, profiles, incidents, baseBranches, repoMatrix] = await Promise.all([
    f<TeamMonthly[]>("/api/board/team-monthly"),
    f<DeveloperProfile[]>("/api/board/developer-profiles"),
    f<Incident[]>("/api/board/incidents"),
    f<BaseBranch[]>("/api/board/base-branches"),
    f<RepoMatrixEntry[]>("/api/board/repo-matrix"),
  ]);

  return { props: { teamMonthly, profiles, incidents, baseBranches, repoMatrix } };
};

export default function PerPersonPage({ teamMonthly, profiles, incidents, baseBranches, repoMatrix }: Props) {
  return (
    <BoardLayout>
      <TabPerPerson teamMonthly={teamMonthly} profiles={profiles} incidents={incidents} baseBranches={baseBranches} repoMatrix={repoMatrix} />
    </BoardLayout>
  );
}
