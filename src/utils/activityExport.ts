import { ACTIVITY_STATUS_LABELS, formatActivityDate } from "./activityIndicators";
import type { Activity } from "../types/activity";

export const ACTIVITY_EXPORT_COLUMN_WIDTHS: number[] = [
  10, 34, 16, 22, 12, 12, 14, 14, 16, 12, 12, 16, 12, 14, 14, 14, 30, 30, 8,
];

export function buildActivityExportRows(activities: Activity[]): Record<string, string>[] {
  return activities.map((activity) => ({
    ID: activity.id,
    Nome: activity.name,
    Módulo: activity.module,
    Processo: activity.process,
    Status: ACTIVITY_STATUS_LABELS[activity.status],
    Tester: activity.tester,
    Desenvolvedor: activity.dev,
    "Início Planejado": formatActivityDate(activity.plannedStart),
    "Conclusão Planejada": formatActivityDate(activity.plannedEnd),
    "Início Real": formatActivityDate(activity.actualStart),
    "Conclusão Real": formatActivityDate(activity.actualEnd),
    Predecessores: activity.predecessors.length > 0 ? activity.predecessors.join(", ") : "—",
    WBS: activity.wbs,
    Área: activity.area,
    Sistema: activity.system,
    Transação: activity.transaction,
    "Resultado Esperado": activity.expectedResult,
    Observações: activity.notes ?? "—",
    Reteste: activity.retestCount > 0 ? `${activity.retestCount}×` : "—",
  }));
}
