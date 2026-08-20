# Papéis & Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Papéis & Config screen at `/projetos/:id/config` — replacing its placeholder — per `docs/superpowers/specs/2026-08-19-project-config-design.md`: a shared `ProjectConfig` context that makes SPI/aging thresholds real (affecting the already-shipped Dashboard and Issues screens), plus a Usuários tab that reuses the existing Microsoft Graph user-search flow from `NewProjectModal` to really add/edit team members on the current project.

**Architecture:** First use of React Context in this codebase (`src/context/ProjectConfigContext.tsx`), mounted in `ProjectLayout` so it's shared across every page inside a project session. Existing pure utils (`issueIndicators.ts`, `projectIndicators.ts`) gain threshold parameters instead of reading fixed constants. The Graph search logic already built in `NewProjectModal` is extracted into a reusable hook (`useGraphUserSearch`) so a second modal can reuse it without duplicating the async/token logic. Small, single-responsibility presentational components (mirroring the `ActivityFieldGrid`/`IssueFieldGrid` precedent) composed into one page.

**Tech Stack:** React 19, TypeScript, react-router v8, `@azure/msal-react` (already used by `NewProjectModal`), plain SCSS (no Bootstrap). No new dependencies.

**No automated tests in this plan** — same decision as every previous feature; verification is `npx tsc -b` after each task plus a manual browser QA pass in the final task.

---

## File Structure Overview

```
src/
├── types/
│   └── projectConfig.ts                          # new — AgingThresholds, ProjectConfig
├── context/
│   └── ProjectConfigContext.tsx                   # new — first Context in the project
├── hooks/
│   ├── useProjectAgingThresholds.ts               # new
│   ├── useGraphUserSearch.ts                      # new — extracted from NewProjectModal
│   └── useProjects.ts                             # modified — addTeamMember, replaceTeamMemberRoles
├── utils/
│   ├── issueIndicators.ts                         # modified — computeIssueRisk takes thresholds
│   ├── projectIndicators.ts                       # modified — getSpiVariantWithThresholds
│   └── teamMembers.ts                             # new — groupTeamMembersByName
├── layouts/
│   └── ProjectLayout.tsx                          # modified — wraps Outlet with ProjectConfigProvider
├── components/
│   ├── issues/
│   │   ├── IssueRow.tsx                           # modified — agingThresholds prop
│   │   ├── IssuesTable.tsx                        # modified — resolves thresholds internally
│   │   └── IssuesKpiCards.tsx                     # modified — projectId prop, resolves thresholds
│   ├── dashboard/
│   │   └── DashboardActivitiesBlock.tsx           # modified — colors .spi-big
│   ├── projects/
│   │   └── NewProjectModal.tsx                    # modified — uses useGraphUserSearch
│   └── config/
│       ├── InviteUserModal.tsx                     # new
│       ├── EditUserRolesModal.tsx                  # new
│       ├── ConfigUsersTable.tsx                    # new
│       ├── ConfigPermissionMatrix.tsx              # new
│       ├── ConfigThresholdsPanel.tsx               # new
│       └── ConfigAttachmentsPanel.tsx              # new
├── pages/
│   └── ProjectConfigPage.tsx                       # new — replaces the PlaceholderPage route
├── routes/
│   └── AppRoutes.tsx                                # modified — config route
└── styles/
    ├── _config.scss                                 # new
    ├── _dashboard.scss                              # modified — .spi-big.g/.y/.r
    └── main.scss                                    # modified — @use "config"
```

---

### Task 1: `ProjectConfig` types and Context

**Files:**
- Create: `src/types/projectConfig.ts`
- Create: `src/context/ProjectConfigContext.tsx`

- [ ] **Step 1: Create the types**

`src/types/projectConfig.ts`:

```ts
export interface AgingThresholds {
  alerta: number;
  risco: number;
}

export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
}
```

- [ ] **Step 2: Create the Context**

`src/context/ProjectConfigContext.tsx`:

```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import type { ProjectConfig } from "../types/projectConfig";

// Mesmos valores hoje hardcoded em issueIndicators.ts (AGING_ALERTA_DAYS=2/AGING_RISCO_DAYS=6)
// e no antigo getSpiVariant (0.90/0.70, ajustado aqui para o par saudável/crítico do
// mockup 0.90/0.75). agingCutover é novo — Cutover é operacionalmente mais crítico
// (janela pré-go-live curta), limiares mais apertados.
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  spiSaudavel: 0.9,
  spiCritico: 0.75,
  agingUat: { alerta: 2, risco: 6 },
  agingCutover: { alerta: 3, risco: 8 },
};

interface ProjectConfigContextValue {
  config: ProjectConfig;
  setConfig: (config: ProjectConfig) => void;
}

const ProjectConfigContext = createContext<ProjectConfigContextValue | null>(null);

// Estado único e global (não por projectId) — mesma simplificação que useIssues/useActivities
// já assumem (ambos ignoram projectId e retornam sempre o mesmo dataset mock). Não existe
// backend real por trás; diferenciar por projeto seria complexidade sem contrapartida.
export function ProjectConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ProjectConfig>(DEFAULT_PROJECT_CONFIG);
  return <ProjectConfigContext.Provider value={{ config, setConfig }}>{children}</ProjectConfigContext.Provider>;
}

export function useProjectConfig(): ProjectConfigContextValue {
  const ctx = useContext(ProjectConfigContext);
  if (!ctx) {
    throw new Error("useProjectConfig deve ser usado dentro de ProjectConfigProvider");
  }
  return ctx;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/projectConfig.ts src/context/ProjectConfigContext.tsx
git commit -m "feat: add ProjectConfig type and Context"
```

## Context

This is Task 1 of 18. First use of `src/context/` in this codebase — every previous piece of state has been a `useX(projectId)` hook called independently per component, which works because no page has ever needed to read state that another page wrote. SPI/aging thresholds break that: saving in Config must be visible on the Dashboard and Issues screens in the same session, which plain independent `useState` calls can't do (each call site gets its own copy). `ProjectConfigProvider` isn't wired into the app yet — that's Task 2 — so nothing imports this file yet, but it type-checks standalone.

---

### Task 2: Wire `ProjectConfigProvider` into `ProjectLayout`

**Files:**
- Modify: `src/layouts/ProjectLayout.tsx`

- [ ] **Step 1: Wrap the Outlet**

Replace the full contents of `src/layouts/ProjectLayout.tsx` with:

```tsx
import { Outlet } from "react-router";
import ProjectNavDock from "../components/project-nav/ProjectNavDock";
import { ProjectConfigProvider } from "../context/ProjectConfigContext";

export default function ProjectLayout() {
  return (
    <ProjectConfigProvider>
      <div>
        <ProjectNavDock />
        <main className="project-layout-content">
          <Outlet />
        </main>
      </div>
    </ProjectConfigProvider>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/ProjectLayout.tsx
git commit -m "feat: wrap ProjectLayout's Outlet with ProjectConfigProvider"
```

## Context

This is Task 2 of 18. `ProjectLayout` is the route element for `/projetos/:id`, wrapping every nested route (`dashboard`, `atividades`, `atividades/:activityId`, `estrutura`, `issues`, `issues/:issueId`, `config`) via `<Outlet />` — exactly the set of pages this config needs to reach. It stays out of `/projetos` (the global project list), which is a sibling route, not a child — matches the spec's explicit decision to leave SPI coloring on that list out of scope. No visible behavior change yet — nothing reads `useProjectConfig()` until later tasks.

---

### Task 3: `useProjectAgingThresholds`

**Files:**
- Create: `src/hooks/useProjectAgingThresholds.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useProjectConfig } from "../context/ProjectConfigContext";
import { useProjects } from "./useProjects";
import type { AgingThresholds } from "../types/projectConfig";

// Resolve os limiares de aging certos pro modo (UAT/Cutover) do projeto atual, evitando
// repetir esse lookup em cada consumidor. Projeto não encontrado (não deveria acontecer
// nas rotas que usam isso, mas evita um throw) cai no default de UAT.
export function useProjectAgingThresholds(projectId: string): AgingThresholds {
  const { config } = useProjectConfig();
  const { projects } = useProjects();
  const project = projects.find((item) => item.id === projectId);
  return project?.mode === "cutover" ? config.agingCutover : config.agingUat;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProjectAgingThresholds.ts
git commit -m "feat: add useProjectAgingThresholds hook"
```

## Context

This is Task 3 of 18. Combines `useProjectConfig()` (Task 1) with the same `useProjects().find(p => p.id === projectId)` lookup `ProjectNavDock.tsx` already does to resolve the current project. Not wired into anything yet — Task 4 is the first real consumer.

