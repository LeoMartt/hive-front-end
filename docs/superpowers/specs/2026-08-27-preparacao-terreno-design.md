# Preparação de terreno para o backend + audit de segurança do frontend

**Data:** 2026-08-27
**Branch:** `fabretti_preparacao-terreno`
**Status:** aprovado (brainstorm) — pendente plano de implementação

---

## 1. Contexto

O HIVE está sendo construído em duas fases: **1º o frontend inteiro com dados mockados, 2º o backend**. Hoje o frontend está avançado (login SSO, projetos, dashboard, atividades, issues, config), mas **nenhuma tela fala com uma API real** — todo dado vem de mock hooks (`useProjects`, `useActivities`, `useIssues`, `useActivityLog`, ...) que carregam seed data escrito à mão e derivam estatísticas via `useMemo`. Os hooks já recebem `projectId` como parâmetro (hoje ignorado com `void projectId`), antecipando a troca.

As únicas chamadas de rede reais atuais são ao **Microsoft Graph** (`useGraphUserSearch` para buscar usuários do tenant, `usePersonPhoto` para foto de perfil), feitas com `fetch` direto + `acquireTokenSilent` do MSAL.

Esta branch **não integra nenhum backend** (ele ainda não existe). O objetivo é deixar o terreno pronto — decisões registradas, encanamento de API criado, uma migração de referência feita — e fazer um audit de segurança apropriado para o estágio atual, aplicando as correções de baixo risco.

### 1.1. Estado atual relevante

| Item | Situação hoje |
|---|---|
| `src/api/`, `src/validations/` | Vazias (só `.gitkeep`) |
| `axios` | No `package.json`, nunca importado |
| Config MSAL (`src/config/authConfig.ts`) | `clientId`, `authority`, `redirectUri` **hardcoded** |
| Instância MSAL | Criada inline em `src/main.tsx` |
| Guard de rota (`src/routes/ProtectedRoute.tsx`) | Client-side only, via `useIsAuthenticated` |
| Cache MSAL | `sessionStorage` (correto) |
| `.gitignore` | Já cobre `.env` e `.env.*` (mantém `.env.example`) |
| `.env.example` | Não existe |
| CSP / cabeçalhos de segurança | Inexistentes |
| `npm audit` no fluxo | Não há |
| README | Desatualizado (cita Bootstrap, que foi removido) |
| `xlsx` (SheetJS) `0.18.5` | Usado para **ler upload de planilha do usuário** (`ImportActivitiesModal`) e gerar arquivos |

---

## 2. Objetivos e não-objetivos

### Objetivos

1. Registrar as decisões de integração front↔backend num ADR que sirva de **contrato para quem for construir o backend** (dev humano ou IA).
2. Criar a camada `src/api/` mínima e testável: cliente HTTP, aquisição de token para API própria, interceptors, erro normalizado, validação de resposta com Zod.
3. Introduzir configuração por ambiente (`.env` + `.env.example`), com uma chave que alterna mock ↔ API real sem mexer em código.
4. Migrar **um** hook (`useProjects`) ponta a ponta como padrão vivo, e documentar a receita para os demais.
5. Produzir um audit de segurança do frontend com achados priorizados, aplicando as correções de baixo risco.
6. Atualizar o README para refletir a realidade do projeto.

### Não-objetivos

- Integrar qualquer endpoint real (backend não existe).
- Migrar os outros hooks além do `useProjects`.
- Migrar o caminho de **mutação** (`createProject`, `addTeamMember`, `replaceTeamMemberRoles`) para API — só o caminho de **leitura** (`list`). Mutações permanecem mock, com endpoints esperados documentados no ADR.
- Trocar a biblioteca `xlsx` — decisão registrada no audit como tarefa separada.
- Configurar cabeçalhos de segurança no hosting (não há hosting definido) — apenas documentar e aplicar o que couber no `index.html`.
- Introduzir suíte de testes automatizados (decisão deliberada e repetida do projeto).

---

## 3. ADR — Decisões de integração com o backend

Arquivo entregável: `docs/adr/0001-integracao-backend.md` (nova pasta `docs/adr/`).

