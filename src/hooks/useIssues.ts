import { useMemo, useState } from "react";
import type { Issue, IssueStats } from "../types/issue";
import { toLocalIsoString } from "../utils/activityIndicators";

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalIsoString(date);
}

const INITIAL_ISSUES: Issue[] = [
  {
    id: "ISS-0290",
    title: "Timeout na integração com banco emissor (CNAB 240)",
    status: "aberta",
    impeditiva: true,
    type: "integracao",
    impact: "muito_alto",
    area: "Pagamentos",
    tester: "Guilherme Fabretti",
    dev: "M. Torres",
    relatedActivityId: "ATV-1009",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(6),
    resolvedAt: null,
  },
  {
    id: "ISS-0291",
    title: "Cancelamento de NF-e retorna erro ao reprocessar",
    status: "aberta",
    impeditiva: true,
    type: "dados",
    impact: "alto",
    area: "Faturamento",
    tester: "Leonardo Martins da Silva",
    dev: "Vinícius Calefo Assarice",
    relatedActivityId: "ATV-1003",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(4),
    resolvedAt: null,
  },
  {
    id: "ISS-0292",
    title: "Ambiente de homologação instável às segundas-feiras",
    status: "aberta",
    impeditiva: false,
    type: "configuracao",
    impact: "medio",
    area: "Infraestrutura",
    tester: "Rafael Souza",
    dev: "Guilherme Fabretti",
    relatedActivityId: null,
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(2),
    resolvedAt: null,
  },
  {
    id: "ISS-0293",
    title: "Bloqueio de CPF/CNPJ inválido não dispara alerta",
    status: "aberta",
    impeditiva: false,
    type: "requisito",
    impact: "baixo",
    area: "Cadastro",
    tester: "Rafael Souza",
    dev: "M. Torres",
    relatedActivityId: "ATV-1015",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(1),
    resolvedAt: null,
  },
  {
    id: "ISS-0294",
    title: "Segunda ocorrência de timeout no CNAB 240 aguardando análise",
    status: "em_analise",
    impeditiva: true,
    type: "integracao",
    impact: "muito_alto",
    area: "Pagamentos",
    tester: "Guilherme Fabretti",
    dev: "M. Torres",
    relatedActivityId: "ATV-1009",
    cascadeActivityIds: ["ATV-1006"],
    openedAt: isoDaysAgo(8),
    resolvedAt: null,
  },
  {
    id: "ISS-0295",
    title: "Divergência no XML gerado em lote de notas fiscais",
    status: "em_analise",
    impeditiva: false,
    type: "dados",
    impact: "alto",
    area: "Faturamento",
    tester: "Rafael Souza",
    dev: "Vinícius Calefo Assarice",
    relatedActivityId: "ATV-1002",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(5),
    resolvedAt: null,
  },
  {
    id: "ISS-0296",
    title: "Ambiente sem massa de dados de fornecedores",
    status: "em_analise",
    impeditiva: false,
    type: "configuracao",
    impact: "alto",
    area: "Infraestrutura",
    tester: "Leonardo Martins da Silva",
    dev: "Guilherme Fabretti",
    relatedActivityId: null,
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(3),
    resolvedAt: null,
  },
  {
    id: "ISS-0297",
    title: "Cancelamento de NF-e diverge do processo homologado",
    status: "solucao_proposta",
    impeditiva: false,
    type: "requisito",
    impact: "medio",
    area: "Faturamento",
    tester: "Leonardo Martins da Silva",
    dev: "Vinícius Calefo Assarice",
    relatedActivityId: "ATV-1003",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(7),
    resolvedAt: null,
  },
  {
    id: "ISS-0298",
    title: "Upload de documentos falha para arquivos acima de 10MB",
    status: "solucao_proposta",
    impeditiva: false,
    type: "performance",
    impact: "medio",
    area: "Cadastro",
    tester: "Rafael Souza",
    dev: "J. Prado",
    relatedActivityId: "ATV-1012",
    cascadeActivityIds: ["ATV-1013", "ATV-1018"],
    openedAt: isoDaysAgo(6),
    resolvedAt: null,
  },
  {
    id: "ISS-0299",
    title: "Layout do relatório de divergências diverge do especificado",
    status: "solucao_proposta",
    impeditiva: false,
    type: "interface",
    impact: "baixo",
    area: "Relatórios",
    tester: "Guilherme Fabretti",
    dev: "M. Torres",
    relatedActivityId: null,
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(4),
    resolvedAt: null,
  },
  {
    id: "ISS-0300",
    title: "Cálculo de ICMS arredondado incorretamente na emissão",
    status: "concluida",
    impeditiva: false,
    type: "dados",
    impact: "medio",
    area: "Faturamento",
    tester: "Rafael Souza",
    dev: "Vinícius Calefo Assarice",
    relatedActivityId: "ATV-1001",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(12),
    resolvedAt: isoDaysAgo(10),
  },
  {
    id: "ISS-0301",
    title: "Baixa automática de boleto registrada em duplicidade",
    status: "concluida",
    impeditiva: false,
    type: "dados",
    impact: "alto",
    area: "Pagamentos",
    tester: "Guilherme Fabretti",
    dev: "C. Prado",
    relatedActivityId: "ATV-1005",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(15),
    resolvedAt: isoDaysAgo(12),
  },
  {
    id: "ISS-0302",
    title: "Notificação de boas-vindas enviada em duplicidade",
    status: "concluida",
    impeditiva: false,
    type: "requisito",
    impact: "baixo",
    area: "Cadastro",
    tester: "Rafael Souza",
    dev: "J. Prado",
    relatedActivityId: null,
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(20),
    resolvedAt: isoDaysAgo(16),
  },
  {
    id: "ISS-0303",
    title: "Atualização cadastral em massa trava acima de 500 registros",
    status: "concluida",
    impeditiva: false,
    type: "performance",
    impact: "alto",
    area: "Cadastro",
    tester: "Leonardo Martins da Silva",
    dev: "C. Prado",
    relatedActivityId: "ATV-1017",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(18),
    resolvedAt: isoDaysAgo(13),
  },
  {
    id: "ISS-0304",
    title: "Cadastro de cliente PJ aceita CNPJ inválido",
    status: "concluida",
    impeditiva: false,
    type: "requisito",
    impact: "medio",
    area: "Cadastro",
    tester: "Leonardo Martins da Silva",
    dev: "J. Prado",
    relatedActivityId: "ATV-1010",
    cascadeActivityIds: [],
    openedAt: isoDaysAgo(9),
    resolvedAt: isoDaysAgo(7),
  },
];

interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
}

export function useIssues(projectId: string): UseIssuesResult {
  // O mock ainda não filtra por projeto — mesmo padrão de useActivities.
  void projectId;
  const [issues] = useState<Issue[]>(INITIAL_ISSUES);

  const stats = useMemo<IssueStats>(() => {
    const abertas = issues.filter((issue) => issue.status === "aberta").length;
    const emAnalise = issues.filter((issue) => issue.status === "em_analise").length;
    const solucaoProposta = issues.filter((issue) => issue.status === "solucao_proposta").length;
    const concluidas = issues.filter((issue) => issue.status === "concluida").length;
    const impeditivasAbertas = issues.filter(
      (issue) => issue.impeditiva && issue.status !== "concluida"
    ).length;

    const resolvedDurations: number[] = [];
    for (const issue of issues) {
      if (issue.resolvedAt !== null) {
        const days = (new Date(issue.resolvedAt).getTime() - new Date(issue.openedAt).getTime()) / 86400000;
        resolvedDurations.push(days);
      }
    }
    const tempoMedioResolucaoDias =
      resolvedDurations.length === 0
        ? null
        : resolvedDurations.reduce((sum, days) => sum + days, 0) / resolvedDurations.length;

    return {
      total: issues.length,
      abertas,
      emAnalise,
      solucaoProposta,
      concluidas,
      impeditivasAbertas,
      tempoMedioResolucaoDias,
    };
  }, [issues]);

  return { issues, stats };
}
