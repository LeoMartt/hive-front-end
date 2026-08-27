# Ações em massa de Atividades + botão "Salvar matriz" em Config — Design

**Branch:** `fabretti_acoes-em-massa`
**Contexto:** auditoria de funcionalidades do front-end HIVE contra o mockup `HIVE - Telas Projeto Específico.html` encontrou dois gaps reais (não decorativos por decisão deliberada) na tela de Atividades e em Config → Papéis. Este spec cobre a implementação dos dois.

## Gap 1 — Ações em massa de Atividades (`/projetos/:id/atividades`)

### Elegibilidade de seleção

O checkbox de linha só é renderizado para atividades com status `liberado`, `execucao`, `bloqueado` ou `aguardando`. Atividades `concluido` ou `cancelado` não têm checkbox — não há ação em massa que faça sentido sobre elas.

O checkbox "selecionar tudo" do cabeçalho da tabela passa a marcar apenas as atividades elegíveis (das visíveis no filtro atual), não todas as visíveis — hoje ele marcaria linhas que nem têm checkbox próprio.

### Botão "Aprovação em Massa"

- Visível quando 2+ atividades estão selecionadas (regra já existente no código).
- **Desabilitado** (com `title` explicando o motivo) se a seleção incluir qualquer atividade `bloqueado` ou `aguardando` — só pode aprovar em massa atividades `liberado` e/ou `execucao`.
- Ao confirmar, reaproveita o componente `ConcludeActivityModal` existente (evidência obrigatória + observação opcional), com título e subtítulo parametrizáveis para o modo lote:
  - Título: `Aprovar N atividade(s) selecionada(s)`
  - Subtítulo: `Uma única evidência será aplicada a todas as atividades selecionadas do lote.`
- A mesma evidência e observação são aplicadas a todas as atividades selecionadas.
- Após confirmar, a seleção é limpa.

### Botão "Cancelar selecionadas"

- Visível/habilitado sempre que há 1+ atividade selecionada (todo status elegível para seleção já é elegível para cancelamento, então não há condição extra de habilitação).
- Abre um modal de confirmação novo, `CancelActivitiesModal` — sem campo de evidência, apenas texto de confirmação:
  `Tem certeza que deseja cancelar N atividade(s)? O status mudará para Cancelado.`
- Ao confirmar, muda o status das atividades selecionadas para `cancelado`.
- Após confirmar, a seleção é limpa.

### Hook `useActivities`

Dois novos mutators, seguindo o mesmo padrão de `.map()` sem validação própria já usado em `concludeActivity`/`rejectActivity`:

- `bulkConcludeActivities(activityIds: string[], input: ConcludeActivityInput): void` — mesma lógica de `concludeActivity`, aplicada a cada id da lista em um único `setActivities`.
- `cancelActivities(activityIds: string[]): void` — muda `status` para `"cancelado"` para cada id da lista.

### Onde vive o estado

A seleção (`selectedIds`) e a visibilidade dos dois modais em massa continuam vivendo em `ActivitiesTable` (mesmo lugar de hoje). `ProjectActivitiesPage` passa os novos mutators do hook (`bulkConcludeActivities`, `cancelActivities`) e o nome do usuário atual (`CURRENT_USER_NAME`, já existente na página) como novas props para `ActivitiesTable`, que passa a renderizar `ConcludeActivityModal` (modo lote) e `CancelActivitiesModal` internamente.

## Gap 2 — Botão "Salvar matriz" (Config → Papéis)

`ConfigPermissionMatrix` passa a controlar os checkboxes via estado local em vez de `defaultChecked` não controlado. O botão "Salvar matriz" persiste esse estado em memória (sem afetar nenhuma permissão real de fato, já que a matriz "não é aplicada de verdade ainda" por design) e mostra uma confirmação visual, no mesmo padrão de `saved-msg` já usado em `ConfigThresholdsPanel`:

- Ao editar qualquer checkbox, `saved` volta a `false`.
- Ao clicar "Salvar matriz", `saved` vira `true` e aparece `Matriz salva ✓` ao lado do botão.

## Fora de escopo

- Qualquer aplicação real das permissões da matriz (fica só como referência visual, como já documentado no componente).
- Alteração do cálculo de SPI/atrasado para atividades canceladas (comportamento atual de `isOverdue`/stats já trata `cancelado` corretamente, não precisa mudar).
- Mudança de comportamento do botão "Cancelar" ou "Aprovar" individuais na página de detalhe de atividade — este spec cobre só o fluxo em massa a partir da lista.
