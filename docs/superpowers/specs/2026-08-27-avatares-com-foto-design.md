# Avatares com foto do Entra ID — Design

**Data:** 2026-08-27
**Status:** aprovado (brainstorm)

## Objetivo

Substituir, em todos os pontos de avatar de pessoa, a bolinha com iniciais por
um componente que mostra a **foto do perfil corporativo** (Microsoft 365 / Entra
ID) quando ela existir e estiver acessível, caindo de volta nas iniciais em
qualquer outro caso.

O trabalho é feito agora, "no jeito", mesmo sabendo que hoje **só a foto do
usuário logado** aparece de fato — os demais avatares dependem de dados que ainda
são mockados (sem identificador de pessoa) e/ou de consentimento de admin no
tenant. Quando o backend real passar a mandar `id`/`email` das pessoas e o
consentimento for concedido, as fotos passam a aparecer sem nenhuma mudança de
código adicional.

## Escopo

**Dentro:**

- Componente `<Avatar>` compartilhado, usado em **todos** os pontos que hoje
  renderizam iniciais de pessoa.
- Hook `usePersonPhoto(key)` que busca a foto no Microsoft Graph.
- Cache de fotos em memória, por sessão.
- `useCurrentUser` passa a expor `id` e `email` da conta MSAL.
- Regra SCSS para a `<img>` preencher os contêineres circulares existentes.

**Fora (YAGNI):**

- Persistir fotos em `sessionStorage`/`localStorage`.
- `$batch` do Graph para listas de time (só vale a pena quando os membros
  tiverem `id` de verdade; hoje quase todos caem no fallback sem nenhuma
  requisição).
- Pedir tamanho específico da foto (`/photos/48x48/$value`).
- Avisos de UI sobre "consentimento de admin faltando".
- Disparar `acquireTokenRedirect` para carregar avatar.
- Qualquer mudança em `authConfig.ts` (os dois escopos necessários já existem).

## Arquitetura

Três peças novas em `src/`:

| Peça | Arquivo | Responsabilidade |
|---|---|---|
| Cache | `src/utils/photoCache.ts` | `Map<string, string \| null>` em módulo (`string` = blob URL; `null` = já tentei, não tem ou falhou — **nunca re-busca**) + `Map<string, Promise>` de requisições em voo (dedupe). |
| Hook | `src/hooks/usePersonPhoto.ts` | Recebe `key: string \| undefined`. Resolve o endpoint do Graph, faz `acquireTokenSilent` + `fetch`, converte `blob` → `URL.createObjectURL`, grava no cache. Devolve `string \| null`. Qualquer erro → grava `null`, devolve `null`. |
| Componente | `src/components/common/Avatar.tsx` | `<Avatar name personKey className alt />`. Chama o hook; URL → `<img>`; senão → `getInitials(name)`. Preserva a `className` do chamador. |

### Endpoints do Graph

- `key === "me"` (ou `key` igual ao `id`/`email` do usuário logado) →
  `GET https://graph.microsoft.com/v1.0/me/photo/$value`
  Escopo `User.Read`, já concedido no login → **funciona hoje**.
- Qualquer outra `key` →
  `GET https://graph.microsoft.com/v1.0/users/{key}/photo/$value`
  Escopo `User.ReadBasic.All` (já declarado em `graphUserSearchRequest` no
  `authConfig.ts`). Pode retornar 403 se faltar consentimento de admin no tenant
  → fallback.
- `key` `undefined`/vazia → o hook **não faz requisição nenhuma**, devolve `null`
  imediatamente.

O token é obtido com o mesmo padrão de `useGraphUserSearch.ts`
(`instance.acquireTokenSilent({ ...request, account: accounts[0] })`).

### `personKey`

Aceita **id do Entra OU e-mail/UPN** — o Graph resolve os dois em
`/users/{key}/photo/$value`.

- `TeamMember` criado pelo fluxo real (`InviteUserModal` / `NewProjectModal` via
  `useGraphUserSearch`) já grava `id` e `email` → chave disponível.
- Seed mockado de `useProjects.ts` tem só `initials` + `name` → `personKey`
  `undefined` → iniciais.

### Detecção de "sou eu"

`useCurrentUser` passa a devolver, além de `name` e `role`:

- `id`: `account?.localAccountId`
- `email`: `account?.username` (ou `account?.idTokenClaims?.email` se `username`
  não for e-mail)

O `<Avatar>` usa o endpoint `/me` quando `personKey === "me"` **ou** quando
`personKey` for igual (case-insensitive) ao `id` ou `email` do usuário logado.

## Comportamento visual

- **Enquanto busca:** mostra as iniciais. Sem spinner, sem skeleton. Quando/se a
  foto chega, troca. Evita flicker no caso comum (maioria sem foto) e não mexe no
  layout.
- **`<img>` renderizada:** `width: 100%; height: 100%; object-fit: cover;
  border-radius: inherit; display: block;`. Uma regra SCSS nova cobre os quatro
  contêineres circulares existentes:
  `.avatar-mini > img, .avatar-circle > img, .footer-widget-avatar > img,
  .team-member-av > img`. Garantir `overflow: hidden` nesses contêineres (já são
  circulares via `border-radius: 50%`).
