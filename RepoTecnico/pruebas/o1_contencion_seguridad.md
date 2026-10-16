# Evidencia O1 — Contención de seguridad (2026-10-14)

> **Ciclo:** O1 (plan §O1) · **Requisitos:** RF-W-01…07, RF-W-12, RF-W-13, RNF-W-01 · **Decisiones:** D-092 (SIWE), D-095, D-098.
> **Entregable:** ninguna ruta muta estado ni entrega PII sin sesión autorizada.
> **Hallazgos cerrados:** HW-01 (crítico), HW-02 (crítico), HW-04 (alto), HW-08 (alto).

## 1. Qué se implementó

### 1.1 Sesión SIWE (RF-W-01 · D-092) — `packages/shared/src/auth`

| Pieza | Detalle |
|---|---|
| `POST /api/auth/nonce` | Crea una fila `rwa.sessions` con **nonce de un solo uso** (10 min) y devuelve el mensaje **EIP-4361** (`createSiweMessage`, `viem`). |
| `POST /api/auth/verify` | Valida `domain`/`uri`/`chainId` (31337) contra la propia petición, comprueba que el nonce existe y está vivo, recupera el firmante con `recoverMessageAddress` y **consume el nonce** (lo rota y extiende la caducidad a 24 h). |
| Cookie | `rwa_session=<id>.<HMAC-SHA256>` firmada con `SIWE_SESSION_SECRET`; `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` si HTTPS. **Nunca lleva la dirección.** |
| `GET /api/auth/session` · `POST /api/auth/logout` | Consulta y revocación. |
| `requireSession(request)` | Revalida HMAC + estado en BD en **cada** petición; lanza 401 si falla. |
| `requireOwner` / `requireSignature` | Autorización por propiedad (403) y verificación EIP-191 del emisor (403). |
| Rol | Provisional: `issuer` si `rwa.issuers.verified`; si no, `investor`. La autorización real es por propiedad (la autoridad por topic es on-chain, O2). |

`SIWE_SESSION_SECRET` es **obligatoria** (mínimo 32 caracteres) y **falla en cerrado**: sin ella las rutas protegidas no atienden. En desarrollo vive en `.env.local` de cada app (ignorado por git); **en `truekeate-main` el secreto todavía no existe** y debe crearse antes de desplegar.

### 1.2 Matriz de autorización aplicada (O1.1–O1.5)

| Ruta | Regla aplicada | Tarea |
|---|---|---|
| `GET /api/test-gridfs` · `GET /api/test-db` | **404** salvo `ALLOW_DEBUG_ENDPOINTS=1` | O1.1 |
| `POST /api/update-request` | sesión → solicitud existe → **sesión == `issuer_address`** → **solo `pending`** (409) → **firma del emisor == wallet de la sesión** → `reviewedBy = session.address` → auditoría | O1.2 |
| `GET /api/claim-requests` | sesión; `requesterAddress`/`issuerAddress` deben coincidir con la sesión (403); por defecto el inversor solo ve lo suyo | O1.3 |
| `POST /api/claim-requests` | sesión + `requireOwner(session, requesterAddress)` + auditoría `claim.create` | O1.3 |
| `GET /api/download/[fileId]` | sesión + **titular o emisor del claim** (403) + `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` + **auditoría `document.download`** | O1.4 |
| `POST /api/upload` | sesión + propiedad del claim + **magic bytes** (`assertAllowedUpload`) + auditoría `document.upload` | O1.4 |
| `POST /api/issuers` | sesión + **solo el propio emisor** (`requireOwner`) + auditoría `issuer.upsert` | O1.5 / RF-W-12 |
| `GET /api/issuers` · `GET /api/issuer-requests` · `POST /api/issuers/batch` | sesión; el emisor solo consulta lo dirigido a su dirección (403) | O1.5 |
| `POST /api/tokens` | sesión + `requireOwner(session, adminAddress)` + auditoría `token.create` | O1.5 |
| `POST /api/tokens/[id]/{claims,compliance,modules,price}` | sesión + **admin del token** (403) + auditoría | O1.5 |
| `GET /api/tokens` | **público** (marketplace de solo lectura; pregunta abierta §10.1 de `requerimientos_web.md`) | — |
| `/api/health` · `/api/auth/*` | públicos por diseño | — |

