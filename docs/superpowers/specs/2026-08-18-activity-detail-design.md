# Tela "Detalhe de Atividade" — Design

Data: 2026-08-18
Épico: Núcleo UAT / subsistema "Projeto Específico" do HIVE
Depende de: [2026-08-07-project-activities-list-design.md](2026-08-07-project-activities-list-design.md) (lista de Atividades, já implementada — a linha da tabela já navega para esta rota) e [2026-08-17-project-issues-list-design.md](2026-08-17-project-issues-list-design.md) (introduziu `IssueStatusBadge` e a lógica de cor por aging/risco, reaproveitadas aqui)
Origem: mockup estático `HIVE - Telas Projeto Específico.html`, seção `#page-atividade-detalhe`

## Contexto

A spec de Atividades mapeou os 6 subsistemas de `/projetos/:id` e decidiu que cada um vira seu próprio ciclo spec → plano → implementação. Esta spec cobre o **detalhe de uma atividade**, hoje um placeholder "Em construção" na rota `/projetos/:id/atividades/:activityId` (`ActivityDetailPlaceholderPage`) — a linha da tabela de Atividades já navega para essa rota desde a spec de 2026-08-07, só falta o conteúdo real.

O mockup de referência tem bem mais do que o tipo `Activity` atual comporta: campos de WBS/Área/Sistema/Transação/Resultado esperado/Observações, uma trilha de auditoria por atividade, um painel de "Issues vinculadas", botões de aprovar/rejeitar, e um fluxo de evidência/anexo de aprovação. Esta spec cobre os três primeiros; os botões de ação ficam decorativos e o fluxo de evidência/anexo fica fora de escopo (ver "Fora de escopo").

## Escopo desta entrega

### Roteamento

```
/projetos/:id/atividades/:activityId → ActivityDetailPage (esta spec, substitui o placeholder)
```

Nenhuma outra rota muda. `ActivityDetailPlaceholderPage` é removida (não é mais usada em nenhuma rota).

### Modelo de dados

`src/types/activity.ts` — `Activity` ganha 6 campos novos; nenhum campo existente muda, então `ActivityStats`/`computeSpi`/`computeIndicators`/`filterActivities`/`groupActivities` (todos calculados a partir dos campos já existentes) continuam produzindo os mesmos resultados de hoje:

```ts
interface Activity {
  // ...campos existentes inalterados (id, name, status, module, process, tester, dev,
  // plannedStart, plannedEnd, actualStart, actualEnd, predecessors, retestCount, issueCount)...
  wbs: string;              // ex.: "1.1.4.2"
  area: string;              // categorização de negócio, ex. "Fiscal" — independente de module/process
  system: string;            // ex.: "SAP S/4HANA"
  transaction: string;       // ex.: "FB60"
  expectedResult: string;    // critério de aceite em texto livre
  notes: string | null;      // observações gerais em texto livre; null quando não há nada a registrar
}
```

`src/hooks/useActivities.ts`: as 18 atividades seed existentes ganham esses 6 campos com valores plausíveis e coerentes com `module`/`process` já existentes (ex.: atividades de "Faturamento / Emissão de NF-e" recebem `wbs` na faixa "1.1.x", `system: "SAP S/4HANA"`, `area: "Fiscal"`; atividades de "Cadastro de Clientes" recebem `area: "Cadastro"`, `system` e `wbs` em faixa própria).

**Fora de escopo desta extensão:** "Evidência de aprovação"/"Observação de aprovação" do mockup — só fazem sentido junto de um fluxo real de aprovação com upload, que não existe em nenhuma tela do projeto ainda (nem no fluxo de Issues, onde "Propor solução"/"Iniciar análise" também ficaram decorativos). Ver "Fora de escopo" geral.

### Trilha de auditoria (derivada, não armazenada)

