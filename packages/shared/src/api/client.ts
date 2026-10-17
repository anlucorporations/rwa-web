/**
 * Cliente de API tipado (RF-W-14, RT-W-04).
 *
 * Centraliza el contrato HTTP `{ success, data }` de las 3 apps y convierte los
 * errores del servidor en `ApiClientError` (con `status` y `code`), de modo que la
 * UI no tenga que inspeccionar `response.ok` ni `success` a mano.
 *
 * Es **seguro para cliente**: no importa APIs de Node.
 */

import type { ApiErrorBody } from './http';

export type ApiEnvelope<T> = { success: true; data: T } & Record<string, unknown>;

/** Error de la API con el código HTTP y el código de aplicación del servidor. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = body.code;
  }
}

export interface ApiClientOptions {
  /** Prefijo de las rutas (por defecto, mismo origen: cadena vacía). */
  baseUrl?: string;
  /** Inyección de `fetch` (tests o entornos no estándar). */
  fetchImpl?: typeof fetch;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, data?: unknown): Promise<T>;
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? '';
  const doFetch = options.fetchImpl ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      });
    } catch {
      throw new ApiClientError(0, {
        success: false,
        message: 'No se pudo contactar con el servidor',
        code: 'NETWORK_ERROR',
      });
    }

    const body = (await response.json().catch(() => null)) as
      | (ApiEnvelope<T> & { message?: string; code?: string })
      | null;

    if (!response.ok || !body || body.success !== true) {
      throw new ApiClientError(
        response.status,
        (body as unknown as ApiErrorBody | null) ?? {
          success: false,
          message: 'Respuesta de la API inválida',
          code: 'INVALID_RESPONSE',
        },
      );
    }
    return body.data;
  }

  return {
    request,
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, data?: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  };
}

/** Cliente por defecto (mismo origen) para componentes de cliente. */
export const apiClient: ApiClient = createApiClient();
