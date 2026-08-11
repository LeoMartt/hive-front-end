# Project Activities List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Activities list page at `/projetos/:id/atividades` — the first real screen of the "specific project" area of the HIVE front-end — with a typed mock data layer, full filter set, tree/flat grouping, and the `ProjectLayout` nav dock shell that the other 4 project-scoped areas (Dashboard, Estrutura, Issues, Papel & Config) will plug into later as placeholders.

**Architecture:** Same layered approach as the previous two features: a typed mock hook (`useActivities`) for data, pure utility functions for filtering/grouping, small single-responsibility presentational components composed into one page. A new `ProjectLayout` (React Router layout route via `<Outlet />`) replaces `FooterWidget` with a floating nav dock inside `/projetos/:id/*`. `EmptyState` moves from `components/projects/` to `components/common/` so both the Projects table and the new Activities table can share it.

**Tech Stack:** React 19, TypeScript, react-bootstrap (Table, Dropdown, Form, Button — Dropdown is new to this codebase, verified against the installed package: `Dropdown.Toggle`/`Dropdown.Menu`/`Dropdown.ItemText` are real sub-components, `autoClose` accepts `true | false | "inside" | "outside"`), react-router v8 (nested/layout routes via `<Outlet />`), SCSS.

**No automated tests in this plan** — same decision as the previous two features; verification is `npx tsc -b` after each task plus a manual browser QA pass in the final task.

---

## File Structure Overview

```
src/
├── types/
│   └── activity.ts                                # new
├── utils/
│   ├── activityIndicators.ts                       # new
│   ├── filterActivities.ts                         # new
│   └── groupActivities.ts                          # new
├── hooks/
│   └── useActivities.ts                            # new
├── components/
│   ├── common/
│   │   └── EmptyState.tsx                          # moved from components/projects/
│   ├── projects/
│   │   ├── EmptyState.tsx                          # deleted
│   │   └── ProjectsTable.tsx                       # modified — import path only
│   ├── project-nav/
│   │   └── ProjectNavDock.tsx                      # new
│   └── activities/
│       ├── ActivityStatusBadge.tsx                 # new
│       ├── ActivityStatChips.tsx                   # new
│       ├── MultiSelectFilter.tsx                   # new (generic)
│       ├── ActivityModuleProcessFilter.tsx         # new
│       ├── ActivityDateRangeFilter.tsx             # new
│       ├── ActivityFiltersBar.tsx                  # new
│       ├── ActivityGroupToggle.tsx                 # new
│       ├── ActivityRow.tsx                         # new
│       ├── ActivityTreeRows.tsx                    # new
│       ├── ActivityGroupRows.tsx                   # new
│       └── ActivitiesTable.tsx                     # new
├── layouts/
│   └── ProjectLayout.tsx                           # new
├── pages/
│   ├── ProjectDetailPage.tsx                       # deleted — superseded by ProjectLayout
│   ├── PlaceholderPage.tsx                         # new
│   ├── ActivityDetailPlaceholderPage.tsx            # new
│   └── ProjectActivitiesPage.tsx                    # new
├── routes/
│   └── AppRoutes.tsx                                # modified — nested routes under ProjectLayout
└── styles/
    ├── _activities.scss                             # new
    ├── _project-nav-dock.scss                        # new
    └── main.scss                                     # modified — @use the two new partials
```

---

### Task 1: Domain types

**Files:**
- Create: `src/types/activity.ts`

- [ ] **Step 1: Create the types**

`src/types/activity.ts`:
```ts
export type ActivityStatus =
  | "aguardando"
  | "liberado"
  | "execucao"
  | "bloqueado"
  | "concluido"
  | "cancelado";

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
}

export interface ActivityStats {
  total: number;
  concluido: number;
  execucao: number;
  bloqueado: number;
  aguardando: number;
  atrasado: number;
}

export type ActivityGroupMode = "tree" | "tester" | "status";

export interface ActivityFiltersState {
  search: string;
  statuses: ActivityStatus[];
  testers: string[];
  devs: string[];
  plannedEndFrom: string | null;
  plannedEndTo: string | null;
  retestBuckets: number[];
  modules: string[];
  processes: string[];
  onlyMine: boolean;
  onlyOverdue: boolean;
}

export interface ProcessGroup {
  process: string;
  activities: Activity[];
}

export interface ModuleGroup {
  module: string;
  processes: ProcessGroup[];
}

export interface FlatActivityGroup {
  key: string;
  label: string;
  activities: Activity[];
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/activity.ts
git commit -m "feat: add Activity domain types"
```

## Context

This is Task 1 of 21 in an implementation plan for the Activities list page — the first real screen of the "specific project" area (`/projetos/:id/*`) of the HIVE front-end, per `docs/superpowers/specs/2026-08-07-project-activities-list-design.md`. `ActivityFiltersState` covers exactly the 7 filter dimensions plus 2 toggles described in the spec (search, status, tester, dev, período/plannedEnd range, retestes bucketed 0/1/2/3+, módulo, processo, "minhas atividades", "atrasado"). `ModuleGroup`/`ProcessGroup`/`FlatActivityGroup` are the shapes the grouping utilities (Task 2) will produce for the two table-rendering modes (nested tree vs. flat list).

---

### Task 2: Utility functions

**Files:**
- Create: `src/utils/activityIndicators.ts`
- Create: `src/utils/filterActivities.ts`
- Create: `src/utils/groupActivities.ts`

- [ ] **Step 1: Create status labels, badge classes, and the overdue check**

`src/utils/activityIndicators.ts`:
```ts
import type { Activity, ActivityStatus } from "../types/activity";

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  aguardando: "Aguardando",
  liberado: "Liberado",
  execucao: "Em execução",
  bloqueado: "Bloqueado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ACTIVITY_STATUS_BADGE_CLASS: Record<ActivityStatus, string> = {
  aguardando: "activity-badge-aguardando",
  liberado: "activity-badge-liberado",
  execucao: "activity-badge-execucao",
  bloqueado: "activity-badge-bloqueado",
  concluido: "activity-badge-concluido",
  cancelado: "activity-badge-cancelado",
};

export function isOverdue(activity: Activity): boolean {
  if (activity.status === "concluido" || activity.status === "cancelado") return false;
  const today = new Date().toISOString().slice(0, 10);
  return activity.plannedEnd.slice(0, 10) < today;
}
```

- [ ] **Step 2: Create the filter function**

`src/utils/filterActivities.ts`:
```ts
import type { Activity, ActivityFiltersState } from "../types/activity";
import { isOverdue } from "./activityIndicators";

export function filterActivities(
  activities: Activity[],
  filters: ActivityFiltersState,
  currentUserName: string
): Activity[] {
  const query = filters.search.trim().toLowerCase();

  return activities.filter((activity) => {
    if (query) {
      const matchesName = activity.name.toLowerCase().includes(query);
      const matchesId = activity.id.toLowerCase().includes(query);
      if (!matchesName && !matchesId) return false;
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(activity.status)) {
      return false;
    }
    if (filters.testers.length > 0 && !filters.testers.includes(activity.tester)) {
      return false;
    }
    if (filters.devs.length > 0 && !filters.devs.includes(activity.dev)) {
      return false;
    }
    if (filters.plannedEndFrom && activity.plannedEnd.slice(0, 10) < filters.plannedEndFrom) {
      return false;
    }
    if (filters.plannedEndTo && activity.plannedEnd.slice(0, 10) > filters.plannedEndTo) {
      return false;
    }
    if (filters.retestBuckets.length > 0) {
      const bucket = activity.retestCount >= 3 ? 3 : activity.retestCount;
      if (!filters.retestBuckets.includes(bucket)) return false;
    }
    if (filters.modules.length > 0 && !filters.modules.includes(activity.module)) {
      return false;
    }
    if (filters.processes.length > 0 && !filters.processes.includes(activity.process)) {
      return false;
    }
    if (filters.onlyMine && activity.tester !== currentUserName && activity.dev !== currentUserName) {
      return false;
    }
    if (filters.onlyOverdue && !isOverdue(activity)) {
      return false;
    }
    return true;
  });
}
```

