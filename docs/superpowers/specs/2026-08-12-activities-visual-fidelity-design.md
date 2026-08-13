# Fidelidade visual ao mockup — "Atividades" (lista) + nav dock — Design

Data: 2026-08-12
Épico: Núcleo UAT / ajuste visual da tela "Atividades" e do nav dock do subsistema "Projeto Específico"
Depende de: [2026-08-07-project-activities-list-design.md](2026-08-07-project-activities-list-design.md) (spec funcional original desta tela, já implementada e mergeada em `fabretti_inicial`); [2026-08-06-projects-page-visual-fidelity-design.md](2026-08-06-projects-page-visual-fidelity-design.md) (primeira passada de fidelidade visual, mesma decisão de abordagem)
Origem: feedback do usuário após ver a tela "Atividades" rodando — "observe o design novamente, veja que está totalmente diferente do que você me entregou"; mockup estático `HIVE - Telas Projeto Específico.html` (~9.200 linhas, já era a origem citada pela spec funcional original, mas não havia sido lido linha a linha até agora)

## Contexto

A tela "Atividades" e o `ProjectNavDock` foram implementados seguindo uma leitura textual da spec funcional, sem ler o mockup HTML original diretamente. O resultado ficou funcionalmente correto mas visualmente genérico: chips de stat viraram pílulas horizontais Bootstrap simples, o nav dock virou uma barra estática de abas, os filtros usaram o estilo padrão `outline-secondary`, e vários detalhes de estilo do mockup (badges com bolinha, avatares nas colunas Tester/Dev, pílula de reteste colorida, barra de progresso nas linhas de rollup, tag de atraso, migalha de módulo/processo nos agrupamentos planos) não foram replicados.

**Decisão revisada, mesma linha da primeira passada de fidelidade visual:** a camada visual — e, onde a estrutura do mockup exige, a marcação dos componentes — deve ser reescrita para reproduzir o mockup **quase por completo**. Diferente da primeira passada (que foi só SCSS), aqui alguns componentes têm um **padrão de interação estruturalmente diferente** do que foi implementado (nav dock vira botão+painel dropdown em vez de barra de abas; chips de stat mudam de layout; agrupamento vira dropdown único em vez de 3 botões) — nesses casos, a marcação `.tsx` muda junto com o SCSS. Continua usando `react-bootstrap` como base em tudo que sua marcação padrão já se encaixa (Dropdown, Table, Form.Check, Form.Control, Button) — só diverge para SCSS/marcação própria no que o Bootstrap não cobre.

**Duas decisões de escopo confirmadas com o usuário:**
1. **Navegação de volta para "Meus Projetos":** o mockup (recorte isolado da área "Projeto Específico") não mostra esse link. Fica como último item de navegação dentro do próprio painel dropdown do nav dock, reaproveitando o mesmo padrão de lista já existente ali — sem inventar um elemento de UI novo.
2. **Elementos do mockup fora do escopo funcional desta feature** (coluna de checkbox de seleção em massa, ícones de ordenação nas colunas, botões "Exportar atividades" / "Importar em massa" / "+ Nova atividade"): entram **visualmente**, idênticos ao mockup, mas **sem lógica por trás** — sem `onClick`, sem estado React, sem sublinhar/desabilitar visualmente. Ficam prontos para ganhar função quando as specs de seleção em massa, exportação/importação e criação forem escritas. Esta é uma decisão explícita do usuário para esta passada de fidelidade visual — diferente da postura padrão do projeto de não deixar UI sem função, aqui o objetivo é paridade visual exata com o mockup aprovado.

**Escopo explicitamente preservado:** nenhuma lógica de filtro, agrupamento, navegação de linha ou dado mockado muda nesta passada (exceto o comportamento do filtro de Período, ver seção própria, e a leitura do nome do projeto via `useProjects` para o chip "Projeto ativo"). Tudo que já foi validado manualmente na spec funcional original continua válido — esta é uma mudança de apresentação (com alguns ajustes pontuais de marcação), não de comportamento.

## Tokens visuais

