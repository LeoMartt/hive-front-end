# Project Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Dashboard screen at `/projetos/:id/dashboard` — replacing its current placeholder — with SPI/activity/issue metrics, a Chart.js Curva S, three SVG donut indicators, and a recent-activity log, per `docs/superpowers/specs/2026-08-15-project-dashboard-design.md`.

**Architecture:** Same layered approach as the Activities feature: typed mock hooks (`useIssues`, `useActivityLog`, `useCurvaSData`) for data, pure utility functions (`dashboardMetrics.ts`) for the derived metrics, small single-responsibility presentational components composed into one page (`ProjectDashboardPage`). `StatCard` moves from `components/projects/` to `components/common/` (same precedent as `EmptyState` in the Activities plan) so both the Projects stat-grid and the new Dashboard stat-grids share it.

**Tech Stack:** React 19, TypeScript, react-router v8, plain SCSS (no Bootstrap — this codebase removed it entirely), Chart.js v4 (new dependency, used directly — no `react-chartjs-2` wrapper).

**No automated tests in this plan** — same decision as the previous features; verification is `npx tsc -b` after each task plus a manual browser QA pass in the final task, with exact expected numbers computed from the seed data below.

---

## File Structure Overview

```
src/
├── types/
│   ├── issue.ts                                 # new
│   └── activityLog.ts                            # new
├── hooks/
│   ├── useIssues.ts                               # new
│   ├── useActivityLog.ts                          # new
│   └── useCurvaSData.ts                            # new
├── utils/
│   └── dashboardMetrics.ts                         # new
├── components/
│   ├── common/
│   │   └── StatCard.tsx                            # new (moved from components/projects/)
│   ├── projects/
│   │   └── StatCard.tsx                            # deleted
│   └── dashboard/
│       ├── CurvaSChart.tsx                          # new
│       ├── IndicatorDonuts.tsx                      # new
│       ├── RecentActivityLog.tsx                    # new
│       ├── DashboardActivitiesBlock.tsx             # new
│       └── DashboardIssuesBlock.tsx                 # new
├── pages/
│   ├── ProjectsPage.tsx                             # modified — StatCard import path only
│   └── ProjectDashboardPage.tsx                     # new
├── routes/
│   └── AppRoutes.tsx                                # modified — dashboard route
├── styles/
│   ├── _stat-grid.scss                              # modified — .stat-value tone modifiers
│   ├── _dashboard.scss                              # new
│   └── main.scss                                    # modified — @use "dashboard"
└── package.json                                      # modified — add chart.js
```

---

### Task 1: Move `StatCard` to `components/common/` and add a `tone` prop

**Files:**
- Create: `src/components/common/StatCard.tsx`
- Delete: `src/components/projects/StatCard.tsx`
- Modify: `src/pages/ProjectsPage.tsx`
- Modify: `src/styles/_stat-grid.scss`

- [ ] **Step 1: Create the component in its new location, with an optional color tone**

`src/components/common/StatCard.tsx`:
```tsx
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  tone?: "g" | "y" | "r";
}

export default function StatCard({ label, value, sub, tone }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={tone ? `stat-value ${tone}` : "stat-value"}>{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
```

- [ ] **Step 2: Delete the old file**

```bash
git rm src/components/projects/StatCard.tsx
```

- [ ] **Step 3: Update the import in ProjectsPage**

In `src/pages/ProjectsPage.tsx`, change:
```tsx
import StatCard from "../components/projects/StatCard";
```
to:
```tsx
import StatCard from "../components/common/StatCard";
```
Nothing else in that file changes — `ProjectsPage`'s two `<StatCard>` calls don't pass `tone`, so they render exactly as before.

- [ ] **Step 4: Add the color-tone modifiers to the shared stat-grid styles**

In `src/styles/_stat-grid.scss`, after the existing `.stat-value { ... }` rule, add:
```scss
.stat-value.g {
  color: c.$green;
}
.stat-value.y {
  color: c.$yellow-deep;
}
.stat-value.r {
  color: c.$red;
}
```

