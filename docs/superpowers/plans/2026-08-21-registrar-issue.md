# Registrar Issue (modal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os dois botões hoje decorativos "+ Registrar issue" (lista de Issues) e "Registrar nova issue" (atividade bloqueada) por um único modal reutilizável que cria issues de verdade.

**Architecture:** `NewIssueInput` + `createIssue` em `useIssues.ts` seguem exatamente o padrão já estabelecido por `NewActivityInput`/`createActivity`. `RegisterIssueModal.tsx` é um componente único usado pelas duas entradas — quando recebe `currentActivity`, esconde o campo "Atividade vinculada" e usa essa atividade direto; quando não recebe, mostra um `<select>` com todas as atividades. `ProjectConfig` ganha `evidenciaObrigatoriaIssue: boolean` (primeiro campo de Config a virar gate real de validação, não só cor/número). `ActivityLinkedIssuesPanel` é refatorado para receber `issues` como prop em vez de chamar `useIssues()` por conta própria — sem isso, uma issue criada no Detalhe de Atividade não apareceria no painel "Issues vinculadas" da mesma tela.

**Tech Stack:** React 19 + TypeScript. Sem suíte de testes automatizada (`CLAUDE.md`) — cada task fecha com `npx tsc -b` limpo; a verificação funcional final é QA manual via `npm run dev` (feita por um humano com login real — este app exige SSO real via Entra ID/MSAL, sem bypass de dev).

---

### Task 1: `NewIssueInput` type

**Files:**
- Modify: `src/types/issue.ts`

- [ ] **Step 1: Adicionar o tipo**

In `src/types/issue.ts`, right after the `Issue` interface (which ends with `solutionAttachment: IssueAttachment | null;\n}`), add:

```ts
export interface NewIssueInput {
  title: string;
  description: string;
  type: IssueType;
  impeditiva: boolean;
  impact: IssueImpact;
  impactNote: string;
  tester: string;
  dev: string;
  area: string;
  relatedActivityId: string;
  openingAttachment: IssueAttachment | null;
}
```

So the file reads, immediately after the `Issue` interface:

```ts
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

export interface NewIssueInput {
  title: string;
  description: string;
  type: IssueType;
  impeditiva: boolean;
  impact: IssueImpact;
  impactNote: string;
  tester: string;
  dev: string;
  area: string;
  relatedActivityId: string;
  openingAttachment: IssueAttachment | null;
}

export interface IssueStats {
  ...
```

(the `IssueStats` interface and everything after it stays exactly as-is — only the new interface is inserted between `Issue` and `IssueStats`.)

