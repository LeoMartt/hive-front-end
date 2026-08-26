# Registrar Issue (modal) — Design

Data: 2026-08-21
Épico: Núcleo UAT / subsistema "Ações e fluxos de trabalho" de `/projetos/:id` — 4º de 6 ciclos combinados nesta sessão (Exportar ✅ → Nova Atividade ✅ → Importar em massa ✅ → **Registrar Issue** → Ações de status da Issue → Ações de status da Atividade)
Depende de: [2026-08-17-project-issues-list-design.md](2026-08-17-project-issues-list-design.md) (tipo `Issue`, `useIssues`), [2026-08-21-nova-atividade-design.md](2026-08-21-nova-atividade-design.md) (Tester/Dev vindos de `Project.team`, padrão de mutator `createX`), [2026-08-19-project-config-design.md](2026-08-19-project-config-design.md) (`ProjectConfig`/`ProjectConfigContext`, ganha um campo real nesta spec)
Origem: protótipo funcional `HIVE - Telas Projeto Específico.html` (`modalIssue`, `openNovaIssueTopo`, `openNovaIssueBloqueado`, `issueSubmitBtn`)

## Contexto

Dois botões hoje decorativos abrem o mesmo modal no protótipo: "+ Registrar issue" (lista de Issues) e "Registrar nova issue" (Detalhe de Atividade, só quando `status === "bloqueado"`). No protótipo o campo "Atividade vinculada" aparece só na primeira entrada — na segunda, a atividade é implícita (a que já está sendo vista). Um terceiro gatilho do protótipo, "Rejeitar atividade" (que também abre esse modal, com o texto do botão de confirmação trocado para "Reprovar e criar issue"), **fica fora deste ciclo** — pertence ao subsistema "Ações de status da Atividade", que vai reaproveitar o componente construído aqui.

O protótipo nunca implementou de fato a criação da issue (o handler só valida e fecha o modal, sem inserir nada) — então o mapeamento de campos abaixo foi desenhado a partir do `Issue` já existente no projeto, não copiado do protótipo. Duas lacunas reais entre o formulário do protótipo e nosso `Issue`:

- **Tester**: o protótipo não tem esse campo — é implicitamente quem está registrando. Vira o usuário atual (mesma constante local `CURRENT_USER_NAME` já usada nas páginas, não um campo de formulário).
- **Área**: o protótipo também não tem esse campo — é herdada da atividade vinculada (`activity.area`), já que toda issue criada por este modal sempre tem uma atividade vinculada (obrigatória quando o campo aparece; implícita quando não aparece).
- **Nota de impacto** (`impactNote`): existe no nosso `Issue` e já é exibido no detalhe (`"{impacto} — {impactNote}"`), mas o protótipo não tem input nenhum pra ele. Vira um campo novo, opcional, que o protótipo não tinha.
- **Descrição**: o protótipo não valida como obrigatória, mas como é o conteúdo central de uma issue (equivalente ao "Nome" de uma Atividade), esta spec torna obrigatória — uma issue sem descrição não documenta nada.

## Escopo desta entrega

Nenhuma rota muda. Fluxo A (lista de Issues): clicar "+ Registrar issue" → modal com "Atividade vinculada" visível → preencher → "Criar" → issue nova aparece na lista. Fluxo B (atividade bloqueada): clicar "Registrar nova issue" → modal sem o campo de atividade (implícita) → preencher → "Criar" → issue aparece vinculada à atividade atual, visível no painel "Issues vinculadas" da mesma página sem reload.

### `src/types/issue.ts` (modificado)

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

Todos os campos já resolvidos pelo chamador (modal) antes de chegar no mutator — `tester` é a constante local da página, `area` vem de `activity.area` da atividade vinculada, `relatedActivityId` é sempre string (nunca vazio: o campo é obrigatório quando visível, implícito quando escondido).

### `src/hooks/useIssues.ts` (modificado)

`useState<Issue[]>` ganha o setter (hoje `const [issues] = useState(...)`, sem mutador). Novo `nextIssueId`, mesmo padrão de `nextActivityId` em `useActivities.ts` (maior número existente + 1), mas preservando o zero-padding de 4 dígitos do seed (`ISS-0290`...`ISS-0304` → próxima seria `ISS-0305`, não `ISS-305`):

```ts
export interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
}
```

`createIssue(input)`: gera o próximo ID, monta o `Issue` completo — `status: "aberta"`, `cascadeActivityIds: []`, `openedAt: toLocalIsoString(new Date())` (já importado no arquivo), `resolvedAt: null`, `proposedSolution: null`, `analysisStartedAt: null`, `solutionProposedAt: null`, `solutionAttachment: null` — e o restante direto de `input`. Mesmo padrão de `setIssues(prev => [...prev, newIssue])` sem validação própria (validação vive no modal).

### `src/components/issues/RegisterIssueModal.tsx` (novo)

```ts
interface RegisterIssueModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  activities: Activity[];
  currentActivity?: Activity;
  onCreate: (input: NewIssueInput) => void;
}
```

Quando `currentActivity` é passado (fluxo B — Detalhe de Atividade), o campo "Atividade vinculada" não aparece e `relatedActivityId`/`area` vêm direto de `currentActivity.id`/`currentActivity.area`. Quando ausente (fluxo A — lista de Issues), aparece um `<select>` nativo com todas as `activities` (formato `${id} — ${name}`, ordenado por id) — sem combobox pesquisável nova; a lista de atividades cabe bem num select comum, mesma decisão já tomada pra Tester/Dev na Nova Atividade.

