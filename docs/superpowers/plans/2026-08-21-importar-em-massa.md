# Importar em massa (modal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o botão "Importar em massa" hoje decorativo (`ProjectActivitiesPage`) por um modal real: baixar modelo `.xlsx`, enviar uma planilha, validar linha a linha e criar as atividades válidas.

**Architecture:** Uma util pura (`activityImport.ts`) faz o parsing/validação (`parseActivityImportRows`) e a geração do modelo (`downloadActivityImportTemplate`), reaproveitando `xlsx` (já instalado desde o Exportar) e `toLocalIsoString` (mesma técnica anti-fuso-horário da Nova Atividade). O modal (`ImportActivitiesModal.tsx`) é a primeira dropzone de arquivo do projeto. Nenhuma mudança em `useActivities.ts`: como `createActivity` já usa `setActivities` na forma funcional, chamá-lo em loop dentro do mesmo handler gera IDs sequenciais corretos sem precisar de um mutator em lote.

**Tech Stack:** React 19 + TypeScript, `xlsx` (já instalado). Sem suíte de testes automatizada (`CLAUDE.md`) — cada task fecha com `npx tsc -b` limpo; a verificação funcional final é QA manual via `npm run dev` (feita por um humano com login real — este app exige SSO real via Entra ID/MSAL, sem bypass de dev).

---

### Task 1: `activityImport.ts`

**Files:**
- Create: `src/utils/activityImport.ts`

- [ ] **Step 1: Criar a util**

Create `src/utils/activityImport.ts`:

```ts
import * as XLSX from "xlsx";
import { toLocalIsoString } from "./activityIndicators";
import type { NewActivityInput } from "../types/activity";
import type { TeamMember } from "../types/project";

export interface ActivityImportResult {
  valid: NewActivityInput[];
  errors: string[];
}

const HEADER_ALIASES = {
  name: ["Nome"],
  module: ["Módulo", "Modulo"],
  process: ["Processo"],
  tester: ["Tester"],
  dev: ["Desenvolvedor", "Dev"],
  plannedStart: ["Início Planejado", "Inicio Planejado"],
  plannedEnd: ["Conclusão Planejada", "Conclusao Planejada"],
  predecessors: ["Predecessores"],
  wbs: ["WBS"],
  area: ["Área", "Area"],
  system: ["Sistema"],
  transaction: ["Transação", "Transacao"],
  expectedResult: ["Resultado Esperado"],
  notes: ["Observações", "Observacoes"],
} as const;

function getRawField(row: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function getField(row: Record<string, unknown>, keys: readonly string[]): string {
  const value = getRawField(row, keys);
  return value === undefined ? "" : String(value).trim();
}

// Aceita Date real (célula de data do Excel, quando XLSX.read usa cellDates:true) ou texto
// "DD/MM/AAAA". Sempre monta a data local (new Date(ano, mes-1, dia)) antes de formatar —
// nunca `new Date(string)`, que é interpretado como UTC-midnight e pode exibir o dia
// anterior em UTC-3 (mesma classe de bug já corrigida em isOverdue/toLocalIsoString e na
// Nova Atividade).
function parseImportDate(value: unknown): string | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return toLocalIsoString(value);
  }
  const text = String(value ?? "").trim();
  const match = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match;
  return toLocalIsoString(new Date(Number(year), Number(month) - 1, Number(day)));
}

function resolvePersonName(raw: string, candidates: TeamMember[]): string | null {
  if (!raw) return null;
  const match = candidates.find((member) => member.name.toLowerCase() === raw.toLowerCase());
  return match ? match.name : null;
}

export function parseActivityImportRows(rows: Record<string, unknown>[], team: TeamMember[]): ActivityImportResult {
  const testers = team.filter((member) => member.role === "Tester");
  const devs = team.filter((member) => member.role === "Desenvolvedor");
  const valid: NewActivityInput[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const lineNo = index + 2; // +1 cabeçalho, +1 índice base-1
    const problems: string[] = [];

    const name = getField(row, HEADER_ALIASES.name);
    if (!name) problems.push("nome vazio");

    const activityModule = getField(row, HEADER_ALIASES.module);
    if (!activityModule) problems.push("módulo vazio");

    const process = getField(row, HEADER_ALIASES.process);
    if (!process) problems.push("processo vazio");

    const testerRaw = getField(row, HEADER_ALIASES.tester);
    const tester = resolvePersonName(testerRaw, testers);
    if (!tester) problems.push(`tester "${testerRaw}" não reconhecido`);

    const devRaw = getField(row, HEADER_ALIASES.dev);
    const dev = resolvePersonName(devRaw, devs);
    if (!dev) problems.push(`desenvolvedor "${devRaw}" não reconhecido`);

    const plannedStart = parseImportDate(getRawField(row, HEADER_ALIASES.plannedStart));
    if (!plannedStart) problems.push("início planejado inválido");

    const plannedEnd = parseImportDate(getRawField(row, HEADER_ALIASES.plannedEnd));
    if (!plannedEnd) problems.push("conclusão planejada inválida");

    if (problems.length > 0) {
      errors.push(`Linha ${lineNo}: ${problems.join("; ")}.`);
      return;
    }

    valid.push({
      name,
      module: activityModule,
      process,
      // tester/dev/plannedStart/plannedEnd já são garantidamente não-nulos aqui — se algum
      // fosse null, a linha já teria caído em `problems` e retornado acima.
      tester: tester!,
      dev: dev!,
      plannedStart: plannedStart!,
      plannedEnd: plannedEnd!,
      predecessors: getField(row, HEADER_ALIASES.predecessors)
        .split(";")
        .map((id) => id.trim())
        .filter(Boolean),
      wbs: getField(row, HEADER_ALIASES.wbs),
      area: getField(row, HEADER_ALIASES.area),
      system: getField(row, HEADER_ALIASES.system),
      transaction: getField(row, HEADER_ALIASES.transaction),
      expectedResult: getField(row, HEADER_ALIASES.expectedResult),
      notes: getField(row, HEADER_ALIASES.notes) || null,
    });
  });

  return { valid, errors };
}

const TEMPLATE_HEADERS = [
  "Nome",
  "Módulo",
  "Processo",
  "Tester",
  "Desenvolvedor",
  "Início Planejado",
  "Conclusão Planejada",
  "Predecessores",
  "WBS",
  "Área",
  "Sistema",
  "Transação",
  "Resultado Esperado",
  "Observações",
];

const TEMPLATE_EXAMPLE_ROW = [
  "Validar cálculo de crédito ICMS",
  "Fiscal",
  "Apuração de ICMS",
  "Nome do tester do projeto",
  "Nome do desenvolvedor do projeto",
  "02/07/2026",
  "18/07/2026",
  "",
  "1.2.3",
  "Fiscal",
  "SAP ECC",
  "FB60",
  "Sistema calcula o crédito corretamente",
  "",
];

export function downloadActivityImportTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Modelo");
  XLSX.writeFile(wb, "hive_modelo_importacao_atividades.xlsx");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/utils/activityImport.ts
git commit -m "feat: add activityImport util (row validation + template download)"
```

---

### Task 2: SCSS da dropzone + `ImportActivitiesModal`

**Files:**
- Modify: `src/styles/_modal.scss`
- Create: `src/components/activities/ImportActivitiesModal.tsx`

- [ ] **Step 1: Adicionar as 3 classes novas ao SCSS**

In `src/styles/_modal.scss`, replace:

```scss
.error-banner {
  background-color: c.$red-soft;
  color: c.$red;
  border: 1px solid rgba(198, 55, 63, 0.25);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 10px;
}

@media (max-width: 640px) {
```

with:

```scss
.error-banner {
  background-color: c.$red-soft;
  color: c.$red;
  border: 1px solid rgba(198, 55, 63, 0.25);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 10px;
}

// Primeira dropzone de arquivo do projeto (Importar em massa)
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  border: 1.5px dashed c.$border-strong;
  border-radius: 10px;
  color: c.$text-faint;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  background-color: c.$bg-alt;
}
.dropzone svg {
  width: 22px;
  height: 22px;
}
.dropzone.drag-over {
  border-color: c.$text-dim;
  background-color: c.$surface;
}
.dropzone.has-file {
  color: c.$text-dim;
  border-style: solid;
}

.import-ref {
  margin-bottom: 14px;
  font-size: 11.5px;
}
.import-ref summary {
  cursor: pointer;
  color: c.$text-dim;
  font-weight: 600;
}
.import-ref-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: c.$text-faint;
}
.import-ref-list b {
  color: c.$text-dim;
}

.import-result-banner {
  display: none;
  background-color: c.$red-soft;
  color: c.$red;
  border: 1px solid rgba(198, 55, 63, 0.25);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  margin-bottom: 14px;
}
.import-result-banner.show {
  display: block;
}
.import-result-banner.success {
  background-color: c.$green-soft;
  color: c.$green;
  border-color: rgba(47, 143, 91, 0.25);
}
.import-result-banner ul {
  margin: 4px 0 0;
  padding-left: 18px;
}

@media (max-width: 640px) {
```

- [ ] **Step 2: Criar o componente**

Create `src/components/activities/ImportActivitiesModal.tsx`:

```tsx
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import Modal from "../common/Modal";
import NavIcon from "../common/NavIcon";
import { parseActivityImportRows, downloadActivityImportTemplate } from "../../utils/activityImport";
import type { NewActivityInput } from "../../types/activity";
import type { TeamMember } from "../../types/project";

interface ImportActivitiesModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  onImport: (inputs: NewActivityInput[]) => void;
}

interface ImportResult {
  success: boolean;
  summary: string;
  errors: string[];
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function isAcceptedExtension(fileName: string): boolean {
  return /\.(xlsx|xls)$/i.test(fileName);
}

export default function ImportActivitiesModal({ show, onHide, team, onImport }: ImportActivitiesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetAndHide() {
    setSelectedFile(null);
    setDragOver(false);
    setResult(null);
    setImporting(false);
    onHide();
  }

  function handleFileSelected(file: File) {
    if (!isAcceptedExtension(file.name)) {
      setSelectedFile(null);
      setResult({ success: false, summary: "Formato de arquivo não suportado. Envie um .xlsx ou .xls.", errors: [] });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setResult({ success: false, summary: "Arquivo muito grande (máximo 5MB).", errors: [] });
      return;
    }
    setSelectedFile(file);
    setResult(null);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
        defval: "",
      });
      const { valid, errors } = parseActivityImportRows(rows, team);

      if (valid.length > 0) {
        onImport(valid);
      }

      setResult({
        success: errors.length === 0,
        summary: `${valid.length} atividade(s) importada(s) com sucesso.`,
        errors,
      });
      setSelectedFile(null);
    } catch {
      setResult({
        success: false,
        summary: "Não foi possível ler o arquivo. Confirme se é um .xlsx válido, seguindo o modelo.",
        errors: [],
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal open={show} onClose={resetAndHide} wide labelledBy="import-activities-modal-title">
      <div className="modal-title" id="import-activities-modal-title">
        Importar atividades em massa
      </div>
      <div className="modal-subtitle">
        Envie a planilha (.xlsx) com a carga de atividades. Predecessores devem referenciar IDs já existentes no
        sistema (ex: ATV-1042).
      </div>

      <button type="button" className="btn btn-sm" style={{ marginBottom: 14 }} onClick={downloadActivityImportTemplate}>
        <NavIcon>
          <path d="M12 3v12m0 0-4-4m4 4 4-4" />
          <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
        </NavIcon>
        Baixar modelo (.xlsx)
      </button>

      <details className="import-ref">
        <summary>Ver descrição dos campos da carga</summary>
        <div className="import-ref-list">
          <div>
            <b>Nome</b> — nome da atividade (obrigatório).
          </div>
          <div>
            <b>Módulo</b> — nível 1 da hierarquia (obrigatório).
          </div>
          <div>
            <b>Processo</b> — nível 2 da hierarquia, dentro do módulo (obrigatório).
          </div>
          <div>
            <b>Tester</b> — precisa bater com um nome do time do projeto com papel Tester (obrigatório).
          </div>
          <div>
            <b>Desenvolvedor</b> — precisa bater com um nome do time do projeto com papel Desenvolvedor (obrigatório).
          </div>
          <div>
            <b>Início Planejado</b> — data planejada de início (DD/MM/AAAA ou célula de data do Excel).
          </div>
          <div>
            <b>Conclusão Planejada</b> — data planejada de conclusão (DD/MM/AAAA ou célula de data do Excel).
          </div>
          <div>
            <b>Predecessores</b> — IDs de atividades já existentes das quais esta depende, separados por ";"
            (opcional; ex.: ATV-1042; ATV-1050).
          </div>
          <div>
            <b>WBS</b> — código da estrutura analítica do projeto (opcional).
          </div>
          <div>
            <b>Área</b> — área de negócio envolvida (opcional).
          </div>
          <div>
            <b>Sistema</b> — sistema onde o teste é executado (opcional).
          </div>
          <div>
            <b>Transação</b> — transação/código específico do sistema (opcional).
          </div>
          <div>
            <b>Resultado Esperado</b> — o que deve acontecer quando o teste for bem-sucedido (opcional).
          </div>
          <div>
            <b>Observações</b> — informações adicionais sobre a atividade (opcional).
          </div>
        </div>
      </details>

      <div className="form-group">
        <label className="form-label" htmlFor="import-activities-file-input">
          Arquivo da carga
        </label>
        <div
          className={`dropzone${dragOver ? " drag-over" : ""}${selectedFile ? " has-file" : ""}`}
          role="button"
          tabIndex={0}
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
            if (file) handleFileSelected(file);
          }}
        >
          <NavIcon>
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </NavIcon>
          <span>
            {selectedFile
              ? `${selectedFile.name} (${Math.ceil(selectedFile.size / 1024)} KB)`
              : "Clique ou arraste o arquivo .xlsx da carga"}
          </span>
        </div>
        <input
          ref={fileInputRef}
          id="import-activities-file-input"
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelected(file);
            event.target.value = "";
          }}
        />
      </div>

      {result && (
        <div className={`import-result-banner show${result.success ? " success" : ""}`}>
          <div>{result.summary}</div>
          {result.errors.length > 0 && (
            <ul>
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary modal-submit"
        disabled={!selectedFile || importing}
        onClick={handleImport}
      >
        {importing ? "Importando…" : "Importar atividades"}
      </button>
    </Modal>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/styles/_modal.scss src/components/activities/ImportActivitiesModal.tsx
git commit -m "feat: add ImportActivitiesModal component"
```

