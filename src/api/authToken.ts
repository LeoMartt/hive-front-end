import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "../config/msalInstance";
import { apiRequest } from "../config/authConfig";

// Adquire um access token do Entra ID para a API própria. NÃO navega: em qualquer
// falha devolve null e quem chama (o interceptor) decide se redireciona ao login.
export async function getApiToken(): Promise<string | null> {
  const account =
    msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const result = await msalInstance.acquireTokenSilent({ ...apiRequest, account });
    return result.accessToken;
  } catch (err) {
    // InteractionRequiredAuthError é esperado (sessão expirou). Qualquer outro
    // erro é config/rede e precisa aparecer no console para diagnóstico.
    if (!(err instanceof InteractionRequiredAuthError)) {
      console.error("getApiToken: falha inesperada ao adquirir token", err);
    }
    return null;
  }
}
