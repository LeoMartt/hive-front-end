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
