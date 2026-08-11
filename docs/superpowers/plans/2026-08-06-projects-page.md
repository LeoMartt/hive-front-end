# Tela "Meus Projetos" (Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real screen of the HIVE front-end — the "Meus Projetos" dashboard (stat cards, tabs, search, projects table, team modal, new-project modal) — as React/TypeScript/Bootstrap components backed by typed mock data, per `docs/superpowers/specs/2026-08-06-projects-page-design.md`.

**Architecture:** Small, single-responsibility components under `src/components/projects/`, composed by `src/pages/ProjectsPage.tsx`. Data comes from a `useProjects` hook over typed local mock data (swappable for a real API later without touching components). Bootstrap components (via `react-bootstrap`) are used for everything they cover; a handful of custom SCSS utility classes in `src/styles/` cover the few pieces Bootstrap doesn't provide (accent bars, SPI colors, avatar stack, floating footer widget). React Router (`react-router` v8, already installed) wires `/projetos` and a `/projetos/:id` placeholder.

**Tech Stack:** React 19, TypeScript, Vite, react-bootstrap (new dependency) + bootstrap (already installed), SCSS (`sass`, new dev dependency), react-router v8.

**No automated tests in this plan** — per the approved spec, this stage has no test framework configured; verification is TypeScript compilation (`npx tsc -b`) after each task plus a manual browser QA pass in the final task.

---

## File Structure Overview

```
src/
├── types/
│   └── project.ts                      # new
├── utils/
│   ├── formatRelativeTime.ts           # new
│   └── projectIndicators.ts            # new
├── styles/
│   ├── _colors.scss                    # new
│   ├── _ui-extras.scss                 # new
│   ├── _footer-widget.scss             # new
│   └── main.scss                       # new
├── hooks/
│   └── useProjects.ts                  # new
├── components/projects/
│   ├── FooterWidget.tsx                # new
│   ├── StatCard.tsx                    # new
│   ├── ProjectsToolbar.tsx             # new
│   ├── TeamAvatars.tsx                 # new
│   ├── TeamModal.tsx                   # new
│   ├── EmptyState.tsx                  # new
│   ├── ProjectRow.tsx                  # new
│   ├── ProjectsTable.tsx               # new
│   └── NewProjectModal.tsx             # new
├── pages/
│   ├── ProjectsPage.tsx                # new
│   └── ProjectDetailPage.tsx           # new
├── routes/
│   └── AppRoutes.tsx                   # new
├── App.tsx                             # modified — mounts BrowserRouter + AppRoutes
└── main.tsx                            # modified — imports styles/main.scss
```

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install react-bootstrap and sass**

Run:
```bash
npm install react-bootstrap
npm install -D sass
```

- [ ] **Step 2: Verify install**

Run: `npm ls react-bootstrap sass`
Expected: both packages listed with no `UNMET DEPENDENCY` / `invalid` warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-bootstrap and sass dependencies"
```

---

### Task 2: Domain types and utility helpers

**Files:**
- Create: `src/types/project.ts`
- Create: `src/utils/formatRelativeTime.ts`
- Create: `src/utils/projectIndicators.ts`

- [ ] **Step 1: Create the domain types**

`src/types/project.ts`:
```ts
export type ProjectMode = "uat" | "cutover";

export type UserRole = "Gestor de Projetos" | "Tester" | "Desenvolvedor";

export interface TeamMember {
  initials: string;
  name: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  mode: ProjectMode;
  activityCount: number;
  completedCount: number;
  hierarchyLevels: string[];
  progressPercent: number;
  spi: number | null;
  team: TeamMember[];
  updatedAt: string;
}

export interface ProjectStats {
  total: number;
  uatCount: number;
  cutoverCount: number;
  avgSpi: number | null;
}

export interface NewProjectInput {
  name: string;
  description: string;
  mode: ProjectMode;
  hierarchyLevels: string[];
  team: TeamMember[];
}
```

- [ ] **Step 2: Create the relative-time formatter**

`src/utils/formatRelativeTime.ts`:
```ts
export function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  return `há ${diffDays} dias`;
}
```

- [ ] **Step 3: Create the project status/SPI indicator helpers**

`src/utils/projectIndicators.ts`:
```ts
import type { Project } from "../types/project";

