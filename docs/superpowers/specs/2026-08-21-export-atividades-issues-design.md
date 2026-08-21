# Exportar (Atividades & Issues) — Design

Data: 2026-08-21
Épico: Núcleo UAT / subsistema "Ações e fluxos de trabalho" de `/projetos/:id` — 1º de 6 ciclos combinados nesta sessão (Exportar → Nova Atividade → Importar em massa → Registrar Issue → Ações de status da Issue → Ações de status da Atividade)
Origem: protótipo funcional `HIVE - Telas Projeto Específico.html` (`exportAtividadesBtn`/`exportIssuesBtn`, `rowToExportRecord`/`rowToIssueExportRecord`)

## Contexto

Quatro botões "Exportar" existem hoje só como decoração: nas páginas de Atividades e Issues (`ProjectActivitiesPage`, `ProjectIssuesPage`) e nos dois blocos de métricas do Dashboard (`DashboardActivitiesBlock`, `DashboardIssuesBlock`). O protótipo os implementa gerando um `.xlsx` de verdade (lib SheetJS embutida) a partir das linhas da tabela HTML. Esta spec reproduz o mesmo resultado a partir dos dados tipados que o app já carrega (`Activity[]`/`Issue[]`), sem fazer scraping de DOM.

O projeto não tem nenhuma lib de planilha instalada — adiciona-se `xlsx` (SheetJS) como dependência nova. O uso aqui é exclusivamente de **escrita** (`json_to_sheet` + `writeFile`); as vulnerabilidades conhecidas do pacote são todas de *parsing* de arquivo externo, que não se aplica a este fluxo (parsing de `.xlsx` só vai entrar em cena na spec de "Importar em massa", que trata o risco separadamente).

## Escopo desta entrega

Nenhuma rota muda. Os 4 botões abaixo passam de decorativos para funcionais:

| Botão | Local | Dado exportado |
|---|---|---|
| Exportar atividades | `ProjectActivitiesPage` | `filteredActivities` (respeita os filtros ativos da tela) |
| Exportar issues | `ProjectIssuesPage` | `filteredIssues` (respeita os filtros ativos da tela) |
| Exportar atividades | `DashboardActivitiesBlock` | todas as atividades do projeto (Dashboard não tem filtro) |
| Exportar issues | `DashboardIssuesBlock` | todas as issues do projeto (Dashboard não tem filtro) |

### `src/utils/downloadXlsx.ts` (novo)

Util genérica e pura (sem React), reaproveitada pelas 4 exportações:

```ts
export function downloadXlsx(
  rows: Record<string, string>[],
  columnWidths: number[],
  sheetName: string,
  filenamePrefix: string,
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = columnWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenamePrefix}_${stamp}.xlsx`);
}
```

`XLSX.writeFile` cuida do download no navegador sozinho (cria e clica num link temporário internamente) — não precisa de nenhum código extra de blob/anchor aqui.

### `src/utils/activityExport.ts` (novo)

```ts
export function buildActivityExportRows(activities: Activity[]): Record<string, string>[]
export const ACTIVITY_EXPORT_COLUMN_WIDTHS: number[]
```

Uma linha por atividade, 19 colunas (mesmo conjunto do protótipo), reaproveitando `ACTIVITY_STATUS_LABELS` e `formatActivityDate` já existentes em `activityIndicators.ts`:

| Coluna | Origem |
|---|---|
| ID | `activity.id` |
| Nome | `activity.name` |
| Módulo | `activity.module` |
| Processo | `activity.process` |
| Status | `ACTIVITY_STATUS_LABELS[activity.status]` |
| Tester | `activity.tester` |
| Desenvolvedor | `activity.dev` |
| Início Planejado | `formatActivityDate(activity.plannedStart)` |
| Conclusão Planejada | `formatActivityDate(activity.plannedEnd)` |
| Início Real | `formatActivityDate(activity.actualStart)` |
| Conclusão Real | `formatActivityDate(activity.actualEnd)` |
| Predecessores | `activity.predecessors.join(", ")` ou "—" se vazio |
| WBS | `activity.wbs` |
| Área | `activity.area` |
| Sistema | `activity.system` |
| Transação | `activity.transaction` |
| Resultado Esperado | `activity.expectedResult` |
| Observações | `activity.notes ?? "—"` |
| Reteste | `` `${retestCount}×` `` ou "—" se `retestCount === 0` (mesma convenção de `retestPillClass`) |

### `src/utils/issueExport.ts` (novo)

```ts
export function buildIssueExportRows(issues: Issue[]): Record<string, string>[]
export const ISSUE_EXPORT_COLUMN_WIDTHS: number[]
```

Uma linha por issue, 15 colunas, reaproveitando `ISSUE_STATUS_LABELS`, `ISSUE_TYPE_LABELS`, `ISSUE_IMPACT_LABELS` e `computeIssueAgingDays` de `issueIndicators.ts`:

| Coluna | Origem |
|---|---|
| ID | `issue.id` |
| Título | `issue.title` |
| Tipo | `ISSUE_TYPE_LABELS[issue.type]` |
| Categorização de Impacto | `ISSUE_IMPACT_LABELS[issue.impact]` |
| Impeditivo | "Sim"/"Não" |
| Área | `issue.area` |
| Descrição | `issue.description` |
| Atividade vinculada | `issue.relatedActivityId ?? "—"` |
| Tester | `issue.tester` |
| Desenvolvedor | `issue.dev` |
| Status | `ISSUE_STATUS_LABELS[issue.status]` |
| Solução proposta | `issue.proposedSolution ?? "—"` |
| Aberta em | data formatada de `issue.openedAt` |
| Concluída em | data formatada de `issue.resolvedAt`, ou "—" se `null` |
| Aging (dias) | `String(computeIssueAgingDays(issue))` |

**Diferença deliberada do protótipo:** sem colunas "Módulo"/"Processo" — nosso `Issue` não guarda esses campos (só existem no `Activity` vinculado, e a tabela de Issues já shippada também não os exibe). Formatação de data local a este arquivo (`new Date(iso).toLocaleDateString("pt-BR")`), sem importar `formatActivityDate` de `activityIndicators.ts` — mesmo padrão de duplicação pontual já usado entre `ActivityRow`/`IssueRow`.

### `src/hooks/useExportButton.ts` (novo)

Hook pequeno de comportamento de UI — mesma categoria de `useGoBack.ts` (não busca dado mockado, encapsula uma interação). Reproduz o feedback do protótipo sem precisar de um sistema de toast novo: o próprio texto do botão muda temporariamente.

```ts
interface UseExportButtonResult {
  label: string;
  isDefault: boolean;
  handleClick: () => void;
}

