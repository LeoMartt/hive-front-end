# Nova Atividade (modal) — Design

Data: 2026-08-21
Épico: Núcleo UAT / subsistema "Ações e fluxos de trabalho" de `/projetos/:id` — 2º de 6 ciclos combinados nesta sessão (Exportar ✅ → **Nova Atividade** → Importar em massa → Registrar Issue → Ações de status da Issue → Ações de status da Atividade)
Depende de: [2026-08-07-project-activities-list-design.md](2026-08-07-project-activities-list-design.md) (tipo `Activity`, `useActivities`), [2026-08-19-project-config-design.md](2026-08-19-project-config-design.md) (`Project.team`/`UserRole`, fonte de Tester/Dev)
Origem: protótipo funcional `HIVE - Telas Projeto Específico.html` (`modalNovaAtividade`, `openNovaAtividadeBtn`, `naConfirmBtn`)

## Contexto

O botão "+ Nova atividade" em `ProjectActivitiesPage` é hoje decorativo. O protótipo implementa um modal de formulário completo, mas com dois pontos que não podem ser copiados 1:1: (1) os campos Módulo/Processo usam um mapa fixo (`MODULE_PROCESSES`) com valores fictícios que não correspondem a nenhum módulo do nosso `useActivities.ts` (ex.: "Fiscal"/"Apuração de ICMS" vs. os reais "Faturamento"/"Emissão de NF-e"); (2) os campos Tester/Dev usam um mapa fixo de iniciais (`TESTERS_MAP`/`DEVS_MAP`) que também não bate com o time real do projeto.

Decisão de escopo (confirmada com o usuário): Módulo/Processo viram **campos de texto livre**, mesmo padrão já usado por WBS/Área/Sistema/Transação nesta mesma tela de detalhe — não há hoje nenhuma fonte de verdade de taxonomia de módulos/processos no projeto (isso ficaria a cargo da tela de Estrutura/WBS, que está fora de escopo). Tester/Dev passam a usar `Project.team` (já gerenciado de verdade em Papéis & Config) filtrado por papel, em vez do mapa fixo do protótipo.

## Escopo desta entrega

Nenhuma rota muda. O fluxo é: usuário clica "+ Nova atividade" em `/projetos/:id/atividades` → preenche o modal → "Criar atividade" → atividade nova aparece na lista (sujeita aos filtros ativos, sem nenhum scroll/destaque especial).

### `src/types/activity.ts` (modificado)

Novo tipo, campos do formulário (sem os derivados — `id`, `status`, `retestCount`, `issueCount`, `attachments`, `approvalEvidence`, `approvalNote`, `actualStart`, `actualEnd`, que são sempre calculados/default na criação):

```ts
export interface NewActivityInput {
  name: string;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;
  plannedEnd: string;
  predecessors: string[];
  wbs: string;
  area: string;
  system: string;
  transaction: string;
  expectedResult: string;
  notes: string | null;
}
```

### `src/hooks/useActivities.ts` (modificado)

`useState<Activity[]>` ganha o setter (hoje é `const [activities] = useState(...)`, sem mutador — nenhuma tela até agora escrevia nesse hook). Nova função, mesmo padrão de `useProjects.addTeamMember` (`setActivities(prev => ...)`, sem validação própria — a validação de campo obrigatório vive na UI do modal, como já é convenção no projeto):

```ts
export interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
  createActivity: (input: NewActivityInput) => void;
}
```

Geração de ID: próximo número após o maior `ATV-XXXX` já existente em `activities` (não um contador fixo como o `nextNewId = 9000` do protótipo — evita colidir se o seed crescer). Status: `input.predecessors.length > 0 ? "aguardando" : "liberado"` — mesma regra do protótipo, e já compatível com o painel de predecessor existente em `ActivityDetailPage` (que já trata `showPredecessorPanel` com base em `status === "aguardando"`). Demais campos: `retestCount: 0`, `issueCount: 0`, `actualStart: null`, `actualEnd: null`, `attachments: []`, `approvalEvidence: null`, `approvalNote: null`.

Novo activity é **anexado** ao array (`[...prev, newActivity]`) — a tabela já agrupa dinamicamente por módulo/processo via `groupByModuleProcess` a cada render, então não é preciso replicar a lógica de inserção posicional do protótipo (que manipula DOM diretamente).

### `src/components/activities/NewActivityModal.tsx` (novo)

```ts
interface NewActivityModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  activities: Activity[];
  onCreate: (input: NewActivityInput) => void;
}
```

Usa `Modal` (`wide`) + `.form-group`/`.form-input`/`.modal-actions`, mesmo padrão visual de `InviteUserModal`/`NewProjectModal`. Campos, na ordem do protótipo:

1. Nome da atividade (texto, obrigatório)
2. Módulo (texto, obrigatório) / Processo (texto, obrigatório) — lado a lado
3. Tester (`<select>`, obrigatório) / Dev (`<select>`, obrigatório) — lado a lado, populados a partir de `team.filter(m => m.role === "Tester")` / `team.filter(m => m.role === "Desenvolvedor")`. Se a lista estiver vazia, o select mostra só a opção placeholder desabilitada "Nenhum tester/dev cadastrado no projeto" — a validação de obrigatório já impede submeter vazio.
4. Início planejado / Conclusão planejada (`<input type="date">`, obrigatórios) — lado a lado
5. Predecessores (texto, opcional, `"Ex: ATV-1042; ATV-1050"`)
6. WBS / Área (texto, opcionais) — lado a lado
7. Sistema / Transação (texto, opcionais) — lado a lado
8. Resultado esperado (textarea, opcional)
9. Observações (textarea, opcional)

**Conversão de data (ponto de atenção herdado de bugs já corrigidos neste projeto):** `<input type="date">` devolve uma string `"YYYY-MM-DD"`. Passar isso direto pra `new Date(...)` é interpretado como UTC-midnight — em UTC-3 (Brasil) isso pode exibir o dia anterior (mesma classe de bug já corrigida em `isOverdue`/`toLocalIsoString`, ver [2026-08-07-project-activities-list-design.md](2026-08-07-project-activities-list-design.md)). Por isso, o valor do input é convertido assim antes de guardar:

```ts
function dateInputToIso(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return toLocalIsoString(new Date(year, month - 1, day));
}
```

(reaproveita `toLocalIsoString` de `activityIndicators.ts`, já usado no seed de `useActivities.ts`).

**Validação:** ao clicar "Criar atividade", checa os 7 campos obrigatórios (Nome, Módulo, Processo, Tester, Dev, Início, Fim); se algum estiver vazio, mostra um único banner de erro (`.error-banner`, mesmo componente/classe já usado em `InviteUserModal`) — `"Preencha os campos obrigatórios: {lista}."` — e não fecha o modal. Sem highlight vermelho por campo (`.invalid` não existe em nenhum CSS do projeto hoje; não introduzir só pra isso). Predecessores: `split(";").map(s => s.trim()).filter(Boolean)` — sem validar se os IDs existem de fato (o protótipo também não valida, e `ActivityDetailPage`/`ActivityPredecessorPanel` já toleram um predecessor desconhecido, simplesmente ocultando o painel).

Ao confirmar com sucesso: chama `onCreate(input)`, reseta o formulário, fecha o modal.

### `src/pages/ProjectActivitiesPage.tsx` (modificado)

Passa a chamar `useProjects()` (novo) além de `useActivities(projectId)`, resolve `project = projects.find(p => p.id === projectId)`. Estado local `showNewActivityModal` (`useState(false)`). Botão "+ Nova atividade" (hoje sem `onClick`) abre o modal. `<NewActivityModal>` renderizado com `team={project?.team ?? []}`, `activities={activities}`, `onCreate={createActivity}`.

### `src/components/activities/ActivityFieldGrid.tsx` (modificado, pequeno)

WBS, Área, Sistema, Transação e Resultado esperado passam de `{activity.wbs}` etc. para `{activity.wbs || "—"}` etc. — mesma convenção de "—" já usada em `Predecessores`/`Observações`/evidências nesse mesmo componente. Necessário porque até agora toda atividade do seed sempre tinha esses campos preenchidos; Nova Atividade é a primeira forma de criar uma atividade com esses opcionais genuinamente vazios, e sem esse ajuste o campo apareceria em branco (sem "—") na tela de detalhe.

### Estilo

Nenhum parcial novo — reaproveita `.modal-*`/`.form-group`/`.form-input`/`.error-banner` de `_modal.scss`, já usados por `InviteUserModal`/`NewProjectModal`/`EditUserRolesModal`.

## Fora de escopo

- Módulo/Processo como dropdown guiado a partir de dados existentes (decisão explícita: texto livre).
- Validação de existência dos IDs de predecessores digitados.
- Upload de evidência/anexo no momento da criação (o protótipo também não tem isso nesse modal).
- Posicionamento/scroll até a nova linha criada na tabela.
- Combobox pesquisável para Tester/Dev (select nativo é suficiente pro tamanho de time esperado).
- "Importar em massa", "Registrar issue", ações de Concluir/Rejeitar atividade — próximos ciclos.

## Testes

Sem suíte automatizada (convenção do projeto). Validação via `npm run dev` + QA manual: abrir o modal, tentar submeter vazio — banner lista os 7 campos obrigatórios; preencher só os obrigatórios e submeter — atividade aparece na lista com status "Liberado" (sem predecessor) e WBS/Área/Sistema/Transação/Resultado mostrando "—" no detalhe; preencher com um predecessor válido (ex. `ATV-1001`) — status vira "Aguardando" e o painel de predecessor aparece no detalhe; preencher um predecessor inexistente (ex. `ATV-9999`) — atividade é criada normalmente, sem painel de predecessor (mesmo comportamento de hoje pra predecessor desconhecido); conferir que a data de Início/Conclusão planejada aparece correta no detalhe (sem deslocar um dia); time do projeto sem nenhum Tester ou Dev cadastrado — select correspondente mostra placeholder desabilitado, submit continua bloqueado pela validação de obrigatório.