Não existe modelo de auditoria real no projeto — a mesma decisão já tomada para o log de atividades recentes do Dashboard (lá, estático; aqui, **derivado dos campos da própria atividade**, para não exigir autoria manual de 18 históricos e continuar coerente se os dados mudarem).

`src/utils/activityAuditTrail.ts` (novo):

```ts
export interface ActivityAuditEntry {
  at: string;   // ISO
  text: string;
}

export function deriveActivityAuditTrail(activity: Activity): ActivityAuditEntry[]
```

Regras, aplicadas nesta ordem (cada uma adiciona no máximo uma entrada; a lista final é ordenada da mais recente para a mais antiga):

1. Se `status === "concluido"` e `actualEnd !== null`: `"Em execução → Concluído"` na data de `actualEnd`.
2. Se `status === "cancelado"`: **apenas** `"Atividade cancelada"` na data de `plannedStart` (nenhuma outra regra se aplica).
3. Se `retestCount > 0`: `"Bloqueado → aguardando reteste (Nª vez)"` (N = `retestCount`) na data de `actualStart` (ou `plannedStart` se `actualStart` for `null`).
4. Se `actualStart !== null`: `"Aguardando → Em execução"` nessa data.
5. Senão (não cancelada, `actualStart === null`): `"Aguardando início"` na data de `plannedStart`.

Uma atividade `concluido` com `retestCount > 0`, por exemplo, produz 3 entradas (regras 1, 3 e 4); uma `aguardando` sem `actualStart` produz só a entrada da regra 5.

### Componentes novos

```
src/pages/ActivityDetailPage.tsx                         — substitui ActivityDetailPlaceholderPage
src/components/activities/
  ActivityFieldGrid.tsx                                   — grid de 2 colunas com os campos da atividade
  ActivityAuditTrail.tsx                                  — lista de ActivityAuditEntry
  ActivityLinkedIssuesPanel.tsx                            — painel "Issues vinculadas (N)"
```

**`ActivityDetailPage`**: busca a atividade via `useActivities(projectId)` + `useParams().activityId` (`activities.find((a) => a.id === activityId)`). Cabeçalho fica inline na página (mesmo padrão de `ProjectIssuesPage`/`ProjectDashboardPage`, que não extraem um componente de cabeçalho à parte): botão "← Voltar para Atividades" (`useNavigate` para `/projetos/:id/atividades`), breadcrumb `{activity.id} · {activity.module} / {activity.process}`, título (`activity.name`), `ActivityStatusBadge` (já existe) + pílula de reteste, e o par de botões de ação (ver abaixo). Compõe `ActivityFieldGrid`, `ActivityAuditTrail` e `ActivityLinkedIssuesPanel`.

**`ActivityFieldGrid`**: 14 campos em grid de 2 colunas — Tester, Dev · Início planejado, Conclusão planejada · Início real, Conclusão real · Predecessores, WBS · Área, Sistema · Transação, Nº de reteste · Resultado esperado (linha inteira) · Observações (linha inteira). Datas nulas (`actualStart`/`actualEnd` de atividades ainda não iniciadas/concluídas) mostram `"—"`, mesmo padrão de `ActivityRow.tsx`. `Predecessores` reaproveita a mesma junção por vírgula já usada na tabela (`activity.predecessors.length === 0 ? "—" : activity.predecessors.join(", ")`).

**`ActivityAuditTrail`**: recebe `entries: ActivityAuditEntry[]` (já vindas de `deriveActivityAuditTrail`, chamado uma vez em `ActivityDetailPage`) e renderiza a lista, formatando `at` com `toLocaleString("pt-BR")` (data + hora, já que a trilha do mockup mostra timestamp completo, não só data).