---

### Task 4: Make `computeIssueRisk` take configurable thresholds, wire Issues screens

**Files:**
- Modify: `src/utils/issueIndicators.ts`
- Modify: `src/components/issues/IssueRow.tsx`
- Modify: `src/components/issues/IssuesTable.tsx`
- Modify: `src/components/issues/IssuesKpiCards.tsx`
- Modify: `src/pages/ProjectIssuesPage.tsx`

This task touches 5 files together because changing `computeIssueRisk`'s signature alone would break its 2 call sites — they have to land in the same commit to keep the build green.

- [ ] **Step 1: Update `issueIndicators.ts`**

Add the import at the top of `src/utils/issueIndicators.ts` (after the existing `Issue`/etc. import):

```ts
import type { Issue, IssueImpact, IssueStatus, IssueType } from "../types/issue";
import type { AgingThresholds } from "../types/projectConfig";
```

Then replace this block (the two `AGING_*` constants through the end of `computeIssueRisk`):

```ts
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
```

with:

```ts
// Dias desde a abertura se ainda aberta; dias entre abertura e resolução (congelado) se concluída.
export function computeIssueAgingDays(issue: Issue, now: Date = new Date()): number {
  const end = issue.resolvedAt !== null ? new Date(issue.resolvedAt) : now;
  const days = (end.getTime() - new Date(issue.openedAt).getTime()) / 86400000;
  return Math.round(days);
}

export type IssueRiskLevel = "aceitavel" | "alerta" | "risco" | null;

// null para issues concluídas — risco de aging não se aplica a algo que já foi resolvido.
// Os limiares agora vêm de fora (configuráveis em Papéis & Config) em vez de constantes
// fixas — ver useProjectAgingThresholds.
export function computeIssueRisk(issue: Issue, thresholds: AgingThresholds, now: Date = new Date()): IssueRiskLevel {
  if (issue.status === "concluida") return null;
  const aging = computeIssueAgingDays(issue, now);
  if (aging >= thresholds.risco) return "risco";
  if (aging >= thresholds.alerta) return "alerta";
  return "aceitavel";
}
```

Nothing else in the file changes — `ISSUE_STATUS_LABELS`, `ISSUE_STATUS_BADGE_CLASS`, `ISSUE_TYPE_LABELS`, `ISSUE_IMPACT_LABELS`, `ISSUE_IMPACT_BADGE_CLASS`, `ISSUE_IMPACT_RANK`, `sortIssuesByPriority` stay exactly as they are (`sortIssuesByPriority` calls `computeIssueAgingDays`, not `computeIssueRisk`, so it's unaffected).

- [ ] **Step 2: Update `IssueRow.tsx`**

In `src/components/issues/IssueRow.tsx`, change the imports:

```tsx
import { computeIssueAgingDays, computeIssueRisk, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import { getInitials } from "../../utils/initials";
import type { Issue } from "../../types/issue";
```

to:

```tsx
import { computeIssueAgingDays, computeIssueRisk, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import { getInitials } from "../../utils/initials";
import type { Issue } from "../../types/issue";
import type { AgingThresholds } from "../../types/projectConfig";
```

Change the props interface:

```tsx
interface IssueRowProps {
  issue: Issue;
  projectId: string;
}
```

to:

```tsx
interface IssueRowProps {
  issue: Issue;
  projectId: string;
  agingThresholds: AgingThresholds;
}
```

Change the function signature and the `computeIssueRisk` call:

```tsx
export default function IssueRow({ issue, projectId }: IssueRowProps) {
  const navigate = useNavigate();
  const aging = computeIssueAgingDays(issue);
  const risk = computeIssueRisk(issue);
```

to:

```tsx
export default function IssueRow({ issue, projectId, agingThresholds }: IssueRowProps) {
  const navigate = useNavigate();
  const aging = computeIssueAgingDays(issue);
  const risk = computeIssueRisk(issue, agingThresholds);
```

Nothing else in the file changes.

- [ ] **Step 3: Update `IssuesTable.tsx`**

In `src/components/issues/IssuesTable.tsx`, add the import:

```tsx
import IssueRow from "./IssueRow";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
import type { Issue } from "../../types/issue";
```

to:

```tsx
import IssueRow from "./IssueRow";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
import { useProjectAgingThresholds } from "../../hooks/useProjectAgingThresholds";
import type { Issue } from "../../types/issue";
```

Then change the component body's opening:

```tsx
export default function IssuesTable({ issues, projectId }: IssuesTableProps) {
  if (issues.length === 0) {
```

to:

```tsx
export default function IssuesTable({ issues, projectId }: IssuesTableProps) {
  const agingThresholds = useProjectAgingThresholds(projectId);

  if (issues.length === 0) {
```

And change the row mapping:

```tsx
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} projectId={projectId} />
          ))}
```

to:

```tsx
          {issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} projectId={projectId} agingThresholds={agingThresholds} />
          ))}
```

The `IssuesTableProps` interface (`{ issues: Issue[]; projectId: string }`) doesn't change — thresholds are resolved internally, not passed in.

- [ ] **Step 4: Update `IssuesKpiCards.tsx`**

Replace the full contents of `src/components/issues/IssuesKpiCards.tsx` with:

```tsx
import StatCard from "../common/StatCard";
import { computeIssueAgingDays, computeIssueRisk } from "../../utils/issueIndicators";
import { useProjectAgingThresholds } from "../../hooks/useProjectAgingThresholds";
import type { Issue } from "../../types/issue";

interface IssuesKpiCardsProps {
  issues: Issue[];
  projectId: string;
}

export default function IssuesKpiCards({ issues, projectId }: IssuesKpiCardsProps) {
  const agingThresholds = useProjectAgingThresholds(projectId);
  const abertas = issues.filter((issue) => issue.status !== "concluida");
  const impeditivasAbertas = abertas.filter((issue) => issue.impeditiva);
  const emRisco = abertas.filter((issue) => computeIssueRisk(issue, agingThresholds) === "risco");
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

- [ ] **Step 5: Update `ProjectIssuesPage.tsx`**

In `src/pages/ProjectIssuesPage.tsx`, change the single call site:

```tsx
      <IssuesKpiCards issues={filteredIssues} />
```

to:

```tsx
      <IssuesKpiCards issues={filteredIssues} projectId={projectId} />
```

Nothing else in the file changes.

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/utils/issueIndicators.ts src/components/issues/IssueRow.tsx src/components/issues/IssuesTable.tsx src/components/issues/IssuesKpiCards.tsx src/pages/ProjectIssuesPage.tsx
git commit -m "feat: make issue aging risk use configurable thresholds"
```

## Context

This is Task 4 of 18. `computeIssueRisk`'s two real call sites — `IssueRow.tsx` (the Aging column color) and `IssuesKpiCards.tsx` (the "Em risco (aging)" KPI) — both now resolve `agingThresholds` themselves via `useProjectAgingThresholds(projectId)`, rather than `ProjectIssuesPage` computing it once and prop-drilling the value down through `IssuesTable`. Both components already receive `projectId` as a prop (`IssueRow` did; `IssuesKpiCards` gains it here), so this avoids introducing a new kind of prop (a resolved config value) alongside the existing `projectId`-threading convention — every consumer just needs the id it already gets. `ActivityLinkedIssuesPanel.tsx` and `IssueFieldGrid.tsx` are untouched: neither calls `computeIssueRisk` (only `computeIssueAgingDays`, which never depended on thresholds), so they're unaffected by this signature change.

---

### Task 5: `getSpiVariantWithThresholds`

**Files:**
- Modify: `src/utils/projectIndicators.ts`

- [ ] **Step 1: Add the function**

Replace the full contents of `src/utils/projectIndicators.ts` with:

```ts
import type { Project } from "../types/project";
import type { ProjectConfig } from "../types/projectConfig";

export type StatusVariant = "success" | "danger" | "warning" | "info";
export type SpiVariant = "good" | "warn" | "bad";

export function getProjectStatusVariant(project: Project): StatusVariant {
  if (project.progressPercent >= 100) return "success";
  if (project.spi !== null && project.spi < 0.7) {
    // Em Cutover o atraso é mais crítico (perto do go-live) do que em UAT.
    return project.mode === "cutover" ? "danger" : "warning";
  }
  return "info";
}

// Usada pela lista global de Projetos — limiares fixos, fora do alcance do
// ProjectConfigProvider (que só cobre a árvore de rotas de um projeto específico).
export function getSpiVariant(spi: number | null): SpiVariant | null {
  if (spi === null) return null;
  if (spi >= 0.9) return "good";
  if (spi >= 0.7) return "warn";
  return "bad";
}

// Mesma lógica de 3 faixas de getSpiVariant, mas com limiares configuráveis em
// Papéis & Config — usada pelo SPI do Dashboard do próprio projeto.
export function getSpiVariantWithThresholds(
  spi: number | null,
  config: Pick<ProjectConfig, "spiSaudavel" | "spiCritico">
): SpiVariant | null {
  if (spi === null) return null;
  if (spi >= config.spiSaudavel) return "good";
  if (spi >= config.spiCritico) return "warn";
  return "bad";
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/projectIndicators.ts
git commit -m "feat: add getSpiVariantWithThresholds for the project Dashboard"
```

## Context

This is Task 5 of 18. `getSpiVariant` (fixed 0.90/0.70 thresholds) is untouched and keeps serving `ProjectsTable`/`ProjectRow` on the global `/projetos` list — that page sits outside `ProjectConfigProvider`'s route tree, and the spec explicitly puts connecting it out of scope (would need a per-project store reachable outside the project's own route, disproportionate complexity for a feature with no real persistence yet). `getSpiVariantWithThresholds` is a separate, additive function for the one place that does connect: the project's own Dashboard (Task 6).

