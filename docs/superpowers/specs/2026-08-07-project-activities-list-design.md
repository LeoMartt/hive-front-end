# Tela "Atividades" (lista) — Design

Data: 2026-08-07
Épico: Núcleo UAT / primeira tela do subsistema "Projeto Específico" do HIVE
Depende de: [2026-08-06-projects-page-design.md](2026-08-06-projects-page-design.md) (tela "Meus Projetos", já implementada e mergeada em `fabretti_inicial`)
Origem: mockup estático `HIVE - Telas Projeto Específico.html`

## Contexto

O mockup `HIVE - Telas Projeto Específico.html` (~9.200 linhas) define tudo que existe dentro de um projeto específico (`/projetos/:id`), hoje só um placeholder "Em construção". Esse arquivo cobre **6 subsistemas independentes**, cada um grande o suficiente para merecer seu próprio ciclo spec → plano → implementação:

1. Dashboard do projeto (cards, donuts, Curva S)
2. **Atividades** (lista + 4 variantes de tela de detalhe por status) — esta spec cobre só a **lista**
3. Issues (lista + 4 variantes de tela de detalhe por status)
4. Estrutura (árvore WBS, **derivada** dos dados de Atividades — não tem dado próprio)
5. Papel & Config (usuários, matriz de permissões só-visual, limiares/alertas, anexos)
6. Cutover — existe uma página no mockup mas está órfã (sem link no nav dock); o próprio mockup admite que "ainda não há tela de Issues própria do Cutover neste protótipo" — fica fora de escopo por ora

Esta spec cobre exclusivamente a **lista de Atividades** (item 2, só a parte de listagem — não as 4 variantes de detalhe, não o drawer, não seleção em massa, não criação, não import/export). Cada um desses vira uma spec própria depois.

**Nota para o TCC:** o mockup contém dois comentários idênticos (um em HTML, um em JS) documentando por escrito uma decisão consciente do time em 27/07/2026: a RN16 (hoje documentada como "transição automática Aberta→Em análise" de uma Issue) foi implementada como transição **manual** no protótipo, com o texto "PENDENTE: atualizar o texto da RN16 no documento antes da entrega final, validar com o Clerivaldo". Isso já está registrado no `MD - HIVE_TCC_contexto.md` do usuário — não é uma decisão nova, só reconfirmando que a spec de Issues (futura) deve seguir o comportamento manual do mockup.

## Escopo desta entrega

### Roteamento e layout

```
/projetos/:id                    → redirect para /projetos/:id/atividades
/projetos/:id/dashboard          → placeholder "Em construção"
/projetos/:id/atividades         → lista de Atividades (esta spec)
/projetos/:id/atividades/:activityId → placeholder "Em construção" (preparação para a spec de detalhe)
/projetos/:id/estrutura          → placeholder "Em construção"
/projetos/:id/issues             → placeholder "Em construção"
/projetos/:id/config             → placeholder "Em construção"
```

Um layout compartilhado `ProjectLayout` monta o **nav dock** flutuante (Dashboard/Atividades/Estrutura/Issues/Papel & Config, mais um link de volta para "Meus Projetos") no lugar do `FooterWidget` usado na tela "Meus Projetos", envolvendo as rotas acima via `<Outlet />` do React Router. Fora de `/projetos/:id/*`, nada muda — `FooterWidget` continua exatamente como está hoje.

### Modelo de dados

```ts
type ActivityStatus = "aguardando" | "liberado" | "execucao" | "bloqueado" | "concluido" | "cancelado";

interface Activity {
  id: string;                    // "ATV-1043"
  name: string;
  status: ActivityStatus;
  module: string;
  process: string;
  tester: string;
  dev: string;
  plannedStart: string;          // ISO
  plannedEnd: string;            // ISO
  actualStart: string | null;
  actualEnd: string | null;
  predecessors: string[];        // outros ids de Activity
  retestCount: number;
  issueCount: number;            // Issues ainda não existe como subsistema — só a contagem
}
```

