# Tela "Issues do projeto" — Design

Data: 2026-08-17
Épico: Núcleo UAT / subsistema "Projeto Específico" do HIVE
Depende de: [2026-08-07-project-activities-list-design.md](2026-08-07-project-activities-list-design.md) (padrão de lista/filtros/tabela) e [2026-08-15-project-dashboard-design.md](2026-08-15-project-dashboard-design.md) (introduziu `Issue`/`IssueStats`/`useIssues`, hoje só consumidos pelo Dashboard)
Origem: mockup estático `HIVE - Telas Projeto Específico.html`, seção `#page-issues` (lista) — as seções `#page-issue-detalhe-*` (detalhe por status) e os modais de criação/solução do mesmo arquivo são referência para specs futuras, não para esta

## Contexto

A spec de Atividades mapeou os 6 subsistemas de `/projetos/:id` e decidiu que cada um vira seu próprio ciclo spec → plano → implementação. Esta spec cobre o subsistema **Issues**, hoje um placeholder "Em construção" na rota `/projetos/:id/issues` — a única coisa que existe hoje é o modelo `Issue`/`IssueStats` e o hook `useIssues`, criados na spec do Dashboard só para alimentar os cards de KPI ali.

O mockup de referência para Issues é substancialmente mais rico do que o que as primeiras passadas de Atividades/Dashboard entregaram: KPIs reativos ao filtro, pills de status, toggles "abertas por mim"/"comigo", 10 colunas por linha (incluindo Aging e Risco calculados a partir de limiares configuráveis), modal completo de criação, exportação real em `.xlsx`, e uma tela de detalhe por status com trilha de auditoria e anexos. Esta spec **cobre só a lista** — a mesma fatia que Atividades e Dashboard tiveram na primeira passada de cada um. O resto fica listado em "Fora de escopo" como próximos passos.

## Escopo desta entrega

### Roteamento

```
/projetos/:id/issues              → ProjectIssuesPage (esta spec, substitui o placeholder)
/projetos/:id/issues/:issueId     → IssueDetailPlaceholderPage (nova rota — só placeholder "Em construção", mesmo padrão de ActivityDetailPlaceholderPage)
```

Nenhuma outra rota muda.

### Modelo de dados

`src/types/issue.ts` — `Issue` ganha campos novos; `IssueStatus` e `IssueStats` **não mudam** (o Dashboard consome só `IssueStats`, que continua calculado do mesmo jeito, com os mesmos 15 registros seed — os números já validados em QA no Dashboard não podem mudar):

```ts
type IssueType = "requisito" | "performance" | "dados" | "integracao" | "interface" | "configuracao" | "outro";
type IssueImpact = "muito_alto" | "alto" | "medio" | "baixo";

interface Issue {
  id: string;
  title: string;
  status: IssueStatus;
  impeditiva: boolean;
  type: IssueType;
  impact: IssueImpact;
  area: string;                   // rótulo livre de categorização de negócio (ex. "Fiscal", "Tesouraria") — independente do module da atividade vinculada
  tester: string;                 // quem abriu a issue
  dev: string;                    // responsável pela solução
  relatedActivityId: string | null;
  cascadeActivityIds: string[];   // outras atividades impactadas em cascata pela mesma issue — mostradas como "ATV-XXXX +N" na tabela
  openedAt: string;               // ISO
  resolvedAt: string | null;      // ISO, só quando status === "concluida"
}
```

`src/hooks/useIssues.ts`: os 15 registros seed existentes ganham os campos novos com valores plausíveis. `tester`/`dev` usam nomes já existentes em `useActivities.ts` (testers: Rafael Souza, Leonardo Martins da Silva, Guilherme Fabretti; devs: J. Prado, M. Torres, C. Prado, Vinícius Calefo Assarice) — não os nomes do mockup (R. Lima, G. Def.), para manter os dois hooks consistentes entre si. Duas issues recebem `dev: "Guilherme Fabretti"` especificamente: nenhuma atividade tem esse dev hoje, e sem isso o toggle "Issues comigo" (que filtra por `dev`) nunca teria resultado visível em QA.

