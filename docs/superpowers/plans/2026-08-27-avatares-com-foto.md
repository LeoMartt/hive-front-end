# Avatares com foto do Entra ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar, em todos os pontos de avatar de pessoa, a bolinha de iniciais por um componente `<Avatar>` que mostra a foto de perfil do Microsoft 365 / Entra ID quando disponível, caindo nas iniciais em qualquer outro caso.

**Architecture:** Uma peça de cache em memória (`src/utils/photoCache.ts`, get-or-fetch com dedupe), um hook (`src/hooks/usePersonPhoto.ts`) que fala com o Microsoft Graph usando o mesmo padrão de token de `useGraphUserSearch.ts`, e um componente presentacional (`src/components/common/Avatar.tsx`) que consome o hook e renderiza `<img>` ou iniciais preservando a `className` do chamador. Todos os ~10 pontos de avatar passam a usar `<Avatar>`. Hoje só a foto do usuário logado (endpoint `/me`, escopo `User.Read` já concedido) aparece de fato; os demais dependem de dados hoje mockados sem `id`/`email` e de consentimento de admin para `User.ReadBasic.All`, e caem silenciosamente nas iniciais.

**Tech Stack:** React 19 + TypeScript, `@azure/msal-react`/`@azure/msal-browser`, Microsoft Graph REST (`fetch`), SCSS puro. Sem suíte de testes automatizados (decisão deliberada do projeto verificação via `npx tsc -b`, `npm run build` e QA manual no navegador, não TDD).

**Importante:** este projeto tem uma regra do usuário de **nunca commitar ou abrir PR automaticamente**. Não há passos de `git commit` neste plano. Ao final de cada task, apenas deixe o working tree com as mudanças prontas para o usuário revisar e commitar.

**Spec:** `docs/superpowers/specs/2026-08-27-avatares-com-foto-design.md`

---

## Estrutura de arquivos

**Criar:**

- `src/utils/photoCache.ts` cache em memória (por sessão da aba) de blob URLs de fotos + dedupe de requisições em voo. Sem React.
- `src/hooks/usePersonPhoto.ts` hook `usePersonPhoto(key)` que resolve o endpoint do Graph, pega token MSAL, faz `fetch`, converte em blob URL. Retorna `string | null`.
- `src/components/common/Avatar.tsx` componente `<Avatar name personKey className alt />`. Consome o hook; renderiza `<img>` ou `getInitials(name)`.
- `src/styles/_avatar.scss` regra para a `<img>` preencher os contêineres circulares existentes.

**Modificar:**

- `src/styles/main.scss` registrar `@use "avatar";`.
- `src/hooks/useCurrentUser.ts` expor `id` e `email` da conta MSAL.
- `src/utils/teamMembers.ts` `GroupedTeamMember` passa a carregar `id`.
- `src/components/common/FooterWidgetContent.tsx` avatar do usuário logado (`personKey="me"`).
- `src/components/activities/ActivityRow.tsx` colunas Tester/Dev (`personKey` ausente).
- `src/components/issues/IssueRow.tsx` coluna Dev (`personKey` ausente).
- `src/components/activities/ActivityPredecessorPanel.tsx` Tester/Dev do predecessor (`personKey` ausente).
- `src/components/projects/TeamAvatars.tsx` pilha de avatares do time (`personKey = member.id ?? member.email`).
- `src/components/projects/TeamModal.tsx` lista de membros (`personKey = member.id ?? member.email`).
- `src/components/config/ConfigUsersTable.tsx` coluna Usuário (`personKey = member.id ?? member.email`).
- `src/components/dashboard/RecentActivityLog.tsx` autor da entrada do log (`personKey` ausente).
- `src/components/config/InviteUserModal.tsx` resultados da busca de usuário (`personKey = user.id`).
- `src/components/projects/NewProjectModal.tsx` resultados da busca de usuário (`personKey = user.id`).

---

## Task 1: Cache de fotos em memória

**Files:**
- Create: `src/utils/photoCache.ts`

- [ ] **Step 1: Criar o módulo de cache**

