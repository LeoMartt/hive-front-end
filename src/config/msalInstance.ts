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