Paleta e fontes já extraídas do mesmo mockup na primeira passada de fidelidade visual (`src/styles/_colors.scss`, Google Fonts em `index.html`) — conferidas linha a linha contra o `:root` deste mockup (`HIVE - Telas Projeto Específico.html`) e são **idênticas**. Nenhuma mudança nos tokens globais.

## Logo e marca (global)

O mockup usa um SVG inline de ~10 formas geométricas (abelha estilizada, cores fixas `#1F2024`/`#FFE36E`/branco translúcido) como marca, hoje ausente do app (o `FooterWidget` atual mostra só o texto "HIVE").

- Novo componente `src/components/common/BeeMark.tsx`: renderiza o SVG exato do mockup (`viewBox="0 0 32 32"`), sem props — é um ícone estático. Compartilhado entre dois consumidores (ver abaixo), o que justifica extraí-lo em vez de duplicar o markup.
- `src/components/projects/FooterWidget.tsx`: passa a renderizar `<BeeMark />` antes do bloco de texto "HIVE" / "UAT · Cutover". Nenhuma outra mudança neste componente.

## Nav dock — de barra estática para botão + painel dropdown

Mudança estrutural mais profunda desta passada. `ProjectNavDock` (`src/components/project-nav/ProjectNavDock.tsx`) é reescrito:

- **Gatilho**: reaproveita a mesma forma visual do `FooterWidget` (pílula flutuante, marca+abelha à esquerda, usuário à direita) — mas como um botão que abre/fecha um painel, não mais como link nem como barra de 5 abas sempre visível.
- **Painel** (`react-bootstrap` `Dropdown` — `Dropdown.Toggle` customizado envolvendo o gatilho acima, `Dropdown.Menu` como o painel): mesma técnica já usada nos filtros da barra de Atividades, evita reimplementar clique-fora manualmente.
  - Rótulo de grupo "Workspace": itens **Dashboard**, **Atividades**, **Estrutura**, **Issues** — cada um com o ícone SVG do mockup (linha, `stroke-width 2`, `24×24`) e estado ativo (fundo amarelo-soft, texto amarelo-escuro) via `NavLink`'s `isActive`, mesma técnica já usada.
  - Rótulo de grupo "Administração": item **Papel & Config**, seguido — dentro do mesmo grupo, sem rótulo próprio — do item **Meus Projetos** (`<NavLink to="/projetos">`, ícone de seta para trás), decisão confirmada com o usuário.
  - Rodapé do painel: chip "Projeto ativo" (`.project-pill` no mockup) mostrando um indicador de status (bolinha verde) e o **nome do projeto atual**. Como `ProjectLayout`/`ProjectNavDock` hoje só têm o `id` da rota (via `useParams`), `ProjectNavDock` passa a chamar `useProjects()` (mesmo hook que já alimenta `ProjectsPage`) e localizar o projeto pelo `id` para exibir seu `name`. Se por algum motivo o `id` não bater com nenhum projeto do mock (não deve acontecer em uso normal), cai para mostrar o próprio `id` como texto — sem lançar erro nem quebrar a renderização.
- `src/styles/_project-nav-dock.scss` é reescrito para o novo shape (gatilho idêntico ao `.footer-widget`, painel com sombra e cantos 16px, itens de nav com ícone+hover+ativo, divisor + rodapé do chip de projeto) — tokens de cor iguais aos já usados no resto do app.

## Chips de estatística — de pílula horizontal para mini-card vertical

`ActivityStatChips` (`src/components/activities/ActivityStatChips.tsx`) muda de marcação: cada chip vira uma coluna pequena (`.stat-chip`) com o valor em destaque no topo (mono, 16px, 800, cor por status — vermelho para Bloqueado/Atrasado, amarelo-escuro para Em execução, verde para Concluído, cor padrão para Total/Aguardando) e o rótulo pequeno abaixo (uppercase, 9.5px, `text-faint`). Mesmo comportamento de clique (`onSelect`), mesmo cálculo de `activeChip` já existente na página — só a forma visual do chip muda.

