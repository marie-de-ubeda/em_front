interface SectionTitleProps {
  icon?: string;
  children: React.ReactNode;
}

export default function SectionTitle({ icon, children }: SectionTitleProps) {
  return (
    <h3 style={{ fontSize: 14, color: "#94a3b8", marginBottom: 10, marginTop: 0 }}>
      {icon} {children}
    </h3>
  );
}
