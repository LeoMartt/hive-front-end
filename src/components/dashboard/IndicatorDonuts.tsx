import type { ReactNode } from "react";

interface DonutProps {
  value: number | null;
  color: string;
  label: ReactNode;
}

function Donut({ value, color, label }: DonutProps) {
  const percent = value ?? 0;
  return (
    <div className="donut-item">
      <svg width="128" height="128" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#E4E5E1" strokeWidth={5} />
        <circle
          cx="21"
          cy="21"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${percent} 100`}
          strokeDashoffset={25}
          strokeLinecap="round"
        />
      </svg>
      <div className="dv">{value === null ? "—" : `${value}%`}</div>
      <div className="dl">{label}</div>
    </div>
  );
}

interface IndicatorDonutsProps {
  pace: number | null;
  quality: number | null;
  backlog: number | null;
}

export default function IndicatorDonuts({ pace, quality, backlog }: IndicatorDonutsProps) {
  return (
    <div className="donut-row">
      <Donut
        value={pace}
        color="#8A6D00"
        label={
          <>
            Pace
            <br />
            (no prazo)
          </>
        }
      />
      <Donut
        value={quality}
        color="#2F8F5B"
        label={
          <>
            Quality
            <br />
            (sem reteste)
          </>
        }
      />
      <Donut
        value={backlog}
        color="#C6373F"
        label={
          <>
            Backlog
            <br />
            (não iniciado)
          </>
        }
      />
    </div>
  );
}