- [ ] **Step 5: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/common/StatCard.tsx src/pages/ProjectsPage.tsx src/styles/_stat-grid.scss
git commit -m "refactor: move StatCard to components/common and add a color tone prop"
```

## Context

This is Task 1 of 12. `StatCard` is a generic, fully reusable presentational component (label + value + sub) that currently lives under `components/projects/` from the first feature — same situation `EmptyState` was in before the Activities feature needed it too. The Dashboard's "Concluído"/"Em execução"/"Bloqueado"/"Atrasado" cards (Task 10) and "Impeditivas abertas"/"Em solução proposta"/"Concluídas" cards need a colored value (green/yellow/red), which `ProjectsPage`'s two cards never needed — `tone` is optional and backward-compatible, so `ProjectsPage` is untouched behavior-wise, only its import path changes.

---

### Task 2: Issue domain types and `useIssues` mock hook

**Files:**
- Create: `src/types/issue.ts`
- Create: `src/hooks/useIssues.ts`

- [ ] **Step 1: Create the types**

`src/types/issue.ts`:
```ts
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
```

- [ ] **Step 2: Create the hook with seed data and derived stats**

`src/hooks/useIssues.ts`:
```ts
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
    relatedActivityId: "ATV-1009",
    openedAt: isoDaysAgo(6),
    resolvedAt: null,
  },
  {
    id: "ISS-0291",
    title: "Cancelamento de NF-e retorna erro ao reprocessar",
    status: "aberta",
    impeditiva: true,
    relatedActivityId: "ATV-1003",
    openedAt: isoDaysAgo(4),
    resolvedAt: null,
  },
  {
    id: "ISS-0292",
    title: "Ambiente de homologação instável às segundas-feiras",
    status: "aberta",
    impeditiva: false,
    relatedActivityId: null,
    openedAt: isoDaysAgo(2),
    resolvedAt: null,
  },
  {
    id: "ISS-0293",
    title: "Bloqueio de CPF/CNPJ inválido não dispara alerta",
    status: "aberta",
    impeditiva: false,
    relatedActivityId: "ATV-1015",
    openedAt: isoDaysAgo(1),
    resolvedAt: null,
  },
  {
    id: "ISS-0294",
    title: "Segunda ocorrência de timeout no CNAB 240 aguardando análise",
    status: "em_analise",
    impeditiva: true,
    relatedActivityId: "ATV-1009",
    openedAt: isoDaysAgo(8),
    resolvedAt: null,
  },
  {
    id: "ISS-0295",
    title: "Divergência no XML gerado em lote de notas fiscais",
    status: "em_analise",
    impeditiva: false,
    relatedActivityId: "ATV-1002",
    openedAt: isoDaysAgo(5),
    resolvedAt: null,
  },
  {
    id: "ISS-0296",
    title: "Ambiente sem massa de dados de fornecedores",
    status: "em_analise",
    impeditiva: false,
    relatedActivityId: null,
    openedAt: isoDaysAgo(3),
    resolvedAt: null,
  },
  {
    id: "ISS-0297",
    title: "Cancelamento de NF-e diverge do processo homologado",
    status: "solucao_proposta",
    impeditiva: false,
    relatedActivityId: "ATV-1003",
    openedAt: isoDaysAgo(7),
    resolvedAt: null,
  },
  {
    id: "ISS-0298",
    title: "Upload de documentos falha para arquivos acima de 10MB",
    status: "solucao_proposta",
    impeditiva: false,
    relatedActivityId: "ATV-1012",
    openedAt: isoDaysAgo(6),
    resolvedAt: null,
  },
  {
    id: "ISS-0299",
    title: "Layout do relatório de divergências diverge do especificado",
    status: "solucao_proposta",
    impeditiva: false,
    relatedActivityId: null,
    openedAt: isoDaysAgo(4),
    resolvedAt: null,
  },
  {
    id: "ISS-0300",
    title: "Cálculo de ICMS arredondado incorretamente na emissão",
    status: "concluida",
    impeditiva: false,
    relatedActivityId: "ATV-1001",
    openedAt: isoDaysAgo(12),
    resolvedAt: isoDaysAgo(10),
  },
  {
    id: "ISS-0301",
    title: "Baixa automática de boleto registrada em duplicidade",
    status: "concluida",
    impeditiva: false,
    relatedActivityId: "ATV-1005",
    openedAt: isoDaysAgo(15),
    resolvedAt: isoDaysAgo(12),
  },
  {
    id: "ISS-0302",
    title: "Notificação de boas-vindas enviada em duplicidade",
    status: "concluida",
    impeditiva: false,
    relatedActivityId: null,
    openedAt: isoDaysAgo(20),
    resolvedAt: isoDaysAgo(16),
  },
  {
    id: "ISS-0303",
    title: "Atualização cadastral em massa trava acima de 500 registros",
    status: "concluida",
    impeditiva: false,
    relatedActivityId: "ATV-1017",
    openedAt: isoDaysAgo(18),
    resolvedAt: isoDaysAgo(13),
  },
  {
    id: "ISS-0304",
    title: "Cadastro de cliente PJ aceita CNPJ inválido",
    status: "concluida",
    impeditiva: false,
    relatedActivityId: "ATV-1010",
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/issue.ts src/hooks/useIssues.ts
git commit -m "feat: add Issue domain types and useIssues mock hook"
```

## Context

This is Task 2 of 12. `useIssues` follows the exact shape of `useActivities` (`src/hooks/useActivities.ts`): plain state holding a typed array, derived stats via `useMemo` computed inline (not via a shared util — same convention `useActivities` already uses for `ActivityStats`). `toLocalIsoString` is imported from the existing `src/utils/activityIndicators.ts` rather than duplicated, for the same local-calendar-day reasons documented there.

15 seed issues cover all 4 statuses (4 aberta, 3 em_analise, 3 solucao_proposta, 5 concluida), 3 marked `impeditiva` (2 aberta + 1 em_analise, so `impeditivasAbertas` = 3), and the 5 concluded issues have `resolvedAt`/`openedAt` gaps of 2, 3, 4, 5, and 2 days — average 3.2 days. Several `relatedActivityId`s point at real seed activities from `useActivities.ts` (e.g. `ATV-1009`, which already has `issueCount: 3` in that seed data) for narrative consistency, though the two hooks remain independently mocked, not cross-computed.

---

### Task 3: Activity-log domain types and `useActivityLog` mock hook

**Files:**
- Create: `src/types/activityLog.ts`
- Create: `src/hooks/useActivityLog.ts`

- [ ] **Step 1: Create the types**

`src/types/activityLog.ts`:
```ts
export type LogEntryIcon = "status" | "block" | "done" | "issue";

export interface LogEntry {
  id: string;
  icon: LogEntryIcon;
  refId: string;
  refName: string;
  text: string;
  authorInitials: string;
  authorName: string;
  at: string;
}
```

- [ ] **Step 2: Create the hook with static seed entries**

`src/hooks/useActivityLog.ts`:
```ts
import { useState } from "react";
import type { LogEntry } from "../types/activityLog";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const INITIAL_LOG_ENTRIES: LogEntry[] = [
  {
    id: "log-1",
    icon: "block",
    refId: "ATV-1009",
    refName: "Testar integração com banco emissor",
    text: "mudou de Em execução para Bloqueado (2º reteste)",
    authorInitials: "RL",
    authorName: "R. Lima",
    at: minutesAgo(12),
  },
  {
    id: "log-2",
    icon: "issue",
    refId: "ISS-0294",
    refName: "Segunda ocorrência de timeout no CNAB 240 aguardando análise",
    text: "registrada como impeditiva",
    authorInitials: "GD",
    authorName: "G. Def.",
    at: minutesAgo(38),
  },
  {
    id: "log-3",
    icon: "done",
    refId: "ATV-1017",
    refName: "Testar atualização cadastral em massa",
    text: "aprovada com evidência — Concluído",
    authorInitials: "CP",
    authorName: "C. Prado",
    at: minutesAgo(60),
  },
  {
    id: "log-4",
    icon: "issue",
    refId: "ISS-0298",
    refName: "Upload de documentos falha para arquivos acima de 10MB",
    text: "mudou de Em análise para Solução proposta",
    authorInitials: "JP",
    authorName: "J. Prado",
    at: minutesAgo(80),
  },
  {
    id: "log-5",
    icon: "status",
    refId: "ATV-1012",
    refName: "Validar upload de documentos",
    text: "mudou de Aguardando para Em execução",
    authorInitials: "RS",
    authorName: "Rafael Souza",
    at: minutesAgo(120),
  },
  {
    id: "log-6",
    icon: "block",
    refId: "ISS-0296",
    refName: "Ambiente sem massa de dados de fornecedores",
    text: "aberta há 6 dias segue Em análise — SLA em risco",
    authorInitials: "GD",
    authorName: "G. Def.",
    at: minutesAgo(180),
  },
  {
    id: "log-7",
    icon: "done",
    refId: "ATV-1010",
    refName: "Testar cadastro de cliente PJ",
    text: "marcada como Concluída após reteste aprovado",
    authorInitials: "MT",
    authorName: "M. Torres",
    at: minutesAgo(300),
  },
];

export function useActivityLog(projectId: string): LogEntry[] {
  // Log estático — não há modelo de auditoria/histórico real ainda.
  void projectId;
  const [entries] = useState<LogEntry[]>(INITIAL_LOG_ENTRIES);
  return entries;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/activityLog.ts src/hooks/useActivityLog.ts
git commit -m "feat: add activity-log types and useActivityLog mock hook"
```

## Context

This is Task 3 of 12. Per the spec, this log is intentionally **not derived** — there's no audit-trail model behind it yet, so it's a fixed array of 7 entries ordered most-recent-first, same mock tier as `useActivities`/`useIssues` but without a stats computation. `icon` maps 1:1 to the 4 CSS icon classes the mockup uses (`i-status`/`i-block`/`i-done`/`i-issue`) — `RecentActivityLog` (Task 9) will render `log-icon i-${entry.icon}`. Entries reference real seed IDs from `useActivities.ts` and `useIssues.ts` (Task 2) for narrative coherence, e.g. `ATV-1009`'s transition to Bloqueado and `ISS-0294`'s "registrada como impeditiva" line up with those hooks' seed data, even though all three hooks are independently mocked.

`minutesAgo` mirrors the existing helper of the same name/shape in `src/hooks/useProjects.ts` — a plain `Date.now()` offset is correct here (unlike `isOverdue`'s calendar-day comparisons) because `formatRelativeTime` (Task 9) only needs an absolute instant to diff against "now", not a calendar day.

---

### Task 4: Dashboard metrics utilities

**Files:**
- Create: `src/utils/dashboardMetrics.ts`

- [ ] **Step 1: Create `computeSpi` and `computeIndicators`**

`src/utils/dashboardMetrics.ts`:
```ts
import type { Activity, ActivityStatus } from "../types/activity";

const SPI_WEIGHT: Record<ActivityStatus, number> = {
  concluido: 100,
  execucao: 50,
  aguardando: 0,
  liberado: 0,
  bloqueado: 0,
  cancelado: 0,
};

// SPI = média dos pesos por status (0/50/100), atividades canceladas saem do denominador.
export function computeSpi(activities: Activity[]): number | null {
  const scored = activities.filter((activity) => activity.status !== "cancelado");
  if (scored.length === 0) return null;
  const sum = scored.reduce((total, activity) => total + SPI_WEIGHT[activity.status], 0);
  return sum / scored.length / 100;
}

export interface DashboardIndicators {
  pace: number | null;
  quality: number | null;
  backlog: number | null;
}

export function computeIndicators(activities: Activity[]): DashboardIndicators {
  const active = activities.filter((activity) => activity.status !== "cancelado");
  const concluded = active.filter((activity) => activity.status === "concluido");

  const onTime = concluded.filter(
    (activity) => activity.actualEnd !== null && activity.actualEnd.slice(0, 10) <= activity.plannedEnd.slice(0, 10)
  ).length;
  const noRetest = concluded.filter((activity) => activity.retestCount === 0).length;
  const backlogCount = active.filter((activity) => activity.status === "aguardando").length;

  return {
    pace: concluded.length === 0 ? null : Math.round((onTime / concluded.length) * 100),
    quality: concluded.length === 0 ? null : Math.round((noRetest / concluded.length) * 100),
    backlog: active.length === 0 ? null : Math.round((backlogCount / active.length) * 100),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/dashboardMetrics.ts
git commit -m "feat: add computeSpi and computeIndicators dashboard metric utilities"
```

## Context

This is Task 4 of 12. Both functions are pure and operate on the `Activity[]` already loaded by `useActivities` — no new data source. `actualEnd`/`plannedEnd` are compared via `.slice(0, 10)` (date-only), matching the exact convention `isOverdue` already uses in `src/utils/activityIndicators.ts`, because both fields carry a full ISO timestamp and comparing full timestamps would make same-day completions register as "late" or "on time" essentially at random based on time-of-day noise.

Against the 18-activity seed in `useActivities.ts`, these resolve to concrete numbers used for QA in Task 12: SPI = 700 / (17 × 100) = 0.41 (5 concluído × 100 + 4 execução × 50 = 700, over 17 non-cancelled activities), Pace = 1/5 concluded on time = 20%, Quality = 4/5 concluded with zero retests = 80%, Backlog = 3/17 aguardando = 18% (rounded from 17.6).

---

### Task 5: `useCurvaSData` mock hook

**Files:**
- Create: `src/hooks/useCurvaSData.ts`

- [ ] **Step 1: Create the hook**

`src/hooks/useCurvaSData.ts`:
```ts
export interface CurvaSData {
  labels: string[];
  planned: number[];
  realized: (number | null)[];
}

// Série fixa — não há dado histórico real por trás do snapshot atual do projeto,
// mesma decisão do protótipo HTML original.
const CURVA_S_DATA: CurvaSData = {
  labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8", "Sem 9", "Sem 10"],
  planned: [5, 12, 22, 35, 50, 65, 78, 88, 95, 100],
  realized: [4, 10, 18, 30, 45, 58, 72, null, null, null],
};

export function useCurvaSData(): CurvaSData {
  return CURVA_S_DATA;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCurvaSData.ts
git commit -m "feat: add useCurvaSData mock hook for the Curva S chart"
```

## Context

This is Task 5 of 12. A plain constant wrapped in a hook (for call-site symmetry with the other `use*` data sources on this page, and so it's trivial to swap for a real fetch later) — no `useState`/`useMemo` needed since there's nothing to derive or mutate. `realized` has `null` for the last 3 weeks (future, not yet realized), matching Chart.js's `spanGaps: false` behavior configured in Task 7 — the line stops instead of connecting across the gap.

---

### Task 6: Dashboard SCSS partial

**Files:**
- Create: `src/styles/_dashboard.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the partial**

`src/styles/_dashboard.scss`:
```scss
@use "colors" as c;

// Bloco de métricas (Atividades / Issues) — barra de acento à esquerda + cards
.metric-block {
  border-left: 3px solid c.$blue;
  padding: 2px 0 2px 16px;
  margin-bottom: 24px;

  &.issues {
    border-left-color: c.$yellow-deep;
  }

  // O dashboard usa stat-cards mais compactos que a lista de Projetos.
  .stat-card {
    padding: 14px 16px;
    min-height: 96px;
    justify-content: space-between;
  }
  .stat-label {
    font-size: 10.5px;
    letter-spacing: 0.5px;
    font-weight: 600;
  }
  .stat-value {
    font-size: 32px;
  }
  .stat-sub {
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-label {
  font-size: 11px;
  font-weight: 700;
  color: c.$text-faint;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0;
}

// Hero do SPI + grid compacta de 6 cards
.stat-hero-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.spi-hero {
  flex: 0 0 210px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(150deg, c.$yellow-soft, c.$surface 75%);
  border: 1px solid rgba(255, 227, 110, 0.55);
  border-radius: c.$radius;
  padding: 18px 20px;

  .stat-label {
    color: c.$yellow-deep;
    opacity: 0.85;
  }
}
.spi-big {
  font-family: c.$font-mono;
  font-size: 54px;
  font-weight: 800;
  line-height: 1;
  color: c.$yellow-deep;
}
.stat-grid-compact {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

// Grid de 5 cards de Issues
.stat-grid-issues {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;

  &.stat-grid-issues-5 {
    grid-template-columns: repeat(5, 1fr);
  }
}

// Curva S + Distribuição, lado a lado
.grid-2 {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.panel {
  background: c.$surface;
  border: 1px solid c.$border;
  border-radius: c.$radius;
  padding: 16px 18px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.panel-title {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.2px;

  span {
    color: c.$text-faint;
    font-weight: 500;
    font-size: 11px;
  }
}
.legend {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: c.$text-dim;

  i {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    margin-right: 5px;
    vertical-align: middle;
  }
}

// Donuts de Pace/Quality/Backlog
.donut-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.donut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 1;

  .dv {
    font-family: c.$font-mono;
    font-size: 22px;
    font-weight: 700;
    color: c.$text;
  }
  .dl {
    font-size: 12px;
    color: c.$text-faint;
    text-align: center;
    line-height: 1.4;
  }
}

// Log de atividades recentes
.log-panel {
  margin-bottom: 14px;
}
.log-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 4px;
  border-bottom: 1px solid c.$border;

  &:last-child {
    border-bottom: none;
  }
}
.log-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 14px;
    height: 14px;
  }
  &.i-status {
    background: c.$blue-soft;
    color: c.$blue;
  }
  &.i-block {
    background: c.$red-soft;
    color: c.$red;
  }
  &.i-done {
    background: c.$green-soft;
    color: c.$green;
  }
  &.i-issue {
    background: c.$yellow-soft;
    color: c.$yellow-deep;
  }
}
.log-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.log-text {
  font-size: 12.5px;
  color: c.$text;

  .id {
    font-family: c.$font-mono;
    color: c.$text-dim;
    font-size: 11.5px;
  }
  .log-name {
    font-weight: 600;
  }
}
.log-meta {
  font-size: 11px;
  color: c.$text-faint;
  display: flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 1150px) {
  .stat-grid-issues {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-2 {
    grid-template-columns: 1fr;
  }
  .stat-hero-row {
    flex-direction: column;
  }
  .spi-hero {
    flex: none;
  }
  .stat-grid-compact {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 880px) {
  .stat-grid-issues {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-grid-compact {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 560px) {
  .stat-grid-issues {
    grid-template-columns: 1fr;
  }
  .stat-grid-compact {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Wire it into main.scss**

Current `src/styles/main.scss`:
```scss
@use "base";
@use "background";
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
```

Replace with:
```scss
@use "base";
@use "background";
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
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no Sass errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_dashboard.scss src/styles/main.scss
git commit -m "style: add Dashboard-specific SCSS partial"
```

## Context

This is Task 6 of 12. Ported directly from the mockup's dashboard styles, with two deliberate deviations kept minimal and scoped: (1) `.stat-card`/`.stat-label`/`.stat-value`/`.stat-sub` get dashboard-specific overrides (14px/16px padding, 96px min-height, 32px value, etc.) nested **under `.metric-block`** rather than editing the shared rule in `_stat-grid.scss` — that shared rule is still what `ProjectsPage`'s 2 stat cards use, at its own 20px/22px padding, so scoping avoids a cross-page regression. (2) The mockup's `var(--yellow-deep)`/`var(--red)`/etc. don't exist in this codebase — it compiles Sass variables to literal colors at build time with no `:root` custom-property layer — so anywhere a raw color is needed at the JS/inline-SVG level (Task 8's donuts, Task 7's chart) uses literal hex values matching `_colors.scss` instead of `var(--...)`.

`.page-head`/`.page-title`/`.page-desc` need **no** dashboard-specific rule: this mockup's own base page-head styles (20px title, 12.5px desc) are numerically identical to the `.compact` variant already added to `src/styles/_layout.scss` during the Activities feature — `ProjectDashboardPage` (Task 11) just reuses `page-head compact` / `page-title compact` / `page-desc compact`, exactly like `ProjectActivitiesPage` already does.

None of these classes are consumed by any component yet (that starts in Task 7) — this task only makes the CSS available.

---

### Task 7: Install Chart.js and build `CurvaSChart`

**Files:**
- Modify: `package.json` (and `package-lock.json`)
- Create: `src/components/dashboard/CurvaSChart.tsx`

- [ ] **Step 1: Install the dependency**

```bash
npm install chart.js
```

Expected: `package.json`'s `dependencies` gains a `chart.js` entry; `package-lock.json` updates accordingly.

- [ ] **Step 2: Create the chart component**

`src/components/dashboard/CurvaSChart.tsx`:
```tsx
import { useEffect, useRef } from "react";
import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { CurvaSData } from "../../hooks/useCurvaSData";

Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip, Filler);

interface CurvaSChartProps {
  data: CurvaSData;
}

export default function CurvaSChart({ data }: CurvaSChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            label: "Planejado",
            data: data.planned,
            borderColor: "#8E9096",
            borderDash: [6, 5],
            borderWidth: 2.5,
            pointRadius: 0,
            fill: false,
            tension: 0.35,
          },
          {
            label: "Realizado",
            data: data.realized,
            borderColor: "#8A6D00",
            backgroundColor: "rgba(255,227,110,0.35)",
            borderWidth: 3.5,
            pointRadius: 3,
            pointBackgroundColor: "#FFFFFF",
            pointBorderColor: "#8A6D00",
            pointBorderWidth: 2.5,
            fill: true,
            tension: 0.35,
            spanGaps: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y}%`,
            },
          },
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: { callback: (value) => `${value}%`, font: { size: 10 }, color: "#8E9096" },
            grid: { color: "#E4E5E1" },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: "#8E9096" },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  return (
    <div style={{ height: 260 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors (Chart.js v4 ships its own types, no `@types/chart.js` needed).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/dashboard/CurvaSChart.tsx
git commit -m "feat: add Chart.js and the CurvaSChart component"
```

## Context

This is Task 7 of 12. Chart.js v4 is tree-shakeable and requires explicit registration of every controller/element/scale/plugin used — `Chart.register(...)` at module scope (runs once) covers exactly what a single line chart with fill, a category x-axis, a linear y-axis, and tooltips needs; nothing from the bar/pie/radar families is registered, keeping the bundle small. The instance is created in a `useEffect` keyed on `data` and destroyed in the cleanup function — the standard pattern for imperative libraries inside React, avoiding leaked chart instances across data changes.

One intentional simplification versus the mockup's inline script: the mockup gives the point at `dataIndex === 6` a bigger radius and a filled dot to mark "today" on a chart with a data-independent fixed index. Since `data` here comes from a hook (Task 5) instead of a hardcoded array, hardcoding index 6 again would silently break if the mock data ever changes shape — a constant `pointRadius: 3` for every point is a more honest fit for data-driven input and visually indistinguishable at this chart size.

---

### Task 8: `IndicatorDonuts` component

**Files:**
- Create: `src/components/dashboard/IndicatorDonuts.tsx`

- [ ] **Step 1: Create the component**

`src/components/dashboard/IndicatorDonuts.tsx`:
```tsx
import type { ReactNode } from "react";

interface DonutProps {
  value: number | null;
  color: string;
  label: ReactNode;
}

function Donut({ value, color, label }: DonutProps) {
  const percent = value ?? 0;
  return (
    <div className="donut-item">
      <svg width="128" height="128" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r="15.9" fill="none" stroke="#E4E5E1" strokeWidth={5} />
        <circle
          cx="21"
          cy="21"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeDasharray={`${percent} 100`}
          strokeDashoffset={25}
          strokeLinecap="round"
        />
      </svg>
      <div className="dv">{value === null ? "—" : `${value}%`}</div>
      <div className="dl">{label}</div>
    </div>
  );
}

interface IndicatorDonutsProps {
  pace: number | null;
  quality: number | null;
  backlog: number | null;
}

export default function IndicatorDonuts({ pace, quality, backlog }: IndicatorDonutsProps) {
  return (
    <div className="donut-row">
      <Donut
        value={pace}
        color="#8A6D00"
        label={
          <>
            Pace
            <br />
            (no prazo)
          </>
        }
      />
      <Donut
        value={quality}
        color="#2F8F5B"
        label={
          <>
            Quality
            <br />
            (sem reteste)
          </>
        }
      />
      <Donut
        value={backlog}
        color="#C6373F"
        label={
          <>
            Backlog
            <br />
            (não iniciado)
          </>
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/IndicatorDonuts.tsx
git commit -m "feat: add IndicatorDonuts component"
```

## Context

This is Task 8 of 12. Ports the mockup's `stroke-dasharray`/`stroke-dashoffset` circle trick exactly: `r="15.9"` on a `viewBox="0 0 42 42"` gives a circumference of ≈99.9, close enough to 100 that a plain percentage (`"72 100"`) works directly as the dash length without a separate circumference calculation; `stroke-dashoffset="25"` rotates the starting point to 12 o'clock. `value === null` renders `—` instead of `0%` so an empty project (no concluded activities yet) doesn't misleadingly show a 0% ring — this mirrors how `ProjectsPage` already renders `—` for `stats.avgSpi === null`. Colors are the literal hex values of `$yellow-deep`/`$green`/`$red` from `_colors.scss` (see Task 6's context — no CSS custom properties exist to reference from inline SVG attributes).

---

### Task 9: `RecentActivityLog` component

**Files:**
- Create: `src/components/dashboard/RecentActivityLog.tsx`

- [ ] **Step 1: Create the component**

`src/components/dashboard/RecentActivityLog.tsx`:
```tsx
import type { ReactNode } from "react";
import NavIcon from "../common/NavIcon";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import type { LogEntry, LogEntryIcon } from "../../types/activityLog";

const ICON_PATHS: Record<LogEntryIcon, ReactNode> = {
  status: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  block: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  done: <path d="M20 6 9 17l-5-5" />,
  issue: (
    <>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
    </>
  ),
};

interface RecentActivityLogProps {
  entries: LogEntry[];
}

export default function RecentActivityLog({ entries }: RecentActivityLogProps) {
  return (
    <div className="panel log-panel">
      <div className="panel-head">
        <div className="panel-title">
          Atividades Recentes <span>últimas {entries.length} alterações em atividades e issues</span>
        </div>
      </div>
      <div>
        {entries.map((entry) => (
          <div className="log-row" key={entry.id}>
            <div className={`log-icon i-${entry.icon}`}>
              <NavIcon>{ICON_PATHS[entry.icon]}</NavIcon>
            </div>
            <div className="log-body">
              <div className="log-text">
                <span className="id">{entry.refId}</span> - <span className="log-name">{entry.refName}</span>:{" "}
                {entry.text}
              </div>
              <div className="log-meta">
                <span className="avatar-mini">{entry.authorInitials}</span>
                {entry.authorName} · {formatRelativeTime(entry.at)}
              </div>
            </div>
          </div>
        ))}
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
git add src/components/dashboard/RecentActivityLog.tsx
git commit -m "feat: add RecentActivityLog component"
```

## Context

This is Task 9 of 12. Reuses `NavIcon` (existing 24×24 stroke-based icon wrapper, same one `ProjectActivitiesPage`'s export button already uses) and `.avatar-mini` (existing class, already defined in `src/styles/_activities.scss` for the Activities table's tester/dev avatars) instead of introducing new equivalents. `formatRelativeTime` is the existing util from `src/utils/formatRelativeTime.ts`, unchanged.

One simplification versus the mockup: the mockup's log text has inline `<b>` around specific words (e.g. "para **Bloqueado**"). `LogEntry.text` (Task 3) is a plain string, so that inline emphasis is dropped — the alternative (structured/HTML text in the mock data) adds real complexity for a static, low-stakes styling detail on mocked log copy. Layout, colors, icons, and spacing all still match the mockup exactly.

---

### Task 10: `DashboardActivitiesBlock` and `DashboardIssuesBlock` components

**Files:**
- Create: `src/components/dashboard/DashboardActivitiesBlock.tsx`
- Create: `src/components/dashboard/DashboardIssuesBlock.tsx`

- [ ] **Step 1: Create the Activities block**

`src/components/dashboard/DashboardActivitiesBlock.tsx`:
```tsx
import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import type { ActivityStats } from "../../types/activity";

interface DashboardActivitiesBlockProps {
  stats: ActivityStats;
  spi: number | null;
}

function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export default function DashboardActivitiesBlock({ stats, spi }: DashboardActivitiesBlockProps) {
  return (
    <div className="metric-block">
      <div className="section-head">
        <div className="section-label">Atividades</div>
        <button type="button" className="btn btn-outline-secondary btn-sm">
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          Exportar atividades
        </button>
      </div>
      <div className="stat-hero-row">
        <div className="spi-hero">
          <div className="stat-label">SPI do projeto</div>
          <div className="spi-big">{spi === null ? "—" : spi.toFixed(2)}</div>
          <div className="stat-sub">Fixed Formula 0/50/100</div>
        </div>
        <div className="stat-grid-compact">
          <StatCard label="Total" value={String(stats.total)} sub="atividades" />
          <StatCard
            label="Concluído"
            value={String(stats.concluido)}
            sub={`${percentOf(stats.concluido, stats.total)}% do total`}
            tone="g"
          />
          <StatCard label="Em execução" value={String(stats.execucao)} sub="50% de peso no SPI" tone="y" />
          <StatCard label="Bloqueado" value={String(stats.bloqueado)} sub="aguardando reteste" tone="r" />
          <StatCard label="Aguardando" value={String(stats.aguardando)} sub="predecessor pendente" />
          <StatCard label="Atrasado" value={String(stats.atrasado)} sub="vs. data planejada" tone="r" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the Issues block**

`src/components/dashboard/DashboardIssuesBlock.tsx`:
```tsx
import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import type { IssueStats } from "../../types/issue";

interface DashboardIssuesBlockProps {
  stats: IssueStats;
}

export default function DashboardIssuesBlock({ stats }: DashboardIssuesBlockProps) {
  const tempoMedioLabel =
    stats.tempoMedioResolucaoDias === null ? "—" : `${stats.tempoMedioResolucaoDias.toFixed(1).replace(".", ",")}d`;

  return (
    <div className="metric-block issues">
      <div className="section-head">
        <div className="section-label">Issues</div>
        <button type="button" className="btn btn-outline-secondary btn-sm">
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          Exportar issues
        </button>
      </div>
      <div className="stat-grid-issues stat-grid-issues-5">
        <StatCard label="Abertas" value={String(stats.abertas)} sub={`${stats.total} no total`} />
        <StatCard
          label="Impeditivas abertas"
          value={String(stats.impeditivasAbertas)}
          sub="bloqueando atividades"
          tone="r"
        />
        <StatCard
          label="Em solução proposta"
          value={String(stats.solucaoProposta)}
          sub="aguardando reteste"
          tone="y"
        />
        <StatCard label="Concluídas" value={String(stats.concluidas)} sub={`${stats.total} no total`} tone="g" />
        <StatCard label="Tempo médio resolução" value={tempoMedioLabel} sub="últimas concluídas" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardActivitiesBlock.tsx src/components/dashboard/DashboardIssuesBlock.tsx
git commit -m "feat: add DashboardActivitiesBlock and DashboardIssuesBlock components"
```

## Context

This is Task 10 of 12. Both blocks are presentational — they receive already-computed `stats`/`spi` and render `StatCard`s (Task 1) inside the `.stat-grid-compact`/`.stat-grid-issues-5` containers styled in Task 6. The "Exportar atividades"/"Exportar issues" buttons are decorative (no `onClick`), matching the exact same pattern `ProjectActivitiesPage` already uses for its own "Exportar atividades" button — not a gap specific to this task. `tempoMedioLabel`'s `.replace(".", ",")` on a `toFixed(1)` result renders pt-BR's comma decimal separator (e.g. "3,2d") without pulling in `Intl.NumberFormat` for a single field.

---

### Task 11: `ProjectDashboardPage` and route wiring

**Files:**
- Create: `src/pages/ProjectDashboardPage.tsx`
- Modify: `src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create the page**

`src/pages/ProjectDashboardPage.tsx`:
```tsx
import { useMemo } from "react";
import { useParams } from "react-router";
import DashboardActivitiesBlock from "../components/dashboard/DashboardActivitiesBlock";
import DashboardIssuesBlock from "../components/dashboard/DashboardIssuesBlock";
import CurvaSChart from "../components/dashboard/CurvaSChart";
import IndicatorDonuts from "../components/dashboard/IndicatorDonuts";
import RecentActivityLog from "../components/dashboard/RecentActivityLog";
import { useActivities } from "../hooks/useActivities";
import { useIssues } from "../hooks/useIssues";
import { useActivityLog } from "../hooks/useActivityLog";
import { useCurvaSData } from "../hooks/useCurvaSData";
import { useProjects } from "../hooks/useProjects";
import { computeIndicators, computeSpi } from "../utils/dashboardMetrics";

export default function ProjectDashboardPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);

  const { activities, stats } = useActivities(projectId);
  const { stats: issueStats } = useIssues(projectId);
  const logEntries = useActivityLog(projectId);
  const curvaS = useCurvaSData();

  const spi = useMemo(() => computeSpi(activities), [activities]);
  const indicators = useMemo(() => computeIndicators(activities), [activities]);

  const modeLabel = currentProject?.mode === "cutover" ? "Cutover" : "UAT";

  return (
    <div>
      <div className="page-head compact">
        <div>
          <div className="page-title compact">{currentProject?.name ?? "Projeto"}</div>
          <div className="page-desc compact">{modeLabel} · atualizado em tempo real via trilha de auditoria</div>
        </div>
      </div>

      <DashboardActivitiesBlock stats={stats} spi={spi} />
      <DashboardIssuesBlock stats={issueStats} />

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Curva S <span>planejado vs. realizado</span>
            </div>
            <div className="legend">
              <span>
                <i style={{ background: "#8E9096" }} />
                Planejado
              </span>
              <span>
                <i style={{ background: "#8A6D00" }} />
                Realizado
              </span>
            </div>
          </div>
          <CurvaSChart data={curvaS} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Distribuição <span>indicadores operacionais</span>
            </div>
          </div>
          <IndicatorDonuts pace={indicators.pace} quality={indicators.quality} backlog={indicators.backlog} />
        </div>
      </div>

      <RecentActivityLog entries={logEntries} />
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/routes/AppRoutes.tsx`, add the import:
```tsx
import ProjectDashboardPage from "../pages/ProjectDashboardPage";
```

Then change:
```tsx
<Route path="dashboard" element={<PlaceholderPage title="O dashboard do projeto" />} />
```
to:
```tsx
<Route path="dashboard" element={<ProjectDashboardPage />} />
```

`PlaceholderPage` stays imported and used by the `estrutura`, `issues`, and `config` routes — no other change to this file.

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectDashboardPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat: add ProjectDashboardPage and wire it into the dashboard route"
```

## Context

This is Task 11 of 12. Composes every piece built in Tasks 1–10: `useActivities`/`useIssues` for raw data + their own stats, `computeSpi`/`computeIndicators` (Task 4) for the two dashboard-only derived metrics, `useCurvaSData`/`useActivityLog` for the two static mocks. `currentProject` is found the same way `ProjectNavDock` (`src/components/project-nav/ProjectNavDock.tsx`) already does — `projects.find((p) => p.id === id)` via `useProjects()` — for the header title/mode, since `Project.name`/`Project.mode` aren't available from `useActivities`/`useIssues`. No `<main className="page-wrap">` wrapper is needed: `ProjectLayout` already applies equivalent padding via `.project-layout-content` (`src/styles/_project-nav-dock.scss:177`), exactly like `ProjectActivitiesPage` already relies on.

---

### Task 12: Manual QA pass

- [ ] **Step 1: Start the dev server and open the dashboard**

Run: `npm run dev`

Navigate to `/projetos/crm-homologacao/dashboard` (or any seeded project id from `useProjects.ts`, e.g. `erp-migration`).

- [ ] **Step 2: Verify the Activities block numbers**

Against the 18-activity seed in `useActivities.ts`, expect exactly:
- SPI do projeto: `0.41`
- Total: `18`
- Concluído: `5` (green, "28% do total")
- Em execução: `4` (yellow, "50% de peso no SPI")
- Bloqueado: `3` (red, "aguardando reteste")
- Aguardando: `3` (no color, "predecessor pendente")
- Atrasado: matches whatever `ActivityStats.atrasado` computes at run time (depends on today's date relative to the seed's relative offsets — don't hardcode an expected count, just confirm the card renders a number, not `NaN`/blank)

- [ ] **Step 3: Verify the Issues block numbers**

Against the 15-issue seed in `useIssues.ts`, expect exactly:
- Abertas: `4` ("15 no total")
- Impeditivas abertas: `3` (red)
- Em solução proposta: `3` (yellow)
- Concluídas: `5` (green, "15 no total")
- Tempo médio resolução: `3,2d`

- [ ] **Step 4: Verify the donuts**

Pace: `20%`, Quality: `80%`, Backlog: `18%`. All three rings should visually reflect those percentages (mostly-empty ring for Pace, mostly-full for Quality).

- [ ] **Step 5: Verify the Curva S chart**

The chart renders with a dashed grey "Planejado" line and a solid dark-yellow filled "Realizado" line that stops at week 7 (weeks 8–10 have no data). Hover over a point — a tooltip shows `Planejado: X%` / `Realizado: Y%`. Check the browser console for errors.

- [ ] **Step 6: Verify the recent-activity log**

7 rows render, most recent first (`ATV-1009` → Bloqueado, 12 min ago, down to `ATV-1010` → Concluída, 5 h ago), each with the correct colored icon circle (red/yellow/green/blue matching block/issue/done/status) and an avatar-mini with initials.

- [ ] **Step 7: Verify responsiveness**

Resize the browser to ~1100px, ~800px, and ~500px wide. Confirm the Issues grid drops from 5 → 2 → 1 columns, the Curva S/Distribuição grid stacks to one column, and the SPI hero card stacks above the compact stat grid instead of sitting beside it.

- [ ] **Step 8: Verify nav dock still works**

From the dashboard, use the nav dock to go to Atividades and back to Dashboard, and back to "Meus Projetos". Confirm no console errors and the dashboard re-renders correctly with the same numbers.

- [ ] **Step 9: Final commit (if any fixes were needed)**

If Steps 2–8 required any code changes, commit them:
```bash
git add -A
git commit -m "fix: address dashboard QA findings"
```
If no changes were needed, skip this step — Task 11's commit is already the final state.

## Context

This is Task 12 of 12, the last task in this plan. It has no code changes of its own — it's the manual verification pass this project has used instead of automated tests since the first feature. The exact expected numbers in Steps 2–3 come directly from Task 2's and Task 4's context sections, computed by hand against the seed data written in this same plan, so a mismatch points precisely at either a data-entry mistake in the seed arrays or a logic bug in `computeSpi`/`computeIndicators`/`useIssues`'s inline stats — not ambiguity about what "correct" looks like.