- **`alt`:** `<Avatar>` usa `alt={name}` por padrão. Nos pontos onde o nome já
  aparece ao lado (ex.: `cell-person` em `ActivityRow`/`IssueRow`), o chamador
  passa `alt=""`.
- **Contêineres com fundo** (`footer-widget-avatar` tem fundo amarelo; `+N` do
  `TeamAvatars`): quando há foto, ela cobre o fundo; quando não há, aparece a
  bolinha atual sem nenhuma diferença.

## Pontos convertidos (todos)

Cada ponto troca `<span class="...">{iniciais}</span>` por
`<Avatar name personKey className="..." />`, mantendo a classe atual.

| Arquivo | Contêiner | `personKey` hoje | Foto hoje? |
|---|---|---|---|
| `src/components/common/FooterWidgetContent.tsx` | `footer-widget-avatar` | `"me"` | **sim** |
| `src/components/activities/ActivityRow.tsx` | `avatar-mini` ×2 (tester, dev) | `undefined` | não |
| `src/components/issues/IssueRow.tsx` | `avatar-mini` (dev) | `undefined` | não |
| `src/components/activities/ActivityPredecessorPanel.tsx` | `avatar-mini` ×2 | `undefined` | não |
| `src/components/projects/TeamAvatars.tsx` | `avatar-circle` | `member.id ?? member.email` | não (seed sem id) |
| `src/components/projects/TeamModal.tsx` | avatar do membro | `member.id ?? member.email` | não (seed sem id) |
| `src/components/config/ConfigUsersTable.tsx` | `avatar-mini` | `member.id ?? member.email` | não (seed sem id) |
| `src/components/dashboard/RecentActivityLog.tsx` | `avatar-mini` | `undefined` (entry só tem `authorName`/`authorInitials`) | não |
| `src/components/config/InviteUserModal.tsx` | `team-member-av` (resultados do Graph) | `user.id` | **quando tiver consent** |
| `src/components/projects/NewProjectModal.tsx` | `team-member-av` (resultados do Graph) | `user.id` | **quando tiver consent** |

Observações:

- `TeamAvatars` continua com o mesmo `MAX_VISIBLE = 3` e a bolinha `+N` (que **não**
  vira `<Avatar>` — é contador, não pessoa).
- `RecentActivityLog`: o entry (`src/types/activityLog.ts`) tem `authorName` e
  `authorInitials`, mas nenhum `id`. Passa `name={entry.authorName}`,
  `personKey={undefined}`, `alt=""` (o `authorName` já aparece como texto ao lado).
  O `<Avatar>` calcula as iniciais a partir do `authorName` via `getInitials` — se
  isso divergir de `authorInitials` em algum seed, o plano ajusta o seed ou passa
  `authorInitials` como override; comportamento visual alvo é idêntico ao atual.
- `getInitials` (`src/utils/initials.ts`) continua existindo; `<Avatar>` chama
  internamente para o fallback. Nenhum import direto de `getInitials` nos pontos
  convertidos precisa permanecer (o plano remove os que ficarem órfãos).

## Erros e dependência externa

**Fallback silencioso** em todos os casos, sem exceção:

- 403 (sem consentimento de admin)
- 404 (usuário sem foto)
- `InteractionRequiredAuthError` / token exige interação
- erro de rede / `fetch` rejeitado
- `key` ausente

Em todos: grava `null` no cache para aquela `key`, o `<Avatar>` mostra iniciais.
Sem `console.error` visível ao usuário, sem `acquireTokenRedirect`, sem popup.

**Dependência externa (registrada aqui, fora do código):** as fotos de pessoas
que não o usuário logado só aparecem depois que um admin do tenant conceder
`User.ReadBasic.All` ao app registration `40796f28-4c73-4ba7-a267-68118451a05c`.
Até lá, apenas a foto do usuário logado (via `/me`, escopo `User.Read`)
funciona. Isso é comportamento esperado.

## Ciclo de vida do blob URL

As blob URLs criadas com `URL.createObjectURL` ficam no cache de módulo pela
duração da sessão da aba. **Não** são revogadas em `unmount` do `<Avatar>` —
seriam recriadas na próxima montagem, e o volume (uma por pessoa distinta com
foto) é pequeno. São liberadas naturalmente quando a aba fecha/recarrega.

## Verificação

Sem suíte de testes automatizados (decisão do projeto). Verificação manual:

1. `npx tsc -b` — sem erros.
2. `npm run build` — sucesso.
3. QA no navegador:
   - Logar. Conferir que a **própria foto** aparece na pill do topo e no nav dock
     (se a conta de teste tiver foto no M365). Se não tiver, conferir que aparece
     a bolinha amarela com iniciais, sem erro.
   - Abrir lista de Atividades e de Issues: todos os avatares de tester/dev
     mostram iniciais; **Network** não registra chamada a `graph.microsoft.com`
     (porque `personKey` é `undefined`).
   - Abrir lista de Projetos e o modal de Time: avatares do time mostram iniciais,
     sem erro no console.
   - Abrir modal "Convidar usuário" / "Novo projeto", buscar um usuário: a lista
     de resultados tenta buscar foto; com consent → foto, sem consent → iniciais,
     em ambos os casos sem erro visível.