| # | Decisão | Detalhe |
|---|---|---|
| 1 | **AuthN front → API** | Access token do **Entra ID**. Registrar uma **app registration separada para a API**, expondo o scope `api://<api-app-id>/access_as_user`. A SPA existente ganha permissão delegada para esse scope. O front adquire o token com `acquireTokenSilent({ scopes: [<api-scope>] })` e envia `Authorization: Bearer <token>` em cada request. Fallback: `acquireTokenRedirect` em `InteractionRequiredAuthError`. |
| 2 | **Topologia** | Domínio separado para a API (`VITE_API_BASE_URL`). Autenticação **só via Bearer token**, sem cookies de sessão → **CSRF sai do modelo de ameaça**. CORS configurado no backend com allowlist explícita de origens (dev e prod). |
| 3 | **Contrato de dados** | REST/JSON, status HTTP semântico. Envelope de erro padrão (ver 3.1). Paginação padrão (ver 3.2). Datas sempre **ISO 8601 em UTC** (`2026-08-27T14:30:00Z`). |
| 4 | **Validação de resposta** | Cada recurso tem um schema **Zod** em `src/api/schemas/`. O cliente faz `schema.parse(data)` antes de entregar ao hook. Falha de schema = erro tratado (log + aviso ao usuário), nunca tela quebrada silenciosamente. |
| 5 | **Tipos** | O DTO (`z.infer` do schema) começa **idêntico** ao tipo de domínio em `src/types/`. Só diverge (com um mapper explícito) quando o backend impuser um formato diferente do que a UI usa. |
| 6 | **Tratamento de 401 / 403 / 5xx / rede** | Interceptor de resposta: **401** → uma tentativa de renovar token via `acquireTokenSilent`; se falhar, redirect para login. **403** → `ApiError` com código de permissão, exibível na tela. **5xx / timeout / rede** → `ApiError` genérico + opção de retry manual. **Sem retry automático** nesta fase. |
| 7 | **A confirmar com o time de backend** | Nomes e caminhos exatos dos endpoints; se haverá um BFF / reverse-proxy no mesmo domínio (se sim, reavaliar mesmo-domínio + cookie `HttpOnly`); se autorização fina usará `scopes` ou `roles` no token; estratégia de versionamento da API (`/v1`). |

### 3.1. Envelope de erro esperado

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Projeto não encontrado.",
    "details": [
      { "field": "id", "issue": "não existe" }
    ],
    "traceId": "00-abc123...-def456...-01"
  }
}
```

- `code`: string estável, em `SCREAMING_SNAKE_CASE`, para o front ramificar comportamento sem depender da mensagem.
- `message`: texto em português, exibível ao usuário final.
- `details`: opcional, lista de erros de validação campo a campo.
- `traceId`: opcional, para correlacionar com logs do backend (idealmente o `traceparent` do W3C Trace Context).

### 3.2. Paginação esperada

```json
{
  "items": [ /* ... */ ],
  "page": 1,
  "pageSize": 20,
  "total": 137
}
```

Query params: `?page=1&pageSize=20`. Listas pequenas e estáveis (ex.: papéis, níveis de hierarquia) podem retornar array simples sem envelope — documentar caso a caso.

### 3.3. Mensagem para quem for construir o backend

> O frontend assume que **a autorização real acontece no servidor**. O `ProtectedRoute` do front só evita renderizar telas para quem não está logado — não é controle de acesso. O backend **deve** validar, em toda requisição:
> - assinatura do token (chaves públicas do tenant Entra, endpoint JWKS);
> - `aud` = a app registration da API;
> - `iss` = o tenant esperado (`https://login.microsoftonline.com/<tenant-id>/v2.0`);
> - `exp` / `nbf` (validade);
> - presença do scope `access_as_user` (claim `scp`);
> - autorização de negócio (o usuário X pode ver o projeto Y?) — o front **não** faz isso.
>
> Recursos que o frontend vai consumir (nomes de caminho a definir, formato dos objetos em `src/types/`):
> | Recurso | Operações que o front precisa | Origem hoje |
> |---|---|---|
> | Projetos | listar, obter por id, criar, adicionar membro, trocar papéis de membro | `useProjects` |
> | Atividades | listar por projeto, obter por id, criar, importar em massa, ações de status, ações em massa | `useActivities` |
> | Issues | listar por projeto, obter por id, registrar, ações de status | `useIssues` |
> | Log de atividades | listar por projeto | `useActivityLog` |
> | Config do projeto | obter/salvar papéis, limiares de aging | `ProjectConfigContext`, `useProjectAgingThresholds` |
> | Curva S | série de dados por projeto | `useCurvaSData` |
>
> Busca de usuários do tenant e foto de perfil **continuam indo direto ao Microsoft Graph** pelo front — não precisam de endpoint no backend.

---

## 4. Camada `src/api/`

### 4.1. Refactor pré-requisito

Extrair a criação do `PublicClientApplication` de `src/main.tsx` para `src/config/msalInstance.ts` (instância única exportada). `main.tsx` importa dela; a camada `api/` também — assim o interceptor consegue adquirir token fora do contexto React.