## Barra de filtros — botões-pílula com chevron e estado "tem valor"

Continuam usando os mesmos componentes `react-bootstrap` já existentes (`MultiSelectFilter`, `ActivityModuleProcessFilter`, `ActivityDateRangeFilter`, `Dropdown`, `Form.Control`) — a mudança é de estilo do botão-gatilho:
- Forma pílula (8px de raio, como no mockup — não totalmente arredondada), ícone de chevron (▾) à direita do rótulo.
- Estado "tem valor" (algum filtro daquele dropdown está ativo): borda e fundo mudam para os tons de amarelo (`$yellow-deep`/`$yellow-soft`), texto principal. Sem filtro ativo: borda `$border-strong`, texto `$text-dim`, fundo `$surface` — igual ao mockup.
- Contagem por opção dentro do painel já existe (`(N)` depois do rótulo) — mantida como está, só o botão-gatilho externo muda de estilo.
- **Filtro de Período** ganha o comportamento do mockup: um switch "Usar período customizado" acima dos dois campos de data; os campos `De`/`Até` ficam desabilitados (e o filtro efetivamente inativo, mostrando todas as datas) até o switch ser ligado. Isso é uma mudança pequena de comportamento (não só visual) no `ActivityDateRangeFilter` — precisa de um novo pedaço de estado (`dateRangeEnabled`) na página, já que `ActivityFiltersState.plannedEndFrom`/`plannedEndTo` continuam sendo os campos que efetivamente filtram; quando o switch está desligado, a página garante que ambos fiquem `null` independentemente do que estiver digitado nos campos desabilitados.
- "Limpar todos" muda de botão (`outline-secondary`) para texto sublinhado (`.filters-clear-all` no mockup — sem borda, cor `text-dim`, fica vermelho no hover). Mesmo comportamento de clique e mesma condição de exibição (só aparece com algum filtro ativo).

## Barra de ferramentas 2 — agrupamento e "Minhas atividades"

- `ActivityGroupToggle` (`src/components/activities/ActivityGroupToggle.tsx`) deixa de ser um grupo de 3 botões e vira um único `Dropdown` "Agrupar: {rótulo do modo atual} ▾", com as 3 opções (Árvore/Tester/Status) como `Form.Check type="radio"` dentro do painel — mesmo `ActivityGroupMode` como tipo, mesma prop `onChange`, só a forma de seleção muda.
- "Minhas atividades" ganha um contêiner `.toggle-pill` (pílula com borda, que fica com borda/fundo amarelo quando ativa) envolvendo o `Form.Check type="switch"` já existente — hoje o switch fica solto sem esse invólucro.

## Elementos fora de escopo funcional — incluídos visualmente, sem função

Decisão explícita do usuário (ver Contexto): os elementos abaixo aparecem exatamente como no mockup, mas sem `onClick`, sem estado, sem qualquer lógica associada — cliques neles não fazem nada:

- Coluna de checkbox no início da tabela: `<th>` com checkbox "selecionar todas" + um `<td><input type="checkbox"></td>` por linha — inputs não controlados, sem handler.
- Ícone "↕" (`.sort-ic`) depois do rótulo nas colunas ordenáveis do mockup: Nome, Status, Início plan., Conclusão plan., Reteste — decorativo, sem handler de clique no `<th>`.
- Três botões no cabeçalho da página (`ProjectActivitiesPage`, ao lado do título "Atividades"): "Exportar atividades" (outline, com ícone de download), "Importar em massa" (outline), "+ Nova atividade" (`btn-primary`, mesmo amarelo já usado em outros CTAs do app) — todos sem `onClick`.

## Tabela — estrutura de colunas, badges, avatares, reteste, atraso, rollup

