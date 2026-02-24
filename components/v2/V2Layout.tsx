import Link from "next/link";
import { useRouter } from "next/router";
import { useBoardFilter } from "../../lib/boardFilterContext";
import BoardFilterBar from "./BoardFilterBar";

const TABS = [
  { label: "Vue d'ensemble", href: "/board/overview" },
  { label: "Développeurs", href: "/board/developers" },
  { label: "Projets & Gantt", href: "/board/projets" },
  { label: "Qualité & Bugs", href: "/board/qualite" },
];

interface Props {
  children: React.ReactNode;
}

export default function V2Layout({ children }: Props) {
  const router = useRouter();
  const { filterLabel } = useBoardFilter();

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", background: "#000f25", color: "#e2e8f0", minHeight: "100vh", padding: "16px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <img src="/logo_ie_mobile.svg" alt="logo" width={24} height={24} />
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: 0 }}>EM Dashboard</h1>
      </div>
      <p style={{ color: "#64748b", fontSize: 12, marginBottom: 16 }}>
        {filterLabel} · Données factuelles issues des release notes
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map((t) => {
          const active = router.pathname === t.href ||
            (t.href === "/board/developers" && router.pathname.startsWith("/board/developer/"));
          return (
            <Link key={t.href} href={t.href} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: active ? "#6366f1" : "#1e293b", color: active ? "#fff" : "#94a3b8",
              whiteSpace: "nowrap", textDecoration: "none",
              transition: "background 0.15s",
            }}>
              {t.label}
            </Link>
          );
        })}
        <div style={{ flex: 1 }} />
        <Link href="/board-v1/overview" style={{ fontSize: 10, color: "#475569", textDecoration: "none" }}>
          V1 →
        </Link>
        <Link href="/admin" style={{ fontSize: 10, color: "#475569", textDecoration: "none" }}>
          Admin →
        </Link>
      </div>

      <BoardFilterBar />

      {children}

      {/* RGPD footer */}
      <div style={{
        marginTop: 32, padding: "12px 0", borderTop: "1px solid #1e293b",
        fontSize: 9, color: "#475569", textAlign: "center",
      }}>
        Données collectées : release notes, bugs tracés (release_fixes), incidents documentés.
        Aucun score subjectif. Tri alphabétique, pas de classement.
        Conforme RGPD — données factuelles uniquement.
      </div>
    </div>
  );
}
