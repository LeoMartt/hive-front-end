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