### 1.3 Otros endurecimientos (O1.4/O1.6)
- **Magic bytes** (`media/magic-bytes.ts`): PDF, JPEG, PNG, DOC, DOCX; `image/jpg` → `image/jpeg`; el tipo declarado debe coincidir con el detectado.
- **`Content-Disposition` saneado** (`media/filename.ts`): se eliminan `"`, `\` y caracteres de control del nombre subido → cierra una **inyección de cabeceras** detectada durante la revisión.
- **Errores tipados** (O1.6): `UnauthorizedError` (401) y `ForbiddenError` (403) se suman a los ya existentes (400/404/409/503); `toErrorResponse` no expone `error.message` de librería.
- **Auditoría** en `rwa.audit_log` para subida, descarga, alta/revisión de claims y escrituras de emisor/token.
- **Rendimiento de build:** el cargador del artefacto de despliegue se movió al subpath `@rwa/shared/deployment`; al no estar en el índice raíz, Turbopack ya no traza todo el proyecto (`web-identity` pasó de **9,3 min a 51 s**).

## 2. Gate reproducible

```bash
# Builds (exit 0 en las 3 apps, sin avisos de tracing)
for d in web-identity web-registry-trusted web-token; do (cd $d && npx next build); done

# Suite de autorización (O1.7): rechazo anónimo por ruta + debug 404 + SIWE positivo
./scripts/test_auth_o1.sh        # 30/30 en verde, exit 0

# E2E positivo de O1.2 (HW-01): firma del emisor, terceros e idempotencia
./scripts/test_review_o1.sh      # 5/5 en verde, exit 0
```

**Salida real — `test_auth_o1.sh` (resumen):**

```
— Rutas públicas —                       4/4  200 (health ×3 + GET /api/tokens)
— web-identity anónimo —                 7/7  401 (claim-requests GET/POST, upload, download, issuers/batch, session, cookie falsificada)
— web-registry-trusted anónimo —         5/5  401 (issuer-requests, issuers GET/POST, update-request, download)
— web-token anónimo —                    5/5  401 (tokens POST + claims/compliance/modules/price)
— Depuración —                           2/2  404 (test-gridfs, test-db)
— Flujo SIWE positivo —                  7/7  200 verify/session/claim-requests; 403 otra dirección; 404 descarga inexistente;
                                               200 logout; 401 tras logout
[test-auth-o1] ✓ TODAS las comprobaciones en verde
```

**Salida real — `test_review_o1.sh` (HW-01):**

```
1) solicitud creada: 48c0dbd1-696b-4493-b2b0-a60ca74ab80e
2) tercero → 403
3) emisor con firma de otra wallet → 403
4) emisor destinatario con su firma → 200, status = approved
5) segunda revisión → 409
[test-review-o1] ✓ E2E de O1.2 en verde
```

**Estado del esquema tras las pruebas** (limpieza en el propio script): `claim_requests` 0 · `document_files` 0 · `sessions` 0 · `audit_log` 0 · `claim_topics` 5.

## 3. Deuda declarada

| Punto | Cierre previsto |
|---|---|
| **RF-W-04** (verificar la firma *del solicitante* al crear la solicitud): hoy la autoridad es la sesión SIWE; el digest EIP-712 del claim llega con `addClaim` | **O2.3** |
| `SIWE_SESSION_SECRET` no existe aún en Secret Manager | Antes de desplegar (O3/O5) |
| Rol `issuer`/`admin` derivado solo de `rwa.issuers.verified` (nadie lo escribe todavía) | **O2** (sincronización on-chain) |
| Descarga en claro (`encryption_algo='none'`): no hay descifrado en servidor porque no hay cifrado | **O5.4** |
| Marketplace `GET /api/tokens` público | Decisión pendiente (§10.1) |

*Fin de la evidencia — O1*
