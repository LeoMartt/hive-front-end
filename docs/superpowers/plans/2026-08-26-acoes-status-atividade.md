# Ações de status da Atividade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os botões hoje decorativos "Concluir atividade" e "Rejeitar atividade" em `ActivityDetailPage` por transições de status reais, e fechar o loop com Issues (uma issue em "Solução proposta" vinculada à atividade concluída passa a "Concluída" automaticamente).

**Architecture:** Dois mutators novos de **atualização** em `useActivities.ts` (`.map()`, mesmo padrão de `startAnalysis`/`proposeSolution` em `useIssues.ts`): `concludeActivity` e `rejectActivity`. Um mutator novo em `useIssues.ts` — `resolveIssuesForActivity` — chamado separadamente pela página logo após `concludeActivity`, sem acoplar os dois hooks entre si. "Concluir atividade" abre um modal com textarea obrigatória + dropzone opcional (clone estrutural do `ProposeSolutionModal` já existente); "Rejeitar atividade" abre um modal mais simples, só com textarea obrigatória. `ActivityFieldGrid` já lê `approvalEvidence`/`approvalNote` (mostrando "— pendente" quando nulos) e `deriveIssueAuditTrail` já lê `issue.resolvedAt` para a entrada "Solução proposta → Concluída (atividade vinculada aprovada)" — nenhum dos dois precisa de mudança, só passam a receber dado real.

**Tech Stack:** React 19 + TypeScript. Sem suíte de testes automatizada (`CLAUDE.md`) — cada task fecha com `npx tsc -b` limpo; a verificação funcional final é QA manual via `npm run dev` (feita por um humano com login real — este app exige SSO real via Entra ID/MSAL, sem bypass de dev).

**Commits:** Nenhuma task deste plano inclui passo de commit — por instrução direta do usuário, commits e PRs neste branch ficam exclusivamente a cargo dele. Ao final de cada task, pare com as mudanças no working tree, sem rodar `git add`/`git commit`.

---

### Task 1: Estender `Activity` com `rejectedAt` e `ConcludeActivityInput`

**Files:**
- Modify: `src/types/activity.ts`

- [ ] **Step 1: Adicionar `rejectedAt` à interface `Activity`**

Em `src/types/activity.ts`, substituir:

```ts
  attachments: ActivityAttachment[];
  approvalEvidence: ActivityAttachment | null;
  approvalNote: string | null;
}
```

por:

```ts
  attachments: ActivityAttachment[];
  approvalEvidence: ActivityAttachment | null;
  approvalNote: string | null;
  rejectedAt: string | null;
}
```

- [ ] **Step 2: Adicionar `ConcludeActivityInput`**

Logo após a interface `NewActivityInput` (que termina em `notes: string | null;\n}`) e antes de `ActivityStats`, adicionar:

