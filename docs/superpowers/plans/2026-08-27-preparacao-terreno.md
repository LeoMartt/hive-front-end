# Preparação de terreno para o backend + audit de segurança — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o frontend pronto para integrar um backend futuro (camada `api/`, config por ambiente, um hook migrado como referência) e aplicar as correções de segurança de baixo risco do audit.

**Architecture:** Uma camada `src/api/` isolada concentra cliente HTTP (Axios), aquisição de token do Entra ID para uma API própria, interceptors e validação de resposta com Zod. Config sai do código para `.env` validado, com uma chave `useMocks` que mantém todo o app nos dados mockados enquanto `VITE_API_BASE_URL` estiver vazio. `useProjects` ganha um caminho real como padrão vivo; os demais hooks seguem só mock. Correções de segurança pontuais e três documentos (ADR, audit, headers) completam a branch.

**Tech Stack:** React 19 + TypeScript, Vite 8, Axios, Zod 4, `@azure/msal-browser`/`@azure/msal-react`.

**Verificação (padrão do projeto — sem testes automatizados):** cada tarefa termina com `npx tsc -b`, `npm run lint` e (quando o runtime muda) `npm run build` + QA manual no navegador.

**Commits:** o autor do projeto prefere fazer os commits. Os passos de commit abaixo são sugestões — rode-os você mesmo, ou autorize o agente a commitar no início da execução. Não commitar automaticamente sem esse combinado.

**Pré-condição:** a spec `docs/superpowers/specs/2026-08-27-preparacao-terreno-design.md` foi lida.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `src/config/env.ts` | Lê e valida `import.meta.env` (Zod), expõe `env` e `useMocks` | 1 |
| `.env.example` | Modelo de ambiente versionado | 1 |
| `.env` | Ambiente local real (não versionado) | 1 |
| `src/config/msalInstance.ts` | Instância única do `PublicClientApplication` | 2 |
| `src/config/authConfig.ts` | (modificado) monta `msalConfig` a partir de `env`; adiciona `apiRequest` | 2 |
| `src/main.tsx` | (modificado) importa `msalInstance` em vez de criar inline | 2 |
| `src/api/apiError.ts` | `ApiError` + `normalizeError(err): ApiError` | 3 |
| `src/api/httpClient.ts` | Instância Axios (baseURL, timeout) | 4 |
| `src/api/authToken.ts` | `getApiToken(): Promise<string \| null>` | 4 |
| `src/api/interceptors.ts` | Registra request/response interceptors no `httpClient` | 4 |
| `src/api/client.ts` | Reexporta `httpClient` já com interceptors instalados | 4 |
| `src/api/schemas/common.ts` | `paginated()`, `errorEnvelopeSchema` | 5 |
| `src/api/schemas/project.ts` | `projectSchema` espelhando `src/types/project.ts` | 5 |
| `src/api/resources/projects.ts` | `projectsApi.list()` | 6 |
| `src/hooks/useProjects.ts` | (modificado) ramifica por `useMocks` | 7 |
| `src/pages/ProjectsPage.tsx` | (modificado) trata `loading` / `error` | 7 |
| `src/hooks/useGraphUserSearch.ts` | (modificado) encoding do parâmetro de busca | 8 |
| `vite.config.ts` | (modificado) injeta CSP `<meta>` no build | 9 |
| `package.json` | (modificado) script `audit` | 10 |
| `docs/adr/0001-integracao-backend.md` | ADR + receita de migração | 11 |
| `docs/security/2026-08-27-audit-frontend.md` | Audit de segurança | 12 |
| `docs/security/headers.md` | Cabeçalhos de segurança + exemplos de hosting | 13 |
| `README.md` | (modificado) atualizado | 14 |

---

## Task 1: Config por ambiente (`env.ts` + `.env`)

**Files:**
- Create: `src/config/env.ts`
- Create: `.env.example`
- Create: `.env` (local, não versionado — já coberto pelo `.gitignore`)

- [ ] **Step 1: Criar `src/config/env.ts`**

```ts
import { z } from "zod";

// Vite injeta apenas variáveis prefixadas com VITE_ em import.meta.env.
// String vazia (VITE_API_BASE_URL= no .env) é tratada como "não definida".
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

const schema = z.object({
  VITE_MSAL_CLIENT_ID: z.string().min(1),
  VITE_MSAL_AUTHORITY: z.url(),
  VITE_MSAL_REDIRECT_URI: z.string().min(1).default("/"),
  VITE_MSAL_POST_LOGOUT_REDIRECT_URI: z.string().min(1).default("/login"),
  VITE_API_BASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  VITE_API_SCOPE: z.preprocess(emptyToUndefined, z.string().optional()),
  VITE_USE_MOCKS: z.preprocess(
    emptyToUndefined,
    z.enum(["true", "false"]).default("true"),
  ),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(raiz)"}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Configuração de ambiente inválida. Copie .env.example para .env e preencha:\n${issues}`,
  );
}

export const env = parsed.data;

// Usa mock quando pedido explicitamente OU quando não há backend configurado.
export const useMocks =
  env.VITE_USE_MOCKS === "true" || !env.VITE_API_BASE_URL;
```

- [ ] **Step 2: Criar `.env.example`**

```
# --- Entra ID (SPA) — valores atuais, já públicos no repositório; nao sao segredo numa SPA ---
VITE_MSAL_CLIENT_ID=40796f28-4c73-4ba7-a267-68118451a05c
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/4c330174-b463-400c-a84b-ee3c6b705c62
VITE_MSAL_REDIRECT_URI=/
VITE_MSAL_POST_LOGOUT_REDIRECT_URI=/login

