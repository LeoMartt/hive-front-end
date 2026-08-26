# Exportar (Atividades & Issues) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os 4 botões "Exportar" hoje decorativos (Atividades e Issues, nas páginas de lista e nos blocos do Dashboard) por exportação real em `.xlsx`.

**Architecture:** Duas utils puras (`activityExport.ts`/`issueExport.ts`) mapeiam `Activity[]`/`Issue[]` tipados para linhas de planilha reaproveitando os labels já existentes no projeto; uma util genérica (`downloadXlsx.ts`) gera e baixa o arquivo via `xlsx` (SheetJS); um hook pequeno (`useExportButton.ts`, mesma categoria de `useGoBack.ts`) dá feedback transitório no próprio texto do botão (sem toast novo). As páginas de lista exportam dado filtrado; os blocos do Dashboard exportam o projeto inteiro.

**Tech Stack:** React 19 + TypeScript, dependência nova `xlsx` (SheetJS). Sem suíte de testes automatizada neste projeto (decisão registrada em `CLAUDE.md`) — cada task fecha com `npx tsc -b` limpo em vez de testes; a verificação funcional final é QA manual via `npm run dev`.

---

### Task 1: Dependência `xlsx` + util de download

**Files:**
- Modify: `package.json`
- Create: `src/utils/downloadXlsx.ts`

- [ ] **Step 1: Instalar a dependência**

Run: `npm install xlsx@0.18.5`

Isso atualiza `package.json` (nova entrada em `dependencies`) e `package-lock.json` automaticamente. O pacote já publica seus próprios tipos TS — não é preciso instalar `@types/xlsx`.

- [ ] **Step 2: Criar a util de download**

Create `src/utils/downloadXlsx.ts`:

```ts
import * as XLSX from "xlsx";

export function downloadXlsx(
  rows: Record<string, string>[],
  columnWidths: number[],
  sheetName: string,
  filenamePrefix: string,
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = columnWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${stamp}.xlsx`);
}
```

`XLSX.writeFile` já cuida do download no navegador sozinho (cria e aciona um link temporário internamente) — nada de blob/anchor manual aqui.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/utils/downloadXlsx.ts
git commit -m "feat: add xlsx dependency and downloadXlsx util"
```

---

### Task 2: `activityExport.ts`

**Files:**
- Create: `src/utils/activityExport.ts`

- [ ] **Step 1: Criar a util**

Create `src/utils/activityExport.ts`:

```ts
import { ACTIVITY_STATUS_LABELS, formatActivityDate } from "./activityIndicators";
import type { Activity } from "../types/activity";

export const ACTIVITY_EXPORT_COLUMN_WIDTHS: number[] = [
  10, 34, 16, 22, 12, 12, 14, 14, 16, 12, 12, 16, 12, 14, 14, 14, 30, 30, 8,
];

export function buildActivityExportRows(activities: Activity[]): Record<string, string>[] {
  return activities.map((activity) => ({
    ID: activity.id,
    Nome: activity.name,
    Módulo: activity.module,
    Processo: activity.process,
    Status: ACTIVITY_STATUS_LABELS[activity.status],
    Tester: activity.tester,
    Desenvolvedor: activity.dev,
    "Início Planejado": formatActivityDate(activity.plannedStart),
    "Conclusão Planejada": formatActivityDate(activity.plannedEnd),
    "Início Real": formatActivityDate(activity.actualStart),
    "Conclusão Real": formatActivityDate(activity.actualEnd),
    Predecessores: activity.predecessors.length > 0 ? activity.predecessors.join(", ") : "—",
    WBS: activity.wbs,
    Área: activity.area,
    Sistema: activity.system,
    Transação: activity.transaction,
    "Resultado Esperado": activity.expectedResult,
    Observações: activity.notes ?? "—",
    Reteste: activity.retestCount > 0 ? `${activity.retestCount}×` : "—",
  }));
}
```

