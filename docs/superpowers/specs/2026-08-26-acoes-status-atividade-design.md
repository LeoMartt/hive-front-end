# Ações de status da Atividade (Concluir / Rejeitar) — Design

Data: 2026-08-26
Épico: Núcleo UAT / subsistema "Ações e fluxos de trabalho" de `/projetos/:id` — 6º e último de 6 ciclos combinados nesta sessão (Exportar ✅ → Nova Atividade ✅ → Importar em massa ✅ → Registrar Issue ✅ → Ações de status da Issue ✅ → **Ações de status da Atividade**)
Depende de: [2026-08-18-activity-detail-design.md](2026-08-18-activity-detail-design.md) (tipo `Activity`, `useActivities`, `ActivityDetailPage`, campos `approvalEvidence`/`approvalNote` já seedados mas nunca escritos), [2026-08-21-acoes-status-issue-design.md](2026-08-21-acoes-status-issue-design.md) (padrão de mutator de atualização com `.map()`, padrão de modal com dropzone opcional)
Origem: protótipo funcional `HIVE - Telas Projeto Específico.html` (botões "Concluir atividade"/"Rejeitar atividade", hoje decorativos em `ActivityDetailPage`)

## Contexto

Dois botões hoje decorativos em `ActivityDetailPage`: "Concluir atividade" e "Rejeitar atividade", visíveis quando `activity.status === "execucao" || activity.status === "liberado"`. `ActivityFieldGrid` já renderiza "Evidência de aprovação"/"Observação de aprovação" com um estado `"— pendente"` para qualquer atividade que não esteja `aguardando` — esses dois campos (`approvalEvidence`/`approvalNote`) já existem no tipo `Activity` e já têm valores reais nas atividades `concluido` do seed, só faltava a ação que os escreve de verdade para as atividades ainda em andamento.

Fecha também um loop deixado em aberto pela spec anterior: `IssueDetailPage` já mostra o banner "Aguardando reteste da atividade vinculada — a issue é concluída automaticamente quando a atividade for aprovada" para issues em `solucao_proposta`, e `deriveIssueAuditTrail` já lê `issue.resolvedAt` para montar a entrada `"Solução proposta → Concluída (atividade vinculada aprovada)"` — ambos escritos e funcionais desde o ciclo anterior, esperando por este.

## Escopo desta entrega

Nenhuma rota muda.

**Revisão pós-QA (versão final, substitui as duas primeiras iterações abaixo):** comparando com o protótipo original (`HIVE - Telas Projeto Específico.html`), duas decisões desta spec foram corrigidas depois de já implementadas e revisadas:
1. **Concluir atividade**: a validação estava invertida. O protótipo (`modalAprovar`) exige a **evidência** (`evidenciaObrigatoriaAtividade: true`) e deixa a **observação opcional** — não o contrário.
2. **Rejeitar atividade**: no protótipo, o botão "Reprovar" (`js-reprovar-btn`) **não abre um modal próprio de motivo** — ele abre o mesmo modal de "Registrar issue" (`modalIssue`), só troca o texto do botão para "Reprovar e criar issue" e esconde o campo "Atividade vinculada" (mesmo comportamento que "Registrar nova issue" já tem quando a atividade já é conhecida). Rejeitar uma atividade = registrar uma Issue de verdade contra ela **e** bloqueá-la, na mesma ação.

Os detalhes técnicos abaixo já refletem a versão final.

### `src/types/activity.ts` (modificado)

```ts
export interface Activity {
  // ...todos os campos existentes inalterados...
  rejectedAt: string | null;   // timestamp da última rejeição; null se nunca foi rejeitada
}
```

```ts
export interface ConcludeActivityInput {
  approvalNote: string | null;   // opcional — o protótipo só exige a evidência
  approvalEvidence: ActivityAttachment;   // obrigatória, garantida pela validação do modal
}

export interface RejectActivityInput {
  reason: string;
  evidence: ActivityAttachment | null;
}
```

### `src/hooks/useActivities.ts` (modificado)

18 atividades seed ganham `rejectedAt`: as 4 que têm `retestCount > 0` (`ATV-1003` retestCount 1, `ATV-1009` retestCount 2, `ATV-1015` retestCount 3, `ATV-1017` retestCount 1 — esta última já `concluido`, não `bloqueado`) ganham um valor plausível, próximo de `actualStart`; as demais 14 ganham `rejectedAt: null`. Correção feita durante a implementação: a primeira versão desta spec deixou `ATV-1017` com `rejectedAt: null` por já estar `concluido`, mas a regra da trilha de auditoria (abaixo) usa `retestCount > 0` como gatilho, não o status — sem esse valor, `ATV-1017` produzia duas entradas de trilha com o mesmo timestamp (colisão pega em revisão de código).

```ts
interface UseActivitiesResult {
  activities: Activity[];
  stats: ActivityStats;
  createActivity: (input: NewActivityInput) => void;
  concludeActivity: (activityId: string, input: ConcludeActivityInput) => void;
  rejectActivity: (activityId: string, input: RejectActivityInput) => void;
}
```

