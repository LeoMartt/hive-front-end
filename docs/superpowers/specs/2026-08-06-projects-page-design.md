# Tela "Meus Projetos" (Dashboard inicial) — Design

Data: 2026-08-06
Épico: Fundação / primeira tela real do HIVE (front-end)
Origem: mockup estático `HIVE - Tela Inicial - Projetos.html`

## Contexto

O repositório `hive-front-end` é um scaffold Vite + React + TypeScript + Bootstrap recém-criado, com todas as pastas de `src/` vazias. O README já define convenções: Bootstrap como base visual, sem CSS inline, SCSS quando o Bootstrap não bastar, React Router para navegação, Zod para validação, Axios para API, `export default function` em páginas/componentes.

Existe um mockup HTML estático e autocontido (`HIVE - Tela Inicial - Projetos.html`) já validado visualmente, que serve de referência funcional e de conteúdo para esta primeira tela real. O backend (Django/DRF) e a autenticação via Azure AD ainda não existem — são épicos futuros.

Esta spec cobre a implementação real (React) da tela de listagem de projetos ("Meus Projetos" / Dashboard), a primeira tela funcional do sistema.

## Decisões de escopo

- **Fidelidade visual ao mockup:** Bootstrap é usado ao máximo (via `react-bootstrap`) para tudo que ele resolve bem: cards, table, badge, modal, nav, progress bar, form. Paleta de cores customizada é preservada via SCSS. Peças que o Bootstrap padrão não reproduz — como a barra flutuante em formato de pílula (marca + usuário, `.footer-widget` do mockup) — ganham um SCSS específico próprio (ex. `styles/_footer-widget.scss`), mantendo o visual daquele elemento. Elementos puramente decorativos e não estruturais do mockup (fundo de favo de mel) não são replicados.
- **Origem dos dados:** mock local tipado em TypeScript, acessado por um hook (`useProjects`) com uma interface já pronta para ser trocada por chamadas Axios reais futuramente, sem alterar os componentes consumidores.
- **Simulador de persona:** removido. A tela assume um usuário fixo mockado (Gestor de Projetos, com projetos), sem seletor de simulação. A lógica de estado vazio "sem projetos" permanece coberta (ver Casos-limite), mas o estado "sem cargo" não é implementado agora — entra junto com o épico de Auth.
- **Navegação ao clicar numa linha:** navega para uma rota placeholder `/projetos/:id` ("Em construção"), preparando o React Router para quando a tela de projeto específico (outro épico, fora de escopo aqui) for implementada.
- **Escopo funcional:** implementação completa da tela do mockup — cards de estatísticas, abas (Todos/UAT/Cutover), busca, tabela de projetos, modal de equipe, e modal "Novo projeto" completo (nome, descrição, modo, níveis hierárquicos dinâmicos, busca/adição de usuários com papéis).
- **Integração Bootstrap:** adiciona a dependência `react-bootstrap` para componentes declarativos controlados por estado React (Modal, Table, Nav, Badge, ProgressBar, Form), em vez de manipular a API JS imperativa do `bootstrap` puro.
- **Correção de regra de negócio incorporada:** o mockup gera 2 inputs de nível configuráveis tanto para UAT quanto para Cutover no modal "Novo projeto". Isso contradiz a RN29 (já ajustada no MD de contexto do TCC): UAT = 3 níveis fixos, Cutover = 2 níveis fixos (nível final "Atividade" sempre fixo como folha). A implementação real corrige isso: UAT gera 2 inputs configuráveis + "Atividade" fixa (3 níveis); Cutover gera 1 input configurável + "Atividade" fixa (2 níveis).

## Arquitetura / estrutura de arquivos

```
src/
├── types/
│   └── project.ts            # Project, TeamMember, ProjectMode, UserRole
├── hooks/
│   └── useProjects.ts        # mock data, createProject, stats derivados
├── components/
│   └── projects/
│       ├── StatCard.tsx
│       ├── ProjectsToolbar.tsx      # abas + busca
│       ├── ProjectsTable.tsx
│       ├── ProjectRow.tsx
│       ├── TeamAvatars.tsx          # avatares + "+N", abre TeamModal
│       ├── TeamModal.tsx
│       ├── NewProjectModal.tsx
│       ├── FooterWidget.tsx         # marca HIVE + usuário logado, barra flutuante em pílula
│       └── EmptyState.tsx
├── pages/
│   ├── ProjectsPage.tsx      # composição da tela
│   └── ProjectDetailPage.tsx # placeholder "Em construção"
├── routes/
│   └── AppRoutes.tsx         # configuração do React Router
└── styles/
    ├── _colors.scss          # paleta customizada (accent colors, SPI, etc.)
    └── _footer-widget.scss   # estilo próprio da barra flutuante (Bootstrap não reproduz)
```

Cada componente recebe dados via props e não contém lógica de negócio — cálculos e estado de dados ficam no hook; estado de UI (aba ativa, texto de busca) fica na página.

## Modelo de dados

```ts
// types/project.ts
export type ProjectMode = "uat" | "cutover";
export type UserRole = "Gestor de Projetos" | "Tester" | "Desenvolvedor";

export interface TeamMember {
  initials: string;
  name: string;
  role: UserRole;
}

export interface Project {
  id: string;
  name: string;
  mode: ProjectMode;
  activityCount: number;
  completedCount: number;
  hierarchyLevels: string[];  // nomes configuráveis, sem incluir "Atividade"
  progressPercent: number;
  spi: number | null;          // null = "sem atividades"
  team: TeamMember[];
  updatedAt: string;           // ISO 8601
}
```

