# Fidelidade Visual — Atividades + Nav Dock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever a camada visual (e, onde a interação exige, a marcação) da tela "Atividades" e do nav dock do subsistema "Projeto Específico" para bater com o mockup original `HIVE - Telas Projeto Específico.html`, incluindo a logo da marca (abelha).

**Architecture:** Mesma base de sempre — `react-bootstrap` (Dropdown, Table, Form.Check, Form.Control, Button) onde sua marcação padrão já se encaixa, com SCSS próprio sobrescrevendo classes geradas. Onde o padrão de interação do mockup diverge estruturalmente do que existe hoje (nav dock vira botão+painel dropdown, chips de stat mudam de layout, agrupamento vira dropdown único), a marcação `.tsx` muda junto.

**Tech Stack:** React 19, TypeScript, react-bootstrap (Dropdown, Table, Form, Button), react-router v8, SCSS.

**No automated tests neste plano** — mesma decisão das specs anteriores; verificação é `npx tsc -b` após cada task, mais uma passada de QA manual comparando com o mockup na task final.

---

## File Structure Overview

```
src/
├── utils/
│   └── initials.ts                                # new
├── components/
│   ├── common/
│   │   ├── BeeMark.tsx                             # new
│   │   ├── NavIcon.tsx                             # new
│   │   └── FooterWidgetContent.tsx                 # new
│   ├── projects/
│   │   └── FooterWidget.tsx                        # modified — usa FooterWidgetContent
│   ├── project-nav/
│   │   └── ProjectNavDock.tsx                      # reescrito — botão+painel dropdown
│   └── activities/
│       ├── ActivityStatusBadge.tsx                 # modified — pílula + bolinha
│       ├── ActivityStatChips.tsx                   # modified — mini-card vertical
│       ├── MultiSelectFilter.tsx                   # modified — estilo pílula+chevron+has-value
│       ├── ActivityModuleProcessFilter.tsx         # modified — idem
│       ├── ActivityDateRangeFilter.tsx             # reescrito — dropdown com switch
│       ├── ActivityFiltersBar.tsx                  # modified — busca/"Limpar todos"/clearAll/prop de período
│       ├── ActivityGroupToggle.tsx                 # reescrito — dropdown único
│       ├── ActivityRow.tsx                         # reescrito — colunas separadas, avatar, reteste, atraso
│       ├── ActivityTreeRows.tsx                    # modified — colSpan 12, mini-progress, indent
│       ├── ActivityGroupRows.tsx                   # modified — colSpan 12, migalha
│       └── ActivitiesTable.tsx                     # modified — novo cabeçalho de 13 colunas
├── pages/
│   └── ProjectActivitiesPage.tsx                   # modified — botões decorativos, toggle-pill, dateRangeEnabled
├── types/
│   └── activity.ts                                 # modified — + dateRangeEnabled
└── styles/
    ├── _activities.scss                             # muito estendido
    └── _project-nav-dock.scss                       # reescrito
```

---

### Task 1: Ícones compartilhados — `BeeMark` e `NavIcon`

**Files:**
- Create: `src/components/common/BeeMark.tsx`
- Create: `src/components/common/NavIcon.tsx`

- [ ] **Step 1: Criar o SVG da marca (abelha)**

`src/components/common/BeeMark.tsx`:
```tsx
export default function BeeMark() {
  return (
    <svg className="bee-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <ellipse cx="16" cy="18" rx="8" ry="7" fill="#1F2024" />
      <path d="M8 18a8 7 0 0 1 16 0" fill="none" />
      <rect x="8.2" y="14.4" width="15.6" height="2.4" fill="#FFE36E" />
      <rect x="8.6" y="19.6" width="14.8" height="2.4" fill="#FFE36E" />
      <ellipse cx="16" cy="18" rx="8" ry="7" fill="none" stroke="#1F2024" strokeWidth="1.2" />
      <path d="M9 11c1.5-3 4-4 7-4s5.5 1 7 4" stroke="#1F2024" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <circle cx="12.5" cy="16.5" r="1.1" fill="#1F2024" />
      <ellipse cx="8" cy="12" rx="3.4" ry="2.4" transform="rotate(-30 8 12)" fill="rgba(255,255,255,.55)" stroke="#1F2024" strokeWidth=".8" />
      <ellipse cx="24" cy="12" rx="3.4" ry="2.4" transform="rotate(30 24 12)" fill="rgba(255,255,255,.55)" stroke="#1F2024" strokeWidth=".8" />
    </svg>
  );
}
```

(SVG idêntico ao `.bee-mark` do mockup `HIVE - Telas Projeto Específico.html`, linhas 761-770 — só os atributos `stroke-width`/`stroke-linecap` viraram `strokeWidth`/`strokeLinecap` para JSX.)

- [ ] **Step 2: Criar o wrapper genérico de ícone de linha (24×24, `currentColor`)**

`src/components/common/NavIcon.tsx`:
```tsx
import type { ReactNode } from "react";

interface NavIconProps {
  className?: string;
  children: ReactNode;
}

export default function NavIcon({ className, children }: NavIconProps) {
  return (
    <svg
      className={className ? `nav-icon ${className}` : "nav-icon"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/common/BeeMark.tsx src/components/common/NavIcon.tsx
git commit -m "feat: add shared BeeMark and NavIcon icon components"
```

## Context

Task 1 de 16 de uma passada de fidelidade visual sobre a tela "Atividades" e o nav dock (spec: `docs/superpowers/specs/2026-08-12-activities-visual-fidelity-design.md`). `BeeMark` é o SVG exato da marca extraído do mockup original (`HIVE - Telas Projeto Específico.html`, arquivo do usuário, não versionado no repo) — cores fixas (`#1F2024`/`#FFE36E`), sem props, ícone estático. Vai ser consumido em dois lugares (Task 2 — `FooterWidget`; Task 14 — `ProjectNavDock`), o que já justifica extraí-lo agora em vez de duplicar depois. `NavIcon` é um wrapper fino para os ~7 ícones de linha estilo Lucide (24×24, `stroke-width:2`, `fill:none`, `stroke:currentColor`) que os Tasks 14 (itens do nav dock) e 13 (botão "Exportar") vão usar — evita repetir esses 4 atributos SVG em cada ícone individual. Nenhum dos dois componentes é consumido ainda nesta task — só criados, prontos para os tasks seguintes.

---

### Task 2: `initials` util + `FooterWidgetContent` + `FooterWidget` usa a marca

**Files:**
- Create: `src/utils/initials.ts`
- Create: `src/components/common/FooterWidgetContent.tsx`
- Modify: `src/components/projects/FooterWidget.tsx`

- [ ] **Step 1: Extrair o util de iniciais**

`src/utils/initials.ts`:
```ts
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
```

(Lógica idêntica à que já existia inline em `FooterWidget.tsx` — só extraída para ser reaproveitada pelo `ActivityRow`, Task 9.)

- [ ] **Step 2: Criar o conteúdo compartilhado do widget marca+usuário**

`src/components/common/FooterWidgetContent.tsx`:
```tsx
import BeeMark from "./BeeMark";
import { getInitials } from "../../utils/initials";

interface FooterWidgetContentProps {
  userName: string;
  userRole: string;
}

export default function FooterWidgetContent({ userName, userRole }: FooterWidgetContentProps) {
  return (
    <>
      <div className="d-flex align-items-center gap-2">
        <BeeMark />
        <div className="d-flex flex-column text-start lh-sm">
          <span className="fw-bold font-monospace">HIVE</span>
          <span className="text-body-secondary small text-uppercase">UAT · Cutover</span>
        </div>
      </div>
      <div className="footer-widget-divider" />
      <div className="d-flex align-items-center gap-2">
        <div className="text-end">
          <div className="fw-semibold small">{userName}</div>
          <div className="text-body-secondary small">{userRole}</div>
        </div>
        <div className="footer-widget-avatar">{getInitials(userName)}</div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: `FooterWidget` passa a renderizar o conteúdo compartilhado**

Current `src/components/projects/FooterWidget.tsx`:
```tsx
interface FooterWidgetProps {
  userName: string;
  userRole: string;
}

export default function FooterWidget({ userName, userRole }: FooterWidgetProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="footer-widget">
      <div className="d-flex align-items-center gap-2">
        <div className="fw-bold font-monospace">HIVE</div>
        <div className="text-body-secondary small text-uppercase">UAT · Cutover</div>
      </div>
      <div className="footer-widget-divider" />
      <div className="d-flex align-items-center gap-2">
        <div className="text-end">
          <div className="fw-semibold small">{userName}</div>
          <div className="text-body-secondary small">{userRole}</div>
        </div>
        <div className="footer-widget-avatar">{initials}</div>
      </div>
    </div>
  );
}
```

Replace with:
```tsx
import FooterWidgetContent from "../common/FooterWidgetContent";

