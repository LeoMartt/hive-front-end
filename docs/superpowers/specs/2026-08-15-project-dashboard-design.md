# Tela "Dashboard do projeto" — Design

Data: 2026-08-15
Épico: Núcleo UAT / subsistema "Projeto Específico" do HIVE
Depende de: [2026-08-07-project-activities-list-design.md](2026-08-07-project-activities-list-design.md) (lista de Atividades, já implementada) e [2026-08-12-activities-visual-fidelity-design.md](2026-08-12-activities-visual-fidelity-design.md)
Origem: mockup estático `HIVE - Telas Projeto Específico.html`, seção `#page-dashboard`

## Contexto

A spec de Atividades já mapeou os 6 subsistemas de `/projetos/:id` e decidiu que cada um vira seu próprio ciclo spec → plano → implementação. Esta spec cobre o item 1 daquela lista: o **Dashboard do projeto**, hoje um placeholder "Em construção" na rota `/projetos/:id/dashboard`.

O dashboard é a visão geral do projeto: métricas de Atividades, métricas de Issues, um gráfico de Curva S (planejado x realizado), três indicadores em donut (Pace/Quality/Backlog) e um log das últimas mudanças.

**Issues ainda não existe como subsistema próprio** (isso é uma spec futura). Para que os números do dashboard sejam reais em vez de decorativos, esta spec introduz um modelo de dados mínimo de Issues — mockado, no mesmo padrão de `useActivities` — sem construir a tela de Issues em si.

## Escopo desta entrega

### Roteamento

```
/projetos/:id/dashboard → Dashboard do projeto (esta spec, substitui o placeholder)
```

Sem sub-rotas. Nenhuma outra rota muda.

### Modelo de dados novo

```ts
// src/types/issue.ts
type IssueStatus = "aberta" | "em_analise" | "solucao_proposta" | "concluida";

interface Issue {
  id: string;                    // "ISS-0315"
  title: string;
  status: IssueStatus;
  impeditiva: boolean;           // bloqueia alguma atividade
  relatedActivityId: string | null;
  openedAt: string;              // ISO
  resolvedAt: string | null;     // ISO, só quando status === "concluida"
}
```

`useIssues(projectId)` expõe ~15 issues mockadas cobrindo os 4 status, algumas marcadas `impeditiva`, no mesmo padrão de `useActivities` (parâmetro `projectId` já preparado para uma API real futura, mock ainda não filtra por ele).

```ts
// src/types/activityLog.ts
type LogEntryKind = "activity_status" | "activity_done" | "issue_status" | "issue_blocking";

interface LogEntry {
  id: string;
  kind: LogEntryKind;
  refId: string;           // "ATV-1043" ou "ISS-0315"
  refName: string;
  text: string;            // texto já formatado, ex.: "mudou de Em execução para Bloqueado"
  authorInitials: string;
  authorName: string;
  at: string;               // ISO
}
```

`useActivityLog(projectId)` expõe uma lista **estática** de ~7 entradas (não derivada — o projeto ainda não tem um modelo de auditoria/histórico). Mesmo nível de mock que `useActivities`/`useIssues`, só que sem cálculo por trás: é dado de exemplo fixo, ordenado do mais recente para o mais antigo.

### Métricas computadas

`src/utils/dashboardMetrics.ts`, funções puras sobre os dados já carregados (reaproveita `Activity`/`ActivityStats` existentes):

- **SPI do projeto**: peso por status — `concluido = 100`, `execucao = 50`, qualquer outro (`aguardando`, `bloqueado`, `liberado`) `= 0`; atividades `cancelado` saem do denominador. `SPI = média dos pesos / 100`, exibido com 2 casas (ex.: `0.87`).
- **Pace** (donut 1): `% de atividades concluídas cujo actualEnd <= plannedEnd`, sobre o total de concluídas.
- **Quality** (donut 2): `% de atividades concluídas com retestCount === 0`, sobre o total de concluídas.
- **Backlog** (donut 3): `% de atividades com status "aguardando"`, sobre o total de atividades (excluindo canceladas).
- **Issue stats**: `abertas` (status `aberta`), `impeditivasAbertas` (`impeditiva && status !== "concluida"`), `solucaoProposta` (status `solucao_proposta`), `concluidas` (status `concluida`), `tempoMedioResolucaoDias` (média de `resolvedAt - openedAt` em dias, só sobre concluídas com `resolvedAt`).

