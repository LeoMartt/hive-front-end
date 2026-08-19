# Issue Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Issue Detail screen at `/projetos/:id/issues/:issueId` — replacing its current placeholder — covering all 4 issue statuses (`aberta`, `em_analise`, `solucao_proposta`, `concluida`) per `docs/superpowers/specs/2026-08-19-issue-detail-design.md`, plus a shared origin-aware "Voltar" hook used by both the new Issue Detail page and the existing Activity Detail page.

**Architecture:** Same layered approach as Activity Detail: `Issue` (extended) + `useIssues` (reseeded) for data, a new pure `issueAuditTrail.ts` util to derive the audit trail from existing fields (no new stored model), small single-responsibility presentational components composed into one page (`IssueDetailPage`). A new `useGoBack` hook centralizes origin-aware back navigation (browser history with a fallback route), replacing the fixed-destination `goBack` currently local to `ActivityDetailPage`.

**Tech Stack:** React 19, TypeScript, react-router v8, plain SCSS (no Bootstrap). No new dependencies, no new SCSS partial — this screen reuses `_activity-detail.scss` and `_issues.scss` classes that already exist.

**No automated tests in this plan** — same decision as every previous feature; verification is `npx tsc -b` after each task plus a manual browser QA pass in the final task, with exact expected numbers computed from the seed data below.

---

## File Structure Overview

```
src/
├── types/
│   └── issue.ts                                  # modified — Issue gains 7 fields, new IssueAttachment type
├── hooks/
│   ├── useIssues.ts                               # modified — 15 seed issues gain the 7 fields
│   └── useGoBack.ts                               # new
├── utils/
│   └── issueAuditTrail.ts                         # new
├── components/
│   └── issues/
│       ├── IssueFieldGrid.tsx                     # new
│       ├── IssueAuditTrail.tsx                    # new
│       └── IssueAttachmentsPanel.tsx              # new
├── pages/
│   ├── IssueDetailPage.tsx                        # new
│   ├── IssueDetailPlaceholderPage.tsx              # deleted
│   └── ActivityDetailPage.tsx                     # modified — uses useGoBack instead of local goBack
├── routes/
│   └── AppRoutes.tsx                              # modified — issues/:issueId route
```

---

### Task 1: Extend the `Issue` type and reseed `useIssues`

**Files:**
- Modify: `src/types/issue.ts`
- Modify: `src/hooks/useIssues.ts`

- [ ] **Step 1: Add `IssueAttachment` and the new `Issue` fields**

In `src/types/issue.ts`, replace the whole file with:

```ts
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

export interface IssueStats {
  total: number;
  abertas: number;
  emAnalise: number;
  solucaoProposta: number;
  concluidas: number;
  impeditivasAbertas: number;
  tempoMedioResolucaoDias: number | null;
}
```

- [ ] **Step 2: Add the new fields to the 15 seed issues**

In `src/hooks/useIssues.ts`, replace the `INITIAL_ISSUES` array (keep `isoDaysAgo`, imports, and everything after the array unchanged) with:

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/issue.ts src/hooks/useIssues.ts
git commit -m "feat: extend Issue with description/impactNote/proposedSolution/timestamps/attachments"
```

## Context

This is Task 1 of 8. `id`, `title`, `status`, `impeditiva`, `type`, `impact`, `area`, `tester`, `dev`, `relatedActivityId`, `cascadeActivityIds`, `openedAt`, `resolvedAt` are untouched on every record — only the 7 new fields are appended — so `IssueStats`, `computeIssueAgingDays`/`computeIssueRisk`/`sortIssuesByPriority` (`src/utils/issueIndicators.ts`), and every already-shipped screen that reads `Issue` (the Issues list, `ActivityLinkedIssuesPanel`) keep producing the exact numbers they do today.

`analysisStartedAt`/`solutionProposedAt` are `null` exactly when the spec says they should be (`null` for both on every `aberta` issue; `analysisStartedAt` set and `solutionProposedAt` still `null` on every `em_analise` issue; both set on `solucao_proposta`/`concluida`), always chronologically between `openedAt` and `resolvedAt` (or "now" for unresolved issues) — this is what Task 3's `deriveIssueAuditTrail` depends on to produce the right entry count. `openingAttachment` is non-null for every `impeditiva: true` issue and deliberately `null` on a handful of non-impeditiva ones (`ISS-0292`, `ISS-0293`, `ISS-0297`, `ISS-0299`, `ISS-0300`, `ISS-0302`) to exercise the "Nenhum anexo — opcional para issues não impeditivas" empty state from the spec — `ISS-0300` in particular mirrors the mockup's own `concluida`+non-impeditiva+no-opening-attachment example (`ISS-0308`).

---

### Task 2: `useGoBack` hook, wired into `ActivityDetailPage`

**Files:**
- Create: `src/hooks/useGoBack.ts`
- Modify: `src/pages/ActivityDetailPage.tsx`

- [ ] **Step 1: Create the hook**

`src/hooks/useGoBack.ts`:

```ts
import { useLocation, useNavigate } from "react-router";

