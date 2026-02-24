import { useState, useEffect } from "react";
import type {
  TeamMonthly, DeveloperProfile, BoardSummary, ProjectCoverage,
  BugFixDetail, SprintMetrics, RepoMatrixEntry, ProjectQuality,
} from "../../lib/api";
import { api } from "../../lib/api";
import { useBoardFilter } from "../../lib/boardFilterContext";
import V2Layout from "../../components/v2/V2Layout";
import OverviewKPIBar from "../../components/v2/overview/OverviewKPIBar";
import ActivityVelocityChart from "../../components/v2/overview/ActivityVelocityChart";
import QualityScorecard from "../../components/v2/overview/QualityScorecard";
import RepoOwnershipMap from "../../components/v2/overview/RepoOwnershipMap";
import V2MethodologyNote from "../../components/v2/V2MethodologyNote";

interface Data {
  teamMonthly: TeamMonthly[];
  profiles: DeveloperProfile[];
  summary: BoardSummary;
  coverage: ProjectCoverage;
  bugFixes: BugFixDetail[];
  sprintMetrics: SprintMetrics[];
  repoMatrix: RepoMatrixEntry[];
  projectQuality: ProjectQuality[];
}

const METHODOLOGY = [
  { label: "Releases", description: "Nombre total de releases par développeur, toutes branches confondues." },
  { label: "Bug rate", description: "Bugs introduits / nombre total de releases (%)." },
  { label: "Fréq. deploy", description: "Releases par semaine sur la période sélectionnée (métrique DORA)." },
  { label: "Focus", description: "Nombre de projets distincts par développeur sur la période. ≤2 = focalisé, 5+ = trop dispersé." },
  { label: "Bus factor", description: "Nombre de contributeurs par projet. 1 = risque (une seule personne connaît le code)." },
  { label: "Ownership", description: "Développeur avec >50% des releases d'un repository." },
  { label: "Sparklines", description: "Mini courbes montrant l'évolution sur les 5 derniers sprints." },
];

export default function OverviewPage() {
  const { queryParams, hydrated } = useBoardFilter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    Promise.all([
      api.teamMonthly(queryParams),
      api.developerProfiles(queryParams),
      api.summary(queryParams),
      api.projectCoverage(queryParams),
      api.bugFixDetail(queryParams),
      api.sprintMetrics(queryParams),
      api.repoMatrix(queryParams),
      api.projectQuality(queryParams),
    ]).then(([teamMonthly, profiles, summary, coverage, bugFixes, sprintMetrics, repoMatrix, projectQuality]) => {
      setData({
        teamMonthly, profiles,
        summary: Array.isArray(summary) ? summary[0] : summary,
        coverage, bugFixes, sprintMetrics, repoMatrix, projectQuality,
      });
      setLoading(false);
    });
  }, [queryParams, hydrated]);

  if (loading || !data) {
    return (
      <V2Layout>
        <div style={{ padding: "40px 0", textAlign: "center", color: "#64748b", fontSize: 12 }}>Chargement…</div>
      </V2Layout>
    );
  }

  return (
    <V2Layout>
      <OverviewKPIBar
        summary={data.summary}
        profiles={data.profiles}
        coverage={data.coverage}
        bugFixes={data.bugFixes}
        sprintMetrics={data.sprintMetrics}
        projectQuality={data.projectQuality}
      />
      <ActivityVelocityChart
        teamMonthly={data.teamMonthly}
        sprintMetrics={data.sprintMetrics}
        profiles={data.profiles}
      />
      <QualityScorecard profiles={data.profiles} projectQuality={data.projectQuality} />
      <RepoOwnershipMap repoMatrix={data.repoMatrix} />
      <V2MethodologyNote items={METHODOLOGY} />
    </V2Layout>
  );
}
