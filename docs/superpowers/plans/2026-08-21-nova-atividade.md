# Nova Atividade (modal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o botão "+ Nova atividade" hoje decorativo (`ProjectActivitiesPage`) por um modal de criação real que adiciona a atividade ao `useActivities`.

**Architecture:** Um novo mutator `createActivity` em `useActivities.ts` (mesmo padrão de `useProjects.addTeamMember`) recebe um `NewActivityInput` já validado/normalizado pelo modal e faz o append no array de atividades — a tabela já agrupa dinamicamente, então não é preciso lógica de posicionamento. O modal (`NewActivityModal.tsx`) segue o padrão visual/estrutural já estabelecido por `InviteUserModal`/`NewProjectModal` (`Modal` + `.form-group`/`.form-input`/`.modal-actions`, estado local único via `useState<FormState>`). Módulo/Processo são texto livre; Tester/Dev vêm de `Project.team` filtrado por papel.

**Tech Stack:** React 19 + TypeScript. Sem suíte de testes automatizada (`CLAUDE.md`) — cada task fecha com `npx tsc -b` limpo; a verificação funcional final é QA manual via `npm run dev` (feita por um humano com login real — este app exige SSO real via Entra ID/MSAL, sem bypass de dev, então subagentes não conseguem abrir o app num navegador).

---

### Task 1: `NewActivityInput` type

**Files:**
- Modify: `src/types/activity.ts`

- [ ] **Step 1: Adicionar o tipo**

In `src/types/activity.ts`, right after the `Activity` interface (which ends with `approvalNote: string | null;\n}`), add:

```ts
export interface NewActivityInput {
  name: string;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string[];
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string | null;
}
```

So the file reads, immediately after the `Activity` interface:

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
  attachments: ActivityAttachment[];
  approvalEvidence: ActivityAttachment | null;
  approvalNote: string | null;
}

export interface NewActivityInput {
  name: string;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string[];
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string | null;
}

