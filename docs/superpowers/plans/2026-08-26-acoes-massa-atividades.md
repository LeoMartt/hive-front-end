# Ações em massa de Atividades + Salvar matriz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ligar os botões "Aprovação em Massa" e "Cancelar selecionadas" na lista de Atividades (hoje decorativos), restringir quais atividades podem ser selecionadas para essas ações, e ligar o botão "Salvar matriz" em Config → Papéis (hoje decorativo).

**Architecture:** Dois novos mutators em `useActivities` (`bulkConcludeActivities`, `cancelActivities`) seguindo o padrão `.map()` já usado por `concludeActivity`/`rejectActivity`. `ActivitiesTable` ganha um helper de elegibilidade de seleção (`isBulkSelectable`, novo em `utils/activityIndicators.ts`), passa a restringir o checkbox de linha e o "selecionar tudo" a atividades elegíveis, e reaproveita `ConcludeActivityModal` (parametrizado com título/subtítulo) para o modo lote, além de um novo `CancelActivitiesModal` para confirmação de cancelamento. `ConfigPermissionMatrix` passa de `defaultChecked` (não controlado) para estado controlado com indicador de "salvo".

**Tech Stack:** React 19 + TypeScript, sem suíte de testes automatizados (decisão deliberada do projeto — verificação via `npx tsc -b`, `npm run build` e QA manual no navegador, não TDD).

**Importante:** este projeto tem uma regra do usuário de **nunca commitar ou abrir PR automaticamente** — todo `git commit`/`git push`/PR é feito manualmente pelo usuário. Todos os passos de "commit" abaixo devem ser **pulados pelo executor** (não rodar `git commit`); ao final de cada task, apenas deixar o working tree com as mudanças prontas para o usuário revisar e commitar.

---

## Task 1: Helper de elegibilidade de seleção em massa

**Files:**
- Modify: `src/utils/activityIndicators.ts`

- [ ] **Step 1: Adicionar a constante e a função de elegibilidade**

Adicione ao final de `src/utils/activityIndicators.ts`:

```ts
// Atividades elegíveis para seleção em massa (aprovar e/ou cancelar) na lista de
// Atividades. "concluido" e "cancelado" ficam de fora — não há ação em massa que
// faça sentido sobre elas, então nem exibem checkbox de seleção.
const BULK_SELECTABLE_STATUSES: ActivityStatus[] = ["aguardando", "liberado", "execucao", "bloqueado"];

export function isBulkSelectable(activity: Activity): boolean {
  return BULK_SELECTABLE_STATUSES.includes(activity.status);
}

// Das atividades elegíveis para seleção, só "liberado" e "execucao" podem ser
// aprovadas em massa (mesma regra do fluxo de aprovação individual).
export function isBulkApprovable(activity: Activity): boolean {
  return activity.status === "liberado" || activity.status === "execucao";
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros (o arquivo já importa `Activity` e `ActivityStatus` na linha 1, nenhum import novo é necessário).

---

## Task 2: Mutators de ação em massa em `useActivities`

**Files:**
- Modify: `src/hooks/useActivities.ts`

- [ ] **Step 1: Adicionar os dois mutators e expô-los no retorno do hook**

Em `src/hooks/useActivities.ts`, adicione as duas funções novas logo depois de `rejectActivity` (antes do `return` final, linha 657-659 atual):

```ts
  // Aprovação em massa: mesma lógica de concludeActivity, aplicada a uma lista de ids
  // num único setActivities (evita um re-render por atividade). A validação de quais
  // atividades podem ser selecionadas (status liberado/execucao) vive na UI
  // (ActivitiesTable), não aqui — mesma convenção dos outros mutators deste hook.
  function bulkConcludeActivities(activityIds: string[], input: ConcludeActivityInput): void {
    const idSet = new Set(activityIds);
    setActivities((prev) =>
      prev.map((activity) =>
        idSet.has(activity.id)
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

  function cancelActivities(activityIds: string[]): void {
    const idSet = new Set(activityIds);
    setActivities((prev) =>
      prev.map((activity) => (idSet.has(activity.id) ? { ...activity, status: "cancelado" } : activity))
    );
  }
```

Depois, atualize a interface `UseActivitiesResult` (topo do arquivo, linhas 558-564) para incluir os dois novos mutators:

```ts
interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
  createActivity: (input: NewActivityInput) => void;
  concludeActivity: (activityId: string, input: ConcludeActivityInput) => void;
  rejectActivity: (activityId: string, input: RejectActivityInput) => void;
  bulkConcludeActivities: (activityIds: string[], input: ConcludeActivityInput) => void;
  cancelActivities: (activityIds: string[]) => void;
}
```

E o `return` final do hook:

```ts
  return {
    activities,
    stats,
    createActivity,
    concludeActivity,
    rejectActivity,
    bulkConcludeActivities,
    cancelActivities,
  };
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros.

---

## Task 3: Parametrizar `ConcludeActivityModal` para o modo lote

**Files:**
- Modify: `src/components/activities/ConcludeActivityModal.tsx`

- [ ] **Step 1: Adicionar props opcionais de título/subtítulo**

Em `src/components/activities/ConcludeActivityModal.tsx`, altere a interface de props (linhas 7-12) para:

```ts
interface ConcludeActivityModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ConcludeActivityInput) => void;
  title?: string;
  subtitle?: string;
}
```

E a assinatura da função (linha 18) para aceitar e usar os defaults:

```ts
export default function ConcludeActivityModal({
  show,
  onHide,
  currentUserName,
  onSubmit,
  title = "Concluir atividade",
  subtitle = "Anexe a evidência de aprovação. A observação é opcional.",
}: ConcludeActivityModalProps) {
```

Substitua o bloco de título fixo (linhas atuais 53-56):

```tsx
      <div className="modal-title" id="conclude-activity-modal-title">
        Concluir atividade
      </div>
      <div className="modal-subtitle">Anexe a evidência de aprovação. A observação é opcional.</div>
```

por:

```tsx
      <div className="modal-title" id="conclude-activity-modal-title">
        {title}
      </div>
      <div className="modal-subtitle">{subtitle}</div>
```

E o texto do botão de confirmação (linha atual 135, dentro de `modal-actions`) deve continuar fixo em "Concluir atividade" — no mockup, o botão de confirmação do modal em lote também é rotulado como conclusão, não precisa mudar. Não altere essa linha.

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros. Nenhum outro arquivo quebra porque `title`/`subtitle` são opcionais — todo uso existente do componente (sem essas props) continua compilando com os defaults antigos.

---

## Task 4: Novo `CancelActivitiesModal`

**Files:**
- Create: `src/components/activities/CancelActivitiesModal.tsx`

- [ ] **Step 1: Criar o componente**

Crie `src/components/activities/CancelActivitiesModal.tsx` com o seguinte conteúdo. Segue a mesma estrutura de `Modal` + `modal-title`/`modal-subtitle`/`modal-actions` já usada em `ConcludeActivityModal.tsx` (não usa as classes `modal-danger-text`/`modal-actions-row` do mockup porque elas não existem no SCSS deste projeto):

```tsx
import Modal from "../common/Modal";

interface CancelActivitiesModalProps {
  show: boolean;
  count: number;
  onHide: () => void;
  onConfirm: () => void;
}

export default function CancelActivitiesModal({ show, count, onHide, onConfirm }: CancelActivitiesModalProps) {
  return (
    <Modal open={show} onClose={onHide} labelledBy="cancel-activities-modal-title">
      <div className="modal-title" id="cancel-activities-modal-title">
        Cancelar atividades
      </div>
      <div className="modal-subtitle">
        Tem certeza que deseja cancelar {count} atividade{count > 1 ? "s" : ""}? O status mudará para{" "}
        <b>Cancelado</b>.
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onHide}>
          Voltar
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          Confirmar cancelamento
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros.

---

## Task 5: Restringir seleção por status em `ActivityRow`

**Files:**
- Modify: `src/components/activities/ActivityRow.tsx`

- [ ] **Step 1: Renderizar o checkbox só quando a atividade é elegível**

Em `src/components/activities/ActivityRow.tsx`, adicione o import do helper (linha 3, junto dos outros imports de `activityIndicators`):

```ts
import { formatActivityDate, isBulkSelectable, isOverdue, retestPillClass } from "../../utils/activityIndicators";
```

Substitua o bloco do `<td>` do checkbox (linhas 44-53 atuais):

```tsx
      <td>
        <input
          type="checkbox"
          aria-label={`Selecionar ${activity.name}`}
          checked={checked}
          onChange={() => onToggleSelect(activity.id)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        />
      </td>
```

por:

```tsx
      <td>
        {isBulkSelectable(activity) && (
          <input
            type="checkbox"
            aria-label={`Selecionar ${activity.name}`}
            checked={checked}
            onChange={() => onToggleSelect(activity.id)}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          />
        )}
      </td>
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros.

---

## Task 6: Ligar os botões de ação em massa em `ActivitiesTable`

**Files:**
- Modify: `src/components/activities/ActivitiesTable.tsx`

- [ ] **Step 1: Atualizar imports e props do componente**

No topo de `src/components/activities/ActivitiesTable.tsx`, troque os imports (linhas 1-7) por:

```tsx
import { useEffect, useRef, useState } from "react";
import ActivityTreeRows from "./ActivityTreeRows";
import ActivityGroupRows from "./ActivityGroupRows";
import ConcludeActivityModal from "./ConcludeActivityModal";
import CancelActivitiesModal from "./CancelActivitiesModal";
import EmptyState from "../common/EmptyState";
import SortIcon from "../common/SortIcon";
import { groupByModuleProcess, groupByStatus, groupByTester } from "../../utils/groupActivities";
import { isBulkApprovable, isBulkSelectable } from "../../utils/activityIndicators";
import type { Activity, ActivityGroupMode, ConcludeActivityInput } from "../../types/activity";
```

Troque a interface de props (linhas 9-19 atuais) por:

```tsx
interface ActivitiesTableProps {
  activities: Activity[];
  projectId: string;
  groupMode: ActivityGroupMode;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
  collapsedProcesses: Set<string>;
  onToggleProcess: (processKey: string) => void;
  expandedGroups: Set<string>;
  onToggleGroup: (groupKey: string) => void;
  currentUserName: string;
  onBulkApprove: (activityIds: string[], input: ConcludeActivityInput) => void;
  onBulkCancel: (activityIds: string[]) => void;
}
```

E a assinatura da função (linhas 21-31 atuais) por:

```tsx
export default function ActivitiesTable({
  activities,
  projectId,
  groupMode,
  expandedModules,
  onToggleModule,
  collapsedProcesses,
  onToggleProcess,
  expandedGroups,
  onToggleGroup,
  currentUserName,
  onBulkApprove,
  onBulkCancel,
}: ActivitiesTableProps) {
```

- [ ] **Step 2: Trocar `visibleIds` por `selectableIds` na seleção e no "selecionar tudo"**

Substitua o bloco (linhas 32-54 atuais):

```tsx
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const visibleIds = activities.map((activity) => activity.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someSelected = selectedVisibleCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Descarta seleções de atividades que saíram da lista filtrada.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(visibleIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);
```

por:

```tsx
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Só atividades elegíveis (nem concluído, nem cancelado) entram na seleção via
  // "selecionar tudo" — elas nem têm checkbox próprio na linha (ver ActivityRow).
  const selectableIds = activities.filter(isBulkSelectable).map((activity) => activity.id);
  const selectedSelectableCount = selectableIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = selectableIds.length > 0 && selectedSelectableCount === selectableIds.length;
  const someSelected = selectedSelectableCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Descarta seleções de atividades que saíram da lista filtrada ou deixaram de ser elegíveis.
  useEffect(() => {
    setSelectedIds((prev) => {
      const selectable = new Set(selectableIds);
      const next = new Set([...prev].filter((id) => selectable.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  const selectedActivities = activities.filter((activity) => selectedIds.has(activity.id));
  const canBulkApprove = selectedActivities.length > 1 && selectedActivities.every(isBulkApprovable);
```

E troque `toggleAll` (linhas 68-70 atuais):

```tsx
  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(visibleIds) : new Set());
  }
```

por:

```tsx
  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? new Set(selectableIds) : new Set());
  }
```

- [ ] **Step 3: Ligar os botões da barra de seleção**

Substitua o bloco da `selection-bar` (linhas 89-109 atuais):

```tsx
      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <span className="sel-count">
            <b>{selectedIds.size}</b> atividade(s) selecionada(s)
          </span>
          <div className="sel-actions">
            {/* No mockup, aprovação em massa só faz sentido com 2+ atividades selecionadas. */}
            {selectedIds.size > 1 && (
              <button type="button" className="btn btn-primary btn-sm">
                Aprovação em Massa
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm">
              Cancelar selecionadas
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearSelection}>
              Limpar seleção
            </button>
          </div>
        </div>
      )}
```

por:

```tsx
      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <span className="sel-count">
            <b>{selectedIds.size}</b> atividade(s) selecionada(s)
          </span>
          <div className="sel-actions">
            {/* No mockup, aprovação em massa só faz sentido com 2+ atividades selecionadas. */}
            {selectedActivities.length > 1 && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!canBulkApprove}
                title={
                  canBulkApprove
                    ? undefined
                    : "Só é possível aprovar em massa atividades em execução ou liberadas."
                }
                onClick={() => setShowBulkApproveModal(true)}
              >
                Aprovação em Massa
              </button>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setShowCancelModal(true)}>
              Cancelar selecionadas
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={clearSelection}>
              Limpar seleção
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 4: Renderizar os dois modais e fechar o loop de seleção**

Localize o `return` do JSX principal (logo após o bloco acima, encerrando com o `</table></div></>` de fechamento, linhas 110-198 atuais terminando em `</>`). Envolva o fechamento existente (não mude o conteúdo da tabela) adicionando os dois modais **antes** da tag final `</>`. O final do arquivo (linhas 196-201 atuais) é:

```tsx
      </div>
    </>
  );
}
```

Troque por:

```tsx
      </div>

      <ConcludeActivityModal
        show={showBulkApproveModal}
        onHide={() => setShowBulkApproveModal(false)}
        currentUserName={currentUserName}
        title={`Aprovar ${selectedActivities.length} atividade(s) selecionada(s)`}
        subtitle="Uma única evidência será aplicada a todas as atividades selecionadas do lote."
        onSubmit={(input) => {
          onBulkApprove(Array.from(selectedIds), input);
          clearSelection();
        }}
      />

      <CancelActivitiesModal
        show={showCancelModal}
        count={selectedIds.size}
        onHide={() => setShowCancelModal(false)}
        onConfirm={() => {
          onBulkCancel(Array.from(selectedIds));
          setShowCancelModal(false);
          clearSelection();
        }}
      />
    </>
  );
}
```

- [ ] **Step 5: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros.

---

## Task 7: Repassar mutators e usuário atual em `ProjectActivitiesPage`

**Files:**
- Modify: `src/pages/ProjectActivitiesPage.tsx`

- [ ] **Step 1: Desestruturar os novos mutators do hook**

Em `src/pages/ProjectActivitiesPage.tsx`, linha 41 atual:

```tsx
  const { activities, stats, createActivity } = useActivities(projectId);
