# Tela "Detalhe de Issue" — Design

Data: 2026-08-19
Épico: Núcleo UAT / subsistema "Projeto Específico" do HIVE
Depende de: [2026-08-17-project-issues-list-design.md](2026-08-17-project-issues-list-design.md) (lista de Issues, já implementada — a linha da tabela já navega para esta rota) e [2026-08-18-activity-detail-design.md](2026-08-18-activity-detail-design.md) (introduziu `.activity-layout`/`.field-row`/`.attach-row`/`ActivityAuditTrail`/`ActivityAttachmentsPanel`, reaproveitados aqui)
Origem: mockup estático `HIVE - Telas Projeto Específico.html`, seções `#page-issue-detalhe-aberta`, `#page-issue-detalhe-emanalise`, `#page-issue-detalhe` (solução proposta) e `#page-issue-detalhe-concluida`

## Contexto

A spec de Atividades mapeou os 6 subsistemas de `/projetos/:id` e decidiu que cada um vira seu próprio ciclo spec → plano → implementação. Esta spec cobre o **detalhe de uma issue**, hoje um placeholder "Em construção" na rota `/projetos/:id/issues/:issueId` (`IssueDetailPlaceholderPage`) — a linha da tabela de Issues e o painel "Issues vinculadas" do detalhe de Atividade já navegam para essa rota, só falta o conteúdo real.

O mockup tem 4 variações de tela — uma por status da issue (`aberta`, `em_analise`, `solucao_proposta`, `concluida`) — com campos, banners e ações que mudam de acordo. Esta spec cobre as 4. O mockup também tem um fluxo de anexo extra por upload e uma nota (RN16) sobre transição automática configurável por Papéis & Config; ambos ficam fora de escopo (ver "Fora de escopo").

## Escopo desta entrega

### Roteamento

```
/projetos/:id/issues/:issueId → IssueDetailPage (esta spec, substitui o placeholder)
```

Nenhuma outra rota muda. `IssueDetailPlaceholderPage` é removida (não é mais usada em nenhuma rota).

### Navegação "Voltar" — origin-aware em todo o sistema

Novo hook `src/hooks/useGoBack.ts`:

```ts
export function useGoBack(fallbackPath: string): () => void
```

Implementação: se `location.key !== "default"` (react-router indica que existe uma entrada de histórico real dentro da sessão da SPA — não foi acesso direto por URL/link externo/reload), chama `navigate(-1)`; senão navega para `fallbackPath`.

Isso substitui o `goBack` fixo hoje usado em `ActivityDetailPage` (ajuste pontual: `useGoBack(`/projetos/${projectId}/atividades`)`) e é usado também em `IssueDetailPage` (`useGoBack(`/projetos/${projectId}/issues`)`). Resultado: "← Voltar" retorna sempre para a tela de onde o usuário realmente veio — tabela de Issues, ou painel "Issues vinculadas" dentro do detalhe de uma Atividade — sem precisar enumerar origens explicitamente; qualquer tela futura que linke para um desses detalhes já funciona automaticamente.

### Modelo de dados

`src/types/issue.ts` — `Issue` ganha 7 campos novos e um tipo novo `IssueAttachment`; nenhum campo existente muda, então `IssueStats`/`computeIssueAgingDays`/`computeIssueRisk`/`sortIssuesByPriority` (todos calculados a partir dos campos já existentes) continuam produzindo os mesmos resultados de hoje:

```ts
export interface IssueAttachment {
  fileName: string;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Issue {
  // ...campos existentes inalterados (id, title, status, impeditiva, type, impact, area,
  // tester, dev, relatedActivityId, cascadeActivityIds, openedAt, resolvedAt)...
  description: string;                          // texto livre — o que foi observado
  impactNote: string;                            // justificativa curta ao lado do nível de impacto, ex. "bloqueia homologação fiscal"
  proposedSolution: string | null;                // null até o Dev propor (status "aberta"/"em_analise")
  analysisStartedAt: string | null;               // ISO; null enquanto "aberta"
  solutionProposedAt: string | null;              // ISO; null antes de "solucao_proposta"
  openingAttachment: IssueAttachment | null;      // anexo enviado pelo Tester na abertura — opcional para não impeditivas
  solutionAttachment: IssueAttachment | null;     // anexo enviado pelo Dev — só existe a partir de "solucao_proposta"
}
```

`IssueAttachment` duplica a forma de `ActivityAttachment` em vez de reaproveitá-la — mesma decisão já registrada no projeto de duplicar um tipo pequeno em vez de abstrair cedo entre features (ver `ActivityRow` vs `IssueRow`).

