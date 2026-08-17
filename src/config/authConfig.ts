import { LogLevel, type Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "40796f28-4c73-4ba7-a267-68118451a05c",
    authority:
      "https://login.microsoftonline.com/4c330174-b463-400c-a84b-ee3c6b705c62",
    redirectUri: "/",
    postLogoutRedirectUri: "/login",
  },
  cache: {
    cacheLocation: "sessionStorage",
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