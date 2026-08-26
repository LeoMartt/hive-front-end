# Ações de status da Issue (Iniciar análise / Propor solução) — Design

Data: 2026-08-21
Épico: Núcleo UAT / subsistema "Ações e fluxos de trabalho" de `/projetos/:id` — 5º de 6 ciclos combinados nesta sessão (Exportar ✅ → Nova Atividade ✅ → Importar em massa ✅ → Registrar Issue ✅ → **Ações de status da Issue** → Ações de status da Atividade)
Depende de: [2026-08-17-project-issues-list-design.md](2026-08-17-project-issues-list-design.md) (tipo `Issue`, `useIssues`), [2026-08-21-registrar-issue-design.md](2026-08-21-registrar-issue-design.md) (padrão de dropzone/modal reaproveitado, `useIssues` já com mutator de criação)
Origem: protótipo funcional `HIVE - Telas Projeto Específico.html` (`iniciarAnaliseBtn`, `proporSolucaoBtn`, `modalProporSolucao`)

## Contexto

Dois botões hoje decorativos em `IssueDetailPage`: "Iniciar análise" (visível quando `status === "aberta"`) e "Propor solução" (visível quando `status === "em_analise"`). O protótipo confirma uma decisão já registrada neste projeto: "Iniciar análise" é uma ação manual (clique do Dev), não automática ao abrir a issue — o próprio protótipo tem um comentário do time datado de 27/07/2026 admitindo que isso contradiz a RN16 documentada, mas foi mantido assim de propósito. Bate exatamente com a decisão já tomada na spec de Papéis & Config (o toggle "Transições automáticas" é decorativo por esse motivo).

Diferente dos ciclos anteriores, aqui os mutators **atualizam** uma issue existente em vez de criar uma nova — primeira vez que `useIssues.ts` precisa de um `.map()` em vez de um `[...prev, novo]`.

## Escopo desta entrega

Nenhuma rota muda. **Iniciar análise**: clique direto no botão, sem modal — transição imediata. **Propor solução**: abre modal com textarea obrigatória + evidência opcional.

### `src/hooks/useIssues.ts` (modificado)

```ts
export interface UseIssuesResult {
  issues: Issue[];
  stats: IssueStats;
  createIssue: (input: NewIssueInput) => void;
  startAnalysis: (issueId: string) => void;
  proposeSolution: (issueId: string, input: ProposeSolutionInput) => void;
}
```

```ts
// src/types/issue.ts — novo tipo
export interface ProposeSolutionInput {
  proposedSolution: string;
  solutionAttachment: IssueAttachment | null;
}
```

`startAnalysis(issueId)`: `setIssues(prev => prev.map(issue => issue.id === issueId ? { ...issue, status: "em_analise", analysisStartedAt: toLocalIsoString(new Date()) } : issue))`.

`proposeSolution(issueId, input)`: mesmo padrão de `.map()`, seta `status: "solucao_proposta"`, `proposedSolution: input.proposedSolution`, `solutionProposedAt: toLocalIsoString(new Date())`, `solutionAttachment: input.solutionAttachment`.

Nenhuma validação nos mutators — mesma convenção já estabelecida (`createActivity`/`createIssue`): validação de campo obrigatório vive na UI.

### `src/components/issues/ProposeSolutionModal.tsx` (novo)

```ts
interface ProposeSolutionModalProps {
  show: boolean;
  onHide: () => void;
  currentUserName: string;
  onSubmit: (input: ProposeSolutionInput) => void;
}
```

Dois campos: "Solução proposta" (textarea, obrigatório — banner de erro se vazio, mesmo padrão de erro já usado em todos os outros modais) e "Evidência" (dropzone opcional, mesmo componente/padrão já usado em `RegisterIssueModal`/`ImportActivitiesModal`/`NewActivityModal` — clique ou arraste, captura `File`, monta `IssueAttachment` no submit com `uploadedBy: currentUserName`).

### `src/pages/IssueDetailPage.tsx` (modificado)

Ganha `startAnalysis`/`proposeSolution` de `useIssues(projectId)` (já chamado nesta página, sem instância nova — sem risco de dessincronia como no ciclo anterior, é a mesma única chamada já existente). Ganha `CURRENT_USER_NAME` (constante local, esta página ainda não tinha) e um `showProposeSolutionModal` (`useState`). Botão "Iniciar análise" ganha `onClick={() => startAnalysis(issue.id)}` direto. Botão "Propor solução" ganha `onClick={() => setShowProposeSolutionModal(true)}`. `<ProposeSolutionModal>` renderizado no fim, com `onSubmit={(input) => proposeSolution(issue.id, input)}`.

**Zero mudança necessária** em `IssueAuditTrail`/`deriveIssueAuditTrail` (já lê `analysisStartedAt`/`solutionProposedAt` para montar a trilha) nem em `IssueAttachmentsPanel` (já lê `solutionAttachment` e já tem o estado vazio certo, "aguardando o Dev propor uma solução") — os dois já foram construídos prontos para esse dado, só faltava alguém escrevê-lo.

### Estilo

Nenhum parcial novo — reaproveita `.modal-*`/`.form-group`/`.dropzone`/`.error-banner` já existentes.

## Fora de escopo

- Transição automática "Solução proposta → Concluída" quando a atividade vinculada é aprovada — já documentada no banner que já existe em `IssueDetailPage`, depende do subsistema "Ações de status da Atividade".
- "Adicionar anexo extra" numa issue já aberta/em análise (`issueAbertaAddAnexoBtn`/`issueEmAnaliseAddAnexoBtn` no protótipo) — é gestão de anexos, não uma transição de status; não foi pedida.
- Qualquer gate de permissão por papel (Dev vs. Tester vs. Gestor) — mesma decisão repetida em todos os ciclos anteriores.
- Confirmação/modal para "Iniciar análise" — o protótipo já trata como ação de um clique só, sem fricção.

## Testes

Sem suíte automatizada (convenção do projeto). Validação via `npm run dev` + QA manual: abrir uma issue "Aberta", clicar "Iniciar análise" — status vira "Em análise" na hora, sem reload, trilha de auditoria mostra "Aberta → Em análise" com o horário certo; clicar "Propor solução", submeter vazio — banner de erro, modal não fecha; preencher a solução (com e sem evidência) e confirmar — status vira "Solução proposta", painel de anexos mostra a evidência (ou a mensagem de ausência), trilha de auditoria mostra "Em análise → Solução proposta"; conferir que o banner "Aguardando reteste..." aparece corretamente no novo estado.