### 4.2. Estrutura

```
src/config/
  msalInstance.ts      # instância única do PublicClientApplication
  env.ts               # variáveis de ambiente validadas (ver seção 5)
  authConfig.ts        # (existente) passa a ler de env; ganha apiRequest = { scopes: [env.VITE_API_SCOPE] }

src/api/
  httpClient.ts        # instância Axios: baseURL = env.VITE_API_BASE_URL, timeout, headers JSON
  authToken.ts         # getApiToken(): Promise<string | null>
  interceptors.ts      # registra request/response interceptors no httpClient
  apiError.ts          # class ApiError + normalizeError(err: unknown): ApiError
  schemas/
    common.ts          # paginated(schema), errorEnvelopeSchema
    project.ts         # projectSchema (espelha src/types/project.ts)
  resources/
    projects.ts        # projectsApi.list(): Promise<Project[]>
```

### 4.3. Comportamento

**`authToken.ts` — `getApiToken()`**
1. `account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]`. Sem conta → retorna `null`.
2. `acquireTokenSilent({ ...apiRequest, account })` → retorna `accessToken`.
3. `InteractionRequiredAuthError` → dispara `acquireTokenRedirect(apiRequest)` e retorna `null`.
4. Qualquer outra falha → retorna `null` (a request segue sem token; o backend responde 401 e o interceptor trata).

**`interceptors.ts`**
- *Request:* chama `getApiToken()`; se houver token, injeta `Authorization: Bearer`.
- *Response (erro):* passa por `normalizeError`. Se for **401**, tenta `getApiToken()` uma vez e refaz a request; se ainda 401, redireciona para login.

**`apiError.ts` — `ApiError`**
Campos: `status: number | null`, `code: string`, `message: string`, `details?: unknown`, `traceId?: string`, `isNetwork: boolean`.
`normalizeError(err)` cobre: erro do Axios com `response` (lê o envelope 3.1 quando presente, senão monta a partir do status), sem `response` (rede/timeout → `isNetwork: true`), erro do Zod (`code: "SCHEMA_MISMATCH"`), e o caso genérico.

**`schemas/`**
- `common.ts`: `paginated(itemSchema)` → `z.object({ items: z.array(itemSchema), page: z.number(), pageSize: z.number(), total: z.number() })`; `errorEnvelopeSchema`.
- `project.ts`: `projectSchema` espelhando `Project` de `src/types/project.ts` (incl. `team: z.array(teamMemberSchema)`, `spi: z.number().nullable()`, `updatedAt: z.string()`).

**`resources/projects.ts`**
```ts
export const projectsApi = {
  async list(): Promise<Project[]> {
    const { data } = await httpClient.get("/projects");
    return z.array(projectSchema).parse(data);
  },
};
```

---

## 5. Configuração por ambiente

### 5.1. `src/config/env.ts`

Zod sobre `import.meta.env`, com *fail-fast* no boot (mensagem clara listando o que falta):

```ts
const schema = z.object({
  VITE_MSAL_CLIENT_ID: z.string().min(1),
  VITE_MSAL_AUTHORITY: z.string().url(),
  VITE_MSAL_REDIRECT_URI: z.string().default("/"),
  VITE_MSAL_POST_LOGOUT_REDIRECT_URI: z.string().default("/login"),
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_API_SCOPE: z.string().optional(),
  VITE_USE_MOCKS: z.enum(["true", "false"]).default("true"),
});

export const env = schema.parse(import.meta.env);

// Usa mock quando explicitamente pedido OU quando não há backend configurado.
export const useMocks = env.VITE_USE_MOCKS === "true" || !env.VITE_API_BASE_URL;
```

### 5.2. `.env.example`

```
# --- Entra ID (SPA) — valores atuais, já públicos; não são segredo numa SPA ---
VITE_MSAL_CLIENT_ID=40796f28-4c73-4ba7-a267-68118451a05c
VITE_MSAL_AUTHORITY=https://login.microsoftonline.com/4c330174-b463-400c-a84b-ee3c6b705c62
VITE_MSAL_REDIRECT_URI=/
VITE_MSAL_POST_LOGOUT_REDIRECT_URI=/login

# --- API própria — backend ainda não existe. Deixe VITE_API_BASE_URL vazio para usar mocks. ---
VITE_API_BASE_URL=
VITE_API_SCOPE=
VITE_USE_MOCKS=true
```

### 5.3. Ajustes