export type StatusVariant = "success" | "danger" | "info";
export type SpiVariant = "good" | "warn" | "bad";

export function getProjectStatusVariant(project: Project): StatusVariant {
  if (project.progressPercent >= 100) return "success";
  if (project.spi !== null && project.spi < 0.7) return "danger";
  return "info";
}

export function getSpiVariant(spi: number | null): SpiVariant | null {
  if (spi === null) return null;
  if (spi >= 0.9) return "good";
  if (spi >= 0.7) return "warn";
  return "bad";
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/project.ts src/utils/formatRelativeTime.ts src/utils/projectIndicators.ts
git commit -m "feat: add project domain types and indicator/formatting helpers"
```

---

### Task 3: Global styles

**Files:**
- Create: `src/styles/_colors.scss`
- Create: `src/styles/_ui-extras.scss`
- Create: `src/styles/_footer-widget.scss`
- Create: `src/styles/main.scss`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create the color palette partial**

`src/styles/_colors.scss`:
```scss
$color-success: #2f8f5b;
$color-warning: #8a6d00;
$color-danger: #c6373f;
$color-info: #3b5fc4;
```

- [ ] **Step 2: Create the UI-extras partial (pieces Bootstrap doesn't cover)**

`src/styles/_ui-extras.scss`:
```scss
@use "colors" as c;

.accent-bar {
  width: 4px;
  border-radius: 3px;
  align-self: stretch;
  flex-shrink: 0;
}
.accent-bar-success { background-color: c.$color-success; }
.accent-bar-danger { background-color: c.$color-danger; }
.accent-bar-info { background-color: c.$color-info; }

.spi-value {
  font-family: var(--bs-font-monospace);
  font-weight: 700;
}
.spi-value-good { color: c.$color-success; }
.spi-value-warn { color: c.$color-warning; }
.spi-value-bad { color: c.$color-danger; }

.avatar-stack {
  display: flex;
  align-items: center;
}
.avatar-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: var(--bs-secondary-bg);
  border: 2px solid var(--bs-body-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  margin-left: -8px;
  flex-shrink: 0;
}
.avatar-circle:first-child {
  margin-left: 0;
}

.project-search-input {
  max-width: 260px;
}

.empty-state-description {
  max-width: 320px;
}

.level-index {
  width: 16px;
  flex-shrink: 0;
  text-align: center;
}

.role-select {
  width: 180px;
  flex-shrink: 0;
}

.progress-cell {
  min-width: 170px;
}

.col-project-name {
  width: 30%;
}

.projects-page {
  padding-top: 6rem;
}
```

- [ ] **Step 3: Create the footer widget partial**

`src/styles/_footer-widget.scss`:
```scss
@use "colors" as c;

.footer-widget {
  position: fixed;
  top: 18px;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: 20;
  width: 520px;
  max-width: calc(100% - 32px);
  background-color: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  padding: 10px 12px 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 6px 20px rgba(31, 32, 36, 0.1);
}

.footer-widget-divider {
  width: 1px;
  height: 26px;
  background-color: var(--bs-border-color);
}

.footer-widget-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(255, 227, 110, 0.4);
  border: 1px solid rgba(255, 227, 110, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--bs-font-monospace);
  font-weight: 700;
  font-size: 0.72rem;
  color: c.$color-warning;
}
```

- [ ] **Step 4: Create the styles entry point**

`src/styles/main.scss`:
```scss
@use "ui-extras";
@use "footer-widget";
```

- [ ] **Step 5: Wire the entry point into main.tsx**

In `src/main.tsx`, add the new import after the Bootstrap CSS import:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './styles/main.scss'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Verify the dev server compiles the styles**

Run: `npm run dev` (stop it after confirming no Vite/Sass error appears in the terminal output, e.g. with a few seconds of the process then Ctrl+C, or check `npm run build` instead for a one-shot check)
Expected: no Sass compilation errors.

- [ ] **Step 7: Commit**

```bash
git add src/styles/_colors.scss src/styles/_ui-extras.scss src/styles/_footer-widget.scss src/styles/main.scss src/main.tsx
git commit -m "style: add HIVE color palette and utility SCSS for pieces Bootstrap doesn't cover"
```

---

### Task 4: Mock data hook (`useProjects`)

**Files:**
- Create: `src/hooks/useProjects.ts`

- [ ] **Step 1: Create the hook with seed data and derived stats**

`src/hooks/useProjects.ts`:
```ts
import { useMemo, useState } from "react";
import type { NewProjectInput, Project, ProjectStats } from "../types/project";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60000).toISOString();
}

