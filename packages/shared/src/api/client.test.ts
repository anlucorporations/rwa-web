import { describe, expect, it } from 'vitest';

import { ApiClientError, createApiClient } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('cliente de API tipado (RF-W-14)', () => {
  it('devuelve data en una respuesta correcta', async () => {
    const client = createApiClient({
      fetchImpl: async () => jsonResponse(200, { success: true, data: { id: 'abc' } }),
    });
    await expect(client.get<{ id: string }>('/api/x')).resolves.toEqual({ id: 'abc' });
  });

  it('envía JSON en POST', async () => {
    let captured: RequestInit | undefined;
    const client = createApiClient({
      fetchImpl: async (_url, init) => {
        captured = init;
        return jsonResponse(200, { success: true, data: { ok: true } });
      },
    });
    await client.post('/api/x', { a: 1 });
    expect(captured?.method).toBe('POST');
    expect(captured?.body).toBe(JSON.stringify({ a: 1 }));
    expect((captured?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('convierte errores del servidor en ApiClientError con status y code', async () => {
    const client = createApiClient({
      fetchImpl: async () =>
        jsonResponse(403, { success: false, message: 'No autorizado', code: 'FORBIDDEN' }),
    });
    await expect(client.get('/api/x')).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 403,
      code: 'FORBIDDEN',
      message: 'No autorizado',
    });
  });

  it('marca los fallos de red como NETWORK_ERROR', async () => {
    const client = createApiClient({
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    await expect(client.get('/api/x')).rejects.toBeInstanceOf(ApiClientError);
    await expect(client.get('/api/x')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