O rótulo "(Tester)"/"(Dev)" que aparece ao lado de quem enviou cada anexo no mockup não vira campo novo — é derivado no componente: o painel "Anexo da issue" sempre atribui o envio a `issue.tester`, o painel "Anexo da solução" sempre atribui a `issue.dev`. `uploadedBy` guarda só o nome, igual a `ActivityAttachment` hoje.

`src/hooks/useIssues.ts`: as 15 issues seed existentes ganham esses 7 campos com valores plausíveis e coerentes com `status`/`type`/`impact` já existentes:
- `status: "aberta"` → `analysisStartedAt`, `solutionProposedAt`, `proposedSolution`, `solutionAttachment` todos `null`.
- `status: "em_analise"` → preenche só `analysisStartedAt`; os demais (`solutionProposedAt`, `proposedSolution`, `solutionAttachment`) continuam `null`.
- `status: "solucao_proposta"` → preenche `analysisStartedAt`, `solutionProposedAt`, `proposedSolution`, `solutionAttachment`.
- `status: "concluida"` → preenche tudo (já tem `resolvedAt` hoje).
- `openingAttachment` é `null` apenas nas issues não impeditivas sem anexo (mesma regra do mockup: "Nenhum anexo — opcional para issues não impeditivas"); todas as `impeditiva: true` ganham `openingAttachment` não nulo.

`src/utils/issueAuditTrail.ts` (novo):

```ts
export interface IssueAuditEntry {
  at: string;   // ISO
  text: string;
}

export function deriveIssueAuditTrail(issue: Issue): IssueAuditEntry[]
```

Regras, aplicadas nesta ordem (cada uma adiciona no máximo uma entrada; a lista final é ordenada da mais recente para a mais antiga):

1. Se `status === "concluida"`: `"Solução proposta → Concluída (atividade vinculada aprovada)"` na data de `resolvedAt`.
2. Se `solutionProposedAt !== null`: `"Em análise → Solução proposta"` nessa data.
3. Se `analysisStartedAt !== null`: `"Aberta → Em análise"` nessa data.
4. Sempre (última regra, aplicada a toda issue): `"Issue registrada como {impeditiva ? "impeditiva" : "não impeditiva"}"` na data de `openedAt`.

Uma issue `concluida`, por exemplo, produz 4 entradas (regras 1, 2, 3 e 4); uma `aberta` produz só a entrada da regra 4. Bate com os 4 exemplos do mockup (1, 2, 3 e 4 entradas por status, respectivamente).

### Componentes novos

```
src/pages/IssueDetailPage.tsx                     — substitui IssueDetailPlaceholderPage
src/components/issues/
  IssueFieldGrid.tsx                               — grid de 2 colunas com os campos da issue
  IssueAuditTrail.tsx                              — lista de IssueAuditEntry
  IssueAttachmentsPanel.tsx                        — painel(éis) "Anexo da issue" / "Anexo da solução"
src/hooks/
  useGoBack.ts                                     — hook novo (ver "Navegação")
```

**`IssueDetailPage`**: busca a issue via `useIssues(projectId)` + `useParams().issueId` (`issues.find((i) => i.id === issueId)`) e, quando `relatedActivityId` não é `null`, a atividade vinculada via `useActivities(projectId)` (só para exibir o nome dela no cabeçalho — não navega para lá). Cabeçalho inline na página (mesmo padrão de `ActivityDetailPage`/`ProjectIssuesPage`, que não extraem um componente de cabeçalho à parte): botão "← Voltar" (via `useGoBack`), `drawer-id` (`{issue.id} · vinculada a {activity.name}` quando há atividade vinculada, senão só `{issue.id}`), título (`issue.title`), `IssueStatusBadge` + `impeditivo-tag`/`impeditivo-tag-nao` com o texto "Impeditiva"/"Não impeditiva" (reaproveita as classes já existentes de `IssueRow`/`_issues.scss`, sem introduzir uma classe nova). Quando `status === "solucao_proposta"`, mostra o `.info-banner` "Aguardando reteste da atividade vinculada — a issue é concluída automaticamente quando a atividade for aprovada." (mesma classe já usada em `ActivityDetailPage`). Botão de ação decorativo (sem `onClick`, mesmo padrão de toda ação real ainda não implementada): "Iniciar análise" quando `status === "aberta"`, "Propor solução" quando `status === "em_analise"`; nenhum botão para `solucao_proposta`/`concluida`. Compõe `IssueFieldGrid`, `IssueAuditTrail` e `IssueAttachmentsPanel`.