---

### Task 6: Color the Dashboard's SPI number

**Files:**
- Modify: `src/components/dashboard/DashboardActivitiesBlock.tsx`
- Modify: `src/styles/_dashboard.scss`

- [ ] **Step 1: Update the component**

Replace the full contents of `src/components/dashboard/DashboardActivitiesBlock.tsx` with:

```tsx
import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { getSpiVariantWithThresholds } from "../../utils/projectIndicators";
import type { ActivityStats } from "../../types/activity";

interface DashboardActivitiesBlockProps {
  stats: ActivityStats;
  spi: number | null;
}

function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// Mesma convenção g/y/r de StatCard.tsx (bad->r, warn->y, good->g).
const SPI_VARIANT_TONE = { good: "g", warn: "y", bad: "r" } as const;

export default function DashboardActivitiesBlock({ stats, spi }: DashboardActivitiesBlockProps) {
  const { config } = useProjectConfig();
  const spiVariant = getSpiVariantWithThresholds(spi, config);
  const spiToneClass = spiVariant === null ? "" : ` ${SPI_VARIANT_TONE[spiVariant]}`;

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
          <div className={`spi-big${spiToneClass}`}>{spi === null ? "—" : spi.toFixed(2)}</div>
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

- [ ] **Step 2: Add the tone classes**

In `src/styles/_dashboard.scss`, find the existing `.spi-big` rule:

```scss
.spi-big {
  font-family: c.$font-mono;
  font-size: 54px;
  font-weight: 800;
  line-height: 1;
  color: c.$yellow-deep;
}
```

Add immediately after it:

```scss
.spi-big.g {
  color: c.$green;
}
.spi-big.y {
  color: c.$yellow-deep;
}
.spi-big.r {
  color: c.$red;
}
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardActivitiesBlock.tsx src/styles/_dashboard.scss
git commit -m "feat: color the Dashboard SPI number by configured thresholds"
```

## Context

This is Task 6 of 18, the last task of the "shared thresholds" half of this plan (Tasks 1–6). `DashboardActivitiesBlock` reads `useProjectConfig()` directly — no project-mode lookup needed here, unlike aging, because SPI thresholds aren't split by UAT/Cutover in the spec. `.spi-big` currently has no tone at all (always the fixed yellow-deep) — this is new behavior, not a bug fix. `.spi-big.y` is included even though it matches the existing base color, for the same explicit-trio reason `.stat-value.g/.y/.r` all exist in `_stat-grid.scss` rather than relying on an implicit default.

---

### Task 7: Extract `useGraphUserSearch`, refactor `NewProjectModal`

**Files:**
- Create: `src/hooks/useGraphUserSearch.ts`
- Modify: `src/components/projects/NewProjectModal.tsx`

- [ ] **Step 1: Create the hook**

`src/hooks/useGraphUserSearch.ts`:

```ts
import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import type { AccountInfo } from "@azure/msal-browser";
import { graphUserSearchRequest } from "../config/authConfig";

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

interface UseGraphUserSearchResult {
  userSearch: string;
  searchResults: GraphUser[];
  searchLoading: boolean;
  selectedUser: GraphUser | null;
  handleSearchChange: (query: string) => Promise<void>;
  handleSelectUser: (user: GraphUser) => void;
  reset: () => void;
}

