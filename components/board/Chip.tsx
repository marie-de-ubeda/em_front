interface ChipProps {
  c: string;
  children: React.ReactNode;
}

export default function Chip({ c, children }: ChipProps) {
  return (
    <span
      style={{
        background: c + "20",
        color: c,
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