```ts

export interface ConcludeActivityInput {
  approvalNote: string;
  approvalEvidence: ActivityAttachment | null;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: erros em `src/hooks/useActivities.ts` (os 18 objetos de `INITIAL_ACTIVITIES` e o `createActivity` ainda não têm `rejectedAt`) — esperado nesta altura, resolvido na Task 2.

## Context

`ConcludeActivityInput` segue o mesmo formato de `ProposeSolutionInput` (`src/types/issue.ts`): um texto obrigatório + um anexo opcional já resolvido em `ActivityAttachment | null` (a UI resolve o `File` selecionado antes de chamar o mutator). `rejectActivity` (Task 3) não precisa de um tipo de input próprio — recebe só uma `string` (o motivo), não há necessidade de um wrapper de objeto para um único campo.

---

### Task 2: Mutators `concludeActivity`/`rejectActivity` e seed com `rejectedAt`

**Files:**
- Modify: `src/hooks/useActivities.ts`

- [ ] **Step 1: Substituir o array `INITIAL_ACTIVITIES` inteiro**

Em `src/hooks/useActivities.ts`, substituir o array `INITIAL_ACTIVITIES` (da linha `const INITIAL_ACTIVITIES: Activity[] = [` até o `];` que o fecha) por esta versão — idêntica à atual, só com `rejectedAt` adicionado a cada um dos 18 objetos (`null` em 14 deles; nas 4 atividades com `retestCount > 0` — `ATV-1003`, `ATV-1009`, `ATV-1015` e `ATV-1017` —, um valor plausível logo após `actualStart`; `ATV-1017` entra na lista mesmo já estando `concluido`, porque a regra da trilha de auditoria de Task 4 dispara por `retestCount > 0`, não pelo status):

```ts
const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: "ATV-1001",
    name: "Validar cálculo de ICMS na emissão",
    status: "concluido",
    module: "Faturamento",
    process: "Emissão de NF-e",
    tester: "Rafael Souza",
    dev: "Vinícius Calefo Assarice",
    plannedStart: isoDaysFromNow(-20),
    plannedEnd: isoDaysFromNow(-10),
    actualStart: isoDaysFromNow(-19),
    actualEnd: isoDaysFromNow(-9),
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.1.1.1",
    area: "Fiscal",
    system: "SAP S/4HANA",
    transaction: "VF01",
    expectedResult: "NF-e emitida com valor de ICMS calculado conforme alíquota da operação, sem divergência frente ao SPED Fiscal.",
    notes: "Cenário validado com alíquota interna de 18%.",
    attachments: [
      { fileName: "icms_calculo_v1.pdf", sizeLabel: "180 KB", uploadedBy: "Rafael Souza", uploadedAt: isoDaysFromNow(-9) },
    ],
    approvalEvidence: {
      fileName: "icms_calculo_v1.pdf",
      sizeLabel: "180 KB",
      uploadedBy: "Rafael Souza",
      uploadedAt: isoDaysFromNow(-9),
    },
    approvalNote: "Conferido contra o SPED Fiscal, sem divergências.",
    rejectedAt: null,
  },
  {
    id: "ATV-1002",
    name: "Testar emissão em lote de notas fiscais",
    status: "execucao",
    module: "Faturamento",
    process: "Emissão de NF-e",
    tester: "Rafael Souza",
    dev: "Vinícius Calefo Assarice",
    plannedStart: isoDaysFromNow(-5),
    plannedEnd: isoDaysFromNow(3),
    actualStart: isoDaysFromNow(-4),
    actualEnd: null,
    predecessors: ["ATV-1001"],
    retestCount: 0,
    issueCount: 1,
    wbs: "1.1.1.2",
    area: "Fiscal",
    system: "SAP S/4HANA",
    transaction: "VF04",
    expectedResult: "Lote de notas fiscais emitido sem erros, com numeração sequencial preservada.",
    notes: "Depende da conclusão de ATV-1001 para reaproveitar a massa de dados de ICMS.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1003",
    name: "Validar cancelamento de NF-e",
    status: "bloqueado",
    module: "Faturamento",
    process: "Emissão de NF-e",
    tester: "Leonardo Martins da Silva",
    dev: "Vinícius Calefo Assarice",
    plannedStart: isoDaysFromNow(-8),
    plannedEnd: isoDaysFromNow(-1),
    actualStart: isoDaysFromNow(-7),
    actualEnd: null,
    predecessors: ["ATV-1001"],
    retestCount: 1,
    issueCount: 2,
    wbs: "1.1.1.3",
    area: "Fiscal",
    system: "SAP S/4HANA",
    transaction: "VF11",
    expectedResult: "Nota fiscal cancelada dentro do prazo legal, com motivo de cancelamento registrado no XML.",
    notes: "Bloqueada aguardando ajuste na regra de determinação de alíquota (ver ISS-0291).",
    attachments: [
      {
        fileName: "print_erro_cancelamento.png",
        sizeLabel: "540 KB",
        uploadedBy: "Leonardo Martins da Silva",
        uploadedAt: isoDaysFromNow(-6),
      },
    ],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: isoDaysFromNow(-6),
  },
  {
    id: "ATV-1004",
    name: "Testar exportação de XML da NF-e",
    status: "aguardando",
    module: "Faturamento",
    process: "Emissão de NF-e",
    tester: "Rafael Souza",
    dev: "J. Prado",
    plannedStart: isoDaysFromNow(2),
    plannedEnd: isoDaysFromNow(9),
    actualStart: null,
    actualEnd: null,
    predecessors: ["ATV-1002"],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.1.1.4",
    area: "Fiscal",
    system: "SAP S/4HANA",
    transaction: "J1B3",
    expectedResult: "Arquivo XML exportado no layout vigente da SEFAZ, sem falha de schema.",
    notes: "Aguardando conclusão de ATV-1002.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1005",
    name: "Testar baixa automática de boletos",
    status: "concluido",
    module: "Faturamento",
    process: "Conciliação de Pagamentos",
    tester: "Guilherme Fabretti",
    dev: "C. Prado",
    plannedStart: isoDaysFromNow(-25),
    plannedEnd: isoDaysFromNow(-15),
    actualStart: isoDaysFromNow(-24),
    actualEnd: isoDaysFromNow(-14),
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.1.2.1",
    area: "Tesouraria",
    system: "SAP S/4HANA",
    transaction: "F110",
    expectedResult: "Boleto baixado automaticamente no sistema após confirmação de pagamento pelo banco.",
    notes: null,
    attachments: [
      { fileName: "boleto_baixa_lote.pdf", sizeLabel: "96 KB", uploadedBy: "Guilherme Fabretti", uploadedAt: isoDaysFromNow(-14) },
    ],
    approvalEvidence: {
      fileName: "boleto_baixa_lote.pdf",
      sizeLabel: "96 KB",
      uploadedBy: "Guilherme Fabretti",
      uploadedAt: isoDaysFromNow(-14),
    },
    approvalNote: "Validado contra extrato bancário do dia.",
    rejectedAt: null,
  },
  {
    id: "ATV-1006",
    name: "Validar conciliação de PIX",
    status: "execucao",
    module: "Faturamento",
    process: "Conciliação de Pagamentos",
    tester: "Guilherme Fabretti",
    dev: "C. Prado",
    plannedStart: isoDaysFromNow(-3),
    plannedEnd: isoDaysFromNow(4),
    actualStart: isoDaysFromNow(-2),
    actualEnd: null,
    predecessors: ["ATV-1005"],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.1.2.2",
    area: "Tesouraria",
    system: "SAP S/4HANA",
    transaction: "FF67",
    expectedResult: "Transação PIX conciliada automaticamente com o extrato bancário, sem lançamento manual.",
    notes: "Depende da conclusão de ATV-1005.",
    attachments: [
      {
        fileName: "conciliacao_pix_v1.xlsx",
        sizeLabel: "72 KB",
        uploadedBy: "Guilherme Fabretti",
        uploadedAt: isoDaysFromNow(-2),
      },
    ],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1007",
    name: "Testar estorno de pagamento duplicado",
    status: "liberado",
    module: "Faturamento",
    process: "Conciliação de Pagamentos",
    tester: "Leonardo Martins da Silva",
    dev: "C. Prado",
    plannedStart: isoDaysFromNow(1),
    plannedEnd: isoDaysFromNow(6),
    actualStart: null,
    actualEnd: null,
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.1.2.3",
    area: "Tesouraria",
    system: "SAP S/4HANA",
    transaction: "FCH8",
    expectedResult: "Pagamento duplicado identificado e estornado automaticamente, com notificação ao Financeiro.",
    notes: "Ainda não iniciada — aguardando liberação do ambiente de homologação.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1008",
    name: "Validar relatório de divergências",
    status: "cancelado",
    module: "Faturamento",
    process: "Conciliação de Pagamentos",
    tester: "Rafael Souza",
    dev: "M. Torres",
    plannedStart: isoDaysFromNow(-10),
    plannedEnd: isoDaysFromNow(-2),
    actualStart: null,
    actualEnd: null,
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.1.2.4",
    area: "Tesouraria",
    system: "SAP S/4HANA",
    transaction: "FB03",
    expectedResult: "Relatório lista todas as divergências entre extrato bancário e lançamentos do sistema, sem falso positivo.",
    notes: "Cancelada — escopo absorvido pela nova versão do relatório de conciliação.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1009",
    name: "Testar integração com banco emissor",
    status: "bloqueado",
    module: "Faturamento",
    process: "Conciliação de Pagamentos",
    tester: "Guilherme Fabretti",
    dev: "M. Torres",
    plannedStart: isoDaysFromNow(-6),
    plannedEnd: isoDaysFromNow(-1),
    actualStart: isoDaysFromNow(-5),
    actualEnd: null,
    predecessors: ["ATV-1006"],
    retestCount: 2,
    issueCount: 3,
    wbs: "1.1.2.5",
    area: "Tesouraria",
    system: "SAP S/4HANA",
    transaction: "F-28",
    expectedResult: "Arquivo de remessa CNAB 240 processado pelo banco emissor sem timeout, mesmo com mais de 500 registros.",
    notes: "Bloqueada por timeout na integração (ver ISS-0290/ISS-0294).",
    attachments: [
      { fileName: "log_timeout_cnab240.txt", sizeLabel: "12 KB", uploadedBy: "Guilherme Fabretti", uploadedAt: isoDaysFromNow(-5) },
    ],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: isoDaysFromNow(-4),
  },
  {
    id: "ATV-1010",
    name: "Testar cadastro de cliente PJ",
    status: "concluido",
    module: "Cadastro de Clientes",
    process: "Onboarding",
    tester: "Leonardo Martins da Silva",
    dev: "J. Prado",
    plannedStart: isoDaysFromNow(-18),
    plannedEnd: isoDaysFromNow(-12),
    actualStart: isoDaysFromNow(-17),
    actualEnd: isoDaysFromNow(-11),
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.2.1.1",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "XD01",
    expectedResult: "Cliente PJ cadastrado com validação de CNPJ na Receita Federal, sem permitir CNPJ inválido.",
    notes: null,
    attachments: [
      {
        fileName: "cadastro_pj_evidencia.png",
        sizeLabel: "310 KB",
        uploadedBy: "Leonardo Martins da Silva",
        uploadedAt: isoDaysFromNow(-11),
      },
    ],
    approvalEvidence: {
      fileName: "cadastro_pj_evidencia.png",
      sizeLabel: "310 KB",
      uploadedBy: "Leonardo Martins da Silva",
      uploadedAt: isoDaysFromNow(-11),
    },
    approvalNote: "CNPJ validado na Receita, cadastro aprovado sem ressalvas.",
    rejectedAt: null,
  },
  {
    id: "ATV-1011",
    name: "Testar cadastro de cliente PF",
    status: "concluido",
    module: "Cadastro de Clientes",
    process: "Onboarding",
    tester: "Leonardo Martins da Silva",
    dev: "J. Prado",
    plannedStart: isoDaysFromNow(-18),
    plannedEnd: isoDaysFromNow(-12),
    actualStart: isoDaysFromNow(-17),
    actualEnd: isoDaysFromNow(-12),
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.2.1.2",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "FD01",
    expectedResult: "Cliente PF cadastrado com validação de CPF, sem permitir duplicidade de cadastro.",
    notes: null,
    attachments: [
      {
        fileName: "cadastro_pf_evidencia.png",
        sizeLabel: "280 KB",
        uploadedBy: "Leonardo Martins da Silva",
        uploadedAt: isoDaysFromNow(-12),
      },
    ],
    approvalEvidence: {
      fileName: "cadastro_pf_evidencia.png",
      sizeLabel: "280 KB",
      uploadedBy: "Leonardo Martins da Silva",
      uploadedAt: isoDaysFromNow(-12),
    },
    approvalNote: "CPF validado, sem duplicidade encontrada.",
    rejectedAt: null,
  },
  {
    id: "ATV-1012",
    name: "Validar upload de documentos",
    status: "execucao",
    module: "Cadastro de Clientes",
    process: "Onboarding",
    tester: "Rafael Souza",
    dev: "J. Prado",
    plannedStart: isoDaysFromNow(-2),
    plannedEnd: isoDaysFromNow(5),
    actualStart: isoDaysFromNow(-1),
    actualEnd: null,
    predecessors: ["ATV-1010"],
    retestCount: 0,
    issueCount: 1,
    wbs: "1.2.1.3",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "CV01N",
    expectedResult: "Documento enviado e vinculado ao cadastro do cliente, com limite de tamanho respeitado.",
    notes: "Falha registrada para arquivos acima de 10MB (ver ISS-0298).",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1013",
    name: "Testar assinatura eletrônica de contrato",
    status: "aguardando",
    module: "Cadastro de Clientes",
    process: "Onboarding",
    tester: "Guilherme Fabretti",
    dev: "Vinícius Calefo Assarice",
    plannedStart: isoDaysFromNow(4),
    plannedEnd: isoDaysFromNow(11),
    actualStart: null,
    actualEnd: null,
    predecessors: ["ATV-1012"],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.2.1.4",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "SIGN01",
    expectedResult: "Contrato assinado eletronicamente e arquivado com trilha de validade jurídica.",
    notes: "Aguardando conclusão de ATV-1012.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1014",
    name: "Validar CPF/CNPJ na base da Receita",
    status: "execucao",
    module: "Cadastro de Clientes",
    process: "Validação de Dados",
    tester: "Leonardo Martins da Silva",
    dev: "M. Torres",
    plannedStart: isoDaysFromNow(-4),
    plannedEnd: isoDaysFromNow(-1),
    actualStart: isoDaysFromNow(-3),
    actualEnd: null,
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.2.2.1",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "XD03",
    expectedResult: "Consulta à base da Receita retorna situação cadastral correta em até 3 segundos.",
    notes: null,
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1015",
    name: "Testar bloqueio de CPF/CNPJ inválido",
    status: "bloqueado",
    module: "Cadastro de Clientes",
    process: "Validação de Dados",
    tester: "Rafael Souza",
    dev: "M. Torres",
    plannedStart: isoDaysFromNow(-9),
    plannedEnd: isoDaysFromNow(-3),
    actualStart: isoDaysFromNow(-8),
    actualEnd: null,
    predecessors: ["ATV-1014"],
    retestCount: 3,
    issueCount: 1,
    wbs: "1.2.2.2",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "XD02",
    expectedResult: "Cadastro com CPF/CNPJ inválido é bloqueado e dispara alerta ao usuário.",
    notes: "Bloqueada — alerta não está sendo disparado (ver ISS-0293), 3º reteste em andamento.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: isoDaysFromNow(-7),
  },
  {
    id: "ATV-1016",
    name: "Validar duplicidade de cadastro",
    status: "liberado",
    module: "Cadastro de Clientes",
    process: "Validação de Dados",
    tester: "Guilherme Fabretti",
    dev: "C. Prado",
    plannedStart: isoDaysFromNow(2),
    plannedEnd: isoDaysFromNow(8),
    actualStart: null,
    actualEnd: null,
    predecessors: [],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.2.2.3",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "XD05",
    expectedResult: "Sistema impede cadastro duplicado com o mesmo CPF/CNPJ, exibindo o registro existente.",
    notes: "Ainda não iniciada.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
  {
    id: "ATV-1017",
    name: "Testar atualização cadastral em massa",
    status: "concluido",
    module: "Cadastro de Clientes",
    process: "Validação de Dados",
    tester: "Leonardo Martins da Silva",
    dev: "C. Prado",
    plannedStart: isoDaysFromNow(-22),
    plannedEnd: isoDaysFromNow(-16),
    actualStart: isoDaysFromNow(-21),
    actualEnd: isoDaysFromNow(-15),
    predecessors: [],
    retestCount: 1,
    issueCount: 0,
    wbs: "1.2.2.4",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "XD99",
    expectedResult: "Atualização cadastral em lote processa mais de 500 registros sem travar o sistema.",
    notes: "Aprovada após 1 reteste — correção de performance validada.",
    attachments: [
      {
        fileName: "atualizacao_massa_log.xlsx",
        sizeLabel: "410 KB",
        uploadedBy: "Leonardo Martins da Silva",
        uploadedAt: isoDaysFromNow(-15),
      },
    ],
    approvalEvidence: {
      fileName: "atualizacao_massa_log.xlsx",
      sizeLabel: "410 KB",
      uploadedBy: "Leonardo Martins da Silva",
      uploadedAt: isoDaysFromNow(-15),
    },
    approvalNote: "Segunda execução processou os 500+ registros sem travamento.",
    rejectedAt: isoDaysFromNow(-20),
  },
  {
    id: "ATV-1018",
    name: "Validar notificação de boas-vindas",
    status: "aguardando",
    module: "Cadastro de Clientes",
    process: "Onboarding",
    tester: "Rafael Souza",
    dev: "J. Prado",
    plannedStart: isoDaysFromNow(6),
    plannedEnd: isoDaysFromNow(12),
    actualStart: null,
    actualEnd: null,
    predecessors: ["ATV-1013"],
    retestCount: 0,
    issueCount: 0,
    wbs: "1.2.1.5",
    area: "Cadastro",
    system: "SAP S/4HANA",
    transaction: "SO10",
    expectedResult: "Notificação de boas-vindas enviada uma única vez por cadastro concluído, sem duplicidade.",
    notes: "Aguardando conclusão de ATV-1013.",
    attachments: [],
    approvalEvidence: null,
    approvalNote: null,
    rejectedAt: null,
  },
];
```

- [ ] **Step 2: Atualizar `UseActivitiesResult` e `createActivity`**

Substituir:

```ts
interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
  createActivity: (input: NewActivityInput) => void;
}
```

por:

```ts
interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
  createActivity: (input: NewActivityInput) => void;
  concludeActivity: (activityId: string, input: ConcludeActivityInput) => void;
  rejectActivity: (activityId: string, reason: string) => void;
}
```

Atualizar o import do topo do arquivo (linha 2), de:

```ts
import type { Activity, ActivityStats, NewActivityInput } from "../types/activity";
```

para:

```ts
import type { Activity, ActivityStats, NewActivityInput, ConcludeActivityInput } from "../types/activity";
```

No corpo de `createActivity`, adicionar `rejectedAt: null,` logo após `approvalNote: null,` (o objeto `newActivity` monta uma atividade nova, sempre sem rejeição prévia):

```ts
        attachments: [],
        approvalEvidence: null,
        approvalNote: null,
        rejectedAt: null,
      };
