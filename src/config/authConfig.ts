import { LogLevel, type Configuration } from "@azure/msal-browser";
import { env } from "./env";

export const msalConfig: Configuration = {
  auth: {
    clientId: env.VITE_MSAL_CLIENT_ID,
    authority: env.VITE_MSAL_AUTHORITY,
    redirectUri: env.VITE_MSAL_REDIRECT_URI,
    postLogoutRedirectUri: env.VITE_MSAL_POST_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
  system: {
    loggerOptions: {
      // Em produção, só erro vai para o console; em dev, erro + warning.
      logLevel: import.meta.env.PROD ? LogLevel.Error : LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ["User.Read"],
};

// Escopo separado, usado só na hora de buscar usuários do tenant (não no login)
export const graphUserSearchRequest = {
  scopes: ["User.ReadBasic.All"],
};

// Escopo da API própria (backend). Vazio enquanto VITE_API_SCOPE não for definido —
// nesse estado a camada api/ não é exercitada (useMocks === true).
export const apiRequest = {
  scopes: env.VITE_API_SCOPE ? [env.VITE_API_SCOPE] : [],
};
