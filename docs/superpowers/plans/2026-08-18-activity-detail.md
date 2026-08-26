# Activity Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Activity Detail screen at `/projetos/:id/atividades/:activityId` — replacing its current placeholder — with a full field grid (including new WBS/Área/Sistema/Transação/Resultado esperado/Observações fields), a derived audit trail, and a linked-issues panel, per `docs/superpowers/specs/2026-08-18-activity-detail-design.md`.

**Architecture:** Same layered approach as Issues/Dashboard: `Activity` (extended) + `useActivities` (reseeded) for data, a new pure `activityAuditTrail.ts` util to derive the audit trail from existing fields (no new stored model), small single-responsibility presentational components composed into one page (`ActivityDetailPage`). Two small pieces already built for Activities (`retestPillClass`) and a date formatter get promoted from `ActivityRow.tsx`'s local scope into the shared `activityIndicators.ts` util, since this page needs them too.

**Tech Stack:** React 19, TypeScript, react-router v8, plain SCSS (no Bootstrap). No new dependencies.

**No automated tests in this plan** — same decision as every previous feature; verification is `npx tsc -b` after each task plus a manual browser QA pass in the final task, with exact expected numbers computed from the seed data below.

---

## File Structure Overview

```
src/
├── types/
│   └── activity.ts                                  # modified — Activity gains 6 fields
├── hooks/
│   └── useActivities.ts                              # modified — 18 seed activities gain the 6 fields
├── utils/
│   ├── activityIndicators.ts                         # modified — gains formatActivityDate, retestPillClass
│   └── activityAuditTrail.ts                         # new
├── components/
│   └── activities/
│       ├── ActivityRow.tsx                           # modified — uses the promoted util functions
│       ├── ActivityFieldGrid.tsx                     # new
│       ├── ActivityAuditTrail.tsx                    # new
│       └── ActivityLinkedIssuesPanel.tsx             # new
├── pages/
│   ├── ActivityDetailPage.tsx                        # new
│   └── ActivityDetailPlaceholderPage.tsx             # deleted
├── routes/
│   └── AppRoutes.tsx                                 # modified — atividades/:activityId route
└── styles/
    ├── _activity-detail.scss                          # new
    └── main.scss                                      # modified — @use "activity-detail"
```

---

### Task 1: Extend the `Activity` type and reseed `useActivities`

**Files:**
- Modify: `src/types/activity.ts`
- Modify: `src/hooks/useActivities.ts`

- [ ] **Step 1: Add the new fields to `Activity`**

In `src/types/activity.ts`, replace the `Activity` interface (lines 9-24) with:

```ts
export interface Activity {
  id: string;
  name: string;
  status: ActivityStatus;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  predecessors: string[];
  retestCount: number;
  issueCount: number;
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string | null;
}
```

Nothing else in the file changes — `ActivityStatus`, `ActivityStats`, `ActivityGroupMode`, `ActivityFiltersState`, `ProcessGroup`, `ModuleGroup`, `FlatActivityGroup` stay exactly as they are.

- [ ] **Step 2: Add the new fields to the 18 seed activities**

In `src/hooks/useActivities.ts`, replace the `INITIAL_ACTIVITIES` array (keep `isoDaysFromNow`, imports, and everything after the array unchanged) with:

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
  },
];
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/activity.ts src/hooks/useActivities.ts
git commit -m "feat: extend Activity with wbs/area/system/transaction/expectedResult/notes"
```

## Context

This is Task 1 of 9. `id`, `name`, `status`, `module`, `process`, `tester`, `dev`, `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd`, `predecessors`, `retestCount`, `issueCount` are untouched on every record — only the 6 new fields are appended — so `ActivityStats`, `computeSpi`/`computeIndicators` (`src/utils/dashboardMetrics.ts`), `filterActivities`, `groupActivities`, and every already-shipped screen that reads `Activity` keep producing the exact numbers they do today.

`wbs`/`area`/`system`/`transaction` are grouped by `module`/`process` for narrative consistency (e.g. all 4 "Faturamento / Emissão de NF-e" activities share the `1.1.1.x` WBS branch and `area: "Fiscal"`), and `system: "SAP S/4HANA"` is uniform across all 18 records — simpler than inventing a second system and it matches the mockup's own single example. `notes` cross-references existing `Issue` ids on activities that already have `issueCount > 0` in the seed (`ATV-1003` → `ISS-0291`, `ATV-1009` → `ISS-0290`/`ISS-0294`, `ATV-1012` → `ISS-0298`, `ATV-1015` → `ISS-0293`), the same cross-referencing convention `useIssues.ts` already established in the other direction.

---

### Task 2: Promote `retestPillClass` and the date formatter to `activityIndicators.ts`

**Files:**
- Modify: `src/utils/activityIndicators.ts`
- Modify: `src/components/activities/ActivityRow.tsx`

- [ ] **Step 1: Add the two functions to `activityIndicators.ts`**

In `src/utils/activityIndicators.ts`, add after `isOverdue` (after line 30, before `export interface GroupRollup`):

```ts
export function formatActivityDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