- [ ] **Step 3: Create the grouping functions**

`src/utils/groupActivities.ts`:
```ts
import type { Activity, FlatActivityGroup, ModuleGroup } from "../types/activity";
import { ACTIVITY_STATUS_LABELS } from "./activityIndicators";

export function groupByModuleProcess(activities: Activity[]): ModuleGroup[] {
  const moduleOrder: string[] = [];
  const moduleMap = new Map<string, Map<string, Activity[]>>();

  for (const activity of activities) {
    if (!moduleMap.has(activity.module)) {
      moduleMap.set(activity.module, new Map());
      moduleOrder.push(activity.module);
    }
    const processMap = moduleMap.get(activity.module)!;
    if (!processMap.has(activity.process)) {
      processMap.set(activity.process, []);
    }
    processMap.get(activity.process)!.push(activity);
  }

  return moduleOrder.map((moduleName) => {
    const processMap = moduleMap.get(moduleName)!;
    return {
      module: moduleName,
      processes: Array.from(processMap.entries()).map(([processName, processActivities]) => ({
        process: processName,
        activities: processActivities,
      })),
    };
  });
}

export function groupByTester(activities: Activity[]): FlatActivityGroup[] {
  return groupByKey(activities, (activity) => activity.tester);
}

export function groupByStatus(activities: Activity[]): FlatActivityGroup[] {
  return groupByKey(activities, (activity) => ACTIVITY_STATUS_LABELS[activity.status]);
}

function groupByKey(activities: Activity[], getKey: (activity: Activity) => string): FlatActivityGroup[] {
  const order: string[] = [];
  const map = new Map<string, Activity[]>();

  for (const activity of activities) {
    const key = getKey(activity);
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(activity);
  }

  return order.map((key) => ({ key, label: key, activities: map.get(key)! }));
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/utils/activityIndicators.ts src/utils/filterActivities.ts src/utils/groupActivities.ts
git commit -m "feat: add activity status, filter, and grouping utilities"
```

## Context

This is Task 2 of 21. These are pure functions with no React/UI dependency, building on the types from Task 1. `filterActivities` implements every filter dimension from the spec, combined with AND across dimensions and OR within each multi-select dimension. Date-range comparisons use `.slice(0, 10)` on both sides so an ISO datetime (`2026-08-07T00:00:00.000Z`) compares correctly against a plain `YYYY-MM-DD` string from an HTML date input, with both boundaries inclusive. `groupByModuleProcess` preserves first-seen order for both modules and processes (not alphabetical) so the grouping is stable and matches the order activities appear in the underlying array. `groupByTester`/`groupByStatus` share a single generic `groupByKey` helper — the only difference between them is which field they key on.

---

### Task 3: `useActivities` mock data hook

**Files:**
- Create: `src/hooks/useActivities.ts`

- [ ] **Step 1: Create the hook with seed data and derived stats**

`src/hooks/useActivities.ts`:
```ts
import { useMemo, useState } from "react";
import type { Activity, ActivityStats } from "../types/activity";
import { isOverdue } from "../utils/activityIndicators";

function isoDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

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
  },
];

interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
}

export function useActivities(projectId: string): UseActivitiesResult {
  // O mock ainda não filtra por projeto — o parâmetro fica pronto para quando
  // os dados vierem de uma API real, escopados por projeto.
  void projectId;
  const [activities] = useState<Activity[]>(INITIAL_ACTIVITIES);

  const stats = useMemo<ActivityStats>(() => {
    let concluido = 0;
    let execucao = 0;
    let bloqueado = 0;
    let aguardando = 0;
    let atrasado = 0;
    for (const activity of activities) {
      if (activity.status === "concluido") concluido += 1;
      if (activity.status === "execucao") execucao += 1;
      if (activity.status === "bloqueado") bloqueado += 1;
      if (activity.status === "aguardando") aguardando += 1;
      if (isOverdue(activity)) atrasado += 1;
    }
    return { total: activities.length, concluido, execucao, bloqueado, aguardando, atrasado };
  }, [activities]);

  return { activities, stats };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useActivities.ts
git commit -m "feat: add useActivities hook with typed mock data and stats"
```

## Context

This is Task 3 of 21. `useActivities` follows the exact shape/philosophy of the existing `useProjects` hook (`src/hooks/useProjects.ts`, already in the codebase) — plain state holding a typed array, derived stats via `useMemo`. The `projectId` parameter is intentionally unused right now — `void projectId;` satisfies the project's ESLint config (verified directly: a leading-underscore name like `_projectId` is NOT exempted by this repo's `@typescript-eslint/no-unused-vars` setup and fails `npm run lint` with an error, whereas explicitly `void`-ing the parameter passes cleanly) — it exists so the call site (`useActivities(projectId)`, wired up in Task 19) already has the right shape for when this becomes a real API call scoped by project. 18 seed activities cover all 6 statuses (5 concluído, 4 em execução, 3 bloqueado, 3 aguardando, 2 liberado, 1 cancelado), 2 modules ("Faturamento", "Cadastro de Clientes") with 2 processes each, retest counts spanning 0/1/2/3 (all 4 filter buckets have at least one match), issue counts spanning 0-3, and several `predecessors` references to other seed IDs so that column has real content to render. Dates use `isoDaysFromNow` (mirroring the `minutesAgo` helper pattern in `useProjects.ts`) so "atrasado" (overdue) activities stay overdue no matter when this runs — ATV-1003, ATV-1009, ATV-1014, and ATV-1015 all have a `plannedEnd` in the past while not being `concluido`/`cancelado`, so they'll always show up under the "Atrasado" stat.

---

### Task 4: Move `EmptyState` to `components/common/`

**Files:**
- Create: `src/components/common/EmptyState.tsx`
- Delete: `src/components/projects/EmptyState.tsx`
- Modify: `src/components/projects/ProjectsTable.tsx`

- [ ] **Step 1: Create the file in its new location**

`src/components/common/EmptyState.tsx`:
```tsx
interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="d-flex flex-column align-items-center text-center py-5 gap-2">
      <h6 className="fw-bold mb-0">{title}</h6>
      <p className="text-body-secondary small mb-0 empty-state-description">{description}</p>
    </div>
  );
}
```

(Identical content to the current `src/components/projects/EmptyState.tsx` — this is a pure move, not a rewrite.)

- [ ] **Step 2: Delete the old file**

```bash
git rm src/components/projects/EmptyState.tsx
```

- [ ] **Step 3: Update the import in ProjectsTable**

In `src/components/projects/ProjectsTable.tsx`, change:
```tsx
import EmptyState from "./EmptyState";
```
to:
```tsx
import EmptyState from "../common/EmptyState";
```
Nothing else in that file changes.

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/common/EmptyState.tsx src/components/projects/ProjectsTable.tsx
git commit -m "refactor: move EmptyState to components/common for reuse across features"
```

## Context

This is Task 4 of 21. `EmptyState` is a generic, fully reusable presentational component (title + description) that currently lives under `components/projects/` from the first feature. The Activities table (Task 15) needs the exact same "no results" pattern, so this task relocates it to a neutral shared location before a second feature depends on it — a small, targeted refactor directly motivated by this plan's own needs, not a drive-by cleanup. `.empty-state-description` (the CSS class it references) already lives in `src/styles/_ui-extras.scss` and needs no changes — it's a plain class name, not tied to the file's location.

---

### Task 5: Activities SCSS partial

**Files:**
- Create: `src/styles/_activities.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the partial**

