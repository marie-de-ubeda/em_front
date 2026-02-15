import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import type { ColDef } from "ag-grid-community";
import type { AdminMeta } from "../lib/api";
import { adminApi } from "../lib/api";
import type { TableRelation } from "../components/admin/DetailDrawer";

const AdminGrid = dynamic(() => import("../components/admin/AdminGrid"), { ssr: false });
const DetailDrawer = dynamic(() => import("../components/admin/DetailDrawer"), { ssr: false });

type Row = Record<string, unknown>;

// Developer colors (from developer profiles)
const DEV_COLORS: Record<string, string> = {
  VL: "#34d399", PB: "#f472b6", PD: "#818cf8",
  PLM: "#fbbf24", PED: "#60a5fa", MdU: "#f87171",
};

const TYPE_COLORS: Record<string, string> = { feat: "#818cf8", fix: "#fbbf24", refacto: "#fb923c", chore: "#94a3b8" };
const TYPE_OPTIONS = ["feat", "fix", "refacto", "chore"];

// Stable color for repository names via simple hash
const REPO_PALETTE = ["#818cf8", "#34d399", "#fbbf24", "#f472b6", "#60a5fa", "#fb923c", "#f87171", "#94a3b8", "#a78bfa", "#38bdf8"];
function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return REPO_PALETTE[Math.abs(h) % REPO_PALETTE.length];
}

