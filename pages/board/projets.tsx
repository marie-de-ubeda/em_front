import { useState, useEffect } from "react";
import type { Project, BugFixDetail, ProjectQuality, GanttEntry } from "../../lib/api";
import { api } from "../../lib/api";
import { useBoardFilter } from "../../lib/boardFilterContext";
import V2Layout from "../../components/v2/V2Layout";
import ProjectPortfolioTable from "../../components/v2/projets/ProjectPortfolioTable";
import GanttChart from "../../components/v2/projets/GanttChart";
import DevProjectMatrix from "../../components/v2/projets/DevProjectMatrix";
import ProjectDetailDrawer from "../../components/v2/projets/ProjectDetailDrawer";
import V2MethodologyNote from "../../components/v2/V2MethodologyNote";

interface Data {
  projects: Project[];
  bugFixes: BugFixDetail[];
  projectQuality: ProjectQuality[];
  ganttData: GanttEntry[];
}

const METHODOLOGY = [
  { label: "Statut", description: "Actif si dernière release < 2 mois, Inactif sinon." },
  { label: "Bus factor", description: "Nombre de contributeurs. 1 = rouge (risque), 2 = jaune, 3+ = vert." },
  { label: "Gantt", description: "Barre = span entre première et dernière release d'un (dev, projet) sur la période." },
  { label: "Matrice", description: "Intensité de couleur proportionnelle au nombre de releases par (dev, projet)." },
];

export default function ProjetsPage() {
  const { queryParams, hydrated, sprints } = useBoardFilter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    Promise.all([
      api.projects(queryParams),
      api.bugFixDetail(queryParams),
      api.projectQuality(queryParams),
      api.ganttData(queryParams),
    ]).then(([projects, bugFixes, projectQuality, ganttData]) => {
      setData({ projects, bugFixes, projectQuality, ganttData });
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

  const selectedProjectData = selectedProject ? data.projects.find((p) => p.id === selectedProject) : null;

  return (
    <V2Layout>
      <ProjectPortfolioTable
        projectQuality={data.projectQuality}
        onSelectProject={setSelectedProject}
        selectedProject={selectedProject}
      />
      <GanttChart data={data.ganttData} sprints={sprints} />
      <DevProjectMatrix projectQuality={data.projectQuality} />
      <V2MethodologyNote items={METHODOLOGY} />
      {selectedProjectData && (
        <ProjectDetailDrawer
          project={selectedProjectData}
          bugFixes={data.bugFixes}
          contributors={data.projectQuality.find((q) => q.project_id === selectedProject)?.contributors || []}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </V2Layout>
  );
}