const CURRENT_USER_TEAM_MEMBER = {
  initials: "GF",
  name: "Guilherme Fabretti",
  role: "Gestor de Projetos" as const,
};

const INITIAL_PROJECTS: Project[] = [
  {
    id: "erp-migration",
    name: "ERP Migration — Rollout Fase 2",
    mode: "cutover",
    activityCount: 32,
    completedCount: 25,
    hierarchyLevels: ["Módulo", "Processo"],
    progressPercent: 78,
    spi: 0.62,
    team: [
      { initials: "VC", name: "Vinícius Calefo Assarice", role: "Gestor de Projetos" },
      { initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" },
      { initials: "RL", name: "R. Lima", role: "Tester" },
      { initials: "JP", name: "J. Prado", role: "Desenvolvedor" },
    ],
    updatedAt: minutesAgo(12),
  },
  {
    id: "crm-homologacao",
    name: "CRM Homologação Comercial",
    mode: "uat",
    activityCount: 58,
    completedCount: 26,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 45,
    spi: 0.79,
    team: [
      { initials: "GF", name: "Guilherme Fabretti", role: "Gestor de Projetos" },
      { initials: "RS", name: "Rafael Souza", role: "Tester" },
    ],
    updatedAt: minutesAgo(40),
  },
  {
    id: "portal-rh",
    name: "Portal RH — Onboarding Digital",
    mode: "uat",
    activityCount: 19,
    completedCount: 17,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 92,
    spi: 0.95,
    team: [{ initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" }],
    updatedAt: minutesAgo(3),
  },
  {
    id: "faturamento-b2b",
    name: "Plataforma Faturamento B2B",
    mode: "uat",
    activityCount: 44,
    completedCount: 13,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 30,
    spi: 0.51,
    team: [
      { initials: "VC", name: "Vinícius Calefo Assarice", role: "Gestor de Projetos" },
      { initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" },
      { initials: "CP", name: "C. Prado", role: "Tester" },
      { initials: "MT", name: "M. Torres", role: "Desenvolvedor" },
    ],
    updatedAt: minutesAgo(60),
  },
  {
    id: "app-mobile-aprovacoes",
    name: "App Mobile — Aprovações",
    mode: "uat",
    activityCount: 27,
    completedCount: 16,
    hierarchyLevels: ["Área", "Cenário"],
    progressPercent: 60,
    spi: 0.83,
    team: [
      { initials: "RS", name: "Rafael Souza", role: "Tester" },
      { initials: "GF", name: "Guilherme Fabretti", role: "Gestor de Projetos" },
    ],
    updatedAt: minutesAgo(120),
  },
  {
    id: "integracao-logistica-sul",
    name: "Integração Logística Sul",
    mode: "cutover",
    activityCount: 21,
    completedCount: 21,
    hierarchyLevels: ["Módulo", "Processo"],
    progressPercent: 100,
    spi: 1.0,
    team: [
      { initials: "LM", name: "Leonardo Martins da Silva", role: "Tester" },
      { initials: "VC", name: "Vinícius Calefo Assarice", role: "Gestor de Projetos" },
    ],
    updatedAt: minutesAgo(60 * 24),
  },
];

interface UseProjectsResult {
  projects: Project[];
  stats: ProjectStats;
  createProject: (input: NewProjectInput) => void;
}

export function useProjects(): UseProjectsResult {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);

  const stats = useMemo<ProjectStats>(() => {
    const total = projects.length;
    const uatCount = projects.filter((p) => p.mode === "uat").length;
    const cutoverCount = total - uatCount;
    const spiValues = projects
      .map((p) => p.spi)
      .filter((spi): spi is number => spi !== null);
    const avgSpi =
      spiValues.length === 0
        ? null
        : spiValues.reduce((sum, value) => sum + value, 0) / spiValues.length;
    return { total, uatCount, cutoverCount, avgSpi };
  }, [projects]);

  function createProject(input: NewProjectInput): void {
    const team = input.team.length > 0 ? input.team : [CURRENT_USER_TEAM_MEMBER];
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: input.name.trim() || "Novo projeto sem nome",
      mode: input.mode,
      activityCount: 0,
      completedCount: 0,
      hierarchyLevels: input.hierarchyLevels,
      progressPercent: 0,
      spi: null,
      team,
      updatedAt: minutesAgo(0),
    };
    setProjects((prev) => [newProject, ...prev]);
  }

  return { projects, stats, createProject };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useProjects.ts
git commit -m "feat: add useProjects hook with typed mock data and stats"
```

---

### Task 5: FooterWidget component

**Files:**
- Create: `src/components/projects/FooterWidget.tsx`

- [ ] **Step 1: Create the component**

`src/components/projects/FooterWidget.tsx`:
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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/FooterWidget.tsx
git commit -m "feat: add FooterWidget component"
```

---

### Task 6: StatCard component

**Files:**
- Create: `src/components/projects/StatCard.tsx`

- [ ] **Step 1: Create the component**

`src/components/projects/StatCard.tsx`:
```tsx
interface StatCardProps {
  label: string;
  value: string;
  sub: string;
}

export default function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="text-uppercase text-body-secondary small fw-bold mb-2">{label}</div>
        <div className="fs-2 fw-bold font-monospace">{value}</div>
        <div className="text-body-secondary small mt-1">{sub}</div>
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
git add src/components/projects/StatCard.tsx
git commit -m "feat: add StatCard component"
```

---

### Task 7: ProjectsToolbar component

**Files:**
- Create: `src/components/projects/ProjectsToolbar.tsx`

- [ ] **Step 1: Create the component**

`src/components/projects/ProjectsToolbar.tsx`:
```tsx
import Nav from "react-bootstrap/Nav";
import Form from "react-bootstrap/Form";
import type { ProjectMode } from "../../types/project";

export type ProjectsTabFilter = "all" | ProjectMode;

interface ProjectsToolbarProps {
  activeTab: ProjectsTabFilter;
  onTabChange: (tab: ProjectsTabFilter) => void;
  counts: { all: number; uat: number; cutover: number };
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function ProjectsToolbar({
  activeTab,
  onTabChange,
  counts,
  searchQuery,
  onSearchChange,
}: ProjectsToolbarProps) {
  return (
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
      <Nav
        variant="pills"
        activeKey={activeTab}
        onSelect={(key) => onTabChange((key ?? "all") as ProjectsTabFilter)}
      >
        <Nav.Item>
          <Nav.Link eventKey="all">
            Todos <span className="text-body-secondary">{counts.all}</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="uat">
            UAT <span className="text-body-secondary">{counts.uat}</span>
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="cutover">
            Cutover <span className="text-body-secondary">{counts.cutover}</span>
          </Nav.Link>
        </Nav.Item>
      </Nav>
      <Form.Control
        type="text"
        placeholder="Buscar projeto…"
        className="project-search-input"
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
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
git add src/components/projects/ProjectsToolbar.tsx
git commit -m "feat: add ProjectsToolbar component (tabs + search)"
```

---

### Task 8: TeamAvatars and TeamModal components

**Files:**
- Create: `src/components/projects/TeamAvatars.tsx`
- Create: `src/components/projects/TeamModal.tsx`

- [ ] **Step 1: Create TeamAvatars**

`src/components/projects/TeamAvatars.tsx`:
```tsx
import type { TeamMember } from "../../types/project";

interface TeamAvatarsProps {
  team: TeamMember[];
  onOpenTeam: () => void;
}

const MAX_VISIBLE = 3;

export default function TeamAvatars({ team, onOpenTeam }: TeamAvatarsProps) {
  const visible = team.slice(0, MAX_VISIBLE);
  const remaining = team.length - visible.length;

  return (
    <div
      className="avatar-stack"
      role="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpenTeam();
      }}
    >
      {visible.map((member) => (
        <div className="avatar-circle" key={member.initials + member.role}>
          {member.initials}
        </div>
      ))}
      {remaining > 0 && <div className="avatar-circle text-body-secondary">+{remaining}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Create TeamModal**

`src/components/projects/TeamModal.tsx`:
```tsx
import Modal from "react-bootstrap/Modal";
import type { TeamMember } from "../../types/project";

interface TeamModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
}

export default function TeamModal({ show, onHide, team }: TeamModalProps) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h6">Equipe do projeto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ul className="list-unstyled mb-0">
          {team.map((member) => (
            <li
              key={member.initials + member.role}
              className="d-flex align-items-center gap-2 py-2 border-bottom"
            >
              <div className="avatar-circle">{member.initials}</div>
              <div>
                <div className="fw-semibold">{member.name}</div>
                <div className="text-body-secondary small">{member.role}</div>
              </div>
            </li>
          ))}
        </ul>
      </Modal.Body>
    </Modal>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/projects/TeamAvatars.tsx src/components/projects/TeamModal.tsx
git commit -m "feat: add TeamAvatars and TeamModal components"
```

---

### Task 9: EmptyState component

**Files:**
- Create: `src/components/projects/EmptyState.tsx`

- [ ] **Step 1: Create the component**

`src/components/projects/EmptyState.tsx`:
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

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/EmptyState.tsx
git commit -m "feat: add EmptyState component"
```

---

### Task 10: ProjectRow and ProjectsTable components

**Files:**
- Create: `src/components/projects/ProjectRow.tsx`
- Create: `src/components/projects/ProjectsTable.tsx`

- [ ] **Step 1: Create ProjectRow**

`src/components/projects/ProjectRow.tsx`:
```tsx
import { useNavigate } from "react-router";
import ProgressBar from "react-bootstrap/ProgressBar";
import Badge from "react-bootstrap/Badge";
import TeamAvatars from "./TeamAvatars";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import { getProjectStatusVariant, getSpiVariant } from "../../utils/projectIndicators";
import type { Project } from "../../types/project";

interface ProjectRowProps {
  project: Project;
  onOpenTeam: (team: Project["team"]) => void;
}

export default function ProjectRow({ project, onOpenTeam }: ProjectRowProps) {
  const navigate = useNavigate();
  const statusVariant = getProjectStatusVariant(project);
  const spiVariant = getSpiVariant(project.spi);
  const hierarchyLabel = [...project.hierarchyLevels, "Atividade"].join(" > ");

  return (
    <tr role="button" onClick={() => navigate(`/projetos/${project.id}`)}>
      <td>
        <div className="d-flex gap-2">
          <span className={`accent-bar accent-bar-${statusVariant}`} />
          <div>
            <Badge bg={project.mode === "uat" ? "info" : "warning"} className="mb-1">
              {project.mode === "uat" ? "UAT" : "Cutover"}
            </Badge>
            <div className="fw-semibold">{project.name}</div>
            <div className="text-body-secondary small">
              {project.activityCount} atividades · nível {hierarchyLabel}
            </div>
          </div>
        </div>
      </td>
      <td className="progress-cell">
        <ProgressBar now={project.progressPercent} variant={statusVariant} className="mb-1" />
        <div className="d-flex justify-content-between text-body-secondary small font-monospace">
          <span>{project.progressPercent}%</span>
          <span>
            {project.completedCount}/{project.activityCount}
          </span>
        </div>
      </td>
      <td>
        {project.spi !== null && spiVariant ? (
          <span className={`spi-value spi-value-${spiVariant}`}>{project.spi.toFixed(2)}</span>
        ) : (
          <span className="text-body-secondary">—</span>
        )}
      </td>
      <td onClick={(event) => event.stopPropagation()}>
        <TeamAvatars team={project.team} onOpenTeam={() => onOpenTeam(project.team)} />
      </td>
      <td className="text-body-secondary small font-monospace">
        {formatRelativeTime(project.updatedAt)}
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Create ProjectsTable**

`src/components/projects/ProjectsTable.tsx`:
```tsx
import Table from "react-bootstrap/Table";
import ProjectRow from "./ProjectRow";
import EmptyState from "./EmptyState";
import type { Project } from "../../types/project";

interface ProjectsTableProps {
  projects: Project[];
  onOpenTeam: (team: Project["team"]) => void;
}

export default function ProjectsTable({ projects, onOpenTeam }: ProjectsTableProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="Nenhum resultado encontrado"
        description="Ajuste a busca ou o filtro de aba para encontrar o projeto que procura."
      />
    );
  }

  return (
    <Table hover responsive className="align-middle mb-0">
      <thead>
        <tr>
          <th className="col-project-name">Projeto</th>
          <th>Progresso</th>
          <th>SPI</th>
          <th>Equipe</th>
          <th>Atualizado</th>
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <ProjectRow key={project.id} project={project} onOpenTeam={onOpenTeam} />
        ))}
      </tbody>
    </Table>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/projects/ProjectRow.tsx src/components/projects/ProjectsTable.tsx