`NewIssueInput` excludes every field always derived on creation: `id` (auto-gerado), `status` (sempre `"aberta"`), `cascadeActivityIds` (sempre `[]`), `openedAt`/`resolvedAt`/`proposedSolution`/`analysisStartedAt`/`solutionProposedAt`/`solutionAttachment` (sempre a data atual ou `null`). `tester`/`area`/`relatedActivityId` são incluídos porque o protótipo não tem campo de formulário pra eles — quem chama `createIssue` (o modal) já os resolve antes: `tester` é o usuário atual (passado ao modal pela página que o abre), `area` vem da atividade vinculada, `relatedActivityId` é sempre uma atividade real (escolhida ou implícita).

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/types/issue.ts
git commit -m "feat: add NewIssueInput type"
```

---

### Task 2: `createIssue` mutator

**Files:**
- Modify: `src/hooks/useIssues.ts`

- [ ] **Step 1: Atualizar o import de tipos**

In `src/hooks/useIssues.ts`, replace line 2:

```ts
import type { Issue, IssueStats } from "../types/issue";
```

with:

```ts
import type { Issue, IssueStats, NewIssueInput } from "../types/issue";
```

- [ ] **Step 2: Adicionar o gerador de ID**

Right after the `isoDaysAgo` function (currently lines 5-9) and before `const INITIAL_ISSUES: Issue[] = [`, add:

```ts

// Próximo ISS-XXXX após o maior número já existente, preservando o zero-padding de 4
// dígitos do seed (ISS-0290...ISS-0304) — mesmo padrão de nextActivityId em useActivities.ts.
function nextIssueId(issues: Issue[]): string {
  const maxNum = issues.reduce((max, issue) => {
    const match = /^ISS-(\d+)$/.exec(issue.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `ISS-${String(maxNum + 1).padStart(4, "0")}`;
}
```

- [ ] **Step 3: Atualizar `UseIssuesResult` e o corpo do hook**

Replace:

```ts
interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
}

export function useIssues(projectId: string): UseIssuesResult {
  // O mock ainda não filtra por projeto — mesmo padrão de useActivities.
  void projectId;
  const [issues] = useState<Issue[]>(INITIAL_ISSUES);
```

with:

```ts
interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
}

export function useIssues(projectId: string): UseIssuesResult {
  // O mock ainda não filtra por projeto — mesmo padrão de useActivities.
  void projectId;
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
```

- [ ] **Step 4: Adicionar `createIssue` e retorná-lo**

Right before the final `return { issues, stats };` line, add:

```ts

  // Append direto, sem validação própria — mesmo padrão de createActivity em
  // useActivities.ts. A validação de campo obrigatório vive no modal (camada de UI).
  function createIssue(input: NewIssueInput): void {
    setIssues((prev) => {
      const newIssue: Issue = {
        id: nextIssueId(prev),
        title: input.title,
        status: "aberta",
        impeditiva: input.impeditiva,
        type: input.type,
        impact: input.impact,
        area: input.area,
        tester: input.tester,
        dev: input.dev,
        relatedActivityId: input.relatedActivityId,
        cascadeActivityIds: [],
        openedAt: toLocalIsoString(new Date()),
        resolvedAt: null,
        description: input.description,
        impactNote: input.impactNote,
        proposedSolution: null,
        analysisStartedAt: null,
        solutionProposedAt: null,
        openingAttachment: input.openingAttachment,
        solutionAttachment: null,
      };
      return [...prev, newIssue];
    });
  }
```

Then replace the final line:

```ts
  return { issues, stats };
}
```

with:

```ts
  return { issues, stats, createIssue };
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useIssues.ts
git commit -m "feat: add createIssue mutator to useIssues"
```

---

### Task 3: `evidenciaObrigatoriaIssue` em `ProjectConfig`

**Files:**
- Modify: `src/types/projectConfig.ts`
- Modify: `src/context/ProjectConfigContext.ts`
- Modify: `src/components/config/ConfigAttachmentsPanel.tsx`

- [ ] **Step 1: Adicionar o campo ao tipo**

In `src/types/projectConfig.ts`, replace:

```ts
export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
}
```

with:

```ts
export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
  evidenciaObrigatoriaIssue: boolean;
}
```

- [ ] **Step 2: Adicionar o default**

In `src/context/ProjectConfigContext.ts`, replace:

```ts
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  spiSaudavel: 0.9,
  spiCritico: 0.75,
  agingUat: { alerta: 2, risco: 6 },
  agingCutover: { alerta: 3, risco: 8 },
};
```

with:

```ts
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  spiSaudavel: 0.9,
  spiCritico: 0.75,
  agingUat: { alerta: 2, risco: 6 },
  agingCutover: { alerta: 3, risco: 8 },
  evidenciaObrigatoriaIssue: true,
};
```

- [ ] **Step 3: Tornar o toggle real em `ConfigAttachmentsPanel`**

Replace the full content of `src/components/config/ConfigAttachmentsPanel.tsx`:

```tsx
import { useState } from "react";
import { useProjectConfig } from "../../context/ProjectConfigContext";