Os 19 nomes de coluna (chaves do objeto) viram o cabeçalho da planilha na ordem em que aparecem — `json_to_sheet` do SheetJS preserva a ordem de inserção das chaves.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/utils/activityExport.ts
git commit -m "feat: add buildActivityExportRows util"
```

---

### Task 3: `issueExport.ts`

**Files:**
- Create: `src/utils/issueExport.ts`

- [ ] **Step 1: Criar a util**

Create `src/utils/issueExport.ts`:

```ts
import { ISSUE_STATUS_LABELS, ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS, computeIssueAgingDays } from "./issueIndicators";
import type { Issue } from "../types/issue";

export const ISSUE_EXPORT_COLUMN_WIDTHS: number[] = [10, 40, 14, 16, 12, 14, 44, 14, 14, 18, 14, 44, 12, 12, 12];

function formatIssueDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

export function buildIssueExportRows(issues: Issue[]): Record<string, string>[] {
  return issues.map((issue) => ({
    ID: issue.id,
    Título: issue.title,
    Tipo: ISSUE_TYPE_LABELS[issue.type],
    "Categorização de Impacto": ISSUE_IMPACT_LABELS[issue.impact],
    Impeditivo: issue.impeditiva ? "Sim" : "Não",
    Área: issue.area,
    Descrição: issue.description,
    "Atividade vinculada": issue.relatedActivityId ?? "—",
    Tester: issue.tester,
    Desenvolvedor: issue.dev,
    Status: ISSUE_STATUS_LABELS[issue.status],
    "Solução proposta": issue.proposedSolution ?? "—",
    "Aberta em": formatIssueDate(issue.openedAt),
    "Concluída em": issue.resolvedAt ? formatIssueDate(issue.resolvedAt) : "—",
    "Aging (dias)": String(computeIssueAgingDays(issue)),
  }));
}
```

Sem colunas "Módulo"/"Processo" (decisão registrada na spec — `Issue` não guarda esses campos, e a tabela de Issues já shippada também não os exibe). `formatIssueDate` é local a este arquivo — mesmo padrão de pequena duplicação já usado entre `ActivityRow`/`IssueRow`, em vez de importar `formatActivityDate` de `activityIndicators.ts` por um nome que não faria sentido no domínio de Issue.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/utils/issueExport.ts
git commit -m "feat: add buildIssueExportRows util"
```

---

### Task 4: `useExportButton` hook

**Files:**
- Create: `src/hooks/useExportButton.ts`

- [ ] **Step 1: Criar o hook**

Create `src/hooks/useExportButton.ts`:

```ts
import { useState } from "react";

interface UseExportButtonResult {
  label: string;
  isDefault: boolean;
  handleClick: () => void;
}

export function useExportButton(
  defaultLabel: string,
  isEmpty: boolean,
  emptyLabel: string,
  runExport: () => void,
): UseExportButtonResult {
  const [label, setLabel] = useState(defaultLabel);

  function showTemporary(message: string, durationMs: number) {
    setLabel(message);
    setTimeout(() => setLabel(defaultLabel), durationMs);
  }

  function handleClick() {
    if (isEmpty) {
      showTemporary(emptyLabel, 1600);
      return;
    }
    try {
      runExport();
    } catch {
      showTemporary("Erro ao exportar — tente novamente", 2000);
    }
  }

  return { label, isDefault: label === defaultLabel, handleClick };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExportButton.ts
git commit -m "feat: add useExportButton hook"
```

---

### Task 5: Wire `ProjectActivitiesPage`

**Files:**
- Modify: `src/pages/ProjectActivitiesPage.tsx`

- [ ] **Step 1: Adicionar os imports**

In `src/pages/ProjectActivitiesPage.tsx`, replace the import block (lines 1-11):

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import NavIcon from "../components/common/NavIcon";
import { useActivities } from "../hooks/useActivities";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import type { ActivityFiltersState, ActivityGroupMode } from "../types/activity";
```

with:

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import NavIcon from "../components/common/NavIcon";
import { useActivities } from "../hooks/useActivities";
import { useExportButton } from "../hooks/useExportButton";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import { buildActivityExportRows, ACTIVITY_EXPORT_COLUMN_WIDTHS } from "../utils/activityExport";
import { downloadXlsx } from "../utils/downloadXlsx";
import type { ActivityFiltersState, ActivityGroupMode } from "../types/activity";
```