export interface ActivityStats {
  ...
```

(the `ActivityStats` interface and everything after it in the file stays exactly as-is — only the new interface is inserted between `Activity` and `ActivityStats`).

`NewActivityInput` deliberately excludes every field that's always derived/defaulted on creation: `id` (auto-generated), `status` (derived from `predecessors`), `retestCount`/`issueCount` (always 0), `actualStart`/`actualEnd` (always `null`), `attachments`/`approvalEvidence`/`approvalNote` (always empty/`null` — no upload flow exists yet in this modal).

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros (o tipo novo não é usado por ninguém ainda, então isso só confirma que a sintaxe está correta).

- [ ] **Step 3: Commit**

```bash
git add src/types/activity.ts
git commit -m "feat: add NewActivityInput type"
```

---

### Task 2: `createActivity` mutator

**Files:**
- Modify: `src/hooks/useActivities.ts`

- [ ] **Step 1: Atualizar o import de tipos**

In `src/hooks/useActivities.ts`, replace line 2:

```ts
import type { Activity, ActivityStats } from "../types/activity";
```

with:

```ts
import type { Activity, ActivityStats, NewActivityInput } from "../types/activity";
```

- [ ] **Step 2: Adicionar o gerador de ID**

Right after the `isoDaysFromNow` function (currently lines 5-9) and before `const INITIAL_ACTIVITIES: Activity[] = [`, add:

```ts

// Próximo ATV-XXXX após o maior número já existente — não um contador fixo, pra nunca
// colidir se o seed crescer.
function nextActivityId(activities: Activity[]): string {
  const maxNum = activities.reduce((max, activity) => {
    const match = /^ATV-(\d+)$/.exec(activity.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `ATV-${maxNum + 1}`;
}
```

- [ ] **Step 3: Atualizar `UseActivitiesResult` e o corpo do hook**

Replace:

```ts
interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
}

export function useActivities(projectId: string): UseActivitiesResult {
  // O mock ainda não filtra por projeto — o parâmetro fica pronto para quando
  // os dados vierem de uma API real, escopados por projeto.
  void projectId;
  const [activities] = useState<Activity[]>(INITIAL_ACTIVITIES);
```

with:

```ts
interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
  createActivity: (input: NewActivityInput) => void;
}

export function useActivities(projectId: string): UseActivitiesResult {
  // O mock ainda não filtra por projeto — o parâmetro fica pronto para quando
  // os dados vierem de uma API real, escopados por projeto.
  void projectId;
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
```

- [ ] **Step 4: Adicionar `createActivity` e retorná-lo**

Right before the `return { activities, stats };` line at the end of `useActivities`, add:

```ts

  // Append direto, sem validação própria — mesma simplicidade de useProjects.addTeamMember.
  // A validação de campo obrigatório vive no modal (camada de UI).
  function createActivity(input: NewActivityInput): void {
    setActivities((prev) => {
      const newActivity: Activity = {
        id: nextActivityId(prev),
        name: input.name,
        status: input.predecessors.length > 0 ? "aguardando" : "liberado",
        module: input.module,
        process: input.process,
        tester: input.tester,
        dev: input.dev,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        actualStart: null,
        actualEnd: null,
        predecessors: input.predecessors,
        retestCount: 0,
        issueCount: 0,
        wbs: input.wbs,
        area: input.area,
        system: input.system,
        transaction: input.transaction,
        expectedResult: input.expectedResult,
        notes: input.notes,
        attachments: [],
        approvalEvidence: null,
        approvalNote: null,
      };
      return [...prev, newActivity];
    });
  }
```

Then replace the final line:

```ts
  return { activities, stats };
}
```

with:

```ts
  return { activities, stats, createActivity };
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useActivities.ts
git commit -m "feat: add createActivity mutator to useActivities"
```

---

### Task 3: `ActivityFieldGrid` — fallback "—" para campos opcionais vazios

**Files:**
- Modify: `src/components/activities/ActivityFieldGrid.tsx`

- [ ] **Step 1: Ajustar os 5 campos**

In `src/components/activities/ActivityFieldGrid.tsx`, replace:

```tsx
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
```

with:

```tsx
      <div className="field">
        <div className="field-label">WBS</div>
        <div className="field-value mono">{activity.wbs || "—"}</div>
      </div>

      <div className="field">
        <div className="field-label">Área</div>
        <div className="field-value">{activity.area || "—"}</div>
      </div>
      <div className="field">
        <div className="field-label">Sistema</div>
        <div className="field-value">{activity.system || "—"}</div>
      </div>

      <div className="field">
        <div className="field-label">Transação</div>
        <div className="field-value mono">{activity.transaction || "—"}</div>
      </div>
      <div className="field">
        <div className="field-label">Nº de reteste</div>
        <div className="field-value mono">{activity.retestCount}×</div>
      </div>

      <div className="field full">
        <div className="field-label">Resultado esperado</div>
        <div className="field-value big">{activity.expectedResult || "—"}</div>
      </div>
```

(`Nº de reteste` is untouched — it's a number, always present, not one of the newly-optional string fields.)

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityFieldGrid.tsx
git commit -m "fix: fall back to em-dash for empty WBS/Área/Sistema/Transação/Resultado esperado"
```

---

### Task 4: `.form-row` SCSS + `NewActivityModal` component

**Files:**
- Modify: `src/styles/_modal.scss`
- Create: `src/components/activities/NewActivityModal.tsx`

- [ ] **Step 1: Adicionar `.form-row` ao SCSS**

In `src/styles/_modal.scss`, right after the `.form-group { margin-bottom: 16px; }` rule (around line 106-108), add:

```scss
.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;

  .form-group {
    flex: 1 1 0;
    min-width: 0;
    margin-bottom: 0;
  }
}
```

Layout de 2 colunas para pares de campo lado a lado (Módulo/Processo, Tester/Dev, datas, WBS/Área, Sistema/Transação) — usado 5 vezes já dentro do próprio `NewActivityModal`, então não é abstração prematura.

- [ ] **Step 2: Criar o componente**

Create `src/components/activities/NewActivityModal.tsx`:

```tsx
import { useState } from "react";
import Modal from "../common/Modal";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { NewActivityInput } from "../../types/activity";
import type { TeamMember } from "../../types/project";

interface NewActivityModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  onCreate: (input: NewActivityInput) => void;
}

interface NewActivityFormState {
  name: string;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string;
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string;
  errorMsg: string | null;
}

function createEmptyState(): NewActivityFormState {
  return {
    name: "",
    module: "",
    process: "",
    tester: "",
    dev: "",
    plannedStart: "",
    plannedEnd: "",
    predecessors: "",
    wbs: "",
    area: "",
    system: "",
    transaction: "",
    expectedResult: "",
    notes: "",
    errorMsg: null,
  };
}

// <input type="date"> devolve "YYYY-MM-DD" — passar direto pra `new Date(...)` é
// interpretado como UTC-midnight e pode exibir o dia anterior em UTC-3 (mesma classe
// de bug já corrigida em isOverdue/toLocalIsoString, ver activityIndicators.ts).
function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return toLocalIsoString(new Date(year, month - 1, day));
}

type RequiredFieldKey = "name" | "module" | "process" | "tester" | "dev" | "plannedStart" | "plannedEnd";

const REQUIRED_FIELDS: { key: RequiredFieldKey; label: string }[] = [
  { key: "name", label: "Nome da atividade" },
  { key: "module", label: "Módulo" },
  { key: "process", label: "Processo" },
  { key: "tester", label: "Tester" },
  { key: "dev", label: "Desenvolvedor" },
  { key: "plannedStart", label: "Início planejado" },
  { key: "plannedEnd", label: "Conclusão planejada" },
];

export default function NewActivityModal({ show, onHide, team, onCreate }: NewActivityModalProps) {
  const [state, setState] = useState<NewActivityFormState>(createEmptyState);

  function resetAndHide() {
    setState(createEmptyState());
    onHide();
  }

  function updateField<K extends keyof NewActivityFormState>(key: K, value: NewActivityFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    const missing = REQUIRED_FIELDS.filter(({ key }) => !state[key].trim()).map(({ label }) => label);
    if (missing.length > 0) {
      setState((prev) => ({ ...prev, errorMsg: `Preencha os campos obrigatórios: ${missing.join(", ")}.` }));
      return;
    }

    onCreate({
      name: state.name.trim(),
      module: state.module.trim(),
      process: state.process.trim(),
      tester: state.tester,
      dev: state.dev,
      plannedStart: dateInputToIso(state.plannedStart),
      plannedEnd: dateInputToIso(state.plannedEnd),
      predecessors: state.predecessors
        .split(";")
        .map((id) => id.trim())
        .filter(Boolean),
      wbs: state.wbs.trim(),
      area: state.area.trim(),
      system: state.system.trim(),
      transaction: state.transaction.trim(),
      expectedResult: state.expectedResult.trim(),
      notes: state.notes.trim() || null,
    });
    resetAndHide();
  }

  const testers = team.filter((member) => member.role === "Tester");
  const devs = team.filter((member) => member.role === "Desenvolvedor");

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="new-activity-modal-title">
      <div className="modal-title" id="new-activity-modal-title">
        Nova atividade
      </div>
      <div className="modal-subtitle">
        Preencha os dados abaixo para incluir uma atividade em um módulo e processo existentes.
      </div>

      {state.errorMsg && <div className="error-banner">{state.errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-name">
          Nome da atividade
        </label>
        <input
          className="form-input"
          type="text"
          id="new-activity-name"
          placeholder="Ex: Validar cálculo de crédito ICMS"
          value={state.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-module">
            Módulo
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-module"
            placeholder="Ex: Fiscal"
            value={state.module}
            onChange={(event) => updateField("module", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-process">
            Processo
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-process"
            placeholder="Ex: Apuração de ICMS"
            value={state.process}
            onChange={(event) => updateField("process", event.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-tester">
            Tester
          </label>
          <select
            className="form-input"
            id="new-activity-tester"
            aria-label="Tester"
            value={state.tester}
            onChange={(event) => updateField("tester", event.target.value)}
          >
            {testers.length === 0 ? (
              <option value="" disabled>
                Nenhum tester cadastrado no projeto
              </option>
            ) : (
              <>
                <option value="">Selecione…</option>
                {testers.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-dev">
            Desenvolvedor
          </label>
          <select
            className="form-input"
            id="new-activity-dev"
            aria-label="Desenvolvedor"
            value={state.dev}
            onChange={(event) => updateField("dev", event.target.value)}
          >
            {devs.length === 0 ? (
              <option value="" disabled>
                Nenhum dev cadastrado no projeto
              </option>
            ) : (
              <>
                <option value="">Selecione…</option>
                {devs.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-inicio">
            Início planejado
          </label>
          <input
            className="form-input"
            type="date"
            id="new-activity-inicio"
            value={state.plannedStart}
            onChange={(event) => updateField("plannedStart", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-fim">
            Conclusão planejada
          </label>
          <input
            className="form-input"
            type="date"
            id="new-activity-fim"
            value={state.plannedEnd}
            onChange={(event) => updateField("plannedEnd", event.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-predecessores">
          Predecessores <span className="optional">(opcional — IDs separados por ";")</span>
        </label>
        <input
          className="form-input"
          type="text"
          id="new-activity-predecessores"
          placeholder="Ex: ATV-1042; ATV-1050"
          value={state.predecessors}
          onChange={(event) => updateField("predecessors", event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-wbs">
            WBS <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-wbs"
            placeholder="Ex: 1.2.3"
            value={state.wbs}
            onChange={(event) => updateField("wbs", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-area">
            Área <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-area"
            placeholder="Ex: Fiscal"
            value={state.area}
            onChange={(event) => updateField("area", event.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-sistema">
            Sistema <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-sistema"
            placeholder="Ex: SAP ECC"
            value={state.system}
            onChange={(event) => updateField("system", event.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-activity-transacao">
            Transação <span className="optional">(opcional)</span>
          </label>
          <input
            className="form-input"
            type="text"
            id="new-activity-transacao"
            placeholder="Ex: FB60"
            value={state.transaction}
            onChange={(event) => updateField("transaction", event.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-resultado">
          Resultado esperado <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="new-activity-resultado"
          placeholder="O que deve acontecer quando o teste for bem-sucedido"
          value={state.expectedResult}
          onChange={(event) => updateField("expectedResult", event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="new-activity-observacoes">
          Observações <span className="optional">(opcional)</span>
        </label>
        <textarea
          className="form-textarea"
          id="new-activity-observacoes"
          placeholder="Informações adicionais sobre a atividade"
          value={state.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Criar atividade
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_modal.scss src/components/activities/NewActivityModal.tsx
git commit -m "feat: add NewActivityModal component"
```

---

### Task 5: Wire `ProjectActivitiesPage`

**Files:**
- Modify: `src/pages/ProjectActivitiesPage.tsx`

- [ ] **Step 1: Adicionar os imports**

In `src/pages/ProjectActivitiesPage.tsx`, replace the import block:

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

with:

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import NewActivityModal from "../components/activities/NewActivityModal";
import NavIcon from "../components/common/NavIcon";
import { useActivities } from "../hooks/useActivities";
import { useExportButton } from "../hooks/useExportButton";
import { useProjects } from "../hooks/useProjects";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import { buildActivityExportRows, ACTIVITY_EXPORT_COLUMN_WIDTHS } from "../utils/activityExport";
import { downloadXlsx } from "../utils/downloadXlsx";
import type { ActivityFiltersState, ActivityGroupMode } from "../types/activity";
```

- [ ] **Step 2: Buscar o projeto atual e adicionar o estado do modal**

Replace:

```ts
export default function ProjectActivitiesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { activities, stats } = useActivities(projectId);

  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
```

with:

```ts
export default function ProjectActivitiesPage() {
  const { id } = useParams();
  const projectId = id ?? "";
  const { activities, stats, createActivity } = useActivities(projectId);
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);

  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
```

- [ ] **Step 3: Ligar o botão**

Replace:

```tsx
          <button type="button" className="btn btn-primary btn-sm">
            + Nova atividade
          </button>
```

with:

```tsx
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNewActivityModal(true)}>
            + Nova atividade
          </button>
```

- [ ] **Step 4: Renderizar o modal**

Replace the end of the component:

```tsx
      <ActivitiesTable
        activities={filteredActivities}
        projectId={projectId}
        groupMode={groupMode}
        expandedModules={expandedModules}
        onToggleModule={toggleModule}
        collapsedProcesses={collapsedProcesses}
        onToggleProcess={toggleProcess}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
      />
    </div>
  );
}
```

with:

```tsx
      <ActivitiesTable
        activities={filteredActivities}
        projectId={projectId}
        groupMode={groupMode}
        expandedModules={expandedModules}
        onToggleModule={toggleModule}
        collapsedProcesses={collapsedProcesses}
        onToggleProcess={toggleProcess}
        expandedGroups={expandedGroups}
        onToggleGroup={toggleGroup}
      />