export function retestPillClass(retestCount: number): string {
  if (retestCount === 0) return "retest-pill";
  if (retestCount <= 2) return "retest-pill retest-pill-warn";
  return "retest-pill retest-pill-danger";
}
```

- [ ] **Step 2: Remove the local copies from `ActivityRow.tsx` and import the shared ones**

In `src/components/activities/ActivityRow.tsx`, change the import line:

```tsx
import { isOverdue } from "../../utils/activityIndicators";
```

to:

```tsx
import { formatActivityDate, isOverdue, retestPillClass } from "../../utils/activityIndicators";
```

Delete the local `formatDate` and `retestPillClass` function definitions (lines 16-25):

```tsx
function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

function retestPillClass(retestCount: number): string {
  if (retestCount === 0) return "retest-pill";
  if (retestCount <= 2) return "retest-pill retest-pill-warn";
  return "retest-pill retest-pill-danger";
}
```

Then replace all 4 call sites of `formatDate(` with `formatActivityDate(` (the `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd` cells). `retestPillClass(activity.retestCount)` stays exactly as it was — it now resolves to the imported function instead of the local one.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/activityIndicators.ts src/components/activities/ActivityRow.tsx
git commit -m "refactor: move retestPillClass and date formatting into activityIndicators"
```

## Context

This is Task 2 of 9. Both functions were previously private to `ActivityRow.tsx`. `ActivityDetailPage` (Task 8) needs `retestPillClass` for its own retest pill in the header, and `ActivityFieldGrid` (Task 4) needs the date formatter for 4 of its fields — rather than duplicating either function a second time, they move to `activityIndicators.ts` alongside `ACTIVITY_STATUS_LABELS`/`isOverdue`, the established home for this kind of pure Activity-domain logic. Renamed from the generic `formatDate` to `formatActivityDate` on the move, since a name that generic invites collisions once it lives in a shared module (the Issues feature, for example, has its own date-shaped needs). Behavior is byte-for-byte identical — this is a pure relocation, not a rewrite.

---

### Task 3: `activityAuditTrail.ts` — derive the audit trail

**Files:**
- Create: `src/utils/activityAuditTrail.ts`

- [ ] **Step 1: Create the util**

```ts
import type { Activity } from "../types/activity";

export interface ActivityAuditEntry {
  at: string;
  text: string;
}

// Não existe modelo de auditoria real no projeto — a trilha é sintetizada a partir dos
// campos que a atividade já tem, em vez de autorada manualmente por atividade.
export function deriveActivityAuditTrail(activity: Activity): ActivityAuditEntry[] {
  if (activity.status === "cancelado") {
    return [{ at: activity.plannedStart, text: "Atividade cancelada" }];
  }

  const entries: ActivityAuditEntry[] = [];

  if (activity.status === "concluido" && activity.actualEnd !== null) {
    entries.push({ at: activity.actualEnd, text: "Em execução → Concluído" });
  }

  if (activity.retestCount > 0) {
    entries.push({
      at: activity.actualStart ?? activity.plannedStart,
      text: `Bloqueado → aguardando reteste (${activity.retestCount}ª vez)`,
    });
  }

  if (activity.actualStart !== null) {
    entries.push({ at: activity.actualStart, text: "Aguardando → Em execução" });
  } else {
    entries.push({ at: activity.plannedStart, text: "Aguardando início" });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/activityAuditTrail.ts
git commit -m "feat: add activityAuditTrail util to derive the audit trail"
```

## Context

This is Task 3 of 9. Pure function, no React, no side effects — same tier as `activityIndicators.ts`/`issueIndicators.ts`. `cancelado` short-circuits to a single-entry return since none of the other rules make sense for a cancelled activity (matches the spec's "apenas... nenhuma outra regra se aplica"). The `entries.sort` at the end orders most-recent-first; entries that land on the exact same timestamp (e.g. a `bloqueado` activity with `retestCount > 0`, where both the retest entry and the "Aguardando → Em execução" entry use the same `actualStart`) keep their push order via `Array.prototype.sort`'s stability, which reads naturally: the retest line above the execução line.

Against the Task 1 seed data, this produces (verified by hand, used for QA in Task 9): `ATV-1004` (aguardando, no `actualStart`) → 1 entry ("Aguardando início"); `ATV-1008` (cancelado) → 1 entry ("Atividade cancelada"); `ATV-1002` (execucao, `retestCount: 0`) → 1 entry ("Aguardando → Em execução"); `ATV-1003` (bloqueado, `retestCount: 1`) → 2 entries; `ATV-1001` (concluido, `retestCount: 0`) → 2 entries; `ATV-1017` (concluido, `retestCount: 1`) → 3 entries.

---

### Task 4: `ActivityFieldGrid`

**Files:**
- Create: `src/components/activities/ActivityFieldGrid.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { formatActivityDate } from "../../utils/activityIndicators";
import type { Activity } from "../../types/activity";

interface ActivityFieldGridProps {
  activity: Activity;
}

export default function ActivityFieldGrid({ activity }: ActivityFieldGridProps) {
  return (
    <div className="field-row">
      <div className="field">
        <div className="field-label">Tester</div>
        <div className="field-value">{activity.tester}</div>
      </div>
      <div className="field">
        <div className="field-label">Desenvolvedor</div>
        <div className="field-value">{activity.dev}</div>
      </div>

      <div className="field">
        <div className="field-label">Início planejado</div>
        <div className="field-value mono">{formatActivityDate(activity.plannedStart)}</div>
      </div>
      <div className="field">
        <div className="field-label">Conclusão planejada</div>
        <div className="field-value mono">{formatActivityDate(activity.plannedEnd)}</div>
      </div>

      <div className="field">
        <div className="field-label">Início real</div>
        <div className="field-value mono">{formatActivityDate(activity.actualStart)}</div>
      </div>
      <div className="field">
        <div className="field-label">Conclusão real</div>
        <div className="field-value mono">{formatActivityDate(activity.actualEnd)}</div>
      </div>

      <div className="field">
        <div className="field-label">Predecessores</div>
        <div className="field-value mono">
          {activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}
        </div>
      </div>
      <div className="field">
        <div className="field-label">WBS</div>
        <div className="field-value mono">{activity.wbs}</div>
      </div>

      <div className="field">
        <div className="field-label">Área</div>
        <div className="field-value">{activity.area}</div>
      </div>
      <div className="field">
        <div className="field-label">Sistema</div>
        <div className="field-value">{activity.system}</div>
      </div>

      <div className="field">
        <div className="field-label">Transação</div>
        <div className="field-value mono">{activity.transaction}</div>
      </div>
      <div className="field">
        <div className="field-label">Nº de reteste</div>
        <div className="field-value mono">{activity.retestCount}×</div>
      </div>

      <div className="field full">
        <div className="field-label">Resultado esperado</div>
        <div className="field-value big">{activity.expectedResult}</div>
      </div>
      <div className="field full">
        <div className="field-label">Observações</div>
        <div className="field-value big">{activity.notes ?? "—"}</div>
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
git add src/components/activities/ActivityFieldGrid.tsx
git commit -m "feat: add ActivityFieldGrid component"
```

## Context

This is Task 4 of 9. 14 fields in the exact order the spec calls for. Reuses `formatActivityDate` (Task 2) instead of duplicating date formatting a third time, and reuses the same `predecessors.length === 0 ? "—" : predecessors.join(", ")` expression `ActivityRow.tsx` already uses for the same column. `.field-row`/`.field`/`.field.full`/`.field-label`/`.field-value`/`.field-value.mono`/`.field-value.big` are new CSS classes added in Task 7 — this component compiles fine before that lands (TypeScript doesn't check CSS), just isn't visually styled until then.

---

### Task 5: `ActivityAuditTrail`

**Files:**
- Create: `src/components/activities/ActivityAuditTrail.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { ActivityAuditEntry } from "../../utils/activityAuditTrail";

interface ActivityAuditTrailProps {
  entries: ActivityAuditEntry[];
}

export default function ActivityAuditTrail({ entries }: ActivityAuditTrailProps) {
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
git add src/components/activities/ActivityAuditTrail.tsx
git commit -m "feat: add ActivityAuditTrail component"
```

## Context

This is Task 5 of 9. Purely presentational — takes the already-computed `entries` from `deriveActivityAuditTrail` (called once in `ActivityDetailPage`, Task 8) and renders them. `entry.at` is formatted with `toLocaleString("pt-BR")` (date **and** time), not `toLocaleDateString` — the mockup's audit trail shows full timestamps (`"09/07/2026 14:22"`), unlike the plain-date fields in `ActivityFieldGrid`. Array index as `key` is acceptable here: entries have no natural unique id, the list is freshly derived from pure data on every render (never reordered independently of its source `activity`), and two entries can legitimately share the same `at` (see Task 3's context), which rules out using `at` itself as the key. `.divider`/`.subhead`/`.audit-trail`/`.audit-trail-at` are added in Task 7.

---

### Task 6: `ActivityLinkedIssuesPanel`

**Files:**
- Create: `src/components/activities/ActivityLinkedIssuesPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useNavigate } from "react-router";
import IssueStatusBadge from "../issues/IssueStatusBadge";
import { useIssues } from "../../hooks/useIssues";
import { computeIssueAgingDays } from "../../utils/issueIndicators";

interface ActivityLinkedIssuesPanelProps {
  activityId: string;
  projectId: string;
}

export default function ActivityLinkedIssuesPanel({ activityId, projectId }: ActivityLinkedIssuesPanelProps) {
  const navigate = useNavigate();
  const { issues } = useIssues(projectId);
  const linkedIssues = issues.filter((issue) => issue.relatedActivityId === activityId);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Issues vinculadas <span>({linkedIssues.length})</span>
        </div>
      </div>
      {linkedIssues.length === 0 ? (
        <div className="linked-issues-empty">Nenhuma issue vinculada a esta atividade.</div>
      ) : (
        linkedIssues.map((issue) => (
          <div
            className="issue-row"
            key={issue.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/projetos/${projectId}/issues/${issue.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/projetos/${projectId}/issues/${issue.id}`);
              }
            }}
          >
            <div className="issue-row-l">
              <b>
                {issue.id} — {issue.title}
              </b>
              <span>aberta há {computeIssueAgingDays(issue)}d</span>
            </div>
            <IssueStatusBadge status={issue.status} />
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityLinkedIssuesPanel.tsx
git commit -m "feat: add ActivityLinkedIssuesPanel component"
```

## Context

This is Task 6 of 9. Reuses `IssueStatusBadge` (`src/components/issues/IssueStatusBadge.tsx`) and `computeIssueAgingDays` (`src/utils/issueIndicators.ts`) directly — both already built for the Issues list (2026-08-17 plan) and exactly fit here, so this is genuine reuse of finished, working pieces rather than a new abstraction. Rows are clickable (`role="button"`, same keyboard-activation pattern as `IssueRow.tsx`/`ActivityRow.tsx`) navigating to `/projetos/:id/issues/:issueId` — this goes slightly beyond the mockup's static drawer-trigger version, but it costs nothing extra (the route already exists, pointing at `IssueDetailPlaceholderPage`) and keeps this panel consistent with every other ID-bearing row in the app being clickable. The empty state is a single muted line (`.linked-issues-empty`), not the full `EmptyState` component — the panel is too small and low-stakes to justify EmptyState's icon+title+description treatment. `.panel`/`.panel-head`/`.panel-title` already exist (`src/styles/_dashboard.scss`) and need no changes; `.issue-row`/`.issue-row-l`/`.linked-issues-empty` are added in Task 7.

---

### Task 7: `_activity-detail.scss`

**Files:**
- Create: `src/styles/_activity-detail.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the partial**