// location.key é "default" apenas na entrada de histórico inicial de uma sessão de
// navegador (acesso direto por URL/link externo/reload) — nesse caso não há para onde
// voltar dentro da SPA, então cai no fallback. Em qualquer outro caso, volta para a
// página real de onde o usuário veio (navigate(-1)), o que naturalmente diferencia
// "veio da tabela de Issues" de "veio do painel de issues vinculadas de uma Atividade"
// sem precisar rastrear a origem explicitamente.
export function useGoBack(fallbackPath: string): () => void {
  const navigate = useNavigate();
  const location = useLocation();

  return function goBack() {
    if (location.key !== "default") {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };
}
```

- [ ] **Step 2: Use it in `ActivityDetailPage`**

In `src/pages/ActivityDetailPage.tsx`, change the import line:

```tsx
import { useNavigate, useParams } from "react-router";
```

to:

```tsx
import { useParams } from "react-router";
```

Add a new import below the existing component imports:

```tsx
import { useGoBack } from "../hooks/useGoBack";
```

Then replace:

```tsx
  const navigate = useNavigate();
  const { activities } = useActivities(projectId);
  const activity = activities.find((item) => item.id === activityId);

  function goBack() {
    navigate(`/projetos/${projectId}/atividades`);
  }
```

with:

```tsx
  const { activities } = useActivities(projectId);
  const activity = activities.find((item) => item.id === activityId);
  const goBack = useGoBack(`/projetos/${projectId}/atividades`);
```

Nothing else in the file changes — the `<button onClick={goBack}>` call site stays exactly as it is, since `goBack` is still a zero-argument function.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGoBack.ts src/pages/ActivityDetailPage.tsx
git commit -m "feat: add origin-aware useGoBack hook, wire it into ActivityDetailPage"
```

## Context

This is Task 2 of 8. Built before `IssueDetailPage` (Task 7) since both pages need it, and `ActivityDetailPage` is the simpler of the two call sites to verify the refactor against — it has only one caller of `goBack` (the header button), so this change is a pure one-for-one swap with no other logic touched. `useNavigate` is dropped from `ActivityDetailPage`'s imports because after this change nothing in the file calls it directly anymore (`useGoBack` owns its own `useNavigate()` internally).

---

### Task 3: `issueAuditTrail.ts` — derive the audit trail

**Files:**
- Create: `src/utils/issueAuditTrail.ts`

- [ ] **Step 1: Create the util**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/issueAuditTrail.ts
git commit -m "feat: add issueAuditTrail util to derive the audit trail"
```

## Context

This is Task 3 of 8. Pure function, no React, no side effects — same tier as `activityAuditTrail.ts`/`issueIndicators.ts`. The `entries.sort` at the end orders most-recent-first using the same 3-way comparator `deriveActivityAuditTrail` uses (`a.at < b.at ? 1 : a.at > b.at ? -1 : 0`) rather than a numeric subtraction, so string ISO timestamps compare correctly without a `Date` conversion.

Against the Task 1 seed data, this produces (verified by hand, used for QA in Task 8): `ISS-0292` (aberta) → 1 entry; `ISS-0295` (em_analise) → 2 entries; `ISS-0298` (solucao_proposta) → 3 entries; `ISS-0304` (concluida) → 4 entries.

---

### Task 4: `IssueFieldGrid`

**Files:**
- Create: `src/components/issues/IssueFieldGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { formatActivityDate } from "../../utils/activityIndicators";
import { computeIssueAgingDays, ISSUE_IMPACT_LABELS, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import type { Issue } from "../../types/issue";

interface IssueFieldGridProps {
  issue: Issue;
}

export default function IssueFieldGrid({ issue }: IssueFieldGridProps) {
  const aging = computeIssueAgingDays(issue);

  return (
    <div className="field-row">
      <div className="field">
        <div className="field-label">Tipo</div>
        <div className="field-value">{ISSUE_TYPE_LABELS[issue.type]}</div>
      </div>
      <div className="field">
        <div className="field-label">Desenvolvedor responsável</div>
        <div className="field-value">{issue.dev}</div>
      </div>

      <div className="field">
        <div className="field-label">Aberta em</div>
        <div className="field-value mono">{formatActivityDate(issue.openedAt)}</div>
      </div>
      {issue.status === "concluida" ? (
        <div className="field">
          <div className="field-label">Concluída em</div>
          <div className="field-value mono">
            {formatActivityDate(issue.resolvedAt)} ({aging} dias)
          </div>
        </div>
      ) : (
        <div className="field">
          <div className="field-label">Aberta há</div>
          <div className="field-value">{aging} dias</div>
        </div>
      )}

      <div className="field">
        <div className="field-label">Atividade vinculada</div>
        <div className="field-value mono">{issue.relatedActivityId ?? "—"}</div>
      </div>
      <div className="field">
        <div className="field-label">Categorização de impacto</div>
        <div className="field-value">
          {ISSUE_IMPACT_LABELS[issue.impact]} — {issue.impactNote}
        </div>
      </div>

      <div className="field full">
        <div className="field-label">Descrição</div>
        <div className="field-value big">{issue.description}</div>
      </div>
      <div className="field full">
        <div className="field-label">Solução proposta</div>
        {issue.proposedSolution ? (
          <div className="field-value big">{issue.proposedSolution}</div>
        ) : (
          <div className="field-value pending">
            {issue.status === "aberta" ? "— ainda não analisada" : "— ainda não proposta"}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/issues/IssueFieldGrid.tsx
git commit -m "feat: add IssueFieldGrid component"
```

## Context

This is Task 4 of 8. 8 fields in the order the spec calls for, all reusing existing utilities: `formatActivityDate` (already cross-feature — `ActivityAttachmentsPanel`/`ActivityPredecessorPanel` import it too, despite the "Activity" name it's just a generic pt-BR date formatter) and `computeIssueAgingDays`/`ISSUE_IMPACT_LABELS`/`ISSUE_TYPE_LABELS` (`src/utils/issueIndicators.ts`, already used by `IssueRow`). "Aberta há" swaps for "Concluída em" purely by `issue.status === "concluida"` — no new field needed, `computeIssueAgingDays` already freezes at `resolvedAt` for concluded issues (see `issueIndicators.ts`), so the same `aging` value is correct in both branches. `.field-row`/`.field`/`.field.full`/`.field-label`/`.field-value`/`.field-value.mono`/`.field-value.big`/`.field-value.pending` are all pre-existing classes from `_activity-detail.scss` — no new CSS needed.

---

### Task 5: `IssueAuditTrail`

**Files:**
- Create: `src/components/issues/IssueAuditTrail.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { IssueAuditEntry } from "../../utils/issueAuditTrail";

interface IssueAuditTrailProps {
  entries: IssueAuditEntry[];
}

export default function IssueAuditTrail({ entries }: IssueAuditTrailProps) {
  return (
    <>
      <div className="divider" />
      <div className="subhead">Trilha de auditoria</div>
      <div className="audit-trail">
        {entries.map((entry, index) => (
          <div key={index}>
            <span className="mono audit-trail-at">{new Date(entry.at).toLocaleString("pt-BR")}</span> — {entry.text}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/issues/IssueAuditTrail.tsx
git commit -m "feat: add IssueAuditTrail component"
```

## Context

This is Task 5 of 8. Byte-for-byte the same structure as `ActivityAuditTrail.tsx`, just typed against `IssueAuditEntry` instead of `ActivityAuditEntry` — kept as a separate file rather than a shared generic component, same duplication-over-abstraction call already made for `ActivityRow`/`IssueRow`. Array index as `key` is fine here for the same reason it is in `ActivityAuditTrail`: entries have no natural unique id, are freshly derived from pure data every render, and two entries can share the same `at` (e.g. `ISS-0300`'s `solutionProposedAt` and `resolvedAt` are both `isoDaysAgo(10)`).

---

### Task 6: `IssueAttachmentsPanel`

**Files:**
- Create: `src/components/issues/IssueAttachmentsPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { Issue, IssueAttachment } from "../../types/issue";

function attachIconLabel(fileName: string): string {
  return fileName.split(".").pop()?.toUpperCase() ?? "";
}

function isImage(fileName: string): boolean {
  return /\.(png|jpe?g|gif)$/i.test(fileName);
}

function AttachmentRow({ attachment, sentBy }: { attachment: IssueAttachment; sentBy: string }) {
  return (
    <div className="attach-row">
      <div className={isImage(attachment.fileName) ? "attach-icon img" : "attach-icon"}>
        {attachIconLabel(attachment.fileName)}
      </div>
      <div className="attach-body">
        <b>{attachment.fileName}</b>
        <span>
          {attachment.sizeLabel} · enviado por {sentBy}
        </span>
      </div>
      <button type="button" className="attach-dl" title="Baixar anexo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3v12m0 0-4-4m4 4 4-4" />
          <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </svg>
      </button>
    </div>
  );
}

interface IssueAttachmentsPanelProps {
  issue: Issue;
}

export default function IssueAttachmentsPanel({ issue }: IssueAttachmentsPanelProps) {
  return (
    <>
      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="panel-head">
          <div className="panel-title">
            Anexo da issue <span>enviado na abertura</span>
          </div>
        </div>
        {issue.openingAttachment ? (
          <AttachmentRow attachment={issue.openingAttachment} sentBy={`${issue.tester} (Tester)`} />
        ) : (
          <div className="linked-issues-empty">Nenhum anexo — opcional para issues não impeditivas.</div>
        )}
      </div>

      {issue.solutionAttachment ? (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Anexo da solução <span>enviado pelo Dev</span>
            </div>
          </div>
          <AttachmentRow attachment={issue.solutionAttachment} sentBy={`${issue.dev} (Dev)`} />
        </div>
      ) : (
        <div className="linked-issues-empty">
          Anexo da solução ainda não existe — aguardando o Dev propor uma solução.
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/issues/IssueAttachmentsPanel.tsx
git commit -m "feat: add IssueAttachmentsPanel component"
```

## Context

This is Task 6 of 8. `AttachmentRow` mirrors `ActivityAttachmentsPanel.tsx`'s local helper of the same shape almost exactly, duplicated (not imported) for the same reason `IssueAuditTrail` duplicates `ActivityAuditTrail` — small, feature-local, not worth a cross-feature abstraction. The "(Tester)"/"(Dev)" suffix is composed in `IssueDetailPage`... actually here, at the call site (`sentBy={`${issue.tester} (Tester)`}`) rather than stored on `IssueAttachment` — it's always derivable (opening attachment is always the Tester, solution attachment is always the Dev), so storing it would just be a second source of truth for the same fact. `.linked-issues-empty` (font-size 11.5px, faint color) is reused for both "no attachment" notes even though its name comes from `ActivityLinkedIssuesPanel`'s empty state — it's a generic small-muted-text style, and reusing it (rather than adding a near-identical class) keeps this task's promise from the spec of zero new CSS. No upload button anywhere in this component — matches the spec's explicit "fora de escopo" decision on the mockup's "+ Adicionar anexo".

---

### Task 7: `IssueDetailPage` and route wiring

**Files:**
- Create: `src/pages/IssueDetailPage.tsx`
- Delete: `src/pages/IssueDetailPlaceholderPage.tsx`
- Modify: `src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create the page**

`src/pages/IssueDetailPage.tsx`:

```tsx
import { useParams } from "react-router";
import IssueStatusBadge from "../components/issues/IssueStatusBadge";
import IssueFieldGrid from "../components/issues/IssueFieldGrid";
import IssueAuditTrail from "../components/issues/IssueAuditTrail";
import IssueAttachmentsPanel from "../components/issues/IssueAttachmentsPanel";
import { useIssues } from "../hooks/useIssues";
import { useActivities } from "../hooks/useActivities";
import { useGoBack } from "../hooks/useGoBack";
import { deriveIssueAuditTrail } from "../utils/issueAuditTrail";

export default function IssueDetailPage() {
  const { id, issueId } = useParams();
  const projectId = id ?? "";
  const { issues } = useIssues(projectId);
  const { activities } = useActivities(projectId);
  const issue = issues.find((item) => item.id === issueId);
  const goBack = useGoBack(`/projetos/${projectId}/issues`);

  if (!issue) {
    return (
      <div className="empty-state">
        <div className="empty-title">Issue não encontrada</div>
        <div className="empty-desc">
          Não encontramos a issue <b>{issueId}</b> neste projeto.
        </div>
      </div>
    );
  }

  const relatedActivity =
    issue.relatedActivityId !== null ? (activities.find((item) => item.id === issue.relatedActivityId) ?? null) : null;
  const auditEntries = deriveIssueAuditTrail(issue);

  return (
    <div>
      <button type="button" className="btn btn-sm" onClick={goBack} style={{ marginBottom: 10 }}>
        ← Voltar
      </button>

      <div className="activity-layout">
        <div className="panel activity-main">
          <div className="drawer-id">
            {issue.id}
            {relatedActivity && ` · vinculada a ${relatedActivity.name}`}
          </div>
          <div className="page-title" style={{ marginBottom: 10 }}>
            {issue.title}
          </div>
          <div style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <IssueStatusBadge status={issue.status} />
            <span className={`impeditivo-tag ${issue.impeditiva ? "impeditivo-tag-sim" : "impeditivo-tag-nao"}`}>
              {issue.impeditiva ? "Impeditiva" : "Não impeditiva"}
            </span>
          </div>

          {issue.status === "solucao_proposta" && (
            <div className="info-banner">
              Aguardando reteste da atividade vinculada — a issue é concluída automaticamente quando a atividade for
              aprovada.
            </div>
          )}

          {issue.status === "aberta" && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
            >
              Iniciar análise
            </button>
          )}
          {issue.status === "em_analise" && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
            >
              Propor solução
            </button>
          )}

          <IssueFieldGrid issue={issue} />
          <IssueAuditTrail entries={auditEntries} />
        </div>

        <div className="activity-side">
          <IssueAttachmentsPanel issue={issue} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the placeholder**

```bash
git rm src/pages/IssueDetailPlaceholderPage.tsx
```

- [ ] **Step 3: Wire the route**

In `src/routes/AppRoutes.tsx`, change the import:

```tsx
import IssueDetailPlaceholderPage from "../pages/IssueDetailPlaceholderPage";
```

to:

```tsx
import IssueDetailPage from "../pages/IssueDetailPage";
```

Then change:

```tsx
<Route path="issues/:issueId" element={<IssueDetailPlaceholderPage />} />
```

to:

```tsx
<Route path="issues/:issueId" element={<IssueDetailPage />} />
```

No other change to this file — `atividades/:activityId`, `estrutura`, `config` routes stay exactly as they are.

- [ ] **Step 4: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/IssueDetailPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat: add IssueDetailPage and wire it into the issue detail route"
```

## Context

This is Task 7 of 8. Composes every piece built in Tasks 1–6. `issues.find((item) => item.id === issueId)` mirrors `ActivityDetailPage`'s own `activities.find(...)` lookup — same pattern, same shape. The two action buttons (`"Iniciar análise"`/`"Propor solução"`) are mutually exclusive by construction (`issue.status` is a single value) and both decorative (no `onClick`), matching the spec's explicit "ação real fora de escopo" decision — same treatment `ActivityDetailPage` already gives "Concluir atividade"/"Rejeitar atividade". `relatedActivity` is looked up only to read `.name` for the `drawer-id` line — it is never used to build a navigation link (the field grid's "Atividade vinculada" value stays plain text, per the spec, matching how `ActivityFieldGrid`'s own "Predecessores" field is plain text rather than a link).

---

### Task 8: Manual QA pass

- [ ] **Step 1: Start the dev server and open an issue detail page for each status**

Run: `npm run dev`

Navigate to `/projetos/crm-homologacao/issues`, then click through to each of these 4 issues in turn (one per status): `ISS-0292` (aberta), `ISS-0295` (em_analise), `ISS-0298` (solucao_proposta), `ISS-0304` (concluida).

- [ ] **Step 2: Verify the header per status**

- `ISS-0292`: badge "Aberta", tag "Não impeditiva", "Iniciar análise" button visible, no info-banner.
- `ISS-0295`: badge "Em análise", tag "Não impeditiva", "Propor solução" button visible, no info-banner.
- `ISS-0298`: badge "Solução proposta", tag "Não impeditiva", info-banner "Aguardando reteste da atividade vinculada..." visible, **no** action button.
- `ISS-0304`: badge "Concluída", tag "Não impeditiva", no action button, no info-banner.

For all 4, `drawer-id` reads `{id} · vinculada a {nome da atividade}` (all 4 have a `relatedActivityId` in the Task 1 seed). Then open `ISS-0292`'s sibling `ISS-0296` (also `relatedActivityId: null`) and confirm `drawer-id` shows just the issue id, no "vinculada a" suffix.

- [ ] **Step 3: Verify the field grid per status**

- `ISS-0295`: "Aberta há" field shows a day count (not "Concluída em"); "Solução proposta" field shows the pending style with "— ainda não proposta".
- `ISS-0292`: "Solução proposta" field shows "— ainda não analisada" (status is `aberta`).
- `ISS-0304`: "Concluída em" field shows a date **and** `(2 dias)` (`resolvedAt` is `isoDaysAgo(7)`, `openedAt` is `isoDaysAgo(9)` → aging frozen at 2); "Solução proposta" field shows the real proposed-solution text, not the pending style.
- All 4: "Atividade vinculada" shows the right `ATV-xxxx` id; "Categorização de impacto" shows `{label} — {impactNote}` on one line.

- [ ] **Step 4: Verify the audit trail count per status**

`ISS-0292` → 1 entry ("Issue registrada como não impeditiva"). `ISS-0295` → 2 entries ("Aberta → Em análise", "Issue registrada como não impeditiva"). `ISS-0298` → 3 entries (adds "Em análise → Solução proposta" on top). `ISS-0304` → 4 entries (adds "Solução proposta → Concluída (atividade vinculada aprovada)" on top), most recent first, all with full date+time timestamps.

- [ ] **Step 5: Verify the attachments panel**

`ISS-0292`: "Anexo da issue" panel shows "Nenhum anexo — opcional para issues não impeditivas." (no `openingAttachment` in the seed); no "Anexo da solução" panel, shows the "ainda não existe" note instead. `ISS-0298`: both panels show a real attachment row with a download button. `ISS-0290` (impeditiva, aberta): "Anexo da issue" panel shows a real attachment (`log_timeout_cnab240_v1.txt`) attributed to "Guilherme Fabretti (Tester)".

- [ ] **Step 6: Verify origin-aware "Voltar"**

From `/projetos/:id/issues`, click into any issue row — "← Voltar" returns to the Issues table. Separately, open `/projetos/:id/atividades`, click into `ATV-1009` (has linked issues `ISS-0290`/`ISS-0294`), click one of the linked issue rows in the "Issues vinculadas" panel — "← Voltar" on the issue detail page returns to `ATV-1009`'s Activity Detail page, **not** to the Issues table. Then load an issue detail URL directly (paste `/projetos/:id/issues/ISS-0290` into the address bar and hit enter) — "← Voltar" falls back to the Issues table (no prior in-app history to go back to).

- [ ] **Step 7: Verify `ActivityDetailPage`'s "Voltar" still works after the refactor**

From `/projetos/:id/atividades`, click into any activity — "← Voltar para Atividades" returns to the Atividades table. Load an activity detail URL directly — falls back to the Atividades table the same way.

- [ ] **Step 8: Verify responsiveness**

Resize the browser to ~800px wide on an issue detail page. Confirm the layout collapses from 2 columns (field grid + attachments panel side by side) to 1 column (stacked) — same `.activity-layout` breakpoint used by Activity Detail.

- [ ] **Step 9: Verify the Issues list is unaffected**

Navigate back to `/projetos/:id/issues`. Confirm the KPI cards, status pills, and table (aging colors, impeditivo tags, cascade badges) are unchanged from before this plan — `Issue`'s existing fields were never modified, only extended.

- [ ] **Step 10: Final commit (if any fixes were needed)**

If Steps 2–9 required any code changes, commit them:

```bash
git add -A
git commit -m "fix: address issue detail QA findings"
```

If no changes were needed, skip this step — Task 7's commit is already the final state.

## Context

This is Task 8 of 8, the last task in this plan. No code changes of its own — the same manual verification pass this project has used instead of automated tests since the first feature. The exact expected numbers/entries in Steps 2–5 come directly from Task 1's and Task 3's context sections, computed by hand against the seed data written in this same plan. Step 6 is the crux check for this plan's main new piece of behavior (`useGoBack`) — it needs two distinct origins plus a direct-URL case to actually exercise all three branches of the hook, not just confirm a fixed destination like the old `ActivityDetailPage`-only test would have. Step 9 exists because this plan modifies the same `Issue` type and `useIssues` seed that the already-shipped Issues list and `ActivityLinkedIssuesPanel` depend on — it's the regression check that Task 1's "only append fields, never touch existing values" constraint actually held.
