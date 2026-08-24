export type IssueStatus = "aberta" | "em_analise" | "solucao_proposta" | "concluida";
export type IssueType = "requisito" | "performance" | "dados" | "integracao" | "interface" | "configuracao" | "outro";
export type IssueImpact = "muito_alto" | "alto" | "medio" | "baixo";

export interface IssueAttachment {
  fileName: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
}

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
  description: string;
  impactNote: string;
  proposedSolution: string | null;
  analysisStartedAt: string | null;
  solutionProposedAt: string | null;
  openingAttachment: IssueAttachment | null;
  solutionAttachment: IssueAttachment | null;
}

export interface NewIssueInput {
  title: string;
  description: string;
  type: IssueType;
  impeditiva: boolean;
  impact: IssueImpact;
  impactNote: string;
  tester: string;
  dev: string;
  area: string;
  relatedActivityId: string;
  openingAttachment: IssueAttachment | null;
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
