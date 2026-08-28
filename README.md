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