      <NewActivityModal
        show={showNewActivityModal}
        onHide={() => setShowNewActivityModal(false)}
        team={currentProject?.team ?? []}
        onCreate={createActivity}
      />
    </div>
  );
}
```

"Importar em massa" continua intocado — outro ciclo.

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectActivitiesPage.tsx
git commit -m "feat: wire the Nova Atividade modal into ProjectActivitiesPage"
```

## Context (for whoever implements Task 5)

`ProjectActivitiesPage` already imports and calls `useActivities`/`useExportButton` (from the Exportar feature, already shipped). This task adds a second data hook (`useProjects`) purely to resolve the current project's `team` for the Tester/Dev selects inside the modal — the same `projects.find((project) => project.id === projectId)` pattern already used in `ProjectDashboardPage.tsx` and `ConfigUsersTable.tsx`. `currentProject` can be `undefined` (project not found) — the modal handles that via `currentProject?.team ?? []`, which the `NewActivityModal` renders as empty tester/dev dropdowns (disabled placeholder option), not a crash.

**Skip live browser QA:** this app requires real Entra ID SSO login (MSAL) with no dev bypass — a subagent cannot log in and click-test in a browser. Verification is `npx tsc -b` and `npm run build` only; live QA is done later by a human with real credentials.

---

### Task 6: Build final

