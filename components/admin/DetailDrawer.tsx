import { useState, useEffect, useCallback, useRef } from "react";
import type { AdminMeta } from "../../lib/api";
import { adminApi, api } from "../../lib/api";

type Row = Record<string, unknown>;

export interface TableRelation {
  label: string;
  table: string;
  foreignKey: string;
  columns: string[];
}

interface Props {
  row: Row;
  table: string;
  meta: AdminMeta;
  relations: TableRelation[];
  columns: string[];
  onClose: () => void;
  onSaved: () => void;
  onCreated?: (newRow: Row) => void;
  onArchive?: (id: number, archive: boolean) => Promise<void>;
}

const TEXTAREA_FIELDS = new Set([
  "description", "changes", "detail", "lesson", "challenges", "result", "ai_summary",
  "impact_description",
]);
const JSON_FIELDS = new Set(["themes"]);
const DATE_FIELDS = new Set(["release_date", "date"]);
const BOOL_FIELDS = new Set(["is_em", "is_rollback", "is_archived", "is_roadmap"]);
const READONLY_FIELDS = new Set(["id", "created_at", "release_url"]);
// Key: "table:field" or just "field" for global
const SELECT_FIELDS: Record<string, string[]> = {
  release_type: ["feat", "fix", "refacto", "chore"],
  "projects:type": ["Produit", "Tech", "Dette technique"],
  "projects:impact": ["high", "medium", "low"],
  "release_fixes:severity": ["low", "medium", "high", "critical"],
  "release_fixes:detected_by": ["team", "client", "monitoring", "qa"],
  "release_fixes:environment": ["front", "back", "api", "infra"],
};

function getSelectOptions(field: string, table: string): string[] | null {
  return SELECT_FIELDS[`${table}:${field}`] || SELECT_FIELDS[field] || null;
}

function fieldType(name: string, table: string): "readonly" | "fk" | "date" | "bool" | "json" | "textarea" | "select" | "text" {
  if (READONLY_FIELDS.has(name)) return "readonly";
  if (name.endsWith("_id")) return "fk";
  if (DATE_FIELDS.has(name)) return "date";
  if (BOOL_FIELDS.has(name)) return "bool";
  if (JSON_FIELDS.has(name)) return "json";
  if (TEXTAREA_FIELDS.has(name)) return "textarea";
  if (getSelectOptions(name, table)) return "select";
  return "text";
}

const FK_LABELS: Record<string, string> = {
  fix_release_id: "release qui corrige",
  bugged_release_id: "release buggée",
  release_id: "release",
  developer_id: "développeur",
  repository_id: "repository",
  project_id: "projet",
  base_branch_id: "base branch",
};

function fkPlaceholder(col: string): string {
  return FK_LABELS[col] || col.replace(/_id$/, "").replace(/_/g, " ");
}

function releaseLabel(r: { version: string; release_date: string; changes: string | null; repo_name: string | null }): string {
  const repo = r.repo_name ? r.repo_name.replace(/^indb-/, "") : "";
  const date = r.release_date?.slice(0, 10) ?? "";
  const preview = r.changes ? r.changes.split(/\s+/).slice(0, 10).join(" ") : "";
  const truncated = preview.length < (r.changes?.length ?? 0) ? `${preview}...` : preview;
  return [repo, r.version, date ? `(${date})` : "", truncated].filter(Boolean).join(" ");
}

function fkOptions(field: string, meta: AdminMeta): { value: number; label: string }[] {
  switch (field) {
    case "developer_id":
      return meta.developers.map((d) => ({ value: d.id, label: d.display_name }));
    case "repository_id":
      return meta.repositories.map((r) => ({ value: r.id, label: r.name }));
    case "release_id":
    case "fix_release_id":
    case "bugged_release_id":
      return meta.releases.map((r) => ({ value: r.id, label: releaseLabel(r) }));
    case "base_branch_id":
      return meta.baseBranches.map((b) => ({ value: b.id, label: b.name }));
    case "project_id":
      return meta.projects.map((p) => ({ value: p.id, label: `${p.name}${p.is_roadmap ? " (R)" : ""}` }));
    default:
      return [];
  }
}

function fkLabel(field: string, value: unknown, meta: AdminMeta): string {
  const opts = fkOptions(field, meta);
  return opts.find((o) => o.value === Number(value))?.label ?? String(value ?? "");
}