```

- [ ] **Step 3: Adicionar os dois mutators e retorná-los**

Logo após a função `createActivity` (que termina em `}` antes de `return { activities, stats, createActivity };`), adicionar:

```ts

  // Segundo par de mutators de ATUALIZAÇÃO do hook (depois de createActivity) — mesma
  // convenção de startAnalysis/proposeSolution em useIssues.ts: .map(), sem validação
  // própria (isso vive na UI).
  function concludeActivity(activityId: string, input: ConcludeActivityInput): void {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              status: "concluido",
              actualEnd: toLocalIsoString(new Date()),
              approvalNote: input.approvalNote,
              approvalEvidence: input.approvalEvidence,
            }
          : activity
      )
    );
  }

  function rejectActivity(activityId: string, reason: string): void {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId
          ? {
              ...activity,
              status: "bloqueado",
              notes: reason,
              retestCount: activity.retestCount + 1,
              rejectedAt: toLocalIsoString(new Date()),
            }
          : activity
      )
    );
  }
```

Depois substituir a linha final:

```ts
  return { activities, stats, createActivity };
}
```

por:

```ts
  return { activities, stats, createActivity, concludeActivity, rejectActivity };
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

## Context

`toLocalIsoString` já está importado no topo de `useActivities.ts` (usado por `isoDaysFromNow`) — não precisa adicionar esse import. Os valores de `rejectedAt` nas 4 atividades com `retestCount > 0` (`ATV-1003`, `ATV-1009`, `ATV-1015`, `ATV-1017`) foram escolhidos um dia depois do respectivo `actualStart`, coerente com a narrativa já escrita em `notes`/`approvalNote` de cada uma (ex.: `ATV-1003` já diz "Bloqueada aguardando ajuste na regra de determinação de alíquota"; `ATV-1017` já diz "Aprovada após 1 reteste"). `ATV-1017` entra nessa lista apesar de já estar `concluido` — sem esse valor, a regra de `deriveActivityAuditTrail` (Task 4) baseada em `retestCount > 0` cairia no fallback `actualStart`, colidindo com o timestamp da entrada "Aguardando → Em execução" da mesma atividade. `deriveActivityAuditTrail` (Task 4) é quem vai ler esse campo — nenhuma outra tela ou util lê `rejectedAt` além dela.