`src/styles/_activities.scss`:
```scss
@use "colors" as c;

// Badges de status de atividade
.activity-badge {
  font-family: c.$font-mono;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 5px;
  display: inline-block;
}
.activity-badge-aguardando {
  background-color: c.$surface-2;
  color: c.$text-dim;
}
.activity-badge-liberado {
  background-color: c.$yellow-soft;
  color: c.$yellow-deep;
}
.activity-badge-execucao {
  background-color: c.$blue-soft;
  color: c.$blue;
}
.activity-badge-bloqueado {
  background-color: c.$red-soft;
  color: c.$red;
}
.activity-badge-concluido {
  background-color: c.$green-soft;
  color: c.$green;
}
.activity-badge-cancelado {
  background-color: c.$surface-2;
  color: c.$text-faint;
  text-decoration: line-through;
}

// Chips de estatística clicáveis
.stat-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid c.$border;
  background-color: c.$surface;
  font-size: 12.5px;
  color: c.$text-dim;
}
.stat-chip-active {
  border-color: c.$text-dim;
  background-color: c.$bg-alt;
  color: c.$text;
}
.stat-chip-value {
  font-weight: 700;
}

// Filtro multi-seleção genérico (Dropdown + checkboxes)
.multi-select-toggle {
  font-size: 12.5px;
}
.multi-select-menu {
  max-height: 260px;
  overflow-y: auto;
  padding: 8px;
}
.multi-select-item {
  padding: 2px 4px;
}
.multi-select-search {
  width: calc(100% - 1rem);
}

// Filtro em árvore de Módulo/Processo
.module-process-filter-children {
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  margin-bottom: 8px;
}

// Filtro de intervalo de datas
.date-range-input {
  width: 140px;
}

// Busca por nome/ID
.activity-search-input {
  max-width: 220px;
}

// Linhas de agrupamento (Módulo, Processo, ou grupo plano por Tester/Status)
.activity-group-row {
  background-color: c.$bg-alt;
  cursor: pointer;
}
.activity-group-row-process {
  background-color: c.$surface;
}
.activity-group-toggle-icon {
  display: inline-block;
  width: 12px;
  color: c.$text-faint;
}
```

- [ ] **Step 2: Wire it into main.scss**

Current `src/styles/main.scss`:
```scss
@use "background";
@use "bootstrap-overrides";
@use "ui-extras";
@use "footer-widget";
```

Replace with:
```scss
@use "background";
@use "bootstrap-overrides";
@use "ui-extras";
@use "footer-widget";
@use "activities";
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no Sass errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_activities.scss src/styles/main.scss
git commit -m "style: add Activities-specific SCSS partial"
```

## Context

This is Task 5 of 21. `c.$red-soft` and `c.$green-soft` are already defined in `src/styles/_colors.scss` (added during the visual-fidelity pass) but not used by any component yet — the status badges here are their first real consumer. All other tokens referenced (`$surface`, `$surface-2`, `$border`, `$bg-alt`, `$text`, `$text-dim`, `$text-faint`, `$blue`, `$blue-soft`, `$yellow-deep`, `$yellow-soft`, `$red`, `$green`, `$font-mono`) already exist — no new design tokens are introduced by this task. None of these classes are consumed by any component yet (that starts in Task 6) — this task only makes the CSS available.

---

### Task 6: `ActivityStatusBadge` component

**Files:**
- Create: `src/components/activities/ActivityStatusBadge.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityStatusBadge.tsx`:
```tsx
import { ACTIVITY_STATUS_BADGE_CLASS, ACTIVITY_STATUS_LABELS } from "../../utils/activityIndicators";
import type { ActivityStatus } from "../../types/activity";

interface ActivityStatusBadgeProps {
  status: ActivityStatus;
}

export default function ActivityStatusBadge({ status }: ActivityStatusBadgeProps) {
  return (
    <span className={`activity-badge ${ACTIVITY_STATUS_BADGE_CLASS[status]}`}>
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityStatusBadge.tsx
git commit -m "feat: add ActivityStatusBadge component"
```

## Context

This is Task 6 of 21. A tiny, single-purpose presentational component wrapping the `.activity-badge` + per-status modifier class from Task 5's SCSS and the label map from Task 2's utilities. It'll be used inside `ActivityRow` (Task 13). Not wired into anything yet — just create the file.

---

### Task 7: `ActivityStatChips` component

**Files:**
- Create: `src/components/activities/ActivityStatChips.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityStatChips.tsx`:
```tsx
import type { ActivityStats } from "../../types/activity";

export type ActivityStatChipKey = "total" | "concluido" | "execucao" | "bloqueado" | "aguardando" | "atrasado";

interface ChipDefinition {
  key: ActivityStatChipKey;
  label: string;
}

const CHIPS: ChipDefinition[] = [
  { key: "total", label: "Total" },
  { key: "concluido", label: "Concluído" },
  { key: "execucao", label: "Em execução" },
  { key: "bloqueado", label: "Bloqueado" },
  { key: "aguardando", label: "Aguardando" },
  { key: "atrasado", label: "Atrasado" },
];

interface ActivityStatChipsProps {
  stats: ActivityStats;
  activeChip: ActivityStatChipKey;
  onSelect: (chip: ActivityStatChipKey) => void;
}

export default function ActivityStatChips({ stats, activeChip, onSelect }: ActivityStatChipsProps) {
  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className={`stat-chip${activeChip === chip.key ? " stat-chip-active" : ""}`}
          onClick={() => onSelect(chip.key)}
        >
          <span className="stat-chip-label">{chip.label}</span>
          <span className="stat-chip-value font-monospace">{stats[chip.key]}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityStatChips.tsx
git commit -m "feat: add ActivityStatChips component"
```

## Context

This is Task 7 of 21. `stats[chip.key]` type-checks because `ActivityStatChipKey`'s 6 values are exactly `keyof ActivityStats` (`total`, `concluido`, `execucao`, `bloqueado`, `aguardando`, `atrasado` — defined in Task 1). `ActivityStatChipKey` is exported because the page component (Task 19) needs it to type its own `activeChip` state and the click handler it passes down. Clicking a chip doesn't filter anything itself — it just reports which chip was clicked via `onSelect`; the page owns translating that into filter state changes.

---

### Task 8: `MultiSelectFilter` component (generic)

**Files:**
- Create: `src/components/activities/MultiSelectFilter.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/MultiSelectFilter.tsx`:
```tsx
import { useState } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";

export interface MultiSelectOption {
  value: string;
  label: string;
  count: number;
}

interface MultiSelectFilterProps {
  idPrefix: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
}

export default function MultiSelectFilter({
  idPrefix,
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: MultiSelectFilterProps) {
  const [search, setSearch] = useState("");

  const visibleOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const toggleLabel = selected.length === 0 ? label : `${label} (${selected.length})`;

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle id={`${idPrefix}-toggle`} variant="outline-secondary" size="sm" className="multi-select-toggle">
        {toggleLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {searchable && (
          <Form.Control
            type="text"
            placeholder="Pesquisar…"
            className="mx-2 mb-2 multi-select-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
        {visibleOptions.length === 0 && (
          <Dropdown.ItemText className="text-body-secondary small">Nenhuma opção encontrada.</Dropdown.ItemText>
        )}
        {visibleOptions.map((option) => (
          <Dropdown.ItemText key={option.value} className="multi-select-item">
            <Form.Check
              type="checkbox"
              id={`${idPrefix}-${option.value}`}
              label={`${option.label} (${option.count})`}
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
          </Dropdown.ItemText>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/MultiSelectFilter.tsx
git commit -m "feat: add generic MultiSelectFilter component"
```

## Context