`src/styles/_activity-detail.scss`:

```scss
@use "colors" as c;

// Layout principal do detalhe: coluna de campos + coluna lateral de issues vinculadas
.activity-layout {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 16px;
  align-items: start;
}
.activity-side {
  display: flex;
  flex-direction: column;
}

// Identificador compacto acima do título (ex.: "ATV-1043 · Faturamento / Emissão de NF-e")
.drawer-id {
  font-family: c.$font-mono;
  font-size: 11px;
  color: c.$yellow-deep;
  margin-bottom: 4px;
}

// Grid de campos (Tester/Dev/datas/WBS/Área/Sistema/Transação/Resultado esperado/Observações)
.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.field.full {
  grid-column: 1 / -1;
}
.field-label {
  font-size: 10.5px;
  color: c.$text-faint;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}
.field-value {
  font-size: 12.5px;
  color: c.$text;
  background-color: c.$bg-alt;
  border: 1px solid c.$border;
  border-radius: 6px;
  padding: 8px 10px;
}
.field-value.mono {
  font-family: c.$font-mono;
}
.field-value.big {
  min-height: 74px;
  line-height: 1.55;
  align-items: flex-start;
}

.divider {
  height: 1px;
  background-color: c.$border;
  margin: 18px 0;
}
.subhead {
  font-size: 11.5px;
  font-weight: 700;
  color: c.$text-dim;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 10px;
}

// Trilha de auditoria — lista simples de eventos derivados
.audit-trail {
  font-size: 11.5px;
  color: c.$text-dim;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.audit-trail-at {
  color: c.$text-faint;
}

// Linha compacta do painel "Issues vinculadas"
.issue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background-color: c.$bg-alt;
  border: 1px solid c.$border;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.12s ease, background-color 0.12s ease;
}
.issue-row:hover {
  border-color: c.$border-strong;
  background-color: c.$surface-2;
}
.issue-row:last-child {
  margin-bottom: 0;
}
.issue-row-l {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.issue-row-l b {
  font-size: 12px;
  font-weight: 600;
}
.issue-row-l span {
  font-size: 10.5px;
  color: c.$text-faint;
}
.linked-issues-empty {
  font-size: 11.5px;
  color: c.$text-faint;
}

@media (max-width: 900px) {
  .activity-layout {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Wire it into main.scss**

In `src/styles/main.scss`, add `@use "activity-detail";` after `@use "issues";`:

```scss
@use "base";
@use "background";
@use "auth";
@use "buttons";
@use "layout";
@use "stat-grid";
@use "toolbar";
@use "table";
@use "dropdown";
@use "modal";
@use "ui-extras";
@use "footer-widget";
@use "activities";
@use "project-nav-dock";
@use "dashboard";
@use "issues";
@use "activity-detail";
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no Sass errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_activity-detail.scss src/styles/main.scss
git commit -m "style: add Activity Detail SCSS partial"
```

## Context

This is Task 7 of 9. Ported from the mockup's `#page-atividade-detalhe` styles, translating `var(--...)` to literal Sass variables from `_colors.scss` — the same deviation already documented in every previous plan's styling task (this codebase has no CSS custom-property layer). The breakpoint collapses `.activity-layout` from 2 columns to 1 at 900px, matching what the spec describes ("1 coluna abaixo de ~900px") rather than the mockup's own 1150px breakpoint (which in the mockup is shared with several unrelated Dashboard/Config rules bundled into the same media query — not meaningful here). `.panel`/`.panel-head`/`.panel-title` (from `_dashboard.scss`), `.activity-badge*`, `.retest-pill*`, `.avatar-mini`, `.mono`, `.btn`/`.btn-primary`/`.btn-danger`/`.btn-sm`, `.page-title`, `.empty-state`/`.empty-title`/`.empty-desc` all already exist and need no changes — `.activity-main` (used as a class on the main panel alongside `.panel` in Task 8) is a pure marker class with no dedicated rule, matching how the mockup itself uses it (only as a JS `querySelector` target, never styled on its own).