// Extraído de NewProjectModal — a parte com mais risco real (chamada assíncrona, token
// MSAL, InteractionRequiredAuthError) desse fluxo, agora compartilhada com InviteUserModal
// em vez de duplicada. Cada consumidor mantém sua própria UI de dropdown/papel/lista.
export function useGraphUserSearch(): UseGraphUserSearchResult {
  const { instance, accounts } = useMsal();
  const [userSearch, setUserSearch] = useState("");
  const [searchResults, setSearchResults] = useState<GraphUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GraphUser | null>(null);

  async function handleSearchChange(query: string) {
    setUserSearch(query);
    setSelectedUser(null);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const account = accounts[0] as AccountInfo;
      const tokenResponse = await instance.acquireTokenSilent({
        ...graphUserSearchRequest,
        account,
      });

      const url = `https://graph.microsoft.com/v1.0/users?$search="displayName:${query}"&$select=id,displayName,mail,userPrincipalName&$top=8`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          ConsistencyLevel: "eventual",
        },
      });

      if (!response.ok) throw new Error(`Graph API retornou ${response.status}`);

      const data = await response.json();
      setSearchResults(data.value ?? []);
    } catch (err) {
      if (err instanceof Error && err.name === "InteractionRequiredAuthError") {
        instance.acquireTokenRedirect(graphUserSearchRequest);
        return;
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSelectUser(user: GraphUser) {
    setSelectedUser(user);
    setUserSearch(`${user.displayName} — ${user.mail ?? user.userPrincipalName}`);
    setSearchResults([]);
  }

  function reset() {
    setUserSearch("");
    setSearchResults([]);
    setSearchLoading(false);
    setSelectedUser(null);
  }

  return { userSearch, searchResults, searchLoading, selectedUser, handleSearchChange, handleSelectUser, reset };
}
```

- [ ] **Step 2: Refactor `NewProjectModal.tsx`**

Replace the full contents of `src/components/projects/NewProjectModal.tsx` with:

```tsx
import { useState } from "react";
import Modal from "../common/Modal";
import CloseIcon from "../common/CloseIcon";
import { getInitials } from "../../utils/initials";
import { useGraphUserSearch } from "../../hooks/useGraphUserSearch";
import type { NewProjectInput, ProjectMode, TeamMember, UserRole } from "../../types/project";

interface NewProjectModalProps {
  show: boolean;
  onHide: () => void;
  onCreate: (input: NewProjectInput) => void;
}

const ROLE_OPTIONS: UserRole[] = ["Gestor de Projetos", "Tester", "Desenvolvedor"];

const LEVEL_DEFAULTS: Record<ProjectMode, string[]> = {
  uat: ["Área", "Cenário"],
  cutover: ["Módulo"],
};

interface NewProjectFormState {
  name: string;
  description: string;
  mode: ProjectMode;
  levelNames: string[];
  members: TeamMember[];
  selectedRole: UserRole;
  errorMsg: string | null;
}

function createEmptyState(): NewProjectFormState {
  return {
    name: "",
    description: "",
    mode: "uat",
    levelNames: LEVEL_DEFAULTS.uat,
    members: [],
    selectedRole: ROLE_OPTIONS[0],
    errorMsg: null,
  };
}

export default function NewProjectModal({ show, onHide, onCreate }: NewProjectModalProps) {
  const [state, setState] = useState<NewProjectFormState>(createEmptyState);
  const search = useGraphUserSearch();

  function resetAndHide() {
    setState(createEmptyState());
    search.reset();
    onHide();
  }

  function handleModeChange(mode: ProjectMode) {
    setState((prev) => ({ ...prev, mode, levelNames: LEVEL_DEFAULTS[mode] }));
  }

  function handleLevelNameChange(index: number, value: string) {
    setState((prev) => {
      const levelNames = [...prev.levelNames];
      levelNames[index] = value;
      return { ...prev, levelNames };
    });
  }

  function handleAddUser() {
    const { selectedUser } = search;
    const { selectedRole, members } = state;
    if (!selectedUser) return;

    const alreadyAdded = members.some(
      (member) => member.id === selectedUser.id && member.role === selectedRole
    );
    if (alreadyAdded) {
      setState((prev) => ({
        ...prev,
        errorMsg: `${selectedUser.displayName} já está no projeto com o papel de ${selectedRole}.`,
      }));
      return;
    }

    const newMember: TeamMember = {
      id: selectedUser.id,
      initials: getInitials(selectedUser.displayName),
      name: selectedUser.displayName,
      email: selectedUser.mail ?? selectedUser.userPrincipalName,
      role: selectedRole,
    };

    setState((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
      errorMsg: null,
    }));
    search.reset();
  }

  function handleRemoveUser(index: number) {
    setState((prev) => ({
      ...prev,
      members: prev.members.filter((_, i) => i !== index),
    }));
  }

  function handleConfirm() {
    onCreate({
      name: state.name,
      description: state.description,
      mode: state.mode,
      hierarchyLevels: state.levelNames.map((level, index) => level.trim() || `Nível ${index + 1}`),
      team: state.members,
    });
    resetAndHide();
  }

  const canConfirm = state.name.trim().length > 0;
  const showUserDropdown = search.userSearch.trim().length >= 2 && !search.selectedUser;

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="new-project-modal-title">
      <div className="modal-title" id="new-project-modal-title">
        Novo projeto
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="npName">
          Nome do projeto
        </label>
        <input
          className="form-input"
          id="npName"
          type="text"
          placeholder="Ex.: CRM Homologação Comercial"
          value={state.name}
          onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="npDescription">
          Descrição <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="npDescription"
          rows={2}
          placeholder="Contexto do projeto, escopo, sistemas envolvidos…"
          value={state.description}
          onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
        />
      </div>

      <div className="form-group">
        <span className="form-label">Modo</span>
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-opt${state.mode === "uat" ? " sel uat" : ""}`}
            aria-pressed={state.mode === "uat"}
            onClick={() => handleModeChange("uat")}
          >
            UAT
          </button>
          <button
            type="button"
            className={`mode-opt${state.mode === "cutover" ? " sel cutover" : ""}`}
            aria-pressed={state.mode === "cutover"}
            onClick={() => handleModeChange("cutover")}
          >
            Cutover
          </button>
        </div>
        <div className="form-hint">O modo não pode ser alterado após a criação do projeto.</div>
      </div>

      <div className="form-group">
        <span className="form-label" id="npLevelsLabel">
          Nomes dos níveis hierárquicos
        </span>
        {state.levelNames.map((levelName, index) => (
          <div className="level-row" key={index}>
            <span className="level-badge">{index + 1}</span>
            <input
              className="form-input"
              type="text"
              id={`npLevel-${index}`}
              aria-label={`Nível ${index + 1}`}
              value={levelName}
              onChange={(event) => handleLevelNameChange(index, event.target.value)}
            />
          </div>
        ))}
        <div className="level-row">
          <span className="level-badge">{state.levelNames.length + 1}</span>
          <span className="mono">Atividade (fixo)</span>
        </div>
      </div>

      <div className="form-group">
        <span className="form-label">Usuários do projeto</span>

        {state.errorMsg && <div className="error-banner">{state.errorMsg}</div>}

        <div className="user-add-row">
          <div className="user-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="form-input"
              type="text"
              id="npUserSearchInput"
              aria-label="Pesquisar usuário"
              placeholder="Pesquisar usuário no tenant FUMEP…"
              autoComplete="off"
              value={search.userSearch}
              onChange={(event) => search.handleSearchChange(event.target.value)}
            />
            {showUserDropdown && (
              <div className="user-dropdown">
                {search.searchLoading && (
                  <div className="user-dropdown-loading">Buscando…</div>
                )}
                {!search.searchLoading && search.searchResults.length === 0 && (
                  <div className="user-dropdown-empty">Nenhum usuário encontrado.</div>
                )}
                {!search.searchLoading &&
                  search.searchResults.map((user) => (
                    <button
                      type="button"
                      key={user.id}
                      className="user-dropdown-item"
                      onClick={() => search.handleSelectUser(user)}
                    >
                      <span className="team-member-av">{getInitials(user.displayName)}</span>
                      <span className="user-dropdown-item-text">
                        <span className="user-dropdown-item-name">{user.displayName}</span>
                        <span className="user-dropdown-item-email">
                          {user.mail ?? user.userPrincipalName}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
          <select
            className="form-input role-select"
            id="npUserRole"
            aria-label="Papel do usuário"
            value={state.selectedRole}
            onChange={(event) => setState((prev) => ({ ...prev, selectedRole: event.target.value as UserRole }))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-add-user"
            disabled={!search.selectedUser}
            aria-label="Adicionar usuário"
            onClick={handleAddUser}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        <div className="user-list">
          {state.members.length === 0 ? (
            <div className="user-list-empty">Nenhum usuário adicionado ainda.</div>
          ) : (
            state.members.map((member, index) => (
              <div className="user-list-row" key={`${member.id ?? member.initials}-${member.role}`}>
                <span className="team-member-av">{member.initials}</span>
                <div className="team-member-info">
                  <b>{member.name}</b>
                  <span>{member.email ?? member.role}</span>
                  {member.email && <span className="team-member-role">{member.role}</span>}
                </div>
                <button
                  type="button"
                  className="btn-remove-user"
                  aria-label={`Remover ${member.name}`}
                  onClick={() => handleRemoveUser(index)}
                >
                  <CloseIcon />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="form-hint">
          Um usuário pode ter mais de um papel: adicione-o novamente com outro papel, se necessário.
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={!canConfirm} onClick={handleConfirm}>
          Criar projeto
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGraphUserSearch.ts src/components/projects/NewProjectModal.tsx
git commit -m "refactor: extract useGraphUserSearch out of NewProjectModal"
```

## Context

This is Task 7 of 18 — a pure refactor, byte-for-byte behavior preserved. `NewProjectFormState` drops `userSearch`/`searchResults`/`searchLoading`/`selectedUser` (now owned by the hook); `handleSearchChange`/`handleSelectUser` are gone (now `search.handleSearchChange`/`search.handleSelectUser`); every JSX reference to those fields is now prefixed `search.`. One small, deliberate behavior change: the original inline `handleSearchChange` also cleared `errorMsg` on every keystroke — the extracted hook doesn't know about any consumer's error state, so that auto-clear is dropped. `errorMsg` still gets cleared on a successful add and overwritten on the next duplicate, so this is a minor UX nicety loss (a stale duplicate-error banner lingers one keystroke longer than before), not a functional regression — not worth threading a callback through the hook for. `useMsal`/`AccountInfo`/`graphUserSearchRequest` imports are removed from `NewProjectModal.tsx` since nothing in the file uses them directly anymore (the hook owns that dependency now).

---

### Task 8: `useProjects` team mutators

**Files:**
- Modify: `src/hooks/useProjects.ts`

- [ ] **Step 1: Add the mutators**

In `src/hooks/useProjects.ts`, change the return type interface:

```ts
interface UseProjectsResult {
  projects: Project[];
  stats: ProjectStats;
  createProject: (input: NewProjectInput) => void;
}
```

to:

```ts
interface UseProjectsResult {
  projects: Project[];
  stats: ProjectStats;
  createProject: (input: NewProjectInput) => void;
  addTeamMember: (projectId: string, member: TeamMember) => void;
  replaceTeamMemberRoles: (projectId: string, memberName: string, roles: UserRole[]) => void;
}
```

Update the import line at the top of the file:

```ts
import type { NewProjectInput, Project, ProjectStats } from "../types/project";
```

to:

```ts
import type { NewProjectInput, Project, ProjectStats, TeamMember, UserRole } from "../types/project";
import { getInitials } from "../utils/initials";
```

Add the two new functions right after `createProject` (before the `return` statement):

```ts
  // Append direto, sem validação própria — mesma simplicidade de createProject. A
  // checagem de duplicidade vive na camada de UI (InviteUserModal), que já tem o
  // project.team completo para comparar contra.
  function addTeamMember(projectId: string, member: TeamMember): void {
    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? { ...project, team: [...project.team, member] } : project))
    );
  }

  // Remove todas as entradas TeamMember daquele nome no projeto e recria uma por papel
  // em `roles` — é a mesma operação que "readicionar com outro papel" já faz em
  // NewProjectModal, só que em lote/via edição. Reaproveita initials/email da entrada
  // existente; se por algum motivo não houver nenhuma entrada prévia com esse nome,
  // deriva initials via getInitials.
  function replaceTeamMemberRoles(projectId: string, memberName: string, roles: UserRole[]): void {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;
        const existing = project.team.find((member) => member.name === memberName);
        const withoutMember = project.team.filter((member) => member.name !== memberName);
        const newEntries: TeamMember[] = roles.map((role) => ({
          id: existing?.id,
          initials: existing?.initials ?? getInitials(memberName),
          name: memberName,
          email: existing?.email,
          role,
        }));
        return { ...project, team: [...withoutMember, ...newEntries] };
      })
    );
  }
```

Update the final `return` statement:

```ts
  return { projects, stats, createProject };
```

to:

```ts
  return { projects, stats, createProject, addTeamMember, replaceTeamMemberRoles };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProjects.ts
git commit -m "feat: add addTeamMember and replaceTeamMemberRoles to useProjects"
```

## Context

This is Task 8 of 18. Both mutators follow the exact `setProjects((prev) => prev.map(...))` shape `createProject` (well, `createProject` prepends rather than maps, but the immutable-update style matches) already establishes for this hook — no new state-update pattern introduced. Like every other mutation in this app, this is ephemeral to the `useProjects()` call site's mount lifetime (not persisted across navigation away and back) — same limitation `createProject` already has today (creating a project via `NewProjectModal`, then leaving `/projetos` and coming back, already loses it). Not a regression this task introduces, and out of scope to fix — matches the project's established "mock data, no real backend" posture.

---

### Task 9: `groupTeamMembersByName`

**Files:**
- Create: `src/utils/teamMembers.ts`

- [ ] **Step 1: Create the util**

```ts
import type { TeamMember, UserRole } from "../types/project";

export interface GroupedTeamMember {
  name: string;
  initials: string;
  email?: string;
  roles: UserRole[];
}

// TeamMember já modela "múltiplos papéis" como múltiplas entradas com o mesmo name
// (mesma convenção que NewProjectModal usa ao permitir "adicionar de novo com outro
// papel") — esta função agrupa essas entradas de volta numa linha por pessoa, pra exibir
// como múltiplos badges na mesma linha da tabela (mesmo visual do mockup).
export function groupTeamMembersByName(team: TeamMember[]): GroupedTeamMember[] {
  const groups = new Map<string, GroupedTeamMember>();

  for (const member of team) {
    const existing = groups.get(member.name);
    if (existing) {
      if (!existing.roles.includes(member.role)) {
        existing.roles.push(member.role);
      }
      continue;
    }
    groups.set(member.name, {
      name: member.name,
      initials: member.initials,
      email: member.email,
      roles: [member.role],
    });
  }

  return Array.from(groups.values());
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/teamMembers.ts
git commit -m "feat: add groupTeamMembersByName util"
```

## Context

This is Task 9 of 18. Pure function, no React — same tier as `issueIndicators.ts`/`activityIndicators.ts`. `Map` preserves insertion order, so the first time a name is seen determines its row position, matching the order `project.team` already has. Not wired into anything yet — Task 12 (`ConfigUsersTable`) is the consumer.

---

### Task 10: `InviteUserModal`

**Files:**
- Create: `src/components/config/InviteUserModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import Modal from "../common/Modal";
import { useGraphUserSearch } from "../../hooks/useGraphUserSearch";
import { getInitials } from "../../utils/initials";
import type { TeamMember, UserRole } from "../../types/project";

interface InviteUserModalProps {
  show: boolean;
  onHide: () => void;
  currentTeam: TeamMember[];
  onInvite: (member: TeamMember) => void;
}

const ROLE_OPTIONS: UserRole[] = ["Gestor de Projetos", "Tester", "Desenvolvedor"];

export default function InviteUserModal({ show, onHide, currentTeam, onInvite }: InviteUserModalProps) {
  const search = useGraphUserSearch();
  const [selectedRole, setSelectedRole] = useState<UserRole>(ROLE_OPTIONS[0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function resetAndHide() {
    search.reset();
    setSelectedRole(ROLE_OPTIONS[0]);
    setErrorMsg(null);
    onHide();
  }

  function handleAdd() {
    const { selectedUser } = search;
    if (!selectedUser) return;

    // Comparação por name, não id — membros vindos do seed de useProjects.ts não têm id,
    // então comparar por id deixaria passar um convite duplicado do Graph para alguém
    // que já está no time via seed.
    const alreadyAdded = currentTeam.some(
      (member) => member.name === selectedUser.displayName && member.role === selectedRole
    );
    if (alreadyAdded) {
      setErrorMsg(`${selectedUser.displayName} já está no projeto com o papel de ${selectedRole}.`);
      return;
    }

    const member: TeamMember = {
      id: selectedUser.id,
      initials: getInitials(selectedUser.displayName),
      name: selectedUser.displayName,
      email: selectedUser.mail ?? selectedUser.userPrincipalName,
      role: selectedRole,
    };

    onInvite(member);
    resetAndHide();
  }

  const showUserDropdown = search.userSearch.trim().length >= 2 && !search.selectedUser;

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="invite-user-modal-title">
      <div className="modal-title" id="invite-user-modal-title">
        Convidar usuário
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="cfgUserSearchInput">
          Usuário
        </label>
        <div className="user-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            className="form-input"
            type="text"
            id="cfgUserSearchInput"
            aria-label="Pesquisar usuário"
            placeholder="Pesquisar usuário no tenant FUMEP…"
            autoComplete="off"
            value={search.userSearch}
            onChange={(event) => search.handleSearchChange(event.target.value)}
          />
          {showUserDropdown && (
            <div className="user-dropdown">
              {search.searchLoading && <div className="user-dropdown-loading">Buscando…</div>}
              {!search.searchLoading && search.searchResults.length === 0 && (
                <div className="user-dropdown-empty">Nenhum usuário encontrado.</div>
              )}
              {!search.searchLoading &&
                search.searchResults.map((user) => (
                  <button
                    type="button"
                    key={user.id}
                    className="user-dropdown-item"
                    onClick={() => search.handleSelectUser(user)}
                  >
                    <span className="team-member-av">{getInitials(user.displayName)}</span>
                    <span className="user-dropdown-item-text">
                      <span className="user-dropdown-item-name">{user.displayName}</span>
                      <span className="user-dropdown-item-email">{user.mail ?? user.userPrincipalName}</span>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="cfgUserRoleSelect">
          Papel
        </label>
        <select
          className="form-input"
          id="cfgUserRoleSelect"
          aria-label="Papel do usuário"
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value as UserRole)}
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={!search.selectedUser} onClick={handleAdd}>
          Convidar
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/config/InviteUserModal.tsx
git commit -m "feat: add InviteUserModal component"
```

## Context

This is Task 10 of 18. Reuses `useGraphUserSearch` (Task 7) instead of duplicating the Graph call — the entire reason that hook was extracted. Structurally a smaller sibling of `NewProjectModal`: same search+role+add shape, but no local running list (the "list" is `project.team` itself, rendered by `ConfigUsersTable` in Task 12, which re-renders as soon as `useProjects`'s state updates) and no multi-step form (name/description/mode/levels) since this only ever adds one member to an already-existing project. `.form-group`/`.form-label`/`.form-input`/`.user-search-wrap`/`.user-dropdown*`/`.error-banner`/`.modal-actions` all already exist in `_modal.scss` (built for `NewProjectModal`) — zero new CSS needed for this component.

---

### Task 11: `EditUserRolesModal`

**Files:**
- Create: `src/components/config/EditUserRolesModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import Modal from "../common/Modal";
import type { UserRole } from "../../types/project";
import type { GroupedTeamMember } from "../../utils/teamMembers";

interface EditUserRolesModalProps {
  show: boolean;
  onHide: () => void;
  member: GroupedTeamMember;
  onSave: (roles: UserRole[]) => void;
}

const ROLE_OPTIONS: UserRole[] = ["Gestor de Projetos", "Tester", "Desenvolvedor"];

export default function EditUserRolesModal({ show, onHide, member, onSave }: EditUserRolesModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(member.roles);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function toggleRole(role: UserRole) {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
    setErrorMsg(null);
  }

  function handleSave() {
    if (selectedRoles.length === 0) {
      setErrorMsg("Selecione ao menos um papel.");
      return;
    }
    onSave(selectedRoles);
    onHide();
  }

  return (
    <Modal open={show} onClose={onHide} labelledBy="edit-user-roles-modal-title">
      <div className="modal-title" id="edit-user-roles-modal-title">
        Editar papéis <span className="modal-title-sub">{member.name}</span>
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <span className="form-label">Papéis *</span>
        <div className="role-checkbox-row">
          {ROLE_OPTIONS.map((role) => (
            <label key={role} className="role-checkbox">
              <input type="checkbox" checked={selectedRoles.includes(role)} onChange={() => toggleRole(role)} />
              {role}
            </label>
          ))}
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Salvar
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/config/EditUserRolesModal.tsx
git commit -m "feat: add EditUserRolesModal component"
```

## Context

This is Task 11 of 18. `member: GroupedTeamMember` (not `TeamMember`) — this modal edits *all* of one person's roles at once, which is exactly what the grouped shape (Task 9) represents. `selectedRoles` is seeded from `member.roles` via `useState`'s initializer, which only runs once per component instance — this is why Task 12 conditionally mounts this modal (only rendering it when there's an active `editingMember`) rather than keeping one always-mounted instance with a changing `member` prop, which would show stale roles from whichever member was edited first. Validation (at least one role) mirrors the mockup's own `if(!papeis.length)` check on `editarPapeisSubmitBtn`. `.role-checkbox-row`/`.role-checkbox`/`.modal-title-sub` are new classes, added in Task 17 — this component compiles and is functionally complete before that lands, just unstyled until then (same "styles land in the dedicated CSS task" pattern every previous plan in this project has used).

---

### Task 12: `ConfigUsersTable`

**Files:**
- Create: `src/components/config/ConfigUsersTable.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { useProjects } from "../../hooks/useProjects";
import { groupTeamMembersByName, type GroupedTeamMember } from "../../utils/teamMembers";
import InviteUserModal from "./InviteUserModal";
import EditUserRolesModal from "./EditUserRolesModal";
import type { UserRole } from "../../types/project";

interface ConfigUsersTableProps {
  projectId: string;
}

// Mesma convenção de cor do mockup: Gestor usa a cor "execução" (azul), Tester e Dev
// usam a cor "liberado" (verde) — só Gestor se diferencia visualmente.
const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  "Gestor de Projetos": "activity-badge-execucao",
  Tester: "activity-badge-liberado",
  Desenvolvedor: "activity-badge-liberado",
};

export default function ConfigUsersTable({ projectId }: ConfigUsersTableProps) {
  const { projects, addTeamMember, replaceTeamMemberRoles } = useProjects();
  const project = projects.find((item) => item.id === projectId);
  const [showInvite, setShowInvite] = useState(false);
  const [editingMember, setEditingMember] = useState<GroupedTeamMember | null>(null);

  if (!project) return null;

  const groupedMembers = groupTeamMembersByName(project.team);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowInvite(true)}>
          + Convidar usuário
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Papéis</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {groupedMembers.map((member) => (
              <tr key={member.name}>
                <td>
                  <span className="avatar-mini">{member.initials}</span>
                  {member.name}
                </td>
                <td className="papeis-cell">
                  {member.roles.map((role) => (
                    <span key={role} className={`activity-badge ${ROLE_BADGE_CLASS[role]}`}>
                      <span className="activity-badge-dot" />
                      {role}
                    </span>
                  ))}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="attach-dl"
                    title="Editar papéis"
                    onClick={() => setEditingMember(member)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <InviteUserModal
        show={showInvite}
        onHide={() => setShowInvite(false)}
        currentTeam={project.team}
        onInvite={(member) => addTeamMember(projectId, member)}
      />

      {editingMember && (
        <EditUserRolesModal
          show
          onHide={() => setEditingMember(null)}
          member={editingMember}
          onSave={(roles) => replaceTeamMemberRoles(projectId, editingMember.name, roles)}
        />
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
git add src/components/config/ConfigUsersTable.tsx
git commit -m "feat: add ConfigUsersTable component"
```

## Context

This is Task 12 of 18, the last of the "real Usuários functionality" group (Tasks 7–12). `useProjects()` here is its own independent call — a separate state instance from whichever one `ProjectNavDock` holds (mounted once at `ProjectLayout` level) — so an invite/edit here is visible immediately within this table (same instance drives both the mutation and the render) but, like every mock mutation in this app, doesn't survive navigating away from `/config` and back. `{editingMember && <EditUserRolesModal .../>}` conditionally mounts the modal (rather than always rendering it with a `show` boolean) specifically so a fresh `useState(member.roles)` initializer runs every time a *different* row's pencil icon is clicked — see Task 11's context for why an always-mounted instance would leak stale state between different people's edits. `.attach-dl` (the edit-pencil button) and `.avatar-mini` are pre-existing classes reused as-is (no new CSS for those two). `.papeis-cell` is new — added in Task 17.

---

### Task 13: `ConfigPermissionMatrix`

**Files:**
- Create: `src/components/config/ConfigPermissionMatrix.tsx`

- [ ] **Step 1: Create the component**

```tsx
interface PermissionRow {
  action: string;
  gestor: boolean;
  tester: boolean;
  dev: boolean;
}

const PERMISSION_ROWS: PermissionRow[] = [
  { action: "Criar / editar atividades", gestor: true, tester: false, dev: false },
  { action: "Importar atividades em massa", gestor: true, tester: false, dev: false },
  { action: "Aprovar atividade", gestor: true, tester: true, dev: false },
  { action: "Cancelar atividade", gestor: true, tester: false, dev: false },
  { action: "Registrar issue", gestor: true, tester: true, dev: true },
  { action: "Iniciar análise da issue", gestor: true, tester: false, dev: true },
  { action: "Propor solução da issue", gestor: true, tester: false, dev: true },
  { action: "Exportar dados (atividades/issues)", gestor: true, tester: true, dev: true },
  { action: "Editar limiares e alertas", gestor: true, tester: false, dev: false },
  { action: "Convidar usuário", gestor: true, tester: false, dev: false },
];

export default function ConfigPermissionMatrix() {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Matriz de Permissões por Papel</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Referência para quando a diferenciação por papel for reativada. Hoje todas as ações estão disponíveis a
        qualquer papel — esta matriz não é aplicada de verdade ainda.
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ação</th>
              <th style={{ textAlign: "center" }}>Gestor</th>
              <th style={{ textAlign: "center" }}>Tester</th>
              <th style={{ textAlign: "center" }}>Dev</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={row.gestor} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={row.tester} />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input type="checkbox" defaultChecked={row.dev} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
        Salvar matriz
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/config/ConfigPermissionMatrix.tsx
git commit -m "feat: add ConfigPermissionMatrix component"
```

## Context

This is Task 13 of 18, standalone and fully decorative — matches the mockup's own explicit framing ("esta matriz não é aplicada de verdade ainda"). Checkboxes are **uncontrolled** (`defaultChecked`, no `useState`, no `onChange`) — the browser manages each input's own toggle state internally, so they're genuinely clickable without any React wiring, but nothing reads or persists the result. "Salvar matriz" has no `onClick` — decorative, same convention as every other unbuilt-feature button in this project. `.panel`/`.panel-head`/`.panel-title`/`.page-desc`/`.table-wrap`/`.btn*` are all pre-existing classes — zero new CSS for this component.

---

### Task 14: `ConfigThresholdsPanel`

**Files:**
- Create: `src/components/config/ConfigThresholdsPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from "react";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import type { AgingThresholds, ProjectConfig } from "../../types/projectConfig";

type AgingMode = "uat" | "cutover";

export default function ConfigThresholdsPanel() {
  const { config, setConfig } = useProjectConfig();
  const [draft, setDraft] = useState<ProjectConfig>(config);
  const [agingMode, setAgingMode] = useState<AgingMode>("uat");
  const [autoTransition, setAutoTransition] = useState(false);
  const [saved, setSaved] = useState(false);

  const agingKey: keyof Pick<ProjectConfig, "agingUat" | "agingCutover"> =
    agingMode === "uat" ? "agingUat" : "agingCutover";
  const editingAging = draft[agingKey];

  function updateDraft(partial: Partial<ProjectConfig>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSaved(false);
  }

  // Não usa uma chave computada (`{ [agingKey]: ... }`) para escrever — TypeScript não
  // consegue estreitar o tipo do objeto resultante para Partial<ProjectConfig> nesse caso
  // (só a leitura via chave computada, draft[agingKey] acima, é segura). Um if/else com
  // chaves literais em cada ramo evita o problema.
  function updateAging(partial: Partial<AgingThresholds>) {
    if (agingMode === "uat") {
      updateDraft({ agingUat: { ...draft.agingUat, ...partial } });
    } else {
      updateDraft({ agingCutover: { ...draft.agingCutover, ...partial } });
    }
  }

  function handleSave() {
    setConfig(draft);
    setSaved(true);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Limiares e Alertas</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Definem a partir de quando o SPI e as issues em aberto passam a ser sinalizados visualmente como risco.
        Editável pelo Gestor de Projetos.
      </div>

      <div className="subhead">SPI do projeto</div>
      <div className="field-row" style={{ marginBottom: 16 }}>
        <div className="field">
          <div className="field-label">SPI saudável a partir de</div>
          <div className="field-value">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={draft.spiSaudavel}
              onChange={(event) => updateDraft({ spiSaudavel: Number(event.target.value) })}
            />{" "}
            (verde)
          </div>
        </div>
        <div className="field">
          <div className="field-label">SPI crítico abaixo de</div>
          <div className="field-value">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={draft.spiCritico}
              onChange={(event) => updateDraft({ spiCritico: Number(event.target.value) })}
            />{" "}
            (vermelho)
          </div>
        </div>
      </div>

      <div className="subhead">Transições automáticas</div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11.5, fontWeight: 600 }}>Issue: Aberta → Em análise</span>
        <label className="toggle-pill">
          <span className="switch">
            <input
              type="checkbox"
              checked={autoTransition}
              onChange={(event) => setAutoTransition(event.target.checked)}
            />
            <span className="track" />
          </span>
          {autoTransition ? "Automática ao abrir a issue" : 'Manual — o Dev aciona "Iniciar análise"'}
        </label>
      </div>

      <div className="subhead">Aging de issues abertas</div>
      <div className="filters" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`filter-pill${agingMode === "uat" ? " active" : ""}`}
          onClick={() => setAgingMode("uat")}
        >
          UAT
        </button>
        <button
          type="button"
          className={`filter-pill${agingMode === "cutover" ? " active" : ""}`}
          onClick={() => setAgingMode("cutover")}
        >
          Cutover
        </button>
      </div>
      <div className="field-row" style={{ marginBottom: 10 }}>
        <div className="field">
          <div className="field-label">Em alerta a partir de</div>
          <div className="field-value">
            <input
              type="number"
              min="0"
              value={editingAging.alerta}
              onChange={(event) => updateAging({ alerta: Number(event.target.value) })}
            />{" "}
            dias
          </div>
        </div>
        <div className="field">
          <div className="field-label">Em risco a partir de</div>
          <div className="field-value">
            <input
              type="number"
              min="0"
              value={editingAging.risco}
              onChange={(event) => updateAging({ risco: Number(event.target.value) })}
            />{" "}
            dias
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "inherit", marginBottom: 14 }}>
        Editando limiares do modo {agingMode === "uat" ? "UAT" : "Cutover"}.
      </div>

      <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
        Salvar limiares
      </button>
      {saved && <span className="saved-msg">Limiares atualizados ✓</span>}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/config/ConfigThresholdsPanel.tsx
git commit -m "feat: add ConfigThresholdsPanel component"
```

## Context

This is Task 14 of 18 — the one component that actually writes to `useProjectConfig()`. `draft` is a local copy, seeded once from `config` at mount (`useState(config)`); edits only touch `draft` until "Salvar limiares" calls `setConfig(draft)`, matching the mockup's explicit save-button UX (SPI/aging fields don't live-affect the Dashboard/Issues screens on every keystroke, only on save). `agingMode` is a **local UI toggle**, independent of the current project's own `mode` — the Gestor can edit either mode's thresholds regardless of which project they're viewing, since `ProjectConfig` isn't per-project (Task 1). `saved` resets to `false` on any further edit (`updateDraft`/`updateAging` both clear it) so the "✓" message doesn't linger after the user starts changing something else again. "Transições automáticas" is fully local, decorative state (`autoTransition`, never read by anything outside this component) — per the spec, it doesn't control the Issue Detail screen's real "Iniciar análise" button. `.panel`/`.panel-head`/`.panel-title`/`.page-desc`/`.subhead`/`.field-row`/`.field`/`.field-value`/`.toggle-pill`/`.switch`/`.filters`/`.filter-pill`/`.btn*` are all pre-existing classes. `.saved-msg` is new — added in Task 17.

**Nota pós-implementação:** uma revisão de qualidade encontrou que a versão inicial deste componente não validava nada antes de `setConfig(draft)` — como `<input type="number">` não impede vazio/negativo ao digitar (`Number("")` vira `0`, não `NaN`), salvar um valor ruim recoloriria Dashboard/Issues de forma quebrada (ex.: limiar negativo faz toda issue aberta virar "em risco" instantaneamente). Corrigido com um `isValidConfig(draft)` que desabilita "Salvar limiares" (e mostra um `.error-banner`) enquanto os valores não fazem sentido (SPI fora de 0–1, crítico > saudável, risco < alerta). Também ganhou um prop `projectId` para pré-selecionar a sub-aba de aging (UAT/Cutover) que já bate com o modo real do projeto atual, em vez de sempre abrir em UAT — evita que o Gestor edite o modo errado sem perceber. Ver commit `b00b3b4`; a chamada em `ProjectConfigPage` (Task 16, ainda não implementada neste ponto) já foi corrigida acima para `<ConfigThresholdsPanel projectId={projectId} />`.

---

### Task 15: `ConfigAttachmentsPanel`

**Files:**
- Create: `src/components/config/ConfigAttachmentsPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
export default function ConfigAttachmentsPanel() {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Anexos e Evidências</div>
      </div>
      <div className="page-desc" style={{ marginBottom: 16 }}>
        Limite aplicado a evidências de aprovação de atividade, anexos de issue e evidências de solução.
      </div>

      <div className="subhead">Tamanho máximo por arquivo</div>
      <div className="field-value" style={{ width: "fit-content", marginBottom: 16 }}>
        <input type="number" min="1" defaultValue={10} /> MB
      </div>

      <div className="subhead">Evidência obrigatória</div>
      <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <label className="toggle-pill">
          <span className="switch">
            <input type="checkbox" defaultChecked />
            <span className="track" />
          </span>
          Exigir evidência ao aprovar/concluir atividade
        </label>
        <label className="toggle-pill">
          <span className="switch">
            <input type="checkbox" defaultChecked />
            <span className="track" />
          </span>
          Exigir evidência em issue impeditiva
        </label>
      </div>

      <button type="button" className="btn btn-primary btn-sm">
        Salvar limite
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/config/ConfigAttachmentsPanel.tsx
git commit -m "feat: add ConfigAttachmentsPanel component"
```

## Context

This is Task 15 of 18, fully decorative — matches the spec's "fora de escopo" for upload/evidência flows (none exist in any screen of the project yet). Inputs are uncontrolled (`defaultValue`/`defaultChecked`, no `useState`) — same reasoning as `ConfigPermissionMatrix` (Task 13): clickable/typeable without any React state backing it, since nothing needs to read the value. "Salvar limite" has no `onClick`. No new CSS.

---

### Task 16: `ProjectConfigPage` and route wiring

**Files:**
- Create: `src/pages/ProjectConfigPage.tsx`
- Modify: `src/routes/AppRoutes.tsx`

- [ ] **Step 1: Create the page**

`src/pages/ProjectConfigPage.tsx`:

```tsx
import { useState } from "react";
import { useParams } from "react-router";
import ConfigUsersTable from "../components/config/ConfigUsersTable";
import ConfigPermissionMatrix from "../components/config/ConfigPermissionMatrix";
import ConfigThresholdsPanel from "../components/config/ConfigThresholdsPanel";
import ConfigAttachmentsPanel from "../components/config/ConfigAttachmentsPanel";

type ConfigTab = "usuarios" | "limiares";

export default function ProjectConfigPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const [tab, setTab] = useState<ConfigTab>("usuarios");

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Papéis & Config</div>
          <div className="page-desc">Um usuário pode acumular múltiplos papéis simultaneamente no mesmo projeto</div>
        </div>
      </div>

      <div className="filters" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`filter-pill${tab === "usuarios" ? " active" : ""}`}
          onClick={() => setTab("usuarios")}
        >
          Usuários
        </button>
        <button
          type="button"
          className={`filter-pill${tab === "limiares" ? " active" : ""}`}
          onClick={() => setTab("limiares")}
        >
          Limiares e Regras
        </button>
      </div>

      {tab === "usuarios" ? (
        <div className="config-users-grid">
          <ConfigUsersTable projectId={projectId} />
          <ConfigPermissionMatrix />
        </div>
      ) : (
        <div className="config-limiares-grid">
          <ConfigThresholdsPanel projectId={projectId} />
          <ConfigAttachmentsPanel />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire the route**

In `src/routes/AppRoutes.tsx`, add the import:

```tsx
import ProjectActivitiesPage from "../pages/ProjectActivitiesPage";
import ActivityDetailPage from "../pages/ActivityDetailPage";
import ProjectIssuesPage from "../pages/ProjectIssuesPage";
import IssueDetailPage from "../pages/IssueDetailPage";
import PlaceholderPage from "../pages/PlaceholderPage";
import ProjectDashboardPage from "../pages/ProjectDashboardPage";
```

to:

```tsx
import ProjectActivitiesPage from "../pages/ProjectActivitiesPage";
import ActivityDetailPage from "../pages/ActivityDetailPage";
import ProjectIssuesPage from "../pages/ProjectIssuesPage";
import IssueDetailPage from "../pages/IssueDetailPage";
import PlaceholderPage from "../pages/PlaceholderPage";
import ProjectDashboardPage from "../pages/ProjectDashboardPage";
import ProjectConfigPage from "../pages/ProjectConfigPage";
```

Then change:

```tsx
          <Route path="config" element={<PlaceholderPage title="A configuração do projeto" />} />
```

to:

```tsx
          <Route path="config" element={<ProjectConfigPage />} />
```

No other change to this file — `dashboard`, `atividades`, `atividades/:activityId`, `estrutura`, `issues`, `issues/:issueId` routes stay exactly as they are.

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectConfigPage.tsx src/routes/AppRoutes.tsx
git commit -m "feat: add ProjectConfigPage and wire it into the config route"
```

## Context

This is Task 16 of 18. Composes every component built in Tasks 12–15. `tab` is local `useState`, same pill-toggle pattern already used for status filters elsewhere in the project (no generic `Tabs` component introduced — matches the project's stated preference against premature abstraction). `.config-users-grid`/`.config-limiares-grid` are new classes (2-column grids, mirroring `.config-usuarios-permissoes-grid`/`.config-limiares-grid` from the mockup) — added in Task 17, this page compiles and is functionally complete before that lands, just unstyled (stacked, not side-by-side) until then.

---

### Task 17: `_config.scss`

**Files:**
- Create: `src/styles/_config.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the partial**

`src/styles/_config.scss`:

```scss
@use "colors" as c;

// Aba "Usuários": tabela à esquerda, matriz de permissões à direita
.config-users-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;
  align-items: start;
}

// Aba "Limiares e Regras": limiares à esquerda, anexos/evidências à direita
.config-limiares-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

// Badges de papel na tabela de usuários — várias por linha quando a pessoa acumula papéis
.papeis-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

// Checkboxes de papel no modal de editar papéis
.role-checkbox-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 4px 0;
}
.role-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

// Nome do usuário ao lado do título "Editar papéis"
.modal-title-sub {
  font-weight: 400;
  color: c.$text-faint;
  margin-left: 6px;
}

// Confirmação "Limiares atualizados ✓" ao lado do botão Salvar
.saved-msg {
  margin-left: 10px;
  font-size: 11.5px;
  color: c.$green;
}

@media (max-width: 900px) {
  .config-users-grid,
  .config-limiares-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 2: Wire it into main.scss**

In `src/styles/main.scss`, add `@use "config";` after `@use "activity-detail";`:

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
@use "config";
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no Sass errors.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_config.scss src/styles/main.scss
git commit -m "style: add Papéis & Config SCSS partial"
```

## Context

This is Task 17 of 18. Ported from the mockup's `#page-config` styles the same way every previous styling task in this project has: translating `var(--...)` to literal Sass variables from `_colors.scss` (this codebase has no CSS custom-property layer). `.config-users-grid`/`.config-limiares-grid` collapse to 1 column at 900px, same breakpoint `.activity-layout` already uses. Everything else this screen needs (`.panel`, `.field-row`/`.field-value`, `.filters`/`.filter-pill`, `.toggle-pill`/`.switch`, `.avatar-mini`, `.activity-badge*`, `.table-wrap`, `.form-group`/`.form-label`/`.form-input`/`.user-search-wrap`/`.user-dropdown*`/`.error-banner`/`.modal-actions`, `.attach-dl`) already exists and needs no changes.

---

### Task 18: Manual QA pass

- [ ] **Step 1: Start the dev server and open Papéis & Config**

Run: `npm run dev`

Navigate to `/projetos/crm-homologacao/config`. Confirm the placeholder is gone and the real screen renders with the "Usuários" tab active by default.

- [ ] **Step 2: Verify the Usuários tab**

Table lists `CRM Homologação Comercial`'s seed team (`Guilherme Fabretti` — Gestor de Projetos, `Rafael Souza` — Tester), each with one role badge. Click "+ Convidar usuário" — modal opens, type at least 2 characters in the search box, confirm a Graph search fires (check Network tab or console — it may fail/return empty without a real signed-in Graph-permitted session, that's fine, just confirm the request goes out and the loading/empty states render correctly) and select a result if one comes back, pick a role, click "Convidar" — new row appears in the table with the right badge. Click the pencil icon on an existing row (e.g. Guilherme Fabretti) — modal opens with "Gestor de Projetos" pre-checked; check "Tester" too, click "Salvar" — that row now shows both badges. Uncheck every role and try to save — inline error appears, modal doesn't close. Confirm the Matriz de Permissões panel renders all 10 rows with the right default-checked pattern per column, and its checkboxes/save button are clickable but inert.

- [ ] **Step 3: Verify the Limiares e Regras tab**

Click the "Limiares e Regras" pill. Confirm SPI saudável/crítico show `0.9`/`0.75`, aging (UAT tab active by default) shows `2`/`6`. Switch to the "Cutover" sub-tab — fields update to `3`/`8`. Switch back to "Iniciar análise" toggle and Anexos panel — confirm both are present and clickable but inert (no `onClick` effect beyond their own local toggle).

- [ ] **Step 4: Verify SPI threshold connects to the Dashboard**

Navigate to `/projetos/crm-homologacao/dashboard`. Note the SPI number's current color (project seed SPI is 0.79 — with defaults 0.90/0.75 that's "warn", so the number should render in `c.$yellow-deep`). Go back to Config → Limiares e Regras, change "SPI saudável a partir de" to `0.70`, click "Salvar limiares" (confirm "Limiares atualizados ✓" appears). Navigate back to the Dashboard — the SPI number should now render green (0.79 ≥ 0.70).

