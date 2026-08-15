import { useEffect, useRef } from "react";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { CurvaSData } from "../../hooks/useCurvaSData";

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip, Filler);

interface CurvaSChartProps {
  data: CurvaSData;
}

export default function CurvaSChart({ data }: CurvaSChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Planejado",
            data: data.planned,
            borderColor: "#8E9096",
            borderDash: [6, 5],
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false,
            tension: 0.35,
          },
          {
            label: "Realizado",
            data: data.realized,
            borderColor: "#8A6D00",
            backgroundColor: "rgba(255,227,110,0.35)",
            borderWidth: 3.5,
            pointRadius: 3,
            pointBackgroundColor: "#FFFFFF",
            pointBorderColor: "#8A6D00",
            pointBorderWidth: 2.5,
            fill: true,
            tension: 0.35,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y}%`,
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { callback: (value) => `${value}%`, font: { size: 10 }, color: "#8E9096" },
            grid: { color: "#E4E5E1" },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: "#8E9096" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div style={{ height: 260 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