---

### Task 8: `ActivityDetailPage` and route wiring

**Files:**
- Create: `src/pages/ActivityDetailPage.tsx`
- Delete: `src/pages/ActivityDetailPlaceholderPage.tsx`
- Modify: `src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create the page**

`src/pages/ActivityDetailPage.tsx`:

```tsx
import { useNavigate, useParams } from "react-router";
import ActivityStatusBadge from "../components/activities/ActivityStatusBadge";
import ActivityFieldGrid from "../components/activities/ActivityFieldGrid";
import ActivityAuditTrail from "../components/activities/ActivityAuditTrail";
import ActivityLinkedIssuesPanel from "../components/activities/ActivityLinkedIssuesPanel";
import { useActivities } from "../hooks/useActivities";
import { retestPillClass } from "../utils/activityIndicators";
import { deriveActivityAuditTrail } from "../utils/activityAuditTrail";

export default function ActivityDetailPage() {
  const { id, activityId } = useParams();
  const projectId = id ?? "";
  const navigate = useNavigate();
  const { activities } = useActivities(projectId);
  const activity = activities.find((item) => item.id === activityId);

  function goBack() {
    navigate(`/projetos/${projectId}/atividades`);
  }

  if (!activity) {
    return (
      <div className="empty-state">
        <div className="empty-title">Atividade não encontrada</div>
        <div className="empty-desc">
          Não encontramos a atividade <b>{activityId}</b> neste projeto.
        </div>
      </div>
    );
  }

  const showActions = activity.status !== "concluido" && activity.status !== "cancelado";
  const auditEntries = deriveActivityAuditTrail(activity);

  return (
    <div>
      <button type="button" className="btn btn-sm" onClick={goBack} style={{ marginBottom: 10 }}>
        ← Voltar para Atividades
      </button>

      <div className="activity-layout">
        <div className="panel activity-main">
          <div className="drawer-id">
            {activity.id} · {activity.module} / {activity.process}
          </div>
          <div className="page-title" style={{ marginBottom: 10 }}>
            {activity.name}
          </div>
          <div style={{ marginBottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <ActivityStatusBadge status={activity.status} />
            <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}× reteste</span>
          </div>

          {showActions && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button type="button" className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                Concluir atividade
              </button>
              <button type="button" className="btn btn-danger" style={{ flex: 1, justifyContent: "center" }}>
                Rejeitar atividade
              </button>
            </div>
          )}

          <ActivityFieldGrid activity={activity} />
          <ActivityAuditTrail entries={auditEntries} />
        </div>

        <div className="activity-side">
          <ActivityLinkedIssuesPanel activityId={activity.id} projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the placeholder**

```bash
git rm src/pages/ActivityDetailPlaceholderPage.tsx
```

- [ ] **Step 3: Wire the route**

In `src/routes/AppRoutes.tsx`, change the import:

```tsx
import ActivityDetailPlaceholderPage from "../pages/ActivityDetailPlaceholderPage";
```

to:

```tsx
import ActivityDetailPage from "../pages/ActivityDetailPage";
```

Then change:

```tsx
<Route path="atividades/:activityId" element={<ActivityDetailPlaceholderPage />} />
```

to:

```tsx
<Route path="atividades/:activityId" element={<ActivityDetailPage />} />
```

No other change to this file — `issues`, `issues/:issueId`, `estrutura`, `config` routes stay exactly as they are.

- [ ] **Step 4: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ActivityDetailPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat: add ActivityDetailPage and wire it into the activity detail route"
```

## Context

This is Task 8 of 9. Composes every piece built in Tasks 1–7. `activities.find((item) => item.id === activityId)` mirrors how `ProjectIssuesPage`/`ProjectDashboardPage` already look up their current record via `useParams()` + `.find(...)` on a `use*` hook's array — same pattern, applied to `useActivities` instead of `useProjects`/`useIssues`. The "not found" branch (activity ID doesn't match anything in the seed) reuses the existing `.empty-state`/`.empty-title`/`.empty-desc` classes rather than inventing a new not-found treatment. `showActions` is a plain boolean derived once and used only for a conditional render — no state, no transition logic, matching the spec's explicit "decorative buttons, condition is display-only" decision. `.activity-main` on the main panel's `className` is a harmless marker class with no CSS of its own (see Task 7's context) — kept for parity with the mockup's own class names, in case a future task needs to target it specifically.

---

### Task 9: Manual QA pass

- [ ] **Step 1: Start the dev server and open an activity detail page**

Run: `npm run dev`

Navigate to `/projetos/crm-homologacao/atividades`, then click on activity `ATV-1009` ("Testar integração com banco emissor").

- [ ] **Step 2: Verify the header**

Breadcrumb reads `ATV-1009 · Faturamento / Conciliação de Pagamentos`. Title reads "Testar integração com banco emissor". Status badge shows "Bloqueado" (red). Retest pill shows "2× reteste" in the danger style (`retestCount > 2` is danger; `2` itself is `retest-pill-warn` per `retestPillClass`'s `<= 2` check — confirm it renders the warn/yellow style, not danger). "Concluir atividade"/"Rejeitar atividade" buttons are visible (status is `bloqueado`, not `concluido`/`cancelado`).

- [ ] **Step 3: Verify the field grid**

All 14 fields render with the Task 1 seed values for `ATV-1009`: Tester "Guilherme Fabretti", Dev "M. Torres", Início/Conclusão planejada and Início real as dates, **Conclusão real shows `—`** (still open), Predecessores "ATV-1006", WBS "1.1.2.5", Área "Tesouraria", Sistema "SAP S/4HANA", Transação "F-28", Nº de reteste "2×", Resultado esperado and Observações show the full sentences from the seed.

- [ ] **Step 4: Verify the audit trail**

`ATV-1009` (bloqueado, `retestCount: 2`) shows exactly 2 entries: "Bloqueado → aguardando reteste (2ª vez)" and "Aguardando → Em execução", both with a full date+time timestamp, most recent first (they share the same `actualStart` timestamp, so the retest entry appears above the execução entry per Task 3's push order). Then check 3 more activities to cover the other cases: `ATV-1004` (aguardando, no `actualStart`) shows exactly 1 entry "Aguardando início"; `ATV-1008` (cancelado) shows exactly 1 entry "Atividade cancelada" and **no action buttons**; `ATV-1017` (concluido, `retestCount: 1`) shows exactly 3 entries, most recent first: "Em execução → Concluído", then "Bloqueado → aguardando reteste (1ª vez)"/"Aguardando → Em execução" in some order depending on their shared timestamp — confirm no console errors and no duplicate/missing entries.

- [ ] **Step 5: Verify the linked issues panel**

For `ATV-1009`, the panel title reads "Issues vinculadas (2)" and lists `ISS-0290` and `ISS-0294` (both have `relatedActivityId: "ATV-1009"` in the Task 1 seed from the Issues plan), each with its status badge and "aberta há Xd" text. Click one — navigates to `/projetos/:id/issues/:issueId` and shows the "Em construção" placeholder with the right ID. Go back, then open `ATV-1016` ("Validar duplicidade de cadastro", no linked issues) and confirm the panel shows "Issues vinculadas (0)" and the muted "Nenhuma issue vinculada a esta atividade." message.

- [ ] **Step 6: Verify navigation**

"← Voltar para Atividades" returns to `/projetos/:id/atividades`. From the Atividades table, click a different row (e.g. `ATV-1001`, concluído) — opens its detail page with **no action buttons** (status is `concluido`) and a field grid showing real `Início real`/`Conclusão real` dates instead of `—`.

- [ ] **Step 7: Verify responsiveness**

Resize the browser to ~800px wide. Confirm `.activity-layout` collapses from 2 columns (field grid + linked issues panel side by side) to 1 column (stacked).

- [ ] **Step 8: Verify the Activities list and Dashboard are unaffected**

Navigate back to `/projetos/:id/atividades` and `/projetos/:id/dashboard`. Confirm the Atividades table (stat chips, filters, columns, retest pill colors) and the Dashboard's SPI/Pace/Quality/Backlog numbers are unchanged from before this plan — `Activity`'s existing fields were never modified, only extended.

- [ ] **Step 9: Final commit (if any fixes were needed)**

If Steps 2–8 required any code changes, commit them:

```bash
git add -A
git commit -m "fix: address activity detail QA findings"
```

If no changes were needed, skip this step — Task 8's commit is already the final state.

## Context

This is Task 9 of 9, the last task in this plan. No code changes of its own — the same manual verification pass this project has used instead of automated tests since the first feature. The exact expected numbers/entries in Steps 2–5 come directly from Task 1's and Task 3's context sections, computed by hand against the seed data written in this same plan, so a mismatch points precisely at a data-entry mistake in the seed array or a logic bug in `deriveActivityAuditTrail`/`ActivityFieldGrid`/`ActivityLinkedIssuesPanel` — not ambiguity about what "correct" looks like. Step 8 exists specifically because this plan modifies the same `Activity` type and `useActivities` seed that the already-shipped Atividades list and Dashboard depend on — it's the regression check that Task 1's "only append fields, never touch existing values" constraint actually held.
