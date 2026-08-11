import type { Activity, ActivityStatus } from "../types/activity";

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  aguardando: "Aguardando",
  liberado: "Liberado",
  execucao: "Em execução",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ACTIVITY_STATUS_BADGE_CLASS: Record<ActivityStatus, string> = {
  aguardando: "activity-badge-aguardando",
  liberado: "activity-badge-liberado",
  execucao: "activity-badge-execucao",
  bloqueado: "activity-badge-bloqueado",
  concluido: "activity-badge-concluido",
  cancelado: "activity-badge-cancelado",
};

export function toLocalIsoString(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function isOverdue(activity: Activity): boolean {
  if (activity.status === "concluido" || activity.status === "cancelado") return false;
  const today = toLocalIsoString(new Date()).slice(0, 10);
  return activity.plannedEnd.slice(0, 10) < today;
}
