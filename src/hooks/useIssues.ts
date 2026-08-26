import { useMemo, useState } from "react";
import type { Issue, IssueStats, NewIssueInput, ProposeSolutionInput } from "../types/issue";
import { toLocalIsoString } from "../utils/activityIndicators";

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalIsoString(date);
}

// Próximo ISS-XXXX após o maior número já existente, preservando o zero-padding de 4
// dígitos do seed (ISS-0290...ISS-0304) — mesmo padrão de nextActivityId em useActivities.ts.
function nextIssueId(issues: Issue[]): string {
  const maxNum = issues.reduce((max, issue) => {
    const match = /^ISS-(\d+)$/.exec(issue.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `ISS-${String(maxNum + 1).padStart(4, "0")}`;
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
    description:
      "A integração com o banco emissor retorna timeout ao processar arquivos CNAB 240 com mais de 500 registros, interrompendo a remessa de pagamentos.",
    impactNote: "interrompe a remessa de pagamentos aos fornecedores",
    proposedSolution: null,
    analysisStartedAt: null,
    solutionProposedAt: null,
    openingAttachment: { fileName: "log_timeout_cnab240_v1.txt", sizeLabel: "11 KB", uploadedBy: "Guilherme Fabretti", uploadedAt: isoDaysAgo(6) },
    solutionAttachment: null,
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
    description:
      "O cancelamento de NF-e retorna erro ao reprocessar a nota após a primeira tentativa de estorno, impedindo a conclusão do teste.",
    impactNote: "bloqueia a validação de cancelamento fiscal",
    proposedSolution: null,
    analysisStartedAt: null,
    solutionProposedAt: null,
    openingAttachment: { fileName: "erro_reprocessamento_nfe.png", sizeLabel: "142 KB", uploadedBy: "Leonardo Martins da Silva", uploadedAt: isoDaysAgo(4) },
    solutionAttachment: null,
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
    description:
      "O ambiente de homologação fica instável e apresenta lentidão recorrente às segundas-feiras, após a rotina de atualização noturna do fim de semana.",
    impactNote: "atrasa o início dos testes no começo da semana",
    proposedSolution: null,
    analysisStartedAt: null,
    solutionProposedAt: null,
    openingAttachment: null,
    solutionAttachment: null,
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
    description:
      "O cadastro com CPF/CNPJ inválido não dispara alerta ao usuário, permitindo que o registro seja salvo sem validação.",
    impactNote: "risco de cadastro com documento inválido, sem bloqueio automático",
    proposedSolution: null,
    analysisStartedAt: null,
    solutionProposedAt: null,
    openingAttachment: null,
    solutionAttachment: null,
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
    description:
      "Segunda ocorrência do timeout no CNAB 240, agora também impactando a conciliação de PIX que depende do mesmo lote de remessa.",
    impactNote: "impacta também a atividade de conciliação de PIX em cascata",
    proposedSolution: null,
    analysisStartedAt: isoDaysAgo(7),
    solutionProposedAt: null,
    openingAttachment: { fileName: "log_timeout_cnab240_v2.txt", sizeLabel: "14 KB", uploadedBy: "Guilherme Fabretti", uploadedAt: isoDaysAgo(8) },
    solutionAttachment: null,
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
    description:
      "O XML gerado para emissão em lote de notas fiscais apresenta divergência no campo de código de barras a partir do 200º registro do lote.",
    impactNote: "compromete a validação de lotes grandes de notas fiscais",
    proposedSolution: null,
    analysisStartedAt: isoDaysAgo(4),
    solutionProposedAt: null,
    openingAttachment: { fileName: "xml_divergente_lote.xml", sizeLabel: "34 KB", uploadedBy: "Rafael Souza", uploadedAt: isoDaysAgo(5) },
    solutionAttachment: null,
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
    description:
      "O ambiente de homologação não possui massa de dados de fornecedores cadastrada, impedindo a execução dos cenários de compras dependentes.",
    impactNote: "impede a execução de cenários de compras dependentes",
    proposedSolution: null,
    analysisStartedAt: isoDaysAgo(2),
    solutionProposedAt: null,
    openingAttachment: { fileName: "print_ambiente_sem_fornecedores.png", sizeLabel: "205 KB", uploadedBy: "Leonardo Martins da Silva", uploadedAt: isoDaysAgo(3) },
    solutionAttachment: null,
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
    description:
      "O cancelamento de NF-e segue um roteiro diferente do processo homologado, exigindo passos manuais adicionais não previstos no script de teste.",
    impactNote: "diverge do roteiro homologado de cancelamento fiscal",
    proposedSolution:
      "Ajustado o fluxo de cancelamento para seguir o mesmo roteiro homologado nas demais operações fiscais; aguardando reteste do Tester.",
    analysisStartedAt: isoDaysAgo(6),
    solutionProposedAt: isoDaysAgo(2),
    openingAttachment: null,
    solutionAttachment: { fileName: "fluxo_cancelamento_ajustado.png", sizeLabel: "120 KB", uploadedBy: "Vinícius Calefo Assarice", uploadedAt: isoDaysAgo(2) },
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
    description:
      "O upload de documentos falha silenciosamente para arquivos acima de 10MB, sem exibir mensagem de erro ao usuário.",
    impactNote: "bloqueia o onboarding de clientes com documentos grandes",
    proposedSolution:
      "Aumentado o limite de upload e otimizado o processamento de arquivos grandes; aguardando reteste com arquivo acima de 10MB.",
    analysisStartedAt: isoDaysAgo(5),
    solutionProposedAt: isoDaysAgo(1),
    openingAttachment: { fileName: "erro_upload_10mb.png", sizeLabel: "88 KB", uploadedBy: "Rafael Souza", uploadedAt: isoDaysAgo(6) },
    solutionAttachment: { fileName: "upload_otimizado_evidencia.png", sizeLabel: "76 KB", uploadedBy: "J. Prado", uploadedAt: isoDaysAgo(1) },
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
    description:
      "O layout do relatório de divergências gerado pelo sistema não corresponde ao especificado no documento de requisitos, com colunas fora da ordem definida.",
    impactNote: "divergência apenas visual no relatório, sem impacto funcional",
    proposedSolution:
      "Corrigida a ordem das colunas no template do relatório de divergências; aguardando validação visual do Tester.",
    analysisStartedAt: isoDaysAgo(3),
    solutionProposedAt: isoDaysAgo(1),
    openingAttachment: null,
    solutionAttachment: { fileName: "template_divergencias_corrigido.png", sizeLabel: "92 KB", uploadedBy: "M. Torres", uploadedAt: isoDaysAgo(1) },
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
    description:
      "O cálculo de ICMS na emissão de notas fiscais em lote apresentou arredondamento incorreto na segunda casa decimal, gerando divergência frente ao SPED Fiscal.",
    impactNote: "divergência apenas no arredondamento, sem impacto no valor total da nota",
    proposedSolution:
      "Corrigida a fórmula de arredondamento do ICMS no motor de cálculo fiscal; validado pelo Tester em nova execução do lote.",
    analysisStartedAt: isoDaysAgo(11),
    solutionProposedAt: isoDaysAgo(10),
    openingAttachment: null,
    solutionAttachment: { fileName: "icms_arredondamento_corrigido.png", sizeLabel: "84 KB", uploadedBy: "Vinícius Calefo Assarice", uploadedAt: isoDaysAgo(10) },
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
    description:
      "A baixa automática de boleto foi registrada em duplicidade quando o mesmo pagamento era confirmado por dois canais (PIX e boleto) no mesmo dia.",
    impactNote: "gera divergência no saldo de contas a receber",
    proposedSolution:
      "Adicionada trava de idempotência na baixa automática por identificador único de pagamento; validado com reteste de pagamento em dois canais.",
    analysisStartedAt: isoDaysAgo(14),
    solutionProposedAt: isoDaysAgo(13),
    openingAttachment: { fileName: "baixa_duplicada_evidencia.png", sizeLabel: "118 KB", uploadedBy: "Guilherme Fabretti", uploadedAt: isoDaysAgo(15) },
    solutionAttachment: { fileName: "trava_idempotencia_validada.png", sizeLabel: "95 KB", uploadedBy: "C. Prado", uploadedAt: isoDaysAgo(12) },
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
    description:
      "A notificação de boas-vindas foi enviada em duplicidade para cadastros concluídos via importação em massa.",
    impactNote: "impacto apenas de comunicação, sem risco de dados",
    proposedSolution:
      "Adicionado controle de envio único por cadastro na rotina de notificação em massa; validado com nova carga de teste.",
    analysisStartedAt: isoDaysAgo(19),
    solutionProposedAt: isoDaysAgo(17),
    openingAttachment: null,
    solutionAttachment: { fileName: "notificacao_unica_validada.png", sizeLabel: "60 KB", uploadedBy: "J. Prado", uploadedAt: isoDaysAgo(16) },
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
    description:
      "A atualização cadastral em massa trava o sistema ao processar planilhas com mais de 500 registros, exigindo reinício do processo em lote.",
    impactNote: "impede a manutenção cadastral em lote de grandes volumes",
    proposedSolution:
      "Otimizado o processamento em lote com paginação de 100 registros por vez; validado com carga de 800 registros sem travamento.",
    analysisStartedAt: isoDaysAgo(17),
    solutionProposedAt: isoDaysAgo(15),
    openingAttachment: { fileName: "log_travamento_massa.log", sizeLabel: "28 KB", uploadedBy: "Leonardo Martins da Silva", uploadedAt: isoDaysAgo(18) },
    solutionAttachment: { fileName: "carga_800_registros_ok.png", sizeLabel: "70 KB", uploadedBy: "C. Prado", uploadedAt: isoDaysAgo(13) },
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
    description:
      "O cadastro de cliente PJ aceita CNPJ inválido quando o campo é preenchido sem consulta prévia à Receita Federal.",
    impactNote: "permite cadastro de cliente com documento inválido",
    proposedSolution:
      "Adicionada validação obrigatória de CNPJ na Receita Federal antes de salvar o cadastro; validado com CNPJs inválidos de teste.",
    analysisStartedAt: isoDaysAgo(8),
    solutionProposedAt: isoDaysAgo(7),
    openingAttachment: { fileName: "cnpj_invalido_aceito.png", sizeLabel: "102 KB", uploadedBy: "Leonardo Martins da Silva", uploadedAt: isoDaysAgo(9) },
    solutionAttachment: { fileName: "validacao_cnpj_receita_ok.png", sizeLabel: "77 KB", uploadedBy: "J. Prado", uploadedAt: isoDaysAgo(7) },
  },
];

interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
  startAnalysis: (issueId: string) => void;
  proposeSolution: (issueId: string, input: ProposeSolutionInput) => void;
  resolveIssuesForActivity: (activityId: string) => void;
}

export function useIssues(projectId: string): UseIssuesResult {
  // O mock ainda não filtra por projeto — mesmo padrão de useActivities.
  void projectId;
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);

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

  // Append direto, sem validação própria — mesmo padrão de createActivity em
  // useActivities.ts. A validação de campo obrigatório vive no modal (camada de UI).
  function createIssue(input: NewIssueInput): void {
    setIssues((prev) => {
      const newIssue: Issue = {
        id: nextIssueId(prev),
        title: input.title,
        status: "aberta",
        impeditiva: input.impeditiva,
        type: input.type,
        impact: input.impact,
        area: input.area,
        tester: input.tester,
        dev: input.dev,
        relatedActivityId: input.relatedActivityId,
        cascadeActivityIds: [],
        openedAt: toLocalIsoString(new Date()),
        resolvedAt: null,
        description: input.description,
        impactNote: input.impactNote,
        proposedSolution: null,
        analysisStartedAt: null,
        solutionProposedAt: null,
        openingAttachment: input.openingAttachment,
        solutionAttachment: null,
      };
      return [...prev, newIssue];
    });
  }

  // Primeiros mutators de ATUALIZAÇÃO (não criação) do hook — usam .map() em vez de
  // [...prev, novo]. Mesma convenção de createIssue: sem validação própria, isso vive na UI.
  function startAnalysis(issueId: string): void {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? { ...issue, status: "em_analise", analysisStartedAt: toLocalIsoString(new Date()) }
          : issue
      )
    );
  }

  function proposeSolution(issueId: string, input: ProposeSolutionInput): void {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: "solucao_proposta",
              proposedSolution: input.proposedSolution,
              solutionProposedAt: toLocalIsoString(new Date()),
              solutionAttachment: input.solutionAttachment,
            }
          : issue
      )
    );
  }

  // Chamado pela página de Atividade logo após concludeActivity (useActivities.ts) — os
  // dois hooks não se conhecem entre si, a página que orquestra as duas chamadas.
  function resolveIssuesForActivity(activityId: string): void {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.relatedActivityId === activityId && issue.status === "solucao_proposta"
          ? { ...issue, status: "concluida", resolvedAt: toLocalIsoString(new Date()) }
          : issue
      )
    );
  }

  return { issues, stats, createIssue, startAnalysis, proposeSolution, resolveIssuesForActivity };
}