```

troque por:

```tsx
  const { activities, stats, createActivity, bulkConcludeActivities, cancelActivities } = useActivities(projectId);
```

- [ ] **Step 2: Passar as novas props para `ActivitiesTable`**

Localize a renderização de `<ActivitiesTable ... />` (linhas 215-225 atuais):

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
```

troque por:

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
        currentUserName={CURRENT_USER_NAME}
        onBulkApprove={bulkConcludeActivities}
        onBulkCancel={cancelActivities}
      />
```

- [ ] **Step 3: Verificar tipos e build**

Run: `npx tsc -b`
Expected: sem erros.

Run: `npm run build`
Expected: build concluído sem erros.

---

## Task 8: Botão "Salvar matriz" controlado em `ConfigPermissionMatrix`

**Files:**
- Modify: `src/components/config/ConfigPermissionMatrix.tsx`

- [ ] **Step 1: Converter os checkboxes para estado controlado**

Substitua o conteúdo inteiro de `src/components/config/ConfigPermissionMatrix.tsx` por:

```tsx
import { useState } from "react";

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

type PermissionRole = "gestor" | "tester" | "dev";

export default function ConfigPermissionMatrix() {
  const [rows, setRows] = useState<PermissionRow[]>(PERMISSION_ROWS);
  const [saved, setSaved] = useState(false);

  function toggleCell(action: string, role: PermissionRole) {
    setRows((prev) =>
      prev.map((row) => (row.action === action ? { ...row, [role]: !row[role] } : row))
    );
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
  }

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
            {rows.map((row) => (
              <tr key={row.action}>
                <td>{row.action}</td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.gestor}
                    onChange={() => toggleCell(row.action, "gestor")}
                    aria-label={`${row.action} — Gestor`}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.tester}
                    onChange={() => toggleCell(row.action, "tester")}
                    aria-label={`${row.action} — Tester`}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={row.dev}
                    onChange={() => toggleCell(row.action, "dev")}
                    aria-label={`${row.action} — Dev`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 14 }} onClick={handleSave}>
        Salvar matriz
      </button>
      {saved && (
        <span className="saved-msg" style={{ marginLeft: 10 }}>
          Matriz salva ✓
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos e build**

Run: `npx tsc -b`
Expected: sem erros.

Run: `npm run build`
Expected: build concluído sem erros.

---

## Task 9: QA manual no navegador

**Files:** nenhum (só verificação)

- [ ] **Step 1: Rodar o dev server**

Run: `npm run dev`

- [ ] **Step 2: QA da tela de Atividades**

Abrir `/projetos/:id/atividades` de um projeto qualquer e verificar:
- Atividades `Concluído` e `Cancelado` não têm checkbox de seleção na linha (a célula fica vazia).
- Marcar "selecionar tudo" no cabeçalho seleciona só as atividades elegíveis (aguardando/liberado/execução/bloqueado), não as concluídas/canceladas.
- Selecionar 2+ atividades `Liberado`/`Em execução`: botão "Aprovação em Massa" fica habilitado; ao clicar, abre o modal com título "Aprovar N atividade(s) selecionada(s)" e subtítulo mencionando evidência única para o lote; anexar um arquivo e confirmar muda o status das selecionadas para `Concluído` e limpa a seleção.
- Selecionar 2+ atividades incluindo pelo menos uma `Bloqueado` ou `Aguardando`: botão "Aprovação em Massa" aparece desabilitado com tooltip explicando o motivo.
- Selecionar 1+ atividade (qualquer status elegível) e clicar "Cancelar selecionadas": abre o modal de confirmação com a contagem certa; confirmar muda o status das selecionadas para `Cancelado` e limpa a seleção.
- "Limpar seleção" continua funcionando normalmente.

- [ ] **Step 3: QA da tela de Config**

Abrir `/projetos/:id/config`, ir à aba de Papéis/Matriz de Permissões e verificar:
- Marcar/desmarcar checkboxes da matriz funciona (estado controlado, não perde o valor ao re-renderizar).
- Clicar "Salvar matriz" mostra "Matriz salva ✓" ao lado do botão.
- Editar qualquer checkbox depois de salvar faz a mensagem "Matriz salva ✓" desaparecer até salvar de novo.

- [ ] **Step 4: Rodar lint**

Run: `npm run lint`
Expected: sem erros novos introduzidos pelas mudanças desta implementação.

---

## Self-Review Notes

- **Cobertura do spec:** Task 1/5/6 cobrem elegibilidade de seleção; Task 2/6/7 cobrem os mutators e o wiring dos botões de aprovar/cancelar em massa; Task 3/4/6 cobrem os dois modais (reaproveitado e novo); Task 8 cobre o botão "Salvar matriz". Fora de escopo (matriz não aplicada de verdade, cálculo de SPI/atrasado, ações individuais na página de detalhe) não tem tasks — como esperado.
- **Placeholders:** nenhum "TBD"/"implementar depois" — todos os steps têm código completo.
- **Consistência de tipos:** `bulkConcludeActivities`/`cancelActivities` (Task 2) usados com a mesma assinatura em `ActivitiesTable` (Task 6, props `onBulkApprove`/`onBulkCancel`) e em `ProjectActivitiesPage` (Task 7). `isBulkSelectable`/`isBulkApprovable` (Task 1) usados com o mesmo nome em `ActivityRow` (Task 5) e `ActivitiesTable` (Task 6).
