import axios from "axios";
import { env } from "../config/env";

// baseURL cai em "/api" quando não há backend configurado — nesse estado nada
// chama o httpClient (useMocks === true), então o valor é só um placeholder seguro.
export const httpClient = axios.create({
  baseURL: env.VITE_API_BASE_URL ?? "/api",
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});