interface FooterWidgetProps {
  userName: string;
  userRole: string;
}

export default function FooterWidget({ userName, userRole }: FooterWidgetProps) {
  return (
    <div className="footer-widget">
      <FooterWidgetContent userName={userName} userRole={userRole} />
    </div>
  );
}
```

- [ ] **Step 4: Adicionar o estilo do ícone da marca**

Adicionar ao final de `src/styles/_footer-widget.scss`:
```scss

.bee-mark {
  width: 30px;
  height: 30px;
  flex: none;
}
```

- [ ] **Step 5: Type-check e build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/utils/initials.ts src/components/common/FooterWidgetContent.tsx src/components/projects/FooterWidget.tsx src/styles/_footer-widget.scss
git commit -m "feat: extract FooterWidgetContent and add the bee-mark logo to FooterWidget"
```

## Context

Task 2 de 16. `getInitials` foi validado contra os dados mockados já existentes: `useProjects.ts` atribui manualmente `initials: "VC"` para `"Vinícius Calefo Assarice"` e `initials: "LM"` para `"Leonardo Martins da Silva"` — `getInitials` reproduz exatamente esses valores (pega a 1ª letra das duas primeiras palavras), então não há risco de o util gerar algo diferente do que já está espalhado pelo app. `FooterWidgetContent` existe porque a Task 14 (`ProjectNavDock`) precisa do **mesmo** bloco visual marca+usuário dentro de um `Dropdown.Toggle` — extrair agora evita duplicar ~15 linhas de JSX depois. `FooterWidget` continua com a mesma assinatura de props (`userName`/`userRole`) e o mesmo comportamento — só a marca ganha o ícone da abelha antes do texto "HIVE". `.bee-mark` é adicionado a `_footer-widget.scss` (não a um arquivo novo) porque é especificamente o tamanho/posicionamento do ícone dentro *desse* widget — a Task 15 (`_project-nav-dock.scss`) vai herdar esse mesmo estilo automaticamente já que reaproveita a classe `.footer-widget`.

---

### Task 3: `ActivityStatChips` — de pílula horizontal para mini-card vertical

**Files:**
- Modify: `src/components/activities/ActivityStatChips.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Adicionar uma cor por chip e trocar a marcação para coluna**

Current `src/components/activities/ActivityStatChips.tsx`:
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

Replace with:
```tsx
import type { ActivityStats } from "../../types/activity";

export type ActivityStatChipKey = "total" | "concluido" | "execucao" | "bloqueado" | "aguardando" | "atrasado";

type ChipTone = "" | "g" | "y" | "r";

interface ChipDefinition {
  key: ActivityStatChipKey;
  label: string;
  tone: ChipTone;
}