`concludeActivity(activityId, input)`: `.map()` — `status: "concluido"`, `actualEnd: toLocalIsoString(new Date())`, `approvalNote: input.approvalNote`, `approvalEvidence: input.approvalEvidence`.

`rejectActivity(activityId, input)`: `.map()` — `status: "bloqueado"`, `notes: input.reason`, `retestCount: activity.retestCount + 1`, `rejectedAt: toLocalIsoString(new Date())`, `attachments: input.evidence ? [...activity.attachments, input.evidence] : activity.attachments`. `input.reason`/`input.evidence` vêm da Issue criada junto (ver `RegisterIssueModal` abaixo) — `reason: input.description` (da issue) e `evidence: input.openingAttachment` (idem), não de um campo de motivo dedicado.

Nenhuma validação nos mutators — mesma convenção já estabelecida (`createActivity`/`startAnalysis`/`proposeSolution`): validação de campo obrigatório vive na UI.

### `src/hooks/useIssues.ts` (modificado)

```ts
interface UseIssuesResult {
  // ...campos existentes...
  resolveIssuesForActivity: (activityId: string) => void;
}
```

`resolveIssuesForActivity(activityId)`: `.map()` sobre todas as issues — para toda issue com `relatedActivityId === activityId && status === "solucao_proposta"`, seta `status: "concluida"`, `resolvedAt: toLocalIsoString(new Date())`; as demais issues passam inalteradas. Zero mudança necessária em `deriveIssueAuditTrail` nem no banner de `IssueDetailPage` — os dois já foram construídos lendo esse dado, só faltava alguém escrevê-lo (mesma frase já usada na spec anterior, agora do lado da Atividade).

### `src/components/activities/ConcludeActivityModal.tsx` (novo)

```ts
interface ConcludeActivityModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ConcludeActivityInput) => void;
}
```

Estruturalmente parecido com `ProposeSolutionModal` (dropzone reaproveitando o mesmo padrão de clique/arraste), mas com a validação invertida em relação à primeira versão desta spec: a **evidência é obrigatória** (banner de erro "Anexe a evidência antes de confirmar." se não houver arquivo) e a **observação é opcional**. Ordem dos campos: Observação de aprovação (opcional, textarea) → Evidência (obrigatória, dropzone). Título "Concluir atividade", subtítulo "Anexe a evidência de aprovação. A observação é opcional." — copy alinhada ao `modalAprovar` do protótipo. No submit, monta `ActivityAttachment` a partir do `File` selecionado (mesmo formato de `formatFileSize`/`uploadedBy: currentUserName`/`uploadedAt` já usado em `ProposeSolutionModal`/`RegisterIssueModal`).

### `RejectActivityModal` — removido, substituído por `RegisterIssueModal` reaproveitado

A primeira versão desta spec criava um `RejectActivityModal.tsx` próprio (textarea de motivo, depois com dropzone de evidência adicionada). **Essa abordagem foi abandonada** depois que o QA comparou com o protótipo: lá, o botão "Reprovar" não tem modal próprio — ele reaproveita o modal de "Registrar issue" (`modalIssue`), só trocando o texto do botão pra "Reprovar e criar issue" e escondendo "Atividade vinculada" (igual à lógica que "Registrar nova issue" já usa). O arquivo `RejectActivityModal.tsx` foi deletado.

### `src/components/issues/RegisterIssueModal.tsx` (modificado — reaproveitado por "Rejeitar atividade")

Componente já existente (ciclo de Registrar Issue), usado também por `ProjectIssuesPage`. Ganha dois props novos, opcionais, com default preservando o comportamento atual desse outro consumidor:

```ts
interface RegisterIssueModalProps {
  // ...props existentes inalteradas...
  submitLabel?: string;   // default "Criar"
  title?: string;          // default "Registrar issue"
}
```

`ActivityDetailPage` abre este mesmo modal tanto pra "Registrar nova issue" (atividade `bloqueado`, `currentActivity` já esconde "Atividade vinculada", `submitLabel`/`title` no default) quanto pra "Rejeitar atividade" (atividade `execucao`/`liberado`, `submitLabel="Reprovar e criar issue"`, `title="Rejeitar atividade"`). Um estado `registerIssueMode: "register" | "reject"` na página decide qual conjunto de props passar e o que fazer no `onCreate`:

```ts
onCreate={(input) => {
  createIssue(input);
  if (registerIssueMode === "reject") {
    rejectActivity(activity.id, { reason: input.description, evidence: input.openingAttachment });
  }
}}
```

Ou seja: rejeitar cria uma Issue de verdade (vinculada à atividade, com todos os campos do formulário — título, descrição, tipo, impeditivo, impacto, anexo, dev responsável) e, na mesma ação, transiciona a atividade pra `bloqueado`, usando a descrição da issue como `notes`/motivo e o anexo de abertura da issue (se houver) como evidência anexada à atividade (via `activity.attachments`, mesmo mecanismo já documentado acima).

