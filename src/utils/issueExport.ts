import { ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, computeIssueAgingDays } from "./issueIndicators";
import type { Issue } from "../types/issue";

export const ISSUE_EXPORT_COLUMN_WIDTHS: number[] = [10, 40, 14, 16, 12, 14, 44, 14, 14, 18, 14, 44, 12, 12, 12];

function formatIssueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

export function buildIssueExportRows(issues: Issue[]): Record<string, string>[] {
  return issues.map((issue) => ({
    ID: issue.id,
    Título: issue.title,
    Tipo: ISSUE_TYPE_LABELS[issue.type],
    "Categorização de Impacto": ISSUE_IMPACT_LABELS[issue.impact],
    Impeditivo: issue.impeditiva ? "Sim" : "Não",
    Área: issue.area,
    Descrição: issue.description,
    "Atividade vinculada": issue.relatedActivityId ?? "—",
    Tester: issue.tester,
    Desenvolvedor: issue.dev,
    Status: ISSUE_STATUS_LABELS[issue.status],
    "Solução proposta": issue.proposedSolution ?? "—",
    "Aberta em": formatIssueDate(issue.openedAt),
    "Concluída em": issue.resolvedAt ? formatIssueDate(issue.resolvedAt) : "—",
    "Aging (dias)": String(computeIssueAgingDays(issue)),
  }));
}