---

### Task 3: `resolveIssuesForActivity` em `useIssues.ts`

**Files:**
- Modify: `src/hooks/useIssues.ts`

- [ ] **Step 1: Atualizar `UseIssuesResult`**

Substituir:

```ts
interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
  startAnalysis: (issueId: string) => void;
  proposeSolution: (issueId: string, input: ProposeSolutionInput) => void;
}
```

por:

```ts
interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
  startAnalysis: (issueId: string) => void;
  proposeSolution: (issueId: string, input: ProposeSolutionInput) => void;
  resolveIssuesForActivity: (activityId: string) => void;
}
```

- [ ] **Step 2: Adicionar o mutator e retorná-lo**

Logo após a função `proposeSolution` (que termina em `}` antes de `return { issues, stats, createIssue, startAnalysis, proposeSolution };`), adicionar:

```ts

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
```

Depois substituir a linha final:

```ts
  return { issues, stats, createIssue, startAnalysis, proposeSolution };
}
```

por:

```ts
  return { issues, stats, createIssue, startAnalysis, proposeSolution, resolveIssuesForActivity };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

## Context

`toLocalIsoString` já está importado no topo de `useIssues.ts`. Issues sem `relatedActivityId` correspondente ou que não estejam em `solucao_proposta` passam pelo `.map()` inalteradas — só a(s) issue(s) vinculada(s) exatamente à atividade concluída, e exatamente nesse status, transicionam. `deriveIssueAuditTrail` (`src/utils/issueAuditTrail.ts`) já lê `status === "concluida" && resolvedAt !== null` para montar a entrada "Solução proposta → Concluída (atividade vinculada aprovada)" — zero mudança necessária ali.

---

### Task 4: Atualizar `deriveActivityAuditTrail`

**Files:**
- Modify: `src/utils/activityAuditTrail.ts`

- [ ] **Step 1: Trocar a regra de `retestCount` para usar `rejectedAt`**

Substituir:

```ts
  if (activity.retestCount > 0) {
    entries.push({
      at: activity.actualStart ?? activity.plannedStart,
      text: `Bloqueado → aguardando reteste (${activity.retestCount}ª vez)`,
    });
  }