Crie `src/utils/photoCache.ts` com este conteúdo exato:

```ts
// Cache em memória (dura enquanto a aba estiver aberta) das fotos de perfil já
// resolvidas no Microsoft Graph.
//   - chave: "me" | id do Entra | e-mail/UPN, sempre normalizada (trim + lowercase)
//   - valor: blob URL da foto, ou null quando já tentamos e não há foto / a busca
//     falhou. Uma vez null, nunca mais buscamos aquela chave.
const cache = new Map<string, string | null>();

// Requisições em andamento, para deduplicar montagens simultâneas do mesmo avatar
// (ex.: a mesma pessoa repetida em várias linhas de uma tabela).
const inFlight = new Map<string, Promise<string | null>>();

export function normalizePhotoKey(key: string): string {
  return key.trim().toLowerCase();
}

// Leitura síncrona do cache. `undefined` = ainda não resolvido; `null` = resolvido
// sem foto; string = blob URL.
export function peekPhoto(key: string): string | null | undefined {
  return cache.get(key);
}

// Get-or-fetch com dedupe. `fetcher` só é chamado quando a chave ainda não foi
// resolvida nem está em voo. Qualquer rejeição do `fetcher` é engolida e cacheada
// como null (fallback silencioso: sem foto).
export function loadPhoto(
  key: string,
  fetcher: (key: string) => Promise<string | null>,
): Promise<string | null> {
  if (cache.has(key)) {
    return Promise.resolve(cache.get(key) as string | null);
  }

  const existing = inFlight.get(key);
  if (existing) return existing;

  const promise = fetcher(key)
    .then((url) => {
      cache.set(key, url);
      return url;
    })
    .catch(() => {
      cache.set(key, null);
      return null;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros.

---

## Task 2: Hook `usePersonPhoto`

**Files:**
- Create: `src/hooks/usePersonPhoto.ts`
- Reference: `src/hooks/useGraphUserSearch.ts` (padrão de `acquireTokenSilent` + `fetch` no Graph), `src/config/authConfig.ts` (`loginRequest`, `graphUserSearchRequest`)

- [ ] **Step 1: Criar o hook**

Crie `src/hooks/usePersonPhoto.ts` com este conteúdo exato:

```ts
import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest, graphUserSearchRequest } from "../config/authConfig";
import { loadPhoto, normalizePhotoKey, peekPhoto } from "../utils/photoCache";

