import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { httpClient } from "./httpClient";
import { getApiToken } from "./authToken";
import { normalizeError } from "./apiError";
import { msalInstance } from "../config/msalInstance";
import { loginRequest } from "../config/authConfig";

type RetriableConfig = InternalAxiosRequestConfig & { __retried?: boolean };

// Garante um único redirect interativo mesmo com vários 401 em paralelo (MSAL só
// tolera uma interação por vez).
let redirectStarted = false;
function redirectToLogin(): void {
  if (redirectStarted) return;
  redirectStarted = true;
  void msalInstance.acquireTokenRedirect(loginRequest).catch((err) => {
    redirectStarted = false;
    console.error("Falha ao iniciar login interativo", err);
  });
}

httpClient.interceptors.request.use(async (config) => {
  const token = await getApiToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = normalizeError(error);

    if (apiError.status === 401) {
      const original = axios.isAxiosError(error)
        ? (error.config as RetriableConfig | undefined)
        : undefined;

      if (original && !original.__retried) {
        original.__retried = true;
        const token = await getApiToken();
        if (token) {
          // O interceptor de request re-injeta o Authorization ao reenviar.
          return httpClient.request(original);
        }
      }

      redirectToLogin();
    }

    return Promise.reject(apiError);
  },
);