# --- API propria — backend ainda nao existe. Deixe VITE_API_BASE_URL vazio para usar mocks. ---
VITE_API_BASE_URL=
VITE_API_SCOPE=
VITE_USE_MOCKS=true
```

- [ ] **Step 3: Criar `.env` local**

Run:
```bash
cp .env.example .env
```
Expected: arquivo `.env` criado. Confirme que `git status` **não** mostra `.env` (o `.gitignore` já cobre `.env` e `.env.*` com exceção de `.env.example`).

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc -b`
Expected: PASS (nenhum consumidor de `env` ainda; só checa que o arquivo compila).

- [ ] **Step 5: Commit**

```bash
git add src/config/env.ts .env.example
git commit -m "feat(config): env validado por Zod + .env.example"
```

---

## Task 2: Instância MSAL única + `authConfig` por ambiente

**Files:**
- Create: `src/config/msalInstance.ts`
- Modify: `src/config/authConfig.ts` (arquivo inteiro)
- Modify: `src/main.tsx` (arquivo inteiro)

- [ ] **Step 1: Reescrever `src/config/authConfig.ts`**

```ts
import { LogLevel, type Configuration } from "@azure/msal-browser";
import { env } from "./env";

export const msalConfig: Configuration = {
  auth: {
    clientId: env.VITE_MSAL_CLIENT_ID,
    authority: env.VITE_MSAL_AUTHORITY,
    redirectUri: env.VITE_MSAL_REDIRECT_URI,
    postLogoutRedirectUri: env.VITE_MSAL_POST_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      // Em produção, só erro vai para o console; em dev, erro + warning.
      logLevel: import.meta.env.PROD ? LogLevel.Error : LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

// Escopo separado, usado só na hora de buscar usuários do tenant (não no login)
export const graphUserSearchRequest = {
  scopes: ["User.ReadBasic.All"],
};

// Escopo da API própria (backend). Vazio enquanto VITE_API_SCOPE não for definido —
// nesse estado a camada api/ não é exercitada (useMocks === true).
export const apiRequest = {
  scopes: env.VITE_API_SCOPE ? [env.VITE_API_SCOPE] : [],
};
```

- [ ] **Step 2: Criar `src/config/msalInstance.ts`**

```ts
import { PublicClientApplication, EventType } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

// Instância única compartilhada entre o React (MsalProvider) e a camada api/,
// que precisa adquirir token fora do contexto de componente.
export const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const account = (event.payload as { account?: unknown }).account;
    if (account) {
      msalInstance.setActiveAccount(
        account as Parameters<typeof msalInstance.setActiveAccount>[0],
      );
    }
  }
});

export const msalReady = msalInstance.initialize();
```

- [ ] **Step 3: Reescrever `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'
import './styles/main.scss'
import './index.css'
import App from './App.tsx'
import { msalInstance, msalReady } from './config/msalInstance'

await msalReady

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>,
)
```

- [ ] **Step 4: Verificar tipos e lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS. Se `tsc` reclamar de `import.meta.env.PROD`, confirme que `tsconfig.app.json` tem `"types": ["vite/client"]` (tem).

- [ ] **Step 5: QA manual — login continua funcionando**

Run: `npm run dev`
No navegador (`http://localhost:5173`): a tela de login aparece, o botão de login redireciona para a Microsoft, e após autenticar você volta autenticado para `/projetos`. Logout leva para `/login`.

- [ ] **Step 6: Commit**

```bash
git add src/config/msalInstance.ts src/config/authConfig.ts src/main.tsx
git commit -m "refactor(auth): instância MSAL única + config por ambiente"
```

---

## Task 3: `ApiError` + `normalizeError`

**Files:**
- Create: `src/api/apiError.ts`

- [ ] **Step 1: Criar `src/api/apiError.ts`**

```ts
import { AxiosError } from "axios";
import { ZodError } from "zod";

// Erro estável para toda a aplicação consumir, independente da origem
// (HTTP com corpo de erro, HTTP sem corpo, rede/timeout, schema inválido).
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly details?: unknown;
  readonly traceId?: string;
  readonly isNetwork: boolean;

  constructor(params: {
    status: number | null;
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
    isNetwork?: boolean;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.traceId = params.traceId;
    this.isNetwork = params.isNetwork ?? false;
  }
}

// Formato de erro combinado com o backend (ver ADR 0001, seção 3.1).
interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    traceId?: string;
  };
}

function messageForStatus(status: number): string {
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Recurso não encontrado.";
  if (status >= 500) return "O servidor falhou. Tente novamente em instantes.";
  return "Não foi possível concluir a requisição.";
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError({
      status: null,
      code: "SCHEMA_MISMATCH",
      message: "A resposta do servidor veio em um formato inesperado.",
      details: err.issues,
    });
  }

  if (err instanceof AxiosError) {
    if (err.response) {
      const body = err.response.data as ErrorEnvelope | undefined;
      const status = err.response.status;
      return new ApiError({
        status,
        code: body?.error?.code ?? `HTTP_${status}`,
        message: body?.error?.message ?? messageForStatus(status),
        details: body?.error?.details,
        traceId: body?.error?.traceId,
      });
    }
    // sem response => rede, DNS, CORS, timeout
    return new ApiError({
      status: null,
      code: err.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR",
      message: "Sem resposta do servidor. Verifique a conexão.",
      isNetwork: true,
    });
  }

  return new ApiError({
    status: null,
    code: "UNKNOWN",
    message: err instanceof Error ? err.message : "Erro desconhecido.",
  });
}
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/api/apiError.ts
git commit -m "feat(api): ApiError + normalizeError"
```

---

## Task 4: Cliente HTTP, token e interceptors

**Files:**
- Create: `src/api/httpClient.ts`
- Create: `src/api/authToken.ts`
- Create: `src/api/interceptors.ts`
- Create: `src/api/client.ts`

- [ ] **Step 1: Criar `src/api/httpClient.ts`**

