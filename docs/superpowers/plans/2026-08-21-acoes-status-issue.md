# Ações de status da Issue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar os botões hoje decorativos "Iniciar análise" e "Propor solução" em `IssueDetailPage` por transições de status reais.

**Architecture:** Dois mutators novos em `useIssues.ts` — `startAnalysis`/`proposeSolution` — primeiros mutators de **atualização** no hook (usam `.map()`, diferente de `createIssue`'s `[...prev, novo]`). "Propor solução" abre um modal reaproveitando o mesmo padrão de dropzone/formulário já usado 3x no projeto. `IssueAuditTrail` já lê os campos que esses mutators escrevem — zero mudança necessária nele. `IssueAttachmentsPanel` precisa de um pequeno ajuste: sua mensagem vazia atual ("aguardando o Dev propor uma solução") fica enganosa depois que a solução já foi proposta sem anexo, já que a evidência é opcional.

**Tech Stack:** React 19 + TypeScript. Sem suíte de testes automatizada (`CLAUDE.md`) — cada task fecha com `npx tsc -b` limpo; a verificação funcional final é QA manual via `npm run dev` (feita por um humano com login real — este app exige SSO real via Entra ID/MSAL, sem bypass de dev).

---

### Task 1: Mutators `startAnalysis`/`proposeSolution`

**Files:**
- Modify: `src/types/issue.ts`
- Modify: `src/hooks/useIssues.ts`

- [ ] **Step 1: Adicionar `ProposeSolutionInput`**

In `src/types/issue.ts`, right after the `NewIssueInput` interface (which ends with `openingAttachment: IssueAttachment | null;\n}`) and before `IssueStats`, add:

```ts
export interface ProposeSolutionInput {
  proposedSolution: string;
  solutionAttachment: IssueAttachment | null;
}
```

- [ ] **Step 2: Atualizar o import de tipos em `useIssues.ts`**

Replace line 2:

```ts
import type { Issue, IssueStats, NewIssueInput } from "../types/issue";
```

with:

```ts
import type { Issue, IssueStats, NewIssueInput, ProposeSolutionInput } from "../types/issue";
```

- [ ] **Step 3: Atualizar `UseIssuesResult`**

Replace:

```ts
interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
}
```

with:

```ts
interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
  startAnalysis: (issueId: string) => void;
  proposeSolution: (issueId: string, input: ProposeSolutionInput) => void;
}
```

- [ ] **Step 4: Adicionar os dois mutators e retorná-los**

Right after the `createIssue` function (which currently ends right before `return { issues, stats, createIssue };`), add:

```ts

  // Primeiros mutators de ATUALIZAÇÃO (não criação) do hook — usam .map() em vez de
  // [...prev, novo]. Mesma convenção de createIssue: sem validação própria, isso vive na UI.
  function startAnalysis(issueId: string): void {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? { ...issue, status: "em_analise", analysisStartedAt: toLocalIsoString(new Date()) }
          : issue
      )
    );
  }

  function proposeSolution(issueId: string, input: ProposeSolutionInput): void {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status: "solucao_proposta",
              proposedSolution: input.proposedSolution,
              solutionProposedAt: toLocalIsoString(new Date()),
              solutionAttachment: input.solutionAttachment,
            }
          : issue
      )
    );
  }
```

Then replace the final line:

```ts
  return { issues, stats, createIssue };
}
```

with:

```ts
  return { issues, stats, createIssue, startAnalysis, proposeSolution };
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/types/issue.ts src/hooks/useIssues.ts
git commit -m "feat: add startAnalysis and proposeSolution mutators to useIssues"
```

## Context

`toLocalIsoString` já está importado no topo de `useIssues.ts` (usado por `isoDaysAgo` e `createIssue`) — não precisa adicionar esse import. `deriveIssueAuditTrail` (`src/utils/issueAuditTrail.ts`) já lê `analysisStartedAt`/`solutionProposedAt` pra montar a trilha de auditoria — assim que esses campos passam a ser escritos de verdade, a trilha já funciona sozinha, sem precisar tocar nesse arquivo.

---

### Task 2: `ProposeSolutionModal`

**Files:**
- Create: `src/components/issues/ProposeSolutionModal.tsx`
- Modify: `src/components/issues/IssueAttachmentsPanel.tsx`

- [ ] **Step 1: Criar o componente**

Create `src/components/issues/ProposeSolutionModal.tsx`:

```tsx
import { useRef, useState } from "react";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { toLocalIsoString } from "../../utils/activityIndicators";
import type { ProposeSolutionInput } from "../../types/issue";

interface ProposeSolutionModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ProposeSolutionInput) => void;
}

function formatFileSize(sizeBytes: number): string {
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

export default function ProposeSolutionModal({ show, onHide, currentUserName, onSubmit }: ProposeSolutionModalProps) {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setText("");
    setSelectedFile(null);
    setDragOver(false);
    setErrorMsg(null);
    onHide();
  }

  function handleConfirm() {
    if (!text.trim()) {
      setErrorMsg("Preencha a solução proposta antes de continuar.");
      return;
    }

    onSubmit({
      proposedSolution: text.trim(),
      solutionAttachment: selectedFile
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

  return (
    <Modal open={show} onClose={resetAndHide} labelledBy="propose-solution-modal-title">
      <div className="modal-title" id="propose-solution-modal-title">
        Propor solução
      </div>
      <div className="modal-subtitle">
        Descreva o que foi feito para resolver o problema, ou a orientação a seguir. A evidência é opcional.
      </div>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      <div className="form-group">
        <label className="form-label" htmlFor="propose-solution-text">
          Solução proposta
        </label>
        <textarea
          className="form-textarea"
          id="propose-solution-text"
          placeholder="Ex.: Ajustada a regra de determinação de alíquota no cadastro fiscal do fornecedor…"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setErrorMsg(null);
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label" id="propose-solution-file-label">
          Evidência <span className="optional">(opcional)</span>
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-labelledby="propose-solution-file-label"
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
            {selectedFile
              ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
              : "Clique ou arraste um print/arquivo (opcional)"}
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

      <div className="modal-actions">
        <button type="button" className="btn" onClick={resetAndHide}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" onClick={handleConfirm}>
          Propor solução
        </button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Corrigir a mensagem vazia em `IssueAttachmentsPanel`**

In `src/components/issues/IssueAttachmentsPanel.tsx`, replace:

```tsx
      {issue.solutionAttachment ? (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Anexo da solução <span>enviado pelo Dev</span>
            </div>
          </div>
          <AttachmentRow attachment={issue.solutionAttachment} role="Dev" />
        </div>
      ) : (
        <div className="empty-note">
          Anexo da solução ainda não existe — aguardando o Dev propor uma solução.
        </div>
      )}
```

with:

```tsx
      {issue.solutionAttachment ? (
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">
              Anexo da solução <span>enviado pelo Dev</span>
            </div>
          </div>
          <AttachmentRow attachment={issue.solutionAttachment} role="Dev" />
        </div>
      ) : issue.status === "aberta" || issue.status === "em_analise" ? (
        <div className="empty-note">
          Anexo da solução ainda não existe — aguardando o Dev propor uma solução.
        </div>
      ) : (
        <div className="empty-note">Nenhuma evidência anexada com a solução.</div>
      )}
```

Sem esse ajuste, uma solução proposta sem evidência (opcional, por design) continuaria mostrando "aguardando o Dev propor uma solução" mesmo depois de já proposta — mensagem enganosa. O texto do segundo caso (`"Nenhuma evidência anexada com a solução."`) é o mesmo já usado pelo protótipo para essa situação exata.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/issues/ProposeSolutionModal.tsx src/components/issues/IssueAttachmentsPanel.tsx
git commit -m "feat: add ProposeSolutionModal component"
```

## Context

`Modal`/`.form-group`/`.form-textarea`/`.error-banner`/`.optional`/`.dropzone` já existem (Nova Atividade, Importar em massa, Registrar Issue) — nenhuma classe SCSS nova é necessária. `NavIcon`/`toLocalIsoString` já existem e são usados no mesmo padrão exato de `RegisterIssueModal.tsx` (mesma dropzone, mesmo `aria-labelledby` correto desde o início — não precisa da correção que os ciclos anteriores precisaram, já está certo aqui). O componente `ProposeSolutionModal` não é ligado a nenhuma página ainda — isso é a Task 3.

---

### Task 3: Wire `IssueDetailPage`

**Files:**
- Modify: `src/pages/IssueDetailPage.tsx`

- [ ] **Step 1: Substituir o arquivo inteiro**

Replace the full content of `src/pages/IssueDetailPage.tsx`:

```tsx
import { useState } from "react";
import { useParams } from "react-router";
import IssueStatusBadge from "../components/issues/IssueStatusBadge";
import IssueFieldGrid from "../components/issues/IssueFieldGrid";
import IssueAuditTrail from "../components/issues/IssueAuditTrail";
import IssueAttachmentsPanel from "../components/issues/IssueAttachmentsPanel";
import ProposeSolutionModal from "../components/issues/ProposeSolutionModal";
import { useIssues } from "../hooks/useIssues";
import { useActivities } from "../hooks/useActivities";
import { useGoBack } from "../hooks/useGoBack";
import { deriveIssueAuditTrail } from "../utils/issueAuditTrail";

const CURRENT_USER_NAME = "Guilherme Fabretti";

export default function IssueDetailPage() {
  const { id, issueId } = useParams();
  const projectId = id ?? "";
  const { issues, startAnalysis, proposeSolution } = useIssues(projectId);
  const { activities } = useActivities(projectId);
  const issue = issues.find((item) => item.id === issueId);
  const goBack = useGoBack(`/projetos/${projectId}/issues`);
  const [showProposeSolutionModal, setShowProposeSolutionModal] = useState(false);

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
              onClick={() => startAnalysis(issue.id)}
            >
              Iniciar análise
            </button>
          )}
          {issue.status === "em_analise" && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}
              onClick={() => setShowProposeSolutionModal(true)}
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

      <ProposeSolutionModal
        show={showProposeSolutionModal}
        onHide={() => setShowProposeSolutionModal(false)}
        currentUserName={CURRENT_USER_NAME}
        onSubmit={(input) => proposeSolution(issue.id, input)}
      />
    </div>
  );
}
```

O único ponto de atenção: `startAnalysis`/`proposeSolution` vêm da MESMA chamada `useIssues(projectId)` que já alimenta `issues`/`issue` nesta página — não há instância nova, então não existe o risco de dessincronia que apareceu no ciclo de Registrar Issue (`ActivityLinkedIssuesPanel`). `IssueFieldGrid`/`IssueAuditTrail`/`IssueAttachmentsPanel` continuam recebendo `issue` como já recebiam — como `issue` é recalculado a cada render a partir do array `issues` (que muda de referência quando um mutator roda), a UI atualiza sozinha assim que `startAnalysis`/`proposeSolution` são chamados, sem navegação.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/IssueDetailPage.tsx
git commit -m "feat: wire Iniciar análise and Propor solução actions into IssueDetailPage"
```

## Context

**Skip live browser QA:** este app exige login SSO real (MSAL) sem bypass de dev — um subagente não consegue logar e testar num navegador. Verificação desta task é `npx tsc -b` e `npm run build` apenas; QA ao vivo fica pra Task 4, com um humano.

---

### Task 4: Build final

**Files:** nenhum (task de verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 2: QA manual (humano, login real)**

Run: `npm run dev`. Abrir uma issue com status "Aberta" em `/projetos/:id/issues/:issueId`:
- Clicar "Iniciar análise" — status vira "Em análise" na hora, sem reload; a trilha de auditoria mostra "Aberta → Em análise" com o horário correto.
- Clicar "Propor solução", submeter vazio — banner de erro, modal não fecha.
- Preencher a solução sem anexo e confirmar — status vira "Solução proposta"; painel de anexos mostra "Nenhuma evidência anexada com a solução." (não mais a mensagem de "aguardando"); banner "Aguardando reteste..." aparece.
- Repetir com um anexo — painel de anexos mostra a evidência da solução (nome do arquivo, tamanho, enviado por você).
- Trilha de auditoria mostra "Em análise → Solução proposta" com o horário certo.

Nenhum commit nesta task — é só verificação do que as Tasks 1-3 já commitaram.