export default function ConfigAttachmentsPanel() {
  const { config, setConfig } = useProjectConfig();
  const [draft, setDraft] = useState(config.evidenciaObrigatoriaIssue);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setConfig({ ...config, evidenciaObrigatoriaIssue: draft });
    setSaved(true);
  }

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
        <input type="number" min="1" defaultValue={10} aria-label="Tamanho máximo por arquivo, em megabytes" /> MB
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
            <input
              type="checkbox"
              checked={draft}
              onChange={(event) => {
                setDraft(event.target.checked);
                setSaved(false);
              }}
            />
            <span className="track" />
          </span>
          Exigir evidência em issue impeditiva
        </label>
      </div>

      <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
        Salvar limite
      </button>
      {saved && <span className="saved-msg">Limite atualizado ✓</span>}
    </div>
  );
}
```

Só o segundo toggle ("Exigir evidência em issue impeditiva") vira controlado/real. O toggle de atividade e o input de tamanho máximo continuam exatamente como estavam (`defaultChecked`/sem `value`) — ligá-los é trabalho do subsistema "Ações de status da Atividade".

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/types/projectConfig.ts src/context/ProjectConfigContext.ts src/components/config/ConfigAttachmentsPanel.tsx
git commit -m "feat: wire evidenciaObrigatoriaIssue as a real ProjectConfig field"
```

## Context

`ConfigAttachmentsPanel` é rendido sem props dentro de `ProjectConfigPage` — nenhuma mudança de assinatura visível de fora. `useProjectConfig`/`ProjectConfigContext` já existem (spec de Papéis & Config); esta task só adiciona um campo booleano ao lado dos que já existem, seguindo o mesmo padrão rascunho+"Salvar" já usado em `ConfigThresholdsPanel.tsx` (que você pode ler como referência, mas não precisa modificar).

---

### Task 4: `RegisterIssueModal`

**Files:**
- Create: `src/components/issues/RegisterIssueModal.tsx`

- [ ] **Step 1: Criar o componente**

Create `src/components/issues/RegisterIssueModal.tsx`:

```tsx
import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { useProjectConfig } from "../../context/ProjectConfigContext";
import { toLocalIsoString } from "../../utils/activityIndicators";
import { ISSUE_TYPE_LABELS, ISSUE_IMPACT_LABELS } from "../../utils/issueIndicators";
import type { IssueType, IssueImpact, NewIssueInput } from "../../types/issue";
import type { Activity } from "../../types/activity";
import type { TeamMember } from "../../types/project";

interface RegisterIssueModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  activities: Activity[];
  currentActivity?: Activity;
  currentUserName: string;
  onCreate: (input: NewIssueInput) => void;
}

interface RegisterIssueFormState {
  relatedActivityId: string;
  title: string;
  description: string;
  type: IssueType;
  impeditiva: boolean;
  impact: IssueImpact;
  impactNote: string;
  dev: string;
  errorMsg: string | null;
}

function createEmptyState(): RegisterIssueFormState {
  return {
    relatedActivityId: "",
    title: "",
    description: "",
    type: "requisito",
    impeditiva: false,
    impact: "medio",
    impactNote: "",
    dev: "",
    errorMsg: null,
  };
}

const ISSUE_TYPE_OPTIONS: IssueType[] = [
  "requisito",
  "performance",
  "dados",
  "integracao",
  "interface",
  "configuracao",
  "outro",
];

const ISSUE_IMPACT_OPTIONS: IssueImpact[] = ["muito_alto", "alto", "medio", "baixo"];

function formatFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function RegisterIssueModal({
  show,
  onHide,
  team,
  activities,
  currentActivity,
  currentUserName,
  onCreate,
}: RegisterIssueModalProps) {
  const { config } = useProjectConfig();
  const [state, setState] = useState<RegisterIssueFormState>(createEmptyState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setState(createEmptyState());
    setSelectedFile(null);
    setDragOver(false);
    onHide();
  }

  function updateField<K extends keyof RegisterIssueFormState>(key: K, value: RegisterIssueFormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfirm() {
    const missing: string[] = [];
    if (!state.title.trim()) missing.push("Título da issue");
    if (!state.description.trim()) missing.push("Descrição da issue");
    if (!currentActivity && !state.relatedActivityId) missing.push("Atividade vinculada");
    if (!state.dev) missing.push("Desenvolvedor responsável");
    if (state.impeditiva && config.evidenciaObrigatoriaIssue && !selectedFile) {
      missing.push("Anexo (evidência obrigatória para issues impeditivas)");
    }
    if (missing.length > 0) {
      setState((prev) => ({ ...prev, errorMsg: `Preencha os campos obrigatórios: ${missing.join(", ")}.` }));
      return;
    }

    const linkedActivity = currentActivity ?? activities.find((activity) => activity.id === state.relatedActivityId);

    onCreate({
      title: state.title.trim(),
      description: state.description.trim(),
      type: state.type,
      impeditiva: state.impeditiva,
      impact: state.impact,
      impactNote: state.impactNote.trim(),
      tester: currentUserName,
      dev: state.dev,
      area: linkedActivity?.area ?? "",
      relatedActivityId: linkedActivity?.id ?? "",
      openingAttachment: selectedFile
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

  const devs = team.filter((member) => member.role === "Desenvolvedor");

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="register-issue-modal-title">
      <div className="modal-title" id="register-issue-modal-title">
        Registrar issue
      </div>

      {state.errorMsg && <div className="error-banner">{state.errorMsg}</div>}

      {!currentActivity && (
        <div className="form-group">
          <label className="form-label" htmlFor="register-issue-activity">
            Atividade vinculada
          </label>
          <select
            className="form-input"
            id="register-issue-activity"
            value={state.relatedActivityId}
            onChange={(event) => updateField("relatedActivityId", event.target.value)}
          >
            <option value="">Selecione…</option>
            {[...activities]
              .sort((a, b) => a.id.localeCompare(b.id))
              .map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.id} — {activity.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-title">
          Título da issue
        </label>
        <input
          className="form-input"
          type="text"
          id="register-issue-title"
          placeholder="Ex.: Alíquota incorreta na NF-e"
          value={state.title}
          onChange={(event) => updateField("title", event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-description">
          Descrição da issue
        </label>
        <textarea
          className="form-textarea"
          id="register-issue-description"
          placeholder="Descreva o problema encontrado"
          value={state.description}
          onChange={(event) => updateField("description", event.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="register-issue-type">
            Tipo
          </label>
          <select
            className="form-input"
            id="register-issue-type"
            value={state.type}
            onChange={(event) => updateField("type", event.target.value as IssueType)}
          >
            {ISSUE_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {ISSUE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="register-issue-impeditivo">
            Impeditivo
          </label>
          <select
            className="form-input"
            id="register-issue-impeditivo"
            value={state.impeditiva ? "sim" : "nao"}
            onChange={(event) => updateField("impeditiva", event.target.value === "sim")}
          >
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-impact">
          Categorização de impacto
        </label>
        <select
          className="form-input"
          id="register-issue-impact"
          value={state.impact}
          onChange={(event) => updateField("impact", event.target.value as IssueImpact)}
        >
          {ISSUE_IMPACT_OPTIONS.map((impact) => (
            <option key={impact} value={impact}>
              {ISSUE_IMPACT_LABELS[impact]}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-impact-note">
          Nota de impacto <span className="optional">(opcional)</span>
        </label>
        <input
          className="form-input"
          type="text"
          id="register-issue-impact-note"
          placeholder="Ex: interrompe a remessa de pagamentos aos fornecedores"
          value={state.impactNote}
          onChange={(event) => updateField("impactNote", event.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" id="register-issue-file-label">
          Anexo
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-labelledby="register-issue-file-label"
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
            {selectedFile ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})` : "Clique ou arraste um arquivo"}
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

      <div className="form-group">
        <label className="form-label" htmlFor="register-issue-dev">
          Desenvolvedor responsável
        </label>
        <select
          className="form-input"
          id="register-issue-dev"
          aria-label="Desenvolvedor responsável"
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

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Criar
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/issues/RegisterIssueModal.tsx
git commit -m "feat: add RegisterIssueModal component"
```

## Context

Este componente não é ligado a nenhuma página ainda — isso é as Tasks 5 e 6. `Modal`/`.form-group`/`.form-row`/`.form-textarea`/`.error-banner`/`.optional`/`.dropzone` já existem (Nova Atividade + Importar em massa). `ISSUE_TYPE_LABELS`/`ISSUE_IMPACT_LABELS` já existem em `src/utils/issueIndicators.ts`. `currentActivity` opcional (`?`) é o que diferencia as duas entradas: quando presente, o campo "Atividade vinculada" some e `relatedActivityId`/`area` vêm dela; quando ausente, aparece o `<select>` com todas as `activities`. `currentUserName` é passado pela página que abre o modal (cada página já tem sua própria constante local `CURRENT_USER_NAME`, por convenção deste projeto — não hardcode um valor aqui dentro do componente).

---

### Task 5: Refatorar `ActivityLinkedIssuesPanel` + ligar `ActivityDetailPage`

**Files:**
- Modify: `src/components/activities/ActivityLinkedIssuesPanel.tsx`
- Modify: `src/pages/ActivityDetailPage.tsx`

- [ ] **Step 1: `ActivityLinkedIssuesPanel` recebe `issues` como prop**

Replace the full content of `src/components/activities/ActivityLinkedIssuesPanel.tsx`:

```tsx
import { useNavigate } from "react-router";
import IssueStatusBadge from "../issues/IssueStatusBadge";
import { computeIssueAgingDays } from "../../utils/issueIndicators";
import type { Issue } from "../../types/issue";

