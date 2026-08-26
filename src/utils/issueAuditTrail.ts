import type { Issue } from "../types/issue";

export interface IssueAuditEntry {
  at: string;
  text: string;
}

// Não existe modelo de auditoria real no projeto — a trilha é sintetizada a partir dos
// campos que a issue já tem, mesmo padrão de deriveActivityAuditTrail.
export function deriveIssueAuditTrail(issue: Issue): IssueAuditEntry[] {
  const entries: IssueAuditEntry[] = [];

  if (issue.status === "concluida" && issue.resolvedAt !== null) {
    entries.push({ at: issue.resolvedAt, text: "Solução proposta → Concluída (atividade vinculada aprovada)" });
  }

  if (issue.solutionProposedAt !== null) {
    entries.push({ at: issue.solutionProposedAt, text: "Em análise → Solução proposta" });
  }

  if (issue.analysisStartedAt !== null) {
    entries.push({ at: issue.analysisStartedAt, text: "Aberta → Em análise" });
  }

  entries.push({
    at: issue.openedAt,
    text: `Issue registrada como ${issue.impeditiva ? "impeditiva" : "não impeditiva"}`,
  });

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
