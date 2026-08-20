# Tela "Papéis & Config" — Design

Data: 2026-08-19
Épico: Núcleo UAT / subsistema "Projeto Específico" do HIVE
Depende de: [2026-08-17-project-issues-list-design.md](2026-08-17-project-issues-list-design.md) (introduziu os limiares fixos de aging em `issueIndicators.ts`, que esta spec torna configuráveis), [2026-08-15-project-dashboard-design.md](2026-08-15-project-dashboard-design.md) (número de SPI no Dashboard, que ganha cor aqui), [2026-08-06-projects-page-design.md](2026-08-06-projects-page-design.md) (`NewProjectModal`/`Project.team`, reaproveitados na aba Usuários)
Origem: mockup estático `HIVE - Telas Projeto Específico.html`, seção `#page-config`

## Contexto

A spec de Atividades mapeou os 6 subsistemas de `/projetos/:id` e decidiu que cada um vira seu próprio ciclo spec → plano → implementação. Esta spec cobre **Papéis & Config**, hoje um placeholder "Em construção" na rota `/projetos/:id/config`.

Diferente de todas as telas anteriores (que só exibem dados), esta é a primeira a **escrever estado que outras telas já shippadas passam a ler**: os limiares de SPI e de aging de issues, hoje fixos em código, tornam-se editáveis aqui e realmente mudam o comportamento do Dashboard e da lista de Issues. A aba de usuários também deixa de ser só visual — reaproveita a busca real de usuários (Microsoft Graph via MSAL) já construída em `NewProjectModal`, agora para adicionar/editar papéis de membros do projeto atual.

O resto da tela (matriz de permissões, transição automática de issue, anexos/evidências) não tem nenhum backend real por trás em nenhuma tela do projeto ainda, e fica decorativo — mesma decisão já registrada nas specs de Atividade e Issue Detail.

## Escopo desta entrega

### Roteamento

```
/projetos/:id/config → ProjectConfigPage (esta spec, substitui o placeholder)
```

Nenhuma outra rota muda.

### Parte A — Estado compartilhado de limiares (a peça nova de arquitetura)

Até aqui, todo hook de dados (`useActivities`, `useIssues`, `useProjects`) é chamado de forma independente por cada página que precisa dele — cada chamada tem seu próprio `useState`, sem compartilhamento entre páginas. Isso nunca foi um problema porque nenhuma tela jamais escrevia num desses hooks de um jeito que outra tela precisasse ler. Os limiares de SPI/aging quebram essa premissa: salvos em Config, precisam refletir no Dashboard e nas Issues da mesma sessão. Isso exige estado de fato compartilhado — React Context.

`src/types/projectConfig.ts` (novo):

```ts
export interface AgingThresholds {
  alerta: number;
  risco: number;
}

export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
}
```

`src/context/ProjectConfigContext.tsx` (novo — primeiro uso de `src/context/` no projeto, justificado por ser o primeiro estado genuinamente compartilhado entre páginas, categoricamente diferente dos hooks `useX(projectId)` existentes):

```ts
export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  spiSaudavel: 0.9,
  spiCritico: 0.75,
  agingUat: { alerta: 2, risco: 6 },
  agingCutover: { alerta: 3, risco: 8 },
};

export function ProjectConfigProvider({ children }: { children: ReactNode }): JSX.Element
export function useProjectConfig(): { config: ProjectConfig; setConfig: (config: ProjectConfig) => void }
```

`spiSaudavel`/`spiCritico`/`agingUat` replicam exatamente os valores hoje hardcoded (`AGING_ALERTA_DAYS = 2`, `AGING_RISCO_DAYS = 6` em `issueIndicators.ts`; 0.90/0.70 em `getSpiVariant`, ajustado para o par saudável/crítico do mockup 0.90/0.75). `agingCutover` é novo — Cutover é operacionalmente mais crítico (janela pré-go-live curta), então os limiares são mais apertados (3/8 em vez de 2/6).

Estado único, global, **não** por `projectId` — mesma simplificação que `useIssues`/`useActivities` já assumem (ambos ignoram `projectId` e retornam sempre o mesmo dataset mock). Não existe backend real por trás de nenhum dos três; diferenciar por projeto aqui seria complexidade sem contrapartida.

`src/layouts/ProjectLayout.tsx`: `<Outlet />` passa a ser envolvido por `<ProjectConfigProvider>`. Cobre Dashboard/Atividades/Issues/Config de um projeto — fica de fora de `/projetos` (lista global), que continua com os limiares fixos que já tem hoje (fora de escopo, ver "Fora de escopo").