**Mudança estrutural de colunas** (bate com o mockup, não é só estilo): as colunas "Planejado" e "Real" (hoje cada uma combinando início→fim numa única célula com seta) viram **4 colunas separadas** — Início plan., Conclusão plan., Início real, Conclusão real — e a coluna "Nome" deixa de embutir o ID como segunda linha, ganhando uma coluna "ID" própria ao lado. A coluna "Predecessores" é renomeada para "Predec." no cabeçalho (mesma abreviação do mockup). O total passa de 9 para **13 colunas**: checkbox (decorativa, seção anterior), Nome, ID, Status, Tester, Dev, Início plan., Conclusão plan., Início real, Conclusão real, Predec., Reteste, Issues — o `colSpan` das linhas de rollup em `ActivityTreeRows`/`ActivityGroupRows` muda de 9 para 13. O mockup usa uma 14ª coluna (`<th style="width:26px">`) só para o ícone de árvore (▸/▾) separado do nome — esta passada **mantém o ícone de árvore embutido na própria célula "Nome"** (como já é hoje), sem criar essa coluna extra, para não duplicar o que a marcação atual já resolve bem; é a única divergência deliberada da contagem de colunas do mockup.

Ajustes de estilo dentro das células:
- **Badge de status**: pílula com raio total (hoje 5px, vira 20px) e uma bolinha colorida (`<i>`, 6px, cor do status) antes do texto.
- **Tester / Dev**: cada nome ganha um avatar circular pequeno com iniciais antes do nome (mesmo padrão visual do `avatar-circle`/`avatar-mini` já usado em `TeamAvatars` na tela Projetos, cores/tamanho ajustados ao token `avatar-mini` do mockup — 20px, fundo `$surface-2`, texto mono).
- **Reteste**: pílula colorida em vez de número solto — cinza (`$surface-2`) para 0, amarelo-soft/amarelo-escuro para 1–2, vermelho-soft/vermelho negrito para 3+.
- **Atraso**: a linha inteira ganha uma borda esquerda vermelha (`box-shadow: inset 3px 0 0 $red`), a data de conclusão planejada fica vermelha e em negrito, e a tag "Atrasado" muda do badge Bootstrap atual (`.badge.bg-danger`) para uma pílula no estilo `.overdue-tag` do mockup (fundo vermelho-soft, texto vermelho, 20px de raio).
- **Linhas de rollup** (cabeçalhos de Módulo/Processo no modo Árvore): ganham uma mini barra de progresso (`.mini-progress`, 6px de altura, trilho `$surface-2`, preenchimento verde proporcional a concluído/total) ao lado do texto "X/Y concluídas" já existente.
- **Migalha nos agrupamentos planos** (Tester/Status): como esses modos perdem a hierarquia visual de Módulo/Processo, cada linha ganha uma segunda linha pequena e discreta abaixo do nome mostrando "Módulo › Processo" (`.flat-breadcrumb` no mockup) — só aparece nesses dois modos, não no modo Árvore (onde a hierarquia já está nas linhas de rollup acima).
- **Indentação das linhas-folha no modo Árvore**: a célula "Nome" ganha um `padding-left` progressivo (mockup usa 34px para uma folha dentro de Módulo›Processo) para reforçar visualmente o aninhamento sob as linhas de rollup — hoje as linhas-folha não têm nenhuma indentação própria.

## Arquivos afetados

```
src/components/common/BeeMark.tsx                    # novo
src/components/projects/FooterWidget.tsx              # modificado — usa BeeMark
src/components/project-nav/ProjectNavDock.tsx          # reescrito — botão+painel dropdown
src/styles/_project-nav-dock.scss                      # reescrito
src/components/activities/ActivityStatChips.tsx        # modificado — mini-card vertical
src/components/activities/ActivityFiltersBar.tsx       # modificado — estilo dos gatilhos, "Limpar todos"
src/components/activities/MultiSelectFilter.tsx        # modificado — estilo do gatilho (pílula+chevron+has-value)
src/components/activities/ActivityModuleProcessFilter.tsx  # modificado — estilo do gatilho
src/components/activities/ActivityDateRangeFilter.tsx  # modificado — switch de período customizado
src/components/activities/ActivityGroupToggle.tsx      # reescrito — dropdown único em vez de 3 botões
src/components/activities/ActivityRow.tsx               # modificado — colunas separadas, badges, avatares, reteste, atraso
src/components/activities/ActivityTreeRows.tsx          # modificado — colSpan, mini-progress no rollup
src/components/activities/ActivityGroupRows.tsx         # modificado — colSpan, migalha módulo/processo
src/components/activities/ActivitiesTable.tsx           # modificado — novo cabeçalho de colunas (checkbox, ID, sort icons, 4 colunas de data)
src/pages/ProjectActivitiesPage.tsx                     # modificado — botões decorativos no cabeçalho, estado do switch de período
src/hooks/useActivities.ts                              # sem mudança
src/types/activity.ts                                   # sem mudança
src/utils/*.ts                                          # sem mudança de lógica (ver "Casos-limite" sobre o filtro de período)
src/styles/_activities.scss                             # bastante estendido (badges, avatares, reteste, atraso, rollup, migalha, chips, filtros)
```