- [ ] **Step 2: Ligar o hook de exportação**

In the same file, right after the `filteredActivities` block (currently lines 54-57):

```ts
  const filteredActivities = useMemo(
    () => filterActivities(activities, filters, CURRENT_USER_NAME),
    [activities, filters]
  );
```

add:

```ts

  const {
    label: exportActivitiesLabel,
    isDefault: exportActivitiesIsDefault,
    handleClick: handleExportActivities,
  } = useExportButton(
    "Exportar atividades",
    filteredActivities.length === 0,
    "Nenhuma atividade no filtro atual",
    () =>
      downloadXlsx(
        buildActivityExportRows(filteredActivities),
        ACTIVITY_EXPORT_COLUMN_WIDTHS,
        "Atividades",
        "hive_atividades",
      ),
  );
```

- [ ] **Step 3: Ligar o botão**

In the same file, replace the export button (currently lines 133-139):

```tsx
          <button type="button" className="btn btn-outline-secondary btn-sm">
            <NavIcon>
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </NavIcon>
            Exportar atividades
          </button>
```

with:

```tsx
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportActivities}>
            {exportActivitiesIsDefault ? (
              <>
                <NavIcon>
                  <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                  <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </NavIcon>
                {exportActivitiesLabel}
              </>
            ) : (
              exportActivitiesLabel
            )}
          </button>
```

"Importar em massa" e "+ Nova atividade" continuam intocados — são outros ciclos.

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 5: QA manual**

Run: `npm run dev`, abrir `/projetos/:id/atividades`.
- Sem filtro nenhum: clicar "Exportar atividades" baixa `hive_atividades_2026-08-21.xlsx` com uma linha por atividade da lista e 19 colunas.
- Filtrar por um status que não existe no projeto atual (ou aplicar um filtro que zere a lista): o botão mostra "Nenhuma atividade no filtro atual" por ~1.6s, ícone some durante a mensagem, nenhum arquivo baixa, e o botão volta ao normal sozinho.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectActivitiesPage.tsx
git commit -m "feat: wire the Exportar atividades button"
```

---

### Task 6: Wire `ProjectIssuesPage`

**Files:**
- Modify: `src/pages/ProjectIssuesPage.tsx`

- [ ] **Step 1: Adicionar os imports**

In `src/pages/ProjectIssuesPage.tsx`, replace the import block (lines 1-8):

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import IssuesKpiCards from "../components/issues/IssuesKpiCards";
import IssueStatusPills, { type IssueStatusFilter } from "../components/issues/IssueStatusPills";
import IssuesTable from "../components/issues/IssuesTable";
import NavIcon from "../components/common/NavIcon";
import { useIssues } from "../hooks/useIssues";
import { sortIssuesByPriority } from "../utils/issueIndicators";
```

with:

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import IssuesKpiCards from "../components/issues/IssuesKpiCards";
import IssueStatusPills, { type IssueStatusFilter } from "../components/issues/IssueStatusPills";
import IssuesTable from "../components/issues/IssuesTable";
import NavIcon from "../components/common/NavIcon";
import { useIssues } from "../hooks/useIssues";
import { useExportButton } from "../hooks/useExportButton";
import { sortIssuesByPriority } from "../utils/issueIndicators";
import { buildIssueExportRows, ISSUE_EXPORT_COLUMN_WIDTHS } from "../utils/issueExport";
import { downloadXlsx } from "../utils/downloadXlsx";
```

- [ ] **Step 2: Ligar o hook de exportação**

In the same file, right after the `filteredIssues` block (currently lines 23-30):

```ts
  const filteredIssues = useMemo(() => {
    return orderedIssues.filter((issue) => {
      if (statusFilter !== "todas" && issue.status !== statusFilter) return false;
      if (openedByMe && issue.tester !== CURRENT_USER_NAME) return false;
      if (assignedToMe && issue.dev !== CURRENT_USER_NAME) return false;
      return true;
    });
  }, [orderedIssues, statusFilter, openedByMe, assignedToMe]);