This is Task 8 of 21. This is the single most-reused piece of this feature — it'll back the Status, Tester, Dev, and Retestes filters (Task 11), each just passing a different `options`/`selected`/`onChange`/`searchable` combination rather than needing 4 near-duplicate components. `autoClose="outside"` (verified against the installed `react-bootstrap` package's `Dropdown.js`: the prop accepts `true | false | "inside" | "outside"`) keeps the dropdown open while checkboxes inside it are clicked, closing only on an outside click. `Dropdown.ItemText` (verified against `DropdownItemText.js`: renders a plain non-interactive `<span class="dropdown-item-text">`) is the correct wrapper for embedding a `Form.Check` — unlike `Dropdown.Item`, it doesn't carry item-selection/auto-close-on-click semantics that would fight with the checkbox's own click handling. `idPrefix` is required (not derived from `label`) so DOM `id`s stay unique and predictable even if two filters ever end up with option values that collide.

---

### Task 9: `ActivityModuleProcessFilter` component

**Files:**
- Create: `src/components/activities/ActivityModuleProcessFilter.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityModuleProcessFilter.tsx`:
```tsx
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import type { Activity } from "../../types/activity";

interface ActivityModuleProcessFilterProps {
  activities: Activity[];
  selectedModules: string[];
  selectedProcesses: string[];
  onModulesChange: (modules: string[]) => void;
  onProcessesChange: (processes: string[]) => void;
}

interface ModuleOption {
  module: string;
  count: number;
  processes: { process: string; count: number }[];
}

function buildModuleOptions(activities: Activity[]): ModuleOption[] {
  const order: string[] = [];
  const map = new Map<string, Map<string, number>>();

  for (const activity of activities) {
    if (!map.has(activity.module)) {
      map.set(activity.module, new Map());
      order.push(activity.module);
    }
    const processMap = map.get(activity.module)!;
    processMap.set(activity.process, (processMap.get(activity.process) ?? 0) + 1);
  }

  return order.map((moduleName) => {
    const processMap = map.get(moduleName)!;
    const processes = Array.from(processMap.entries()).map(([process, count]) => ({ process, count }));
    const count = processes.reduce((sum, item) => sum + item.count, 0);
    return { module: moduleName, count, processes };
  });
}

export default function ActivityModuleProcessFilter({
  activities,
  selectedModules,
  selectedProcesses,
  onModulesChange,
  onProcessesChange,
}: ActivityModuleProcessFilterProps) {
  const moduleOptions = buildModuleOptions(activities);
  const selectedCount = selectedModules.length + selectedProcesses.length;
  const toggleLabel = selectedCount === 0 ? "Módulo/Processo" : `Módulo/Processo (${selectedCount})`;

  function toggleModule(moduleName: string) {
    onModulesChange(
      selectedModules.includes(moduleName)
        ? selectedModules.filter((item) => item !== moduleName)
        : [...selectedModules, moduleName]
    );
  }

  function toggleProcess(processName: string) {
    onProcessesChange(
      selectedProcesses.includes(processName)
        ? selectedProcesses.filter((item) => item !== processName)
        : [...selectedProcesses, processName]
    );
  }

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle id="module-process-filter-toggle" variant="outline-secondary" size="sm" className="multi-select-toggle">
        {toggleLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {moduleOptions.map((moduleOption) => (
          <Dropdown.ItemText key={moduleOption.module} className="multi-select-item">
            <Form.Check
              type="checkbox"
              id={`module-filter-${moduleOption.module}`}
              label={`${moduleOption.module} (${moduleOption.count})`}
              checked={selectedModules.includes(moduleOption.module)}
              onChange={() => toggleModule(moduleOption.module)}
            />
            <div className="module-process-filter-children">
              {moduleOption.processes.map((processOption) => (
                <Form.Check
                  key={processOption.process}
                  type="checkbox"
                  id={`process-filter-${moduleOption.module}-${processOption.process}`}
                  label={`${processOption.process} (${processOption.count})`}
                  checked={selectedProcesses.includes(processOption.process)}
                  onChange={() => toggleProcess(processOption.process)}
                />
              ))}
            </div>
          </Dropdown.ItemText>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityModuleProcessFilter.tsx
git commit -m "feat: add ActivityModuleProcessFilter component"
```

## Context

This is Task 9 of 21. Unlike `MultiSelectFilter` (Task 8), this filter has a genuinely nested shape (Módulo → Processo), so it's its own component rather than another `MultiSelectFilter` instance. Module and process are independent filter dimensions in `ActivityFiltersState` (Task 1) — checking a module doesn't auto-check its processes; both narrow the result set via AND, same as every other filter dimension (see `filterActivities` in Task 2). Counts are computed from whatever `activities` array is passed in (the page, Task 19, will pass the full unfiltered list — same convention as every option count elsewhere in this feature: computed from the full dataset, not progressively narrowed by other active filters).

---

### Task 10: `ActivityDateRangeFilter` component

**Files:**
- Create: `src/components/activities/ActivityDateRangeFilter.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityDateRangeFilter.tsx`:
```tsx
import Form from "react-bootstrap/Form";

interface ActivityDateRangeFilterProps {
  from: string | null;
  to: string | null;
  onFromChange: (value: string | null) => void;
  onToChange: (value: string | null) => void;
}

export default function ActivityDateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: ActivityDateRangeFilterProps) {
  return (
    <div className="d-flex align-items-center gap-1">
      <Form.Control
        type="date"
        size="sm"
        className="date-range-input"
        value={from ?? ""}
        onChange={(event) => onFromChange(event.target.value || null)}
        aria-label="Conclusão planejada a partir de"
      />
      <span className="text-body-secondary small">até</span>
      <Form.Control
        type="date"
        size="sm"
        className="date-range-input"
        value={to ?? ""}
        onChange={(event) => onToChange(event.target.value || null)}
        aria-label="Conclusão planejada até"
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
git add src/components/activities/ActivityDateRangeFilter.tsx
git commit -m "feat: add ActivityDateRangeFilter component"
```

## Context

This is Task 10 of 21. Filters on "Conclusão planejada" (`plannedEnd`), per the spec. Two plain `<input type="date">` (via `Form.Control`) with `aria-label`s since there's no visible per-field label — the "até" text between them plus the two `aria-label`s together make the range's meaning clear both visually and to screen readers. `event.target.value || null` normalizes the browser's empty-string-when-cleared behavior back to `null`, matching the `string | null` shape in `ActivityFiltersState`.

---

### Task 11: `ActivityFiltersBar` component