## Casos-limite e riscos

- **Filtro de Período**: a mudança de "sempre editável" para "switch liga/desliga" é a única mudança de comportamento funcional desta passada (o resto é puramente visual/estrutural de marcação). Ao desligar o switch depois de ter datas preenchidas, a página zera `plannedEndFrom`/`plannedEndTo` para `null` — não deixa os campos desabilitados "lembrando" um filtro que não está mais sendo aplicado.
- **Chip "Projeto ativo"**: depende de `useProjects()` estar disponível a partir de `ProjectNavDock`, que hoje só é renderizado dentro de `ProjectLayout` (sempre dentro de `/projetos/:id/*`) — o hook já é seguro de chamar em qualquer render, sem pré-requisito de contexto adicional.
- **Elementos decorativos sem função**: por serem clicáveis sem fazer nada, existe risco de o usuário final (não o desenvolvedor) tentar usá-los e não entender por que nada acontece. Este risco foi levantado e aceito explicitamente pelo usuário como uma escolha desta passada — o valor de fidelidade visual com o mockup aprovado (contexto de TCC) supera, aqui, a preocupação usual do projeto com "UI morta". Não é necessário nenhum indicador visual de "em breve" nesses elementos.
- **Colunas novas (checkbox, ID, ↕, 4 datas)**: aumentam a largura mínima da tabela — `ActivitiesTable` já usa `Table responsive` (scroll horizontal), então não há necessidade de tratamento adicional além do que já existe.
- **Regressão funcional**: como a lógica de filtro/agrupamento/navegação de linha não muda (fora o switch de período), o comportamento já validado manualmente na spec funcional original permanece garantido — só a validação visual (QA manual) e o novo switch de período precisam ser refeitos/testados.

## Testes

Sem testes automatizados (mesma decisão de todas as specs anteriores). Validação via `npm run dev` e comparação visual lado a lado com o mockup `HIVE - Telas Projeto Específico.html` (seção `#page-atividades`), cobrindo: logo no `FooterWidget` e no gatilho do nav dock, painel do nav dock abrindo/fechando/navegando (incluindo "Meus Projetos" como último item e o chip "Projeto ativo" com o nome correto), chips de stat no novo layout, cada filtro com o novo estilo de gatilho (incluindo o switch de período), o dropdown único de agrupamento, os 3 elementos decorativos fora de escopo aparecendo e não fazendo nada ao clicar, e a tabela com as novas colunas/badges/avatares/pílulas/mini-progresso/migalha nos 3 modos de agrupamento.

## Fora de escopo

- Qualquer funcionalidade real por trás dos elementos decorativos (seleção em massa, ordenação de colunas, exportar, importar, criar atividade) — só a aparência entra agora.
- As 4 variantes de tela de detalhe de atividade, o drawer de visualização rápida, Issues/Estrutura/Dashboard/Papel & Config como conteúdo real, Cutover — mesma decisão da spec funcional original, continuam como placeholders.
- Suporte a modo escuro (não existe no mockup original, mesma decisão da primeira passada de fidelidade visual).
- Qualquer mudança na estrutura de dados (`Activity`, `ActivityStats`, `ActivityFiltersState`) além do estado local de UI necessário para o switch de período.
