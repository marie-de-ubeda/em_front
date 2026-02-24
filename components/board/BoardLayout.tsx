import Link from "next/link";
import { useRouter } from "next/router";
import Chip from "./Chip";

const TABS = [
  { label: "Vue d'ensemble", href: "/board-v1/overview" },
  { label: "Par personne", href: "/board-v1/per-person" },
  { label: "Bilan", href: "/board-v1/bilan" },
  { label: "Projets clés", href: "/board-v1/projects" },
  { label: "Qualité & Incidents", href: "/board-v1/quality" },
  { label: "Couverture & Repos", href: "/board-v1/repos" },
  { label: "Cadence & Risque", href: "/board-v1/cadence" },
  { label: "CODIR", href: "/board-v1/codir" },
];

interface Props {
  children: React.ReactNode;
}

export default function BoardLayout({ children }: Props) {
  const router = useRouter();

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#0f172a", color: "#e2e8f0", minHeight: "100vh", padding: 16 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, flexWrap: "wrap" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f472b6", margin: 0 }}>Marie de Ubeda</h1>
          <Chip c="#f472b6">Engineering Manager</Chip>
          <Chip c="#818cf8">Individual Contributor</Chip>
        </div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 4 }}>
          Bilan annuel · Janvier 2025 → Février 2026
        </p>
        <p style={{ color: "#475569", fontSize: 10, marginBottom: 16 }}>
          Comptages basés sur le parsing des release notes Slack. Approximatifs (±5%).
        </p>

        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap", overflowX: "auto" }}>
          {TABS.map((t) => {
            const active = router.pathname === t.href;
            return (
              <Link key={t.href} href={t.href} style={{
                padding: "7px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                background: active ? "#6366f1" : "#1e293b", color: active ? "#fff" : "#94a3b8",
                whiteSpace: "nowrap", textDecoration: "none",
              }}>
                {t.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </div>
  );
}
