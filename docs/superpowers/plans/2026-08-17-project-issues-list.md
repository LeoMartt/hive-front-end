# Project Issues List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Issues screen at `/projetos/:id/issues` — replacing its current placeholder — with KPI cards, status pills, "abertas por mim"/"comigo" toggles, and a sortable-looking table with Aging/Risco indicators, per `docs/superpowers/specs/2026-08-17-project-issues-list-design.md`.

**Architecture:** Same layered approach as Activities/Dashboard: the existing `Issue` type and `useIssues` mock hook (added in the Dashboard plan) grow new fields; a pure `issueIndicators.ts` util (mirroring `activityIndicators.ts`) computes labels, badge classes, aging, risk, and the default sort order; small single-responsibility presentational components compose into one page (`ProjectIssuesPage`).

**Tech Stack:** React 19, TypeScript, react-router v8, plain SCSS (no Bootstrap). No new dependencies.

**No automated tests in this plan** — same decision as every previous feature; verification is `npx tsc -b` after each task plus a manual browser QA pass in the final task, with exact expected numbers computed from the seed data below.

---

## File Structure Overview

```
src/
├── types/
│   └── issue.ts                                    # modified — Issue gains new fields; IssueStatus/IssueStats unchanged
├── hooks/
│   └── useIssues.ts                                 # modified — 15 existing seed issues gain new fields (same status/impeditiva/dates)
├── utils/
│   └── issueIndicators.ts                            # new
├── components/
│   └── issues/
│       ├── IssueStatusBadge.tsx                      # new
│       ├── IssueImpactBadge.tsx                      # new
│       ├── IssueRiskBadge.tsx                        # new
│       ├── IssuesKpiCards.tsx                        # new
│       ├── IssueStatusPills.tsx                      # new
│       ├── IssueRow.tsx                              # new
│       └── IssuesTable.tsx                           # new
├── pages/
│   ├── ProjectIssuesPage.tsx                         # new
│   └── IssueDetailPlaceholderPage.tsx                # new
├── routes/
│   └── AppRoutes.tsx                                 # modified — issues route + new issues/:issueId route
└── styles/
    ├── _issues.scss                                   # new
    └── main.scss                                      # modified — @use "issues"
```

---

### Task 1: Extend the `Issue` type and reseed `useIssues`

**Files:**
- Modify: `src/types/issue.ts`
- Modify: `src/hooks/useIssues.ts`

- [ ] **Step 1: Add the new fields to `Issue`**

In `src/types/issue.ts`, replace the full file with:

```ts
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
```

`IssueStatus` and `IssueStats` are unchanged — the Dashboard (`DashboardIssuesBlock`) only consumes `IssueStats`, computed the same way as before, so its already-verified numbers stay correct.

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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/issue.ts src/hooks/useIssues.ts
git commit -m "feat: extend Issue with type/impact/area/tester/dev/cascade fields"
```

## Context

This is Task 1 of 8. `id`, `title`, `status`, `impeditiva`, `relatedActivityId`, `openedAt`, `resolvedAt` are untouched on every record — only new fields are added — so `IssueStats` (computed in `useIssues` from exactly those untouched fields) keeps producing the same numbers the Dashboard plan already QA'd: `abertas=4`, `emAnalise=3`, `solucaoProposta=3`, `concluidas=5`, `impeditivasAbertas=3`, `tempoMedioResolucaoDias=3.2`.

`tester`/`dev` values are drawn from the same name pool `useActivities.ts` already uses (testers: Rafael Souza, Leonardo Martins da Silva, Guilherme Fabretti; devs: Vinícius Calefo Assarice, J. Prado, M. Torres, C. Prado) — not the mockup's fictional names (R. Lima, G. Def.) — so the two mock hooks read as the same team. Two records (`ISS-0292`, `ISS-0296`) deliberately set `dev: "Guilherme Fabretti"`, a name that's never a `dev` in `useActivities.ts` — without it, the "Issues comigo" toggle (Task 7) would always show zero results, since no existing activity dev matches `CURRENT_USER_NAME`. `cascadeActivityIds` is non-empty on two records (`ISS-0294`: 1 id, `ISS-0298`: 2 ids) specifically so the "+N" cascade tag (Task 5) has both a singular and plural case to render.

---

### Task 2: `issueIndicators.ts` — labels, badge classes, aging, risk, sort order

**Files:**
- Create: `src/utils/issueIndicators.ts`

- [ ] **Step 1: Create the util**

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/issueIndicators.ts
git commit -m "feat: add issueIndicators util for labels, aging, risk and sort order"
```