**Trade-off aceito conscientemente:** como o formulário de "Registrar issue" já tem "Desenvolvedor responsável" como campo obrigatório, rejeitar uma atividade agora também exige escolher um dev — mais fricção que a versão anterior (só motivo em texto livre), mas fiel ao protótipo e sem duplicar validação.

### `src/components/activities/ActivityFieldGrid.tsx` (ajuste pontual)

`ActivityFieldGrid` já mostrava `"— pendente"` pra "Evidência de aprovação"/"Observação de aprovação" quando nulos, em qualquer atividade que não esteja `aguardando`. Como agora `approvalEvidence` é sempre preenchido quando `concluido` (obrigatório na validação do modal) mas `approvalNote` pode legitimamente ficar nulo (opcional), os dois campos ganham o mesmo tratamento de 3 vias: valor presente → mostra; nulo e `status === "concluido"` → texto de "nada foi anexado/registrado" (`"Nenhuma evidência anexada com a aprovação."` / `"Nenhuma observação registrada na aprovação."`); nulo em qualquer outro status → `"— pendente"`. Mesmo padrão já usado no ciclo anterior pra `IssueAttachmentsPanel`.

### `src/pages/ActivityDetailPage.tsx` (modificado)

Ganha `concludeActivity`/`rejectActivity` de `useActivities(projectId)` e `resolveIssuesForActivity` de `useIssues(projectId)` (ambos já chamados nesta página — sem instância nova, sem risco de dessincronia). Ganha dois `useState` (`showConcludeModal`/`showRejectModal`). O par de botões "Concluir atividade"/"Rejeitar atividade" ganha `onClick` abrindo o modal correspondente. `onSubmit` do `ConcludeActivityModal` chama `concludeActivity(activity.id, input)` **e**, em seguida, `resolveIssuesForActivity(activity.id)` — as duas chamadas na mesma função, sem acoplamento entre os hooks. `onSubmit` do `RejectActivityModal` chama `rejectActivity(activity.id, reason)`.

### Trilha de auditoria (`src/utils/activityAuditTrail.ts`, modificado)

A regra existente (`retestCount > 0`) passa a preferir o novo campo como fonte do timestamp e reflete que a origem agora é uma rejeição real, não mais só um dado histórico do seed:

```ts
if (activity.retestCount > 0) {
  entries.push({
    at: activity.rejectedAt ?? activity.actualStart ?? activity.plannedStart,
    text: `Em execução → Bloqueado (${activity.retestCount}ª rejeição)`,
  });
}
```

Comportamento idêntico para as atividades que já tinham essa entrada (fallback `actualStart ?? plannedStart` preservado); a única mudança visível é o texto e, para atividades rejeitadas por essa nova ação, um timestamp mais preciso.

A regra de `"Em execução → Concluído"` (`status === "concluido" && actualEnd !== null`) já existe e não muda — passa a disparar de verdade a partir de `concludeActivity`.

### Estilo

Nenhum parcial novo — reaproveita `.modal-*`/`.form-group`/`.dropzone`/`.error-banner`/`.btn-danger` já existentes.

## Fora de escopo

- Reabrir/retestar uma atividade `bloqueado` de volta para `execucao` — fluxo futuro, não existe nenhuma ação de "desbloquear" no projeto ainda.
- Qualquer gate de permissão por papel (Gestor aprova/rejeita vs. Tester/Dev) — mesma decisão repetida em todos os ciclos anteriores.
- Cascata para `issue.cascadeActivityIds` (issues que impactam outras atividades além da vinculada principal) — não tocado por esta feature; `resolveIssuesForActivity` só olha `relatedActivityId`.
- Auto-registro de uma nova issue ao rejeitar — o Tester usa o botão "Registrar nova issue" já existente para atividades `bloqueado`, separadamente.

## Testes

Sem suíte automatizada (convenção do projeto). Validação via `npm run dev` + QA manual: abrir uma atividade `execucao` ou `liberado` — clicar "Concluir atividade", submeter vazio (banner de erro, modal não fecha), preencher observação (com e sem evidência) e confirmar — status vira "Concluído", `ActivityFieldGrid` mostra a observação/evidência em vez de "— pendente", trilha de auditoria mostra "Em execução → Concluído"; se a atividade tiver uma issue vinculada em "Solução proposta", ela deve virar "Concluída" automaticamente (checar em `/issues/:issueId`, banner de "aguardando reteste" some, trilha mostra "Solução proposta → Concluída (atividade vinculada aprovada)"). Clicar "Rejeitar atividade" em outra atividade, submeter vazio (banner de erro), preencher motivo e confirmar — status vira "Bloqueado", `Observações` mostra o motivo, "Nº de reteste" incrementa, trilha de auditoria mostra "Em execução → Bloqueado (Nª rejeição)", botão "Registrar nova issue" aparece.
