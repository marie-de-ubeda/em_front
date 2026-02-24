import { useBoardFilter } from "../../lib/boardFilterContext";

function formatFull(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export default function BoardFilterBar() {
  const { filter, setFilter, sprints } = useBoardFilter();

  const handleModeChange = (value: string) => {
    if (value === "all") {
      setFilter({ mode: "all", sprintId: null, from: null, to: null });
    } else if (value === "range") {
      setFilter({ mode: "range", sprintId: null, from: filter.from, to: filter.to });
    } else {
      // Sprint selected
      const sprintId = Number(value);
      setFilter({ mode: "sprint", sprintId, from: null, to: null });
    }
  };

  const selectValue = filter.mode === "all" ? "all"
    : filter.mode === "range" ? "range"
    : String(filter.sprintId ?? "all");

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
      padding: "8px 12px", background: "#1e293b", borderRadius: 8, flexWrap: "wrap",
    }}>
      <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Période :</span>
      <select
        value={selectValue}
        onChange={(e) => handleModeChange(e.target.value)}
        style={{
          background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155",
          borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer",
          outline: "none",
        }}
      >
        <option value="all">Toutes les données</option>
        <optgroup label="Sprints">
          {[...sprints].reverse().map((s) => (
            <option key={s.id} value={String(s.id)}>
              Sprint {s.number} ({formatFull(s.start_date)} → {formatFull(s.end_date)})
            </option>
          ))}
        </optgroup>
        <option value="range">Plage personnalisée…</option>
      </select>

      {filter.mode === "range" && (
        <>
          <input
            type="date"
            value={filter.from || ""}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
            style={{
              background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155",
              borderRadius: 6, padding: "4px 8px", fontSize: 11,
            }}
          />
          <span style={{ color: "#64748b", fontSize: 10 }}>→</span>
          <input
            type="date"
            value={filter.to || ""}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
            style={{
              background: "#0f172a", color: "#e2e8f0", border: "1px solid #334155",
              borderRadius: 6, padding: "4px 8px", fontSize: 11,
            }}
          />
        </>
      )}

      {filter.mode === "sprint" && filter.sprintId && (() => {
        const s = sprints.find((sp) => sp.id === filter.sprintId);
        return s ? (
          <span style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 6,
            background: "#6366f122", color: "#6366f1", fontWeight: 600,
          }}>
            S{s.number}
          </span>
        ) : null;
      })()}
    </div>
  );
}
