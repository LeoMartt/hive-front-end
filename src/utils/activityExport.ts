import { ACTIVITY_STATUS_LABELS, formatActivityDate } from "./activityIndicators";
import type { Activity } from "../types/activity";

export const ACTIVITY_EXPORT_COLUMN_WIDTHS: number[] = [
  10, 34, 16, 22, 12, 12, 14, 14, 16, 12, 12, 16, 14, 14, 14, 30, 30, 8,
];

export function buildActivityExportRows(activities: Activity[]): Record<string, string>[] {
  const textOrDash = (value: string | null | undefined): string => {
    const text = (value ?? "").trim();
    return text || "—";
  };

  return activities.map((activity) => ({
    ID: activity.id,
    Nome: textOrDash(activity.name),
    Módulo: textOrDash(activity.module),
    Processo: textOrDash(activity.process),
    Status: ACTIVITY_STATUS_LABELS[activity.status],
    Tester: textOrDash(activity.tester),
    Desenvolvedor: textOrDash(activity.dev),
    "Início Planejado": formatActivityDate(activity.plannedStart),
    "Conclusão Planejada": formatActivityDate(activity.plannedEnd),
    "Início Real": formatActivityDate(activity.actualStart),
    "Conclusão Real": formatActivityDate(activity.actualEnd),
    Predecessores: activity.predecessors.length > 0 ? activity.predecessors.join(", ") : "—",
    Área: textOrDash(activity.area),
    Sistema: textOrDash(activity.system),
    Transação: textOrDash(activity.transaction),
    "Resultado Esperado": textOrDash(activity.expectedResult),
    Observações: textOrDash(activity.notes),
    Reteste: activity.retestCount > 0 ? `${activity.retestCount}×` : "—",
  }));
}
