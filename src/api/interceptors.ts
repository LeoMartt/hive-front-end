import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { httpClient } from "./httpClient";
import { getApiToken } from "./authToken";
import { normalizeError } from "./apiError";

type RetriableConfig = InternalAxiosRequestConfig & { __retried?: boolean };

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
    }

    return Promise.reject(apiError);
  },
);