const CHIPS: ChipDefinition[] = [
  { key: "total", label: "Total", tone: "" },
  { key: "concluido", label: "Concluído", tone: "g" },
  { key: "execucao", label: "Em execução", tone: "y" },
  { key: "bloqueado", label: "Bloqueado", tone: "r" },
  { key: "aguardando", label: "Aguardando", tone: "" },
  { key: "atrasado", label: "Atrasado", tone: "r" },
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
          <span className={`stat-chip-value font-monospace${chip.tone ? ` stat-chip-value-${chip.tone}` : ""}`}>
            {stats[chip.key]}
          </span>
          <span className="stat-chip-label">{chip.label}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Trocar o SCSS do chip para o layout vertical**

Em `src/styles/_activities.scss`, substituir o bloco:
```scss
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
```

por:
```scss
// Chips de estatística clicáveis
.stat-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 13px;
  border-radius: 8px;
  border: 1px solid c.$border;
  background-color: c.$surface;
  cursor: pointer;
  min-width: 78px;
  text-align: left;
}
.stat-chip:hover {
  border-color: c.$text-dim;
}
.stat-chip-active {
  border-color: c.$yellow-deep;
  background-color: c.$yellow-soft;
}
.stat-chip-value {
  font-size: 16px;
  font-weight: 800;
  line-height: 1;
}
.stat-chip-value-g {
  color: c.$green;
}
.stat-chip-value-y {
  color: c.$yellow-deep;
}
.stat-chip-value-r {
  color: c.$red;
}
.stat-chip-label {
  font-size: 9.5px;
  color: c.$text-faint;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  font-weight: 600;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/activities/ActivityStatChips.tsx src/styles/_activities.scss
git commit -m "style: redesign ActivityStatChips as vertical mini-cards matching the mockup"
```

## Context

Task 3 de 16. Marcação e comportamento de clique/seleção (`onSelect`, `activeChip`) não mudam — só a forma do chip (de pílula horizontal com valor+rótulo lado a lado para coluna com valor grande em cima, rótulo pequeno embaixo) e a cor do valor por status (verde/amarelo-escuro/vermelho), extraída de `.stat-chip .sc-v.g/.y/.r` no mockup (`HIVE - Telas Projeto Específico.html`, linha 473). `tone: ""` (Total, Aguardando) usa a cor de texto padrão — sem classe extra. O estado ativo troca de "borda+fundo cinza" para "borda+fundo amarelo" (`$yellow-deep`/`$yellow-soft`), igual ao `.stat-chip.active` do mockup.

---

### Task 4: `ActivityGroupToggle` — de 3 botões para dropdown único

**Files:**
- Modify: `src/components/activities/ActivityGroupToggle.tsx`
- Modify: `src/pages/ProjectActivitiesPage.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Reescrever como Dropdown**

Current `src/components/activities/ActivityGroupToggle.tsx`:
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

Replace with:
```tsx
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import type { ActivityGroupMode } from "../../types/activity";

interface ActivityGroupToggleProps {
  mode: ActivityGroupMode;
  onChange: (mode: ActivityGroupMode) => void;
}

const OPTIONS: { value: ActivityGroupMode; label: string; description: string }[] = [
  { value: "tree", label: "Árvore", description: "Árvore (Módulo › Processo)" },
  { value: "tester", label: "Tester", description: "Por Tester" },
  { value: "status", label: "Status", description: "Por Status" },
];

export default function ActivityGroupToggle({ mode, onChange }: ActivityGroupToggleProps) {
  const activeLabel = OPTIONS.find((option) => option.value === mode)?.label ?? "";

  return (
    <Dropdown>
      <Dropdown.Toggle id="group-toggle" className="multi-select-toggle has-value">
        Agrupar: {activeLabel}
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu">
        {OPTIONS.map((option) => (
          <Dropdown.ItemText key={option.value} className="multi-select-item">
            <Form.Check
              type="radio"
              name="group-mode"
              id={`group-mode-${option.value}`}
              label={option.description}
              checked={mode === option.value}
              onChange={() => onChange(option.value)}
            />
          </Dropdown.ItemText>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

- [ ] **Step 2: Remover o rótulo "Agrupar por:" agora redundante**

Em `src/pages/ProjectActivitiesPage.tsx`, o botão do dropdown já diz "Agrupar: Árvore" — o rótulo ao lado fica duplicado. Substituir:
```tsx
        <div className="d-flex align-items-center gap-2">
          <span className="text-body-secondary small">Agrupar por:</span>
          <ActivityGroupToggle mode={groupMode} onChange={setGroupMode} />
        </div>
```

por:
```tsx
        <div className="d-flex align-items-center gap-2">
          <ActivityGroupToggle mode={groupMode} onChange={setGroupMode} />
        </div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/activities/ActivityGroupToggle.tsx src/pages/ProjectActivitiesPage.tsx
git commit -m "feat: turn ActivityGroupToggle into a single dropdown, matching the mockup"
```

## Context

Task 4 de 16. O mockup usa um único dropdown "Agrupar: {modo} ▾" com as 3 opções como rádio dentro do painel (`HIVE - Telas Projeto Específico.html`, linhas 1112-1122), não 3 botões lado a lado. Reaproveita a classe `.multi-select-toggle` (mesma dos outros filtros, estilizada na Task 5 com o visual de pílula+chevron+has-value) em vez de criar uma classe nova — o botão de agrupar sempre "tem um valor" (não existe estado "nenhum agrupamento"), por isso a classe `has-value` é fixa, não condicional. `Form.Check type="radio"` com `name="group-mode"` compartilhado garante seleção única nativa do navegador. O `<span>Agrupar por:</span>` que existia antes do toggle em `ProjectActivitiesPage.tsx` é removido porque o próprio botão agora já diz "Agrupar: X" — mantê-lo duplicaria a informação.

---

### Task 5: `MultiSelectFilter` e `ActivityModuleProcessFilter` — pílula, chevron e estado "tem valor"

**Files:**
- Modify: `src/components/activities/MultiSelectFilter.tsx`
- Modify: `src/components/activities/ActivityModuleProcessFilter.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Adicionar o chevron e a classe `has-value` ao `MultiSelectFilter`**

Em `src/components/activities/MultiSelectFilter.tsx`, substituir:
```tsx
  const toggleLabel = selected.length === 0 ? label : `${label} (${selected.length})`;

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle id={`${idPrefix}-toggle`} variant="outline-secondary" size="sm" className="multi-select-toggle">
        {toggleLabel}
      </Dropdown.Toggle>
```

por:
```tsx
  const toggleLabel = selected.length === 0 ? label : `${label} (${selected.length})`;
  const hasValue = selected.length > 0;

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle
        id={`${idPrefix}-toggle`}
        className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
      >
        {toggleLabel}
      </Dropdown.Toggle>
```

(Remove os props `variant="outline-secondary" size="sm"` — o novo estilo pílula é definido inteiramente pela classe `.multi-select-toggle` no SCSS, não pelas variantes padrão do Bootstrap.)

- [ ] **Step 2: Mesmo tratamento no `ActivityModuleProcessFilter`**

Em `src/components/activities/ActivityModuleProcessFilter.tsx`, substituir:
```tsx
  const moduleOptions = buildModuleOptions(activities);
  const selectedCount = selectedModules.length + selectedProcesses.length;
  const toggleLabel = selectedCount === 0 ? "Módulo/Processo" : `Módulo/Processo (${selectedCount})`;
```

por:
```tsx
  const moduleOptions = buildModuleOptions(activities);
  const selectedCount = selectedModules.length + selectedProcesses.length;
  const toggleLabel = selectedCount === 0 ? "Módulo/Processo" : `Módulo/Processo (${selectedCount})`;
  const hasValue = selectedCount > 0;
```

E substituir:
```tsx
      <Dropdown.Toggle id="module-process-filter-toggle" variant="outline-secondary" size="sm" className="multi-select-toggle">
        {toggleLabel}
      </Dropdown.Toggle>
```

por:
```tsx
      <Dropdown.Toggle
        id="module-process-filter-toggle"
        className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
      >
        {toggleLabel}
      </Dropdown.Toggle>
```

- [ ] **Step 3: Reescrever o SCSS do gatilho — forma pílula, chevron, estado "tem valor"**

Em `src/styles/_activities.scss`, substituir o bloco:
```scss
// Filtro multi-seleção genérico (Dropdown + checkboxes)
.multi-select-toggle {
  font-size: 12.5px;
}
```

por:
```scss
// Filtro multi-seleção genérico (Dropdown + checkboxes) — gatilho em pílula com chevron
.multi-select-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid c.$border-strong;
  background-color: c.$surface;
  font-size: 12.5px;
  font-weight: 600;
  color: c.$text-dim;
}
.multi-select-toggle:hover,
.multi-select-toggle:focus {
  border-color: c.$text-dim;
  background-color: c.$surface;
  color: c.$text-dim;
}
.multi-select-toggle.has-value {
  border-color: c.$yellow-deep;
  background-color: c.$yellow-soft;
  color: c.$text;
}
.multi-select-toggle::after {
  display: none;
}
.multi-select-toggle-chevron {
  width: 11px;
  height: 11px;
  opacity: 0.55;
  margin-left: 1px;
}
```

- [ ] **Step 4: Adicionar o ícone de chevron dentro dos dois gatilhos**

Em `src/components/activities/MultiSelectFilter.tsx`, adicionar o import e usar o ícone dentro do `Dropdown.Toggle`:
```tsx
import NavIcon from "../common/NavIcon";
```
(junto aos outros imports do topo)

```tsx
      <Dropdown.Toggle
        id={`${idPrefix}-toggle`}
        className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
      >
        {toggleLabel}
        <NavIcon className="multi-select-toggle-chevron">
          <path d="m6 9 6 6 6-6" />
        </NavIcon>
      </Dropdown.Toggle>
```

Mesma coisa em `src/components/activities/ActivityModuleProcessFilter.tsx`:
```tsx
import NavIcon from "../common/NavIcon";
```

```tsx
      <Dropdown.Toggle
        id="module-process-filter-toggle"
        className={`multi-select-toggle${hasValue ? " has-value" : ""}`}
      >
        {toggleLabel}
        <NavIcon className="multi-select-toggle-chevron">
          <path d="m6 9 6 6 6-6" />
        </NavIcon>
      </Dropdown.Toggle>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/activities/MultiSelectFilter.tsx src/components/activities/ActivityModuleProcessFilter.tsx src/styles/_activities.scss
git commit -m "style: restyle filter dropdown triggers as pills with chevron and has-value state"
```

## Context

Task 5 de 16. `variant="outline-secondary" size="sm"` (props do `react-bootstrap`) são removidos dos dois `Dropdown.Toggle` porque o novo visual (forma pílula com borda/fundo próprios, chevron customizado) é inteiramente definido por `.multi-select-toggle`/`.has-value` no SCSS — misturar com as variantes padrão do Bootstrap geraria classes conflitantes (`.btn-outline-secondary` do `_bootstrap-overrides.scss` teria precedência de especificidade imprevisível sobre o que queremos aqui). `.multi-select-toggle::after { display: none }` esconde o *caret* automático que o `Dropdown.Toggle` do `react-bootstrap` desenha via `::after` — o mockup usa um ícone de chevron próprio (`NavIcon` com o path `m6 9 6 6 6-6`, Task 1) em vez do triângulo padrão do Bootstrap. Este mesmo padrão (`.multi-select-toggle` + `.has-value` + chevron) é reaproveitado pela Task 4 (`ActivityGroupToggle`, que já usa a classe com `has-value` fixo) e pela Task 6 (`ActivityDateRangeFilter`, que vai precisar do mesmo gatilho).

---

### Task 6: `ActivityDateRangeFilter` — vira dropdown com switch de período customizado

**Files:**
- Modify: `src/types/activity.ts`
- Modify: `src/components/activities/ActivityDateRangeFilter.tsx`
- Modify: `src/components/activities/ActivityFiltersBar.tsx`
- Modify: `src/pages/ProjectActivitiesPage.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Adicionar `dateRangeEnabled` ao tipo de filtros**

Em `src/types/activity.ts`, substituir:
```ts
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
```

por:
```ts
export interface ActivityFiltersState {
  search: string;
  statuses: ActivityStatus[];
  testers: string[];
  devs: string[];
  dateRangeEnabled: boolean;
  plannedEndFrom: string | null;
  plannedEndTo: string | null;
  retestBuckets: number[];
  modules: string[];
  processes: string[];
  onlyMine: boolean;
  onlyOverdue: boolean;
}
```

- [ ] **Step 2: Reescrever `ActivityDateRangeFilter` como dropdown com switch**

Current `src/components/activities/ActivityDateRangeFilter.tsx`:
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

Replace with:
```tsx
import Dropdown from "react-bootstrap/Dropdown";
import Form from "react-bootstrap/Form";
import NavIcon from "../common/NavIcon";
import type { ActivityFiltersState } from "../../types/activity";

interface ActivityDateRangeFilterProps {
  enabled: boolean;
  from: string | null;
  to: string | null;
  onChange: (partial: Partial<ActivityFiltersState>) => void;
}

export default function ActivityDateRangeFilter({ enabled, from, to, onChange }: ActivityDateRangeFilterProps) {
  function handleEnabledChange(checked: boolean) {
    if (checked) {
      onChange({ dateRangeEnabled: true });
    } else {
      onChange({ dateRangeEnabled: false, plannedEndFrom: null, plannedEndTo: null });
    }
  }

  return (
    <Dropdown autoClose="outside">
      <Dropdown.Toggle id="date-range-filter-toggle" className={`multi-select-toggle${enabled ? " has-value" : ""}`}>
        Período
        <NavIcon className="multi-select-toggle-chevron">
          <path d="m6 9 6 6 6-6" />
        </NavIcon>
      </Dropdown.Toggle>
      <Dropdown.Menu className="multi-select-menu date-range-menu">
        <div className="date-toggle-row">
          <span className="date-toggle-label">Usar período customizado</span>
          <Form.Check
            type="switch"
            id="date-range-enabled"
            checked={enabled}
            onChange={(event) => handleEnabledChange(event.target.checked)}
          />
        </div>
        <div className="d-flex gap-2">
          <Form.Group className="flex-fill">
            <Form.Label className="date-range-field-label">De</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              disabled={!enabled}
              value={from ?? ""}
              onChange={(event) => onChange({ plannedEndFrom: event.target.value || null })}
              aria-label="Conclusão planejada a partir de"
            />
          </Form.Group>
          <Form.Group className="flex-fill">
            <Form.Label className="date-range-field-label">Até</Form.Label>
            <Form.Control
              type="date"
              size="sm"
              disabled={!enabled}
              value={to ?? ""}
              onChange={(event) => onChange({ plannedEndTo: event.target.value || null })}
              aria-label="Conclusão planejada até"
            />
          </Form.Group>
        </div>
        {!enabled && <div className="date-range-hint">Desativado: mostra todas as datas</div>}
      </Dropdown.Menu>
    </Dropdown>
  );
}
```

- [ ] **Step 3: Atualizar `ActivityFiltersBar` — nova prop, `clearAll`, `hasActiveFilters`**

Em `src/components/activities/ActivityFiltersBar.tsx`, substituir:
```tsx
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
```

por:
```tsx
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
      dateRangeEnabled: false,
      plannedEndFrom: null,
      plannedEndTo: null,
      retestBuckets: [],
      modules: [],
      processes: [],
    });
  }
```

E substituir:
```tsx
      <ActivityDateRangeFilter
        from={filters.plannedEndFrom}
        to={filters.plannedEndTo}
        onFromChange={(value) => onFiltersChange({ plannedEndFrom: value })}
        onToChange={(value) => onFiltersChange({ plannedEndTo: value })}
      />
```

por:
```tsx
      <ActivityDateRangeFilter
        enabled={filters.dateRangeEnabled}
        from={filters.plannedEndFrom}
        to={filters.plannedEndTo}
        onChange={onFiltersChange}
      />
```

- [ ] **Step 4: `createEmptyFilters` em `ProjectActivitiesPage` ganha o novo campo**

Em `src/pages/ProjectActivitiesPage.tsx`, substituir:
```tsx
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
```

por:
```tsx
function createEmptyFilters(): ActivityFiltersState {
  return {
    search: "",
    statuses: [],
    testers: [],
    devs: [],
    dateRangeEnabled: false,
    plannedEndFrom: null,
    plannedEndTo: null,
    retestBuckets: [],
    modules: [],
    processes: [],
    onlyMine: false,
    onlyOverdue: false,
  };
}
```

- [ ] **Step 5: Adicionar o SCSS do painel de período**

Adicionar ao final de `src/styles/_activities.scss`:
```scss

// Painel do filtro de Período
.date-range-menu {
  min-width: 250px;
  padding: 12px;
}
.date-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.date-toggle-label {
  font-size: 12px;
  font-weight: 600;
  color: c.$text;
}
.date-range-field-label {
  font-size: 9.5px;
  color: c.$text-faint;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-bottom: 4px;
}
.date-range-hint {
  font-size: 11px;
  color: c.$text-faint;
  margin-top: 9px;
  padding-top: 9px;
  border-top: 1px solid c.$border;
}
```

- [ ] **Step 6: Remover a classe agora não usada `.date-range-input`**

Em `src/styles/_activities.scss`, remover o bloco:
```scss
// Filtro de intervalo de datas
.date-range-input {
  width: 140px;
}
```

(O novo `ActivityDateRangeFilter` usa `Form.Control size="sm"` dentro do painel do dropdown, sem uma largura fixa própria — o `Form.Group.flex-fill` já distribui o espaço.)

- [ ] **Step 7: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/types/activity.ts src/components/activities/ActivityDateRangeFilter.tsx src/components/activities/ActivityFiltersBar.tsx src/pages/ProjectActivitiesPage.tsx src/styles/_activities.scss
git commit -m "feat: turn ActivityDateRangeFilter into a dropdown with a custom-range switch"
```

## Context

Task 6 de 16. Única mudança de comportamento funcional desta passada inteira (todo o resto é visual/estrutural de marcação) — o mockup (`HIVE - Telas Projeto Específico.html`, linhas 1046-1058) usa um switch "Usar período customizado" que desabilita os dois campos de data até ser ligado; hoje os campos ficam sempre editáveis. `dateRangeEnabled` vira parte de `ActivityFiltersState` em vez de estado local do componente porque, sendo parte do mesmo objeto que `plannedEndFrom`/`plannedEndTo`, o "Limpar todos" já existente em `ActivityFiltersBar` (que substitui o objeto inteiro de filtros) automaticamente também desliga o switch — sem precisar de nenhuma lógica extra de sincronização, nem risco de o switch "esquecer" seu próprio estado quando outra ação zera os filtros por fora. Ao desligar o switch, `handleEnabledChange` já zera `plannedEndFrom`/`plannedEndTo` na mesma chamada — não deixa um filtro de datas "fantasma" aplicado enquanto os campos aparecem desabilitados. `filterActivities.ts` **não muda**: como `plannedEndFrom`/`plannedEndTo` continuam sendo os únicos campos que a função de fato lê, e ambos ficam `null` sempre que o período está desativado, a lógica de filtro já funciona corretamente sem nenhum ajuste. O componente vira um `Dropdown` (igual aos outros filtros da barra, reaproveitando `.multi-select-toggle`/`.has-value` da Task 5) em vez de ficar sempre visível inline — o mockup trata "Período" como mais um dos 6 filtros em dropdown da barra (`.filter-dd` com `data-dd="date"`), não como um elemento separado.

---

### Task 7: `ActivityFiltersBar` — busca e "Limpar todos" no estilo do mockup

**Files:**
- Modify: `src/components/activities/ActivityFiltersBar.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Trocar "Limpar todos" de botão para texto sublinhado**

Em `src/components/activities/ActivityFiltersBar.tsx`, remover o import não usado e trocar o botão:
```tsx
import { useMemo } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
```

por:
```tsx
import { useMemo } from "react";
import Form from "react-bootstrap/Form";
```

E substituir:
```tsx
      {hasActiveFilters && (
        <Button variant="outline-secondary" size="sm" onClick={clearAll}>
          Limpar todos
        </Button>
      )}
```

por:
```tsx
      {hasActiveFilters && (
        <button type="button" className="filters-clear-all" onClick={clearAll}>
          Limpar todos
        </button>
      )}
```

- [ ] **Step 2: Adicionar o SCSS do botão de limpar e do campo de busca**

Adicionar ao final de `src/styles/_activities.scss`:
```scss

// "Limpar todos" — texto sublinhado, não botão
.filters-clear-all {
  border: none;
  background: none;
  padding: 0;
  font-size: 12px;
  color: c.$text-dim;
  text-decoration: underline;
}
.filters-clear-all:hover {
  color: c.$red;
}
```

- [ ] **Step 3: Ajustar o campo de busca para o estilo do mockup**

Em `src/styles/_activities.scss`, substituir:
```scss
// Busca por nome/ID
.activity-search-input {
  max-width: 220px;
}
```

por:
```scss
// Busca por nome/ID
.activity-search-input {
  max-width: 220px;
  border-radius: 8px;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/activities/ActivityFiltersBar.tsx src/styles/_activities.scss
git commit -m "style: restyle 'Limpar todos' as underlined text, matching the mockup"
```

## Context

Task 7 de 16. Fecha os últimos ajustes de `ActivityFiltersBar` que não pertenciam a nenhum dos filtros individuais das Tasks 5-6. O mockup usa `.filters-clear-all` (texto sublinhado, sem borda de botão, vermelho no hover — linhas 476/1108 do mockup) em vez de um botão `outline-secondary`. Mesma condição de exibição (`hasActiveFilters`) e mesmo `onClick={clearAll}" — só a marcação do elemento (de `<Button>` do `react-bootstrap` para um `<button>` simples com classe própria) e o estilo mudam. `.activity-search-input` já usa `border-radius: 8px` implicitamente via `.form-control` em `_bootstrap-overrides.scss` — a declaração explícita aqui é redundante em termos de resultado visual, mas documenta a intenção de forma explícita nesta camada específica do componente.

---

### Task 8: Primitivas visuais da tabela — badge, avatar, reteste, atraso, rollup, migalha (SCSS + `ActivityStatusBadge`)

**Files:**
- Modify: `src/components/activities/ActivityStatusBadge.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Badge de status vira pílula com bolinha colorida**

Current `src/components/activities/ActivityStatusBadge.tsx`:
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

Replace with:
```tsx
import { ACTIVITY_STATUS_BADGE_CLASS, ACTIVITY_STATUS_LABELS } from "../../utils/activityIndicators";
import type { ActivityStatus } from "../../types/activity";

interface ActivityStatusBadgeProps {
  status: ActivityStatus;
}

export default function ActivityStatusBadge({ status }: ActivityStatusBadgeProps) {
  return (
    <span className={`activity-badge ${ACTIVITY_STATUS_BADGE_CLASS[status]}`}>
      <span className="activity-badge-dot" />
      {ACTIVITY_STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Badge vira pílula (raio total) e a bolinha ganha estilo**

Em `src/styles/_activities.scss`, substituir:
```scss
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
```

por:
```scss
// Badges de status de atividade
.activity-badge {
  font-family: c.$font-mono;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 3px 9px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.activity-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  flex: none;
}
```

- [ ] **Step 3: Adicionar avatar-mini, retest-pill, atraso e rollup ao final de `_activities.scss`**

Adicionar ao final de `src/styles/_activities.scss`:
```scss

// Avatar pequeno nas colunas Tester/Dev
.avatar-mini {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: c.$surface-2;
  border: 1px solid c.$border-strong;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: c.$font-mono;
  font-size: 8.5px;
  font-weight: 700;
  color: c.$text-dim;
  margin-right: 5px;
  vertical-align: middle;
  flex-shrink: 0;
}

// Pílula de contagem de reteste
.retest-pill {
  font-family: c.$font-mono;
  font-size: 10px;
  color: c.$text-dim;
  background-color: c.$surface-2;
  padding: 2px 6px;
  border-radius: 5px;
}
.retest-pill-warn {
  background-color: c.$yellow-soft;
  color: c.$yellow-deep;
}
.retest-pill-danger {
  background-color: c.$red-soft;
  color: c.$red;
  font-weight: 700;
}

// Atraso
.activity-row-overdue {
  box-shadow: inset 3px 0 0 c.$red;
}
.date-overdue {
  color: c.$red;
  font-weight: 700;
}
.overdue-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 700;
  color: c.$red;
  background-color: c.$red-soft;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 6px;
  vertical-align: middle;
}

// Rollup de grupo (Módulo/Processo) — mini barra de progresso
.group-rollup {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mini-progress {
  flex: 1;
  max-width: 220px;
  height: 6px;
  border-radius: 4px;
  background-color: c.$surface-2;
  overflow: hidden;
  display: flex;
}
.mini-progress-fill {
  background-color: c.$green;
  height: 100%;
}

// Migalha de Módulo/Processo nos agrupamentos planos (Tester/Status)
.flat-breadcrumb {
  font-size: 10.5px;
  color: c.$text-faint;
  font-weight: 500;
  line-height: 1.2;
}

// Coluna de seleção e ícone de ordenação (elementos decorativos, sem função nesta passada)
.sort-icon {
  opacity: 0.55;
  font-size: 10px;
  margin-left: 3px;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/activities/ActivityStatusBadge.tsx src/styles/_activities.scss
git commit -m "style: add table cell primitives (badge dot, avatar-mini, retest-pill, overdue, rollup, breadcrumb)"
```

## Context

Task 8 de 16. Camada só de SCSS (mais o pequeno ajuste no `ActivityStatusBadge`) que prepara todas as classes que as Tasks 9-12 (`ActivityRow`, `ActivitiesTable`, `ActivityTreeRows`, `ActivityGroupRows`) vão consumir — nenhuma delas é usada por nenhum componente ainda além do badge, que é o único consumidor imediato. `.retest-pill`/`.retest-pill-warn`/`.retest-pill-danger` correspondem aos buckets 0 / 1-2 / 3+ já usados no filtro de Retestes (`ActivityFiltersBar`, `activity.retestCount >= 3 ? 3 : ...`) — a Task 9 vai aplicar essa mesma lógica de bucket para escolher a classe. `.activity-row-overdue`, `.date-overdue` e `.overdue-tag` substituem o badge Bootstrap genérico (`badge bg-danger`) usado hoje só na data de conclusão planejada — a linha inteira ganha a borda vermelha lateral (`box-shadow: inset`), não só a tag. `.mini-progress-fill` é uma classe própria (o mockup usa `.seg-done` para o preenchimento) porque cada linha de rollup vai definir sua largura via `style={{ width: ... }}` inline (percentual calculado a partir de completed/total) — não dá para expressar isso só com uma classe fixa.

---

### Task 9: `ActivityRow` — colunas separadas, avatar, reteste, atraso, indentação, migalha

**Files:**
- Modify: `src/components/activities/ActivityRow.tsx`

- [ ] **Step 1: Reescrever o componente**

Current `src/components/activities/ActivityRow.tsx`:
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

Replace with:
```tsx
import { useNavigate } from "react-router";
import Form from "react-bootstrap/Form";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { isOverdue } from "../../utils/activityIndicators";
import { getInitials } from "../../utils/initials";
import type { Activity } from "../../types/activity";

interface ActivityRowProps {
  activity: Activity;
  projectId: string;
  indent?: boolean;
  showBreadcrumb?: boolean;
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString("pt-BR");
}

function retestPillClass(retestCount: number): string {
  if (retestCount === 0) return "retest-pill";
  if (retestCount <= 2) return "retest-pill retest-pill-warn";
  return "retest-pill retest-pill-danger";
}

export default function ActivityRow({ activity, projectId, indent = false, showBreadcrumb = false }: ActivityRowProps) {
  const navigate = useNavigate();
  const overdue = isOverdue(activity);

  function goToDetail() {
    navigate(`/projetos/${projectId}/atividades/${activity.id}`);
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      className={overdue ? "activity-row-overdue" : undefined}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToDetail();
        }
      }}
    >
      <td>
        <Form.Check
          type="checkbox"
          aria-label={`Selecionar ${activity.name}`}
          onClick={(event) => event.stopPropagation()}
        />
      </td>
      <td style={indent ? { paddingLeft: 34 } : undefined}>
        <div className="fw-semibold">{activity.name}</div>
        {showBreadcrumb && (
          <div className="flat-breadcrumb">
            {activity.module} › {activity.process}
          </div>
        )}
      </td>
      <td className="font-monospace small">{activity.id}</td>
      <td>
        <ActivityStatusBadge status={activity.status} />
      </td>
      <td>
        <span className="avatar-mini">{getInitials(activity.tester)}</span>
        {activity.tester}
      </td>
      <td>
        <span className="avatar-mini">{getInitials(activity.dev)}</span>
        {activity.dev}
      </td>
      <td className="font-monospace small">{formatDate(activity.plannedStart)}</td>
      <td className={`font-monospace small${overdue ? " date-overdue" : ""}`}>
        {formatDate(activity.plannedEnd)}
        {overdue && <span className="overdue-tag">Atrasado</span>}
      </td>
      <td className="font-monospace small">{formatDate(activity.actualStart)}</td>
      <td className="font-monospace small">{formatDate(activity.actualEnd)}</td>
      <td className="small">{activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")}</td>
      <td className="text-center">
        <span className={retestPillClass(activity.retestCount)}>{activity.retestCount}×</span>
      </td>
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
git commit -m "feat: restructure ActivityRow columns and add avatars, retest pills, overdue styling"
```

## Context

Task 9 de 16. Maior mudança estrutural da tabela: de 9 para 13 células por linha (checkbox decorativo + Nome + ID separado + Status + Tester + Dev + 4 colunas de data separadas + Predecessores + Reteste + Issues), igual ao mockup. `indent`/`showBreadcrumb` são as duas props novas — mutuamente exclusivas na prática (`ActivityTreeRows`, Task 11, passa só `indent`; `ActivityGroupRows`, Task 12, passa só `showBreadcrumb`), mas como propriedades independentes em vez de um único enum (`"tree" | "flat"`) porque cada uma controla um aspecto visual isolado e sem relação de exclusão forçada pelo tipo — mantém `ActivityRow` sem depender de saber em qual modo de agrupamento está sendo usado. O checkbox de seleção usa `onClick={(event) => event.stopPropagation()}` porque a `<tr>` inteira já tem seu próprio `onClick={goToDetail}` — sem isso, clicar no checkbox também dispararia a navegação para o detalhe da atividade. `retestPillClass` reproduz o mesmo bucket 0 / 1-2 / 3+ já usado em `ActivityFiltersBar.tsx` (`activity.retestCount >= 3 ? 3 : ...`) — mantido como função local simples (não extraído para um util compartilhado) porque é uma única expressão condicional de 3 ramos, sem uso em nenhum terceiro lugar que justifique a indireção. `getInitials` (Task 2) é reaproveitado tal como está — já validado contra os nomes usados em `useActivities.ts` (ex.: "Rafael Souza"→"RS", "J. Prado"→"JP").

---

### Task 10: `ActivitiesTable` — novo cabeçalho de 13 colunas

**Files:**
- Modify: `src/components/activities/ActivitiesTable.tsx`

- [ ] **Step 1: Reescrever o `<thead>`**

Current `src/components/activities/ActivitiesTable.tsx`:
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

Replace with:
```tsx
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
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
          <th style={{ width: 26 }}>
            <Form.Check type="checkbox" aria-label="Selecionar todas as atividades visíveis" />
          </th>
          <th>
            Nome <span className="sort-icon">↕</span>
          </th>
          <th>ID</th>
          <th>
            Status <span className="sort-icon">↕</span>
          </th>
          <th>Tester</th>
          <th>Dev</th>
          <th>
            Início plan. <span className="sort-icon">↕</span>
          </th>
          <th>
            Conclusão plan. <span className="sort-icon">↕</span>
          </th>
          <th>Início real</th>
          <th>Conclusão real</th>
          <th>Predec.</th>
          <th className="text-center">
            Reteste <span className="sort-icon">↕</span>
          </th>
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
Expected: no errors — **espera-se um erro** neste ponto: `ActivityTreeRows`/`ActivityGroupRows` ainda usam `colSpan={9}` internamente (Tasks 11-12 não rodaram ainda), o que não quebra o build (colSpan incorreto não é erro de tipo), só deixa a tabela visualmente desalinhada até a Task 11 rodar. `npx tsc -b` deve mesmo assim terminar sem erros — é só uma inconsistência visual temporária entre tasks, não um erro de compilação.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivitiesTable.tsx
git commit -m "feat: expand ActivitiesTable header to 13 columns matching the mockup"
```

## Context

Task 10 de 16. Cabeçalho vai de 9 para 13 `<th>`: checkbox decorativo + Nome + ID + Status + Tester + Dev + 4 colunas de data + Predec. (abreviado, igual ao mockup) + Reteste + Issues. Os ícones "↕" (`.sort-icon`, Task 8) aparecem só nas colunas que o mockup marca como `class="sortable"` (Nome, Status, Início/Conclusão plan., Reteste) — Tester, Dev, Início/Conclusão real, Predec. e Issues não têm o ícone no mockup original, e esta task preserva essa mesma seleção. Nenhuma dessas colunas realmente ordena a tabela — são decorativas, conforme decisão de escopo confirmada com o usuário (spec, seção "Elementos fora de escopo"). O checkbox "selecionar todas" no cabeçalho é um `Form.Check` não controlado (sem `checked`/`onChange`) — clicável, mas sem estado nem efeito algum, mesma decisão.

---

### Task 11: `ActivityTreeRows` — colSpan 12, mini-progresso, indentação

**Files:**
- Modify: `src/components/activities/ActivityTreeRows.tsx`

- [ ] **Step 1: Reescrever**

Current `src/components/activities/ActivityTreeRows.tsx`:
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
            <tr
              role="button"
              tabIndex={0}
              className="activity-group-row"
              onClick={() => onToggleModule(moduleGroup.module)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleModule(moduleGroup.module);
                }
              }}
            >
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

Replace with:
```tsx
import { Fragment } from "react";
import ActivityRow from "./ActivityRow";
import type { Activity, ModuleGroup } from "../../types/activity";

interface ActivityTreeRowsProps {
  groups: ModuleGroup[];
  projectId: string;
  expandedModules: Set<string>;
  onToggleModule: (moduleName: string) => void;
}

function countCompleted(activities: Activity[]): number {
  return activities.filter((activity) => activity.status === "concluido").length;
}

function completedPercent(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  return Math.round((countCompleted(activities) / activities.length) * 100);
}

function RollupCell({ activities, label }: { activities: Activity[]; label: string }) {
  return (
    <td colSpan={12}>
      <div className="group-rollup">
        <span className="fw-semibold">{label}</span>
        <span className="text-body-secondary small">
          {countCompleted(activities)}/{activities.length} concluídas
        </span>
        <div className="mini-progress">
          <div className="mini-progress-fill" style={{ width: `${completedPercent(activities)}%` }} />
        </div>
      </div>
    </td>
  );
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
            <tr
              role="button"
              tabIndex={0}
              className="activity-group-row"
              onClick={() => onToggleModule(moduleGroup.module)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onToggleModule(moduleGroup.module);
                }
              }}
            >
              <td></td>
              <RollupCell
                activities={activitiesInModule}
                label={`${isExpanded ? "▾" : "▸"} ${moduleGroup.module}`}
              />
            </tr>
            {isExpanded &&
              moduleGroup.processes.map((processGroup) => (
                <Fragment key={processGroup.process}>
                  <tr className="activity-group-row activity-group-row-process">
                    <td></td>
                    <RollupCell activities={processGroup.activities} label={processGroup.process} />
                  </tr>
                  {processGroup.activities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} projectId={projectId} indent />
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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityTreeRows.tsx
git commit -m "feat: add mini progress bars to tree rollup rows and indent leaf activities"
```

## Context

Task 11 de 16. `RollupCell` é um pequeno componente local (não exportado, não movido para um arquivo próprio) porque só existe para não duplicar a mesma marcação (label + contagem + barra de progresso) entre a linha de Módulo e a linha de Processo — as duas únicas chamadas ficam dentro deste mesmo arquivo. `colSpan` muda de 9 para 12 porque agora há 13 colunas no total (Task 10) e a célula de checkbox (1ª coluna) vira uma `<td></td>` vazia própria — igual ao mockup, que deixa a coluna de seleção sem checkbox nas linhas de rollup, só nas linhas-folha. `completedPercent` arredonda para o inteiro mais próximo — suficiente para uma barra de 220px de largura máxima, sem precisão extra necessária. `indent` (prop nova de `ActivityRow`, Task 9) é passado como `true` para toda atividade-folha no modo Árvore, reproduzindo o recuo visual de 34px do mockup que reforça o aninhamento sob Módulo›Processo.

---

### Task 12: `ActivityGroupRows` — colSpan 12, migalha de Módulo/Processo

**Files:**
- Modify: `src/components/activities/ActivityGroupRows.tsx`

- [ ] **Step 1: Reescrever**

Current `src/components/activities/ActivityGroupRows.tsx`:
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

Replace with:
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
            <td></td>
            <td colSpan={12}>
              <span className="fw-semibold">{group.label}</span>{" "}
              <span className="text-body-secondary small">{group.activities.length} atividades</span>
            </td>
          </tr>
          {group.activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} projectId={projectId} showBreadcrumb />
          ))}
        </Fragment>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/ActivityGroupRows.tsx
git commit -m "feat: adjust ActivityGroupRows colSpan and show module/process breadcrumb per row"
```

## Context

Task 12 de 16. Mesmo ajuste de `colSpan` (9→12 + `<td>` vazia) da Task 11, pela mesma razão (13 colunas totais, coluna de seleção sem checkbox nas linhas de cabeçalho de grupo). `showBreadcrumb` (Task 9) é passado como `true` para toda atividade nos modos Tester/Status — únicos dois modos que usam `ActivityGroupRows` — já que esses agrupamentos perdem a hierarquia visual de Módulo/Processo que o modo Árvore mostra nas próprias linhas de rollup.

---

### Task 13: `ProjectActivitiesPage` — botões decorativos e toggle-pill "Minhas atividades"

**Files:**
- Modify: `src/pages/ProjectActivitiesPage.tsx`
- Modify: `src/styles/_activities.scss`

- [ ] **Step 1: Adicionar os 3 botões decorativos ao cabeçalho da página**

Em `src/pages/ProjectActivitiesPage.tsx`, adicionar o import de `NavIcon`:
```tsx
import NavIcon from "../components/common/NavIcon";
```
(junto aos outros imports do topo)

Substituir:
```tsx
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h1 className="h4 fw-bold mb-1">Atividades</h1>
          <p className="text-body-secondary small mb-0">
            Mostrando {filteredActivities.length} de {activities.length} atividades
          </p>
        </div>
      </div>
```

por:
```tsx
      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-3">
        <div>
          <h1 className="h4 fw-bold mb-1">Atividades</h1>
          <p className="text-body-secondary small mb-0">
            Mostrando {filteredActivities.length} de {activities.length} atividades
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm">
            <NavIcon className="me-1">
              <path d="M12 3v12m0 0-4-4m4 4 4-4" />
              <path d="M4 17v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </NavIcon>
            Exportar atividades
          </Button>
          <Button variant="outline-secondary" size="sm">
            Importar em massa
          </Button>
          <Button variant="primary" size="sm">
            + Nova atividade
          </Button>
        </div>
      </div>
```

(Os 3 botões não recebem `onClick` — decorativos nesta passada, conforme decisão de escopo confirmada com o usuário.)

- [ ] **Step 2: Envolver "Minhas atividades" no contêiner `.toggle-pill`**

Substituir:
```tsx
          <Form.Check
            type="switch"
            id="only-mine-toggle"
            label="Minhas atividades"
            checked={filters.onlyMine}
            onChange={(event) => updateFilters({ onlyMine: event.target.checked })}
          />
```

por:
```tsx
          <label className={`toggle-pill${filters.onlyMine ? " toggle-pill-active" : ""}`} htmlFor="only-mine-toggle">
            <Form.Check
              type="switch"
              id="only-mine-toggle"
              checked={filters.onlyMine}
              onChange={(event) => updateFilters({ onlyMine: event.target.checked })}
            />
            Minhas atividades
          </label>
```

- [ ] **Step 3: Adicionar o SCSS do `.toggle-pill`**

Adicionar ao final de `src/styles/_activities.scss`:
```scss

// Pílula de toggle ("Minhas atividades")
.toggle-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid c.$border-strong;
  background-color: c.$surface;
  font-size: 12px;
  font-weight: 600;
  color: c.$text-dim;
  cursor: pointer;
  margin-bottom: 0;
}
.toggle-pill-active {
  border-color: c.$yellow-deep;
  background-color: c.$yellow-soft;
  color: c.$text;
}
```

- [ ] **Step 4: Type-check e build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProjectActivitiesPage.tsx src/styles/_activities.scss
git commit -m "feat: add decorative header buttons and wrap 'Minhas atividades' in a toggle pill"
```

## Context

Task 13 de 16. Os 3 botões (`Exportar atividades`/`Importar em massa`/`+ Nova atividade`) são renderizados sem `onClick` — decisão explícita do usuário durante o brainstorming desta spec: aparecem exatamente como no mockup, mas sem lógica por trás, prontos para ganhar função quando as specs de exportação/importação/criação forem escritas. `Button variant="primary"` já usa o amarelo de marca (`.btn-primary` em `_bootstrap-overrides.scss`, de uma passada anterior) — nenhum CSS novo necessário para esse botão. O `<label>` envolvendo o `Form.Check` (em vez de passar `label="Minhas atividades"` como prop do próprio `Form.Check`, como era antes) é necessário porque o texto "Minhas atividades" agora precisa ficar *dentro* do contêiner `.toggle-pill` (que também é quem recebe a borda/fundo que mudam de cor) — um `<label htmlFor="only-mine-toggle">` continua acessível e clicável exatamente como o `label` prop do `Form.Check` fazia, só com o texto e o switch como irmãos dentro do mesmo elemento visual.

---

### Task 14: `ProjectNavDock` — reescrita como botão + painel dropdown

**Files:**
- Modify: `src/components/project-nav/ProjectNavDock.tsx`

- [ ] **Step 1: Reescrever o componente**

Current `src/components/project-nav/ProjectNavDock.tsx`:
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

Replace with:
```tsx
import { NavLink, useParams } from "react-router";
import Dropdown from "react-bootstrap/Dropdown";
import FooterWidgetContent from "../common/FooterWidgetContent";
import NavIcon from "../common/NavIcon";
import { useProjects } from "../../hooks/useProjects";

const CURRENT_USER_NAME = "Guilherme Fabretti";
const CURRENT_USER_ROLE = "Gestor de Projetos";

const WORKSPACE_ITEMS = [
  {
    to: "dashboard",
    label: "Dashboard",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </>
    ),
  },
  {
    to: "atividades",
    label: "Atividades",
    icon: (
      <>
        <path d="M9 6h11M9 12h11M9 18h11" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
  },
  {
    to: "estrutura",
    label: "Estrutura",
    icon: (
      <>
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <rect x="3" y="17" width="6" height="4" rx="1" />
        <rect x="15" y="17" width="6" height="4" rx="1" />
        <path d="M12 7v4M12 11H6v6M12 11h6v6" />
      </>
    ),
  },
  {
    to: "issues",
    label: "Issues",
    icon: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
      </>
    ),
  },
];

const CONFIG_ICON = (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 0 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 0 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.96Z" />
  </>
);

const BACK_ICON = (
  <>
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </>
);

export default function ProjectNavDock() {
  const { id } = useParams();
  const { projects } = useProjects();
  const currentProject = projects.find((project) => project.id === id);
  const projectLabel = currentProject?.name ?? id ?? "";

  return (
    <Dropdown className="nav-dock">
      <Dropdown.Toggle as="button" id="nav-dock-toggle" className="footer-widget nav-dock-toggle">
        <FooterWidgetContent userName={CURRENT_USER_NAME} userRole={CURRENT_USER_ROLE} />
      </Dropdown.Toggle>
      <Dropdown.Menu className="nav-dock-panel">
        <div className="nav-dock-group-label">Workspace</div>
        <nav className="nav-dock-items">
          {WORKSPACE_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={`/projetos/${id}/${item.to}`}
              className={({ isActive }) => `nav-dock-item${isActive ? " active" : ""}`}
            >
              <NavIcon>{item.icon}</NavIcon>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-dock-group-label">Administração</div>
        <nav className="nav-dock-items">
          <NavLink
            to={`/projetos/${id}/config`}
            className={({ isActive }) => `nav-dock-item${isActive ? " active" : ""}`}
          >
            <NavIcon>{CONFIG_ICON}</NavIcon>
            Papel &amp; Config
          </NavLink>
          <NavLink to="/projetos" className="nav-dock-item">
            <NavIcon>{BACK_ICON}</NavIcon>
            Meus Projetos
          </NavLink>
        </nav>

        <div className="nav-dock-footer">
          <div className="nav-dock-project-pill">
            <div className="nav-dock-project-pill-label">Projeto ativo</div>
            <div className="nav-dock-project-pill-value">
              <span className="nav-dock-project-dot" />
              {projectLabel}
            </div>
          </div>
        </div>
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
git add src/components/project-nav/ProjectNavDock.tsx
git commit -m "feat: rebuild ProjectNavDock as a footer-widget-style toggle with a dropdown nav panel"
```

## Context

Task 14 de 16. Maior mudança estrutural desta passada inteira. O mockup (`HIVE - Telas Projeto Específico.html`, linhas 759-816) usa exatamente o mesmo botão marca+usuário da tela "Meus Projetos" (`.footer-widget`) como *gatilho* de um painel de navegação, não uma barra de abas sempre visível — por isso reaproveita `FooterWidgetContent` (Task 2) dentro de um `Dropdown.Toggle as="button"`. `CURRENT_USER_NAME`/`CURRENT_USER_ROLE` são strings literais repetidas aqui (não importadas de um módulo compartilhado) porque o mesmo padrão já existe duplicado no restante do código (`ProjectsPage.tsx` passa os mesmos valores direto para `<FooterWidget>`; `ProjectActivitiesPage.tsx` tem sua própria constante `CURRENT_USER_NAME`) — seguir a convenção já estabelecida em vez de introduzir uma fonte única agora, fora do escopo desta passada visual.

O chip "Projeto ativo" busca o nome do projeto via `useProjects()` — mesmo hook que alimenta `ProjectsPage` — localizando pelo `id` da rota; se não encontrar (não deve acontecer em uso normal via clique numa linha de projeto), cai para mostrar o próprio `id` como texto, sem quebrar a renderização. **Limitação conhecida, não corrigida nesta passada:** como `useProjects()` não usa nenhum estado/contexto compartilhado entre chamadas (cada `useProjects()` é sua própria instância de `useState`, mesmo padrão de `useActivities`), um projeto criado via o modal "Novo projeto" em `ProjectsPage` não vai aparecer pelo nome aqui — `ProjectNavDock` cai no fallback do `id` bruto (ex.: `project-1755025200000`) para esse caso específico. Isso é uma limitação arquitetural pré-existente do padrão de hooks mockados usado em todo o app, não algo introduzido por esta task, e está fora do escopo desta passada visual corrigir.

"Meus Projetos" é o último item de navegação, dentro do grupo "Administração" (sem rótulo de grupo próprio) — decisão confirmada com o usuário. Ele usa uma `className` string fixa (`"nav-dock-item"`, sem a função `({isActive}) => ...`) em vez do mesmo padrão de active-state dos outros itens, porque `to="/projetos"` bateria como "prefixo ativo" o tempo todo dentro de qualquer rota `/projetos/:id/*` (o comportamento padrão do `NavLink` sem a prop `end` casa por prefixo) — deixando esse item permanentemente destacado, o que não faz sentido para uma ação de "voltar", não de "seção atual". `Dropdown` (não `autoClose="outside"`) usa o comportamento padrão (fecha ao clicar em qualquer lugar, dentro ou fora do painel) — clicar num item de navegação deve fechar o painel, diferente dos filtros (Tasks 5-6), que precisam ficar abertos enquanto checkboxes são marcados.

---

### Task 15: `_project-nav-dock.scss` — reescrita completa

**Files:**
- Modify: `src/styles/_project-nav-dock.scss`

- [ ] **Step 1: Reescrever o arquivo inteiro**

Current `src/styles/_project-nav-dock.scss`:
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

Replace with:
```scss
@use "colors" as c;

// Contêiner fixo do dropdown (gatilho + painel)
.nav-dock {
  position: fixed;
  left: 0;
  right: 0;
  top: 18px;
  margin: 0 auto;
  z-index: 20;
  width: 520px;
  max-width: calc(100% - 32px);
}

// Gatilho — reaproveita .footer-widget, só remove o caret automático do Dropdown.Toggle
.nav-dock-toggle {
  width: 100%;
}
.nav-dock-toggle::after {
  display: none;
}

// Painel
.nav-dock-panel {
  width: 100%;
  margin-top: 6px;
  background-color: c.$surface;
  border: 1px solid c.$border;
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(31, 32, 36, 0.2);
  padding: 14px;
}

.nav-dock-group-label {
  font-size: 10px;
  color: c.$text-faint;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 12px 10px 6px;
  font-weight: 700;
}
.nav-dock-group-label:first-child {
  padding-top: 2px;
}

.nav-dock-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-dock-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: c.$text-dim;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid transparent;
}
.nav-dock-item:hover {
  background-color: c.$bg-alt;
  color: c.$text;
}
.nav-dock-item.active {
  background-color: c.$yellow-soft;
  color: c.$yellow-deep;
  border-color: rgba(255, 227, 110, 0.45);
}

.nav-icon {
  width: 16px;
  height: 16px;
  flex: none;
  opacity: 0.75;
}
.nav-dock-item.active .nav-icon {
  opacity: 1;
}

.nav-dock-footer {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid c.$border;
}

.nav-dock-project-pill {
  border: 1px solid c.$border;
  border-radius: 8px;
  padding: 9px 10px;
  background-color: c.$bg-alt;
}
.nav-dock-project-pill-label {
  font-size: 9.5px;
  color: c.$text-faint;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}
.nav-dock-project-pill-value {
  font-size: 12.5px;
  font-weight: 600;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: c.$text;
}
.nav-dock-project-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: c.$green;
  flex: none;
}

.project-layout-content {
  padding-top: 6rem;
}
```

- [ ] **Step 2: Type-check e build**

Run: `npx tsc -b && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/_project-nav-dock.scss
git commit -m "style: rewrite the nav dock SCSS for the toggle+panel pattern"
```

## Context

Task 15 de 16. `.nav-dock-toggle` só define `width: 100%` (para preencher o contêiner de 520px) e esconde o caret do `Dropdown.Toggle` — todo o resto do visual do botão (marca, divisor, usuário, pílula, sombra) já vem de `.footer-widget` (`_footer-widget.scss`), reaproveitado via a classe composta `footer-widget nav-dock-toggle` no componente (Task 14). `.nav-dock-item.active` usa os mesmos tokens (`$yellow-soft`/`$yellow-deep`) já usados em `.stat-chip-active` (Task 3) e no `.badge.active` do mockup — consistência de "estado selecionado = amarelo" em toda a passada. `.nav-dock-project-dot` é verde fixo (`$green`), igual ao `.dot` do mockup (linha 195: `background:#4FBF8B`, mapeado para o token `$green` já existente na paleta, mais próximo do que introduzir uma cor nova só para este ponto). `.project-layout-content` (padding-top do `<main>` do `ProjectLayout`) permanece inalterado — a altura do dock (gatilho fixo + painel que só aparece ao abrir) não muda o espaço reservado no topo da página, já que o painel abre *sobre* o conteúdo (posição fixa, `Dropdown.Menu` não desloca o layout).

---

### Task 16: Verificação manual final

**Files:** nenhum (só verificação)

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: completa sem erros de TypeScript, Sass ou Vite.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem erros.

- [ ] **Step 3: Iniciar o servidor de desenvolvimento**

Run: `npm run dev`
Expected: imprime uma URL local.

- [ ] **Step 4: Checklist manual no navegador**

Abrir o app e comparar lado a lado com `HIVE - Telas Projeto Específico.html` (seção `#page-atividades`), confirmando:

- [ ] Tela "Meus Projetos": o `FooterWidget` mostra a logo (abelha) antes de "HIVE" — sem outra mudança visual na página.
- [ ] Clicar num projeto leva a `/projetos/<id>/atividades`; no topo aparece o mesmo botão marca+usuário (não mais uma barra de 5 abas).
- [ ] Clicar no botão abre o painel: grupo "Workspace" (Dashboard/Atividades/Estrutura/Issues) com ícones, grupo "Administração" (Papel & Config, depois "Meus Projetos" por último), e o chip "Projeto ativo" no rodapé mostrando o nome do projeto correto.
- [ ] O item "Atividades" aparece destacado (fundo amarelo) enquanto nessa rota; clicar em outro item navega e fecha o painel; clicar em "Meus Projetos" volta para `/projetos` (sem ficar destacado antes disso).
- [ ] Os 6 chips de estatística aparecem como mini-cards verticais (valor grande em cima, rótulo embaixo), com as cores certas (verde/amarelo/vermelho) e o clique continua filtrando a tabela.
- [ ] Os 6 filtros (Status, Tester, Dev, Período, Retestes, Módulo/Processo) aparecem como pílulas com chevron; ficam com borda/fundo amarelos quando têm valor selecionado.
- [ ] O filtro de Período abre um painel com o switch "Usar período customizado" — campos De/Até desabilitados até ligar o switch; ao desligar, os dois campos voltam a `null` (a tabela volta a mostrar todas as datas).
- [ ] "Limpar todos" aparece como texto sublinhado (não botão) e continua limpando todos os filtros, incluindo o switch de período.
- [ ] "Agrupar por" é um único dropdown "Agrupar: {modo}"; as 3 opções (Árvore/Tester/Status) continuam funcionando.
- [ ] "Minhas atividades" aparece como uma pílula que fica amarela quando ativa.
- [ ] O cabeçalho da página mostra os 3 botões "Exportar atividades"/"Importar em massa"/"+ Nova atividade" — clicáveis, sem fazer nada.
- [ ] A tabela mostra 13 colunas: checkbox, Nome (com ícone ↕), ID, Status (com ↕ e badge em pílula com bolinha), Tester/Dev (com avatar circular de iniciais), Início/Conclusão planejada e real (4 colunas separadas), Predec., Reteste (pílula colorida com ↕), Issues.
- [ ] No modo Árvore: linhas de Módulo/Processo mostram a mini barra de progresso verde ao lado da contagem; atividades-folha aparecem recuadas.
- [ ] Nos modos Tester/Status: cada atividade mostra uma linha pequena "Módulo › Processo" abaixo do nome.
- [ ] Atividades atrasadas mostram: barra vermelha na lateral esquerda da linha, data de conclusão planejada em vermelho negrito, e a tag "Atrasado" em pílula ao lado da data.
- [ ] Clicar numa linha de atividade (fora do checkbox) continua navegando para o placeholder de detalhe; clicar no checkbox da linha não navega.
- [ ] Sem erros no console do navegador.

- [ ] **Step 5: Parar o servidor de desenvolvimento**

Parar o processo (Ctrl+C no terminal rodando `npm run dev`).

- [ ] **Step 6: Corrigir problemas encontrados, então commitar se houve mudanças**

Se o Step 4 revelou problemas, corrigir o(s) arquivo(s) relevante(s), rodar de novo os Steps 1-4, então:
```bash
git add -A
git commit -m "fix: address issues found in manual QA of the Activities visual fidelity pass"
```
Se nenhum problema foi encontrado, nenhum commit é necessário para esta task.

---

## Out of scope (per spec)

- Qualquer funcionalidade real por trás dos elementos decorativos (seleção em massa, ordenação de colunas, exportar, importar, criar atividade).
- As 4 variantes de tela de detalhe de atividade, o drawer de visualização rápida, Issues/Estrutura/Dashboard/Papel & Config como conteúdo real, Cutover.
- Suporte a modo escuro.
- Qualquer mudança na estrutura de dados (`Activity`, `ActivityStats`) além de `ActivityFiltersState.dateRangeEnabled`.
- Corrigir a limitação de `useProjects()` não compartilhar estado entre chamadas (chip "Projeto ativo" cai no `id` bruto para projetos criados via modal, ver Task 14).
