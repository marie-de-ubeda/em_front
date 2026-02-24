import type { GetServerSideProps } from "next";
import dynamic from "next/dynamic";
import BoardLayout from "../../components/board/BoardLayout";
import type { FixRatio, SupportTicket, Incident, BaseBranch, CrossContribution, BugFixDetail, DeveloperProfile } from "../../lib/api";

const TabQualite = dynamic(() => import("../../components/board/TabQualite"), { ssr: false });

interface Props {
  fixRatio: FixRatio[];
  supportTickets: SupportTicket[];
  incidents: Incident[];
  baseBranches: BaseBranch[];
  crossContributions: CrossContribution[];
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const API = process.env.API_URL || "http://localhost:4000";
  const f = async <T,>(p: string): Promise<T> => {
    const r = await fetch(`${API}${p}`);
    return r.json() as Promise<T>;
  };

  const [fixRatio, supportTickets, incidents, baseBranches, crossContributions, bugFixes, profiles] = await Promise.all([
    f<FixRatio[]>("/api/board/fix-ratio"),
    f<SupportTicket[]>("/api/board/support-tickets"),
    f<Incident[]>("/api/board/incidents"),
    f<BaseBranch[]>("/api/board/base-branches"),
    f<CrossContribution[]>("/api/board/cross-contributions"),
    f<BugFixDetail[]>("/api/board/bug-fix-detail"),
    f<DeveloperProfile[]>("/api/board/developer-profiles"),
  ]);

  return { props: { fixRatio, supportTickets, incidents, baseBranches, crossContributions, bugFixes, profiles } };
};

export default function QualityPage({ fixRatio, supportTickets, incidents, baseBranches, crossContributions, bugFixes, profiles }: Props) {
  return (
    <BoardLayout>
      <TabQualite fixRatio={fixRatio} supportTickets={supportTickets} incidents={incidents} baseBranches={baseBranches} crossContributions={crossContributions} bugFixes={bugFixes} profiles={profiles} />
    </BoardLayout>
  );
}