**Files:**
- Create: `src/components/activities/ActivityFiltersBar.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityFiltersBar.tsx`:
```tsx
import { useMemo } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import MultiSelectFilter, { type MultiSelectOption } from "./MultiSelectFilter";
import ActivityModuleProcessFilter from "./ActivityModuleProcessFilter";
import ActivityDateRangeFilter from "./ActivityDateRangeFilter";
import { ACTIVITY_STATUS_LABELS } from "../../utils/activityIndicators";
import type { Activity, ActivityFiltersState, ActivityStatus } from "../../types/activity";

interface ActivityFiltersBarProps {
  activities: Activity[];
  filters: ActivityFiltersState;
  onFiltersChange: (partial: Partial<ActivityFiltersState>) => void;
}

const ALL_STATUSES: ActivityStatus[] = [
  "aguardando",
  "liberado",
  "execucao",
  "bloqueado",
  "concluido",
  "cancelado",
];

const RETEST_LABELS: Record<number, string> = {
  0: "0×",
  1: "1×",
  2: "2×",
  3: "3+×",
};

function countBy(activities: Activity[], getValue: (activity: Activity) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const activity of activities) {
    const value = getValue(activity);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

export default function ActivityFiltersBar({ activities, filters, onFiltersChange }: ActivityFiltersBarProps) {
  const statusOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => activity.status);
    return ALL_STATUSES.map((status) => ({
      value: status,
      label: ACTIVITY_STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
    }));
  }, [activities]);

  const testerOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => activity.tester);
    return Array.from(counts.entries())
      .map(([tester, count]) => ({ value: tester, label: tester, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activities]);

  const devOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => activity.dev);
    return Array.from(counts.entries())
      .map(([dev, count]) => ({ value: dev, label: dev, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [activities]);

  const retestOptions = useMemo<MultiSelectOption[]>(() => {
    const counts = countBy(activities, (activity) => String(activity.retestCount >= 3 ? 3 : activity.retestCount));
    return [0, 1, 2, 3].map((bucket) => ({
      value: String(bucket),
      label: RETEST_LABELS[bucket],
      count: counts.get(String(bucket)) ?? 0,
    }));
  }, [activities]);

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.statuses.length > 0 ||
    filters.testers.length > 0 ||
    filters.devs.length > 0 ||
    filters.plannedEndFrom !== null ||
    filters.plannedEndTo !== null ||
    filters.retestBuckets.length > 0 ||
    filters.modules.length > 0 ||
    filters.processes.length > 0;

  function clearAll() {
    onFiltersChange({
      search: "",
      statuses: [],
      testers: [],
      devs: [],
      plannedEndFrom: null,
      plannedEndTo: null,
      retestBuckets: [],
      modules: [],
      processes: [],
    });
  }

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      <Form.Control
        type="text"
        placeholder="Buscar por nome ou ID…"
        className="activity-search-input"
        value={filters.search}
        onChange={(event) => onFiltersChange({ search: event.target.value })}
      />
      <MultiSelectFilter
        idPrefix="status-filter"
        label="Status"
        options={statusOptions}
        selected={filters.statuses}
        onChange={(statuses) => onFiltersChange({ statuses: statuses as ActivityStatus[] })}
      />
      <MultiSelectFilter
        idPrefix="tester-filter"
        label="Tester"
        options={testerOptions}
        selected={filters.testers}
        onChange={(testers) => onFiltersChange({ testers })}
        searchable
      />
      <MultiSelectFilter
        idPrefix="dev-filter"
        label="Dev"
        options={devOptions}
        selected={filters.devs}
        onChange={(devs) => onFiltersChange({ devs })}
        searchable
      />
      <ActivityDateRangeFilter
        from={filters.plannedEndFrom}
        to={filters.plannedEndTo}
        onFromChange={(value) => onFiltersChange({ plannedEndFrom: value })}
        onToChange={(value) => onFiltersChange({ plannedEndTo: value })}
      />
      <MultiSelectFilter
        idPrefix="retest-filter"
        label="Retestes"
        options={retestOptions}
        selected={filters.retestBuckets.map(String)}
        onChange={(values) => onFiltersChange({ retestBuckets: values.map(Number) })}
      />
      <ActivityModuleProcessFilter
        activities={activities}
        selectedModules={filters.modules}
        selectedProcesses={filters.processes}
        onModulesChange={(modules) => onFiltersChange({ modules })}
        onProcessesChange={(processes) => onFiltersChange({ processes })}
      />
      {hasActiveFilters && (
        <Button variant="outline-secondary" size="sm" onClick={clearAll}>
          Limpar todos
        </Button>
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
git add src/components/activities/ActivityFiltersBar.tsx
git commit -m "feat: add ActivityFiltersBar composing all 7 filter dimensions"
```

## Context

This is Task 11 of 21. Composes Tasks 8, 9, 10 plus an inline search input and "Limpar todos" button into the full filter row from the spec (search, status, tester, dev, período, retestes, módulo/processo — 7 dimensions; "Minhas atividades" is intentionally NOT here, it's part of the separate toolbar row built in Task 19, matching the mockup's own layout where that toggle sits in a second toolbar row, not the filters bar). All 4 `MultiSelectFilter` instances (status/tester/dev/retest) share the one generic component from Task 8 — only their `options`, `selected`, and `searchable` differ. Option counts for status/tester/dev/retest are computed from the full `activities` prop (not the filtered results) via the shared `countBy` helper, consistent with `ActivityModuleProcessFilter`'s counts (Task 9). The `statuses as ActivityStatus[]` cast is safe because `statusOptions`' values are only ever drawn from `ALL_STATUSES`. `hasActiveFilters` only considers this bar's own 7 dimensions (not `onlyMine`/`onlyOverdue`, which the toolbar row and stat chips control) — "Limpar todos" only appears once at least one of ths bar's own filters is active, and clears only this bar's own filters, leaving "Minhas atividades" and the stat-chip selection untouched.

---

### Task 12: `ActivityGroupToggle` component

**Files:**
- Create: `src/components/activities/ActivityGroupToggle.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityGroupToggle.tsx`:
```tsx
import Button from "react-bootstrap/Button";
import type { ActivityGroupMode } from "../../types/activity";

interface ActivityGroupToggleProps {
  mode: ActivityGroupMode;
  onChange: (mode: ActivityGroupMode) => void;
}

const OPTIONS: { value: ActivityGroupMode; label: string }[] = [
  { value: "tree", label: "Árvore" },
  { value: "tester", label: "Tester" },
  { value: "status", label: "Status" },
];

export default function ActivityGroupToggle({ mode, onChange }: ActivityGroupToggleProps) {
  return (
    <div className="btn-group" role="group" aria-label="Agrupar por">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={mode === option.value ? "primary" : "outline-secondary"}
          aria-pressed={mode === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityGroupToggle.tsx
git commit -m "feat: add ActivityGroupToggle component"
```

## Context

This is Task 12 of 21. A 3-way toggle (Árvore/Tester/Status) using the same `.btn-group` + `variant="primary"`/`"outline-secondary"` pattern already used for the UAT/Cutover mode toggle in `NewProjectModal.tsx`. Unlike that toggle, this one does NOT need per-option color differentiation (no `:first-child`/`:last-child` CSS trick) — a single consistent "selected = primary yellow" style across all 3 options is correct here, and this component isn't rendered inside a `.modal-content`, so the modal-scoped override from `_bootstrap-overrides.scss` doesn't apply to it anyway (by design — that selector is deliberately scoped to `.modal-content .btn-group[role="group"]`).

---

### Task 13: `ActivityRow` component

**Files:**
- Create: `src/components/activities/ActivityRow.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivityRow.tsx`:
```tsx
import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { isOverdue } from "../../utils/activityIndicators";
import type { Activity } from "../../types/activity";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

export default function ActivityRow({ activity, projectId }: ActivityRowProps) {
  const navigate = useNavigate();
  const overdue = isOverdue(activity);

  function goToDetail() {
    navigate(`/projetos/${projectId}/atividades/${activity.id}`);
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
      <td>
        <div className="fw-semibold">{activity.name}</div>
        <div className="text-body-secondary small font-monospace">{activity.id}</div>
      </td>
      <td>
        <ActivityStatusBadge status={activity.status} />
      </td>
      <td>{activity.tester}</td>
      <td>{activity.dev}</td>
      <td className="font-monospace small">
        {formatDate(activity.plannedStart)} → {formatDate(activity.plannedEnd)}
        {overdue && <span className="badge bg-danger ms-1">Atrasado</span>}
      </td>
      <td className="font-monospace small">
        {formatDate(activity.actualStart)} → {formatDate(activity.actualEnd)}
      </td>
      <td className="small">{activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}</td>
      <td className="text-center">{activity.retestCount}</td>
      <td className="text-center">{activity.issueCount}</td>
    </tr>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityRow.tsx
git commit -m "feat: add ActivityRow component"
```

## Context

This is Task 13 of 21. The leaf row for one activity, 9 columns matching the spec (Nome+ID combined in one cell, Status badge, Tester, Dev, Planejado range, Real range, Predecessores, Reteste, Issues). `projectId` is passed in as a prop (not read via its own `useParams()` call) so there's a single source of truth for it, coming from the page (Task 19) and threaded down through the table components (Tasks 14-15) — this mirrors how `onOpenTeam` was prop-drilled through `ProjectsTable`/`ProjectRow` in the first feature rather than each row managing its own state. Clicking the row (or pressing Enter/Space on it, matching the keyboard-accessibility fix applied to `ProjectRow` in the first feature) navigates to `/projetos/:id/atividades/:activityId` — the placeholder route built in Task 18. The inline "Atrasado" tag reuses Bootstrap's own `.badge.bg-danger` (not overridden with a custom class) since it's a small secondary annotation, not the primary status indicator — using Bootstrap's default red here is a deliberate, low-effort choice consistent with "Bootstrap first" for non-critical decoration.