**Files:** nenhum (task de verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros (roda `tsc -b && vite build`).

- [ ] **Step 2: QA manual (humano, login real)**

Run: `npm run dev`, abrir `/projetos/:id/atividades`, clicar "+ Nova atividade":
- Submeter vazio — banner lista os 7 campos obrigatórios, modal não fecha.
- Preencher só os obrigatórios (Módulo/Processo como texto livre, Tester/Dev escolhidos do time do projeto) e confirmar — atividade nova aparece na lista com status "Liberado"; abrir o detalhe e conferir que WBS/Área/Sistema/Transação/Resultado esperado mostram "—".
- Repetir preenchendo Predecessores com um ID válido do projeto (ex. `ATV-1001`) — status vira "Aguardando", o painel de predecessor aparece no detalhe.
- Repetir com um predecessor inexistente (ex. `ATV-9999`) — atividade é criada normalmente, sem painel de predecessor, sem erro.
- Conferir que a data de Início/Conclusão planejada no detalhe bate exatamente com o que foi digitado (sem deslocar um dia).
- Se o projeto atual não tiver ninguém com papel Tester ou Desenvolvedor em Papéis & Config, os selects correspondentes mostram "Nenhum tester/dev cadastrado no projeto" (desabilitado) e o submit continua bloqueado pela validação de obrigatório.

Nenhum commit nesta task — é só verificação do que as Tasks 1-5 já commitaram.
