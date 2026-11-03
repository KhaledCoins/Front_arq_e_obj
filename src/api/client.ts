import type { ErrorResponseDTO } from "./types";

// "/api" é encaminhado ao backend pelo proxy do Vite (dev) ou pelo rewrite do vercel.json (produção).
// VITE_API_BASE permite chamar o backend diretamente (exige CORS liberado no Spring).
const BASE_URL = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") || "/api";
const TOKEN_KEY = "kanban.token";

export class ApiError extends Error {
  status: number;
  errors: string[];

  constructor(status: number, message: string, errors: string[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  const fallback = defaultMessage(response.status);
  try {
    const text = await response.text();
    if (!text) return new ApiError(response.status, fallback);
    const data = JSON.parse(text) as Partial<ErrorResponseDTO> & { error?: string };
    const message = data.message || data.error || fallback;
    return new ApiError(response.status, message, Array.isArray(data.errors) ? data.errors : []);
  } catch {
    return new ApiError(response.status, fallback);
  }
}

function defaultMessage(status: number) {
  switch (status) {
    case 400:
      return "Dados inválidos";
    case 401:
      return "Sessão expirada. Entre novamente.";
    case 403:
      return "Você não tem permissão para isso";
    case 404:
      return "Recurso não encontrado";
    case 409:
      return "Conflito com o estado atual";
    default:
      return "Erro inesperado ao falar com o servidor";
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStorage.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor. O backend está rodando?");
  }

  if (response.status === 401 && auth) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, auth = true) =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};