## Camada de dados (`useProjects`)

Expõe:
- `projects: Project[]` — inicializado com os 6 projetos de exemplo do mockup (dados equivalentes, adaptados ao novo tipo).
- `createProject(input): void` — adiciona um projeto ao estado local; se `input.team` estiver vazio, usa o criador (Gestor mockado) como único membro.
- `stats` — `{ total, uatCount, cutoverCount, avgSpi }`, derivado via `useMemo` a partir de `projects`.

Filtro por aba e busca por nome **não** entram no hook — são estado de UI (`activeTab`, `searchQuery`) mantido em `ProjectsPage` e aplicado sobre `projects` via `useMemo` separado.

A assinatura de retorno do hook é pensada para, no futuro, ser satisfeita por uma implementação que busca dados via Axios (mesmo formato de retorno), sem exigir mudança nos componentes.

## Componentes

- **`ProjectsPage`**: chama `useProjects()`, mantém `activeTab`/`searchQuery`, deriva a lista filtrada, compõe os demais componentes. Contém o "footer widget" (marca + usuário) do mockup, por ora incorporado à própria página (não há layout compartilhado ainda, pois não existem outras telas reais).
- **`StatCard`**: componente genérico (`label`, `value`, `sub`), usado para "Projetos ativos" e "SPI médio".
- **`ProjectsToolbar`**: `Nav`/`Nav.Item` (react-bootstrap) para as abas com contadores; `Form.Control` para busca.
- **`ProjectsTable`**: `Table` (react-bootstrap), mapeia a lista filtrada para `ProjectRow`; renderiza `EmptyState` quando a lista filtrada está vazia.
- **`ProjectRow`**: uma linha — barra de destaque colorida (por modo/SPI), nome + badge de modo, `ProgressBar`, valor de SPI colorido por faixa (verde/amarelo/vermelho), `TeamAvatars`, data relativa, `onClick` navega para `/projetos/:id`.
- **`TeamAvatars`**: avatares sobrepostos + contador "+N"; `onClick` com `stopPropagation` abre `TeamModal` com os membros daquele projeto.
- **`TeamModal`**: `Modal` (react-bootstrap) listando membros (avatar, nome, papel) do projeto selecionado.
- **`NewProjectModal`**: formulário completo —
  - nome, descrição (opcional)
  - toggle de modo UAT/Cutover (com aviso de que não pode ser alterado depois de criado)
  - inputs de nomes de nível, gerados dinamicamente conforme o modo: UAT → 2 inputs configuráveis + "Atividade" fixa (3 níveis); Cutover → 1 input configurável + "Atividade" fixa (2 níveis)
  - busca e adição de usuário (lista mockada fixa) com seleção de papel; mesmo usuário pode ser adicionado novamente com papel diferente
  - ao confirmar, chama `createProject` do hook e fecha o modal
- **`FooterWidget`**: barra flutuante fixa (marca HIVE + usuário logado mockado), usando `styles/_footer-widget.scss` para o formato de pílula/flutuante que o Bootstrap padrão não produz.

## Roteamento

Usa `react-router` (v8, já presente no `package.json`):

```
/                → redirect para /projetos
/projetos        → ProjectsPage
/projetos/:id    → ProjectDetailPage (placeholder "Em construção", exibe o id da rota)
```

## Estilo

Paleta customizada centralizada em `src/styles/_colors.scss` (variáveis SCSS, incluindo sobrescrita de `$theme-colors` do Bootstrap onde aplicável, para as cores de SPI e das barras de destaque). Sem CSS inline (`style={{}}`) e sem CSS solto fora de SCSS, conforme convenção do README.

Regra geral: usar componentes/classes Bootstrap sempre que resolvem o layout/elemento. Só cai pra SCSS próprio (arquivo dedicado em `styles/`, um por elemento) quando o Bootstrap puro não reproduz a peça visual do mockup — caso do rodapé flutuante em pílula (`styles/_footer-widget.scss`, usado pelo componente que reproduz o `.footer-widget` do mockup: marca HIVE + usuário logado).

## Casos-limite e tratamento de erros

- Lista filtrada vazia por busca/aba sem resultado → `EmptyState` de "nenhum resultado" (o estado "sem projeto nenhum criado" não ocorre nesta versão, pois a persona mockada sempre parte de 6 projetos).
- Criação de projeto sem usuário adicionado manualmente → time do projeto recebe o criador mockado (Gestor de Projetos) como único membro.
- Criação de projeto sem nome preenchido → confirmação do modal é bloqueada (validação simples de campo obrigatório; Zod entra quando houver formulário real ligado a uma API).

## Testes

Sem testes automatizados nesta etapa — não há suíte de testes configurada no projeto ainda. Validação será manual: rodar `npm run dev` e conferir abas, busca, modal de equipe, modal de novo projeto (incluindo a regra de níveis por modo) e responsividade básica no navegador antes de considerar a entrega concluída.

## Fora de escopo (explicitamente adiado)

- Tela de projeto específico (abas de Atividades/Issues/Estrutura) — outro épico.
- Autenticação real / Azure AD, controle de acesso por papel, estado "sem cargo".
- Integração com API real (Axios) — hook já preparado para receber essa troca depois.
- Layout compartilhado entre páginas (sidebar/header comuns) — só existe uma tela real por enquanto.