## Context

This is Task 2 of 8. Mirrors `activityIndicators.ts`'s role for Activities: label/class maps plus pure derived-value functions, nothing stateful. `computeIssueAgingDays`/`computeIssueRisk` accept an optional `now` purely so a future test could pass a fixed clock — today's callers (Task 4, Task 5) always use the default.

Against the Task 1 seed data, these resolve to (used for QA numbers in Task 8): non-concluded issues have aging `[6, 4, 2, 1, 8, 5, 3, 7, 6, 4]` for `ISS-0290`..`ISS-0299` respectively, giving risk `risco` for `ISS-0290`/`ISS-0294`/`ISS-0297`/`ISS-0298` (aging ≥ 6), `alerta` for `ISS-0291`/`ISS-0292`/`ISS-0295`/`ISS-0296`/`ISS-0299` (aging 2–5), and `aceitavel` only for `ISS-0293` (aging 1). The 5 concluded issues (`ISS-0300`..`ISS-0304`) have frozen aging `[2, 3, 4, 5, 2]` and risk `null`.

---

### Task 3: Issue badge components

**Files:**
- Create: `src/components/issues/IssueStatusBadge.tsx`
- Create: `src/components/issues/IssueImpactBadge.tsx`
- Create: `src/components/issues/IssueRiskBadge.tsx`

- [ ] **Step 1: Status badge**

`src/components/issues/IssueStatusBadge.tsx`:

```tsx
import { ISSUE_STATUS_BADGE_CLASS, ISSUE_STATUS_LABELS } from "../../utils/issueIndicators";
import type { IssueStatus } from "../../types/issue";

interface IssueStatusBadgeProps {
  status: IssueStatus;
}

export default function IssueStatusBadge({ status }: IssueStatusBadgeProps) {
  return (
    <span className={`activity-badge ${ISSUE_STATUS_BADGE_CLASS[status]}`}>
      <span className="activity-badge-dot" />
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Impact badge**

`src/components/issues/IssueImpactBadge.tsx`:

```tsx
import { ISSUE_IMPACT_BADGE_CLASS, ISSUE_IMPACT_LABELS } from "../../utils/issueIndicators";
import type { IssueImpact } from "../../types/issue";

interface IssueImpactBadgeProps {
  impact: IssueImpact;
}

export default function IssueImpactBadge({ impact }: IssueImpactBadgeProps) {
  return <span className={`impact-badge ${ISSUE_IMPACT_BADGE_CLASS[impact]}`}>{ISSUE_IMPACT_LABELS[impact]}</span>;
}
```

- [ ] **Step 3: Risk badge**

`src/components/issues/IssueRiskBadge.tsx`:

```tsx
import type { IssueRiskLevel } from "../../utils/issueIndicators";

const RISK_LABELS: Record<Exclude<IssueRiskLevel, null>, string> = {
  aceitavel: "Aceitável",
  alerta: "Em alerta",
  risco: "Em risco",
};

interface IssueRiskBadgeProps {
  risk: IssueRiskLevel;
}

