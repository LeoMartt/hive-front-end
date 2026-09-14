import type { Activity } from "../types/activity";

export interface ActivityAuditEntry {
  at: string;
  text: string;
}

// Não existe modelo de auditoria real no projeto — a trilha é sintetizada a partir dos
// campos que a atividade já tem, em vez de autorada manualmente por atividade.
export function deriveActivityAuditTrail(activity: Activity): ActivityAuditEntry[] {
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
  }

  if (activity.actualStart !== null) {
    entries.push({ at: activity.actualStart, text: "Início real registrado" });
  } else {
    entries.push({ at: activity.plannedStart, text: "Atividade planejada" });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