**`IssueFieldGrid`**: 8 campos em grid de 2 colunas, iguais para todos os status — Tipo (`ISSUE_TYPE_LABELS[issue.type]`), Desenvolvedor responsável · Aberta em (`openedAt`, formatado), Aberta há (`computeIssueAgingDays` + "dias") — trocado por "Concluída em" (`resolvedAt` formatado + duração entre parênteses) quando `status === "concluida"` · Atividade vinculada (`issue.relatedActivityId ?? "—"`), Categorização de impacto (`${ISSUE_IMPACT_LABELS[issue.impact]} — ${issue.impactNote}`) · Descrição (linha inteira, `issue.description`) · Solução proposta (linha inteira; classe `field-value pending` com "— ainda não proposta" quando `proposedSolution` é `null` e `status === "em_analise"`, "— ainda não analisada" quando `null` e `status === "aberta"`, texto normal com `issue.proposedSolution` quando preenchido).

**`IssueAuditTrail`**: mesma estrutura visual de `ActivityAuditTrail` (`.divider`/`.subhead`/`.audit-trail`), recebendo `entries: IssueAuditEntry[]` (arquivo próprio — mesma decisão de duplicar em vez de abstrair um componente genérico entre features).

**`IssueAttachmentsPanel`**: recebe `issue: Issue`. Reaproveita a estrutura visual de `ActivityAttachmentsPanel` (`.panel`/`.attach-row`/`.attach-icon`/`.attach-dl`, já existentes em `_activity-detail.scss`). Painel "Anexo da issue" sempre renderizado — mostra `openingAttachment` com "enviado por {issue.tester} (Tester)" quando não nulo, ou o texto discreto "Nenhum anexo — opcional para issues não impeditivas" quando `openingAttachment` é `null`. Painel "Anexo da solução" só renderizado quando `solutionAttachment !== null` (mostra "enviado por {issue.dev} (Dev)"); enquanto não existe, mostra a nota discreta do mockup ("Anexo da solução ainda não existe — aguardando o Dev propor uma solução."). Botão de download decorativo (sem `onClick`), igual ao padrão já usado em `ActivityAttachmentsPanel`.

**Refactor pontual justificado**: `ActivityDetailPage` troca seu `goBack` local fixo por `useGoBack(`/projetos/${projectId}/atividades`)` — comportamento equivalente quando não há histórico de navegação (cai no fallback), origin-aware quando há.

### Estilo

Nenhum parcial novo. `_activity-detail.scss` já cobre tudo que esta tela precisa (`.activity-layout`, `.activity-main`, `.activity-side`, `.field-row`/`.field`/`.field-label`/`.field-value`(+`.big`/`.pending`), `.divider`, `.subhead`, `.audit-trail`, `.info-banner`, `.attach-row`/`.attach-icon`/`.attach-body`/`.attach-dl`/`.attach-divider`). `_issues.scss` já tem `.impeditivo-tag`(+`-sim`/`-nao`). Nenhuma classe nova, nenhum registro novo em `main.scss`.

### Fora de escopo

- Upload de anexo extra ("+ Adicionar anexo" do mockup) — não existe fluxo de upload real em nenhuma tela do projeto ainda (mesma decisão já tomada para evidência de aprovação na spec de Atividade).
- Ações reais de "Iniciar análise"/"Propor solução" (mudança de status, formulário de solução, upload obrigatório) — botões decorativos.
- Transição automática configurável (comentário RN16 do mockup, ligado a Papéis & Config > Limiares e Alertas) — a tela de configuração não existe ainda.
- Diferenciação de ações por papel (Gestor/Tester/Dev) — mesma decisão já registrada na spec de Atividade.
- Exibição de `cascadeActivityIds` (atividades impactadas em cascata) no detalhe — já aparece na tabela de Issues; o mockup do detalhe não mostra isso, não haveria fidelidade visual a seguir.
- Cutover (fora do escopo geral do projeto, conforme já registrado na spec de Atividades).

## Testes

Sem testes automatizados (mesma decisão de todas as specs anteriores). Validação via `npm run dev`: os 8 campos do grid renderizando corretamente para issues de cada um dos 4 status (incluindo "Concluída em" só aparecendo quando `concluida`, e os estados `pending` de "Solução proposta"), trilha de auditoria com o número certo de entradas para pelo menos uma issue de cada status, painel de anexos mostrando/ocultando "Anexo da solução" conforme o status e a mensagem certa quando `openingAttachment` é `null`; botão de ação certo aparecendo só no status esperado; `useGoBack` retornando para Issues quando a navegação veio da tabela de Issues e para a Atividade certa quando veio do painel "Issues vinculadas" do detalhe de Atividade (e caindo no fallback em acesso direto por URL); `ActivityDetailPage` continuando a voltar corretamente para Atividades depois do refactor do `goBack`; nav dock continuando a navegar corretamente para as outras áreas do projeto.