### Indicadores computados

`src/utils/issueIndicators.ts` (novo, mesmo papel que `activityIndicators.ts` tem para Atividades):

- `ISSUE_STATUS_LABELS`, `ISSUE_TYPE_LABELS`, `ISSUE_IMPACT_LABELS` — mapas de enum → rótulo em pt-BR.
- `ISSUE_STATUS_BADGE_CLASS: Record<IssueStatus, string>` — reaproveita as classes de cor já existentes em `_activities.scss`: `aberta → "activity-badge-bloqueado"` (vermelho), `em_analise → "activity-badge-execucao"` (amarelo), `solucao_proposta → "activity-badge-execucao"` (amarelo — mesmo tom que Em análise, replicando o mockup), `concluida → "activity-badge-concluido"` (verde). Nenhum CSS novo para isso.
- `computeIssueAgingDays(issue, now = new Date()): number` — dias entre `openedAt` e `now` se ainda aberta; entre `openedAt` e `resolvedAt` (congelado) se `concluida`.
- `IssueRiskLevel = "aceitavel" | "alerta" | "risco" | null` e `computeIssueRisk(issue, now = new Date()): IssueRiskLevel` — `null` para issues `concluida` (risco não se aplica); caso contrário compara `computeIssueAgingDays` contra limiares **fixos** `{ alerta: 2, risco: 6 }` (defaults do modo UAT no mockup). A tela de Papéis & Config, que tornaria isso configurável por modo (UAT/Cutover), ainda não existe — fica registrado em "Fora de escopo".
- `sortIssuesByPriority(issues: Issue[]): Issue[]` — ordena para exibição inicial: issues não concluídas antes das concluídas, depois por `impact` decrescente (`muito_alto` > `alto` > `medio` > `baixo`), depois por aging decrescente (mais antiga primeiro). Puro, chamado uma vez ao montar os dados da tabela — não é ordenação interativa (ver nota abaixo).

### Componentes novos

```
src/pages/ProjectIssuesPage.tsx                 — composição da página, useParams + hooks + estado de filtro
src/pages/IssueDetailPlaceholderPage.tsx        — placeholder "Em construção", mesmo padrão de ActivityDetailPlaceholderPage
src/components/issues/
  IssuesKpiCards.tsx                            — 4 StatCard: "Issues no filtro", "Impeditivas abertas", "Em risco (aging)", "Tempo médio aberta"
  IssueStatusPills.tsx                          — pills Todas/Aberta/Em análise/Solução proposta/Concluída, seleção única, com contagem
  IssuesTable.tsx                                — shell da tabela (thead + map de linhas)
  IssueRow.tsx                                   — uma linha, clicável (navega para o detalhe)
  IssueStatusBadge.tsx                           — usa ISSUE_STATUS_BADGE_CLASS
  IssueImpactBadge.tsx                           — usa ISSUE_IMPACT_LABELS + cor por nível
  IssueRiskBadge.tsx                             — usa computeIssueRisk + cor por nível ("—" se null)
```

**Colunas da tabela** (nessa ordem, refletindo o mockup): ID · Título (com `area` como subtítulo discreto) · Tipo · Impacto · Impeditivo (tag "Sim"/"Não") · Atividade vinculada (+ `cascata-tag` "+N" com tooltip listando os IDs em `cascadeActivityIds`, se houver) · Dev (avatar-mini + nome) · Status · Aging ("Xd", "—" se concluída sem dias registrados) · Risco.

**`ProjectIssuesPage`**: estado local de filtro (status ativo via pills — seleção única, diferente do multi-select de status em Atividades — e os dois toggles booleanos "abertas por mim"/"comigo", reaproveitando as classes `.toggle-pill`/`.switch`/`.track` já existentes, mesmo padrão do toggle "Minhas atividades" de `ProjectActivitiesPage`). `CURRENT_USER_NAME = "Guilherme Fabretti"` como constante local, mesmo padrão (não integrado ao `useCurrentUser`/MSAL real). Os KPIs recalculam a partir das issues **visíveis no filtro atual** — diferente dos stat-chips de Atividades (que mostram totais fixos do dataset inteiro); esse comportamento replica o mockup, cujo card "Issues no filtro" é explicitamente rotulado "nesta visualização".