git commit -m "feat: add ProjectRow and ProjectsTable components"
```

---

### Task 11: NewProjectModal component

**Files:**
- Create: `src/components/projects/NewProjectModal.tsx`

- [ ] **Step 1: Create the component**

`src/components/projects/NewProjectModal.tsx`:
```tsx
import { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import type { NewProjectInput, ProjectMode, TeamMember, UserRole } from "../../types/project";

interface NewProjectModalProps {
  show: boolean;
  onHide: () => void;
  onCreate: (input: NewProjectInput) => void;
}

interface MockUser {
  initials: string;
  name: string;
}

const MOCK_USERS: MockUser[] = [
  { initials: "GF", name: "Guilherme Fabretti" },
  { initials: "VC", name: "Vinícius Calefo Assarice" },
  { initials: "LM", name: "Leonardo Martins da Silva" },
  { initials: "RS", name: "Rafael Souza" },
  { initials: "RL", name: "R. Lima" },
  { initials: "JP", name: "J. Prado" },
  { initials: "CP", name: "C. Prado" },
  { initials: "MT", name: "M. Torres" },
];

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
  userSearch: string;
  selectedUser: MockUser | null;
  selectedRole: UserRole;
}

function createEmptyState(): NewProjectFormState {
  return {
    name: "",
    description: "",
    mode: "uat",
    levelNames: LEVEL_DEFAULTS.uat,
    members: [],
    userSearch: "",
    selectedUser: null,
    selectedRole: ROLE_OPTIONS[0],
  };
}

