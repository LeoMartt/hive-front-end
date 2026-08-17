export type IssueStatus = "aberta" | "em_analise" | "solucao_proposta" | "concluida";
export type IssueType = "requisito" | "performance" | "dados" | "integracao" | "interface" | "configuracao" | "outro";
export type IssueImpact = "muito_alto" | "alto" | "medio" | "baixo";

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  impeditiva: boolean;
  type: IssueType;
  impact: IssueImpact;
  area: string;
  tester: string;
  dev: string;
  relatedActivityId: string | null;
  cascadeActivityIds: string[];
  openedAt: string;
  resolvedAt: string | null;
}

export interface IssueStats {
  total: number;
  abertas: number;
  emAnalise: number;
  solucaoProposta: number;
  concluidas: number;
  impeditivasAbertas: number;
  tempoMedioResolucaoDias: number | null;
}