- `src/config/authConfig.ts` passa a montar `msalConfig` a partir de `env`. Nada mais hardcoded.
- `authConfig.ts` ganha `export const apiRequest = { scopes: env.VITE_API_SCOPE ? [env.VITE_API_SCOPE] : [] }`.
- Logger do MSAL: nível sobe para só-erro quando `import.meta.env.PROD`.
- Setup passa a exigir `copy .env.example .env` (documentado no README). O `.env` fica fora do git (já coberto pelo `.gitignore`).

---

## 6. Migração de referência — `useProjects`

### 6.1. Novos arquivos

- `src/api/schemas/project.ts` (seção 4.3).
- `src/api/resources/projects.ts` (seção 4.3).

### 6.2. Mudança em `src/hooks/useProjects.ts`

O seed mock **permanece no arquivo**. O hook passa a ramificar por `useMocks`:

- **`useMocks === true`** (padrão hoje): comportamento atual, síncrono, com `loading: false` e `error: null` adicionados ao retorno.
- **`useMocks === false`**: `useEffect` chama `projectsApi.list()`; `useState` para `projects` / `loading` / `error`; as **mesmas** estatísticas derivadas via `useMemo` sobre `projects`.

Retorno passa a ser `{ projects, stats, loading, error, createProject, addTeamMember, replaceTeamMemberRoles }`. `loading`/`error` sempre presentes (no caminho mock, valores fixos). As três funções de mutação **continuam mock** nos dois caminhos — sua migração é trabalho futuro.

`ProjectsPage` passa a considerar `loading` (estado de carregando) e `error` (estado de erro com retry). No caminho mock esses estados nunca disparam, então a tela atual não muda.

### 6.3. Receita para os outros hooks (vai no fim do ADR)

Checklist reproduzível:
1. Criar `src/api/schemas/<recurso>.ts` espelhando o tipo de domínio.
2. Criar `src/api/resources/<recurso>.ts` com as operações de leitura.
3. Ramificar o hook por `useMocks` (mock inalterado no caminho `true`).
4. Ajustar a página consumidora para tratar `loading` e `error`.
5. `npx tsc -b` + `npm run build` + QA manual.
6. Mutações: adicionar depois, quando houver endpoint para testar.

---

## 7. Audit de segurança

Arquivo entregável: `docs/security/2026-08-27-audit-frontend.md`. Cada achado com: descrição, impacto, ação recomendada, classificação (**aplicar agora** / documentar / tarefa futura).

### Alto

| Achado | Impacto | Ação | Classe |
|---|---|---|---|
| **`xlsx` (SheetJS) `0.18.5`** lê upload de planilha do usuário (`ImportActivitiesModal`, `utils/activityImport.ts`). Versão publicada no npm está defasada; advisories conhecidos de *prototype pollution* (CVE-2023-30533) e *ReDoS* (CVE-2024-22363). | Arquivo malicioso pode poluir protótipo de objeto / travar a aba do usuário. Processamento é client-side (não afeta servidor), mas afeta quem abre a planilha. | Migrar para a distribuição oficial do SheetJS (`https://cdn.sheetjs.com/`) **ou** trocar por `exceljs`. Requer revisão e QA próprios do fluxo de importação. | documentar + tarefa futura |

### Médio