---

### Task 14: `ActivityTreeRows` and `ActivityGroupRows` components

**Files:**
- Create: `src/components/activities/ActivityTreeRows.tsx`
- Create: `src/components/activities/ActivityGroupRows.tsx`

- [ ] **Step 1: Create ActivityTreeRows**

`src/components/activities/ActivityTreeRows.tsx`:
```tsx
import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import type { ModuleGroup } from "../../types/activity";

interface ActivityTreeRowsProps {
  groups: ModuleGroup[];
  projectId: string;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
}

function countCompleted(activities: { status: string }[]): number {
  return activities.filter((activity) => activity.status === "concluido").length;
}

export default function ActivityTreeRows({
  groups,
  projectId,
  expandedModules,
  onToggleModule,
}: ActivityTreeRowsProps) {
  return (
    <>
      {groups.map((moduleGroup) => {
        const activitiesInModule = moduleGroup.processes.flatMap((process) => process.activities);
        const isExpanded = expandedModules.has(moduleGroup.module);

        return (
          <Fragment key={moduleGroup.module}>
            <tr role="button" className="activity-group-row" onClick={() => onToggleModule(moduleGroup.module)}>
              <td colSpan={9}>
                <span className="activity-group-toggle-icon">{isExpanded ? "▾" : "▸"}</span>{" "}
                <span className="fw-semibold">{moduleGroup.module}</span>{" "}
                <span className="text-body-secondary small">
                  {countCompleted(activitiesInModule)}/{activitiesInModule.length} concluídas
                </span>
              </td>
            </tr>
            {isExpanded &&
              moduleGroup.processes.map((processGroup) => (
                <Fragment key={processGroup.process}>
                  <tr className="activity-group-row activity-group-row-process">
                    <td colSpan={9}>
                      <span className="fw-semibold small">{processGroup.process}</span>{" "}
                      <span className="text-body-secondary small">
                        {countCompleted(processGroup.activities)}/{processGroup.activities.length} concluídas
                      </span>
                    </td>
                  </tr>
                  {processGroup.activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} projectId={projectId} />
                  ))}
                </Fragment>
              ))}
          </Fragment>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Create ActivityGroupRows**

`src/components/activities/ActivityGroupRows.tsx`:
```tsx
import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import type { FlatActivityGroup } from "../../types/activity";

interface ActivityGroupRowsProps {
  groups: FlatActivityGroup[];
  projectId: string;
}

export default function ActivityGroupRows({ groups, projectId }: ActivityGroupRowsProps) {
  return (
    <>
      {groups.map((group) => (
        <Fragment key={group.key}>
          <tr className="activity-group-row">
            <td colSpan={9}>
              <span className="fw-semibold">{group.label}</span>{" "}
              <span className="text-body-secondary small">{group.activities.length} atividades</span>
            </td>
          </tr>
          {group.activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} projectId={projectId} />
          ))}
        </Fragment>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/activities/ActivityTreeRows.tsx src/components/activities/ActivityGroupRows.tsx
git commit -m "feat: add ActivityTreeRows and ActivityGroupRows components"
```

## Context

This is Task 14 of 21. These two components render the `<tbody>` contents for the two table shapes (`ActivitiesTable`, Task 15, picks one based on the active group mode): `ActivityTreeRows` for the 2-level Módulo›Processo tree (module rows are collapsible via `expandedModules`/`onToggleModule`, owned by the page in Task 19; processes are always shown once their parent module is expanded — no separate per-process collapse, a deliberate simplification since the mock dataset's processes are small enough not to need it), and `ActivityGroupRows` for the flat single-level Tester/Status groupings (always fully expanded, no collapse — matches the spec's description of these two modes as "agrupamento único, não aninhado"). Both use `<Fragment key={...}>` (not the `<>` shorthand) because each iteration of `.map()` needs to return multiple sibling `<tr>` elements under one key, and only the full `Fragment` component (not the shorthand) accepts a `key` prop. `colSpan={9}` matches `ActivitiesTable`'s 9 header columns (Task 15).

---

### Task 15: `ActivitiesTable` component

**Files:**
- Create: `src/components/activities/ActivitiesTable.tsx`

- [ ] **Step 1: Create the component**

`src/components/activities/ActivitiesTable.tsx`:
```tsx
import Table from "react-bootstrap/Table";
import ActivityTreeRows from "./ActivityTreeRows";
import ActivityGroupRows from "./ActivityGroupRows";
import EmptyState from "../common/EmptyState";
import { groupByModuleProcess, groupByStatus, groupByTester } from "../../utils/groupActivities";
import type { Activity, ActivityGroupMode } from "../../types/activity";

interface ActivitiesTableProps {
  activities: Activity[];
  projectId: string;
  groupMode: ActivityGroupMode;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
}

export default function ActivitiesTable({
  activities,
  projectId,
  groupMode,
  expandedModules,
  onToggleModule,
}: ActivitiesTableProps) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="Nenhuma atividade encontrada"
        description="Ajuste os filtros para encontrar a atividade que procura."
      />
    );
  }

  return (
    <Table hover responsive className="align-middle mb-0">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Status</th>
          <th>Tester</th>
          <th>Dev</th>
          <th>Planejado</th>
          <th>Real</th>
          <th>Predecessores</th>
          <th className="text-center">Reteste</th>
          <th className="text-center">Issues</th>
        </tr>
      </thead>
      <tbody>
        {groupMode === "tree" && (
          <ActivityTreeRows
            groups={groupByModuleProcess(activities)}
            projectId={projectId}
            expandedModules={expandedModules}
            onToggleModule={onToggleModule}
          />
        )}
        {groupMode === "tester" && <ActivityGroupRows groups={groupByTester(activities)} projectId={projectId} />}
        {groupMode === "status" && <ActivityGroupRows groups={groupByStatus(activities)} projectId={projectId} />}
      </tbody>
    </Table>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivitiesTable.tsx
git commit -m "feat: add ActivitiesTable component"
```

## Context

This is Task 15 of 21. Top-level table shell: renders the 9-column header once, then delegates the body to `ActivityTreeRows` or `ActivityGroupRows` (Task 14) depending on `groupMode`, or the shared `EmptyState` (Task 4's new location, `components/common/`) when the (already-filtered) `activities` array is empty. This mirrors `ProjectsTable`'s structure from the first feature almost exactly (same `Table hover responsive` props, same empty-state branch shape).

---

### Task 16: `ProjectNavDock` component and its SCSS partial

**Files:**
- Create: `src/components/project-nav/ProjectNavDock.tsx`
- Create: `src/styles/_project-nav-dock.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the component**

`src/components/project-nav/ProjectNavDock.tsx`:
```tsx
import { NavLink, useParams } from "react-router";

const NAV_ITEMS = [
  { to: "dashboard", label: "Dashboard" },
  { to: "atividades", label: "Atividades" },
  { to: "estrutura", label: "Estrutura" },
  { to: "issues", label: "Issues" },
  { to: "config", label: "Papel & Config" },
];

export default function ProjectNavDock() {
  const { id } = useParams();

  return (
    <div className="project-nav-dock">
      <NavLink to="/projetos" className="project-nav-dock-back" aria-label="Voltar para Meus Projetos">
        ←
      </NavLink>
      <div className="project-nav-dock-divider" />
      <nav className="nav nav-pills">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={`/projetos/${id}/${item.to}`}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Create the SCSS partial**

`src/styles/_project-nav-dock.scss`:
```scss
@use "colors" as c;

.project-nav-dock {
  position: fixed;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 20;
  width: fit-content;
  max-width: calc(100% - 32px);
  background-color: c.$surface;
  border: 1px solid c.$border;
  border-radius: 999px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(31, 32, 36, 0.1);
}

.project-nav-dock-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: c.$text-dim;
  background-color: c.$bg-alt;
}

