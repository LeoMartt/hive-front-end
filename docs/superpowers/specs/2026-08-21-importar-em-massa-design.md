# Importar em massa (modal) — Design

Data: 2026-08-21
Épico: Núcleo UAT / subsistema "Ações e fluxos de trabalho" de `/projetos/:id` — 3º de 6 ciclos combinados nesta sessão (Exportar ✅ → Nova Atividade ✅ → **Importar em massa** → Registrar Issue → Ações de status da Issue → Ações de status da Atividade)
Depende de: [2026-08-21-nova-atividade-design.md](2026-08-21-nova-atividade-design.md) (`NewActivityInput`, `createActivity`, decisão de Módulo/Processo como texto livre e Tester/Dev vindos de `Project.team`), [2026-08-21-export-atividades-issues-design.md](2026-08-21-export-atividades-issues-design.md) (dependência `xlsx` já instalada)
Origem: protótipo funcional `HIVE - Telas Projeto Específico.html` (`modalImportar`, `openImportarBtn`, `baixarModeloBtn`, `processImportRows`)

## Contexto

O botão "Importar em massa" em `ProjectActivitiesPage` é hoje decorativo. O protótipo faz upload de `.xlsx`, resolve Módulo/Processo contra um mapa fixo (criando automaticamente módulo/processo novos quando não reconhecidos) e Tester/Dev contra mapas de iniciais fixos. Como a spec de Nova Atividade já decidiu que Módulo/Processo são texto livre (sem taxonomia central) e Tester/Dev vêm de `Project.team`, esta importação herda as duas decisões: não existe "criar módulo automaticamente" (não há taxonomia pra alimentar), e Tester/Dev da planilha precisam bater com um nome do time do projeto — confirmado com o usuário, mesma validação estrita que rejeitaria um nome desconhecido.

Esta é a primeira funcionalidade do projeto inteiro que faz *parsing* de um arquivo enviado pelo usuário (o Exportar, que já usa `xlsx`, só escreve). As vulnerabilidades conhecidas do pacote `xlsx@0.18.5` são todas do caminho de leitura — dado que este é um projeto de uso interno/acadêmico sem exposição pública, o risco residual é aceitável, mas a spec inclui guardas básicas (extensão e tamanho do arquivo) que o protótipo não tinha, por serem baratas.

## Escopo desta entrega

Nenhuma rota muda. Fluxo: clicar "Importar em massa" → modal abre → "Baixar modelo (.xlsx)" (opcional) → selecionar/arrastar um `.xlsx` → "Importar atividades" → parse + validação linha a linha → banner de resultado dentro do próprio modal (o modal **não fecha sozinho** — o usuário revisa o resultado e fecha manualmente).

### `src/utils/activityImport.ts` (novo)

```ts
export interface ActivityImportResult {
  valid: NewActivityInput[];
  errors: string[];
}

export function parseActivityImportRows(rows: Record<string, unknown>[], team: TeamMember[]): ActivityImportResult
export function downloadActivityImportTemplate(): void
```

**`parseActivityImportRows`**: uma linha por item de `rows` (já vem de `XLSX.utils.sheet_to_json(sheet, { defval: "" })`, chamado pelo modal). Aceita variações de cabeçalho com/sem acento (`Módulo`/`Modulo`, `Início Planejado`/`Inicio Planejado`, `Conclusão Planejada`/`Conclusao Planejada`, `Área`/`Area`, `Transação`/`Transacao`, `Observações`/`Observacoes`, `Desenvolvedor`/`Dev`) — mesma tolerância do protótipo.

Por linha, valida:

| Campo | Regra | Mensagem de erro se falhar |
|---|---|---|
| Nome | obrigatório | `nome vazio` |
| Módulo | obrigatório, texto livre | `módulo vazio` |
| Processo | obrigatório, texto livre | `processo vazio` |
| Tester | obrigatório, precisa bater (case-insensitive) com o `name` de algum membro de `team` com `role === "Tester"` | `` tester "X" não reconhecido `` |
| Desenvolvedor | obrigatório, mesma lógica com `role === "Desenvolvedor"` | `` desenvolvedor "X" não reconhecido `` |
| Início Planejado | obrigatório; aceita `Date` real (célula formatada como data no Excel) ou texto `DD/MM/AAAA` | `início planejado inválido` |
| Conclusão Planejada | mesma regra | `conclusão planejada inválida` |
| Predecessores, WBS, Área, Sistema, Transação, Resultado Esperado, Observações | opcionais, texto livre — mesmo tratamento da Nova Atividade (Predecessores splitado por `;`, sem validar existência) | — |

