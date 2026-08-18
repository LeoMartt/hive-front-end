# HIVE — Frontend

HIVE (Homologation and Integrated Validation Environment) é o front-end de uma plataforma de gestão de projetos de UAT (User Acceptance Testing) para a FUMEP/EEP. Login corporativo via Entra ID (Azure AD SSO), gestão de projetos, atividades de teste, issues e dashboards de acompanhamento.

## Stack

- React 19 + TypeScript, Vite, react-router v8
- SCSS puro (**sem Bootstrap** — foi removido do projeto por completo; não reintroduzir)
- `@azure/msal-browser` / `@azure/msal-react` para login SSO (Entra ID)
- Chart.js v4 (uso direto da lib, sem `react-chartjs-2`)
- Zod (validação), Axios (não usado ainda para chamadas reais — dados são mockados)
- **Sem suíte de testes automatizados** — decisão deliberada e repetida em todas as specs do projeto. Verificação é `npx tsc -b` + `npm run build` + QA manual no navegador.

Comandos:
```bash
npm run dev      # servidor de desenvolvimento (porta 5173)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # serve o build de produção
```

## Arquitetura e convenções

O projeto é construído em camadas, repetidas para cada feature nova:

1. **Tipos** (`src/types/`) — interfaces/union types puros, um arquivo por domínio (`activity.ts`, `issue.ts`, `project.ts`...).
2. **Mock hooks** (`src/hooks/`) — `useX(projectId)` que devolve dados seed + stats derivadas via `useMemo`. Ainda não batem em API real; o parâmetro `projectId` já existe para quando isso mudar, mas hoje é ignorado (`void projectId`). Ver `useActivities.ts`/`useIssues.ts` como referência.
3. **Utils puros** (`src/utils/`) — funções de derivação/formatação sem estado (ex.: `activityIndicators.ts`, `issueIndicators.ts`, `dashboardMetrics.ts`). Nada de React aqui.
4. **Componentes pequenos e presentacionais** (`src/components/<feature>/`) — um arquivo por responsabilidade (badge, linha de tabela, cards de KPI, filtros...). Evite componentes genéricos "reutilizáveis entre features" prematuramente — o padrão estabelecido é duplicar um componente pequeno e focado em vez de criar uma abstração cedo demais (ver `ActivityRow` vs `IssueRow`: estruturas parecidas, arquivos separados).
5. **Página** (`src/pages/`) — compõe hooks + utils + componentes, um `export default function` por arquivo.
6. **Rota** (`src/routes/AppRoutes.tsx`) — todo o roteamento fica centralizado nesse arquivo.

Outras convenções importantes:
- Cores **sempre** como variáveis Sass literais (`c.$red`, `c.$yellow-deep`...) de `src/styles/_colors.scss`. **Nunca** `var(--...)` — não existe camada de custom properties CSS neste projeto.
- Botões de ação sem funcionalidade real ainda (exportar, criar, importar) ficam **decorativos** (sem `onClick`) até que a feature real seja construída — não simular funcionalidade que não existe.
- Ícones de ordenação de coluna (`SortIcon`) são **decorativos** em todas as tabelas do projeto — nenhuma tabela tem ordenação por clique implementada ainda.
- Usuário atual é uma constante local hardcoded (`CURRENT_USER_NAME = "Guilherme Fabretti"`) nas páginas que precisam saber "quem sou eu" (toggles de "meus itens") — ainda não integrado ao usuário MSAL real.
- Cuidado com nomes de arquivo em maiúsculas/minúsculas no Windows: o filesystem é case-insensitive mas o `tsc`/git não são — já causou um bug real (`usecurrentUser.ts` vs import `useCurrentUser`).

## Fluxo de trabalho deste projeto (specs → planos → implementação)

Este projeto usa o plugin **superpowers** do Claude Code. Cada feature nova passa por:

1. **Brainstorm** (`superpowers:brainstorming`) → gera uma spec de design em `docs/superpowers/specs/YYYY-MM-DD-<nome>-design.md`
2. **Plano de implementação** (`superpowers:writing-plans`) → gera `docs/superpowers/plans/YYYY-MM-DD-<nome>.md`, com tarefas granulares (checkboxes, código completo, comandos exatos)
3. **Execução** (`superpowers:subagent-driven-development` ou `superpowers:executing-plans`) → um subagente implementador por tarefa, com revisão em duas etapas (compliance com a spec, depois qualidade de código) antes de seguir pra próxima
4. **Finalização** (`superpowers:finishing-a-development-branch`) → merge/PR

**Leia as specs e planos existentes em `docs/superpowers/` antes de propor uma feature nova** — eles documentam decisões de escopo, valores de dados mockados e o raciocínio por trás de cada tela já construída. Isso evita redecidir (ou contradizer) coisas já resolvidas.

Para usar esse fluxo, seu Claude Code precisa ter o plugin `superpowers` instalado (skills aparecem como `superpowers:*` na lista de skills disponíveis).

## Estado atual do produto

**Construído** (com spec + plano + revisão registrados em `docs/superpowers/`):
- Login SSO via Entra ID + logout
- Lista de Projetos (`/projetos`)
- Dashboard do projeto (`/projetos/:id/dashboard`) — SPI, métricas de atividades/issues, Curva S, donuts, log de atividades
- Lista de Atividades (`/projetos/:id/atividades`) — filtros, agrupamento, tabela
- Lista de Issues (`/projetos/:id/issues`) — KPIs, pills de status, toggles, tabela com aging/risco coloridos

**Ainda placeholder** ("Em construção", sem spec/plano ainda):
- `/projetos/:id/atividades/:activityId` — detalhe de atividade
- `/projetos/:id/issues/:issueId` — detalhe de issue
- `/projetos/:id/estrutura` — WBS do projeto
- `/projetos/:id/config` — Papéis & Configuração (incluiria limiares de aging hoje fixos em `issueIndicators.ts`)

Cada um desses é candidato ao mesmo ciclo brainstorm → spec → plano → implementação.