export function useExportButton(
  defaultLabel: string,
  isEmpty: boolean,
  emptyLabel: string,
  runExport: () => void,
): UseExportButtonResult
```

`handleClick`: se `isEmpty`, mostra `emptyLabel` por 1.6s e volta ao `defaultLabel` (nenhum arquivo é gerado). Senão, chama `runExport()` dentro de um `try/catch`; se lançar, mostra "Erro ao exportar — tente novamente" por 2s e volta. `isDefault` (`label === defaultLabel`) é exposto para o chamador decidir se mostra o ícone (ver wiring abaixo).

### Wiring nos 4 consumidores

`ProjectActivitiesPage`/`ProjectIssuesPage`: o botão troca `<NavIcon>...</NavIcon>{"Exportar X"}` fixo por:

```tsx
<button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleClick}>
  {isDefault ? (
    <>
      <NavIcon>...</NavIcon>
      {label}
    </>
  ) : (
    label
  )}
</button>
```

Mesmo padrão do protótipo (o ícone some enquanto a mensagem transitória está visível). `runExport` chama `downloadXlsx(buildActivityExportRows(filteredActivities), ACTIVITY_EXPORT_COLUMN_WIDTHS, "Atividades", "hive_atividades")` (e o equivalente de Issues).

`DashboardActivitiesBlock`/`DashboardIssuesBlock`: ganham prop nova (`activities: Activity[]` / `issues: Issue[]`) — hoje só recebem `stats`. `ProjectDashboardPage` já chama `useActivities`/`useIssues`; passa a repassar as listas completas (hoje só desestrutura `stats`/`stats: issueStats`). Mesmo hook `useExportButton`, mesmo padrão de botão.

### Dependência nova

`package.json`: `"xlsx": "^0.18.5"` (mesma versão que o protótipo embute). O pacote já publica seus próprios tipos TS — não precisa de `@types/xlsx`.

## Fora de escopo

- Colunas "Módulo"/"Processo" no export de Issues (ver "Diferença deliberada" acima).
- Qualquer outro botão decorativo (Nova Atividade, Importar em massa, Registrar Issue, Concluir/Rejeitar atividade, Iniciar análise/Propor solução, ações em massa da tabela) — cada um é seu próprio ciclo spec → plano → implementação, já sequenciados.
- Aplicar a matriz de permissões (`ConfigPermissionMatrix`, linha "Exportar dados") de fato — nenhuma ação já shippada no projeto é bloqueada por papel ainda; export segue a mesma convenção.
- Exportar em outro formato (CSV, PDF) — só `.xlsx`.

## Testes

Sem suíte automatizada (convenção do projeto). Validação via `npm run dev` + QA manual: aplicar um filtro em Atividades (ex.: só "Bloqueado") e clicar Exportar — o `.xlsx` baixado deve conter só as linhas filtradas, com as 19 colunas corretas; repetir em Issues; limpar todos os filtros e exportar de novo — deve trazer todas; nos 2 blocos do Dashboard, exportar deve trazer o total do projeto independente de qualquer filtro fixado nas páginas de lista; aplicar um filtro que não bate com nenhuma atividade/issue e clicar Exportar — botão deve mostrar "Nenhuma atividade/issue no filtro atual" por ~1.6s e voltar ao normal, sem baixar arquivo; abrir o `.xlsx` gerado num leitor de planilha e conferir que os cabeçalhos e a formatação de data (dd/mm/aaaa) batem com o resto do app.
