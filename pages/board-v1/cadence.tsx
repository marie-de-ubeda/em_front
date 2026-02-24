import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type { ReleaseCadence, BugFixDetail, DeveloperProfile } from "../../lib/api";

const TabCadence = dynamic(() => import("../../components/board/TabCadence"), { ssr: false });

interface Props {
  releaseCadence: ReleaseCadence;
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [releaseCadence, bugFixes, profiles] = await Promise.all([
    f<ReleaseCadence>("/api/board/release-cadence"),
    f<BugFixDetail[]>("/api/board/bug-fix-detail"),
    f<DeveloperProfile[]>("/api/board/developer-profiles"),
  ]);

  return { props: { releaseCadence, bugFixes, profiles } };
};

export default function CadencePage({ releaseCadence, bugFixes, profiles }: Props) {
  return (
    <BoardLayout>
      <TabCadence releaseCadence={releaseCadence} bugFixes={bugFixes} profiles={profiles} />
    </BoardLayout>
  );
}
