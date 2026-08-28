import { AxiosError } from "axios";
import { ZodError } from "zod";

// Erro estável para toda a aplicação consumir, independente da origem
// (HTTP com corpo de erro, HTTP sem corpo, rede/timeout, schema inválido).
export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string;
  readonly details?: unknown;
  readonly traceId?: string;
  readonly isNetwork: boolean;

  constructor(params: {
    status: number | null;
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
    isNetwork?: boolean;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.details = params.details;
    this.traceId = params.traceId;
    this.isNetwork = params.isNetwork ?? false;
  }
}

// Formato de erro combinado com o backend (ver ADR 0001, seção 3.1).
interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    traceId?: string;
  };
}

function messageForStatus(status: number): string {
  if (status === 401) return "Sessão expirada. Faça login novamente.";
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Recurso não encontrado.";
  if (status >= 500) return "O servidor falhou. Tente novamente em instantes.";
  return "Não foi possível concluir a requisição.";
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError({
      status: null,
      code: "SCHEMA_MISMATCH",
      message: "A resposta do servidor veio em um formato inesperado.",
      details: err.issues,
    });
  }

  if (err instanceof AxiosError) {
    if (err.response) {
      const body = err.response.data as ErrorEnvelope | undefined;
      const status = err.response.status;
      return new ApiError({
        status,
        code: body?.error?.code ?? `HTTP_${status}`,
        message: body?.error?.message ?? messageForStatus(status),
        details: body?.error?.details,
        traceId: body?.error?.traceId,
      });
    }
    // sem response => rede, DNS, CORS, timeout
    return new ApiError({
      status: null,
      code: err.code === "ECONNABORTED" ? "TIMEOUT" : "NETWORK_ERROR",
      message: "Sem resposta do servidor. Verifique a conexão.",
      isNetwork: true,
    });
  }

  return new ApiError({
    status: null,
    code: "UNKNOWN",
    message: err instanceof Error ? err.message : "Erro desconhecido.",
  });
}
