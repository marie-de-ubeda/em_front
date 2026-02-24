import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import type { Sprint } from "./api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface BoardFilter {
  mode: "all" | "sprint" | "range";
  sprintId: number | null;
  from: string | null;
  to: string | null;
}

interface BoardFilterContextValue {
  filter: BoardFilter;
  setFilter: (f: BoardFilter) => void;
  sprints: Sprint[];
  queryParams: string;
  filterLabel: string;
  filterFrom: string | null;
  filterTo: string | null;
  hydrated: boolean;
}

const DEFAULT_FILTER: BoardFilter = { mode: "all", sprintId: null, from: null, to: null };

const BoardFilterContext = createContext<BoardFilterContextValue>({
  filter: DEFAULT_FILTER,
  setFilter: () => {},
  sprints: [],
  queryParams: "",
  filterLabel: "",
  filterFrom: null,
  filterTo: null,
  hydrated: false,
});

function loadFilter(): BoardFilter {
  if (typeof window === "undefined") return DEFAULT_FILTER;
  try {
    const v = localStorage.getItem("board:filter");
    return v ? JSON.parse(v) : DEFAULT_FILTER;
  } catch { return DEFAULT_FILTER; }
}

function saveFilter(f: BoardFilter): void {
  try { localStorage.setItem("board:filter", JSON.stringify(f)); } catch { /* ignore */ }
}

function formatDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export function BoardFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilterRaw] = useState<BoardFilter>(DEFAULT_FILTER);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load sprints once
  useEffect(() => {
    fetch(`${API}/api/board/sprints`)
      .then((r) => r.json())
      .then((data) => setSprints(data))
      .catch(() => {});
  }, []);

  // Hydrate filter from localStorage
  useEffect(() => {
    setFilterRaw(loadFilter());
    setHydrated(true);
  }, []);

  const setFilter = useCallback((f: BoardFilter) => {
    setFilterRaw(f);
    saveFilter(f);
  }, []);

  const queryParams = useMemo(() => {
    if (!hydrated) return "";
    if (filter.mode === "sprint" && filter.sprintId) {
      return `?sprint_id=${filter.sprintId}`;
    }
    if (filter.mode === "range" && filter.from && filter.to) {
      return `?from=${filter.from}&to=${filter.to}`;
    }
    return "";
  }, [filter, hydrated]);

  const filterLabel = useMemo(() => {
    if (filter.mode === "sprint" && filter.sprintId) {
      const s = sprints.find((sp) => sp.id === filter.sprintId);
      if (s) return `Sprint ${s.number} · ${formatDate(s.start_date)} → ${formatDate(s.end_date)}`;
      return `Sprint (id ${filter.sprintId})`;
    }
    if (filter.mode === "range" && filter.from && filter.to) {
      return `${formatDate(filter.from)} → ${formatDate(filter.to)}`;
    }
    return "Toutes les données · Janvier 2025 → Février 2026";
  }, [filter, sprints]);

  const filterFrom = useMemo(() => {
    if (filter.mode === "sprint" && filter.sprintId) {
      const s = sprints.find((sp) => sp.id === filter.sprintId);
      return s?.start_date || null;
    }
    if (filter.mode === "range" && filter.from) return filter.from;
    return null;
  }, [filter, sprints]);

  const filterTo = useMemo(() => {
    if (filter.mode === "sprint" && filter.sprintId) {
      const s = sprints.find((sp) => sp.id === filter.sprintId);
      return s?.end_date || null;
    }
    if (filter.mode === "range" && filter.to) return filter.to;
    return null;
  }, [filter, sprints]);

  return (
    <BoardFilterContext.Provider value={{ filter, setFilter, sprints, queryParams, filterLabel, filterFrom, filterTo, hydrated }}>
      {children}
    </BoardFilterContext.Provider>
  );
}

export function useBoardFilter(): BoardFilterContextValue {
  return useContext(BoardFilterContext);
}
