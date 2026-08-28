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

## Pendências conhecidas da camada `src/api/` (de um review de qualidade)

Levantadas na criação da camada; **não bloqueiam** o estado dormente atual, mas resolver antes de ativar (`useMocks` → false) ou de estender para novos recursos:

- **`errorEnvelopeSchema` no lugar do cast:** `apiError.ts` faz `err.response.data as ErrorEnvelope`. Quando a camada ativar, trocar por `errorEnvelopeSchema.safeParse(err.response.data)` (o schema já existe em `src/api/schemas/common.ts`) e remover a interface `ErrorEnvelope` mantida à mão.
- **Guard de HMR nos interceptors:** `src/api/interceptors.ts` registra interceptors como efeito de import. Em dev, o Vite pode re-executar o módulo e empilhar interceptors duplicados no mesmo `httpClient`. Adicionar `if (import.meta.hot) import.meta.hot.decline()` ou lógica de eject.
- **Impedir import direto de `httpClient.ts`:** só `src/api/client.ts` deve ser importado (garante interceptors). Adicionar regra ESLint `no-restricted-imports` apontando para `./client`, ou mover o registro dos interceptors para dentro de `httpClient.ts`.
- **`satisfies z.ZodType<TeamMember>` no `teamMemberSchema`:** hoje só o `projectSchema` pai tem o guard de compilação; o schema aninhado deveria ter também.
- **`getApiToken` e múltiplas contas:** `getActiveAccount() ?? getAllAccounts()[0]` escolhe uma conta arbitrária em sessão multi-conta. OK para a realidade atual (conta única), mas documentar/decidir se for suportar múltiplas.
- **Tipar respostas do Axios:** `httpClient.get("/projects")` devolve `any`; usar `httpClient.get<unknown>(...)` e deixar o `schema.parse` fechar o buraco.
