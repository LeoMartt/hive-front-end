import { LogLevel, type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "40796f28-4c73-4ba7-a267-68118451a05c",
    authority:
      "https://login.microsoftonline.com/4c330174-b463-400c-a84b-ee3c6b705c62",
    redirectUri: "/", // resolve para a origin atual (localhost:5173 ou o App Service)
    postLogoutRedirectUri: "/",
  },
  cache: {
    cacheLocation: "sessionStorage", // sessionStorage > localStorage: token não sobrevive ao fechar a aba
  },
  system: {
    loggerOptions: {
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
            return; // silencia Info/Verbose em produção
        }
      },
    },
  },
};

// Escopo mínimo: perfil básico do usuário logado (nome, e-mail)
export const loginRequest = {
  scopes: ["User.Read"],
};