**Ordenação por coluna — decisão de escopo:** o mockup tem ordenação por coluna real e interativa. Nenhuma tabela do projeto implementa isso hoje — `ActivitiesTable` já renderiza `SortIcon` em vários cabeçalhos, mas são decorativos (sem `onClick`, sem estado). Para manter consistência, os cabeçalhos de `IssuesTable` recebem o mesmo `SortIcon` decorativo nas colunas ordenáveis do mockup (Título, Tipo, Impacto, Atividade, Dev, Status, Aging, Risco), sem lógica de clique. A ordem "inteligente" (issues abertas primeiro, por impacto/aging) vem de `sortIssuesByPriority`, aplicada uma vez, não da interação do usuário.

**Botões "+ Registrar issue" e "Exportar issues"**: decorativos (sem `onClick`), mesmo padrão de "+ Nova atividade"/"Exportar atividades" em `ProjectActivitiesPage`.

**`IssueDetailPlaceholderPage`**: idêntica em espírito a `ActivityDetailPlaceholderPage` — lê `issueId` via `useParams`, mostra "A tela de detalhe da issue **{issueId}** ainda não foi implementada."

### Estilo

Novo parcial `src/styles/_issues.scss` (registrado em `main.scss`), portando do mockup: `.filter-pill` (+ `.active`, contador `.n`), `.impact-badge` (+ variantes `impact-muitoalto`/`impact-alto`/`impact-medio`/`impact-baixo`), `.risk-badge` (+ variantes `risk-aceitavel`/`risk-alerta`/`risk-risco`), `.issue-area-tag`, `.cascata-tag`, `.impeditivo-tag`. Cores em valores literais de `_colors.scss` (mesma decisão já registrada na spec do Dashboard — o projeto não usa custom properties CSS, então nada de `var(--...)` fora do Sass). O grid dos 4 KPI cards reaproveita `.stat-grid-issues`, já existente em `_dashboard.scss`. Os badges de status reaproveitam `.activity-badge` + as classes de cor já existentes (ver "Indicadores computados" acima) — zero CSS novo para status.

### Fora de escopo

- Modal real de "+ Registrar issue" — fica decorativo.
- Exportação real em `.xlsx` — fica decorativa (o mockup usa SheetJS; o projeto não tem essa dependência).
- Conteúdo real de `IssueDetailPlaceholderPage` (campos, trilha de auditoria, anexos, ações "Iniciar análise"/"Propor solução") — spec futura, mesmo status que o detalhe de Atividade hoje.
- Limiares de aging configuráveis por modo (UAT/Cutover) via Papéis & Config — a tela de Config não existe; limiares ficam fixos em `{ alerta: 2, risco: 6 }`.
- Ordenação por coluna interativa — decorativa, ver nota acima.
- Filtros por Área/Tipo/Dev — o mockup da tela de Issues não os tem (só pills de status + 2 toggles + colunas ordenáveis), então não são adicionados aqui.
- Cutover (fora do escopo geral do projeto, conforme já registrado na spec de Atividades).

## Testes

Sem testes automatizados (mesma decisão das specs anteriores). Validação via `npm run dev`: os 4 KPI cards batendo com os 15 issues seedados (e recalculando ao trocar de pill/toggle), pills filtrando por status corretamente, toggles "abertas por mim"/"comigo" com resultado visível e não-vazio, Aging/Risco corretos para ao menos um issue em cada faixa (aceitável/alerta/risco/concluída), tag "+N" de cascata aparecendo só quando `cascadeActivityIds` não é vazio, clique na linha navegando para `/projetos/:id/issues/:issueId` e mostrando o placeholder com o ID certo, números do Dashboard (`IssueStats`) inalterados antes/depois desta mudança, nav dock continuando a navegar corretamente para as outras áreas do projeto.
