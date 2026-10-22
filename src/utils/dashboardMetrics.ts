import type { ActivitySummary as Activity } from "../types/activity";
import { toLocalIsoString } from "./activityIndicators";

export function computeSpi(activities: Activity[], today = toLocalIsoString(new Date()).slice(0, 10)): number | null {
  const scored = activities.filter((activity) => activity.status !== "cancelado");
  let ev = 0;
  let pv = 0;
  for (const activity of scored) {
    ev += activity.status === "concluido" ? 1 : activity.actualStart && activity.actualStart.slice(0, 10) <= today ? 0.5 : 0;
    pv += activity.plannedEnd.slice(0, 10) <= today ? 1 : activity.plannedStart.slice(0, 10) <= today ? 0.5 : 0;
  }
  return pv === 0 ? null : ev / pv;
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
  const backlogCount = active.filter((activity) => ["aguardando", "liberado"].includes(activity.status)).length;

  return {
    pace: concluded.length === 0 ? null : Math.round((onTime / concluded.length) * 100),
    quality: concluded.length === 0 ? null : Math.round((noRetest / concluded.length) * 100),
    backlog: active.length === 0 ? null : Math.round((backlogCount / active.length) * 100),
  };
}
