import type { InternalAxiosRequestConfig } from "axios";
import { httpClient } from "./httpClient";
import { getApiToken } from "./authToken";
import { normalizeError } from "./apiError";
import { msalInstance } from "../config/msalInstance";
import { loginRequest } from "../config/authConfig";

type RetriableConfig = InternalAxiosRequestConfig & { __retried?: boolean };

httpClient.interceptors.request.use(async (config) => {
  const token = await getApiToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = normalizeError(error);

    if (apiError.status === 401) {
      const original = error.config as RetriableConfig | undefined;
      if (original && !original.__retried) {
        original.__retried = true;
        const token = await getApiToken();
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return httpClient.request(original);
        }
      }
      // Sem token novo => manda para o login.
      await msalInstance.acquireTokenRedirect(loginRequest);
    }

    return Promise.reject(apiError);
  },
);