| Achado | Impacto | Ação | Classe |
|---|---|---|---|
| Config de ambiente inexistente — `clientId` / `authority` / `tenant` hardcoded. | Não são segredos numa SPA pública, mas impedem dev/prod com app registrations e redirect URIs distintos; risco de publicar apontando para o tenant errado. | `src/config/env.ts` + `.env.example` (seção 5). | **aplicar agora** |
| Sem CSP nem cabeçalhos de segurança (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` / `frame-ancestors`, `Strict-Transport-Security`). | Sem a principal defesa em profundidade contra XSS e clickjacking. | CSP inicial via `<meta http-equiv>` no `index.html` (cobre o possível sem servidor) + `docs/security/headers.md` com o conjunto completo e exemplos para Azure Static Web Apps (`staticwebapp.config.json`) e Nginx. Aplicação real dos headers depende do hosting escolhido. | **aplicar agora** (parcial) + documentar |
| `useGraphUserSearch` — texto do usuário interpolado sem encoding em `$search="displayName:${query}"` na URL do Graph. | OData injection (risco baixo: escopo read, API do Graph); quebra funcional com aspas no input. | `encodeURIComponent` + remover/escapar aspas antes de montar a URL. | **aplicar agora** |
| Sem `npm audit` no fluxo de trabalho. | Vulnerabilidades de dependência passam despercebidas. | Script `"audit": "npm audit --omit=dev"` no `package.json` + nota no README. Considerar Dependabot/Renovate quando houver repositório com CI. | **aplicar agora** |

### Baixo / informativo (documentar)

| Achado | Nota |
|---|---|
| `ProtectedRoute` é guard client-side only. | Correto para UX. Registrar explicitamente que **toda autorização real é responsabilidade do backend** (validação de token — ver 3.3). |
| MSAL cache em `sessionStorage`. | Correto (some ao fechar a aba, menos exposto a XSS que `localStorage`). **Não** migrar para `localStorage`. |
| Blob URLs de foto em `usePersonPhoto` nunca passam por `URL.revokeObjectURL`. | Vazamento de memória, não de segurança. Não corrigir agora (o `photoCache` reusa a URL entre montagens; revogar quebraria o cache). Anotar. |
| Logger do MSAL escreve em `console` no build de produção. | Reduzir nível para só-erro quando `import.meta.env.PROD` (feito na seção 5.3). |
| Sem Subresource Integrity. | Não aplicável — bundle Vite local, sem `<script>` de CDN. Anotar. |
| Toolchain em versões muito recentes (Vite 8, TypeScript 6, ESLint 10). | Manter `package-lock.json` íntegro; adotar `npm ci` quando houver CI. |

---

## 8. Entregáveis desta branch

| Arquivo | Tipo |
|---|---|
| `docs/superpowers/specs/2026-08-27-preparacao-terreno-design.md` | Esta spec |
| `docs/adr/0001-integracao-backend.md` | ADR (seção 3) + receita de migração (6.3) |
| `docs/security/2026-08-27-audit-frontend.md` | Audit (seção 7) |
| `docs/security/headers.md` | Conjunto de cabeçalhos de segurança + exemplos de hosting |
| `src/config/msalInstance.ts` | Instância MSAL única (refactor) |
| `src/config/env.ts` | Env validado |
| `.env.example` | Modelo de ambiente |
| `src/config/authConfig.ts` | Passa a ler de `env`; ganha `apiRequest` |
| `src/main.tsx` | Importa `msalInstance` em vez de criar inline |
| `src/api/httpClient.ts`, `authToken.ts`, `interceptors.ts`, `apiError.ts` | Camada de API |
| `src/api/schemas/common.ts`, `schemas/project.ts` | Schemas Zod |
| `src/api/resources/projects.ts` | Recurso de projetos (leitura) |
| `src/hooks/useProjects.ts` | Migração de referência |
| `src/pages/ProjectsPage.tsx` | Trata `loading` / `error` |
| `src/hooks/useGraphUserSearch.ts` | Encoding do parâmetro de busca |
| `index.html` | CSP via `<meta>` |
| `package.json` | Script `audit` |
| `README.md` | Atualizado (seção 9) |

---

## 9. Atualização do README

- Corrigir lista de tecnologias: remover Bootstrap; adicionar SCSS puro, `@azure/msal-*` (login Entra ID), Chart.js (uso direto), **sem suíte de testes automatizados**.
- Corrigir a tabela "responsabilidade das pastas" (remover menções a Bootstrap em `styles/`).
- Adicionar passo de setup: `copy .env.example .env`.
- Documentar `npm run audit`.
- Alinhar "padrões do projeto" com o `CLAUDE.md` (verificação = `npx tsc -b` + `npm run build` + QA manual).

---

## 10. Verificação

Seguindo o padrão do projeto (sem testes automatizados):

- `npx tsc -b` sem erros.
- `npm run build` sem erros.
- `npm run lint` sem erros novos.
- QA manual no navegador com `VITE_API_BASE_URL` vazio (caminho mock): login, lista de projetos, dashboard, atividades, issues e busca de usuário funcionam exatamente como antes.
- Conferir no DevTools que a CSP via `<meta>` não bloqueia recursos legítimos (fontes, Chart.js, chamadas ao Graph e ao `login.microsoftonline.com`).

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Remover valores hardcoded do `authConfig` quebra o app de quem não criou `.env`. | `env.ts` falha no boot com mensagem explícita listando as variáveis faltantes; README documenta `copy .env.example .env`; `.env.example` traz os valores atuais prontos. |
| CSP via `<meta>` bloqueia Graph, MSAL ou fontes. | `directive`s liberando `login.microsoftonline.com`, `graph.microsoft.com` e `fonts`/`data:` conforme necessário; QA no DevTools (seção 10). |
| O hook de referência exercita um `httpClient` sem servidor. | O caminho real só roda com `VITE_API_BASE_URL` preenchido; enquanto vazio, `useMocks` mantém tudo no mock. Nenhuma regressão possível no estado atual. |
| ADR "engessar" decisões que o backend vai querer mudar. | Seção 3, item 7 lista explicitamente o que está aberto; o ADR é revisável quando o backend começar. |