function formatDate(val: unknown): string {
  if (!val) return "";
  const s = String(val);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatJson(val: unknown): string {
  if (Array.isArray(val)) return JSON.stringify(val, null, 2);
  if (typeof val === "string") {
    try { return JSON.stringify(JSON.parse(val), null, 2); } catch { return val; }
  }
  return String(val ?? "[]");
}

const INPUT_STYLE: React.CSSProperties = {
  width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #2e4a6e",
  background: "#000f25", color: "#f1faee", fontSize: 12, fontFamily: "system-ui, sans-serif",
  outline: "none", boxSizing: "border-box",
};
const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "#a8dadc", marginBottom: 4, display: "block",
};

// Unique key per relation (handles multiple relations on the same table)
function relKey(rel: TableRelation): string {
  return `${rel.table}:${rel.foreignKey}`;
}

const SEARCHABLE_THRESHOLD = 20;

function SearchSelect({ options, value, onChange, placeholder, style }: {
  options: { value: number; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  style?: React.CSSProperties;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel = options.find((o) => String(o.value) === value)?.label || "";
  const filtered = search
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Use native select for small lists
  if (options.length < SEARCHABLE_THRESHOLD) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ ...INPUT_STYLE, cursor: "pointer", ...style }}>
        <option value="">— {placeholder} —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <div onClick={() => setOpen(!open)} style={{
        ...INPUT_STYLE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
      }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", color: selectedLabel ? "#f1faee" : "#457b9d" }}>
          {selectedLabel || `— ${placeholder} —`}
        </span>
        <span style={{ color: "#457b9d", fontSize: 10, marginLeft: 4, flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: "#0a1a30", border: "1px solid #2e4a6e", borderRadius: 6,
          marginTop: 2, maxHeight: 260, display: "flex", flexDirection: "column",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          <input
            type="text" autoFocus placeholder="Rechercher..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...INPUT_STYLE, border: "none", borderBottom: "1px solid #2e4a6e", borderRadius: "6px 6px 0 0", flexShrink: 0 }}
          />
          <div style={{ overflowY: "auto", maxHeight: 220 }}>
            {value && (
              <div onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
                style={{ padding: "6px 10px", fontSize: 11, color: "#457b9d", cursor: "pointer", borderBottom: "1px solid #000f25" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#0f2440")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                — Aucun —
              </div>
            )}
            {filtered.slice(0, 50).map((o) => (
              <div key={o.value} onClick={() => { onChange(String(o.value)); setOpen(false); setSearch(""); }}
                style={{
                  padding: "6px 10px", fontSize: 11, color: String(o.value) === value ? "#a8dadc" : "#f1faee",
                  cursor: "pointer", borderBottom: "1px solid #000f25",
                  fontWeight: String(o.value) === value ? 600 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#0f2440")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                {o.label}
              </div>
            ))}
            {filtered.length > 50 && (
              <div style={{ padding: "6px 10px", fontSize: 10, color: "#457b9d", textAlign: "center" }}>
                {filtered.length - 50} autres...
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: "12px 10px", fontSize: 11, color: "#457b9d", textAlign: "center" }}>Aucun résultat</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DetailDrawer({ row, table, meta, relations, columns, onClose, onSaved, onCreated, onArchive }: Props) {
  const isCreate = row.id == null;
  const [edited, setEdited] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Related entity data per relation (keyed by relKey)
  const [relatedData, setRelatedData] = useState<Record<string, Row[]>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Reset state when row changes
  useEffect(() => {
    setEdited({});
    setError(null);
    if (isCreate) return;
    // Load related data
    for (const rel of relations) {
      const rk = relKey(rel);
      adminApi.list(rel.table).then((rows) => {
        const filtered = rows.filter((r) => r[rel.foreignKey] === row.id);
        setRelatedData((prev) => ({ ...prev, [rk]: filtered }));
      });
    }
    // Expand all sections by default
    setExpandedSections(new Set(relations.map((r) => relKey(r))));
  }, [row.id, table, relations, isCreate]);

  const fields = isCreate
    ? columns.filter((k) => k !== "id" && k !== "created_at" && !k.startsWith("_"))
    : Object.keys(row).filter((k) => k !== "id" && k !== "created_at");
  const currentValue = (field: string) => field in edited ? edited[field] : row[field];

  const setField = useCallback((field: string, value: unknown) => {
    setEdited((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (Object.keys(edited).length === 0) return;
    setSaving(true);
    setError(null);
    try {
      if (isCreate) {
        const newRow = await adminApi.create(table, edited);
        if (onCreated) {
          onCreated(newRow as Row);
        } else {
          onSaved();
        }
      } else {
        await adminApi.update(table, row.id as number, edited);
        onSaved();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [edited, table, row.id, onSaved, onCreated, isCreate]);

  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // Track which relation is in "adding" mode and its pending FK values
  const [addingRel, setAddingRel] = useState<string | null>(null);
  const [addingValues, setAddingValues] = useState<Row>({});

  const handleConfirmAdd = useCallback(async (rel: TableRelation) => {
    const newRow: Row = { [rel.foreignKey]: row.id, ...addingValues };
    // Check all FK columns are filled
    for (const col of rel.columns) {
      if (col !== rel.foreignKey && col.endsWith("_id") && !newRow[col]) {
        setError(`Please select a value for ${col.replace(/_/g, " ")}`);
        return;
      }
    }
    try {
      const rk = relKey(rel);
      await adminApi.create(rel.table, newRow);
      const rows = await adminApi.list(rel.table);
      const filtered = rows.filter((r) => r[rel.foreignKey] === row.id);
      setRelatedData((prev) => ({ ...prev, [rk]: filtered }));
      setAddingRel(null);
      setAddingValues({});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [row.id, addingValues]);

  const handleDeleteChild = useCallback(async (rel: TableRelation, childId: number) => {
    try {
      const rk = relKey(rel);
      await adminApi.remove(rel.table, childId);
      setRelatedData((prev) => ({
        ...prev,
        [rk]: (prev[rk] || []).filter((r) => r.id !== childId),
      }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const [generating, setGenerating] = useState(false);

  const handleGenerateSummary = useCallback(async () => {
    if (!row.id) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generateSummary(row.id as number);
      // Update the local row display
      setEdited((prev) => ({ ...prev, ai_summary: result.ai_summary }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [row.id]);

  const handleArchive = useCallback(async () => {
    if (!onArchive || !row.id) return;
    setArchiving(true);
    setError(null);
    try {
      const isArchived = "is_archived" in edited ? Boolean(edited.is_archived) : Boolean(row.is_archived);
      await onArchive(row.id as number, !isArchived);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setArchiving(false);
    }
  }, [onArchive, row.id, row.is_archived, edited]);

  const dirtyCount = Object.keys(edited).length;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999,
        transition: "opacity 0.25s ease", cursor: "pointer",
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", right: 0, top: 0, bottom: 0, width: 560, zIndex: 1000,
        background: "#0a1a30", boxShadow: "-4px 0 24px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif",
        animation: "slideIn 0.25s ease-out",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 20px", borderBottom: "1px solid #2e4a6e", flexShrink: 0,
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f1faee" }}>
            {table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} {isCreate ? "(new)" : `#${String(row.id)}`}
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#a8dadc", cursor: "pointer",
            fontSize: 18, padding: "4px 8px", borderRadius: 4,
          }}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* ID + created_at (readonly, only in edit mode) */}
          {!isCreate && (
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={LABEL_STYLE}>id</label>
                <div style={{ ...INPUT_STYLE, background: "#000f2580", color: "#457b9d" }}>{String(row.id)}</div>
              </div>
              {row.created_at != null && (
                <div style={{ flex: 2 }}>
                  <label style={LABEL_STYLE}>created_at</label>
                  <div style={{ ...INPUT_STYLE, background: "#000f2580", color: "#457b9d" }}>
                    {String(row.created_at).slice(0, 19)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editable fields */}
          {fields.filter((f) => !READONLY_FIELDS.has(f)).map((field) => {
            const type = fieldType(field, table);
            const val = currentValue(field);

            return (
              <div key={field} style={{ marginBottom: 12 }}>
                <label style={LABEL_STYLE}>{field.replace(/_/g, " ")}</label>

                {type === "fk" && (
                  <SearchSelect
                    options={fkOptions(field, meta)}
                    value={String(val ?? "")}
                    onChange={(v) => setField(field, v ? Number(v) : null)}
                    placeholder={fkPlaceholder(field)}
                  />
                )}

                {type === "date" && (
                  <input type="date" value={formatDate(val)}
                    onChange={(e) => setField(field, e.target.value || null)}
                    style={{ ...INPUT_STYLE, colorScheme: "dark" }} />
                )}

                {type === "bool" && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(val)}
                      onChange={(e) => setField(field, e.target.checked)}
                      style={{ accentColor: "#457b9d" }} />
                    <span style={{ fontSize: 12, color: "#f1faee" }}>{val ? "Yes" : "No"}</span>
                  </label>
                )}

                {type === "select" && (
                  <select value={String(val ?? "")} onChange={(e) => setField(field, e.target.value)}
                    style={{ ...INPUT_STYLE, cursor: "pointer" }}>
                    <option value="">—</option>
                    {getSelectOptions(field, table)?.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                )}

                {type === "json" && (
                  <textarea value={formatJson(val)}
                    onChange={(e) => {
                      try { setField(field, JSON.parse(e.target.value)); } catch { setField(field, e.target.value); }
                    }}
                    rows={4} style={{ ...INPUT_STYLE, resize: "vertical", fontFamily: "monospace", fontSize: 11 }} />
                )}

                {type === "textarea" && (
                  <textarea value={String(val ?? "")}
                    onChange={(e) => setField(field, e.target.value)}
                    rows={3} style={{ ...INPUT_STYLE, resize: "vertical" }} />
                )}

                {type === "text" && (
                  <input type="text" value={String(val ?? "")}
                    onChange={(e) => setField(field, e.target.value)}
                    style={INPUT_STYLE} />
                )}
              </div>
            );
          })}

          {/* Related entity sections (only in edit mode) */}
          {!isCreate && relations.map((rel) => {
            const rk = relKey(rel);
            const children = relatedData[rk] || [];
            const isExpanded = expandedSections.has(rk);

            return (
              <div key={rk} style={{ marginTop: 20, borderTop: "1px solid #2e4a6e", paddingTop: 12 }}>
                <button onClick={() => toggleSection(rk)} style={{
                  background: "none", border: "none", cursor: "pointer", width: "100%",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "4px 0", color: "#f1faee",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {isExpanded ? "▾" : "▸"} {rel.label}
                    <span style={{
                      marginLeft: 8, fontSize: 10, background: "#2e4a6e", color: "#a8dadc",
                      padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                    }}>
                      {children.length}
                    </span>
                  </span>
                </button>

                {isExpanded && (
                  <div style={{ marginTop: 8 }}>
                    {children.length === 0 && (
                      <div style={{ fontSize: 11, color: "#457b9d", padding: "8px 0" }}>No items</div>
                    )}
                    {children.map((child) => {
                      // Build link for PRs and tickets
                      let link: string | null = null;
                      if (rel.table === "pull_requests" && child.number) {
                        // Derive repo GitHub URL from release_url: https://github.com/org/repo/releases/tag/...
                        const releaseUrl = String(row.release_url ?? "");
                        const repoUrl = releaseUrl.replace(/\/releases\/tag\/.*$/, "");
                        if (repoUrl.includes("github.com")) link = `${repoUrl}/pull/${child.number}`;
                      } else if (rel.table === "tickets" && child.url) {
                        link = String(child.url);
                      }

                      return (
                      <div key={child.id as number} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                        borderBottom: "1px solid #223d62", fontSize: 12,
                      }}>
                        <span style={{ color: "#457b9d", fontSize: 10, minWidth: 30 }}>#{String(child.id)}</span>
                        {rel.columns.map((col) => (
                          <span key={col} style={{ flex: 1, color: "#d4e8eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {col.endsWith("_id") ? fkLabel(col, child[col], meta) : String(child[col] ?? "")}
                          </span>
                        ))}
                        {link && (
                          <a href={link} target="_blank" rel="noopener noreferrer"
                            style={{ color: "#a8dadc", fontSize: 11, flexShrink: 0, textDecoration: "none" }}
                            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                          >&#8599;</a>
                        )}
                        <button onClick={() => handleDeleteChild(rel, child.id as number)} style={{
                          background: "none", border: "none", cursor: "pointer", color: "#457b9d",
                          fontSize: 14, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                        }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#e63946")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "#457b9d")}
                        >
                          ✕
                        </button>
                      </div>
                      );
                    })}
                    {addingRel === rk ? (
                      <div style={{ marginTop: 6, padding: 8, background: "#000f25", borderRadius: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        {rel.columns.filter((col) => col !== rel.foreignKey && col.endsWith("_id")).map((col) => (
                          <SearchSelect key={col}
                            options={fkOptions(col, meta)}
                            value={String(addingValues[col] ?? "")}
                            onChange={(v) => setAddingValues((prev) => ({ ...prev, [col]: v ? Number(v) : null }))}
                            placeholder={fkPlaceholder(col)}
                            style={{ flex: 1, minWidth: 160 }}
                          />
                        ))}
                        {rel.columns.filter((col) => col !== rel.foreignKey && !col.endsWith("_id")).map((col) => (
                          <input key={col} type="text" placeholder={col.replace(/_/g, " ")}
                            value={String(addingValues[col] ?? "")}
                            onChange={(e) => setAddingValues((prev) => ({ ...prev, [col]: e.target.value }))}
                            style={{ ...INPUT_STYLE, flex: 1, minWidth: 120 }} />
                        ))}
                        <button onClick={() => handleConfirmAdd(rel)} style={{
                          background: "#457b9d", border: "none", color: "#f1faee", cursor: "pointer",
                          padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        }}>Add</button>
                        <button onClick={() => { setAddingRel(null); setAddingValues({}); }} style={{
                          background: "none", border: "none", color: "#457b9d", cursor: "pointer",
                          fontSize: 14, padding: "4px 6px",
                        }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingRel(rk); setAddingValues({}); }} style={{
                        marginTop: 6, background: "none", border: "1px dashed #2e4a6e",
                        color: "#457b9d", cursor: "pointer", padding: "6px 12px", borderRadius: 6,
                        fontSize: 11, width: "100%", textAlign: "center",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#a8dadc"; e.currentTarget.style.color = "#a8dadc"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e4a6e"; e.currentTarget.style.color = "#457b9d"; }}
                      >
                        + Add {rel.label.replace(/s$/, "")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px", borderTop: "1px solid #2e4a6e", flexShrink: 0,
          display: "flex", gap: 8, alignItems: "center",
        }}>
          {error && <div style={{ flex: 1, fontSize: 11, color: "#e63946", overflow: "hidden", textOverflow: "ellipsis" }}>{error}</div>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {table === "projects" && !isCreate && onArchive && (
              <button onClick={handleArchive} disabled={archiving}
                style={{
                  padding: "8px 14px", borderRadius: 6, border: `1px solid ${currentValue("is_archived") ? "#34d399" : "#e63946"}`,
                  background: "transparent", color: currentValue("is_archived") ? "#34d399" : "#e63946",
                  cursor: archiving ? "wait" : "pointer",
                  fontSize: 11, fontWeight: 600, opacity: archiving ? 0.6 : 1,
                }}>
                {archiving ? "..." : currentValue("is_archived") ? "Restaurer" : "Archiver"}
              </button>
            )}
            {table === "projects" && !isCreate && (
              <button onClick={handleGenerateSummary} disabled={generating}
                style={{
                  padding: "8px 14px", borderRadius: 6, border: "1px solid #457b9d",
                  background: "transparent", color: "#a8dadc", cursor: generating ? "wait" : "pointer",
                  fontSize: 11, fontWeight: 600, opacity: generating ? 0.6 : 1,
                }}>
                {generating ? "Generating..." : "AI Summary"}
              </button>
            )}
            <button onClick={onClose} style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid #2e4a6e",
              background: "transparent", color: "#a8dadc", cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={dirtyCount === 0 || saving}
              style={{
                padding: "8px 20px", borderRadius: 6, border: "none", cursor: dirtyCount > 0 ? "pointer" : "default",
                background: dirtyCount > 0 ? "#457b9d" : "#2e4a6e", color: "#f1faee",
                fontSize: 12, fontWeight: 600, opacity: dirtyCount > 0 ? 1 : 0.5,
              }}>
              {saving ? "Saving..." : isCreate ? "Create" : `Save${dirtyCount > 0 ? ` (${dirtyCount})` : ""}`}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