```

por:

```ts
  if (activity.retestCount > 0) {
    entries.push({
      at: activity.rejectedAt ?? activity.actualStart ?? activity.plannedStart,
      text: `Em execução → Bloqueado (${activity.retestCount}ª rejeição)`,
    });
  }
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

## Context

Para as 4 atividades que ganharam `rejectedAt` real na Task 2 (`ATV-1003`, `ATV-1009`, `ATV-1015`, `ATV-1017`), a trilha passa a usar esse timestamp exato em vez do fallback em `actualStart` — mais preciso, já que `rejectedAt` marca o momento real da rejeição. Para qualquer atividade futura rejeitada via `rejectActivity` (Task 2), o mesmo vale. O fallback `actualStart ?? plannedStart` continua existindo só como proteção defensiva (nenhum mutator hoje produz `retestCount > 0` com `rejectedAt: null`, mas se o tipo mudar de novo no futuro, a função não quebra).

---

### Task 5: Corrigir o texto de "Evidência de aprovação" ausente em `ActivityFieldGrid`

**Files:**
- Modify: `src/components/activities/ActivityFieldGrid.tsx`

- [ ] **Step 1: Distinguir "pendente" de "concluída sem evidência"**

Em `src/components/activities/ActivityFieldGrid.tsx`, substituir:

```tsx
      {activity.status !== "aguardando" && (
        <>
          <div className="field">
            <div className="field-label">Evidência de aprovação</div>
            {activity.approvalEvidence ? (
              <div className="evidence-file">
                <span className="attach-icon">{activity.approvalEvidence.fileName.split(".").pop()?.toUpperCase()}</span>
                {activity.approvalEvidence.fileName}
              </div>
            ) : (
              <div className="field-value pending">— pendente</div>
            )}
          </div>
          <div className="field">
            <div className="field-label">Observação de aprovação</div>
            <div className={activity.approvalNote ? "field-value" : "field-value pending"}>
              {activity.approvalNote ?? "—"}
            </div>
          </div>
        </>
      )}
```

por:

```tsx
      {activity.status !== "aguardando" && (
        <>
          <div className="field">
            <div className="field-label">Evidência de aprovação</div>
            {activity.approvalEvidence ? (
              <div className="evidence-file">
                <span className="attach-icon">{activity.approvalEvidence.fileName.split(".").pop()?.toUpperCase()}</span>
                {activity.approvalEvidence.fileName}
              </div>
            ) : activity.status === "concluido" ? (
              <div className="field-value">Nenhuma evidência anexada com a aprovação.</div>
            ) : (
              <div className="field-value pending">— pendente</div>
            )}
          </div>
          <div className="field">
            <div className="field-label">Observação de aprovação</div>
            <div className={activity.approvalNote ? "field-value" : "field-value pending"}>
              {activity.approvalNote ?? "—"}
            </div>
          </div>
        </>
      )}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

## Context

Mesmo tipo de correção já feita no ciclo anterior (`IssueAttachmentsPanel`, spec `2026-08-21-acoes-status-issue-design.md`): sem esse ajuste, uma atividade concluída via `concludeActivity` (Task 2) sem evidência anexada (opcional, por design) continuaria mostrando "— pendente" para sempre — texto enganoso, já que nada está de fato pendente numa atividade já concluída. Para atividades `execucao`/`liberado`/`bloqueado` (ainda não concluídas), "— pendente" continua correto e inalterado. "Observação de aprovação" não precisa da mesma correção: o modal de conclusão (Task 6) exige esse campo, então toda atividade `concluido` a partir de agora sempre tem `approvalNote` preenchido — o `"— pendente"` ali só aparece para atividades ainda não concluídas, onde já é o texto certo.

---

### Task 6: `ConcludeActivityModal`

**Files:**
- Create: `src/components/activities/ConcludeActivityModal.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { ConcludeActivityInput } from "../../types/activity";

interface ConcludeActivityModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ConcludeActivityInput) => void;
}

function formatFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function ConcludeActivityModal({ show, onHide, currentUserName, onSubmit }: ConcludeActivityModalProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setText("");
    setSelectedFile(null);
    setDragOver(false);
    setErrorMsg(null);
    onHide();
  }

  function handleConfirm() {
    if (!text.trim()) {
      setErrorMsg("Preencha a observação de aprovação antes de continuar.");
      return;
    }

    onSubmit({
      approvalNote: text.trim(),
      approvalEvidence: selectedFile
        ? {
            fileName: selectedFile.name,
            sizeLabel: formatFileSize(selectedFile.size),
            uploadedBy: currentUserName,
            uploadedAt: toLocalIsoString(new Date()),
          }
        : null,
    });
    resetAndHide();
  }

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="conclude-activity-modal-title">
      <div className="modal-title" id="conclude-activity-modal-title">
        Concluir atividade
      </div>
      <div className="modal-subtitle">
        Registre a observação de aprovação do teste. A evidência é opcional.
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="conclude-activity-text">
          Observação de aprovação
        </label>
        <textarea
          className="form-textarea"
          id="conclude-activity-text"
          placeholder="Ex.: Cenário executado conforme o resultado esperado, sem divergências."
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setErrorMsg(null);
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label" id="conclude-activity-file-label">
          Evidência <span className="optional">(opcional)</span>
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-labelledby="conclude-activity-file-label"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files[0];
            if (file) setSelectedFile(file);
          }}
        >
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          <span>
            {selectedFile
              ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
              : "Clique ou arraste um print/arquivo (opcional)"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.log"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setSelectedFile(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Concluir atividade
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

## Context

Clone estrutural do `ProposeSolutionModal` (`src/components/issues/ProposeSolutionModal.tsx`) — mesma textarea + dropzone, só troca os textos e o tipo de input (`ConcludeActivityInput` em vez de `ProposeSolutionInput`, `approvalNote`/`approvalEvidence` em vez de `proposedSolution`/`solutionAttachment`). `Modal`/`NavIcon`/`.form-group`/`.form-textarea`/`.error-banner`/`.optional`/`.dropzone` já existem, nenhuma classe SCSS nova é necessária. O componente ainda não é ligado a nenhuma página — isso é a Task 8.

**Atualização pós-QA manual:** a versão acima (textarea obrigatória + dropzone opcional) foi implementada e revisada, mas comparando com o protótipo (`modalAprovar`) a validação estava invertida — lá a evidência é obrigatória (`evidenciaObrigatoriaAtividade: true`) e a observação é opcional. `ConcludeActivityModal.tsx` foi reescrito: a textarea de observação vem primeiro (sem validação, rótulo com `(opcional)`), a dropzone de evidência vem depois e é a única obrigatória (banner de erro "Anexe a evidência antes de confirmar." se vazia). `ConcludeActivityInput` (Task 1) também mudou: `approvalNote: string | null` (era `string`), `approvalEvidence: ActivityAttachment` (era `ActivityAttachment | null`).

---

### Task 7: `RejectActivityModal`

**Files:**
- Create: `src/components/activities/RejectActivityModal.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
import { useState } from "react";
import Modal from "../common/Modal";

interface RejectActivityModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (reason: string) => void;
}

export default function RejectActivityModal({ show, onHide, onSubmit }: RejectActivityModalProps) {
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function resetAndHide() {
    setText("");
    setErrorMsg(null);
    onHide();
  }

  function handleConfirm() {
    if (!text.trim()) {
      setErrorMsg("Preencha o motivo da rejeição antes de continuar.");
      return;
    }

    onSubmit(text.trim());
    resetAndHide();
  }

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="reject-activity-modal-title">
      <div className="modal-title" id="reject-activity-modal-title">
        Rejeitar atividade
      </div>
      <div className="modal-subtitle">
        Descreva o motivo da rejeição. A atividade volta para "Bloqueado" e libera o registro de uma nova issue.
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="reject-activity-text">
          Motivo da rejeição
        </label>
        <textarea
          className="form-textarea"
          id="reject-activity-text"
          placeholder="Ex.: Resultado obtido diverge do esperado — cálculo de ICMS retornou valor incorreto."
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setErrorMsg(null);
          }}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" onClick={handleConfirm}>
          Rejeitar atividade
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

## Context

Mais simples que o `ConcludeActivityModal` originalmente — só uma textarea obrigatória, sem dropzone (a spec definiu que evidência do problema em si é responsabilidade do fluxo "Registrar nova issue", já existente para atividades `bloqueado`, não deste modal). Botão de confirmação usa `btn-danger` — mesma classe que `ActivityDetailPage` já usa no botão "Rejeitar atividade" que abre este modal.

**Atualização pós-QA manual (1ª rodada):** o QA humano apontou que faltava anexar evidência ao rejeitar. Correção aplicada: `RejectActivityModal` ganhou uma dropzone opcional idêntica à do `ConcludeActivityModal`, `onSubmit` passou a receber `RejectActivityInput { reason, evidence }` em vez de um `reason: string` solto, e `rejectActivity` (Task 2) passou a anexar `evidence` (quando presente) no array `activity.attachments` já existente.

**Atualização pós-QA manual (2ª rodada, versão final):** comparando com o protótipo original, `RejectActivityModal.tsx` foi **removido por completo** — "Rejeitar atividade" passou a reaproveitar `RegisterIssueModal` (o mesmo modal de "Registrar issue", que ganhou props opcionais `submitLabel`/`title`), criando uma Issue de verdade vinculada à atividade e bloqueando a atividade na mesma ação (`reason: input.description`, `evidence: input.openingAttachment`). Ver a spec (`2026-08-26-acoes-status-atividade-design.md`) pra detalhe completo — essa é a versão que efetivamente ficou no código.

---

### Task 8: Wire `ActivityDetailPage`

**Files:**
- Modify: `src/pages/ActivityDetailPage.tsx`

- [ ] **Step 1: Adicionar os imports novos**

No topo de `src/pages/ActivityDetailPage.tsx`, logo após o import de `RegisterIssueModal`, adicionar:

```tsx
import ConcludeActivityModal from "../components/activities/ConcludeActivityModal";
import RejectActivityModal from "../components/activities/RejectActivityModal";
```

- [ ] **Step 2: Desestruturar os novos mutators dos hooks**

Substituir:

```tsx
  const { activities } = useActivities(projectId);
  const { issues, createIssue } = useIssues(projectId);
```

por:

```tsx
  const { activities, concludeActivity, rejectActivity } = useActivities(projectId);
  const { issues, createIssue, resolveIssuesForActivity } = useIssues(projectId);
```

- [ ] **Step 3: Adicionar os dois `useState` de modal**

Substituir:

```tsx
  const [showRegisterIssueModal, setShowRegisterIssueModal] = useState(false);
```

por:

```tsx
  const [showRegisterIssueModal, setShowRegisterIssueModal] = useState(false);
  const [showConcludeModal, setShowConcludeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
```

- [ ] **Step 4: Ligar os botões "Concluir atividade"/"Rejeitar atividade"**

Substituir:

```tsx
          {(activity.status === "execucao" || activity.status === "liberado") && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                Concluir atividade
              </button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }}>
                Rejeitar atividade
              </button>
            </div>
          )}
```

por:

```tsx
          {(activity.status === "execucao" || activity.status === "liberado") && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setShowConcludeModal(true)}
              >
                Concluir atividade
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setShowRejectModal(true)}
              >
                Rejeitar atividade
              </button>
            </div>
          )}
