interface StatCardProps {
  label: string;
  value: string;
  sub: string;
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="text-uppercase text-body-secondary small fw-bold mb-2">{label}</div>
        <div className="fs-2 fw-bold font-monospace">{value}</div>
        <div className="text-body-secondary small mt-1">{sub}</div>
      </div>
    </div>
  );
}