`src/hooks/useProjectAgingThresholds.ts` (novo):

```ts
export function useProjectAgingThresholds(projectId: string): AgingThresholds
```

Combina `useProjectConfig()` com `useProjects().find(p => p.id === projectId)` para resolver `agingUat` ou `agingCutover` conforme o `mode` do projeto atual (default `agingUat` se o projeto não for encontrado). Evita repetir essa resolução em cada consumidor.

**Consumidores existentes que mudam:**

- `src/utils/issueIndicators.ts`: `computeIssueRisk(issue: Issue, thresholds: AgingThresholds, now: Date = new Date()): IssueRiskLevel` — ganha o parâmetro `thresholds`; as constantes `AGING_ALERTA_DAYS`/`AGING_RISCO_DAYS` são removidas (viraram os defaults do Context). `computeIssueAgingDays`/`sortIssuesByPriority` não mudam (não dependem de limiar).
- `src/components/issues/IssueRow.tsx`: ganha prop `agingThresholds: AgingThresholds`, passa para `computeIssueRisk`.
- `src/components/issues/IssuesTable.tsx`: ganha prop `agingThresholds`, repassa para cada `IssueRow`.
- `src/components/issues/IssuesKpiCards.tsx`: ganha prop `projectId` (não tinha), chama `useProjectAgingThresholds(projectId)` internamente e passa para `computeIssueRisk` (usado no cálculo de "Em risco (aging)").
- `src/pages/ProjectIssuesPage.tsx`: passa `projectId` para `IssuesKpiCards` (já passa para `IssuesTable`).
- `src/utils/projectIndicators.ts`: nova função `getSpiVariantWithThresholds(spi: number | null, config: Pick<ProjectConfig, "spiSaudavel" | "spiCritico">): SpiVariant | null` — mesma lógica de 3 faixas de `getSpiVariant`, limiares parametrizados. `getSpiVariant` original **não muda** — continua servindo a lista de Projetos com os limiares fixos de hoje (fora de escopo desta spec).
- `src/components/dashboard/DashboardActivitiesBlock.tsx`: chama `useProjectConfig()` diretamente (sem lookup de modo — SPI não é dividido por UAT/Cutover) e aplica `getSpiVariantWithThresholds` ao `.spi-big` (hoje sempre `c.$yellow-deep` fixo; ganha `.g`/`.y`/`.r`, mesma convenção de `.stat-value`).

### Parte B — Página e componentes decorativos

```
src/pages/ProjectConfigPage.tsx                     — substitui o placeholder da rota /config
src/components/config/
  ConfigPermissionMatrix.tsx                          — matriz de permissões por papel (decorativo, "referência")
  ConfigThresholdsPanel.tsx                            — SPI + transições automáticas + aging UAT/Cutover (CONECTADO)
  ConfigAttachmentsPanel.tsx                            — anexos/evidências (decorativo)
```

**`ProjectConfigPage`**: cabeçalho + 2 abas (`"usuarios" | "limiares"`, `useState` local, mesmo padrão de pílula já usado em Issues/Projetos — sem componente `Tabs` genérico, seguindo a convenção do projeto de não abstrair cedo). Aba "Usuários" compõe `ConfigUsersTable` (Parte C) + `ConfigPermissionMatrix` lado a lado (grid 2 colunas). Aba "Limiares e Regras" compõe `ConfigThresholdsPanel` + `ConfigAttachmentsPanel`.

**`ConfigPermissionMatrix`**: tabela de checkboxes (10 ações × Gestor/Tester/Dev), com o aviso do mockup ("referência para quando a diferenciação por papel for reativada... hoje todas as ações estão disponíveis a qualquer papel — esta matriz não é aplicada de verdade ainda"). Checkboxes **descontrolados** (`defaultChecked`, sem `useState`) — dá pra clicar/sentir vivo (o navegador gerencia o próprio estado de um input não controlado), mas nada é lido ou persistido. Botão "Salvar matriz" decorativo (sem `onClick`).

**`ConfigThresholdsPanel`** (a peça de limiares conectada): não recebe `projectId` — os limiares editados aqui não são por projeto (mesma decisão da Parte A). Estado local (`useState`) inicializado a partir de `useProjectConfig().config` — um rascunho editável (SPI saudável/crítico; aging alerta/risco do modo selecionado numa sub-aba local UAT/Cutover, independente do modo do projeto atual — o Gestor pode editar limiares de qualquer modo). Toggle "Transições automáticas" (Issue Aberta → Em análise): **decorativo** — o botão "Iniciar análise" do Issue Detail continua manual e fixo (spec de 2026-08-19, "fora de escopo"), esse toggle não liga em nada real. Botão "Salvar limiares" chama `setConfig(rascunho)` de verdade — efeito real, refletido no Dashboard e nas Issues assim que salvo — e mostra "Limiares atualizados ✓" (escondido de novo assim que o usuário edita outro campo).