export default function NewProjectModal({ show, onHide, onCreate }: NewProjectModalProps) {
  const [state, setState] = useState<NewProjectFormState>(createEmptyState);

  function resetAndHide() {
    setState(createEmptyState());
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

  const filteredUsers = MOCK_USERS.filter((user) =>
    user.name.toLowerCase().includes(state.userSearch.trim().toLowerCase())
  );

  function handleSelectUser(user: MockUser) {
    setState((prev) => ({ ...prev, selectedUser: user, userSearch: user.name }));
  }

  function handleAddUser() {
    if (!state.selectedUser) return;
    const newMember: TeamMember = {
      initials: state.selectedUser.initials,
      name: state.selectedUser.name,
      role: state.selectedRole,
    };
    setState((prev) => {
      const alreadyAdded = prev.members.some(
        (member) => member.initials === newMember.initials && member.role === newMember.role
      );
      if (alreadyAdded) return prev;
      return {
        ...prev,
        members: [...prev.members, newMember],
        userSearch: "",
        selectedUser: null,
      };
    });
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
      hierarchyLevels: state.levelNames.map((level) => level.trim()).filter(Boolean),
      team: state.members,
    });
    resetAndHide();
  }

  const canConfirm = state.name.trim().length > 0;

  return (
    <Modal show={show} onHide={resetAndHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title as="h6">Novo projeto</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Nome do projeto</Form.Label>
          <Form.Control
            type="text"
            placeholder="Ex.: CRM Homologação Comercial"
            value={state.name}
            onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>
            Descrição <span className="text-body-secondary fw-normal">(opcional)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Contexto do projeto, escopo, sistemas envolvidos…"
            value={state.description}
            onChange={(event) =>
              setState((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label className="d-block">Modo</Form.Label>
          <div className="btn-group w-100" role="group">
            <Button
              type="button"
              variant={state.mode === "uat" ? "primary" : "outline-secondary"}
              onClick={() => handleModeChange("uat")}
            >
              UAT
            </Button>
            <Button
              type="button"
              variant={state.mode === "cutover" ? "primary" : "outline-secondary"}
              onClick={() => handleModeChange("cutover")}
            >
              Cutover
            </Button>
          </div>
          <Form.Text>O modo não pode ser alterado após a criação do projeto.</Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Nomes dos níveis hierárquicos</Form.Label>
          {state.levelNames.map((levelName, index) => (
            <div className="d-flex align-items-center gap-2 mb-2" key={index}>
              <span className="text-body-secondary small level-index">{index + 1}</span>
              <Form.Control
                type="text"
                value={levelName}
                onChange={(event) => handleLevelNameChange(index, event.target.value)}
              />
            </div>
          ))}
          <div className="d-flex align-items-center gap-2 text-body-secondary small">
            <span className="level-index">{state.levelNames.length + 1}</span>
            <span>Atividade (fixo)</span>
          </div>
        </Form.Group>

        <Form.Group className="mb-2">
          <Form.Label>Usuários do projeto</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Form.Control
              type="text"
              placeholder="Pesquisar usuário…"
              value={state.userSearch}
              onChange={(event) =>
                setState((prev) => ({ ...prev, userSearch: event.target.value, selectedUser: null }))
              }
            />
            <Form.Select
              className="role-select"
              value={state.selectedRole}
              onChange={(event) =>
                setState((prev) => ({ ...prev, selectedRole: event.target.value as UserRole }))
              }
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </Form.Select>
            <Button
              type="button"
              variant="outline-secondary"
              disabled={!state.selectedUser}
              onClick={handleAddUser}
            >
              +
            </Button>
          </div>

          {state.userSearch && !state.selectedUser && (
            <div className="list-group mb-2">
              {filteredUsers.length === 0 && (
                <div className="list-group-item text-body-secondary small">
                  Nenhum usuário encontrado.
                </div>
              )}
              {filteredUsers.map((user) => (
                <button
                  type="button"
                  key={user.initials}
                  className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                  onClick={() => handleSelectUser(user)}
                >
                  <span className="avatar-circle">{user.initials}</span>
                  {user.name}
                </button>
              ))}
            </div>
          )}

          {state.members.length === 0 ? (
            <p className="text-body-secondary small mb-0">Nenhum usuário adicionado ainda.</p>
          ) : (
            <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
              {state.members.map((member, index) => (
                <li
                  key={member.initials + member.role}
                  className="d-flex align-items-center gap-2 border rounded p-2"
                >
                  <span className="avatar-circle">{member.initials}</span>
                  <span className="flex-grow-1">
                    <span className="fw-semibold">{member.name}</span>{" "}
                    <span className="text-body-secondary small">{member.role}</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleRemoveUser(index)}
                  >
                    ✕
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Form.Text>
            Um usuário pode ter mais de um papel: adicione-o novamente com outro papel, se necessário.
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={resetAndHide}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={!canConfirm} onClick={handleConfirm}>
          Criar projeto
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projects/NewProjectModal.tsx
git commit -m "feat: add NewProjectModal component with UAT/Cutover level rules"
```

---

### Task 12: ProjectsPage composition

**Files:**
- Create: `src/pages/ProjectsPage.tsx`

- [ ] **Step 1: Create the page**

`src/pages/ProjectsPage.tsx`:
```tsx
import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import StatCard from "../components/projects/StatCard";
import ProjectsToolbar, { type ProjectsTabFilter } from "../components/projects/ProjectsToolbar";
import ProjectsTable from "../components/projects/ProjectsTable";
import TeamModal from "../components/projects/TeamModal";
import NewProjectModal from "../components/projects/NewProjectModal";
import FooterWidget from "../components/projects/FooterWidget";
import { useProjects } from "../hooks/useProjects";
import type { TeamMember } from "../types/project";

export default function ProjectsPage() {
  const { projects, stats, createProject } = useProjects();
  const [activeTab, setActiveTab] = useState<ProjectsTabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [teamModalMembers, setTeamModalMembers] = useState<TeamMember[] | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return projects.filter((project) => {
      if (activeTab !== "all" && project.mode !== activeTab) return false;
      if (query && !project.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [projects, activeTab, searchQuery]);

  const avgSpiLabel = stats.avgSpi === null ? "—" : stats.avgSpi.toFixed(2);
  const projectsSubLabel = `${stats.uatCount} em UAT · ${stats.cutoverCount} em Cutover`;

  return (
    <main className="container py-5 projects-page">
      <FooterWidget userName="Guilherme Fabretti" userRole="Gestor de Projetos" />

      <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 fw-bold mb-1">Dashboard</h1>
          <p className="text-body-secondary small mb-0">
            Visão geral das homologações em UAT e Cutover
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowNewProjectModal(true)}>
          Novo projeto
        </Button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <StatCard label="Projetos ativos" value={String(stats.total)} sub={projectsSubLabel} />
        </div>
        <div className="col-md-6">
          <StatCard
            label="SPI médio pessoal"
            value={avgSpiLabel}
            sub="Calculado sobre os projetos ativos"
          />
        </div>
      </div>

      <ProjectsToolbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={{
          all: projects.length,
          uat: projects.filter((p) => p.mode === "uat").length,
          cutover: projects.filter((p) => p.mode === "cutover").length,
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="card">
        <ProjectsTable projects={filteredProjects} onOpenTeam={setTeamModalMembers} />
      </div>

      <TeamModal
        show={teamModalMembers !== null}
        onHide={() => setTeamModalMembers(null)}
        team={teamModalMembers ?? []}
      />

      <NewProjectModal
        show={showNewProjectModal}
        onHide={() => setShowNewProjectModal(false)}
        onCreate={createProject}
      />
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ProjectsPage.tsx
git commit -m "feat: compose ProjectsPage from projects components"
```

---

### Task 13: Routing

**Files:**
- Create: `src/pages/ProjectDetailPage.tsx`
- Create: `src/routes/AppRoutes.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the placeholder detail page**

`src/pages/ProjectDetailPage.tsx`:
```tsx
import { Link, useParams } from "react-router";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="container py-5">
      <p className="text-body-secondary mb-2">
        <Link to="/projetos">&larr; Voltar para Meus Projetos</Link>
      </p>
      <h1 className="h4 fw-bold">Em construção</h1>
      <p className="text-body-secondary">
        A tela de detalhe do projeto <strong>{id}</strong> ainda não foi implementada.
      </p>
    </main>
  );
}
```

- [ ] **Step 2: Create the route configuration**

`src/routes/AppRoutes.tsx`:
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

- [ ] **Step 3: Rewrite App.tsx to mount the router**

`src/App.tsx`:
```tsx
import { BrowserRouter } from "react-router";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ProjectDetailPage.tsx src/routes/AppRoutes.tsx src/App.tsx
git commit -m "feat: wire routing for /projetos and /projetos/:id placeholder"
```

---

### Task 14: Manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: completes with no TypeScript or Vite/Sass errors.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 3: Manual checklist in the browser**

Open the printed URL and confirm:
- [ ] Redirect from `/` lands on `/projetos`.
- [ ] Two stat cards show correct totals matching the 6 seed projects (4 UAT / 2 Cutover) and an SPI average.
- [ ] Tabs "Todos / UAT / Cutover" filter the table and show correct counts.
- [ ] Search filters the table by project name (try "CRM").
- [ ] Search + tab combination that matches nothing shows the "Nenhum resultado encontrado" empty state.
- [ ] Clicking a row navigates to `/projetos/<id>` and shows the "Em construção" placeholder; the back link returns to `/projetos`.
- [ ] Clicking the team avatars opens the team modal with the right members and does **not** trigger row navigation.
- [ ] "Novo projeto" opens the modal; switching UAT/Cutover changes the number of level-name inputs (2 configurable for UAT, 1 for Cutover, plus fixed "Atividade").
- [ ] Searching and adding a user in the modal adds them to the list with the selected role; the same user can be added again with a different role; removing a member works.
- [ ] Confirming with a name creates a new project at the top of the table with 0%, "—" SPI, and the selected/created team; confirming is blocked when the name is empty.
- [ ] No errors in the browser console.

- [ ] **Step 4: Stop the dev server**

Stop the process (Ctrl+C in the terminal running `npm run dev`).

- [ ] **Step 5: Fix any issues found, then commit if changes were made**

If Step 3 revealed issues, fix the relevant component file(s), re-run Steps 1–3, then:
```bash
git add -A
git commit -m "fix: address issues found in manual QA of Projects page"
```
If no issues were found, no commit is needed for this task.

---

## Out of scope (per spec)

- Project detail page content (Atividades/Issues/Estrutura tabs).
- Real authentication / Azure AD / role-based access.
- Axios/API integration — `useProjects` is structured so its return shape can later be backed by a real API call without touching components.
- Shared layout/sidebar across pages.