```

add:

```ts

  const {
    label: exportIssuesLabel,
    isDefault: exportIssuesIsDefault,
    handleClick: handleExportIssues,
  } = useExportButton("Exportar issues", filteredIssues.length === 0, "Nenhuma issue no filtro atual", () =>
    downloadXlsx(buildIssueExportRows(filteredIssues), ISSUE_EXPORT_COLUMN_WIDTHS, "Issues", "hive_issues"),
  );
```

- [ ] **Step 3: Ligar o botão**

In the same file, replace the export button (currently lines 56-62):

```tsx
          <button type="button" className="btn btn-outline-secondary btn-sm">
            <NavIcon>
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </NavIcon>
            Exportar issues
          </button>
```

with:

```tsx
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportIssues}>
            {exportIssuesIsDefault ? (
              <>
                <NavIcon>
                  <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                  <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </NavIcon>
                {exportIssuesLabel}
              </>
            ) : (
              exportIssuesLabel
            )}
          </button>
```

"+ Registrar issue" continua intocado — outro ciclo.

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 5: QA manual**

Run: `npm run dev`, abrir `/projetos/:id/issues`.
- Sem filtro: "Exportar issues" baixa `hive_issues_2026-08-21.xlsx` com uma linha por issue visível e 15 colunas.
- Clicar num status-pill que zera a lista (ou usar os toggles "abertas por mim"/"comigo" se não houver nenhuma issue sua no seed): botão mostra "Nenhuma issue no filtro atual" por ~1.6s, sem baixar nada.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectIssuesPage.tsx
git commit -m "feat: wire the Exportar issues button"
```

---

### Task 7: Wire os blocos do Dashboard

**Files:**
- Modify: `src/components/dashboard/DashboardActivitiesBlock.tsx`
- Modify: `src/components/dashboard/DashboardIssuesBlock.tsx`
- Modify: `src/pages/ProjectDashboardPage.tsx`

- [ ] **Step 1: `DashboardActivitiesBlock` — prop nova + botão**

In `src/components/dashboard/DashboardActivitiesBlock.tsx`, replace the full file:

```tsx
import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { useExportButton } from "../../hooks/useExportButton";
import { getSpiVariantWithThresholds } from "../../utils/projectIndicators";
import { buildActivityExportRows, ACTIVITY_EXPORT_COLUMN_WIDTHS } from "../../utils/activityExport";
import { downloadXlsx } from "../../utils/downloadXlsx";
import type { Activity, ActivityStats } from "../../types/activity";

interface DashboardActivitiesBlockProps {
  activities: Activity[];
  stats: ActivityStats;
  spi: number | null;
}

function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// Mesma convenção g/y/r de StatCard.tsx (bad->r, warn->y, good->g).
const SPI_VARIANT_TONE = { good: "g", warn: "y", bad: "r" } as const;

export default function DashboardActivitiesBlock({ activities, stats, spi }: DashboardActivitiesBlockProps) {
  const { config } = useProjectConfig();
  const spiVariant = getSpiVariantWithThresholds(spi, config);
  const spiToneClass = spiVariant === null ? "" : ` ${SPI_VARIANT_TONE[spiVariant]}`;

  const {
    label: exportLabel,
    isDefault: exportIsDefault,
    handleClick: handleExport,
  } = useExportButton("Exportar atividades", activities.length === 0, "Nenhuma atividade no projeto", () =>
    downloadXlsx(buildActivityExportRows(activities), ACTIVITY_EXPORT_COLUMN_WIDTHS, "Atividades", "hive_atividades"),
  );

  return (
    <div className="metric-block">
      <div className="section-head">
        <div className="section-label">Atividades</div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExport}>
          {exportIsDefault ? (
            <>
              <NavIcon>
                <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </NavIcon>
              {exportLabel}
            </>
          ) : (
            exportLabel
          )}
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

- [ ] **Step 2: `DashboardIssuesBlock` — prop nova + botão**

In `src/components/dashboard/DashboardIssuesBlock.tsx`, replace the full file:

```tsx
import NavIcon from "../common/NavIcon";
import StatCard from "../common/StatCard";
import { useExportButton } from "../../hooks/useExportButton";
import { buildIssueExportRows, ISSUE_EXPORT_COLUMN_WIDTHS } from "../../utils/issueExport";
import { downloadXlsx } from "../../utils/downloadXlsx";
import type { Issue, IssueStats } from "../../types/issue";

