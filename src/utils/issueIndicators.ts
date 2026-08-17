import type { Issue, IssueImpact, IssueStatus, IssueType } from "../types/issue";

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  aberta: "Aberta",
  em_analise: "Em análise",
  solucao_proposta: "Solução proposta",
  concluida: "Concluída",
};

// Reaproveita as classes de cor já existentes em _activities.scss — activity-badge-execucao
// é azul neste projeto, não amarelo, então usamos activity-badge-liberado (amarelo real)
// para os dois status intermediários da issue.
export const ISSUE_STATUS_BADGE_CLASS: Record<IssueStatus, string> = {
  aberta: "activity-badge-bloqueado",
  em_analise: "activity-badge-liberado",
  solucao_proposta: "activity-badge-liberado",
  concluida: "activity-badge-concluido",
};

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  requisito: "Requisito",
  performance: "Performance",
  dados: "Dados",
  integracao: "Integração",
  interface: "Interface",
  configuracao: "Configuração",
  outro: "Outro",
};

export const ISSUE_IMPACT_LABELS: Record<IssueImpact, string> = {
  muito_alto: "Muito alto",
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

export const ISSUE_IMPACT_BADGE_CLASS: Record<IssueImpact, string> = {
  muito_alto: "impact-badge-muitoalto",
  alto: "impact-badge-alto",
  medio: "impact-badge-medio",
  baixo: "impact-badge-baixo",
};

const ISSUE_IMPACT_RANK: Record<IssueImpact, number> = {
  muito_alto: 4,
  alto: 3,
  medio: 2,
  baixo: 1,
};

// Limiares fixos do modo UAT do mockup — a tela de Papéis & Config, que tornaria isso
// configurável por modo (UAT/Cutover), ainda não existe.
const AGING_ALERTA_DAYS = 2;
const AGING_RISCO_DAYS = 6;

// Dias desde a abertura se ainda aberta; dias entre abertura e resolução (congelado) se concluída.
export function computeIssueAgingDays(issue: Issue, now: Date = new Date()): number {
  const end = issue.resolvedAt !== null ? new Date(issue.resolvedAt) : now;
  const days = (end.getTime() - new Date(issue.openedAt).getTime()) / 86400000;
  return Math.round(days);
}

export type IssueRiskLevel = "aceitavel" | "alerta" | "risco" | null;

// null para issues concluídas — risco de aging não se aplica a algo que já foi resolvido.
export function computeIssueRisk(issue: Issue, now: Date = new Date()): IssueRiskLevel {
  if (issue.status === "concluida") return null;
  const aging = computeIssueAgingDays(issue, now);
  if (aging >= AGING_RISCO_DAYS) return "risco";
  if (aging >= AGING_ALERTA_DAYS) return "alerta";
  return "aceitavel";
}

// Ordem inicial da tabela: issues não concluídas antes das concluídas, depois por impacto
// decrescente, depois por aging decrescente (mais antiga primeiro). Não é ordenação
// interativa — ver IssuesTable (Task 5) para a nota sobre o ícone de ordenação decorativo.
export function sortIssuesByPriority(issues: Issue[]): Issue[] {
  function priorityScore(issue: Issue): number {
    const openWeight = issue.status === "concluida" ? 0 : 1000;
    const impactScore = ISSUE_IMPACT_RANK[issue.impact] * 10;
    return openWeight + impactScore + computeIssueAgingDays(issue);
  }
  return [...issues].sort((a, b) => priorityScore(b) - priorityScore(a));
}
