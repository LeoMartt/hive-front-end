# Fidelidade visual ao mockup — "Meus Projetos" — Design

Data: 2026-08-06
Épico: Fundação / ajuste visual da primeira tela real do HIVE
Depende de: [2026-08-06-projects-page-design.md](2026-08-06-projects-page-design.md) (spec original desta tela, já implementada e mergeada em `fabretti_inicial`)
Origem: feedback do usuário após ver a tela implementada rodando — "não tem como o design ficar mais fiel ao que te mandei?"

## Contexto

A tela "Meus Projetos" foi implementada seguindo a decisão original de "adaptar para componentes Bootstrap padrão" (ver spec original, seção "Decisões de escopo"). Ao ver a tela rodando, o usuário considerou o resultado visualmente genérico demais frente ao mockup HTML original (`HIVE - Tela Inicial - Projetos.html`), que tem identidade visual própria: paleta de cores específica, tipografia (JetBrains Mono + Inter), fundo de favo de mel sutil, cantos e proporções mais densas/quadradas.

**Decisão revisada:** em vez de adaptar para o visual padrão do Bootstrap, a camada visual deve ser reescrita para reproduzir o mockup **quase por completo**, via SCSS que sobrescreve as classes que o Bootstrap já gera (`.card`, `.btn`, `.btn-primary`, `.nav-pills .nav-link`, `.form-control`, `.progress`, `.table`, `.badge`, `.modal-content` etc.) com os tokens visuais exatos do mockup.

**Escopo explicitamente preservado:** nenhum componente `.tsx` é modificado nesta passada — apenas arquivos `.scss` (novos ou existentes) e o `<head>`/import de fontes. Toda a lógica, estrutura de dados, comportamento e testes manuais já validados na spec original continuam válidos; esta é uma mudança puramente de apresentação, de baixo risco de regressão funcional.

## Tokens visuais

Paleta completa extraída do `:root` do mockup (substituindo a paleta reduzida de 4 cores usada na primeira passada):

```scss
// cores neutras
$bg: #f2f2f0;
$bg-alt: #fafaf9;
$surface: #ffffff;
$surface-2: #eaeae7;
$border: #dadbd7;
$border-strong: #b9bcc1;
$text: #1f2024;
$text-dim: #5a5d63;
$text-faint: #8e9096;

// acento de marca
$yellow: #ffe36e;
$yellow-strong: #ffd23f;
$yellow-deep: #8a6d00;
$yellow-soft: rgba(255, 227, 110, 0.4);

// status
$red: #c6373f;
$red-soft: rgba(198, 55, 63, 0.1);
$orange: #c9722e;
$orange-soft: rgba(201, 114, 46, 0.12);
$green: #2f8f5b;
$green-soft: rgba(47, 143, 91, 0.1);
$blue: #3b5fc4;
$blue-soft: rgba(59, 95, 196, 0.1);

$radius: 10px;
$font-mono: "JetBrains Mono", monospace;
$font-sans: "Inter", sans-serif;
```

Fontes carregadas via `<link>` do Google Fonts em `index.html` (mesmas famílias/pesos do mockup: JetBrains Mono 400/500/600/700/800, Inter 400/500/600/700/800), substituindo a dependência da fonte padrão do sistema/Bootstrap.

## Fundo e tipografia globais

- `body` usa `$bg` como cor de fundo e `$font-sans` como fonte padrão (via override de `$font-family-sans-serif`/estilo global, não via classes Bootstrap).
- Pseudo-elemento `body::before` fixo reproduz o padrão de favo de mel em SVG do mockup (mesmo data-URI, com blur sutil), atrás de todo o conteúdo.

## Mapeamento componente a componente

Todos os ajustes abaixo são feitos via seletores CSS mirados nas classes que o Bootstrap/react-bootstrap já gera — nenhuma classe nova precisa ser adicionada nos componentes React:

- **Botões (`.btn`, `.btn-primary`, `.btn-outline-secondary`)**: raio 8px, borda `$border-strong`; `.btn-primary` usa `$yellow`/`$yellow-strong` (não a cor primária padrão do Bootstrap) com texto `$text`.
- **Cards de estatística (`.card`)**: fundo `$surface`, borda `$border`, raio `$radius`; dentro, label uppercase 11px/700 em `$text-faint`, valor em `$font-mono` 30px/700, sub-label 12px em `$text-dim`.
- **Abas (`.nav-pills`, `.nav-link`)**: trilho `$surface-2` arredondado com padding, aba ativa em `$surface` com sombra sutil (`0 1px 2px rgba(31,32,36,.08)`) em vez do preenchimento sólido padrão do Bootstrap.
- **Busca (`.form-control` do campo de busca)**: fundo `$surface`, borda `$border-strong`, raio 8px, fonte 12.5px.
- **Tabela (`.table`, `thead th`, `tbody tr:hover`)**: cabeçalho uppercase 10.5px/700 em `$text-faint` sobre `$bg-alt`; linhas com hover em `$bg-alt`; célula com padding 14px/16px.
- **Badge de modo (`.badge`)**: pílula pequena em `$font-mono` 9.5px/800 uppercase; UAT usa `$blue-soft`/`$blue`, Cutover usa `$yellow-soft`/`$yellow-deep` (substituindo as variantes `info`/`warning` padrão do Bootstrap).
- **Barra de progresso (`.progress`, `.progress-bar`)**: trilho 6px em `$surface-2`, preenchimento colorido por status (verde/vermelho/azul), sem o gradiente/listras padrão do Bootstrap.
- **Valor de SPI (`.spi-value-*`)**: já usa classes próprias da spec original — recebe os tokens de cor corretos (`$green`/`$yellow-deep`/`$red`) em `$font-mono` 14px/700.
- **Avatares de equipe (`.avatar-circle`)**: já customizado na spec original — ajusta cor/tamanho para os tokens corretos (fundo `$surface-2`, texto `$text-dim`, `$font-mono`).
- **Rodapé flutuante (`.footer-widget`)**: já customizado — recebe os tokens de cor corretos em vez de `var(--bs-*)`.
- **Modais (`.modal-content`)**: cantos 12px, sombra `0 24px 60px rgba(31,32,36,.28)`; inputs (`.form-control`, `.form-select`) com fundo `$bg-alt`, borda `$border-strong`, raio 8px; toggle de modo UAT/Cutover no "Novo projeto" ganha o estilo de cartão selecionado do mockup (borda + fundo "soft" da cor do modo) em vez de botões sólidos `btn-primary`/`btn-outline-secondary`.
- **Estado vazio (`EmptyState`)**: ícone com fundo `$yellow-soft`, textos nos tons `$text`/`$text-faint` corretos.

## Arquivos afetados

```
index.html                       # modificado — link para Google Fonts
src/styles/_colors.scss          # reescrito — paleta completa (acima)
src/styles/_ui-extras.scss       # modificado — tokens corretos nas classes já existentes
src/styles/_footer-widget.scss   # modificado — tokens corretos
src/styles/_bootstrap-overrides.scss  # novo — overrides de .card, .btn, .nav-pills, .form-control,
                                       #        .table, .badge, .progress, .modal-content
src/styles/_background.scss      # novo — fundo de favo de mel + tipografia global do body
src/styles/main.scss             # modificado — passa a @use os novos parciais
```

Nenhum arquivo `.tsx` é criado, removido ou modificado.

## Casos-limite e riscos

- **Modo escuro:** a spec original usava variáveis do Bootstrap (`var(--bs-*)`) que se adaptam automaticamente a dark mode; os tokens fixos do mockup (extraídos de um design só-claro) não têm essa adaptação. Como o mockup em si não define modo escuro, esta passada também não implementa — fica como trabalho futuro se o HIVE decidir suportar dark mode.
- **Regressão funcional:** como nenhum `.tsx` muda, o comportamento (filtros, busca, modais, criação de projeto, navegação) já validado na spec original permanece garantidamente intacto — só a validação visual (QA manual) precisa ser refeita.

## Testes

Sem testes automatizados (mesma decisão da spec original). Validação via `npm run dev` e comparação visual lado a lado com o mockup HTML original, cobrindo: cards de estatística, abas, busca, tabela (linha normal e badge UAT/Cutover), modal de equipe, modal de novo projeto (incluindo o toggle de modo), estado vazio, rodapé flutuante, fundo de favo de mel.

## Fora de escopo

- Suporte a modo escuro (não existe no mockup original).
- Qualquer mudança de comportamento, estrutura de dados ou lógica dos componentes.
- Réplica de elementos que a spec original já decidiu não replicar por serem puramente decorativos e não fazerem parte deste fluxo (ex.: ícone SVG da abelha na marca — mantém-se o texto "HIVE" já usado).