- [ ] **Step 5: Verify aging threshold connects to Issues**

Navigate to `/projetos/crm-homologacao/issues`. Note the "Em risco (aging)" KPI count and which rows show the red risk-colored Aging value. Go back to Config → Limiares e Regras (UAT tab), change "Em risco a partir de" to `1`, save. Navigate back to Issues — more rows should now show as "em risco" (lower threshold), and the KPI count should increase.

- [ ] **Step 6: Verify aging thresholds are mode-aware**

Navigate to `/projetos/erp-migration/issues` (a Cutover-mode project). Confirm the Aging column colors reflect the `agingCutover` thresholds (3/8 by default, or whatever was last saved in Config's Cutover sub-tab during this session — Config's state is global, not per-project, so this is expected), not the UAT ones.

- [ ] **Step 7: Verify `NewProjectModal` still works after the `useGraphUserSearch` refactor**

From `/projetos`, click "Novo projeto". Fill in a name, search for a user, add them with a role, confirm they appear in the local list with a remove button that works, then create the project — confirm it appears in the list with the right team.

- [ ] **Step 8: Verify responsiveness**

Resize the browser to ~800px wide on the Config screen (both tabs). Confirm `.config-users-grid`/`.config-limiares-grid` collapse from 2 columns to 1.

- [ ] **Step 9: Verify unrelated screens are unaffected**