```ts
import axios from "axios";
import { env } from "../config/env";

// baseURL cai em "/api" quando não há backend configurado — nesse estado nada
// chama o httpClient (useMocks === true), então o valor é só um placeholder seguro.
export const httpClient = axios.create({
  baseURL: env.VITE_API_BASE_URL ?? "/api",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});
```

- [ ] **Step 2: Criar `src/api/authToken.ts`**

```ts
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "../config/msalInstance";
import { apiRequest } from "../config/authConfig";

// Access token do Entra ID para a API própria. Retorna null quando não há conta
// ou quando a aquisição silenciosa falha — a request segue sem Authorization e o
// backend responde 401, tratado no interceptor.
export async function getApiToken(): Promise<string | null> {
  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...apiRequest,
      account,
    });
    return result.accessToken;
  } catch (err) {
    if (err instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect(apiRequest);
    }
    return null;
  }
}
```

- [ ] **Step 3: Criar `src/api/interceptors.ts`**

```ts
import type { InternalAxiosRequestConfig } from "axios";
import { httpClient } from "./httpClient";
import { getApiToken } from "./authToken";
import { normalizeError } from "./apiError";
import { msalInstance } from "../config/msalInstance";
import { loginRequest } from "../config/authConfig";

type RetriableConfig = InternalAxiosRequestConfig & { __retried?: boolean };

httpClient.interceptors.request.use(async (config) => {
  const token = await getApiToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = normalizeError(error);

    if (apiError.status === 401) {
      const original = error.config as RetriableConfig | undefined;
      if (original && !original.__retried) {
        original.__retried = true;
        const token = await getApiToken();
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return httpClient.request(original);
        }
      }
      // Sem token novo => manda para o login.
      await msalInstance.acquireTokenRedirect(loginRequest);
    }

    return Promise.reject(apiError);
  },
);
```

- [ ] **Step 4: Criar `src/api/client.ts`**

```ts
// Ponto de entrada da camada api/: importar daqui garante que os interceptors
// foram registrados antes do primeiro request.
import "./interceptors";
export { httpClient } from "./httpClient";
```

- [ ] **Step 5: Verificar tipos e lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS. Se `tsc` reclamar do tipo de `error.config` no interceptor, confirme o cast `as RetriableConfig | undefined` (já presente).

- [ ] **Step 6: Commit**

```bash
git add src/api/httpClient.ts src/api/authToken.ts src/api/interceptors.ts src/api/client.ts
git commit -m "feat(api): httpClient + getApiToken + interceptors"
```

---

## Task 5: Schemas Zod

**Files:**
- Create: `src/api/schemas/common.ts`
- Create: `src/api/schemas/project.ts`

- [ ] **Step 1: Criar `src/api/schemas/common.ts`**

```ts
import { z } from "zod";

// Envelope de paginação combinado com o backend (ver ADR 0001, seção 3.2).
export function paginated<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  });
}

export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    traceId: z.string().optional(),
  }),
});
```

- [ ] **Step 2: Criar `src/api/schemas/project.ts`**

```ts
import { z } from "zod";
import type { Project } from "../../types/project";

const teamMemberSchema = z.object({
  id: z.string().optional(),
  initials: z.string(),
  name: z.string(),
  email: z.string().optional(),
  role: z.enum(["Gestor de Projetos", "Tester", "Desenvolvedor"]),
});

// `satisfies` garante em tempo de compilação que o schema não divergiu do tipo
// de domínio em src/types/project.ts. Se o tipo mudar e o schema não, tsc quebra.
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  mode: z.enum(["uat", "cutover"]),
  activityCount: z.number(),
  completedCount: z.number(),
  hierarchyLevels: z.array(z.string()),
  progressPercent: z.number(),
  spi: z.number().nullable(),
  team: z.array(teamMemberSchema),
  updatedAt: z.string(),
}) satisfies z.ZodType<Project>;
```

- [ ] **Step 3: Verificar tipos e lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS. Se `satisfies z.ZodType<Project>` falhar, o schema está divergente do tipo — ajuste o schema (não o tipo) até compilar.

- [ ] **Step 4: Commit**

```bash
git add src/api/schemas/common.ts src/api/schemas/project.ts
git commit -m "feat(api): schemas Zod (common + project)"
```

---

## Task 6: Recurso de projetos

**Files:**
- Create: `src/api/resources/projects.ts`

- [ ] **Step 1: Criar `src/api/resources/projects.ts`**

```ts
import { z } from "zod";
import { httpClient } from "../client";
import { projectSchema } from "../schemas/project";
import type { Project } from "../../types/project";

// Só o caminho de LEITURA está definido. Criação/edição de membros seguem mock
// no useProjects até existir endpoint para testar (ver ADR 0001, seção 6.3).
export const projectsApi = {
  async list(): Promise<Project[]> {
    const { data } = await httpClient.get("/projects");
    return z.array(projectSchema).parse(data);
  },
};
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/api/resources/projects.ts
git commit -m "feat(api): projectsApi.list (leitura)"
```

---

## Task 7: Migração de referência — `useProjects` + `ProjectsPage`

**Files:**
- Modify: `src/hooks/useProjects.ts`
- Modify: `src/pages/ProjectsPage.tsx`

- [ ] **Step 1: Modificar `src/hooks/useProjects.ts` — imports (linhas 1-3)**

Substituir:
```ts
import { useMemo, useState } from "react";
import type { NewProjectInput, Project, ProjectStats, TeamMember, UserRole } from "../types/project";
import { getInitials } from "../utils/initials";
```
por:
```ts
import { useEffect, useMemo, useState } from "react";
import type { NewProjectInput, Project, ProjectStats, TeamMember, UserRole } from "../types/project";
import { getInitials } from "../utils/initials";
import { useMocks } from "../config/env";
import { projectsApi } from "../api/resources/projects";
import { ApiError, normalizeError } from "../api/apiError";
```

- [ ] **Step 2: Modificar `src/hooks/useProjects.ts` — interface de retorno (linhas 109-115)**

