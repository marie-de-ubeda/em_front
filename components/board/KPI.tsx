interface KPIProps {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}

export default function KPI({ label, value, color, sub }: KPIProps) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 10,
        padding: "10px 14px",
        flex: "1 1 100px",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#94a3b8" }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color: "#64748b" }}>{sub}</div>}
    </div>
  );
}