Navigate through Dashboard, Atividades, Issues, Activity Detail, Issue Detail for `crm-homologacao` and confirm nothing else changed in look or behavior beyond what Steps 4–5 exercised on purpose. Navigate to `/projetos` (global list) and confirm SPI colors there are unchanged (still using the fixed `getSpiVariant` thresholds, not affected by anything saved in Config).

- [ ] **Step 10: Final commit (if any fixes were needed)**

If Steps 2–9 required any code changes, commit them:

```bash
git add -A
git commit -m "fix: address Papéis & Config QA findings"
```

If no changes were needed, skip this step — Task 17's commit is already the final state before QA.

## Context

This is Task 18 of 18, the last task in this plan. No code changes of its own — the same manual verification pass this project has used instead of automated tests since the first feature. Steps 4–6 are the crux checks for this plan's core new behavior (config actually affecting already-shipped screens) — they need a save-then-navigate-away-and-back cycle to prove the Context (not a plain hook) is doing its job, and Step 6 specifically proves the UAT/Cutover mode-branching in `useProjectAgingThresholds` works, not just the single-mode happy path every other step exercises. Step 7 is the regression check that Task 7's `NewProjectModal` refactor didn't change real project-creation behavior. Step 9's `/projetos` check is the regression check that Task 5's untouched `getSpiVariant` really stayed untouched.