**`ConfigAttachmentsPanel`**: tamanho máximo de anexo (MB) + 2 toggles de evidência obrigatória. Todos decorativos — sem fluxo de upload em nenhuma tela do projeto ainda, mesma decisão já tomada nas specs de Atividade/Issue Detail.

### Parte C — Aba "Usuários": funcionalidade real sobre `Project.team`

`Project.team: TeamMember[]` já existe e já é mutável de verdade — `NewProjectModal` já popula esse array na criação do projeto, com busca real de usuários (Microsoft Graph via MSAL) e suporte a múltiplos papéis por pessoa (o modal já deixa adicionar a mesma pessoa de novo com outro papel: "Um usuário pode ter mais de um papel: adicione-o novamente com outro papel, se necessário"). Esta spec estende esse mesmo mecanismo — em vez de só popular um projeto novo, agora também edita o `team` de um projeto já existente, direto da tela de Config.

```
src/hooks/useGraphUserSearch.ts                — novo: extrai a busca no Graph (hoje só dentro de NewProjectModal)
src/hooks/useProjects.ts                        — modificado: ganha addTeamMember, replaceTeamMemberRoles
src/components/projects/NewProjectModal.tsx     — modificado (refactor pontual): usa useGraphUserSearch em vez da lógica inline
src/utils/teamMembers.ts                        — novo: groupTeamMembersByName
src/components/config/
  InviteUserModal.tsx                            — novo
  EditUserRolesModal.tsx                          — novo
  ConfigUsersTable.tsx                            — novo
```

**`useGraphUserSearch.ts`**: extrai de `NewProjectModal` a parte de estado + lógica que hoje vive inline (`userSearch`, `searchResults`, `searchLoading`, `selectedUser`, `handleSearchChange` — que chama `instance.acquireTokenSilent`/`fetch` no Graph —, `handleSelectUser`, e um `reset()`). É a parte com mais risco real (chamada assíncrona, token MSAL, tratamento de `InteractionRequiredAuthError`) — extrair evita duplicar exatamente essa lógica pela segunda vez em `InviteUserModal`. Cada consumidor (`NewProjectModal`, `InviteUserModal`) mantém sua própria UI de dropdown/seleção de papel/lista — só a busca em si é compartilhada.

```ts
interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

interface UseGraphUserSearchResult {
  userSearch: string;
  searchResults: GraphUser[];
  searchLoading: boolean;
  selectedUser: GraphUser | null;
  handleSearchChange: (query: string) => Promise<void>;
  handleSelectUser: (user: GraphUser) => void;
  reset: () => void;
}

export function useGraphUserSearch(): UseGraphUserSearchResult
```

`NewProjectModal` refatorado usa esse hook no lugar dos 4 campos de estado + 2 funções equivalentes que hoje tem inline — comportamento idêntico, byte a byte, só muda de onde vem.

**`useProjects.ts`** ganha:

```ts
addTeamMember(projectId: string, member: TeamMember): void
replaceTeamMemberRoles(projectId: string, memberName: string, roles: UserRole[]): void
```

`addTeamMember` funciona igual ao `createProject` de hoje: `setProjects` mapeando o projeto pelo id e fazendo `[...project.team, member]` (com uma checagem de duplicidade por `name` + `role` — não por `id` como `NewProjectModal.handleAddUser` faz hoje, porque membros vindos do seed de `useProjects.ts` não têm `id`; comparar por `id` deixaria passar um convite duplicado do Graph para alguém que já está no time via seed. `name` é a mesma chave estável já usada em `groupTeamMembersByName`). `replaceTeamMemberRoles` remove todas as entradas `TeamMember` daquele `name` no `team` do projeto e recria uma por papel em `roles` (reaproveitando `initials`/`email` da entrada existente, ou derivando `initials` via `getInitials(memberName)` se não houver nenhuma entrada prévia) — é a mesma operação de "readicionar com outro papel" que `NewProjectModal` já faz, só que em lote/via edição.

**`teamMembers.ts`**:

```ts
export interface GroupedTeamMember {
  name: string;
  initials: string;
  email?: string;
  roles: UserRole[];
}

export function groupTeamMembersByName(team: TeamMember[]): GroupedTeamMember[]
```

