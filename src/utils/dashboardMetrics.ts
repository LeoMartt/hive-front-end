import type { Activity, ActivityStatus } from "../types/activity";

const SPI_WEIGHT: Record<ActivityStatus, number> = {
  concluido: 100,
  execucao: 50,
  aguardando: 0,
  liberado: 0,
  bloqueado: 0,
  cancelado: 0,
};

// SPI = média dos pesos por status (0/50/100), atividades canceladas saem do denominador.
export function computeSpi(activities: Activity[]): number | null {
  const scored = activities.filter((activity) => activity.status !== "cancelado");
  if (scored.length === 0) return null;
  const sum = scored.reduce((total, activity) => total + SPI_WEIGHT[activity.status], 0);
  return sum / scored.length / 100;
}

export interface DashboardIndicators {
  pace: number | null;
  quality: number | null;
  backlog: number | null;
}

export function computeIndicators(activities: Activity[]): DashboardIndicators {
  const active = activities.filter((activity) => activity.status !== "cancelado");
  const concluded = active.filter((activity) => activity.status === "concluido");

  const onTime = concluded.filter(
    (activity) => activity.actualEnd !== null && activity.actualEnd.slice(0, 10) <= activity.plannedEnd.slice(0, 10)
  ).length;
  const noRetest = concluded.filter((activity) => activity.retestCount === 0).length;
  const backlogCount = active.filter((activity) => activity.status === "aguardando").length;

  return {
    pace: concluded.length === 0 ? null : Math.round((onTime / concluded.length) * 100),
    quality: concluded.length === 0 ? null : Math.round((noRetest / concluded.length) * 100),
    backlog: active.length === 0 ? null : Math.round((backlogCount / active.length) * 100),
  };
}
