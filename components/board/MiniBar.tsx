const TYPE_COLORS: Record<string, string> = {
  feat: "#818cf8",
  fix: "#fbbf24",
  refacto: "#fb923c",
  chore: "#94a3b8",
};

interface MiniBarProps {
  data: { feat: number; fix: number; refacto: number; chore: number };
  max: number;
}

export default function MiniBar({ data, max }: MiniBarProps) {
  const w = (k: keyof typeof data) => Math.max(2, (data[k] / (max || 1)) * 100);
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "center", height: 18, flex: 1 }}>
      {(["feat", "fix", "refacto", "chore"] as const)
        .filter((k) => data[k] > 0)
        .map((k) => (
          <div
            key={k}
            style={{
              height: "100%",
              width: `${w(k)}%`,
              minWidth: data[k] > 0 ? 14 : 0,
              background: TYPE_COLORS[k],
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 9,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            {data[k]}
          </div>
        ))}
    </div>
  );
}