interface ActivityLinkedIssuesPanelProps {
  activityId: string;
  projectId: string;
  issues: Issue[];
}

export default function ActivityLinkedIssuesPanel({ activityId, projectId, issues }: ActivityLinkedIssuesPanelProps) {
  const navigate = useNavigate();
  const linkedIssues = issues.filter((issue) => issue.relatedActivityId === activityId);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">
          Issues vinculadas <span>({linkedIssues.length})</span>
        </div>
      </div>
      {linkedIssues.length === 0 ? (
        <div className="empty-note">Nenhuma issue vinculada a esta atividade.</div>
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

(A única mudança real é: remove o `import { useIssues } from "../../hooks/useIssues";` e a chamada `const { issues } = useIssues(projectId);`, ganha `issues: Issue[]` como prop. Todo o resto do componente é idêntico.)

- [ ] **Step 2: `ActivityDetailPage` — levantar `useIssues`, `useProjects`, e ligar o botão**

Replace the full content of `src/pages/ActivityDetailPage.tsx`:

```tsx
import { useState } from "react";
import { useParams } from "react-router";
import ActivityStatusBadge from "../components/activities/ActivityStatusBadge";
import ActivityFieldGrid from "../components/activities/ActivityFieldGrid";
import ActivityAuditTrail from "../components/activities/ActivityAuditTrail";
import ActivityLinkedIssuesPanel from "../components/activities/ActivityLinkedIssuesPanel";
import ActivityAttachmentsPanel from "../components/activities/ActivityAttachmentsPanel";
import ActivityPredecessorPanel from "../components/activities/ActivityPredecessorPanel";
import RegisterIssueModal from "../components/issues/RegisterIssueModal";
import { useActivities } from "../hooks/useActivities";
import { useIssues } from "../hooks/useIssues";
import { useProjects } from "../hooks/useProjects";
import { useGoBack } from "../hooks/useGoBack";
import { retestPillClass } from "../utils/activityIndicators";
import { deriveActivityAuditTrail } from "../utils/activityAuditTrail";

const CURRENT_USER_NAME = "Guilherme Fabretti";

export default function ActivityDetailPage() {
  const { id, activityId } = useParams();
  const projectId = id ?? "";
  const { activities } = useActivities(projectId);
  const { issues, createIssue } = useIssues(projectId);
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);
  const activity = activities.find((item) => item.id === activityId);
  const goBack = useGoBack(`/projetos/${projectId}/atividades`);
  const [showRegisterIssueModal, setShowRegisterIssueModal] = useState(false);

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

  const auditEntries = deriveActivityAuditTrail(activity);

  // Calculado independente do status — usado tanto pro painel "Predecessor" (só quando
  // aguardando) quanto pelos anexos herdados (só quando bloqueado, ver
  // ActivityAttachmentsPanel).
  const predecessorActivity =
    activity.predecessors.length > 0 ? (activities.find((item) => item.id === activity.predecessors[0]) ?? null) : null;
  const showPredecessorPanel = activity.status === "aguardando" && predecessorActivity !== null;

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
            {activity.retestCount > 0 && (
              <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}× reteste</span>
            )}
          </div>

          {showPredecessorPanel && predecessorActivity && (
            <div className="info-banner">
              ⏳ Aguardando conclusão do predecessor <b>{predecessorActivity.id}</b> para liberar o início desta
              atividade.
            </div>
          )}
          {activity.status === "concluido" && (
            <div className="info-banner">✅ Atividade concluída. Nenhuma ação pendente.</div>
          )}

          {activity.status === "bloqueado" && (
            <button
              type="button"
              className="btn"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
              onClick={() => setShowRegisterIssueModal(true)}
            >
              Registrar nova issue
            </button>
          )}
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

          <ActivityFieldGrid activity={activity} />
          <ActivityAuditTrail entries={auditEntries} />
        </div>

        <div className="activity-side">
          {showPredecessorPanel && predecessorActivity ? (
            <ActivityPredecessorPanel predecessor={predecessorActivity} projectId={projectId} />
          ) : (
            <>
              <ActivityLinkedIssuesPanel activityId={activity.id} projectId={projectId} issues={issues} />
              <ActivityAttachmentsPanel activity={activity} predecessor={predecessorActivity} />
            </>
          )}
        </div>
      </div>

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

"Concluir atividade"/"Rejeitar atividade" continuam intocados (decorativos) — subsistema "Ações de status da Atividade".

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 4: QA manual**

Run: `npm run dev`. Abrir uma atividade com status "Bloqueado" em `/projetos/:id/atividades/:activityId` — confirmar que o painel "Issues vinculadas" continua mostrando as issues certas (mesma lista de antes do refactor). Isso é possível verificar sem SSO real completo se você já estiver logado; se não, deixe para o QA humano da Task 7.

- [ ] **Step 5: Commit**

```bash
git add src/components/activities/ActivityLinkedIssuesPanel.tsx src/pages/ActivityDetailPage.tsx
git commit -m "refactor: lift useIssues into ActivityDetailPage, wire Registrar nova issue"
```

## Context

**Por que o refactor do painel é necessário, não opcional:** `ActivityLinkedIssuesPanel` chamava `useIssues(projectId)` por conta própria. Cada chamada de `useIssues()` tem seu próprio `useState` independente (mesma simplificação de todo hook mock deste projeto — não existe um store compartilhado). Se `ActivityDetailPage` também chamasse `useIssues()` só pro modal, seria uma SEGUNDA instância de estado, diferente da que o painel já usa — uma issue criada pelo modal apareceria pro `createIssue` daquela instância, mas o painel (lendo da outra instância) não veria a mudança até a página remontar. Levantar a única chamada de `useIssues()` para `ActivityDetailPage` e passar `issues` como prop pro painel resolve isso de vez.

**Skip live browser QA completo:** este app exige login SSO real (MSAL) sem bypass de dev — um subagente não consegue logar e testar o fluxo completo (criar issue → ver aparecer no painel) num navegador. Verificação desta task é `npx tsc -b`; QA funcional completo fica pra Task 7, com um humano.

---

### Task 6: Wire `ProjectIssuesPage`

**Files:**
- Modify: `src/pages/ProjectIssuesPage.tsx`

- [ ] **Step 1: Adicionar os imports**

Replace:

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

with:

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import IssuesKpiCards from "../components/issues/IssuesKpiCards";
import IssueStatusPills, { type IssueStatusFilter } from "../components/issues/IssueStatusPills";
import IssuesTable from "../components/issues/IssuesTable";
import RegisterIssueModal from "../components/issues/RegisterIssueModal";
import NavIcon from "../components/common/NavIcon";
import { useIssues } from "../hooks/useIssues";
import { useActivities } from "../hooks/useActivities";
import { useExportButton } from "../hooks/useExportButton";
import { useProjects } from "../hooks/useProjects";
import { sortIssuesByPriority } from "../utils/issueIndicators";
import { buildIssueExportRows, ISSUE_EXPORT_COLUMN_WIDTHS } from "../utils/issueExport";
import { downloadXlsx } from "../utils/downloadXlsx";
```

- [ ] **Step 2: Adicionar os hooks e o estado do modal**

Replace:

```ts
  const { id } = useParams();
  const projectId = id ?? "";
  const { issues } = useIssues(projectId);

  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>("todas");
  const [openedByMe, setOpenedByMe] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
```

with:

```ts
  const { id } = useParams();
  const projectId = id ?? "";
  const { issues, createIssue } = useIssues(projectId);
  const { activities } = useActivities(projectId);
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === projectId);

  const [statusFilter, setStatusFilter] = useState<IssueStatusFilter>("todas");
  const [openedByMe, setOpenedByMe] = useState(false);
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [showRegisterIssueModal, setShowRegisterIssueModal] = useState(false);
```

- [ ] **Step 3: Ligar o botão**

Replace:

```tsx
          <button type="button" className="btn btn-primary btn-sm">
            + Registrar issue
          </button>
```

with:

```tsx
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowRegisterIssueModal(true)}>
            + Registrar issue
          </button>
```

- [ ] **Step 4: Renderizar o modal**

Replace:

```tsx
      <IssuesTable issues={filteredIssues} projectId={projectId} />
    </div>
  );
}
```

with:

```tsx
      <IssuesTable issues={filteredIssues} projectId={projectId} />

      <RegisterIssueModal
        show={showRegisterIssueModal}
        onHide={() => setShowRegisterIssueModal(false)}
        team={currentProject?.team ?? []}
        activities={activities}
        currentUserName={CURRENT_USER_NAME}
        onCreate={createIssue}
      />
    </div>
  );
}
```

Sem `currentActivity` — este é o fluxo A, o campo "Atividade vinculada" aparece.

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProjectIssuesPage.tsx
git commit -m "feat: wire the Registrar issue modal into ProjectIssuesPage"
```

## Context

`CURRENT_USER_NAME` já existe nesta página (linha já existente, usada pelos toggles "Issues abertas por mim"/"comigo") — não precisa ser adicionada, só reaproveitada como prop do modal. `useActivities(projectId)` é novo aqui, só para popular o `<select>` de "Atividade vinculada".

**Skip live browser QA:** este app exige login SSO real (MSAL) sem bypass de dev — um subagente não consegue logar e testar num navegador. Verificação desta task é `npx tsc -b` e `npm run build` apenas; QA ao vivo fica pra Task 7, com um humano.

---

### Task 7: Build final

**Files:** nenhum (task de verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 2: QA manual (humano, login real)**

Run: `npm run dev`.

Em `/projetos/:id/issues`, "+ Registrar issue":
- Submeter vazio — banner lista Título, Descrição, Atividade vinculada, Desenvolvedor responsável.
- Preencher tudo (escolhendo uma atividade real do projeto) e confirmar — issue nova aparece na lista com status "Aberta", Tester = você (usuário atual).
- Marcar Impeditivo = Sim sem anexar nada — bloqueado (evidência obrigatória, padrão ligado). Anexar um arquivo e confirmar — passa.

Em `/projetos/:id/atividades/:id` de uma atividade **Bloqueada**, "Registrar nova issue":
- Modal abre sem o campo "Atividade vinculada".
- Preencher e confirmar — issue aparece **imediatamente** no painel "Issues vinculadas" da mesma tela, sem precisar sair e voltar.
- Abrir a issue criada em `/projetos/:id/issues/:issueId` — conferir que Área bate com a da atividade, e que "Categorização de impacto" mostra a nota de impacto digitada (`"{impacto} — {nota}"`).

Em `/projetos/:id/config`, aba "Limiares e Regras": desligar "Exigir evidência em issue impeditiva", salvar. Voltar pra Issues, registrar uma issue impeditiva sem anexo — agora passa sem exigir arquivo. Religar o toggle e confirmar que volta a bloquear.

Nenhum commit nesta task — é só verificação do que as Tasks 1-6 já commitaram.
