interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  tone?: "g" | "y" | "r";
}

export default function StatCard({ label, value, sub, tone }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={tone ? `stat-value ${tone}` : "stat-value"}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