Substituir a interface `UseProjectsResult` por:
```ts
interface UseProjectsResult {
  projects: Project[];
  stats: ProjectStats;
  loading: boolean;
  error: ApiError | null;
  createProject: (input: NewProjectInput) => void;
  addTeamMember: (projectId: string, member: TeamMember) => void;
  replaceTeamMemberRoles: (projectId: string, memberName: string, roles: UserRole[]) => void;
}
```

- [ ] **Step 3: Modificar `src/hooks/useProjects.ts` — corpo do hook (a partir de `export function useProjects`)**

Substituir a linha:
```ts
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
```
por:
```ts
  // useMocks === true: seed local, síncrono. useMocks === false: busca na API.
  const [projects, setProjects] = useState<Project[]>(useMocks ? INITIAL_PROJECTS : []);
  const [loading, setLoading] = useState<boolean>(!useMocks);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    if (useMocks) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectsApi
      .list()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err : normalizeError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
```

- [ ] **Step 4: Modificar `src/hooks/useProjects.ts` — return (linha final do hook)**

Substituir:
```ts
  return { projects, stats, createProject, addTeamMember, replaceTeamMemberRoles };
```
por:
```ts
  return { projects, stats, loading, error, createProject, addTeamMember, replaceTeamMemberRoles };
```

- [ ] **Step 5: Modificar `src/pages/ProjectsPage.tsx` — consumir `loading`/`error`**

Substituir (linha 12):
```ts
  const { projects, stats, createProject } = useProjects();
```
por:
```ts
  const { projects, stats, createProject, loading, error } = useProjects();
```

Substituir (linha 65):
```tsx
      <ProjectsTable projects={filteredProjects} onOpenTeam={setTeamModalMembers} />
```
por:
```tsx
      {error ? (
        <div className="page-state page-state--error">
          Não foi possível carregar os projetos.{" "}
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </div>
      ) : loading ? (
        <div className="page-state">Carregando projetos…</div>
      ) : (
        <ProjectsTable projects={filteredProjects} onOpenTeam={setTeamModalMembers} />
      )}
```

- [ ] **Step 6: Verificar tipos, lint e build**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: PASS. `eslint-plugin-react-hooks` pode sugerir incluir `useMocks` nas deps do `useEffect` — não incluir: é constante de módulo. Se virar erro (não warning), trocar a linha do array de deps por:
```ts
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 7: QA manual — caminho mock inalterado**

Run: `npm run dev`
Com `.env` tendo `VITE_API_BASE_URL=` (vazio): `/projetos` carrega os 6 projetos seed exatamente como antes, sem flash de "Carregando", filtros e modal de time funcionando.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useProjects.ts src/pages/ProjectsPage.tsx
git commit -m "feat(projects): useProjects com caminho de API atrás de useMocks"
```

---

## Task 8: Encoding do parâmetro de busca do Graph

**Files:**
- Modify: `src/hooks/useGraphUserSearch.ts:44` (a linha que monta `url`)

- [ ] **Step 1: Substituir a construção da URL**

Trocar:
```ts
      const url = `https://graph.microsoft.com/v1.0/users?$search="displayName:${query}"&$select=id,displayName,mail,userPrincipalName&$top=8`;