// Busca a foto de perfil (Microsoft 365 / Entra ID) de uma pessoa e devolve uma
// blob URL, ou null quando não há foto / não foi possível buscar.
//
// - key === "me" (ou igual ao id/e-mail do usuário logado) -> endpoint /me/photo
//   (escopo User.Read, já concedido no login).
// - qualquer outra key -> /users/{key}/photo (escopo User.ReadBasic.All; pode
//   falhar com 403 se faltar consentimento de admin no tenant -> fallback).
// - key === undefined -> não toca na rede, devolve null (dados mockados sem
//   identificador de pessoa).
//
// Qualquer erro (404 sem foto, 403 sem consent, token exige interação, rede) vira
// null silenciosamente, cacheado para não re-buscar.
export function usePersonPhoto(key: string | undefined): string | null {
  const { instance } = useMsal();
  const normalized = key ? normalizePhotoKey(key) : undefined;

  const [url, setUrl] = useState<string | null>(() =>
    normalized ? peekPhoto(normalized) ?? null : null,
  );

  useEffect(() => {
    if (!normalized) {
      setUrl(null);
      return;
    }

    const cached = peekPhoto(normalized);
    if (cached !== undefined) {
      setUrl(cached);
      return;
    }

    let cancelled = false;

    async function fetchPhoto(): Promise<string | null> {
      const account = instance.getAllAccounts()[0];
      if (!account) return null;

      const isMe =
        normalized === "me" ||
        account.localAccountId.toLowerCase() === normalized ||
        (account.username?.toLowerCase() ?? "") === normalized;

      const request = isMe ? loginRequest : graphUserSearchRequest;
      const token = await instance.acquireTokenSilent({ ...request, account });

      const endpoint = isMe
        ? "https://graph.microsoft.com/v1.0/me/photo/$value"
        : `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(
            normalized as string,
          )}/photo/$value`;

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token.accessToken}` },
      });

      if (!response.ok) return null;

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    loadPhoto(normalized, fetchPhoto).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [normalized, instance]);

  return url;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros. (`loginRequest` e `graphUserSearchRequest` já são exportados por `src/config/authConfig.ts`; nenhuma mudança de escopo é necessária.)

---

## Task 3: Componente `<Avatar>`

**Files:**
- Create: `src/components/common/Avatar.tsx`
- Reference: `src/utils/initials.ts` (`getInitials`)

- [ ] **Step 1: Criar o componente**

Crie `src/components/common/Avatar.tsx` com este conteúdo exato:

```tsx
import { usePersonPhoto } from "../../hooks/usePersonPhoto";
import { getInitials } from "../../utils/initials";

interface AvatarProps {
  // Nome completo da pessoa usado para gerar as iniciais do fallback.
  name: string;
  // id do Entra, e-mail/UPN, ou "me". Ausente = sem foto, só iniciais (dados
  // ainda mockados, sem identificador de pessoa).
  personKey?: string;
  // Classe do contêiner circular já existente no projeto: "avatar-mini",
  // "avatar-circle", "footer-widget-avatar" ou "team-member-av".
  className: string;
  // Texto alternativo da imagem. Passe "" quando o nome já aparece ao lado do
  // avatar. Default: o próprio name.
  alt?: string;
}

// Substitui a bolinha de iniciais em todo o projeto. Quando há foto de perfil
// acessível, mostra a <img>; senão, as iniciais (comportamento idêntico ao
// anterior). O visual do contêiner vem da className do chamador.
export default function Avatar({ name, personKey, className, alt }: AvatarProps) {
  const photoUrl = usePersonPhoto(personKey);

  return (
    <span className={className}>
      {photoUrl ? <img src={photoUrl} alt={alt ?? name} /> : getInitials(name)}
    </span>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros.

---

## Task 4: Estilo da `<img>` nos contêineres de avatar

**Files:**
- Create: `src/styles/_avatar.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Criar a folha de estilo**

Crie `src/styles/_avatar.scss` com este conteúdo exato:

```scss
@use "colors" as c;

// Quando o <Avatar> tem foto, a <img> preenche o contêiner circular já existente
// (.avatar-mini, .avatar-circle, .footer-widget-avatar, .team-member-av). Esses
// contêineres já são redondos via border-radius; aqui só garantimos o recorte e
// o preenchimento da imagem.
.avatar-mini,
.avatar-circle,
.footer-widget-avatar,
.team-member-av {
  overflow: hidden;
}

.avatar-mini > img,
.avatar-circle > img,
.footer-widget-avatar > img,
.team-member-av > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
  display: block;
}
```

(O `@use "colors" as c;` mantém o padrão dos outros parciais mesmo sem uso direto aqui; se o `eslint`/`sass` reclamar de import não usado, pode remover essa linha.)

- [ ] **Step 2: Registrar o parcial no `main.scss`**

Em `src/styles/main.scss`, adicione a linha `@use "avatar";` logo depois de `@use "footer-widget";`. O bloco fica:

```scss
@use "footer-widget";
@use "avatar";
@use "activities";
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: sucesso (compila o SCSS novo sem erro).

---

## Task 5: `useCurrentUser` expõe `id` e `email`

**Files:**
- Modify: `src/hooks/useCurrentUser.ts`

- [ ] **Step 1: Adicionar `id` e `email` à interface e ao retorno**

Substitua todo o conteúdo de `src/hooks/useCurrentUser.ts` por:

```ts
import { useMsal } from "@azure/msal-react";
import { shortName } from "../utils/shortName";

interface CurrentUser {
  name: string;
  role: string;
  id?: string;
  email?: string;
}

export function useCurrentUser(): CurrentUser {
  const { accounts } = useMsal();
  const account = accounts[0];

  return {
    name: account?.name ? shortName(account.name) : "Usuário",
    // Papéis por usuário ainda não vêm do backend (RN45 / mapeamento pendente).
    // Mantido fixo como Gestor por enquanto, igual ao resto do protótipo (ver
    // comentário "role-gate removido temporariamente" no HTML de referência).
    role: "Gestor de Projetos",
    id: account?.localAccountId,
    email: account?.username,
  };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc -b`
Expected: sem erros. (Consumidores atuais de `useCurrentUser` só desestruturam `name`/`role`; os campos novos são opcionais e não quebram nada.)

---

## Task 6: Avatar do usuário logado (`FooterWidgetContent`)

**Files:**
- Modify: `src/components/common/FooterWidgetContent.tsx`

- [ ] **Step 1: Trocar a bolinha de iniciais pelo `<Avatar>`**

Substitua todo o conteúdo de `src/components/common/FooterWidgetContent.tsx` por:

```tsx
import BeeMark from "./BeeMark";
import Avatar from "./Avatar";

interface FooterWidgetContentProps {
  userName: string;
  userRole: string;
}

export default function FooterWidgetContent({ userName, userRole }: FooterWidgetContentProps) {
  return (
    <>
      <div className="footer-brand">
        <BeeMark />
        <div className="footer-brand-text">
          <b>HIVE</b>
          <span>UAT · Cutover</span>
        </div>
      </div>
      <div className="footer-widget-divider" />
      <div className="footer-user">
        <div className="footer-user-text">
          <b>{userName}</b>
          <span>{userRole}</span>
        </div>
        <Avatar name={userName} personKey="me" className="footer-widget-avatar" alt="" />
      </div>
    </>
  );
}
```

Notas:
- O `getInitials` deixa de ser importado aqui (o `<Avatar>` cuida do fallback).
- `personKey="me"` porque este widget é sempre o usuário logado; a foto vem de `/me/photo` e funciona hoje.
- `alt=""` porque o nome já aparece ao lado.

- [ ] **Step 2: Verificar tipos e build**

Run: `npx tsc -b && npm run build`
Expected: sem erros; build com sucesso.

---

## Task 7: Avatares `avatar-mini` sem identificador (tabelas e painel)

Estes três arquivos renderizam pessoas cujos dados ainda são strings mockadas (sem `id`/`email`). Passam `<Avatar>` **sem** `personKey` sempre caem nas iniciais hoje, sem nenhuma chamada ao Graph.

**Files:**
- Modify: `src/components/activities/ActivityRow.tsx`
- Modify: `src/components/issues/IssueRow.tsx`
- Modify: `src/components/activities/ActivityPredecessorPanel.tsx`

- [ ] **Step 1: `ActivityRow.tsx` trocar imports e as duas células de pessoa**

Em `src/components/activities/ActivityRow.tsx`:

1. Remova a linha `import { getInitials } from "../../utils/initials";` e adicione no lugar `import Avatar from "../common/Avatar";`. A linha `import { shortName } from "../../utils/shortName";` **permanece**. O topo do arquivo fica:

```tsx
import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { formatActivityDate, isBulkSelectable, isOverdue, retestPillClass } from "../../utils/activityIndicators";
import Avatar from "../common/Avatar";
import { shortName } from "../../utils/shortName";
import type { Activity } from "../../types/activity";
```

2. Troque o bloco da célula Tester:

```tsx
      <td>
        <div className="cell-person" title={activity.tester}>
          <span className="avatar-mini">{getInitials(activity.tester)}</span>
          <span className="cell-person-name">{shortName(activity.tester)}</span>
        </div>
      </td>
```

por:

```tsx
      <td>
        <div className="cell-person" title={activity.tester}>
          <Avatar name={activity.tester} className="avatar-mini" alt="" />
          <span className="cell-person-name">{shortName(activity.tester)}</span>
        </div>
      </td>
```

3. Troque o bloco da célula Dev:

```tsx
      <td>
        <div className="cell-person" title={activity.dev}>
          <span className="avatar-mini">{getInitials(activity.dev)}</span>
          <span className="cell-person-name">{shortName(activity.dev)}</span>
        </div>
      </td>
```

por:

```tsx
      <td>
        <div className="cell-person" title={activity.dev}>
          <Avatar name={activity.dev} className="avatar-mini" alt="" />
          <span className="cell-person-name">{shortName(activity.dev)}</span>
        </div>
      </td>
```

- [ ] **Step 2: `IssueRow.tsx` trocar imports e a célula Dev**

Em `src/components/issues/IssueRow.tsx`:

1. Remova `import { getInitials } from "../../utils/initials";` e adicione `import Avatar from "../common/Avatar";`. A linha `import { shortName } from "../../utils/shortName";` **permanece**. O topo fica:

```tsx
import { useNavigate } from "react-router";
import IssueStatusBadge from "./IssueStatusBadge";
import IssueImpactBadge from "./IssueImpactBadge";
import { computeIssueAgingDays, computeIssueRisk, ISSUE_TYPE_LABELS } from "../../utils/issueIndicators";
import Avatar from "../common/Avatar";
import { shortName } from "../../utils/shortName";
import type { Issue } from "../../types/issue";
import type { AgingThresholds } from "../../types/projectConfig";
```

2. Troque o bloco:

```tsx
      <td>
        <div className="cell-person" title={issue.dev}>
          <span className="avatar-mini">{getInitials(issue.dev)}</span>
          <span className="cell-person-name">{shortName(issue.dev)}</span>
        </div>
      </td>
```

por:

```tsx
      <td>
        <div className="cell-person" title={issue.dev}>
          <Avatar name={issue.dev} className="avatar-mini" alt="" />
          <span className="cell-person-name">{shortName(issue.dev)}</span>
        </div>
      </td>
```

- [ ] **Step 3: `ActivityPredecessorPanel.tsx` trocar import e os dois `field-value`**

Em `src/components/activities/ActivityPredecessorPanel.tsx`:

1. Remova `import { getInitials } from "../../utils/initials";` e adicione `import Avatar from "../common/Avatar";` (mesma posição, entre o import de `activityAuditTrail` e o de tipos):

```tsx
import { useNavigate } from "react-router";
import ActivityStatusBadge from "./ActivityStatusBadge";
import { formatActivityDate } from "../../utils/activityIndicators";
import { deriveActivityAuditTrail } from "../../utils/activityAuditTrail";
import Avatar from "../common/Avatar";
import type { Activity } from "../../types/activity";
```

2. Troque:

```tsx
          <div className="field-value">
            <span className="avatar-mini">{getInitials(predecessor.tester)}</span>
            {predecessor.tester}
          </div>
```

por:

```tsx
          <div className="field-value">
            <Avatar name={predecessor.tester} className="avatar-mini" alt="" />
            {predecessor.tester}
          </div>
```

3. Troque:

```tsx
          <div className="field-value">
            <span className="avatar-mini">{getInitials(predecessor.dev)}</span>
            {predecessor.dev}
          </div>
```

por:

```tsx
          <div className="field-value">
            <Avatar name={predecessor.dev} className="avatar-mini" alt="" />
            {predecessor.dev}
          </div>
```

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc -b && npm run build`
Expected: sem erros; build com sucesso. Nenhum arquivo deve ter `import { getInitials }` órfão (os três removeram; `getInitials` segue usado por `Avatar.tsx` e outros pontos).

---

## Task 8: Avatares do time (`personKey = id ?? email`)

Aqui os `TeamMember` já têm `id`/`email` **quando** adicionados pelo fluxo real de busca no Graph; o seed mockado de `useProjects.ts` não tem, então cai nas iniciais. O `<Avatar>` recebe `personKey={member.id ?? member.email}` (`undefined` quando nenhum existe).

**Files:**
- Modify: `src/utils/teamMembers.ts`
- Modify: `src/components/projects/TeamAvatars.tsx`
- Modify: `src/components/projects/TeamModal.tsx`
- Modify: `src/components/config/ConfigUsersTable.tsx`

- [ ] **Step 1: `GroupedTeamMember` passa a carregar `id`**

Em `src/utils/teamMembers.ts`, adicione `id?: string;` à interface e propague no objeto criado. O arquivo fica:

```ts
import type { TeamMember, UserRole } from "../types/project";

export interface GroupedTeamMember {
  name: string;
  initials: string;
  id?: string;
  email?: string;
  roles: UserRole[];
}

// TeamMember já modela "múltiplos papéis" como múltiplas entradas com o mesmo name
// (mesma convenção que NewProjectModal usa ao permitir "adicionar de novo com outro
// papel") — esta função agrupa essas entradas de volta numa linha por pessoa, pra exibir
// como múltiplos badges na mesma linha da tabela (mesmo visual do mockup).
export function groupTeamMembersByName(team: TeamMember[]): GroupedTeamMember[] {
  const groups = new Map<string, GroupedTeamMember>();

  for (const member of team) {
    const existing = groups.get(member.name);
    if (existing) {
      if (!existing.roles.includes(member.role)) {
        existing.roles.push(member.role);
      }
      continue;
    }
    groups.set(member.name, {
      name: member.name,
      initials: member.initials,
      id: member.id,
      email: member.email,
      roles: [member.role],
    });
  }

  return Array.from(groups.values());
}
```

- [ ] **Step 2: `TeamAvatars.tsx` usar `<Avatar>` na pilha**

Substitua todo o conteúdo de `src/components/projects/TeamAvatars.tsx` por:

```tsx
import Avatar from "../common/Avatar";
import type { TeamMember } from "../../types/project";

interface TeamAvatarsProps {
  team: TeamMember[];
  onOpenTeam: () => void;
}

const MAX_VISIBLE = 3;

export default function TeamAvatars({ team, onOpenTeam }: TeamAvatarsProps) {
  const visible = team.slice(0, MAX_VISIBLE);
  const remaining = team.length - visible.length;

  return (
    <div
      className="avatar-stack"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        onOpenTeam();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onOpenTeam();
        }
      }}
    >
      {visible.map((member) => (
        <Avatar
          key={member.initials + member.role}
          name={member.name}
          personKey={member.id ?? member.email}
          className="avatar-circle"
          alt={member.name}
        />
      ))}
      {remaining > 0 && <div className="avatar-circle">+{remaining}</div>}
    </div>
  );
}
```

Notas:
- A bolinha `+{remaining}` continua sendo um `<div>` cru é contador, não pessoa.
- `member.name` era usado antes só na `key`; agora vai também no `name`/`alt`. A `key` segue `member.initials + member.role` (idêntica à anterior).

- [ ] **Step 3: `TeamModal.tsx` usar `<Avatar>` na lista**

Substitua todo o conteúdo de `src/components/projects/TeamModal.tsx` por:

```tsx
import Modal from "../common/Modal";
import Avatar from "../common/Avatar";
import type { TeamMember } from "../../types/project";

interface TeamModalProps {
  show: boolean;
  onHide: () => void;
  team: TeamMember[];
}

export default function TeamModal({ show, onHide, team }: TeamModalProps) {
  return (
    <Modal open={show} onClose={onHide} labelledBy="team-modal-title">
      <div className="modal-title" id="team-modal-title">
        Equipe do projeto
      </div>
      <div>
        {team.map((member) => (
          <div className="team-member-row" key={member.initials + member.role}>
            <Avatar
              name={member.name}
              personKey={member.id ?? member.email}
              className="team-member-av"
              alt=""
            />
            <div className="team-member-info">
              <b>{member.name}</b>
              <span>{member.role}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: `ConfigUsersTable.tsx` usar `<Avatar>` na coluna Usuário**

Em `src/components/config/ConfigUsersTable.tsx`:

1. Adicione `import Avatar from "../common/Avatar";` logo após o import de `EditUserRolesModal`:

```tsx
import { useState } from "react";
import { useProjects } from "../../hooks/useProjects";
import { groupTeamMembersByName, type GroupedTeamMember } from "../../utils/teamMembers";
import InviteUserModal from "./InviteUserModal";
import EditUserRolesModal from "./EditUserRolesModal";
import Avatar from "../common/Avatar";
import type { UserRole } from "../../types/project";
```

2. Troque o `<td>` do usuário:

```tsx
                <td>
                  <span className="avatar-mini">{member.initials}</span>
                  {member.name}
                </td>
```

por:

```tsx
                <td>
                  <Avatar
                    name={member.name}
                    personKey={member.id ?? member.email}
                    className="avatar-mini"
                    alt=""
                  />
                  {member.name}
                </td>
```

- [ ] **Step 5: Verificar tipos e build**

Run: `npx tsc -b && npm run build`
Expected: sem erros; build com sucesso.

---

## Task 9: Log do dashboard e resultados de busca de usuário

**Files:**
- Modify: `src/components/dashboard/RecentActivityLog.tsx`
- Modify: `src/components/config/InviteUserModal.tsx`
- Modify: `src/components/projects/NewProjectModal.tsx`

- [ ] **Step 1: `RecentActivityLog.tsx` autor da entrada**

Em `src/components/dashboard/RecentActivityLog.tsx`:

1. Adicione `import Avatar from "../common/Avatar";` junto aos outros imports do topo do arquivo (por exemplo logo após o import de `NavIcon`).

2. Troque:

```tsx
              <div className="log-meta">
                <span className="avatar-mini">{entry.authorInitials}</span>
                {entry.authorName} · {formatRelativeTime(entry.at)}
              </div>
```

por:

```tsx
              <div className="log-meta">
                <Avatar name={entry.authorName} className="avatar-mini" alt="" />
                {entry.authorName} · {formatRelativeTime(entry.at)}
              </div>
```

Nota: em todas as entradas do seed (`src/hooks/useActivityLog.ts`), `getInitials(authorName)` já produz exatamente `authorInitials` (ex.: `"G. Def."` -> `"GD"`, `"R. Lima"` -> `"RL"`), então o fallback visual é idêntico. `entry.authorInitials` deixa de ser referenciado aqui, mas o campo **permanece** no tipo e no seed (nenhuma mudança em `src/types/activityLog.ts` nem em `useActivityLog.ts`).

- [ ] **Step 2: `InviteUserModal.tsx` resultados da busca**

Em `src/components/config/InviteUserModal.tsx`:

1. Adicione `import Avatar from "../common/Avatar";` junto aos imports do topo. A linha `import { getInitials } from "../../utils/initials";` **permanece** (ainda é usada na criação do `TeamMember`, `initials: getInitials(selectedUser.displayName)`).

2. Troque:

```tsx
                    <span className="team-member-av">{getInitials(user.displayName)}</span>
```

por:

```tsx
                    <Avatar
                      name={user.displayName}
                      personKey={user.id}
                      className="team-member-av"
                      alt=""
                    />
```

- [ ] **Step 3: `NewProjectModal.tsx` resultados da busca**

Em `src/components/projects/NewProjectModal.tsx`:

1. Adicione `import Avatar from "../common/Avatar";` junto aos imports do topo. A linha `import { getInitials } from "../../utils/initials";` **permanece** (usada em `initials: getInitials(selectedUser.displayName)`).

2. Troque:

```tsx
                      <span className="team-member-av">{getInitials(user.displayName)}</span>
```

por:

```tsx
                      <Avatar
                        name={user.displayName}
                        personKey={user.id}
                        className="team-member-av"
                        alt=""
                      />
```

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc -b && npm run build`
Expected: sem erros; build com sucesso.

---

## Task 10: Verificação final (QA manual no navegador)

**Files:** nenhuma mudança apenas verificação.

- [ ] **Step 1: Type-check e build limpos**

Run: `npx tsc -b && npm run build`
Expected: ambos sem erro.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: sem novos erros nos arquivos tocados. (Se aparecer "unused import" em `_avatar.scss` para `colors`, remova a linha `@use "colors" as c;` daquele parcial.)

- [ ] **Step 3: Subir o dev server e conferir no navegador**

Run: `npm run dev`

Confira, logado:

1. **Pill do topo / nav dock:** se a conta de teste tiver foto no Microsoft 365, ela aparece redonda no lugar da bolinha amarela. Se não tiver, aparece a bolinha amarela com iniciais igual a antes, **sem erro no console**.
2. **Lista de Atividades e de Issues:** todos os avatares de Tester/Dev mostram iniciais. Abra o DevTools -> Network, filtre por `graph.microsoft.com`: **não deve haver nenhuma chamada** (porque `personKey` é `undefined` nesses pontos).
3. **Detalhe de atividade com predecessor** (atividade "aguardando"): o painel Predecessor mostra iniciais em Tester/Desenvolvedor, sem erro.
4. **Lista de Projetos:** a pilha de avatares do time (coluna Equipe) mostra iniciais e o `+N`; clicar abre o modal Equipe, também com iniciais.
5. **Dashboard do projeto:** o log de atividades recentes mostra as iniciais do autor, idênticas a antes.
6. **Config -> Papéis & Config -> aba de usuários:** coluna Usuário mostra iniciais.
7. **Modal "Convidar usuário" e "Novo projeto":** digitar 2+ letras dispara a busca no Graph; cada resultado tenta buscar a foto. Com consentimento de admin concedido -> fotos aparecem; sem consentimento -> iniciais. Em ambos os casos **sem popup, sem redirect e sem erro visível ao usuário** (no Network dá pra ver os 403/404 do endpoint `/photo/$value` esse é o comportamento esperado de fallback).

- [ ] **Step 4: Deixar o working tree pronto para revisão**

Não commitar. Rodar `git status` e conferir que só os arquivos previstos neste plano foram alterados/criados:

```
git status
```

Esperado (criados): `src/utils/photoCache.ts`, `src/hooks/usePersonPhoto.ts`, `src/components/common/Avatar.tsx`, `src/styles/_avatar.scss`, `docs/superpowers/plans/2026-08-27-avatares-com-foto.md`, `docs/superpowers/specs/2026-08-27-avatares-com-foto-design.md`.
Esperado (modificados): `src/styles/main.scss`, `src/hooks/useCurrentUser.ts`, `src/utils/teamMembers.ts`, `src/components/common/FooterWidgetContent.tsx`, `src/components/activities/ActivityRow.tsx`, `src/components/issues/IssueRow.tsx`, `src/components/activities/ActivityPredecessorPanel.tsx`, `src/components/projects/TeamAvatars.tsx`, `src/components/projects/TeamModal.tsx`, `src/components/config/ConfigUsersTable.tsx`, `src/components/dashboard/RecentActivityLog.tsx`, `src/components/config/InviteUserModal.tsx`, `src/components/projects/NewProjectModal.tsx`.

---

## Notas de revisão (self-review)

- **Cobertura da spec:** cache em memória + dedupe (Task 1), hook com endpoints `/me` vs `/users/{key}` e fallback silencioso (Task 2), componente com fallback pra iniciais (Task 3), CSS da `<img>` nos 4 contêineres (Task 4), `useCurrentUser` com `id`/`email` (Task 5), todos os 10 pontos de avatar da tabela da spec convertidos (Tasks 6-9), verificação `tsc`/`build`/QA sem TDD (Task 10). Dependência externa (consent de `User.ReadBasic.All`) documentada na spec e conferida no Step 3 da Task 10.
- **Sem placeholders:** todo passo que muda código mostra o código completo.
- **Consistência de tipos:** `normalizePhotoKey`, `peekPhoto`, `loadPhoto` (Task 1) usados exatamente com esses nomes na Task 2. `usePersonPhoto(key: string | undefined): string | null` (Task 2) consumido assim na Task 3. `AvatarProps` (`name`, `personKey?`, `className`, `alt?`) usado de forma idêntica nas Tasks 6-9. `GroupedTeamMember.id` adicionado na Task 8 Step 1 antes de ser lido no Step 4.
- **Ciclo de vida do blob URL:** intencionalmente sem `revokeObjectURL` (spec, seção "Ciclo de vida do blob URL") as URLs vivem no cache de módulo pela sessão e são liberadas no reload/fechamento da aba.