Se não houver atividades/issues concluídas o suficiente para uma métrica (denominador zero), o componente mostra `—` em vez de `NaN%`.

### Curva S

Série histórica **fixa** (mock), já que não existe dado histórico real por trás do snapshot atual — mesmo approach do protótipo HTML. Dez pontos semanais (`Sem 1`..`Sem 10`), duas séries (`Planejado` acumulado 0→100%, `Realizado` acumulado com `null` nas semanas futuras). Vive como constante em `src/hooks/useCurvaSData.ts` (ou direto no componente do gráfico, decidido na hora da implementação) — não é recalculada a partir de `Activity`.

Renderizada com **Chart.js** (`chart.js` como nova dependência em `package.json`) via um wrapper fino `CurvaSChart.tsx`: cria a instância num `useEffect` com `useRef<HTMLCanvasElement>`, destrói no cleanup. Sem `react-chartjs-2` — só a lib base, para manter controle explícito do ciclo de vida (mesmo espírito de `Dropdown`/`Modal` serem componentes próprios em vez de uma lib de UI).

### Componentes novos

```
src/pages/ProjectDashboardPage.tsx           — composição da página, useParams + hooks
src/components/dashboard/
  DashboardActivitiesBlock.tsx               — SPI hero + 6 stat-cards de Atividades
  DashboardIssuesBlock.tsx                   — 5 stat-cards de Issues
  CurvaSChart.tsx                            — wrapper Chart.js
  IndicatorDonuts.tsx                        — 3 donuts SVG (Pace/Quality/Backlog)
  RecentActivityLog.tsx                      — painel "Atividades Recentes"
```

`ProjectDashboardPage` busca o projeto atual via `useProjects()` (mesmo padrão do `ProjectNavDock`) para o título (`project.name`) e subtítulo (`"{UAT|Cutover} · atualizado em tempo real via trilha de auditoria"`).

Os botões "Exportar atividades" e "Exportar issues" são decorativos (sem `onClick`), mesmo padrão já usado em `ProjectActivitiesPage` para "Exportar atividades"/"Importar em massa".

### Estilo

Novo parcial `src/styles/_dashboard.scss`, portando do mockup as classes `.metric-block` (+ variante `.issues`), `.section-head`, `.section-label`, `.stat-hero-row`, `.spi-hero`, `.spi-big`, `.stat-grid-compact`, `.stat-grid-issues` (+ variante `-5`), `.grid-2`, `.panel`, `.panel-head`, `.panel-title`, `.legend`, `.donut-row`, `.donut-item`, `.log-panel`, `.log-row`, `.log-icon` (+ variantes `i-status`/`i-block`/`i-done`/`i-issue`), `.log-body`, `.log-text`, `.log-meta`, incluindo os breakpoints responsivos já definidos no mockup (`.stat-grid-issues`/`.stat-grid-compact`/`.grid-2`/`.stat-hero-row` colapsando em telas menores). Registrado em `main.scss`. Reaproveita tokens de cor já existentes (`--blue`, `--yellow-deep`, `--green`, `--red`, etc.) — nenhum token novo.

### Fora de escopo

- Tela de Issues em si (lista, detalhe, criação) — só o modelo de dados mínimo para alimentar os cards do dashboard.
- Modelo de auditoria/histórico real por trás do log de atividades recentes — permanece mock estático.
- Interatividade nos cards/donuts/gráfico (clicar para filtrar, navegar, etc.) — mockup não define esse comportamento para o dashboard, então fica só leitura.
- Botões "Exportar atividades"/"Exportar issues" funcionais.
- Cutover (fora de escopo geral do projeto por ora, conforme já registrado na spec de Atividades).

## Testes

Sem testes automatizados (mesma decisão das specs anteriores). Validação via `npm run dev`: números de SPI/Pace/Quality/Backlog/Issues batendo com o que os dados mockados implicam, Curva S renderizando com Chart.js sem erros de console, log mostrando as 7 entradas mockadas em ordem, layout responsivo colapsando corretamente em telas menores, nav dock continuando a navegar corretamente para as outras 4 áreas do projeto.