```
por:
```ts
      // Remove aspas do input (quebrariam o valor entre aspas do $search) e
      // encoda o valor inteiro — evita OData injection e erro de request.
      const term = query.replace(/"/g, "").trim();
      const searchValue = encodeURIComponent(`"displayName:${term}"`);
      const url = `https://graph.microsoft.com/v1.0/users?$search=${searchValue}&$select=id,displayName,mail,userPrincipalName&$top=8`;
```

- [ ] **Step 2: Verificar tipos e lint**

Run: `npx tsc -b && npm run lint`
Expected: PASS.

- [ ] **Step 3: QA manual — busca de usuário ainda funciona**

Run: `npm run dev`
Autenticado, abra o modal "Novo projeto" → campo de busca de pessoas → digite pelo menos 2 letras de um nome do tenant. A lista de resultados aparece. Teste também digitar uma aspa (`"`) no meio — não deve quebrar a request (antes quebrava).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useGraphUserSearch.ts
git commit -m "fix(security): encoda parâmetro de busca do Graph"
```

---

## Task 9: CSP via `<meta>` no build

**Files:**
- Modify: `vite.config.ts` (arquivo inteiro)

- [ ] **Step 1: Reescrever `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CSP inicial. `frame-ancestors` e `X-Frame-Options` NÃO funcionam via <meta> —
// precisam de header HTTP no hosting (ver docs/security/headers.md).
// Injetada só no build: em dev o Vite usa scripts inline / eval para HMR.
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com",
  "frame-src https://login.microsoftonline.com",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ')

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-csp-meta',
      apply: 'build',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  </head>`,
        )
      },
    },
  ],
})
```

- [ ] **Step 2: Build e preview**

Run: `npm run build && npm run preview`
Abra a URL do preview. No `dist/index.html` confirme que a `<meta http-equiv="Content-Security-Policy">` está presente.

- [ ] **Step 3: QA manual — nada quebrou com a CSP ativa**

No preview, com o DevTools aberto (aba Console):
- A página carrega com estilos e fontes corretos (sem erro `Refused to load ... font/style`).
- Login redireciona para a Microsoft e volta autenticado (silent token via iframe para `login.microsoftonline.com` — coberto por `frame-src`).
- `/projetos` carrega; abrir "Novo projeto" e buscar uma pessoa retorna resultados (chamada a `graph.microsoft.com` — coberta por `connect-src`).
- Fotos de avatar aparecem (blob — coberto por `img-src blob:`).
- Se aparecer algum `Refused to ...` no console, adicione a origem ao diretiva correspondente do `csp` e rebuild.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "feat(security): CSP via meta no build"
```

---

## Task 10: Script `npm run audit`

**Files:**
- Modify: `package.json` (bloco `scripts`)

- [ ] **Step 1: Adicionar o script**

No bloco `"scripts"`, após a linha do `"lint"`, adicionar:
```json
    "audit": "npm audit --omit=dev",
```
Resultado do bloco:
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "audit": "npm audit --omit=dev",
    "preview": "vite preview"
  },
```

- [ ] **Step 2: Rodar uma vez e registrar o resultado**

Run: `npm run audit`
Expected: executa. Anote o número de vulnerabilidades reportadas para referência no documento de audit (Task 12) — em especial qualquer coisa relacionada a `xlsx`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore(security): script npm run audit"
```

---

## Task 11: ADR — Integração com o backend

**Files:**
- Create: `docs/adr/0001-integracao-backend.md`

- [ ] **Step 1: Criar `docs/adr/0001-integracao-backend.md` com o conteúdo abaixo**

```markdown
# ADR 0001 — Integração do frontend HIVE com o backend

**Data:** 2026-08-27
**Status:** Aceito (revisável quando o backend começar)
**Contexto:** o projeto é feito em duas fases — 1º o frontend com dados mockados, 2º o backend. Este ADR registra as decisões de integração para orientar quem for construir o backend (dev humano ou IA).

## Decisões

### 1. Autenticação front → API: access token do Entra ID
- Registrar uma **app registration separada para a API** no Entra ID, expondo o scope `api://<api-app-id>/access_as_user`.
- A SPA existente (`clientId` 40796f28-4c73-4ba7-a267-68118451a05c) recebe permissão delegada para esse scope.
- O front adquire o token com `acquireTokenSilent({ scopes: [<api-scope>] })` e envia `Authorization: Bearer <token>` em cada request.
- Fallback: `acquireTokenRedirect` quando o MSAL lança `InteractionRequiredAuthError`.
- Configurado no front via `VITE_API_SCOPE`.

### 2. Topologia: domínio separado, sem cookie
- API em domínio próprio, endereço no front via `VITE_API_BASE_URL`.
- Autenticação **somente por Bearer token**. Sem cookie de sessão → **CSRF não faz parte do modelo de ameaça**.
- CORS configurado no backend com allowlist explícita das origens do front (dev e produção). Sem `Access-Control-Allow-Origin: *`.
- Se no futuro entrar um BFF / reverse-proxy servindo front e API no mesmo domínio, reavaliar migração para cookie `HttpOnly; Secure; SameSite=Strict` (elimina token em JS).

### 3. Contrato de dados: REST/JSON
- Status HTTP semântico (200/201/204, 400/401/403/404/409, 500).
- Datas sempre **ISO 8601 em UTC** (`2026-08-27T14:30:00Z`).
- Versionamento de rota a definir (sugestão: prefixo `/v1`).

#### 3.1. Envelope de erro
```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Projeto não encontrado.",
    "details": [{ "field": "id", "issue": "não existe" }],
    "traceId": "00-abc123-def456-01"
  }
}
```
- `code`: string estável em `SCREAMING_SNAKE_CASE`; o front ramifica comportamento por ela, nunca pela mensagem.
- `message`: texto em português, exibível ao usuário final.
- `details`: opcional; erros de validação campo a campo.
- `traceId`: opcional; idealmente o `traceparent` do W3C Trace Context, para correlação com logs.

#### 3.2. Paginação
```json
{ "items": [], "page": 1, "pageSize": 20, "total": 137 }
```
- Query params: `?page=1&pageSize=20`.
- Listas pequenas e estáveis (papéis, níveis de hierarquia) podem retornar array simples sem envelope.

### 4. Validação de resposta no cliente
- Cada recurso tem um schema Zod em `src/api/schemas/`.
- O cliente faz `schema.parse` antes de entregar ao hook; divergência vira `ApiError` de código `SCHEMA_MISMATCH` (log + aviso), nunca tela quebrada em silêncio.

### 5. Tipos
- O DTO (`z.infer` do schema) começa idêntico ao tipo de domínio em `src/types/`.
- Só diverge, com mapper explícito, quando o backend impuser formato diferente do que a UI usa.

### 6. Tratamento de erros HTTP (interceptor de resposta)
- **401** → uma tentativa de renovar token via `acquireTokenSilent` e refazer a request; se ainda 401, `acquireTokenRedirect` para o login.
- **403** → `ApiError` com código de permissão, exibível na tela.
- **5xx / timeout / rede** → `ApiError` genérico com opção de retry manual.
- **Sem retry automático** nesta fase.

## Responsabilidades do backend (não são do front)

O `ProtectedRoute` do front apenas evita renderizar telas para quem não está logado. **Não é controle de acesso.** O backend DEVE validar em toda requisição:
- assinatura do token contra o JWKS do tenant Entra;
- `aud` = app registration da API;
- `iss` = `https://login.microsoftonline.com/4c330174-b463-400c-a84b-ee3c6b705c62/v2.0`;
- `exp` / `nbf`;
- claim `scp` contendo `access_as_user`;
- **autorização de negócio** (o usuário X pode ver/editar o projeto Y?) — o front não faz e não tem como fazer com segurança.

## Recursos que o frontend vai consumir

Formato dos objetos: ver `src/types/` (`project.ts`, `activity.ts`, `issue.ts`, `activityLog.ts`, `projectConfig.ts`). Caminhos de endpoint a definir com o backend.

| Recurso | Operações que o front precisa | Hook de origem |
|---|---|---|
| Projetos | listar, obter por id, criar, adicionar membro, trocar papéis de membro | `useProjects` |
| Atividades | listar por projeto, obter por id, criar, importar em massa, ações de status, ações em massa | `useActivities` |
| Issues | listar por projeto, obter por id, registrar, ações de status | `useIssues` |
| Log de atividades | listar por projeto | `useActivityLog` |
| Config do projeto | obter/salvar papéis e limiares de aging | `ProjectConfigContext`, `useProjectAgingThresholds` |
| Curva S | série de dados por projeto | `useCurvaSData` |

Busca de usuários do tenant e foto de perfil **continuam indo direto ao Microsoft Graph** pelo front — não precisam de endpoint no backend.

## Em aberto (confirmar com o time de backend)
- Caminhos e nomes exatos dos endpoints.
- BFF / reverse-proxy no mesmo domínio? (muda decisão 2).
- Autorização fina por `scp` (scopes) ou `roles` no token.
- Estratégia de versionamento da API.

## Receita: migrar um hook mockado para a API

O `useProjects` é o exemplo de referência (só o caminho de leitura). Para os demais:

1. Criar `src/api/schemas/<recurso>.ts` espelhando o tipo de domínio, com `satisfies z.ZodType<Tipo>`.
2. Criar `src/api/resources/<recurso>.ts` com as operações de leitura, usando `httpClient` de `src/api/client.ts` e `schema.parse`.
3. No hook: manter o seed mock; adicionar `useState` para `loading`/`error`; num `useEffect`, se `!useMocks`, chamar o resource e preencher estado; no caminho `useMocks` manter tudo síncrono como hoje.
4. Ajustar a página consumidora para tratar `loading` (estado de carregando) e `error` (estado de erro com retry).
5. Verificar: `npx tsc -b && npm run lint && npm run build` + QA manual com `VITE_API_BASE_URL` vazio (o comportamento mock não pode mudar).
6. Mutações (criar/editar): só depois que existir endpoint para testar.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0001-integracao-backend.md
git commit -m "docs(adr): 0001 integração com o backend"
```

---

## Task 12: Documento de audit de segurança

**Files:**
- Create: `docs/security/2026-08-27-audit-frontend.md`

- [ ] **Step 1: Criar `docs/security/2026-08-27-audit-frontend.md` com o conteúdo abaixo**

> Antes de salvar, substitua o `<preencher: resultado de npm run audit>` na seção "Alto" pelo número real obtido na Task 10, Step 2.

```markdown
# Audit de segurança — Frontend HIVE

**Data:** 2026-08-27
**Escopo:** frontend React/Vite na fase pré-backend. Avalia config, autenticação client-side, exposição a XSS, dependências e cadeia de suprimentos. Não cobre backend (inexistente).
**Legenda de classe:** **aplicar agora** (feito nesta branch) · **documentar** · **tarefa futura**.

## Resumo

| Severidade | Achados |
|---|---|
| Alto | 1 (`xlsx` desatualizado) |
| Médio | 4 (config de ambiente, CSP/headers, encoding do Graph, `npm audit`) |
| Baixo / informativo | 6 |

## Alto

### A1 — `xlsx` (SheetJS) 0.18.5 processa upload do usuário
- **Onde:** `src/components/activities/ImportActivitiesModal.tsx` (`XLSX.read` sobre `ArrayBuffer` do arquivo escolhido), `src/utils/activityImport.ts`, `src/utils/downloadXlsx.ts`.
- **Problema:** a versão publicada no npm (`0.18.5`) está defasada. Advisories conhecidos: *prototype pollution* (CVE-2023-30533, corrigido em 0.19.3) e *ReDoS* (CVE-2024-22363, corrigido em 0.20.2). O SheetJS deixou de publicar no npm — as correções vivem só na distribuição oficial deles.
- **`npm run audit` reporta:** `<preencher: resultado de npm run audit>`.
- **Impacto:** um `.xlsx`/`.xls` malicioso aberto na tela de importação pode poluir `Object.prototype` no browser da vítima ou travar a aba. Processamento é 100% client-side (não atinge servidor), mas atinge quem importa.
- **Ação recomendada:** migrar para a distribuição oficial do SheetJS (`https://cdn.sheetjs.com/` — tarball versionado, fora do registro npm) **ou** trocar por `exceljs` (mantida no npm). Requer revisão e QA próprios do fluxo de importação (parsing de datas, colunas, mensagens de erro).
- **Classe:** documentar + tarefa futura. Não foi feita nesta branch por ser troca de dependência que lê entrada não confiável — merece PR dedicado.

## Médio

### M1 — Configuração de ambiente inexistente (corrigido)
- **Antes:** `clientId`, `authority`, `redirectUri` hardcoded em `src/config/authConfig.ts`; instância MSAL criada inline em `main.tsx`.
- **Problema:** não são segredos numa SPA pública, mas impedem dev/prod com app registrations e redirect URIs distintos, e aumentam o risco de publicar apontando para o tenant errado.
- **Ação aplicada:** `src/config/env.ts` (validação Zod, *fail-fast* no boot), `.env.example`, `authConfig.ts` lendo de `env`, instância única em `src/config/msalInstance.ts`.
- **Classe:** aplicar agora — feito.

### M2 — Sem CSP nem cabeçalhos de segurança (parcialmente corrigido)
- **Problema:** nenhuma `Content-Security-Policy`; nenhum `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security`. Sem defesa em profundidade contra XSS e clickjacking.
- **Ação aplicada:** CSP inicial injetada via `<meta http-equiv>` no build (`vite.config.ts`, plugin `html-csp-meta`). Diretivas: `default-src 'self'`, `script-src 'self'`, `connect-src` liberando `login.microsoftonline.com` e `graph.microsoft.com`, `frame-src` para o iframe silencioso do MSAL, `img-src ... blob:` para fotos.
- **Pendente (documentado em `docs/security/headers.md`):** `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security` — só funcionam como header HTTP, dependem do hosting escolhido. `style-src` mantém `'unsafe-inline'` (fontsource + estilos inline do React/Chart.js); apertar isso é trabalho futuro.
- **Classe:** aplicar agora (parcial) + documentar.

### M3 — Parâmetro de busca do Graph sem encoding (corrigido)
- **Onde:** `src/hooks/useGraphUserSearch.ts`.
- **Antes:** `query` do usuário interpolada direto em `$search="displayName:${query}"` na URL.
- **Problema:** OData injection (risco baixo — escopo de leitura, API do Graph) e quebra funcional se o usuário digitar aspas.
- **Ação aplicada:** remoção de aspas do input + `encodeURIComponent` do valor de `$search`.
- **Classe:** aplicar agora — feito.

### M4 — `npm audit` fora do fluxo (corrigido)
- **Problema:** vulnerabilidades de dependência passavam despercebidas.
- **Ação aplicada:** script `npm run audit` (`npm audit --omit=dev`) no `package.json`; nota no README.
- **Recomendação futura:** Dependabot ou Renovate quando o repositório tiver CI.
- **Classe:** aplicar agora — feito.

## Baixo / informativo

### B1 — `ProtectedRoute` é guard client-side only
Correto para UX; **não** é controle de acesso. Toda autorização real (validação de token: assinatura, `aud`, `iss`, `exp`, `scp`; e autorização de negócio) é responsabilidade do backend — ver ADR 0001. Documentar, sem ação no front.

### B2 — MSAL cache em `sessionStorage`
Correto: some ao fechar a aba, menos exposto a XSS que `localStorage`. **Não migrar para `localStorage`.**

### B3 — Blob URLs de foto não revogadas
`src/hooks/usePersonPhoto.ts` cria `URL.createObjectURL` e nunca chama `URL.revokeObjectURL`. É vazamento de memória, não de segurança. Não corrigido agora: o `photoCache` reusa a URL entre montagens; revogar no unmount quebraria o cache. Anotado para eventual redesenho do cache.

### B4 — Logger do MSAL no console em produção (corrigido)
`authConfig.ts` agora define `logLevel: import.meta.env.PROD ? LogLevel.Error : LogLevel.Warning`.

### B5 — Sem Subresource Integrity
Não aplicável: bundle Vite servido de 'self', sem `<script>`/`<link>` de CDN. Se um CDN entrar no futuro, adicionar `integrity`.

### B6 — Toolchain em versões muito recentes
Vite 8, TypeScript 6, ESLint 10. Manter `package-lock.json` versionado e íntegro; adotar `npm ci` quando houver CI para builds reproduzíveis.

## Itens sem achado (verificados)
- Nenhum uso de `dangerouslySetInnerHTML` em `src/`.
- Nenhum uso de `eval`/`new Function` no código da aplicação.
- `.gitignore` cobre `.env` e `.env.*` (mantém `.env.example`); nenhum segredo real no repositório (os IDs do Entra numa SPA são públicos por natureza).
```

- [ ] **Step 2: Commit**

```bash
git add docs/security/2026-08-27-audit-frontend.md
git commit -m "docs(security): audit do frontend 2026-08-27"
```

---

## Task 13: Documento de cabeçalhos de segurança

**Files:**
- Create: `docs/security/headers.md`

- [ ] **Step 1: Criar `docs/security/headers.md` com o conteúdo abaixo**

```markdown
# Cabeçalhos de segurança — HIVE frontend

A CSP inicial já é injetada como `<meta http-equiv>` no build (`vite.config.ts`).
Este documento lista o **conjunto completo** de cabeçalhos que o hosting deve
enviar como **header HTTP** — vários (`frame-ancestors`, `X-Content-Type-Options`,
`Referrer-Policy`, `Strict-Transport-Security`) **não têm efeito via `<meta>`**.

Aplicar quando o hosting estiver definido. O backend, quando existir, deve enviar
os seus próprios headers (esta lista é só para os assets estáticos do front).

## Conjunto recomendado

| Header | Valor sugerido | Por quê |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; frame-src https://login.microsoftonline.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'` | Igual à `<meta>` do build + `frame-ancestors 'none'` (só válido como header) |
| `X-Content-Type-Options` | `nosniff` | Impede MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Não vaza path/query para terceiros |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Força HTTPS (só sob HTTPS válido) |
| `X-Frame-Options` | `DENY` | Anti-clickjacking para navegadores sem `frame-ancestors` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Desliga APIs não usadas |

> `style-src` mantém `'unsafe-inline'` por causa das fontes (`@fontsource`) e de
> estilos inline do React/Chart.js. Endurecer (nonces/hashes) é trabalho futuro.

## Exemplo — Azure Static Web Apps (`staticwebapp.config.json`)

```json
{
  "globalHeaders": {
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; frame-src https://login.microsoftonline.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
  },
  "navigationFallback": { "rewrite": "/index.html" }
}
```

## Exemplo — Nginx

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com; frame-src https://login.microsoftonline.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

location / {
  try_files $uri $uri/ /index.html;
}
```

## Ao adicionar o backend

- `connect-src` precisará incluir a origem da API (`https://api.<dominio>`).
- Se a API entrar como reverse-proxy no mesmo domínio (`/api`), `connect-src 'self'` já cobre.
- Revisar `frame-src`/`frame-ancestors` se algum fluxo novo usar iframe.
```

- [ ] **Step 2: Commit**

```bash
git add docs/security/headers.md
git commit -m "docs(security): conjunto de cabeçalhos + exemplos de hosting"
```

---

## Task 14: Atualizar o README

**Files:**
- Modify: `README.md` (arquivo inteiro)

- [ ] **Step 1: Substituir `README.md` pelo conteúdo abaixo**

```markdown
# HIVE — Frontend

HIVE (Homologation and Integrated Validation Environment) é o front-end de uma
plataforma de gestão de projetos de UAT (User Acceptance Testing) para a FUMEP/EEP.

## Tecnologias

* React 19 + TypeScript
* Vite
* React Router v8
* SCSS puro (sem Bootstrap)
* `@azure/msal-browser` / `@azure/msal-react` — login SSO via Entra ID (Azure AD)
* Chart.js v4 (uso direto, sem `react-chartjs-2`)
* Zod — validação
* Axios — cliente HTTP (camada `src/api/`)
* **Sem suíte de testes automatizados** — decisão deliberada do projeto. Verificação é `npx tsc -b` + `npm run build` + QA manual.

## Pré-requisitos

* Git, Node.js, npm
* Visual Studio Code (recomendado)

```powershell
git --version
node --version
npm --version
```

## Instalação

```powershell
npm install
```

`node_modules/` não vai para o Git; recrie com `npm install`. Mantenha o
`package-lock.json` versionado.

## Configuração de ambiente

Copie o modelo e ajuste se necessário:

```powershell
copy .env.example .env
```

| Variável | Descrição |
|---|---|
| `VITE_MSAL_CLIENT_ID` | Client ID da app registration (SPA) no Entra ID |
| `VITE_MSAL_AUTHORITY` | `https://login.microsoftonline.com/<tenant-id>` |
| `VITE_MSAL_REDIRECT_URI` | Redirect URI registrado (padrão `/`) |
| `VITE_MSAL_POST_LOGOUT_REDIRECT_URI` | Destino após logout (padrão `/login`) |
| `VITE_API_BASE_URL` | Endereço do backend. **Vazio = usa dados mockados.** |
| `VITE_API_SCOPE` | Scope da API própria (`api://<api-app-id>/access_as_user`) |
| `VITE_USE_MOCKS` | `true`/`false`. Força mock mesmo com `VITE_API_BASE_URL` definido. |

O `.env` não é versionado. `src/config/env.ts` valida as variáveis no boot e
falha com mensagem clara se faltar algo.

## Scripts

```powershell
npm run dev      # servidor de desenvolvimento (porta 5173)
npm run build    # tsc -b && vite build
npm run preview  # serve o build de produção
npm run lint     # eslint .
npm run audit    # npm audit --omit=dev (vulnerabilidades de dependências)
```

## Estrutura

```text
src/
├── api/          # camada HTTP: client, token, interceptors, schemas Zod, resources
├── assets/       # imagens, ícones, estáticos
├── components/   # componentes visuais por feature
├── config/       # env, MSAL (authConfig, msalInstance)
├── context/      # React context providers
├── hooks/        # hooks de dados (hoje mockados; useProjects tem caminho de API)
├── layouts/      # estruturas compartilhadas entre páginas
├── pages/        # páginas completas
├── routes/       # roteamento (React Router)
├── styles/       # SCSS e cores
├── types/        # tipos e interfaces TypeScript
├── utils/        # funções auxiliares puras
└── validations/  # schemas Zod de formulários
```

## Integração com o backend

O backend será construído numa segunda fase. As decisões de contrato,
autenticação e a receita para migrar cada hook mockado estão em
`docs/adr/0001-integracao-backend.md`. Enquanto `VITE_API_BASE_URL` estiver
vazio, todo o app roda com dados mockados dos hooks em `src/hooks/`.

## Segurança

Audit do frontend em `docs/security/2026-08-27-audit-frontend.md`.
Cabeçalhos de segurança para o hosting em `docs/security/headers.md`.

## Fluxo de trabalho (specs → planos → implementação)

Cada feature passa por brainstorm → spec (`docs/superpowers/specs/`) →
plano (`docs/superpowers/plans/`) → implementação → PR. Leia as specs e planos
existentes antes de propor algo novo.
```

- [ ] **Step 2: Verificar build completo**

Run: `npx tsc -b && npm run lint && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: README alinhado ao estado real do projeto"
```

---

## Verificação final da branch

- [ ] `npx tsc -b` — PASS
- [ ] `npm run lint` — PASS
- [ ] `npm run build` — PASS
- [ ] `npm run audit` — executa; achados registrados no documento de audit
- [ ] `npm run dev` com `VITE_API_BASE_URL=` vazio: login, `/projetos`, dashboard, atividades, issues e busca de pessoas funcionam **igual a antes** (nenhuma regressão visível)
- [ ] `npm run preview` (build): DevTools sem erros de CSP; login, projetos e busca de pessoas funcionam
- [ ] `git status` não mostra `.env`
- [ ] Arquivos criados: `src/config/env.ts`, `src/config/msalInstance.ts`, `src/api/{apiError,httpClient,authToken,interceptors,client}.ts`, `src/api/schemas/{common,project}.ts`, `src/api/resources/projects.ts`, `.env.example`, `docs/adr/0001-integracao-backend.md`, `docs/security/2026-08-27-audit-frontend.md`, `docs/security/headers.md`

---

## Self-review notes (do autor do plano)

- **Cobertura da spec:** seção 3 (ADR) → Task 11; seção 4 (camada api/) → Tasks 3–6; seção 5 (env) → Tasks 1–2; seção 6 (migração useProjects) → Task 7; seção 7 (audit + correções) → Tasks 8–10, 12–13; seção 9 (README) → Task 14. Sem lacunas.
- **Fora de escopo confirmado:** troca do `xlsx` (documentada em A1, não implementada); migração dos outros hooks (receita no ADR); headers no hosting (documento, não código); mutações de `useProjects` (seguem mock).
- **Consistência de tipos:** `getApiToken(): Promise<string | null>` usado igual no interceptor; `ApiError` (classe) importada em `apiError.ts`, `interceptors.ts`, `useProjects.ts`; `projectSchema` de `schemas/project.ts` consumido em `resources/projects.ts`; `useMocks`/`env` de `config/env.ts` consumidos em `httpClient.ts`, `authConfig.ts`, `useProjects.ts`.
- **Risco conhecido:** CSP pode precisar de ajuste fino no primeiro `npm run preview` (Task 9, Step 3 cobre o loop de ajuste). `satisfies z.ZodType<Project>` pode exigir acerto do schema (Task 5, Step 3 cobre).
```
