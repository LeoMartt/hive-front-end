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