## Context

`Modal.tsx`, `.form-group`/`.form-label` já existem (Nova Atividade). `parseActivityImportRows`/`downloadActivityImportTemplate` vêm de `activityImport.ts` (Task 1). Este componente não é ligado a nenhuma página ainda — isso é a Task 3. `XLSX.read`/`XLSX.utils.sheet_to_json` são chamados aqui (não em `activityImport.ts`) porque `activityImport.ts` recebe as linhas já parseadas (`Record<string, unknown>[]`) — mantém a util testável sem precisar simular um `ArrayBuffer`.

---

### Task 3: Wire `ProjectActivitiesPage`

**Files:**
- Modify: `src/pages/ProjectActivitiesPage.tsx`

- [ ] **Step 1: Adicionar os imports**

Replace:

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

with:

```ts
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import ActivityStatChips, { type ActivityStatChipKey } from "../components/activities/ActivityStatChips";
import ActivityFiltersBar from "../components/activities/ActivityFiltersBar";
import ActivityGroupToggle from "../components/activities/ActivityGroupToggle";
import ActivitiesTable from "../components/activities/ActivitiesTable";
import ImportActivitiesModal from "../components/activities/ImportActivitiesModal";
import NewActivityModal from "../components/activities/NewActivityModal";
import NavIcon from "../components/common/NavIcon";
import { useActivities } from "../hooks/useActivities";
import { useExportButton } from "../hooks/useExportButton";
import { useProjects } from "../hooks/useProjects";
import { filterActivities } from "../utils/filterActivities";
import { groupByModuleProcess } from "../utils/groupActivities";
import { buildActivityExportRows, ACTIVITY_EXPORT_COLUMN_WIDTHS } from "../utils/activityExport";
import { downloadXlsx } from "../utils/downloadXlsx";
import type { ActivityFiltersState, ActivityGroupMode, NewActivityInput } from "../types/activity";
```