// Format ISO date to dd/mm/yy
function formatDateDMY(val: unknown): string {
  if (!val) return "";
  const s = String(val);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s.slice(0, 10);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

interface ReleaseFilters {
  year: string;
  month: string;
  developerId: string;
  repositoryId: string;
  releaseType: string;
  projectId: string;
  search: string;
}

const DEFAULT_RELEASE_FILTERS: ReleaseFilters = { year: "all", month: "all", developerId: "all", repositoryId: "all", releaseType: "all", projectId: "all", search: "" };

interface TableGroup {
  label: string;
  tables: { key: string; label: string }[];
}

const TABLE_GROUPS: TableGroup[] = [
  {
    label: "Core Data",
    tables: [
      { key: "releases", label: "Releases" },
      { key: "pull_requests", label: "Pull Requests" },
      { key: "tickets", label: "Tickets" },
    ],
  },
  {
    label: "Reference",
    tables: [
      { key: "developers", label: "Developers" },
      { key: "repositories", label: "Repositories" },
    ],
  },
  {
    label: "Board",
    tables: [
      { key: "projects", label: "Projects" },
      { key: "incidents", label: "Incidents" },
      { key: "base_branches", label: "Base Branches" },
      { key: "cross_contributions", label: "Cross Contributions" },
    ],
  },
  {
    label: "Junctions",
    tables: [
      { key: "developer_repositories", label: "Dev-Repos" },
      { key: "base_branch_developers", label: "BB-Devs" },
      { key: "release_projects", label: "Release-Projects" },
      { key: "project_developers", label: "Project-Devs" },
      { key: "release_fixes", label: "Release-Fixes" },
    ],
  },
];

const SEVERITY_OPTIONS = ["high", "medium", "low"];
const IMPACT_OPTIONS = ["high", "medium", "low"];

const TABLE_RELATIONS: Record<string, TableRelation[]> = {
  releases: [
    { label: "Pull Requests", table: "pull_requests", foreignKey: "release_id", columns: ["number", "title"] },
    { label: "Tickets", table: "tickets", foreignKey: "release_id", columns: ["key", "url"] },
    { label: "Projects", table: "release_projects", foreignKey: "release_id", columns: ["project_id"] },
    { label: "Corrige les bugs de", table: "release_fixes", foreignKey: "fix_release_id", columns: ["bugged_release_id"] },
    { label: "Bugs corrigés par", table: "release_fixes", foreignKey: "bugged_release_id", columns: ["fix_release_id"] },
  ],
  developers: [
    { label: "Releases", table: "releases", foreignKey: "developer_id", columns: ["version", "release_date", "repository_id"] },
    { label: "Incidents", table: "incidents", foreignKey: "developer_id", columns: ["date", "severity", "description"] },
    { label: "Repositories", table: "developer_repositories", foreignKey: "developer_id", columns: ["repository_id"] },
    { label: "Base Branches", table: "base_branch_developers", foreignKey: "developer_id", columns: ["base_branch_id"] },
  ],
  repositories: [
    { label: "Releases", table: "releases", foreignKey: "repository_id", columns: ["version", "release_date", "developer_id"] },
    { label: "Developers", table: "developer_repositories", foreignKey: "repository_id", columns: ["developer_id"] },
  ],
  projects: [
    { label: "Releases", table: "release_projects", foreignKey: "project_id", columns: ["release_id"] },
    { label: "Developers", table: "project_developers", foreignKey: "project_id", columns: ["developer_id"] },
  ],
  incidents: [],
  base_branches: [
    { label: "Developers", table: "base_branch_developers", foreignKey: "base_branch_id", columns: ["developer_id"] },
  ],
};

function releaseLabel(r: { version: string; release_date: string; changes: string | null; repo_name: string | null }): string {
  const repo = r.repo_name ? r.repo_name.replace(/^indb-/, "") : "";
  const date = r.release_date?.slice(0, 10) ?? "";
  const preview = r.changes ? r.changes.split(/\s+/).slice(0, 10).join(" ") : "";
  const truncated = preview.length < (r.changes?.length ?? 0) ? `${preview}...` : preview;
  return [repo, r.version, date ? `(${date})` : "", truncated].filter(Boolean).join(" ");
}

function getColumnDefs(table: string, meta: AdminMeta | null, releaseProjectMap?: Map<number, number[]>): ColDef[] {
  const devDropdown: Partial<ColDef> = meta ? {
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: meta.developers.map((d) => d.id) },
    valueFormatter: (p) => {
      const dev = meta.developers.find((d) => d.id === Number(p.value));
      return dev ? dev.display_name : String(p.value ?? "");
    },
  } : {};

  const repoDropdown: Partial<ColDef> = meta ? {
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: meta.repositories.map((r) => r.id) },
    valueFormatter: (p) => {
      const repo = meta.repositories.find((r) => r.id === Number(p.value));
      return repo ? repo.name : String(p.value ?? "");
    },
  } : {};

  const releaseDropdown: Partial<ColDef> = meta ? {
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: meta.releases.map((r) => r.id) },
    valueFormatter: (p) => {
      const rel = meta.releases.find((r) => r.id === Number(p.value));
      return rel ? releaseLabel(rel) : String(p.value ?? "");
    },
  } : {};

  const bbDropdown: Partial<ColDef> = meta ? {
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: meta.baseBranches.map((b) => b.id) },
    valueFormatter: (p) => {
      const bb = meta.baseBranches.find((b) => b.id === Number(p.value));
      return bb ? bb.name : String(p.value ?? "");
    },
  } : {};

  const projectDropdown: Partial<ColDef> = meta ? {
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: meta.projects.map((p) => p.id) },
    valueFormatter: (p) => {
      const proj = meta.projects.find((pr) => pr.id === Number(p.value));
      return proj ? `${proj.name}${proj.is_roadmap ? " (R)" : ""}` : String(p.value ?? "");
    },
  } : {};

  const idCol: ColDef = { field: "id", editable: false, maxWidth: 70, sort: "asc" };

  switch (table) {
    case "releases":
      return [
        { field: "version", maxWidth: 100, flex: 0 },
        {
          field: "release_type", headerName: "Type", maxWidth: 70, filter: false,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: TYPE_OPTIONS },
          cellRenderer: (p: { value: unknown }) => {
            const t = String(p.value ?? "");
            const color = TYPE_COLORS[t] || "#94a3b8";
            return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, color }}>{t}</span>;
          },
        },
        { field: "is_rollback", headerName: "Rollback", maxWidth: 80, filter: false },
        {
          field: "release_date", headerName: "Date", maxWidth: 90, sort: "desc" as const, filter: false,
          valueFormatter: (p) => formatDateDMY(p.value),
        },
        {
          field: "developer_id", headerName: "Dev", maxWidth: 110, filter: false,
          ...devDropdown,
          cellRenderer: meta ? (p: { value: unknown }) => {
            const dev = meta.developers.find((d) => d.id === Number(p.value));
            if (!dev) return String(p.value ?? "");
            const color = DEV_COLORS[dev.developer_key] || "#94a3b8";
            return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />{dev.developer_key}</span>;
          } : undefined,
        },
        {
          field: "repository_id", headerName: "Repo", maxWidth: 120, filter: false,
          ...repoDropdown,
          cellRenderer: meta ? (p: { value: unknown }) => {
            const repo = meta.repositories.find((r) => r.id === Number(p.value));
            if (!repo) return String(p.value ?? "");
            const color = hashColor(repo.name);
            const short = repo.name.replace(/^indb-/, "");
            return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: color, flexShrink: 0 }} />{short}</span>;
          } : undefined,
        },
        {
          field: "changes", flex: 3, minWidth: 120, tooltipField: "changes",
          cellEditor: "agLargeTextCellEditor", cellEditorPopup: true,
        },
        {
          field: "_projects", headerName: "Projects", minWidth: 100, maxWidth: 200, editable: false, sortable: false, filter: false,
          valueGetter: (p) => {
            if (!meta || !releaseProjectMap) return "";
            const pids = releaseProjectMap.get(p.data?.id as number) || [];
            return pids.map((pid) => meta.projects.find((pr) => pr.id === pid)?.name ?? "").filter(Boolean).join(", ");
          },
          cellRenderer: (p: { data: Row }) => {
            if (!meta || !releaseProjectMap) return null;
            const pids = releaseProjectMap.get(p.data?.id as number) || [];
            if (pids.length === 0) return <span style={{ color: "#475569", fontSize: 9 }}>—</span>;
            return (
              <span style={{ display: "inline-flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
                {pids.map((pid) => {
                  const proj = meta.projects.find((pr) => pr.id === pid);
                  if (!proj) return null;
                  const color = hashColor(proj.name);
                  return (
                    <span key={pid} style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "0px 5px", borderRadius: 8, fontSize: 9, fontWeight: 600,
                      background: `${color}22`, color, whiteSpace: "nowrap", lineHeight: "16px",
                    }}>
                      {proj.name}
                    </span>
                  );
                })}
              </span>
            );
          },
        },
      ];
    case "pull_requests":
      return [
        idCol,
        { field: "release_id", headerName: "Release", minWidth: 200, ...releaseDropdown },
        { field: "number", maxWidth: 90 },
        { field: "title", minWidth: 300 },
      ];
    case "tickets":
      return [
        idCol,
        { field: "release_id", headerName: "Release", minWidth: 200, ...releaseDropdown },
        { field: "key", minWidth: 140 },
        { field: "url", minWidth: 200 },
      ];
    case "developers":
      return [
        idCol,
        { field: "name", minWidth: 140 },
        { field: "alias", minWidth: 100 },
        { field: "developer_key", headerName: "Key", maxWidth: 80 },
        { field: "display_name", minWidth: 120 },
        { field: "color", maxWidth: 90 },
        {
          field: "themes", minWidth: 200,
          valueFormatter: (p) => {
            const v = p.value;
            if (Array.isArray(v)) return v.join(", ");
            if (typeof v === "string") { try { return JSON.parse(v).join(", "); } catch { return v; } }
            return String(v ?? "");
          },
          cellEditor: "agLargeTextCellEditor", cellEditorPopup: true,
          valueParser: (p) => { try { return JSON.parse(p.newValue); } catch { return p.newValue; } },
        },
        { field: "is_em", maxWidth: 70 },
        { field: "type_feat", headerName: "Feat", maxWidth: 70, editable: false },
        { field: "type_fix", headerName: "Fix", maxWidth: 70, editable: false },
        { field: "type_refacto", headerName: "Refacto", maxWidth: 80, editable: false },
        { field: "type_chore", headerName: "Chore", maxWidth: 80, editable: false },
        { field: "type_total", headerName: "Total", maxWidth: 70, editable: false },
      ];
    case "repositories":
      return [
        idCol,
        { field: "name", minWidth: 200 },
        { field: "github_url", minWidth: 300 },
      ];
    case "projects":
      return [
        { field: "name", minWidth: 160, sort: "asc" as const },
        { field: "is_roadmap", headerName: "Roadmap", maxWidth: 90 },
        { field: "period", minWidth: 100 },
        {
          field: "impact", maxWidth: 100,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: IMPACT_OPTIONS },
        },
        {
          field: "type", minWidth: 120,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: ["Produit", "Tech", "Dette technique"] },
        },
        { field: "description", minWidth: 200, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
        { field: "challenges", minWidth: 200, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
        { field: "result", minWidth: 200, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
        { field: "ai_summary", headerName: "Résumé IA", minWidth: 250, editable: false, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      ];
    case "incidents":
      return [
        idCol,
        { field: "date", minWidth: 110 },
        { field: "developer_id", headerName: "Developer", minWidth: 140, ...devDropdown },
        {
          field: "severity", maxWidth: 100,
          cellEditor: "agSelectCellEditor",
          cellEditorParams: { values: SEVERITY_OPTIONS },
          cellStyle: (p) => {
            const colors: Record<string, string> = { high: "#f87171", medium: "#fbbf24", low: "#34d399" };
            return { color: colors[p.value as string] || "#e2e8f0" };
          },
        },
        { field: "type", minWidth: 100 },
        { field: "description", minWidth: 200, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
        { field: "detail", minWidth: 200, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
        { field: "jira_ticket", minWidth: 120 },
        { field: "lesson", minWidth: 200, cellEditor: "agLargeTextCellEditor", cellEditorPopup: true },
      ];
    case "base_branches":
      return [
        idCol,
        { field: "name", minWidth: 200 },
        { field: "pr_reference", minWidth: 120 },
        { field: "repositories", minWidth: 200 },
      ];
    case "cross_contributions":
      return [
        idCol,
        { field: "release_desc", headerName: "Release", minWidth: 200 },
        { field: "credited", minWidth: 140 },
        { field: "actual", minWidth: 140 },
      ];
    case "developer_repositories":
      return [
        idCol,
        { field: "developer_id", headerName: "Developer", minWidth: 160, ...devDropdown },
        { field: "repository_id", headerName: "Repository", minWidth: 200, ...repoDropdown },
      ];
    case "base_branch_developers":
      return [
        idCol,
        { field: "base_branch_id", headerName: "Base Branch", minWidth: 200, ...bbDropdown },
        { field: "developer_id", headerName: "Developer", minWidth: 160, ...devDropdown },
      ];
    case "release_projects":
      return [
        idCol,
        { field: "release_id", headerName: "Release", minWidth: 200, ...releaseDropdown },
        { field: "project_id", headerName: "Project", minWidth: 200, ...projectDropdown },
      ];
    case "project_developers":
      return [
        idCol,
        { field: "project_id", headerName: "Project", minWidth: 200, ...projectDropdown },
        { field: "developer_id", headerName: "Developer", minWidth: 160, ...devDropdown },
      ];
    case "release_fixes":
      return [
        idCol,
        { field: "fix_release_id", headerName: "Fix Release", minWidth: 250, ...releaseDropdown },
        { field: "bugged_release_id", headerName: "Bugged Release", minWidth: 250, ...releaseDropdown },
      ];
    default:
      return [idCol];
  }
}

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveLocal(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export default function AdminPage() {
  const [table, setTable] = useState("releases");
  const [meta, setMeta] = useState<AdminMeta | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [releaseFilters, setReleaseFiltersRaw] = useState<ReleaseFilters>(DEFAULT_RELEASE_FILTERS);
  const [hydrated, setHydrated] = useState(false);

  // Restore persisted state after hydration to avoid SSR mismatch
  useEffect(() => {
    const savedTable = loadLocal("admin:table", "releases");
    const savedFilters = loadLocal("admin:releaseFilters", DEFAULT_RELEASE_FILTERS);
    setTable(savedTable);
    setReleaseFiltersRaw(savedFilters);
    setHydrated(true);
  }, []);
  const setReleaseFilters: typeof setReleaseFiltersRaw = useCallback((v) => {
    setReleaseFiltersRaw((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      saveLocal("admin:releaseFilters", next);
      return next;
    });
  }, []);
  // Map: releaseId → project ids for the releases view
  const [releaseProjectMap, setReleaseProjectMap] = useState<Map<number, number[]>>(new Map());
  // Checkbox selection for bulk project association
  const [checkedReleaseIds, setCheckedReleaseIds] = useState<number[]>([]);
  const [bulkProjectId, setBulkProjectId] = useState<string>("");

  useEffect(() => {
    adminApi.meta().then(setMeta).catch((e) => setError(e.message));
  }, []);

  // Load release_projects junction when viewing releases
  const loadReleaseProjects = useCallback(async () => {
    const rps = await adminApi.list("release_projects");
    const map = new Map<number, number[]>();
    for (const rp of rps) {
      const rid = rp.release_id as number;
      const pid = rp.project_id as number;
      if (!map.has(rid)) map.set(rid, []);
      map.get(rid)!.push(pid);
    }
    setReleaseProjectMap(map);
  }, []);

  const loadTable = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.list(t);
      setRows(data);
      if (t === "releases") await loadReleaseProjects();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [loadReleaseProjects]);

  useEffect(() => {
    if (hydrated) loadTable(table);
  }, [table, loadTable, hydrated]);

  const handleSave = useCallback(async (changed: Row[]) => {
    await adminApi.batchUpdate(table, changed);
    await loadTable(table);
  }, [table, loadTable]);

  const handleAdd = useCallback(() => {
    // Open drawer in create mode with an empty row (no id)
    setSelectedRow({});
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    await adminApi.remove(table, id);
    await loadTable(table);
  }, [table, loadTable]);

  const handleRefresh = useCallback(() => {
    loadTable(table);
  }, [table, loadTable]);

  const handleBulkLinkProject = useCallback(async () => {
    if (!bulkProjectId || checkedReleaseIds.length === 0) return;
    const projectId = Number(bulkProjectId);
    try {
      for (const releaseId of checkedReleaseIds) {
        // Skip if already linked
        const existing = releaseProjectMap.get(releaseId) || [];
        if (existing.includes(projectId)) continue;
        await adminApi.create("release_projects", { release_id: releaseId, project_id: projectId });
      }
      await loadReleaseProjects();
      setCheckedReleaseIds([]);
      setBulkProjectId("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [bulkProjectId, checkedReleaseIds, releaseProjectMap, loadReleaseProjects]);

  const columnDefs = getColumnDefs(table, meta, releaseProjectMap);
  const drawerColumns = useMemo(() => columnDefs.map((c) => c.field).filter((f): f is string => !!f), [columnDefs]);
  const currentLabel = TABLE_GROUPS.flatMap((g) => g.tables).find((t) => t.key === table)?.label ?? table;

  // Release filters: extract available years + apply filters
  const availableYears = useMemo(() => {
    if (table !== "releases") return [];
    const years = new Set<string>();
    for (const r of rows) {
      const d = String(r.release_date ?? "");
      if (d.length >= 4) years.add(d.slice(0, 4));
    }
    return Array.from(years).sort();
  }, [rows, table]);

  const filteredRows = useMemo(() => {
    if (table !== "releases") return rows;
    return rows.filter((r) => {
      const d = String(r.release_date ?? "");
      if (releaseFilters.year !== "all" && !d.startsWith(releaseFilters.year)) return false;
      if (releaseFilters.month !== "all") {
        const m = new Date(d).getMonth() + 1;
        if (String(m) !== releaseFilters.month) return false;
      }
      if (releaseFilters.developerId !== "all" && String(r.developer_id) !== releaseFilters.developerId) return false;
      if (releaseFilters.repositoryId !== "all" && String(r.repository_id) !== releaseFilters.repositoryId) return false;
      if (releaseFilters.releaseType !== "all" && String(r.release_type) !== releaseFilters.releaseType) return false;
      if (releaseFilters.search) {
        const q = releaseFilters.search.toLowerCase();
        const haystack = `${r.version ?? ""} ${r.changes ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (releaseFilters.projectId !== "all") {
        const pids = releaseProjectMap.get(r.id as number) || [];
        if (releaseFilters.projectId === "none") {
          if (pids.length > 0) return false;
        } else {
          if (!pids.includes(Number(releaseFilters.projectId))) return false;
        }
      }
      return true;
    });
  }, [rows, table, releaseFilters, releaseProjectMap]);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#000f25", color: "#f1faee", fontFamily: "system-ui, sans-serif", "--color-live": "#be0a25" } as React.CSSProperties}>
      {/* Sidebar */}
      {sidebarOpen && (
        <div style={{
          width: 160, borderRight: "1px solid #2e4a6e", padding: "12px 0",
          display: "flex", flexDirection: "column", flexShrink: 0, overflowY: "auto",
          background: "#000f25",
        }}>
          <div style={{ padding: "0 12px 12px", borderBottom: "1px solid #2e4a6e", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo_ie_mobile.svg" alt="logo" width={20} height={20} />
              <h1 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#f1faee" }}>EM Board</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)}
              style={{ background: "none", border: "none", color: "#457b9d", cursor: "pointer", fontSize: 14, padding: 0, lineHeight: 1 }}
              title="Masquer le menu">
              &laquo;
            </button>
          </div>
          {TABLE_GROUPS.map((group) => (
            <div key={group.label} style={{ padding: "8px 0 2px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#457b9d", textTransform: "uppercase", padding: "0 12px 4px", letterSpacing: 1 }}>
                {group.label}
              </div>
              {group.tables.map((t) => (
                <button key={t.key} onClick={() => { setTable(t.key); saveLocal("admin:table", t.key); setSelectedRow(null); setReleaseFilters(DEFAULT_RELEASE_FILTERS); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "5px 12px", border: "none", cursor: "pointer",
                    fontSize: 11, fontWeight: table === t.key ? 600 : 400,
                    background: table === t.key ? "#0f2440" : "transparent",
                    color: table === t.key ? "#a8dadc" : "#f1faee",
                    borderLeft: table === t.key ? "2px solid #a8dadc" : "2px solid transparent",
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          ))}
          <div style={{ marginTop: "auto", padding: "8px 12px", borderTop: "1px solid #2e4a6e" }}>
            <a href="/board" style={{ fontSize: 10, color: "#457b9d", textDecoration: "none" }}>
              &larr; Board
            </a>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 12px", minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)}
              style={{ background: "none", border: "1px solid #2e4a6e", borderRadius: 4, color: "#457b9d", cursor: "pointer", fontSize: 14, padding: "1px 6px", lineHeight: 1 }}
              title="Afficher le menu">
              &raquo;
            </button>
          )}
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#f1faee" }}>{currentLabel}</h2>
          {error && <span style={{ color: "#e63946", fontSize: 11 }}>{error}</span>}
        </div>
        {table === "releases" && (
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
            <select value={releaseFilters.year} onChange={(e) => setReleaseFilters((f) => ({ ...f, year: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="all">Année</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={releaseFilters.month} onChange={(e) => setReleaseFilters((f) => ({ ...f, month: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="all">Mois</option>
              {MONTH_LABELS.map((label, i) => <option key={i} value={String(i + 1)}>{label}</option>)}
            </select>
            <select value={releaseFilters.developerId} onChange={(e) => setReleaseFilters((f) => ({ ...f, developerId: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="all">Dev</option>
              {meta?.developers.map((d) => <option key={d.id} value={String(d.id)}>{d.display_name}</option>)}
            </select>
            <select value={releaseFilters.repositoryId} onChange={(e) => setReleaseFilters((f) => ({ ...f, repositoryId: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="all">Repo</option>
              {meta?.repositories.map((r) => <option key={r.id} value={String(r.id)}>{r.name.replace(/^indb-/, "")}</option>)}
            </select>
            <select value={releaseFilters.releaseType} onChange={(e) => setReleaseFilters((f) => ({ ...f, releaseType: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="all">Type</option>
              {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={releaseFilters.projectId} onChange={(e) => setReleaseFilters((f) => ({ ...f, projectId: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="all">Projet</option>
              <option value="none">Sans projet</option>
              {meta?.projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <input type="text" placeholder="Rechercher..."
              value={releaseFilters.search} onChange={(e) => setReleaseFilters((f) => ({ ...f, search: e.target.value }))}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, minWidth: 140, flex: 1, outline: "none" }} />
            {(releaseFilters.year !== "all" || releaseFilters.month !== "all" || releaseFilters.developerId !== "all" || releaseFilters.repositoryId !== "all" || releaseFilters.releaseType !== "all" || releaseFilters.projectId !== "all" || releaseFilters.search) && (
              <button onClick={() => setReleaseFilters(DEFAULT_RELEASE_FILTERS)}
                style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #2e4a6e", background: "transparent", color: "#457b9d", fontSize: 10, cursor: "pointer" }}>
                Reset
              </button>
            )}
          </div>
        )}
        {table === "releases" && checkedReleaseIds.length > 0 && (
          <div style={{
            display: "flex", gap: 6, marginBottom: 6, alignItems: "center",
            padding: "5px 10px", background: "#000f25", borderRadius: 6, border: "1px solid #2e4a6e",
          }}>
            <span style={{ fontSize: 11, color: "#f1faee", fontWeight: 600, whiteSpace: "nowrap" }}>
              {checkedReleaseIds.length} sel.
            </span>
            <select value={bulkProjectId} onChange={(e) => setBulkProjectId(e.target.value)}
              style={{ padding: "3px 6px", borderRadius: 4, border: "1px solid #2e4a6e", background: "#000f25", color: "#f1faee", fontSize: 11, cursor: "pointer" }}>
              <option value="">— Projet —</option>
              {meta?.projects.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
            <button onClick={handleBulkLinkProject} disabled={!bulkProjectId}
              style={{
                padding: "3px 10px", borderRadius: 4, border: "none", cursor: bulkProjectId ? "pointer" : "default",
                background: bulkProjectId ? "#457b9d" : "#2e4a6e", color: "#f1faee", fontSize: 11, fontWeight: 600,
                opacity: bulkProjectId ? 1 : 0.5,
              }}>
              Associer
            </button>
            <button onClick={() => setCheckedReleaseIds([])}
              style={{ background: "none", border: "none", color: "#457b9d", cursor: "pointer", fontSize: 11 }}>
              ✕
            </button>
          </div>
        )}
        {loading ? (
          <div style={{ color: "#457b9d", padding: 40, textAlign: "center" }}>Loading...</div>
        ) : (
          <AdminGrid
            rows={filteredRows}
            columnDefs={columnDefs}
            tableName={table}
            onSave={handleSave}
            onAdd={handleAdd}
            onDelete={handleDelete}
            onRefresh={handleRefresh}
            onRowClicked={setSelectedRow}
            checkboxSelection={table === "releases"}
            onCheckedChange={table === "releases" ? setCheckedReleaseIds : undefined}
          />
        )}
      </div>

      {selectedRow && meta && (
        <DetailDrawer
          key={selectedRow.id != null ? String(selectedRow.id) : "__create__"}
          row={selectedRow}
          table={table}
          meta={meta}
          relations={TABLE_RELATIONS[table] || []}
          columns={drawerColumns}
          onClose={() => setSelectedRow(null)}
          onSaved={() => { setSelectedRow(null); loadTable(table); }}
          onCreated={async (newRow) => { setSelectedRow(null); await loadTable(table); setSelectedRow(newRow); }}
        />
      )}
    </div>
  );
}
