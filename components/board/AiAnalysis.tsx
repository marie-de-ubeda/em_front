import { useState, useCallback } from "react";
import { api } from "../../lib/api";

interface Props {
  tab: string;
  data: object;
}

export default function AiAnalysis({ tab, data }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.analyzeTab(tab, data);
      setAnalysis(result.analysis);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  }, [tab, data]);

  if (analysis) {
    return (
      <div style={{
        background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12,
        borderLeft: "3px solid #a78bfa",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>Analyse IA</span>
          <button onClick={() => setAnalysis(null)}
            style={{
              padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              background: "#334155", color: "#94a3b8", fontSize: 10, fontWeight: 600,
            }}>
            Fermer
          </button>
        </div>
        <div style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#e2e8f0", lineHeight: 1.6 }}>
          {analysis}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
      <button onClick={handleAnalyze} disabled={loading}
        style={{
          padding: "5px 14px", borderRadius: 8, border: "none", cursor: loading ? "default" : "pointer",
          background: loading ? "#334155" : "#6366f1", color: "#fff", fontSize: 11, fontWeight: 600,
          opacity: loading ? 0.7 : 1,
        }}>
        {loading ? "Analyse en cours..." : "Analyser"}
      </button>
      {error && <span style={{ fontSize: 11, color: "#f87171" }}>{error}</span>}
    </div>
  );
}