export default function IssueRiskBadge({ risk }: IssueRiskBadgeProps) {
  if (risk === null) return <span>—</span>;
  return <span className={`risk-badge risk-badge-${risk}`}>{RISK_LABELS[risk]}</span>;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/issues/IssueStatusBadge.tsx src/components/issues/IssueImpactBadge.tsx src/components/issues/IssueRiskBadge.tsx
git commit -m "feat: add IssueStatusBadge, IssueImpactBadge and IssueRiskBadge"
```

## Context

This is Task 3 of 8. `IssueStatusBadge` is a near-exact copy of `ActivityStatusBadge` (`src/components/activities/ActivityStatusBadge.tsx`), same `.activity-badge`/`.activity-badge-dot` structure, just reading from `ISSUE_STATUS_BADGE_CLASS`/`ISSUE_STATUS_LABELS` instead. `IssueImpactBadge`/`IssueRiskBadge` use new CSS classes (`.impact-badge`/`.risk-badge` + modifiers) that don't exist yet — they're added in Task 6; the components compile fine before that (TypeScript doesn't check CSS), but won't be visually verifiable until the page is wired up in Task 7. `IssueRiskBadge` renders a plain `—` for `risk === null` (concluded issues) rather than a styled dash, matching how `ActivityRow.tsx`'s `formatDate` renders `—` for null dates — no dedicated "empty" CSS class needed for a single character.

---

### Task 4: `IssuesKpiCards` and `IssueStatusPills`

**Files:**
- Create: `src/components/issues/IssuesKpiCards.tsx`
- Create: `src/components/issues/IssueStatusPills.tsx`

- [ ] **Step 1: KPI cards**

`src/components/issues/IssuesKpiCards.tsx`:

```tsx
import StatCard from "../common/StatCard";
import { computeIssueAgingDays, computeIssueRisk } from "../../utils/issueIndicators";
import type { Issue } from "../../types/issue";

interface IssuesKpiCardsProps {
  issues: Issue[];
}

export default function IssuesKpiCards({ issues }: IssuesKpiCardsProps) {
  const abertas = issues.filter((issue) => issue.status !== "concluida");
  const impeditivasAbertas = abertas.filter((issue) => issue.impeditiva);
  const emRisco = abertas.filter((issue) => computeIssueRisk(issue) === "risco");
  const somaAging = abertas.reduce((sum, issue) => sum + computeIssueAgingDays(issue), 0);
  const tempoMedio = abertas.length === 0 ? null : somaAging / abertas.length;

  return (
    <div className="stat-grid-issues" style={{ marginBottom: 16 }}>
      <StatCard label="Issues no filtro" value={String(issues.length)} sub="nesta visualização" />
      <StatCard
        label="Impeditivas abertas"
        value={String(impeditivasAbertas.length)}
        sub="bloqueando atividade agora"
        tone="r"
      />
      <StatCard label="Em risco (aging)" value={String(emRisco.length)} sub="acima do limiar configurado" tone="r" />
      <StatCard
        label="Tempo médio aberta"
        value={tempoMedio === null ? "—" : `${tempoMedio.toFixed(1).replace(".", ",")}d`}
        sub="dias, entre as ainda abertas"
      />
    </div>
  );
}
```

- [ ] **Step 2: Status pills**

`src/components/issues/IssueStatusPills.tsx`:

```tsx
import { ISSUE_STATUS_LABELS } from "../../utils/issueIndicators";
import type { IssueStatus } from "../../types/issue";

export type IssueStatusFilter = "todas" | IssueStatus;

const PILLS: { key: IssueStatusFilter; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "aberta", label: ISSUE_STATUS_LABELS.aberta },
  { key: "em_analise", label: ISSUE_STATUS_LABELS.em_analise },
  { key: "solucao_proposta", label: ISSUE_STATUS_LABELS.solucao_proposta },
  { key: "concluida", label: ISSUE_STATUS_LABELS.concluida },
];

interface IssueStatusPillsProps {
  counts: Record<IssueStatusFilter, number>;
  active: IssueStatusFilter;
  onSelect: (status: IssueStatusFilter) => void;
}