Apenas os campos que a lista efetivamente usa. Campos exclusivos de tela de detalhe (WBS, Área, Sistema, Transação, Resultado Esperado, Observações, evidência/observação de aprovação, trilha de auditoria) ficam fora do tipo até a spec da tela de detalhe — evita campos especulativos sem consumidor.

Um hook `useActivities(projectId)` (mesmo padrão de `useProjects`) expõe ~15-20 atividades mockadas cobrindo os 6 status e ao menos 2 módulos/processos — dado suficiente para exercitar filtros, árvore e stats sem replicar as 248 linhas manuscritas do mockup. Preparado para ser trocado por uma chamada de API real depois, sem alterar os componentes consumidores (mesmo contrato de design do `useProjects`).

### Stats e filtros

**Chips de stat** (topo, clicáveis, aplicam filtro de status ao clicar): Total, Concluído, Em execução, Bloqueado, Aguardando, Atrasado (`plannedEnd < hoje` e status fora de `concluido`/`cancelado`).

**Barra de filtros** (todos combináveis em `AND`; dentro de cada filtro multi-seleção, opções combinam em `OR`; botão "Limpar todos" reseta tudo):
- Busca por nome/ID
- Status (checkboxes múltiplos, com contagem por opção)
- Tester (combo pesquisável, múltipla escolha)
- Dev (combo pesquisável, múltipla escolha)
- Período (intervalo de datas sobre "Conclusão planejada")
- Retestes (0×/1×/2×/3+×, múltipla escolha)
- Módulo/Processo (árvore de checkboxes com contagem por nó)
- "Minhas atividades" (toggle — filtra onde o usuário mockado é Tester ou Dev)

### Tabela com agrupamento

Toggle "Agrupar por": **Árvore** (padrão) / **Tester** / **Status**.

- **Árvore**: rollup por Módulo e por Processo (nome, contagem concluído/total, mini barra de progresso), expansível/recolhível por nó; atividades como folhas. Botão "Abrir todos os módulos" expande tudo de uma vez.
- **Por Tester** / **Por Status**: agrupamento único (não aninhado) — um cabeçalho de grupo por Tester (ou por Status) com contagem, atividades listadas embaixo.

Colunas da linha-folha: Nome, ID, Status (badge), Tester, Dev, Início/Conclusão planejada, Início/Conclusão real, Predecessores, Reteste, Issues (contagem). Sem checkbox de seleção nesta leva.

Clicar numa linha de atividade navega para `/projetos/:id/atividades/:activityId` (placeholder "Em construção").

### Fora de escopo (explicitamente adiado para specs futuras)

- As 4 variantes de tela de detalhe de atividade por status, e o drawer de visualização rápida.
- Seleção em massa / aprovação em lote / cancelamento em lote.
- Botão "+ Nova atividade" (criação).
- Importar em massa (Excel) e Exportar.
- Issues, Estrutura (WBS), Dashboard do projeto e Papel & Config como conteúdo real — permanecem placeholders navegáveis via nav dock.
- Cutover (órfão no próprio mockup, sem tela de Issues própria ainda).

## Estilo

Segue exatamente o padrão já estabelecido nas duas specs anteriores: Bootstrap ao máximo (via `react-bootstrap`), com SCSS próprio apenas para o que o Bootstrap não cobre — que aqui inclui o nav dock flutuante (visualmente análogo ao `FooterWidget`, mas com itens de navegação em vez de marca+usuário), os badges de status (6 cores, reaproveitando os tokens já existentes: verde/vermelho/azul/amarelo-escuro/cinza), a árvore de agrupamento (linhas de rollup com mini barra de progresso) e a árvore de checkboxes do filtro Módulo/Processo. Reaproveita a paleta completa e as fontes já configuradas na spec de fidelidade visual.

## Testes

Sem testes automatizados (mesma decisão das specs anteriores). Validação via `npm run dev` e comparação funcional com o mockup: filtros combinados corretamente, alternância de agrupamento, expandir/recolher árvore, chips de stat aplicando filtro, navegação de linha para o placeholder de detalhe, nav dock navegando entre as 5 áreas do projeto e de volta para "Meus Projetos".