Agrupa por `name` (chave estável entre membros vindos do Graph — que têm `id` — e membros do seed — que não têm) — mesma lógica visual do mockup, onde um usuário com 2 papéis aparece com 2 badges na mesma linha.

**`ConfigUsersTable`**: recebe `projectId`. Busca o projeto via `useProjects()` + `.find()` (mesmo padrão já usado em `ProjectNavDock`), agrupa `project.team` com `groupTeamMembersByName`, renderiza uma linha por pessoa (avatar + nome + badges de papel + botão de editar). Botão "+ Convidar usuário" abre `InviteUserModal`. Botão de editar (ícone lápis) por linha abre `EditUserRolesModal` pré-carregado com os papéis daquela pessoa.

**`InviteUserModal`**: `show`/`onHide`/`projectId`. Usa `useGraphUserSearch()` para a busca + um `<select>` de papel (mesmas 3 opções de `NewProjectModal`) + botão "+" que, ao clicar, chama `addTeamMember(projectId, { id, initials, name, email, role })` direto (sem lista local intermediária — a "lista" já é a tabela por trás do modal, que re-renderiza assim que `useProjects` atualiza) e fecha o modal.

**`EditUserRolesModal`**: `show`/`onHide`/`projectId`/`member: GroupedTeamMember`. 3 checkboxes (Gestor/Tester/Dev) pré-marcados com `member.roles`. Botão "Salvar" exige pelo menos 1 papel marcado (mesma validação do mockup — mostra um erro inline e não fecha se nenhum estiver marcado); ao confirmar, chama `replaceTeamMemberRoles(projectId, member.name, papeisMarcados)` e fecha.

### Estilo

Novo parcial `src/styles/_config.scss` (grid de 2 colunas da aba usuários, grid de 2 colunas da aba limiares, sub-abas de modo aging). A maior parte já existe: `.panel`/`.panel-head`/`.panel-title`, `.field-row`/`.field-value`, `.filter-pill`, `.toggle-pill`/`.switch`, `.avatar-mini`, `.badge`, `.table-wrap`, `.modal-*` (para os 2 modais novos, que reaproveitam a estrutura de `NewProjectModal`/`Modal.tsx`). Ajuste pontual em `_dashboard.scss`: `.spi-big.g/.y/.r`, mesma convenção de `.stat-value.g/.y/.r` em `_stat-grid.scss`.

### Fora de escopo

- Limiares de SPI afetando a lista global de Projetos (`/projetos`) — fica fora da árvore de rotas de `ProjectConfigProvider`; conectar exigiria um store por `projectId` acessível fora da rota do projeto, complexidade desproporcional para uma feature ainda sem persistência real. `getSpiVariant`/`ProjectsPage` continuam com os limiares fixos de hoje.
- Matriz de permissões aplicada de fato (bloquear ações por papel) — o próprio mockup já registra isso como pendente de reativação; nada muda aqui.
- Transição automática real de issue (Aberta → Em análise sem clique) — decorativa, mesma decisão da spec de Issue Detail.
- Fluxo de upload/evidência obrigatória — não existe em nenhuma tela do projeto ainda.
- Remover usuário do projeto (sem botão equivalente no mockup — só editar papéis, que ao desmarcar tudo é bloqueado pela validação "pelo menos 1 papel").
- Diferenciação de ações por papel (Gestor/Tester/Dev) — mesma decisão já registrada nas specs anteriores.
- Cutover (fora do escopo geral do projeto, conforme já registrado na spec de Atividades).

## Testes

Sem testes automatizados (mesma decisão de todas as specs anteriores). Validação via `npm run dev`: editar SPI saudável/crítico e salvar — o número do Dashboard muda de cor; editar aging (modo UAT) e salvar — a coluna Aging da tabela de Issues e o KPI "Em risco (aging)" recalculam com os novos limiares (testar também trocando para um projeto Cutover e confirmando que usa `agingCutover`, não `agingUat`); convidar um usuário via busca no Graph — aparece na tabela agrupado corretamente; editar papéis de um usuário existente (adicionar e remover papel) — badges da linha atualizam e a operação não duplica/perde outros papéis dele; criar um projeto novo via `NewProjectModal` continua funcionando idêntico após o refactor de `useGraphUserSearch`; matriz de permissões e anexos/evidências continuam clicáveis mas sem efeito; lista global de Projetos (`/projetos`) continua com as cores de SPI de hoje, inalterada.