- [ ] **Step 2: Adicionar o estado do modal**

Replace:

```ts
  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
```

with:

```ts
  const [filters, setFilters] = useState<ActivityFiltersState>(createEmptyFilters);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
```

- [ ] **Step 3: Adicionar o handler de importação**

Right after the `toggleAllModules` function (right before the `return (` that starts the JSX), add:

```ts

  function handleImportActivities(inputs: NewActivityInput[]) {
    inputs.forEach((input) => createActivity(input));
  }
```

- [ ] **Step 4: Ligar o botão**

Replace:

```tsx
          <button type="button" className="btn btn-outline-secondary btn-sm">
            Importar em massa
          </button>
```

with:

```tsx
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowImportModal(true)}>
            Importar em massa
          </button>
```

- [ ] **Step 5: Renderizar o modal**

Replace:

```tsx
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

with:

```tsx
      <NewActivityModal
        show={showNewActivityModal}
        onHide={() => setShowNewActivityModal(false)}
        team={currentProject?.team ?? []}
        onCreate={createActivity}
      />

      <ImportActivitiesModal
        show={showImportModal}
        onHide={() => setShowImportModal(false)}
        team={currentProject?.team ?? []}
        onImport={handleImportActivities}
      />
    </div>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/pages/ProjectActivitiesPage.tsx
git commit -m "feat: wire the Importar em massa modal into ProjectActivitiesPage"
```

## Context (for whoever implements Task 3)

`createActivity` já vem de `useActivities(projectId)` (linha já existente desde a Nova Atividade). `handleImportActivities` só chama `createActivity` uma vez por item válido — nenhuma mudança em `useActivities.ts` é necessária (ver "Architecture" no topo do plano para o porquê disso ser seguro).

**Skip live browser QA:** este app exige login SSO real (MSAL) sem bypass de dev — um subagente não consegue logar e testar num navegador. Verificação desta task é `npx tsc -b` e `npm run build` apenas; QA ao vivo fica pra um humano depois.

---

### Task 4: Build final

**Files:** nenhum (task de verificação)

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: sem erros.

- [ ] **Step 2: QA manual (humano, login real)**

Run: `npm run dev`, abrir `/projetos/:id/atividades`, clicar "Importar em massa":
- "Baixar modelo (.xlsx)" — baixa um `.xlsx` com cabeçalho + 1 linha de exemplo.
- Preencher o modelo com 3 linhas válidas (Tester/Dev batendo com nomes reais do time do projeto atual) e importar — banner verde "3 atividade(s) importada(s) com sucesso.", as 3 aparecem na lista de Atividades.
- Editar a planilha pra ter 1 linha com Tester desconhecido e reimportar — banner (não-verde) mostra "2 atividade(s) importada(s)" + 1 erro de linha citando o tester não reconhecido; as 2 boas ainda entram.
- Tentar importar um `.txt` renomeado pra `.xlsx` — banner de erro genérico ("Não foi possível ler o arquivo..."), nada é criado.
- Tentar selecionar um `.docx` de verdade — bloqueado pela guarda de extensão antes de tentar ler (mensagem "Formato de arquivo não suportado").
- Conferir que os IDs das atividades importadas em lote são sequenciais e não colidem com atividades já existentes (nem com uma criada via Nova Atividade na mesma sessão).
- Conferir que uma linha com data em texto (`02/07/2026`) e outra com célula de data real do Excel resultam na mesma data no detalhe da atividade, sem deslocar um dia.
- Fechar o modal (X) no meio de um resultado e reabrir — estado limpo (sem arquivo/resultado da vez anterior).

Nenhum commit nesta task — é só verificação do que as Tasks 1-3 já commitaram.
