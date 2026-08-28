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
