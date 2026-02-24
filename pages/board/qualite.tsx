import { useState, useEffect } from "react";
import type { BugFixDetail, DeveloperProfile, Project } from "../../lib/api";
import { api } from "../../lib/api";
import { useBoardFilter } from "../../lib/boardFilterContext";
import V2Layout from "../../components/v2/V2Layout";
import BugTraceabilityKPIs from "../../components/v2/qualite/BugTraceabilityKPIs";
import TimeToFixBySeverity from "../../components/v2/qualite/TimeToFixBySeverity";
import BugFixMatrix from "../../components/v2/qualite/BugFixMatrix";
import BugFixDetailTable from "../../components/v2/qualite/BugFixDetailTable";
import V2MethodologyNote from "../../components/v2/V2MethodologyNote";

interface Data {
  bugFixes: BugFixDetail[];
  profiles: DeveloperProfile[];
  projects: Project[];
}

const METHODOLOGY = [
  { label: "Bugs", description: "Bugs tracés via release_fixes, avec auteur de la release buggée et fixeur." },
  { label: "Sévérité", description: "Classification saisie manuellement : critical, high, medium, low." },
  { label: "Projet", description: "Projet associé déduit en matchant la version buggée avec les releases de chaque projet." },
  { label: "MV", description: "Nombre de maisons de vente impactées par le bug, saisi manuellement." },
  { label: "Fix moyen", description: "Moyenne des jours entre la date de la release buggée et celle du correctif." },
  { label: "Matrice", description: "Pondérée par sévérité (critical×4, high×3, medium×2, low×1). Diagonale = auto-fix." },
];

export default function QualitePage() {
  const { queryParams, hydrated } = useBoardFilter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    Promise.all([
      api.bugFixDetail(queryParams),
      api.developerProfiles(queryParams),
      api.projects(queryParams),
    ]).then(([bugFixes, profiles, projects]) => {
      setData({ bugFixes, profiles, projects });
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
      <BugTraceabilityKPIs bugFixes={data.bugFixes} profiles={data.profiles} />
      <TimeToFixBySeverity bugFixes={data.bugFixes} />
      <BugFixMatrix bugFixes={data.bugFixes} profiles={data.profiles} />
      <BugFixDetailTable bugFixes={data.bugFixes} projects={data.projects} filterDev={null} />
      <V2MethodologyNote items={METHODOLOGY} />
    </V2Layout>
  );
}
