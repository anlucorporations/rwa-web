import { NextResponse, type NextRequest } from 'next/server';

/**
 * Correlación de peticiones (RF-W-16 / RT-W-10).
 *
 * Genera (o propaga) un `x-request-id` por petición, lo deja disponible a los
 * route handlers y lo devuelve en la respuesta. `toErrorResponse` lo incluye en
 * el log y en el cuerpo de error para poder cruzar incidencias con el servidor.
 *
 * Se define aquí como constante (en vez de importar `@rwa/shared`) para que el
 * middleware de Edge no arrastre dependencias de Node (`pg`, `pino`).
 */
const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export function middleware(request: NextRequest) {
  const incoming = request.headers.get(REQUEST_ID_HEADER);
  const requestId =
    incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