Campos, em ordem:
1. Atividade vinculada (`<select>`, condicional — ver acima)
2. Título (obrigatório)
3. Descrição (textarea, **obrigatório**)
4. Tipo / Impeditivo (`<select>`, lado a lado — reaproveita `.form-row` já criado pela Nova Atividade)
5. Categorização de impacto (`<select>`, default "Médio")
6. Nota de impacto (opcional, texto curto — `impactNote`)
7. Anexo (dropzone — reaproveita o padrão visual `.dropzone`/`.import-ref`-adjacent já criado pelo Importar em massa, mas aqui é evidência de abertura, não planilha)
8. Desenvolvedor responsável (`<select>`, `team.filter(m => m.role === "Desenvolvedor")`, mesmo padrão da Nova Atividade)

**Validação** (banner único, mesmo padrão de erro já usado em todos os outros modais): Título, Descrição obrigatórios; Atividade vinculada obrigatória só quando o campo está visível; Anexo obrigatório só quando Impeditivo = Sim **e** `config.evidenciaObrigatoriaIssue` está ligado (lido via `useProjectConfig()`).

**Upload real de evidência**: ao selecionar/soltar um arquivo, guarda o `File` e monta `IssueAttachment` no submit (`fileName`, `sizeLabel: "{Math.ceil(size/1024)} KB"`, `uploadedBy: tester atual`, `uploadedAt: agora`) — mesmo nível de "realismo mockado" já estabelecido no Importar em massa (sem persistência de arquivo real, só metadados capturados do `File` do navegador).

### `ProjectConfig` ganha um campo real (`src/types/projectConfig.ts`, `src/context/ProjectConfigContext.ts`, `src/components/config/ConfigAttachmentsPanel.tsx`)

```ts
export interface ProjectConfig {
  spiSaudavel: number;
  spiCritico: number;
  agingUat: AgingThresholds;
  agingCutover: AgingThresholds;
  evidenciaObrigatoriaIssue: boolean; // novo
}
```

`DEFAULT_PROJECT_CONFIG.evidenciaObrigatoriaIssue = true` (mesmo valor do protótipo). `ConfigAttachmentsPanel` passa a ter **só esse um** toggle controlado de verdade — mesmo padrão rascunho+"Salvar" já usado em `ConfigThresholdsPanel` (`useState` local inicializado de `config.evidenciaObrigatoriaIssue`, botão "Salvar limite" chama `setConfig({...config, evidenciaObrigatoriaIssue: draft})`, mostra "Limite atualizado ✓"). O toggle "Exigir evidência ao aprovar/concluir atividade" e o input de tamanho máximo **continuam decorativos** (`defaultChecked`/sem `value` controlado) — ligar esses é trabalho do subsistema "Ações de status da Atividade".

### `src/pages/ProjectIssuesPage.tsx` (modificado)

Ganha `useActivities(projectId)` (novo — só para popular o `<select>` de "Atividade vinculada"). Estado `showRegisterIssueModal`. Botão "+ Registrar issue" abre o modal sem `currentActivity` (fluxo A). `onCreate={createIssue}`.

### `src/pages/ActivityDetailPage.tsx` (modificado)

**Refactor necessário**: hoje `ActivityLinkedIssuesPanel` chama `useIssues(projectId)` internamente — uma instância separada da que o modal usaria se `ActivityDetailPage` também chamasse `useIssues()` por conta própria. Como cada chamada de `useIssues()` tem seu próprio `useState` independente (mesma simplificação de todo hook mock deste projeto), uma issue criada por uma instância não apareceria na lista renderizada pela outra até a página remontar — um bug visível na mesma tela, na mesma sessão. `ActivityDetailPage` passa a chamar `useIssues(projectId)` uma vez e repassar `issues`/`createIssue` para baixo; `ActivityLinkedIssuesPanel` troca sua chamada interna a `useIssues` por uma prop `issues: Issue[]`.

Botão "Registrar nova issue" (hoje decorativo, visível só quando `activity.status === "bloqueado"`) abre o modal com `currentActivity={activity}` (fluxo B).

### Estilo

Nenhum parcial novo — reaproveita `.modal-*`/`.form-group`/`.form-row`/`.dropzone`/`.error-banner` já existentes (Nova Atividade + Importar em massa).

## Fora de escopo

- Wiring do botão "Rejeitar atividade" abrindo este modal — subsistema "Ações de status da Atividade".
- `evidenciaObrigatoriaAtividade` e o input de tamanho máximo de anexo em `ConfigAttachmentsPanel` — permanecem decorativos.
- `cascadeActivityIds` (issue impactando múltiplas atividades) — sempre `[]` na criação, sem UI pra editar.
- Combobox pesquisável para "Atividade vinculada" — select nativo é suficiente.
- Transições automáticas de status da issue (Aberta → Em análise) — decisão já registrada na spec de Issue Detail, sem mudança aqui.

## Testes

Sem suíte automatizada (convenção do projeto). Validação via `npm run dev` + QA manual: em `/projetos/:id/issues`, "+ Registrar issue" — submeter vazio mostra os obrigatórios faltando; preencher e escolher uma atividade — issue aparece na lista com status "Aberta", Tester = usuário atual, Área igual à da atividade escolhida; em `/projetos/:id/atividades/:id` de uma atividade bloqueada, "Registrar nova issue" — sem campo de atividade, issue criada aparece imediatamente no painel "Issues vinculadas" da mesma tela, sem navegar; marcar Impeditivo = Sim sem anexo com o toggle de evidência obrigatória ligado (padrão) — bloqueia submissão; desligar o toggle em Papéis & Config, salvar, voltar e tentar de novo — agora permite sem anexo; issue impeditiva concluída com Nota de impacto preenchida — aparece corretamente no detalhe (`"{impacto} — {nota}"`).
