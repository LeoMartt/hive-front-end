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
- **`npm run audit` reporta (2026-08-27):**
  ```
  xlsx  *
  Severity: high
  Prototype Pollution in sheetJS - https://github.com/advisories/GHSA-4r6h-8v6p-xvw6
  SheetJS Regular Expression Denial of Service (ReDoS) - https://github.com/advisories/GHSA-5pgg-2g8v-p4x9
  No fix available
  node_modules/xlsx

  1 high severity vulnerability
  ```
  É a **única** vulnerabilidade reportada (1 high, 0 nas demais severidades). `npm audit` sai com código 1 quando há vulnerabilidade — atenção se um dia isso entrar em CI.
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
Correto para UX; **não** é controle de acesso. Toda autorização real (validação de token: assinatura, `aud`, `iss`, `exp`, `scp`; e autorização de negócio) é responsabilidade do backend — ver `docs/adr/0001-integracao-backend.md`. Documentar, sem ação no front.

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