Datas convertidas com a mesma técnica anti-bug-de-fuso da Nova Atividade (`new Date(year, month-1, day)` local, nunca `new Date(string)`), reaproveitando `toLocalIsoString`. Linhas com pelo menos um problema não entram em `valid` — viram uma entrada em `errors` no formato `` `Linha ${n}: ${problemas.join("; ")}.` `` (`n` = índice da linha na planilha, contando o cabeçalho). Uma planilha com 10 linhas e 2 problemáticas importa as 8 boas.

**`downloadActivityImportTemplate`**: gera um `.xlsx` (`XLSX.utils.aoa_to_sheet`, não `json_to_sheet` — é cabeçalho + 1 linha de exemplo, não uma lista de registros) com as mesmas 14 colunas da tabela acima (nomes de cabeçalho iguais ao "canônico" de cada campo) e baixa como `hive_modelo_importacao_atividades.xlsx`, mesmo padrão de `downloadXlsx.ts` (sem reaproveitá-lo diretamente — API do SheetJS é outra, `aoa_to_sheet` em vez de `json_to_sheet`). Os valores de exemplo de Tester/Dev são ilustrativos (não correspondem a nenhum time real específico, já que o modelo é genérico entre projetos) — o usuário substitui pelos nomes reais do time do projeto dele.

### `src/components/activities/ImportActivitiesModal.tsx` (novo)

```ts
interface ImportActivitiesModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
  onImport: (inputs: NewActivityInput[]) => void;
}
```

Estrutura (de cima pra baixo, mesma ordem do protótipo):
1. Título + subtítulo (`.modal-subtitle`, já existe desde a Nova Atividade)
2. Botão "Baixar modelo (.xlsx)" → `downloadActivityImportTemplate()`
3. `<details>` colapsável "Ver descrição dos campos da carga" com a tabela de campos acima em texto
4. Dropzone (clique ou arraste) — só aceita 1 arquivo por vez, sem seleção múltipla
5. Banner de resultado (`.import-result-banner`, escondido até a primeira tentativa)
6. Botão "Importar atividades" — desabilitado até um arquivo válido estar selecionado

**Guardas no dropzone**, antes mesmo de tentar ler o conteúdo: extensão precisa ser `.xlsx` ou `.xls` (senão mostra o banner de erro sem tentar `XLSX.read`); tamanho máximo 5MB (mesmo tratamento). Essas duas guardas não existem no protótipo — adicionadas porque este é o primeiro fluxo do app que faz parsing de arquivo externo.

**Leitura do arquivo**: `await file.arrayBuffer()` (API moderna, em vez do `FileReader` baseado em callback do protótipo) → `XLSX.read(buffer, { type: "array", cellDates: true })` → `XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" })` → `parseActivityImportRows(rows, team)`. Tudo dentro de um `try/catch`: falha de parsing (arquivo corrompido/não é `.xlsx` de verdade apesar da extensão) cai no mesmo banner de erro genérico do protótipo — `"Não foi possível ler o arquivo. Confirme se é um .xlsx válido, seguindo o modelo."`

**Resultado**: se `valid.length > 0`, chama `onImport(valid)` uma única vez (o `ProjectActivitiesPage` decide como aplicar — ver wiring abaixo). Banner mostra `"{N} atividade(s) importada(s) com sucesso."`; se `errors.length > 0`, o banner fica na variante de erro (vermelha) mesmo que algumas linhas tenham entrado, listando cada erro — mesma regra do protótipo ("qualquer erro tira o verde"); só fica verde se `errors.length === 0`. O modal **não fecha automaticamente** em nenhum caso — o dropzone reseta (permitindo importar outro arquivo na mesma sessão do modal) mas o banner de resultado permanece visível até o usuário fechar o modal manualmente.

### `src/pages/ProjectActivitiesPage.tsx` (modificado)