```

- [ ] **Step 5: Renderizar os dois modais no fim do componente**

Substituir:

```tsx
      <RegisterIssueModal
        show={showRegisterIssueModal}
        onHide={() => setShowRegisterIssueModal(false)}
        team={currentProject?.team ?? []}
        activities={activities}
        currentActivity={activity}
        currentUserName={CURRENT_USER_NAME}
        onCreate={createIssue}
      />
    </div>
  );
}
```

por:

```tsx
      <RegisterIssueModal
        show={showRegisterIssueModal}
        onHide={() => setShowRegisterIssueModal(false)}
        team={currentProject?.team ?? []}
        activities={activities}
        currentActivity={activity}
        currentUserName={CURRENT_USER_NAME}
        onCreate={createIssue}
      />

      <ConcludeActivityModal
        show={showConcludeModal}
        onHide={() => setShowConcludeModal(false)}
        currentUserName={CURRENT_USER_NAME}
        onSubmit={(input) => {
          concludeActivity(activity.id, input);
          resolveIssuesForActivity(activity.id);
        }}
      />

      <RejectActivityModal
        show={showRejectModal}
        onHide={() => setShowRejectModal(false)}
        onSubmit={(reason) => rejectActivity(activity.id, reason)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Type-check e build**

Run: `npx tsc -b && npm run build`
Expected: sem erros.

## Context

`concludeActivity`/`rejectActivity` vêm de `useActivities(projectId)` e `resolveIssuesForActivity` vem de `useIssues(projectId)` — ambos já chamados nesta página (a segunda, para `ActivityLinkedIssuesPanel` e `createIssue`), sem instância nova. `onSubmit` do `ConcludeActivityModal` chama as duas funções em sequência, na mesma função — os hooks não se conhecem entre si, é a página que orquestra. Como `activity`/`issues` são recalculados a cada render a partir dos arrays que os mutators substituem, a UI atualiza sozinha (badge de status, `ActivityFieldGrid`, trilha de auditoria, `ActivityLinkedIssuesPanel`) sem navegação nem reload.

---

### Task 9: QA manual

**Files:** nenhum (task de verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 2: QA manual (humano, login real)**

Run: `npm run dev`. Em `/projetos/:id/atividades`, abrir `ATV-1002` ("Testar emissão em lote de notas fiscais", `execucao`):
- Clicar "Concluir atividade", submeter vazio — banner de erro, modal não fecha.
- Preencher a observação sem evidência e confirmar — status vira "Concluído"; `ActivityFieldGrid` mostra a observação em "Observação de aprovação", e "Evidência de aprovação" mostra "Nenhuma evidência anexada com a aprovação." (não mais "— pendente"); trilha de auditoria mostra "Em execução → Concluído" com o horário certo.
- `ATV-1002` está vinculada a `ISS-0295` (`em_analise`, não `solucao_proposta`) — confirmar que essa issue **não** muda de status (a auto-resolução só se aplica a issues em "Solução proposta").

- [ ] **Step 3: Verificar auto-resolução de issue vinculada**

O seed já tem o cruzamento pronto pra este teste: `ATV-1012` ("Validar upload de documentos") está `execucao`, e `ISS-0298` ("Upload de documentos falha para arquivos acima de 10MB") já está em `solucao_proposta` com `relatedActivityId: "ATV-1012"`. Abrir `/projetos/:id/atividades/ATV-1012`, clicar "Concluir atividade", preencher a observação e confirmar. Depois abrir `/projetos/:id/issues/ISS-0298` e confirmar que o status virou "Concluída" automaticamente: o banner "Aguardando reteste da atividade vinculada" some, e a trilha de auditoria mostra "Solução proposta → Concluída (atividade vinculada aprovada)" com o horário da conclusão de `ATV-1012`.

- [ ] **Step 4: Verificar rejeição**

Abrir `ATV-1014` ("Validar CPF/CNPJ na base da Receita", `execucao`, `retestCount: 0`). Clicar "Rejeitar atividade", submeter vazio — banner de erro. Preencher o motivo e confirmar — status vira "Bloqueado"; "Observações" mostra o motivo digitado (sobrescrevendo `null`); "Nº de reteste" vira "1×"; trilha de auditoria mostra "Em execução → Bloqueado (1ª rejeição)" com o horário atual; botão "Registrar nova issue" aparece (mesmo padrão já existente para atividades `bloqueado`).

- [ ] **Step 5: Verificar atividades já existentes com rejeição no seed**

Abrir `ATV-1003`, `ATV-1009`, `ATV-1015` e `ATV-1017` (as 4 com `rejectedAt` preenchido na Task 2) — confirmar que a trilha de auditoria mostra "Em execução → Bloqueado (Nª rejeição)" (N = `retestCount` de cada uma: 1, 2, 3 e 1 respectivamente) no timestamp do `rejectedAt` do seed, não mais o texto antigo "Bloqueado → aguardando reteste". Em `ATV-1017` (já `concluido`), confirmar especificamente que essa entrada e a entrada "Aguardando → Em execução" aparecem com timestamps diferentes (um dia de diferença), não mais colididas no mesmo instante.

- [ ] **Step 6: Verificar que nada mais regrediu**

Navegar por `/projetos/:id/atividades`, `/projetos/:id/issues` e `/projetos/:id/dashboard` — confirmar que tabelas, filtros, KPIs e Curva S continuam com os mesmos números de antes (as mudanças desta feature só afetam atividades/issues que passarem pelas novas ações durante a sessão de QA).

## Context

Task final, sem mudança de código própria — só executa e confirma o que as Tasks 1–8 já implementaram. O Step 3 é o mais importante: fecha explicitamente o loop entre os dois subsistemas (`concludeActivity` + `resolveIssuesForActivity`) que as duas specs (`2026-08-21-acoes-status-issue-design.md` e esta) documentaram como dependente uma da outra. Skip de suíte automatizada é a mesma decisão de todos os ciclos anteriores deste branch — verificação é `npx tsc -b`/`npm run build` por task, e este QA manual final com login real (SSO via Entra ID/MSAL, sem bypass de dev).
