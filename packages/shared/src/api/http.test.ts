import { describe, expect, it } from 'vitest';

import { ForbiddenError } from '../errors';
import { toErrorResponse } from './http';

function requestWith(requestId?: string) {
  return {
    headers: {
      get: (name: string) => (name === 'x-request-id' ? (requestId ?? null) : null),
    },
  };
}

describe('toErrorResponse', () => {
  it('traduce un AppError a su código HTTP y de aplicación', () => {
    const { status, body } = toErrorResponse(new ForbiddenError('no autorizado'));
    expect(status).toBe(403);
    expect(body).toMatchObject({
      success: false,
      code: 'FORBIDDEN',
      message: 'no autorizado',
    });
  });

  it('propaga el requestId de la petición en el cuerpo de error', () => {
    const { body } = toErrorResponse(new ForbiddenError('no'), requestWith('req-12345678'));
    expect(body.requestId).toBe('req-12345678');
  });

  it('omite requestId cuando la petición no lo trae', () => {
    const { body } = toErrorResponse(new ForbiddenError('no'), requestWith());
    expect(body.requestId).toBeUndefined();
  });

  it('no expone el mensaje de una excepción no controlada', () => {
    const { status, body } = toErrorResponse(new Error('detalle interno sensible'));
    expect(status).toBe(500);
    expect(body).toEqual({
      success: false,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
    });
  });
});
