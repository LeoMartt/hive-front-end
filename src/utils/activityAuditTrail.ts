import type { Activity } from "../types/activity";
import type { IssueSummary as Issue } from "../types/issue";

export interface ActivityAuditEntry {
  at: string;
  text: string;
  authorName?: string;
  reason?: string;
}

export function deriveActivityAuditTrail(activity: Activity, issues: Issue[] = []): ActivityAuditEntry[] {
  if (activity.auditTrail !== undefined) {
    return [...activity.auditTrail].sort((a, b) => b.at.localeCompare(a.at));
  }
  if (activity.status === "cancelado") {
    return [{ at: activity.plannedStart, text: "Atividade cancelada" }];
  }

  const entries: ActivityAuditEntry[] = [];

  if (activity.status === "concluido" && activity.actualEnd !== null) {
    entries.push({ at: activity.actualEnd, text: "Liberado → Concluído" });
  }

  if (activity.retestCount > 0) {
    entries.push({
      at: activity.rejectedAt ?? activity.actualStart ?? activity.plannedStart,
      text: `Liberado → Bloqueado (${activity.retestCount}ª rejeição)`,
    });
    // Registros anteriores ao historico persistido usam as datas das issues vinculadas.
    const linked = issues.filter((issue) => issue.relatedActivityId === activity.id && issue.impeditiva);
    const hasBlockers = linked.some((issue) => issue.status === "aberta" || issue.status === "em_analise");
    const releaseDates = linked
      .map((issue) => issue.solutionProposedAt || issue.resolvedAt)
      .filter((at): at is string => Boolean(at))
      .sort();
    if (!hasBlockers && releaseDates.length > 0 && activity.status !== "bloqueado") {
      entries.push({ at: releaseDates[releaseDates.length - 1], text: "Bloqueado → Liberado (reconstruído pelas issues)" });
    }
  }

  if (activity.actualStart !== null) {
    entries.push({ at: activity.actualStart, text: "Início real registrado" });
  } else {
    entries.push({ at: activity.plannedStart, text: "Atividade planejada" });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
