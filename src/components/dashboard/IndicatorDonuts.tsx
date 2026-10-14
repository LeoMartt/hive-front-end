import type { ReactNode } from "react";

interface DonutProps {
  value: number | null;
  color: string;
  label: ReactNode;
}

function Donut({ value, color, label }: DonutProps) {
  const radius = 15.9;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(100, Math.max(0, value ?? 0));
  const isComplete = percent >= 100;
  const dashOffset = circumference * (1 - percent / 100);
  return (
    <div className="donut-item">
      <svg width="128" height="128" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r={radius} fill="none" stroke="#EEF0EC" strokeWidth={5} />
        <circle
          cx="21"
          cy="21"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={circumference}
          strokeDashoffset={isComplete ? 0 : dashOffset}
          strokeLinecap={isComplete ? "butt" : "round"}
          transform="rotate(-90 21 21)"
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