.project-nav-dock-divider {
  width: 1px;
  height: 22px;
  background-color: c.$border;
}

.project-layout-content {
  padding-top: 6rem;
}
```

- [ ] **Step 3: Wire the partial into main.scss**

Current `src/styles/main.scss`:
```scss
@use "background";
@use "bootstrap-overrides";
@use "ui-extras";
@use "footer-widget";
@use "activities";
```

Replace with:
```scss
@use "background";
@use "bootstrap-overrides";
@use "ui-extras";
@use "footer-widget";
@use "activities";
@use "project-nav-dock";
```

- [ ] **Step 4: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/project-nav/ProjectNavDock.tsx src/styles/_project-nav-dock.scss src/styles/main.scss
git commit -m "feat: add ProjectNavDock component and styles"
```

## Context

This is Task 16 of 21. `ProjectNavDock` is the floating pill navigation that replaces `FooterWidget` inside `/projetos/:id/*` (per the spec). Visually it reuses the same floating-pill shell shape as `.footer-widget` (fixed top, rounded-pill, white surface, same shadow) but is a distinct class (`.project-nav-dock`) in its own file — not a rename of `.footer-widget`, since `FooterWidget`/`.footer-widget` stays exactly as-is for the "Meus Projetos" page. The 5 nav items are real `react-router` `NavLink`s (not tab-switching local state like `ProjectsToolbar`'s pills) — `NavLink`'s `className` render-prop receives `{ isActive }` and this component builds the exact `"nav-link"` / `"nav-link active"` strings that the existing `.nav-pills .nav-link` / `.nav-pills .nav-link.active` overrides in `_bootstrap-overrides.scss` (from the visual-fidelity pass) already style — no new nav-item CSS needed, just the outer dock shell and the back-button/divider, which is why this task's SCSS only adds 3 small rules. `.project-layout-content` (padding-top to clear the fixed dock, same value as `.projects-page`'s padding) is added here since it's specifically for the layout this dock lives in — it isn't reused from `.projects-page` to avoid coupling this new layout's spacing to a class name/file that "belongs" to a different, already-shipped page.

---

### Task 17: `ProjectLayout`

**Files:**
- Create: `src/layouts/ProjectLayout.tsx`

- [ ] **Step 1: Create the layout**

`src/layouts/ProjectLayout.tsx`:
```tsx
import { Outlet } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";

export default function ProjectLayout() {
  return (
    <div>
      <ProjectNavDock />
      <main className="container py-4 project-layout-content">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/ProjectLayout.tsx
git commit -m "feat: add ProjectLayout with nav dock and Outlet"
```

## Context

This is Task 17 of 21. `Outlet` (from `react-router`, same package already used for `BrowserRouter`/`Routes`/`Route`/`Navigate` elsewhere in this codebase) renders whichever nested route matched — this is the standard React Router layout-route pattern. This file isn't wired into `AppRoutes.tsx` yet (that's Task 20) and doesn't render anything reachable in the browser until then — creating it now, standalone, is fine; `npx tsc -b` will succeed because `ProjectNavDock` (Task 16) and `Outlet` are both valid imports regardless of routing wiring.

---

### Task 18: Placeholder pages

**Files:**
- Create: `src/pages/PlaceholderPage.tsx`
- Create: `src/pages/ActivityDetailPlaceholderPage.tsx`

- [ ] **Step 1: Create the generic placeholder**

`src/pages/PlaceholderPage.tsx`:
```tsx
interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="text-center py-5">
      <h1 className="h4 fw-bold">Em construção</h1>
      <p className="text-body-secondary">{title} ainda não foi implementado.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create the activity-detail placeholder**

`src/pages/ActivityDetailPlaceholderPage.tsx`:
```tsx
import { useParams } from "react-router";

