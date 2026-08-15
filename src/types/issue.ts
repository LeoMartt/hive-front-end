export type IssueStatus = "aberta" | "em_analise" | "solucao_proposta" | "concluida";

export interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  impeditiva: boolean;
  relatedActivityId: string | null;
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