export default function IssueStatusPills({ counts, active, onSelect }: IssueStatusPillsProps) {
  return (
    <div className="filter-pills-row">
      {PILLS.map((pill) => (
        <button
          key={pill.key}
          type="button"
          className={`filter-pill${active === pill.key ? " active" : ""}`}
          onClick={() => onSelect(pill.key)}
        >
          {pill.label} <span className="n">{counts[pill.key]}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/issues/IssuesKpiCards.tsx src/components/issues/IssueStatusPills.tsx
git commit -m "feat: add IssuesKpiCards and IssueStatusPills components"
```

## Context

This is Task 4 of 8. `IssuesKpiCards` takes whatever `issues` array it's handed and reports on exactly those — the caller (`ProjectIssuesPage`, Task 7) passes the **filtered** list, so the cards recompute live as the user changes pills/toggles, replicating the mockup's "Issues no filtro… nesta visualização" behavior. This deliberately differs from `ActivityStatChips` (`src/components/activities/ActivityStatChips.tsx`), whose `stats` prop is always the full unfiltered dataset — the two features read differently in the mockup and this plan keeps that distinction rather than forcing them to match.

`IssueStatusPills` is single-select (unlike Activities' multi-select status `MultiSelectFilter`), matching the mockup's pill row exactly — clicking a pill replaces the active filter rather than adding to a set. `.stat-grid-issues` (used un-modified, i.e. the 4-column default, not the `-5` variant) and `.filter-pill`/`.n` already exist or are added in Task 6 — same non-blocking-for-typecheck situation as Task 3's badges.

---

### Task 5: `IssueRow` and `IssuesTable`

**Files:**
- Create: `src/components/issues/IssueRow.tsx`
- Create: `src/components/issues/IssuesTable.tsx`

- [ ] **Step 1: Row**

`src/components/issues/IssueRow.tsx`:

```tsx
import { useNavigate } from "react-router";
import IssueStatusBadge from "./IssueStatusBadge";
import IssueImpactBadge from "./IssueImpactBadge";
import IssueRiskBadge from "./IssueRiskBadge";
import { computeIssueAgingDays, computeIssueRisk, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import { getInitials } from "../../utils/initials";
import type { Issue } from "../../types/issue";

interface IssueRowProps {
  issue: Issue;
  projectId: string;
}

export default function IssueRow({ issue, projectId }: IssueRowProps) {
  const navigate = useNavigate();
  const aging = computeIssueAgingDays(issue);
  const risk = computeIssueRisk(issue);

  function goToDetail() {
    navigate(`/projetos/${projectId}/issues/${issue.id}`);
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToDetail();
        }
      }}
    >
      <td className="mono">{issue.id}</td>
      <td>
        <div className="cell-name-text" title={issue.title}>
          {issue.title}
        </div>
        <span className="issue-area-tag">{issue.area}</span>
      </td>
      <td>{ISSUE_TYPE_LABELS[issue.type]}</td>
      <td>
        <IssueImpactBadge impact={issue.impact} />
      </td>
      <td>
        <span className={`impeditivo-tag ${issue.impeditiva ? "impeditivo-tag-sim" : "impeditivo-tag-nao"}`}>
          {issue.impeditiva ? "Sim" : "Não"}
        </span>
      </td>
      <td className="mono">
        {issue.relatedActivityId ?? "—"}
        {issue.cascadeActivityIds.length > 0 && (
          <span
            className="cascata-tag"
            title={`Atividades impactadas por esta issue: ${issue.cascadeActivityIds.join(", ")}`}
          >
            +{issue.cascadeActivityIds.length}
          </span>
        )}
      </td>
      <td>
        <div className="cell-person" title={issue.dev}>
          <span className="avatar-mini">{getInitials(issue.dev)}</span>
          <span className="cell-person-name">{issue.dev}</span>
        </div>
      </td>
      <td>
        <IssueStatusBadge status={issue.status} />
      </td>
      <td className="mono">{`${aging}d`}</td>
      <td>
        <IssueRiskBadge risk={risk} />
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Table shell**

`src/components/issues/IssuesTable.tsx`:

```tsx
import IssueRow from "./IssueRow";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
import type { Issue } from "../../types/issue";

interface IssuesTableProps {
  issues: Issue[];
  projectId: string;
}

export default function IssuesTable({ issues, projectId }: IssuesTableProps) {
  if (issues.length === 0) {
    return (
      <div className="table-wrap">
        <EmptyState
          title="Nenhuma issue encontrada"
          description="Ajuste os filtros para encontrar a issue que procura."
        />
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              ID{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Título{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Tipo{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Impacto{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>Impeditivo</th>
            <th>
              Atividade{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Dev{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Status{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Aging{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
            <th>
              Risco{" "}
              <span className="sort-icon">
                <SortIcon />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} projectId={projectId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/issues/IssueRow.tsx src/components/issues/IssuesTable.tsx
git commit -m "feat: add IssueRow and IssuesTable components"
```

## Context

This is Task 5 of 8. `IssueRow`'s click-to-navigate + keyboard handling is copied from `ActivityRow.tsx` verbatim in structure (same `role="button"`/`tabIndex`/`onKeyDown` pattern), navigating to `/projetos/${projectId}/issues/${issue.id}` instead of the activities path. `.cell-name-text`/`.cell-person`/`.cell-person-name`/`.avatar-mini`/`.mono` are all existing classes from `_activities.scss`, reused as-is — no new CSS needed for those.

**Column sorting is decorative**, same as `ActivitiesTable.tsx`: every `SortIcon` here has no `onClick`/state behind it, matching that every sortable-looking column in this codebase today is visual-only. The mockup's column sort is fully interactive (click to sort, arrow flips), but implementing that would be new functionality this project hasn't built anywhere yet — out of scope per the spec's "Fora de escopo" section. The **initial row order** users actually see comes from `sortIssuesByPriority` (Task 2), applied once in `ProjectIssuesPage` (Task 7) before rendering — not from a click.

`IssuesTable` empty-state mirrors `ActivitiesTable.tsx`'s exactly (same `EmptyState` component, same `.table-wrap` wrapper) for when a filter combination matches zero issues.

---

### Task 6: `_issues.scss`

**Files:**
- Create: `src/styles/_issues.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the partial**

`src/styles/_issues.scss`:

```scss
@use "colors" as c;

// Pills de filtro por status — seleção única, com contador
.filter-pills-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid c.$border-strong;
  background-color: c.$surface;
  font-size: 12px;
  font-weight: 600;
  color: c.$text-dim;
  cursor: pointer;
}
.filter-pill:hover {
  border-color: c.$text-dim;
}
.filter-pill.active {
  border-color: c.$yellow-deep;
  background-color: c.$yellow-soft;
  color: c.$text;
}
.filter-pill .n {
  font-family: c.$font-mono;
  font-size: 10.5px;
  color: c.$text-faint;
}
.filter-pill.active .n {
  color: c.$yellow-deep;
}

// Badge de impacto da issue
.impact-badge {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
  white-space: nowrap;
}
.impact-badge-muitoalto {
  background-color: c.$red;
  color: #fff;
}
.impact-badge-alto {
  background-color: c.$red-soft;
  color: c.$red;
}
.impact-badge-medio {
  background-color: c.$yellow-soft;
  color: c.$yellow-deep;
}
.impact-badge-baixo {
  background-color: c.$surface-2;
  color: c.$text-faint;
}

// Badge de risco de aging
.risk-badge {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
  white-space: nowrap;
}
.risk-badge-aceitavel {
  background-color: c.$green-soft;
  color: c.$green;
}
.risk-badge-alerta {
  background-color: c.$yellow-soft;
  color: c.$yellow-deep;
}
.risk-badge-risco {
  background-color: c.$red;
  color: #fff;
}

// Tag Sim/Não de impeditivo
.impeditivo-tag {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 4px;
  display: inline-block;
}
.impeditivo-tag-sim {
  background-color: c.$red;
  color: #fff;
}
.impeditivo-tag-nao {
  background-color: c.$surface-2;
  color: c.$text-faint;
}

// Subtítulo de área abaixo do título da issue
.issue-area-tag {
  font-size: 10.5px;
  color: c.$text-faint;
  margin-top: 1px;
  display: block;
}

// Contador de atividades impactadas em cascata pela mesma issue
.cascata-tag {
  font-family: c.$font-mono;
  font-size: 9.5px;
  color: c.$red;
  font-weight: 700;
  margin-left: 4px;
  cursor: help;
}
```

- [ ] **Step 2: Wire it into main.scss**

In `src/styles/main.scss`, add `@use "issues";` after `@use "dashboard";`:

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
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no Sass errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_issues.scss src/styles/main.scss
git commit -m "style: add Issues-specific SCSS partial"
```

## Context

This is Task 6 of 8. Ported from the mockup's `.impact-badge`/`.risk-badge`/`.issue-area-tag`/`.cascata-tag`/`.impeditivo-tag` rules, translating `var(--red)`/`var(--yellow-deep)`/etc. to literal Sass variables from `_colors.scss` — same deviation already documented in the Dashboard plan's Task 6 (this codebase compiles Sass to literal colors, no CSS custom-property layer). `.filter-pill` is new (no existing pill-with-counter component), styled to match `.toggle-pill`'s size/shape for visual consistency with the toggles sitting next to it in the toolbar (Task 7), but kept as its own class since active/inactive behavior differs (single-select highlight vs. a checkbox switch). Everything else this page needs — `.stat-grid-issues`, `.activity-badge*`, `.toggle-pill`/`.switch`/`.track`, `.cell-name-text`, `.cell-person*`, `.avatar-mini`, `.mono`, `.sort-icon`, `.table-wrap`, `.activities-toolbar*` — already exists in `_dashboard.scss`/`_activities.scss` and needs no changes.

---

### Task 7: `ProjectIssuesPage`, `IssueDetailPlaceholderPage`, and route wiring

**Files:**
- Create: `src/pages/ProjectIssuesPage.tsx`
- Create: `src/pages/IssueDetailPlaceholderPage.tsx`
- Modify: `src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create the page**

`src/pages/ProjectIssuesPage.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import IssuesKpiCards from "../components/issues/IssuesKpiCards";
import IssueStatusPills, { type IssueStatusFilter } from "../components/issues/IssueStatusPills";
import IssuesTable from "../components/issues/IssuesTable";
import NavIcon from "../components/common/NavIcon";
import { useIssues } from "../hooks/useIssues";
import { sortIssuesByPriority } from "../utils/issueIndicators";

const CURRENT_USER_NAME = "Guilherme Fabretti";

export default function ProjectIssuesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { issues } = useIssues(projectId);

  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>("todas");
  const [openedByMe, setOpenedByMe] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);

  const orderedIssues = useMemo(() => sortIssuesByPriority(issues), [issues]);

  const filteredIssues = useMemo(() => {
    return orderedIssues.filter((issue) => {
      if (statusFilter !== "todas" && issue.status !== statusFilter) return false;
      if (openedByMe && issue.tester !== CURRENT_USER_NAME) return false;
      if (assignedToMe && issue.dev !== CURRENT_USER_NAME) return false;
      return true;
    });
  }, [orderedIssues, statusFilter, openedByMe, assignedToMe]);

  const statusCounts = useMemo(() => {
    const counts: Record<IssueStatusFilter, number> = {
      todas: issues.length,
      aberta: 0,
      em_analise: 0,
      solucao_proposta: 0,
      concluida: 0,
    };
    for (const issue of issues) {
      counts[issue.status] += 1;
    }
    return counts;
  }, [issues]);

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">Issues</div>
          <div className="page-desc compact">
            Impeditivas bloqueiam a atividade vinculada até solução aprovada em reteste
          </div>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-outline-secondary btn-sm">
            <NavIcon>
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </NavIcon>
            Exportar issues
          </button>
          <button type="button" className="btn btn-primary btn-sm">
            + Registrar issue
          </button>
        </div>
      </div>

      <IssuesKpiCards issues={filteredIssues} />

      <div className="activities-toolbar">
        <IssueStatusPills counts={statusCounts} active={statusFilter} onSelect={setStatusFilter} />
        <div className="activities-toolbar-group">
          <label
            className={`toggle-pill${openedByMe ? " toggle-pill-active" : ""}`}
            htmlFor="issues-opened-by-me-toggle"
          >
            <span className="switch">
              <input
                type="checkbox"
                id="issues-opened-by-me-toggle"
                checked={openedByMe}
                onChange={(event) => setOpenedByMe(event.target.checked)}
              />
              <span className="track" />
            </span>
            Issues abertas por mim
          </label>
          <label
            className={`toggle-pill${assignedToMe ? " toggle-pill-active" : ""}`}
            htmlFor="issues-assigned-to-me-toggle"
          >
            <span className="switch">
              <input
                type="checkbox"
                id="issues-assigned-to-me-toggle"
                checked={assignedToMe}
                onChange={(event) => setAssignedToMe(event.target.checked)}
              />
              <span className="track" />
            </span>
            Issues comigo
          </label>
        </div>
      </div>

      <IssuesTable issues={filteredIssues} projectId={projectId} />
    </div>
  );
}
```

- [ ] **Step 2: Create the detail placeholder**

`src/pages/IssueDetailPlaceholderPage.tsx`:

```tsx
import { useParams } from "react-router";

export default function IssueDetailPlaceholderPage() {
  const { issueId } = useParams();

  return (
    <div className="empty-state">
      <div className="empty-title">Em construção</div>
      <div className="empty-desc">
        A tela de detalhe da issue <b>{issueId}</b> ainda não foi implementada.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire the routes**

In `src/routes/AppRoutes.tsx`, add the imports:

```tsx
import ProjectIssuesPage from "../pages/ProjectIssuesPage";
import IssueDetailPlaceholderPage from "../pages/IssueDetailPlaceholderPage";
```

Then change:

```tsx
<Route path="issues" element={<PlaceholderPage title="As issues do projeto" />} />
```

to:

```tsx
<Route path="issues" element={<ProjectIssuesPage />} />
<Route path="issues/:issueId" element={<IssueDetailPlaceholderPage />} />
```

`PlaceholderPage` stays imported and used by the `estrutura` and `config` routes — no other change to this file.

- [ ] **Step 4: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProjectIssuesPage.tsx src/pages/IssueDetailPlaceholderPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat: add ProjectIssuesPage and wire it into the issues route"
```

## Context

This is Task 7 of 8. Composes every piece built in Tasks 1–6. `IssueDetailPlaceholderPage` is a straight copy of `ActivityDetailPlaceholderPage.tsx`'s structure/wording, reading `issueId` instead of `activityId`. `CURRENT_USER_NAME = "Guilherme Fabretti"` is a local constant, not wired to `useCurrentUser`/MSAL — same simplification `ProjectActivitiesPage.tsx` already makes for its own "Minhas atividades" toggle. `orderedIssues` (from `sortIssuesByPriority`) is computed once from the raw `issues` array and then filtered — filtering never re-sorts, so the priority order is stable as the user toggles pills/toggles on and off. `.head-actions`, `.page-head compact`/`.page-title compact`/`.page-desc compact`, `.activities-toolbar`/`.activities-toolbar-group` are all pre-existing classes reused verbatim (the last two despite the "activities" name — they're generic flex-row toolbar layouts, not Activities-specific).

---

### Task 8: Manual QA pass

- [ ] **Step 1: Start the dev server and open the issues list**

Run: `npm run dev`

Navigate to `/projetos/crm-homologacao/issues` (or any seeded project id from `useProjects.ts`).

- [ ] **Step 2: Verify the KPI cards (default view, "Todas" pill active, both toggles off)**

Against the 15-issue seed from Task 1, expect exactly:
- Issues no filtro: `15`
- Impeditivas abertas: `3` (red)
- Em risco (aging): `4` (red)
- Tempo médio aberta: `4,6d`

- [ ] **Step 3: Verify the status pills**

Counts next to each pill: Todas `15`, Aberta `4`, Em análise `3`, Solução proposta `3`, Concluída `5`. Clicking "Concluída" filters the table to 5 rows and the KPI cards recompute: Issues no filtro `5`, Impeditivas abertas `0`, Em risco `0`, Tempo médio aberta `—` (no issue in that filter is still open). Click "Todas" again to reset.

- [ ] **Step 4: Verify the toggles**

Toggle "Issues abertas por mim" on: 4 rows (`ISS-0290`, `ISS-0294`, `ISS-0299`, `ISS-0301` — the ones with `tester: "Guilherme Fabretti"`). Toggle it off, toggle "Issues comigo" on: 2 rows (`ISS-0292`, `ISS-0296` — `dev: "Guilherme Fabretti"`). Toggle both off to reset.

- [ ] **Step 5: Verify Aging/Risco per row**

`ISS-0293` shows `1d` and a green "Aceitável" badge. `ISS-0291`, `ISS-0292`, `ISS-0295`, `ISS-0296`, `ISS-0299` show a yellow "Em alerta" badge. `ISS-0290`, `ISS-0294`, `ISS-0297`, `ISS-0298` show a red "Em risco" badge. Any of the 5 concluded issues (`ISS-0300`–`ISS-0304`) show a plain `—` in the Risco column and a fixed Aging value that doesn't change on refresh (`2d`, `3d`, `4d`, `5d`, `2d` respectively).

- [ ] **Step 6: Verify the cascade tag**

`ISS-0294`'s Atividade cell shows `ATV-1009` followed by a red `+1`; hovering it shows a tooltip listing `ATV-1006`. `ISS-0298`'s cell shows `ATV-1012` followed by `+2`, tooltip listing `ATV-1013, ATV-1018`. No other row shows a `+N` tag.

- [ ] **Step 7: Verify row click and initial ordering**

Click any row — navigates to `/projetos/:id/issues/:issueId` and shows the "Em construção" placeholder with the correct issue ID. Go back. Confirm the open/in-progress issues (Aberta, Em análise, Solução proposta) all appear before the concluded ones in the table, and that `ISS-0294` and `ISS-0290` (the two `muito_alto` impact issues) are near the top of that group.

- [ ] **Step 8: Verify responsiveness**

Resize the browser to ~1100px, ~800px, and ~500px wide. Confirm the KPI grid drops from 4 → 2 columns (same breakpoints `.stat-grid-issues` already has from the Dashboard), and the table scrolls horizontally rather than squeezing columns illegibly.

- [ ] **Step 9: Verify the Dashboard is unaffected**

Navigate to `/projetos/:id/dashboard`. Confirm the Issues block still shows `Abertas: 4`, `Impeditivas abertas: 3`, `Em solução proposta: 3`, `Concluídas: 5`, `Tempo médio resolução: 3,2d` — unchanged from before this plan.

- [ ] **Step 10: Verify nav dock still works**

From the Issues page, use the nav dock to go to Dashboard, Atividades, and back to Issues. Confirm no console errors and the page re-renders correctly with the same numbers.

- [ ] **Step 11: Final commit (if any fixes were needed)**

If Steps 2–10 required any code changes, commit them:

```bash
git add -A
git commit -m "fix: address issues list QA findings"
```

If no changes were needed, skip this step — Task 7's commit is already the final state.

## Context

This is Task 8 of 8, the last task in this plan. No code changes of its own — it's the same manual verification pass this project has used instead of automated tests since the first feature. The exact expected numbers in Steps 2–6 come directly from Task 1's and Task 2's context sections, computed by hand against the seed data written in this same plan, so a mismatch points precisely at either a data-entry mistake in the seed array or a logic bug in `computeIssueAgingDays`/`computeIssueRisk`/the filter predicates in `ProjectIssuesPage` — not ambiguity about what "correct" looks like. Step 9 exists specifically because this plan modifies the same `useIssues` hook the Dashboard already depends on — it's the regression check that Task 1's "don't touch the fields `IssueStats` depends on" constraint actually held.