interface DashboardIssuesBlockProps {
  issues: Issue[];
  stats: IssueStats;
}

export default function DashboardIssuesBlock({ issues, stats }: DashboardIssuesBlockProps) {
  const tempoMedioLabel =
    stats.tempoMedioResolucaoDias === null ? "—" : `${stats.tempoMedioResolucaoDias.toFixed(1).replace(".", ",")}d`;

  const {
    label: exportLabel,
    isDefault: exportIsDefault,
    handleClick: handleExport,
  } = useExportButton("Exportar issues", issues.length === 0, "Nenhuma issue no projeto", () =>
    downloadXlsx(buildIssueExportRows(issues), ISSUE_EXPORT_COLUMN_WIDTHS, "Issues", "hive_issues"),
  );

  return (
    <div className="metric-block issues">
      <div className="section-head">
        <div className="section-label">Issues</div>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExport}>
          {exportIsDefault ? (
            <>
              <NavIcon>
                <path d="M12 3v12m0 0-4-4m4 4 4-4" />
                <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </NavIcon>
              {exportLabel}
            </>
          ) : (
            exportLabel
          )}
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

- [ ] **Step 3: `ProjectDashboardPage` — repassar as listas completas**

In `src/pages/ProjectDashboardPage.tsx`, replace:

```ts
  const { activities, stats } = useActivities(projectId);
  const { stats: issueStats } = useIssues(projectId);
```

with:

```ts
  const { activities, stats } = useActivities(projectId);
  const { issues, stats: issueStats } = useIssues(projectId);
```

and replace:

```tsx
      <DashboardActivitiesBlock stats={stats} spi={spi} />
      <DashboardIssuesBlock stats={issueStats} />
```

with:

```tsx
      <DashboardActivitiesBlock activities={activities} stats={stats} spi={spi} />
      <DashboardIssuesBlock issues={issues} stats={issueStats} />
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 5: QA manual**

Run: `npm run dev`, abrir `/projetos/:id/dashboard`.
- Clicar "Exportar atividades" no bloco de Atividades: baixa `hive_atividades_2026-08-21.xlsx` com **todas** as atividades do projeto (comparar a contagem de linhas com o "Total" mostrado no card).
- Clicar "Exportar issues" no bloco de Issues: baixa `hive_issues_2026-08-21.xlsx` com todas as issues do projeto.
- Confirmar que os blocos continuam renderizando SPI/estatísticas normalmente (a prop nova não deve quebrar nada visualmente).

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardActivitiesBlock.tsx src/components/dashboard/DashboardIssuesBlock.tsx src/pages/ProjectDashboardPage.tsx
git commit -m "feat: wire the Dashboard's Exportar atividades/issues buttons"
```

---

### Task 8: Build final

**Files:** nenhum (task de verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros (roda `tsc -b && vite build`).

- [ ] **Step 2: QA manual final**

Run: `npm run preview`, repetir os 4 cliques de exportação (Atividades e Issues, lista e Dashboard) contra o build de produção, confirmando que os `.xlsx` baixados abrem corretamente num leitor de planilha e que as colunas de data aparecem no formato `dd/mm/aaaa`.

Nenhum commit nesta task — é só verificação do que as Tasks 1-7 já commitaram.