export default function ActivityDetailPlaceholderPage() {
  const { activityId } = useParams();

  return (
    <div className="text-center py-5">
      <h1 className="h4 fw-bold">Em construção</h1>
      <p className="text-body-secondary">
        A tela de detalhe da atividade <strong>{activityId}</strong> ainda não foi implementada.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PlaceholderPage.tsx src/pages/ActivityDetailPlaceholderPage.tsx
git commit -m "feat: add placeholder pages for not-yet-built project areas"
```

## Context

This is Task 18 of 21. `PlaceholderPage` is a single generic, reusable "Em construção" page taking just a `title` string — it'll be used for Dashboard, Estrutura, Issues, and Config (4 routes, Task 20), avoiding 4 near-duplicate files. `ActivityDetailPlaceholderPage` is a separate tiny page (not a `PlaceholderPage` usage) because it needs to read and display the `:activityId` route param, which `PlaceholderPage`'s plain-string-title contract doesn't support — same pattern as the existing (soon to be deleted, Task 20) `ProjectDetailPage.tsx`, which does the same thing for a project id. `useParams()` is called with no generic, matching the fix already applied to `ActivityDetailPlaceholderPage`'s sibling pattern in `ProjectDetailPage.tsx` and `ProjectRow.tsx` earlier in this codebase (react-router's `Params<Key>` type always resolves to `string | undefined` per key, regardless of what generic is passed — verified against the installed package during the visual-fidelity work — so there's nothing to gain from adding one here).

---

### Task 19: `ProjectActivitiesPage`

**Files:**
- Create: `src/pages/ProjectActivitiesPage.tsx`

- [ ] **Step 1: Create the page**

`src/pages/ProjectActivitiesPage.tsx`:
```tsx
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import { useActivities } from "../hooks/useActivities";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import type { ActivityFiltersState, ActivityGroupMode } from "../types/activity";

const CURRENT_USER_NAME = "Guilherme Fabretti";

function createEmptyFilters(): ActivityFiltersState {
  return {
    search: "",
    statuses: [],
    testers: [],
    devs: [],
    plannedEndFrom: null,
    plannedEndTo: null,
    retestBuckets: [],
    modules: [],
    processes: [],
    onlyMine: false,
    onlyOverdue: false,
  };
}

export default function ProjectActivitiesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { activities, stats } = useActivities(projectId);

  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
  const [groupMode, setGroupMode] = useState<ActivityGroupMode>("tree");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  function updateFilters(partial: Partial<ActivityFiltersState>) {
    setFilters((prev) => ({ ...prev, ...partial }));
  }

  const filteredActivities = useMemo(
    () => filterActivities(activities, filters, CURRENT_USER_NAME),
    [activities, filters]
  );

  const singleStatus = filters.statuses.length === 1 ? filters.statuses[0] : null;
  const activeChip: ActivityStatChipKey = filters.onlyOverdue
    ? "atrasado"
    : singleStatus && singleStatus !== "liberado" && singleStatus !== "cancelado"
      ? singleStatus
      : "total";

  function handleChipSelect(chip: ActivityStatChipKey) {
    if (chip === "total") {
      updateFilters({ statuses: [], onlyOverdue: false });
    } else if (chip === "atrasado") {
      updateFilters({ statuses: [], onlyOverdue: true });
    } else {
      updateFilters({ statuses: [chip], onlyOverdue: false });
    }
  }

  function toggleModule(moduleName: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) {
        next.delete(moduleName);
      } else {
        next.add(moduleName);
      }
      return next;
    });
  }

  function expandAllModules() {
    const allModules = groupByModuleProcess(filteredActivities).map((group) => group.module);
    setExpandedModules(new Set(allModules));
  }

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h1 className="h4 fw-bold mb-1">Atividades</h1>
          <p className="text-body-secondary small mb-0">
            Mostrando {filteredActivities.length} de {activities.length} atividades
          </p>
        </div>
      </div>

      <ActivityStatChips stats={stats} activeChip={activeChip} onSelect={handleChipSelect} />

      <ActivityFiltersBar activities={activities} filters={filters} onFiltersChange={updateFilters} />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <span className="text-body-secondary small">Agrupar por:</span>
          <ActivityGroupToggle mode={groupMode} onChange={setGroupMode} />
        </div>
        <div className="d-flex align-items-center gap-3">
          {groupMode === "tree" && (
            <Button variant="outline-secondary" size="sm" onClick={expandAllModules}>
              Abrir todos os módulos
            </Button>
          )}
          <Form.Check
            type="switch"
            id="only-mine-toggle"
            label="Minhas atividades"
            checked={filters.onlyMine}
            onChange={(event) => updateFilters({ onlyMine: event.target.checked })}
          />
        </div>
      </div>

      <div className="card">
        <ActivitiesTable
          activities={filteredActivities}
          projectId={projectId}
          groupMode={groupMode}
          expandedModules={expandedModules}
          onToggleModule={toggleModule}
        />
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
git add src/pages/ProjectActivitiesPage.tsx
git commit -m "feat: compose ProjectActivitiesPage from activities components"
```

## Context

This is Task 19 of 21. The integration page — owns all UI state (`filters`, `groupMode`, `expandedModules`) and wires it into every component from Tasks 6-15, exactly matching the layering already established by `ProjectsPage.tsx` in the first feature (data hook + local UI state in the page, presentational components below only receive props/callbacks). `activeChip` is derived from `filters` rather than being its own piece of state, so the chips row and the Status multi-select filter can never disagree about what's selected — clicking a stat chip calls `updateFilters`, which is the exact same setter the filters bar and toolbar controls use. `expandAllModules` recomputes module names from `filteredActivities` (not the full unfiltered `activities`) so "abrir todos" only expands modules that currently have at least one visible row. This page is not wired into any route yet — that's Task 20; it won't be reachable in the browser until then, which is expected.

---

### Task 20: Routing

**Files:**
- Modify: `src/routes/AppRoutes.tsx`
- Delete: `src/pages/ProjectDetailPage.tsx`

- [ ] **Step 1: Rewrite AppRoutes.tsx**

Current `src/routes/AppRoutes.tsx`:
```tsx
import { Navigate, Route, Routes } from "react-router";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectDetailPage from "../pages/ProjectDetailPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projetos" replace />} />
      <Route path="/projetos" element={<ProjectsPage />} />
      <Route path="/projetos/:id" element={<ProjectDetailPage />} />
    </Routes>
  );
}
```

Replace with:
```tsx
import { Navigate, Route, Routes } from "react-router";
import ProjectsPage from "../pages/ProjectsPage";
import ProjectLayout from "../layouts/ProjectLayout";
import ProjectActivitiesPage from "../pages/ProjectActivitiesPage";
import ActivityDetailPlaceholderPage from "../pages/ActivityDetailPlaceholderPage";
import PlaceholderPage from "../pages/PlaceholderPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/projetos" replace />} />
      <Route path="/projetos" element={<ProjectsPage />} />
      <Route path="/projetos/:id" element={<ProjectLayout />}>
        <Route index element={<Navigate to="atividades" replace />} />
        <Route path="dashboard" element={<PlaceholderPage title="O dashboard do projeto" />} />
        <Route path="atividades" element={<ProjectActivitiesPage />} />
        <Route path="atividades/:activityId" element={<ActivityDetailPlaceholderPage />} />
        <Route path="estrutura" element={<PlaceholderPage title="A estrutura (WBS) do projeto" />} />
        <Route path="issues" element={<PlaceholderPage title="As issues do projeto" />} />
        <Route path="config" element={<PlaceholderPage title="A configuração do projeto" />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 2: Delete the superseded placeholder page**

```bash
git rm src/pages/ProjectDetailPage.tsx
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/AppRoutes.tsx
git commit -m "feat: wire ProjectLayout with nested routes for the specific-project area"
```

## Context

This is Task 20 of 21 — the last integration step before manual QA. `/projetos/:id` now renders `ProjectLayout` (Task 17) instead of the old flat `ProjectDetailPage`, with 6 nested routes: an `index` redirect to `atividades`, the 4 not-yet-built areas as `PlaceholderPage` instances (Task 18), the real `ProjectActivitiesPage` (Task 19), and the activity-detail placeholder. `ProjectRow.tsx` (in `components/projects/`, from the first feature) already calls `navigate(\`/projetos/${project.id}\`)` on row click — nothing about that needs to change, since that path still matches `<Route path="/projetos/:id">`, whose `index` child now transparently redirects to `.../atividades`. `ProjectDetailPage.tsx` is deleted because `ProjectLayout` + its nested routes fully supersede what it did (show a generic "Em construção" placeholder for the whole project) — keeping it around would be dead code with no route pointing at it anymore.

---

### Task 21: Manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: completes with no TypeScript, Sass, or Vite errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev`
Expected: prints a local URL.

- [ ] **Step 4: Manual checklist in the browser**

Open the app and confirm:
- [ ] From "Meus Projetos", clicking any project row lands on `/projetos/<id>/atividades` (via the index redirect) and shows the nav dock at the top instead of the brand/user footer widget.
- [ ] The nav dock's 5 items are all clickable; Dashboard/Estrutura/Issues/Papel & Config each show their own "Em construção" message; the back arrow returns to "Meus Projetos".
- [ ] The Atividades page shows "Mostrando 18 de 18 atividades" initially, with 6 stat chips (Total=18, Concluído=5, Em execução=4, Bloqueado=3, Aguardando=3, Atrasado=4).
- [ ] Clicking each stat chip filters the table to just that status (or overdue activities for "Atrasado"); clicking "Total" clears back to all 18.
- [ ] Search filters by name and by ID (try "ATV-1009" and "PIX").
- [ ] Status, Tester, Dev, and Retestes filters each open a dropdown with checkboxes and counts, stay open while checking multiple boxes, and narrow the table correctly; Tester/Dev dropdowns filter their own option list when typing in the search box inside them.
- [ ] The date-range filter on "Conclusão planejada" narrows the table when a from/to date is set.
- [ ] The Módulo/Processo filter shows both modules with correct counts, each with its processes nested and their own counts; checking a module or a process narrows the table.
- [ ] "Limpar todos" appears only when at least one of the 7 filters above is active, and clears them all without touching the group-by mode or "Minhas atividades".
- [ ] "Agrupar por" toggle switches between Árvore (2-level Módulo/Processo rows, collapsible per module, with "Abrir todos os módulos" expanding every module at once), Tester (flat groups), and Status (flat groups).
- [ ] "Minhas atividades" toggle narrows to activities where Guilherme Fabretti is tester or dev.
- [ ] A filter/search combination matching nothing shows the "Nenhuma atividade encontrada" empty state.
- [ ] Clicking an activity row (in any group mode) navigates to `/projetos/<id>/atividades/<activityId>` and shows that id in the placeholder message; browser back returns to the filtered/grouped Atividades list as it was.
- [ ] No errors in the browser console.

- [ ] **Step 5: Stop the dev server**

Stop the process (Ctrl+C in the terminal running `npm run dev`).

- [ ] **Step 6: Fix any issues found, then commit if changes were made**

If Step 4 revealed issues, fix the relevant file(s), re-run Steps 1-4, then:
```bash
git add -A
git commit -m "fix: address issues found in manual QA of the Activities list page"
```
If no issues were found, no commit is needed for this task.

---

## Out of scope (per spec)

- The 4 activity-detail page variants by status, and the quick-view drawer.
- Bulk selection, batch approval, batch cancellation.
- "+ Nova atividade" (creation).
- Bulk import (Excel) and export.
- Real content for Dashboard, Estrutura, Issues, and Papel & Config — they stay as `PlaceholderPage` placeholders, reachable via the nav dock, until their own specs.
- Cutover (orphaned in the mockup itself).