Estado local `showImportModal` (`useState(false)`), botão "Importar em massa" (hoje sem `onClick`) abre o modal. `<ImportActivitiesModal>` renderizado com `team={currentProject?.team ?? []}` (mesma fonte já usada pela Nova Atividade) e:

```ts
function handleImportActivities(inputs: NewActivityInput[]) {
  inputs.forEach((input) => createActivity(input));
}
```

**Por que não precisa de mutator novo em `useActivities.ts`:** `createActivity` já usa `setActivities(prev => ...)` com a forma funcional do `setState`. Chamadas sucessivas dentro do mesmo handler de evento são processadas pelo React em fila, cada uma vendo o resultado da anterior — então `N` chamadas sequenciais geram `N` IDs únicos e sequenciais (`ATV-XXXX`, `ATV-XXXX+1`, ...) sem nenhuma mudança no hook. Simplifica a entrega: nenhum arquivo já shippado (`useActivities.ts`) precisa ser tocado de novo.

### Estilo (`src/styles/_modal.scss`, modificado)

Três blocos novos — nenhum existia antes desta spec, é a primeira dropzone/upload real do projeto:

```scss
.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 16px;
  border: 1.5px dashed c.$border-strong;
  border-radius: 10px;
  color: c.$text-faint;
  font-size: 12px;
  text-align: center;
  cursor: pointer;
  background-color: c.$bg-alt;
}
.dropzone svg {
  width: 22px;
  height: 22px;
}
.dropzone.drag-over {
  border-color: c.$text-dim;
  background-color: c.$surface;
}
.dropzone.has-file {
  color: c.$text-dim;
  border-style: solid;
}

.import-ref {
  margin-bottom: 14px;
  font-size: 11.5px;
}
.import-ref summary {
  cursor: pointer;
  color: c.$text-dim;
  font-weight: 600;
}
.import-ref-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: c.$text-faint;
}
.import-ref-list b {
  color: c.$text-dim;
}

.import-result-banner {
  display: none;
  background-color: c.$red-soft;
  color: c.$red;
  border: 1px solid rgba(198, 55, 63, 0.25);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 12px;
  margin-bottom: 14px;
}
.import-result-banner.show {
  display: block;
}
.import-result-banner.success {
  background-color: c.$green-soft;
  color: c.$green;
  border-color: rgba(47, 143, 91, 0.25);
}
.import-result-banner ul {
  margin: 4px 0 0;
  padding-left: 18px;
}
```

(`$green`/`$green-soft`/`$red`/`$red-soft` já existem em `_colors.scss` — usados aqui pela primeira vez fora de `StatCard`/`.error-banner`.)

## Fora de escopo

- Destaque visual ("piscar") e scroll automático até as linhas recém-importadas na tabela por trás do modal — decisão confirmada com o usuário; o resultado fica só no banner do modal.
- Auto-criação de módulo/processo como conceito de taxonomia — não existe mais desde a decisão de texto livre da Nova Atividade.
- Suporte a `.csv` ou outro formato além de `.xlsx`/`.xls`.
- Seleção múltipla de arquivos.
- Qualquer validação de conteúdo além da guarda de extensão/tamanho antes do parse (ex.: escanear malware) — fora do alcance de uma aplicação client-side sem backend.

## Testes

Sem suíte automatizada (convenção do projeto). Validação via `npm run dev` + QA manual: baixar o modelo, preencher com 3 linhas válidas (Tester/Dev batendo com nomes reais do time do projeto) e importar — banner verde "3 atividade(s) importada(s) com sucesso.", as 3 aparecem na lista; editar a planilha pra ter 1 linha com Tester desconhecido e reimportar — banner (vermelho) mostra "2 atividade(s) importada(s)" + 1 erro de linha nomeando o tester não reconhecido, as 2 boas ainda entram; tentar importar um arquivo `.txt` renomeado pra `.xlsx` — banner de erro genérico, nada é criado; tentar importar um arquivo `.docx` de verdade — bloqueado pela guarda de extensão antes de tentar ler; conferir que os IDs gerados em lote são sequenciais e não colidem com atividades já existentes; conferir que uma linha com data em formato texto (`02/07/2026`) e outra com célula de data real do Excel resultam na mesma data no detalhe da atividade, sem deslocar um dia.