**`ActivityLinkedIssuesPanel`**: recebe `activityId`/`projectId`, chama `useIssues(projectId)` e filtra `issues.filter((issue) => issue.relatedActivityId === activityId)`. Cada linha reaproveita `IssueStatusBadge` (de `src/components/issues/`) e a mesma função `computeIssueAgingDays` de `issueIndicators.ts` para mostrar "aberta há Xd" — reuso direto de peças já construídas na spec de Issues, não uma abstração nova. Painel vazio (nenhuma issue vinculada) mostra uma mensagem simples, sem componente `EmptyState` completo (o painel é pequeno demais para justificar o ícone+título+descrição do componente padrão — só um texto discreto "Nenhuma issue vinculada a esta atividade.").

**Botões "Concluir atividade" / "Rejeitar atividade"**: decorativos (sem `onClick`), mesmo padrão de todo botão de ação real ainda não implementada no projeto. Renderizados apenas quando `activity.status !== "concluido" && activity.status !== "cancelado"` — é só uma condição de exibição (não overload de lógica de transição de estado).

**Refactor pontual justificado**: `retestPillClass` (hoje definida só dentro de `src/components/activities/ActivityRow.tsx`) passa a ser usada também no cabeçalho de `ActivityDetailPage`. Move para `src/utils/activityIndicators.ts` (mesmo arquivo de `ACTIVITY_STATUS_LABELS`/`ACTIVITY_STATUS_BADGE_CLASS`) e é importada nos dois lugares — comportamento idêntico, só muda de arquivo.

### Estilo

Novo parcial `src/styles/_activity-detail.scss` (registrado em `main.scss`), portando do mockup as classes que ainda não existem no projeto: `.activity-layout` (grid principal + lateral, 2 colunas em telas largas, 1 coluna abaixo de ~900px), `.activity-main`, `.activity-side`, `.field-row`/`.field`/`.field-label`/`.field-value` (+ variante `.big` para os campos de texto livre em linha inteira), `.divider`, `.subhead`, `.issue-row`/`.issue-row-l` (linha compacta do painel de issues vinculadas). Cores em variáveis Sass literais de `_colors.scss`, mesma decisão já registrada nas specs anteriores. Reaproveita sem alteração: `.activity-badge` (+ modificadoras), `.retest-pill` (+ variantes), `.avatar-mini`, `.panel`/`.panel-head`/`.panel-title` (já existem em `_activities.scss`/`_dashboard.scss`).

### Fora de escopo

- Evidência/anexo de aprovação e o painel de anexo com botão de download — não existe fluxo de upload em nenhuma tela do projeto ainda.
- Ações reais de "Concluir atividade"/"Rejeitar atividade" (modais de aprovação/reprovação, mudança de status, evidência obrigatória) — botões decorativos.
- "Registrar nova issue" a partir do detalhe da atividade — o botão "+ Registrar issue" decorativo já existe na tela de Issues (spec anterior); não duplicar aqui.
- Diferenciação de ações por papel (Gestor/Tester/Dev) — o próprio mockup já registra isso como funcionalidade pendente de reativação; nada a fazer nesta spec.
- Trilha de auditoria real (persistida/event-sourced) — continua derivada dos campos existentes, não um novo modelo de dados.
- Cutover (fora do escopo geral do projeto, conforme já registrado na spec de Atividades).

## Testes

Sem testes automatizados (mesma decisão de todas as specs anteriores). Validação via `npm run dev`: os 14 campos do grid renderizando corretamente para atividades de diferentes módulos/status (datas nulas mostrando `—`), trilha de auditoria com o número certo de entradas para pelo menos uma atividade `concluido` (com e sem reteste), uma `bloqueado` com `retestCount > 0`, uma `aguardando` sem `actualStart`, e uma `cancelado`; painel de issues vinculadas batendo com o que `useIssues` já referencia por `relatedActivityId` (ex.: `ATV-1009` deve listar `ISS-0290` e `ISS-0294`); botões de ação aparecendo só quando `status` permite; botão "← Voltar" retornando para `/projetos/:id/atividades`; clique numa linha da tabela de Atividades continuando a abrir esta tela; nav dock continuando a navegar corretamente para as outras áreas do projeto.
